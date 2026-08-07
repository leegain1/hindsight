"use client";

/**
 * 원재료명 영역만 잘라내는 크롭 UI.
 *
 * 왜 필요한가: 포장 전체를 찍으면 성분표 글자가 전체 화소의 몇 %밖에 안 된다.
 * 축소해서 올리면 그 글자가 먼저 뭉개진다. 필요한 영역만 잘라 보내면 같은
 * 업로드 크기로 글자 해상도가 몇 배 올라간다 — 판독 정확도에 가장 크게
 * 작용하는 손잡이가 모델이 아니라 이것이다.
 *
 * 포인터 이벤트로 처리해 마우스와 터치가 같은 코드를 탄다.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const INK = "#0A0A0A";
const CANVAS = "#F5F2EC";
const MONO = "'DM Mono', monospace";

/** 0~1 정규화 사각형 — 표시 크기와 무관하게 다룬다 */
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Drag =
  | { mode: "move"; startX: number; startY: number; rect: Rect }
  | { mode: "resize"; corner: Corner; startX: number; startY: number; rect: Rect }
  | null;

type Corner = "nw" | "ne" | "sw" | "se";

const MIN_SIZE = 0.12;

export default function ImageCropper({
  file,
  onDone,
  onCancel,
}: {
  file: File;
  onDone: (cropped: File) => void;
  onCancel: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<Rect>({ x: 0.08, y: 0.15, w: 0.84, h: 0.6 });
  const dragRef = useRef<Drag>(null);

  // blob URL 은 렌더 값이지 상태가 아니다. 이펙트에서 setState 로 만들면
  // 첫 프레임이 빈 화면으로 한 번 그려지고, 렌더가 한 번 더 돈다.
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  /** 포인터 좌표를 이미지 기준 0~1 로 바꾼다 */
  const toNorm = useCallback((e: PointerEvent | React.PointerEvent) => {
    const el = boxRef.current;
    if (!el) return { x: 0, y: 0 };
    const b = el.getBoundingClientRect();
    return {
      x: clamp01((e.clientX - b.left) / b.width),
      y: clamp01((e.clientY - b.top) / b.height),
    };
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      e.preventDefault();
      const p = toNorm(e);

      if (d.mode === "move") {
        const dx = p.x - d.startX;
        const dy = p.y - d.startY;
        setRect({
          ...d.rect,
          x: clamp(d.rect.x + dx, 0, 1 - d.rect.w),
          y: clamp(d.rect.y + dy, 0, 1 - d.rect.h),
        });
        return;
      }

      // 리사이즈 — 잡은 모서리의 반대편을 고정점으로 둔다
      const r = d.rect;
      const right = r.x + r.w;
      const bottom = r.y + r.h;
      let nx = r.x;
      let ny = r.y;
      let nw = r.w;
      let nh = r.h;

      if (d.corner === "nw" || d.corner === "sw") {
        nx = clamp(p.x, 0, right - MIN_SIZE);
        nw = right - nx;
      } else {
        nw = clamp(p.x, nx + MIN_SIZE, 1) - nx;
      }
      if (d.corner === "nw" || d.corner === "ne") {
        ny = clamp(p.y, 0, bottom - MIN_SIZE);
        nh = bottom - ny;
      } else {
        nh = clamp(p.y, ny + MIN_SIZE, 1) - ny;
      }
      setRect({ x: nx, y: ny, w: nw, h: nh });
    };

    const onUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [toNorm]);

  const startMove = (e: React.PointerEvent) => {
    const p = toNorm(e);
    dragRef.current = { mode: "move", startX: p.x, startY: p.y, rect };
  };

  const startResize = (corner: Corner) => (e: React.PointerEvent) => {
    e.stopPropagation();
    const p = toNorm(e);
    dragRef.current = { mode: "resize", corner, startX: p.x, startY: p.y, rect };
  };

  const apply = () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;

    const sx = Math.round(rect.x * img.naturalWidth);
    const sy = Math.round(rect.y * img.naturalHeight);
    const sw = Math.max(1, Math.round(rect.w * img.naturalWidth));
    const sh = Math.max(1, Math.round(rect.h * img.naturalHeight));

    // 잘라낸 뒤에도 장변 상한은 유지한다. 크롭했다고 원본 화소를 다 보낼
    // 이유는 없고, 글자 해상도는 이미 크롭으로 확보됐다.
    const scale = Math.min(1, 1600 / Math.max(sw, sh));
    const cw = Math.max(1, Math.round(sw * scale));
    const ch = Math.max(1, Math.round(sh * scale));

    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onDone(new File([blob], "crop.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.88,
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="원재료명 영역 선택"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 310,
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
          padding: "calc(16px + env(safe-area-inset-top)) 20px 12px",
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(245,242,236,0.5)", letterSpacing: "1.5px" }}>
          CROP
        </span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="닫기"
          style={{ background: "transparent", border: "none", color: CANVAS, fontSize: 15, cursor: "pointer", minHeight: 0, minWidth: 0, padding: 6 }}
        >
          ✕
        </button>
      </header>

      <p style={{ fontSize: 13, color: "rgba(245,242,236,0.75)", textAlign: "center", padding: "0 24px 12px", lineHeight: 1.5, flexShrink: 0 }}>
        원재료명·영양정보가 들어간 부분만 남기면 글자가 더 또렷하게 판독됩니다
      </p>

      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 12px", minHeight: 0 }}>
        <div ref={boxRef} style={{ position: "relative", maxWidth: "100%", maxHeight: "100%", touchAction: "none" }}>
          {/* 크롭 원본이라 next/image 최적화 대상이 아니다 — blob URL 은 그대로 그린다 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={url}
            alt="촬영한 사진"
            style={{ display: "block", maxWidth: "100%", maxHeight: "60vh", userSelect: "none" }}
            draggable={false}
          />

          {/* 바깥 어둡게 — 남길 영역만 밝게 보인다 */}
          <div
            onPointerDown={startMove}
            style={{
              position: "absolute",
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.w * 100}%`,
              height: `${rect.h * 100}%`,
              border: "2px solid rgba(245,242,236,0.95)",
              boxShadow: "0 0 0 9999px rgba(10,10,10,0.6)",
              cursor: "move",
              touchAction: "none",
            }}
          >
            {(["nw", "ne", "sw", "se"] as Corner[]).map((c) => (
              <span
                key={c}
                onPointerDown={startResize(c)}
                style={{
                  position: "absolute",
                  width: 26,
                  height: 26,
                  background: CANVAS,
                  borderRadius: 4,
                  touchAction: "none",
                  cursor: c === "nw" || c === "se" ? "nwse-resize" : "nesw-resize",
                  [c[0] === "n" ? "top" : "bottom"]: -13,
                  [c[1] === "w" ? "left" : "right"]: -13,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div style={{ flexShrink: 0, display: "flex", gap: 10, padding: "16px 20px calc(20px + env(safe-area-inset-bottom))" }}>
        <button
          type="button"
          onClick={() => onDone(file)}
          style={{
            flex: 1,
            padding: "15px",
            background: "transparent",
            border: "1px solid rgba(245,242,236,0.4)",
            borderRadius: 12,
            color: CANVAS,
            fontSize: 14,
            fontWeight: 400,
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          전체로 분석
        </button>
        <button
          type="button"
          onClick={apply}
          style={{
            flex: 1.4,
            padding: "15px",
            background: CANVAS,
            border: "none",
            borderRadius: 12,
            color: INK,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          이 영역만 분석
        </button>
      </div>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function clamp01(v: number) {
  return clamp(v, 0, 1);
}
