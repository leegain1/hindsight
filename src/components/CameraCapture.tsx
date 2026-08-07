"use client";

/**
 * 앱 안에서 바로 촬영하는 카메라 뷰.
 *
 * 왜 <input capture> 로 안 되나
 *   capture 속성은 **모바일 브라우저만** 해석한다. 데스크탑에서는 통째로 무시돼
 *   파일 선택창이 뜬다. 폰이라도 http://<LAN IP> 로 접속하면 보안 컨텍스트가
 *   아니라 카메라가 막힌다. 즉 "버튼을 눌렀는데 앨범이 뜬다"는 마크업 문제가
 *   아니라 환경 문제고, 마크업으로는 못 고친다.
 *
 * getUserMedia 는 데스크탑 웹캠도 잡으므로 노트북에서 리허설할 수 있고,
 * 무엇보다 **가이드 프레임**을 그릴 수 있다 — 제품 정의 노트가 정확도 확보
 * 3축의 첫 번째로 꼽은 "촬영 UX: 성분표 영역만 꽉 채워 찍게 유도"가 이것이다.
 *
 * getUserMedia 도 보안 컨텍스트(https 또는 localhost)를 요구한다. 못 쓰는
 * 환경에서는 onFallback 으로 기존 파일 입력에 넘긴다.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const INK = "#0A0A0A";
const CANVAS = "#F5F2EC";
const MONO = "'DM Mono', monospace";

type Status = "starting" | "live" | "denied" | "unavailable";

export default function CameraCapture({
  onCapture,
  onClose,
  onFallback,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
  /** 카메라를 못 쓸 때 기존 파일 선택으로 넘어가는 통로 */
  onFallback: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>("starting");
  const [message, setMessage] = useState("");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    // 이펙트 본문에서 곧바로 setState 하지 않도록 프로미스로 한 번 넘긴다
    void Promise.resolve().then(async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (cancelled) return;
        setStatus("unavailable");
        setMessage(
          window.isSecureContext
            ? "이 브라우저는 카메라를 지원하지 않아요."
            : "http 로 접속하면 카메라를 쓸 수 없어요. https 주소로 열어주세요.",
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          // 후면 카메라 우선. exact 로 걸면 후면이 없는 노트북에서 아예 실패한다
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStatus("live");
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError") {
          setStatus("denied");
          setMessage("카메라 권한이 필요해요. 브라우저 설정에서 허용해주세요.");
        } else {
          setStatus("unavailable");
          setMessage(
            name === "NotFoundError"
              ? "사용할 수 있는 카메라를 찾지 못했어요."
              : "카메라를 열지 못했어요.",
          );
        }
      }
    });

    return () => {
      cancelled = true;
      stop();
    };
  }, [stop]);

  const shoot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    // 판독은 장변 1600px 이면 충분하다. 더 키우면 업로드와 이미지 토큰만 늘어난다.
    const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stop();
        onCapture(new File([blob], "capture.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.85,
    );
  };

  const failed = status === "denied" || status === "unavailable";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="성분표 촬영"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: INK,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "calc(16px + env(safe-area-inset-top)) 20px 14px",
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(245,242,236,0.5)", letterSpacing: "1.5px" }}>
          CAPTURE
        </span>
        <button
          type="button"
          onClick={() => {
            stop();
            onClose();
          }}
          aria-label="닫기"
          style={{
            background: "transparent",
            border: "none",
            color: CANVAS,
            fontSize: 15,
            cursor: "pointer",
            minHeight: 0,
            minWidth: 0,
            padding: 6,
          }}
        >
          ✕
        </button>
      </header>

      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: failed ? "none" : "block",
          }}
        />

        {/* 가이드 프레임 — 성분표를 이 안에 꽉 채우게 유도한다.
            판독 정확도는 모델보다 이 프레임이 더 크게 좌우한다. */}
        {status === "live" && (
          <>
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: "18% 8%",
                border: "2px solid rgba(245,242,236,0.9)",
                borderRadius: 12,
                boxShadow: "0 0 0 9999px rgba(10,10,10,0.45)",
                pointerEvents: "none",
              }}
            />
            <p
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 20,
                textAlign: "center",
                fontSize: 13,
                color: CANVAS,
                textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                padding: "0 24px",
                lineHeight: 1.5,
              }}
            >
              원재료명·영양정보가 이 안에 꽉 차도록 가까이서 찍어주세요
            </p>
          </>
        )}

        {status === "starting" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div
              className="spin"
              style={{ width: 22, height: 22, border: "1.5px solid rgba(245,242,236,0.3)", borderTopColor: CANVAS, borderRadius: "50%" }}
            />
          </div>
        )}

        {failed && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              padding: "0 32px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 14, color: CANVAS, lineHeight: 1.6 }}>{message}</p>
            <button
              type="button"
              onClick={() => {
                stop();
                onFallback();
              }}
              style={{
                padding: "13px 22px",
                background: CANVAS,
                color: INK,
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              사진에서 고르기
            </button>
          </div>
        )}
      </div>

      {status === "live" && (
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 0 calc(26px + env(safe-area-inset-bottom))",
          }}
        >
          <button
            type="button"
            onClick={shoot}
            aria-label="촬영"
            style={{
              width: 70,
              height: 70,
              minHeight: 0,
              minWidth: 0,
              padding: 0,
              borderRadius: "50%",
              background: CANVAS,
              border: "4px solid rgba(245,242,236,0.35)",
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          />
        </div>
      )}
    </div>
  );
}
