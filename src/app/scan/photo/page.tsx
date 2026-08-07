"use client";

/**
 * 사진 기반 미등록 제품 분석 — 발표 슬라이드 4-3 / 5 가 요구하는 화면.
 *
 * 흐름: 사진 선택 → 파이프라인 진행(YOLO → OCR → Claude → 교차검증) → 결과
 * 데이터는 목이다. 교체 지점은 `analyzePhoto()` 하나뿐 — 이 파일은 안 고쳐도 된다.
 * 자세한 배경은 src/lib/mockPhotoAnalysis.ts 상단 주석 참고.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  analyzePhoto,
  RetakeError,
  PIPELINE_STAGES,
  TOTAL_PIPELINE_MS,
  type AnalyzedPhoto,
  type RiskItem,
  type ReviewSummary,
  type TrustBadge,
  type UserReview,
} from "@/lib/photoAnalysis";

const INK = "#0A0A0A";
const CANVAS = "#F5F2EC";
const CARD = "#EDEAE3";
const WHITE = "#FFFFFF";
const HAIRLINE = "#D8D4CC";
const MUTED = "#8A8880";

/** 저장한 분석 — 백엔드가 없어 localStorage 에 둔다 */
const SAVED_KEY = "hindsight_saved_analyses";

export interface SavedAnalysis {
  id: string;
  savedAt: number;
  productName: string;
  brand: string;
  score: number;
  label: string;
  color: string;
  riskCount: number;
}

/**
 * 고른 이미지를 data URL 로 읽는다.
 *
 * objectURL(blob:) 을 쓰면 html-to-image 가 캡처할 때 그 blob 을 다시 fetch 하다가
 * 실패해 PNG 저장이 통째로 깨진다. data URL 은 이미 문서 안에 들어있는 값이라
 * 추가 fetch 가 없다. 메모리를 조금 더 쓰지만 사진 한 장이라 문제되지 않는다.
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function readSaved(): SavedAnalysis[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? (JSON.parse(raw) as SavedAnalysis[]) : [];
  } catch {
    return [];
  }
}

function writeSaved(list: SavedAnalysis[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* 용량 초과 등 — 저장 실패해도 화면은 계속 동작해야 한다 */
  }
}

const SANS = "'Space Grotesk', -apple-system, sans-serif";
const MONO = "'DM Mono', monospace";

const RISK_COLOR: Record<RiskItem["level"], string> = {
  low: MUTED,
  mid: "#C4780A",
  high: "#C44B4B",
};

const RISK_LABEL: Record<RiskItem["level"], string> = {
  low: "낮음",
  mid: "보통",
  high: "높음",
};

type Phase = "idle" | "analyzing" | "done";

export default function PhotoScanPage() {
  // 카메라와 앨범은 같은 file input 으로 못 쓴다 — capture 속성 유무로 갈린다.
  // 그래서 input 을 두 개 두고, 선택 시트에서 어느 쪽을 열지 고르게 한다.
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<AnalyzedPhoto | null>(null);
  // 판독 실패로 다시 찍어야 할 때의 안내 문구. 목 폴백과 구분해서 다룬다.
  const [retake, setRetake] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedList, setSavedList] = useState<SavedAnalysis[]>([]);
  // 리포트 전체를 PNG 로 뽑을 때 캡처 대상
  const reportRef = useRef<HTMLDivElement>(null);
  const [imageState, setImageState] = useState<"idle" | "working" | "done" | "error">("idle");

  // localStorage 는 서버에 없다 — 마운트 후에 읽는다
  useEffect(() => {
    setSavedList(readSaved());
  }, []);

  // 홈에서 "제품 사진으로 분석"을 누르고 들어오면 곧바로 선택 시트를 띄운다.
  // (useSearchParams 는 Suspense 경계를 요구해서 location 을 직접 읽는다)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("open") === "1") {
      setSheetOpen(true);
    }
  }, []);

  // 시트가 열려 있는 동안 뒤 배경 스크롤을 막는다
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  // 분석 중 경과 시간 — 파이프라인 단계 진행을 그리는 기준
  useEffect(() => {
    if (phase !== "analyzing") return;
    const started = performance.now();
    const id = setInterval(() => setElapsed(performance.now() - started), 50);
    return () => clearInterval(id);
  }, [phase]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(await fileToDataUrl(file));
    setElapsed(0);
    setResult(null);
    setRetake(null);
    setSaved(false);
    setPhase("analyzing");

    try {
      const analysis = await analyzePhoto(file);
      setResult(analysis);
      setPhase("done");
    } catch (err) {
      // 판독 불가는 결과가 아니다 — 목으로 덮지 않고 다시 찍게 한다
      setRetake(
        err instanceof RetakeError
          ? err.message
          : "분석에 실패했어요. 잠시 후 다시 시도해주세요.",
      );
      setPreview(null);
      setPhase("idle");
    }

    // 같은 파일을 다시 골라도 change 가 발생하도록 초기화
    e.target.value = "";
  };

  const reset = () => {
    setPreview(null);
    setResult(null);
    setRetake(null);
    setElapsed(0);
    setSaved(false);
    setSavedList(readSaved());
    setPhase("idle");
  };

  /**
   * 리포트 전체를 PNG 로 내려받는다.
   * 발표에서 슬라이드에 붙일 이미지를 앱에서 바로 뽑을 수 있어야 해서 넣었다.
   * html-to-image 는 동적 import 로 — 첫 화면 번들에 250KB 를 얹을 이유가 없다.
   */
  const saveAsImage = async () => {
    const node = reportRef.current;
    if (!node || imageState === "working") return;
    setImageState("working");
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, {
        // 아이보리 캔버스를 명시하지 않으면 투명 배경으로 떨어진다
        backgroundColor: CANVAS,
        // 슬라이드에 확대해 넣어도 안 깨지도록 2배로
        pixelRatio: 2,
        cacheBust: true,
      });
      const a = document.createElement("a");
      const name = result?.detected.productName ?? "report";
      a.download = `hindsight-${name}.png`;
      a.href = dataUrl;
      a.click();
      setImageState("done");
      setTimeout(() => setImageState("idle"), 2500);
    } catch (err) {
      // 무엇 때문에 실패했는지 남긴다 — 조용히 실패하면 원인을 못 찾는다
      console.error("[photo] 리포트 이미지 저장 실패:", err);
      setImageState("error");
      setTimeout(() => setImageState("idle"), 3000);
    }
  };

  const save = () => {
    if (!result || saved) return;
    const entry: SavedAnalysis = {
      id: `${result.detected.brand}-${result.detected.productName}-${Date.now()}`,
      savedAt: Date.now(),
      productName: result.detected.productName,
      brand: result.detected.brand,
      score: result.verdict.score,
      label: result.verdict.label,
      color: result.verdict.color,
      riskCount: result.risks.length,
    };
    writeSaved([entry, ...readSaved()]);
    setSaved(true);
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: CANVAS,
        fontFamily: SANS,
        display: "flex",
        flexDirection: "column",
        paddingBottom: 64,
      }}
    >
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes sweep {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(400%); }
        }
      `}</style>

      <Header />

      {/* capture 있으면 카메라가 바로 뜨고, 없으면 앨범/파일 선택이 뜬다 */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: "none" }}
      />
      <input
        ref={albumInputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: "none" }}
      />

      <div style={{ flex: 1, maxWidth: 480, width: "100%", margin: "0 auto", padding: "24px 24px 32px" }}>
        {phase === "idle" && retake && (
          <div
            className="rise"
            style={{
              margin: "0 20px 4px",
              background: "#FBEFEF",
              border: "0.5px solid #E3C4C4",
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <p style={{ fontFamily: MONO, fontSize: 9, color: "#C44B4B", letterSpacing: "1.5px", marginBottom: 6 }}>
              RETAKE
            </p>
            <p style={{ fontSize: 13, color: INK, lineHeight: 1.6 }}>{retake}</p>
          </div>
        )}
        {phase === "idle" && <Intro onPick={() => setSheetOpen(true)} savedList={savedList} />}

        {phase === "analyzing" && <Analyzing preview={preview} elapsed={elapsed} />}

        {phase === "done" && result && (
          <Result
            result={result}
            preview={preview}
            saved={saved}
            onSave={save}
            reportRef={reportRef}
            imageState={imageState}
            onSaveImage={saveAsImage}
            onRetry={() => setSheetOpen(true)}
            onReset={reset}
          />
        )}
      </div>

      {sheetOpen && (
        <SourceSheet
          onClose={() => setSheetOpen(false)}
          onCamera={() => {
            setSheetOpen(false);
            cameraInputRef.current?.click();
          }}
          onAlbum={() => {
            setSheetOpen(false);
            albumInputRef.current?.click();
          }}
        />
      )}
    </main>
  );
}

/**
 * 사진 출처 선택 시트.
 * 카메라 버튼과 앨범 버튼을 화면에 따로 두지 않고, 버튼 하나 → 여기서 고르게 한다.
 */
function SourceSheet({
  onClose,
  onCamera,
  onAlbum,
}: {
  onClose: () => void;
  onCamera: () => void;
  onAlbum: () => void;
}) {
  // ESC 로 닫기 — 데스크탑에서 확인할 때 필요하다
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const options = [
    {
      key: "camera",
      label: "카메라로 촬영",
      hint: "지금 제품을 찍습니다",
      onClick: onCamera,
      icon: (
        <>
          <path d="M2 6.5A1.5 1.5 0 013.5 5h2L7 3h6l1.5 2h2A1.5 1.5 0 0118 6.5v9A1.5 1.5 0 0116.5 17h-13A1.5 1.5 0 012 15.5v-9z" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
          <circle cx="10" cy="11" r="3.2" stroke={INK} strokeWidth="1.2" />
        </>
      ),
    },
    {
      key: "album",
      label: "앨범에서 선택",
      hint: "저장된 사진을 고릅니다",
      onClick: onAlbum,
      icon: (
        <>
          <rect x="2.5" y="4" width="15" height="12" rx="1.5" stroke={INK} strokeWidth="1.2" />
          <path d="M2.5 13l4-3.5 3 2.5 3.5-3 4 3.5" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
          <circle cx="7" cy="7.8" r="1.1" stroke={INK} strokeWidth="1.2" />
        </>
      ),
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="사진 가져올 방법 선택"
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
    >
      {/* 배경 — 탭하면 닫힘 */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="sheet-scrim"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(10,10,10,0.45)",
          border: "none",
          padding: 0,
          minHeight: 0,
          minWidth: 0,
          cursor: "pointer",
        }}
      />

      <div
        className="sheet-panel"
        style={{
          position: "relative",
          background: CANVAS,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: "10px 20px calc(20px + env(safe-area-inset-bottom))",
          maxWidth: 480,
          width: "100%",
          margin: "0 auto",
        }}
      >
        {/* 그랩 핸들 */}
        <div aria-hidden="true" style={{ width: 36, height: 4, borderRadius: 2, background: HAIRLINE, margin: "0 auto 18px" }} />

        <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "2px", marginBottom: 14 }}>
          사진 가져오기
        </p>

        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={opt.onClick}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "15px 16px",
              marginBottom: 10,
              background: CARD,
              border: `0.5px solid ${HAIRLINE}`,
              borderRadius: 12,
              cursor: "pointer",
              textAlign: "left",
              touchAction: "manipulation",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
              {opt.icon}
            </svg>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontFamily: SANS, fontSize: 14, fontWeight: 500, color: INK }}>
                {opt.label}
              </span>
              <span style={{ display: "block", fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.5px", marginTop: 2 }}>
                {opt.hint}
              </span>
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            padding: "14px 16px",
            marginTop: 4,
            background: "transparent",
            border: "none",
            fontFamily: SANS,
            fontSize: 14,
            fontWeight: 400,
            color: MUTED,
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          취소
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function Header() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "calc(20px + env(safe-area-inset-top)) 24px 20px",
        borderBottom: `0.5px solid ${HAIRLINE}`,
        flexShrink: 0,
      }}
    >
      <Link href="/scan" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M11 3L5 9L11 15" stroke={INK} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 400, letterSpacing: "3px", color: INK }}>
          HINDSIGHT<span style={{ opacity: 0.25 }}>+</span>
        </span>
      </Link>
      <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "1.5px" }}>
        PHOTO
      </span>
    </header>
  );
}

function Intro({ onPick, savedList }: { onPick: () => void; savedList: SavedAnalysis[] }) {
  return (
    <div className="rise">
      <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "2px", marginBottom: 12 }}>
        NO BARCODE NEEDED
      </p>
      <h1 style={{ fontSize: 22, fontWeight: 300, color: INK, lineHeight: 1.25, letterSpacing: "-0.5px", marginBottom: 12 }}>
        사진 한 장이면<br />충분합니다
      </h1>
      <p style={{ fontSize: 14, fontWeight: 400, color: MUTED, lineHeight: 1.6, marginBottom: 28 }}>
        바코드가 없는 신제품·니치 브랜드·해외 직구 제품도
        제품을 찍기만 하면 바로 분석합니다.
      </p>

      <button
        type="button"
        onClick={onPick}
        style={{
          width: "100%",
          padding: "17px 20px",
          background: INK,
          border: "none",
          borderRadius: 12,
          fontFamily: SANS,
          fontSize: 14,
          fontWeight: 600,
          color: CANVAS,
          cursor: "pointer",
          touchAction: "manipulation",
          marginBottom: 20,
        }}
      >
        제품 촬영하기
      </button>

      <div style={{ background: CARD, border: `0.5px solid ${HAIRLINE}`, borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "1.5px", marginBottom: 12 }}>
          잘 찍는 법
        </p>
        {[
          "제품 앞면이 프레임에 꽉 차게",
          "제품명과 브랜드가 가려지지 않게",
          "반사광이 심하면 각도를 조금 틀어서",
        ].map((tip) => (
          <p
            key={tip}
            style={{ fontSize: 11, color: INK, lineHeight: 1.7, opacity: 0.75 }}
          >
            · {tip}
          </p>
        ))}
      </div>

      {savedList.length > 0 && (
        <section>
          <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "2px", marginBottom: 10 }}>
            저장한 분석 {savedList.length}
          </p>
          {savedList.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "13px 14px",
                marginBottom: 8,
                background: WHITE,
                border: `0.5px solid ${HAIRLINE}`,
                borderRadius: 12,
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: s.color,
                  letterSpacing: "-0.5px",
                  flexShrink: 0,
                  minWidth: 30,
                }}
              >
                {s.score}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: INK, letterSpacing: "-0.2px" }}>
                  {s.productName}
                </span>
                <span style={{ display: "block", fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.5px", marginTop: 2 }}>
                  {s.brand} · 주의 성분 {s.riskCount}
                </span>
              </span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  letterSpacing: "0.5px",
                  color: s.color,
                  background: `${s.color}14`,
                  borderRadius: 999,
                  padding: "3px 8px",
                  flexShrink: 0,
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function Analyzing({ preview, elapsed }: { preview: string | null; elapsed: number }) {
  const pct = Math.min(100, (elapsed / TOTAL_PIPELINE_MS) * 100);

  return (
    <div className="rise">
      {preview && (
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "4 / 3",
            borderRadius: 12,
            overflow: "hidden",
            border: `0.5px solid ${HAIRLINE}`,
            marginBottom: 24,
            background: CARD,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="분석 중인 제품 사진"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          {/* 스캔 라인 — 처리 중임을 시각적으로 알린다 */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                height: "25%",
                background: "linear-gradient(180deg, transparent, rgba(245,242,236,0.28), transparent)",
                animation: "sweep 1.6s linear infinite",
              }}
            />
          </div>
        </div>
      )}

      <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "2px", marginBottom: 16 }}>
        ANALYZING · {(elapsed / 1000).toFixed(1)}s
      </p>

      {/* 진행 바 */}
      <div style={{ height: 2, background: HAIRLINE, borderRadius: 2, overflow: "hidden", marginBottom: 24 }}>
        {/* width 가 아니라 scaleX 로 그린다 — width 애니메이션은 매 프레임 레이아웃을
            재계산시켜 저사양 기기에서 끊긴다. transform 은 합성 단계에서만 처리된다. */}
        <div
          style={{
            height: "100%",
            width: "100%",
            background: INK,
            transformOrigin: "left",
            transform: `scaleX(${pct / 100})`,
            transition: "transform 80ms linear",
          }}
        />
      </div>

      {PIPELINE_STAGES.map((stage) => {
        const done = elapsed >= stage.atMs;
        const active = !done && elapsed >= (PIPELINE_STAGES[PIPELINE_STAGES.indexOf(stage) - 1]?.atMs ?? 0);
        return (
          <div
            key={stage.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 0",
              borderBottom: `0.5px solid ${HAIRLINE}`,
              opacity: done || active ? 1 : 0.35,
              transition: "opacity 240ms ease",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 16,
                height: 16,
                flexShrink: 0,
                borderRadius: "50%",
                border: `1px solid ${done ? "#2A8A5C" : HAIRLINE}`,
                background: done ? "#2A8A5C" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {done && (
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke={CANVAS} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: done ? 600 : 400, color: INK }}>
              {stage.label}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "1px" }}>
              {stage.detail}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Result({
  result,
  preview,
  saved,
  onSave,
  reportRef,
  imageState,
  onSaveImage,
  onRetry,
  onReset,
}: {
  result: AnalyzedPhoto;
  preview: string | null;
  saved: boolean;
  onSave: () => void;
  reportRef: React.RefObject<HTMLDivElement | null>;
  imageState: "idle" | "working" | "done" | "error";
  onSaveImage: () => void;
  onRetry: () => void;
  onReset: () => void;
}) {
  const { detected, verdict, risks, personalized, factCheck, saferTips, reviews, meta } = result;

  return (
    <div className="rise">
      {/* reportRef 안쪽만 PNG 로 캡처된다 — 버튼류는 밖에 둔다 */}
      <div ref={reportRef} style={{ background: CANVAS }}>
      {/* 미등록 제품 배지 — Yuka 대비 차별점. 발표 슬라이드 4-3 의 핵심 */}
      {meta.unregistered && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: INK,
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 20,
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 9, color: "#2A8A5C", letterSpacing: "1.5px", flexShrink: 0 }}>
            UNREGISTERED
          </span>
          <span style={{ fontSize: 11, color: CANVAS, opacity: 0.75, lineHeight: 1.5 }}>
            바코드 DB 에 없는 제품입니다. 사진으로 분석했습니다.
          </span>
        </div>
      )}

      {/* 목 폴백으로 떨어진 결과는 실제 분석과 구분해서 표시한다.
          발표장에 인터넷이 없어 폴백이 기본 동작이지만, 그렇다고 목 데이터를
          실제 판독인 척 보여주면 그건 데모가 아니라 거짓말이 된다. */}
      {result.isDemo && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#EDEAE3",
            border: `0.5px solid ${HAIRLINE}`,
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 16,
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 8, color: CANVAS, background: MUTED, borderRadius: 4, padding: "3px 6px", letterSpacing: "1px", flexShrink: 0 }}>
            DEMO
          </span>
          <span style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>
            분석 서버에 연결하지 못해 준비된 예시 결과를 보여주고 있습니다.
          </span>
        </div>
      )}

      {/* 영양성분 일부를 못 읽었으면 점수가 후하게 나온다 — 숨기지 않는다 */}
      {result.partialRead && !result.isDemo && (
        <div
          style={{
            background: "#FAF4E8",
            border: "0.5px solid #E0D3B8",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 11, color: "#8A6D2F", lineHeight: 1.5 }}>
            사진에서 읽지 못한 영양성분이 있어 그 항목은 계산에서 뺐습니다. 실제 점수는 더 낮을 수 있어요.
          </span>
        </div>
      )}

      {/* 판정 */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "1.5px", marginBottom: 6 }}>
            {detected.brand}
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: INK, letterSpacing: "-0.5px", lineHeight: 1.2 }}>
            {detected.productName}
          </h1>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: 44, fontWeight: 700, color: verdict.color, letterSpacing: "-1.5px", lineHeight: 1 }}>
            {verdict.score}
          </p>
          <p style={{ fontFamily: MONO, fontSize: 9, color: verdict.color, letterSpacing: "1.5px" }}>
            {verdict.label}
          </p>
        </div>
      </div>

      <p style={{ fontSize: 14, color: INK, lineHeight: 1.6, opacity: 0.8, marginBottom: 24 }}>
        {verdict.body}
      </p>

      {preview && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="분석한 제품 사진"
            style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: `0.5px solid ${HAIRLINE}`, flexShrink: 0 }}
          />
          <p style={{ flex: 1, fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.5px", lineHeight: 1.6 }}>
            인식 정확도 {Math.round(detected.confidence * 100)}%<br />
            {(meta.elapsedMs / 1000).toFixed(1)}초 · {meta.model}
          </p>

          {/* 저장 — 백엔드가 없어 이 기기에만 남는다 */}
          <button
            type="button"
            onClick={onSave}
            disabled={saved}
            aria-label={saved ? "저장됨" : "이 분석 저장하기"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 14px",
              background: saved ? "transparent" : INK,
              border: saved ? `0.5px solid ${HAIRLINE}` : "none",
              borderRadius: 999,
              fontFamily: SANS,
              fontSize: 12,
              fontWeight: 500,
              color: saved ? MUTED : CANVAS,
              cursor: saved ? "default" : "pointer",
              touchAction: "manipulation",
              flexShrink: 0,
              minHeight: 0,
              minWidth: 0,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              {saved ? (
                <path d="M2 6.2L4.6 8.8L10 3.4" stroke={MUTED} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M3 1.5h6v9L6 8.2 3 10.5v-9z" stroke={CANVAS} strokeWidth="1.2" strokeLinejoin="round" />
              )}
            </svg>
            {saved ? "저장됨" : "저장"}
          </button>
        </div>
      )}

      {/* ② 개인 맞춤 — 같은 제품, 다른 결과 */}
      {personalized && personalized.matched.length > 0 && (
        <Section label="MY PROFILE" title="회원님 기준으로는 다릅니다">
          {personalized.matched.map((m) => (
            <RiskRow key={m.name} item={m} />
          ))}
          <p style={{ fontSize: 11, color: INK, opacity: 0.75, lineHeight: 1.7, marginTop: 10 }}>
            {personalized.note}
          </p>
        </Section>
      )}

      {/* 위험 성분 — 요약 칩으로 먼저 훑고, 목록으로 확인한다 */}
      <Section label="INGREDIENTS" title="주의할 성분">
        <RiskSummary risks={risks} />
        {risks.map((r) => (
          <RiskRow key={r.name} item={r} />
        ))}
      </Section>

      {/* ④ 팩트체킹 */}
      <Section label="FACT CHECK" title="광고가 아니라 근거로">
        {factCheck.map((f) => {
          const ok = f.verdict === "근거 있음";
          const fg = ok ? "#2A8A5C" : "#C4780A";
          return (
            <div key={f.claim} style={{ padding: "14px 0", borderTop: `0.5px solid ${HAIRLINE}` }}>
              {/* 판정 뱃지를 한 줄 위로 올려 크게 — 문장에 묻히면 안 읽힌다 */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontFamily: MONO,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.5px",
                  color: fg,
                  background: `${fg}14`,
                  border: `0.5px solid ${fg}40`,
                  borderRadius: 999,
                  padding: "5px 11px",
                  marginBottom: 8,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  {ok ? (
                    <path d="M2 6.2L4.8 9L10 3.2" stroke={fg} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <>
                      <circle cx="6" cy="6" r="4.6" stroke={fg} strokeWidth="1.2" />
                      <path d="M6 3.5v3M6 8.3v.2" stroke={fg} strokeWidth="1.4" strokeLinecap="round" />
                    </>
                  )}
                  </svg>
                {f.verdict}
              </span>
              <p style={{ fontSize: 14, fontWeight: 600, color: INK, lineHeight: 1.45, marginBottom: 5 }}>
                “{f.claim}”
              </p>
              <p style={{ fontSize: 12, color: INK, opacity: 0.65, lineHeight: 1.65, marginBottom: 6 }}>
                {f.detail}
              </p>
              <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.3px", lineHeight: 1.5 }}>
                출처 · {f.source}
              </p>
            </div>
          );
        })}
      </Section>

      {/* ⑤ 사용자 후기 + 신뢰 뱃지 — 탭하면 전체 후기 페이지로 */}
      <ReviewSection reviews={reviews} />

      {/* 대안 */}
      <Section label="BETTER CHOICE" title="이렇게 드시면">
        {saferTips.map((tip) => (
          <p key={tip} style={{ fontSize: 14, color: INK, opacity: 0.8, lineHeight: 1.7, marginBottom: 8 }}>
            · {tip}
          </p>
        ))}
      </Section>

      </div>
      {/* ── 여기부터는 캡처 대상 밖 ── */}

      {/* 리포트 전체를 이미지로 — 발표 슬라이드에 붙일 컷을 앱에서 바로 뽑는다 */}
      <button
        type="button"
        onClick={onSaveImage}
        disabled={imageState === "working"}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "15px 20px",
          marginTop: 18,
          background: WHITE,
          border: `0.5px solid ${HAIRLINE}`,
          borderRadius: 12,
          fontFamily: SANS,
          fontSize: 14,
          fontWeight: 500,
          color: imageState === "error" ? "#C44B4B" : INK,
          cursor: imageState === "working" ? "default" : "pointer",
          touchAction: "manipulation",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1.5v8M8 9.5L5 6.5M8 9.5l3-3" stroke={INK} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2 11v2.5A1 1 0 003 14.5h10a1 1 0 001-1V11" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        {imageState === "working"
          ? "이미지 만드는 중…"
          : imageState === "done"
            ? "저장했어요"
            : imageState === "error"
              ? "실패했어요. 다시 시도"
              : "리포트를 사진으로 저장"}
      </button>

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button
          type="button"
          onClick={onRetry}
          style={{
            flex: 1,
            padding: "15px 20px",
            background: INK,
            border: "none",
            borderRadius: 12,
            fontFamily: SANS,
            fontSize: 14,
            fontWeight: 600,
            color: CANVAS,
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          다른 제품 분석
        </button>
        <button
          type="button"
          onClick={onReset}
          style={{
            padding: "15px 20px",
            background: "transparent",
            border: `0.5px solid ${HAIRLINE}`,
            borderRadius: 12,
            fontFamily: SANS,
            fontSize: 14,
            fontWeight: 400,
            color: INK,
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          처음으로
        </button>
      </div>
    </div>
  );
}

/**
 * 콘텐츠 섹션 — 흰 카드로 띄운다.
 * 아이보리 캔버스(#F5F2EC) 위에 본문까지 같은 색이면 어디서 끊기는지 안 보인다.
 * 카드로 올리면 섹션 경계가 생겨 스크롤하면서 훑기 쉬워진다.
 */
function Section({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        marginBottom: 14,
        background: WHITE,
        border: `0.5px solid ${HAIRLINE}`,
        borderRadius: 12,
        padding: "18px 16px",
      }}
    >
      <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "2px", marginBottom: 4 }}>
        {label}
      </p>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: INK, letterSpacing: "-0.3px", marginBottom: 12 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

const BADGE_TONE: Record<TrustBadge["tone"], { fg: string; bg: string; bd: string }> = {
  positive: { fg: "#2A8A5C", bg: "#2A8A5C14", bd: "#2A8A5C40" },
  neutral: { fg: "#3B7DD4", bg: "#3B7DD414", bd: "#3B7DD440" },
  caution: { fg: "#C4780A", bg: "#C4780A14", bd: "#C4780A40" },
};

/** 신뢰 뱃지 한 개. 라벨만 두지 않고 근거를 같이 보여준다 */
function TrustBadgeChip({ badge, showBasis = false }: { badge: TrustBadge; showBasis?: boolean }) {
  const tone = BADGE_TONE[badge.tone];
  return (
    <div style={{ marginBottom: showBasis ? 8 : 0 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontFamily: MONO,
          fontSize: 9,
          letterSpacing: "0.5px",
          color: tone.fg,
          background: tone.bg,
          border: `0.5px solid ${tone.bd}`,
          borderRadius: 999,
          padding: "5px 10px",
        }}
      >
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M5 0.8l1.1 2.3 2.5.4-1.8 1.8.4 2.5L5 6.6 2.8 7.8l.4-2.5L1.4 3.5l2.5-.4L5 .8z" fill={tone.fg} />
        </svg>
        {badge.label}
      </span>
      {showBasis && (
        <p style={{ fontSize: 11, color: INK, opacity: 0.6, lineHeight: 1.6, marginTop: 4 }}>
          {badge.basis}
        </p>
      )}
    </div>
  );
}

/** 별점 표시 */
function Stars({ rating, size = 11 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }} aria-label={`5점 만점에 ${rating}점`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path
            d="M5 0.8l1.1 2.3 2.5.4-1.8 1.8.4 2.5L5 6.6 2.8 7.8l.4-2.5L1.4 3.5l2.5-.4L5 .8z"
            fill={i <= Math.round(rating) ? "#C4780A" : "#D8D4CC"}
          />
        </svg>
      ))}
    </span>
  );
}

/**
 * ⑤ 사용자 후기 + 신뢰 뱃지 섹션.
 * 리포트에는 요약과 상위 2건만 두고, 전체는 별도 페이지로 넘긴다.
 */
function ReviewSection({ reviews }: { reviews: ReviewSummary }) {
  return (
    <section
      style={{
        marginBottom: 14,
        background: WHITE,
        border: `0.5px solid ${HAIRLINE}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "18px 16px 0" }}>
        <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "2px", marginBottom: 4 }}>
          REVIEWS
        </p>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: INK, letterSpacing: "-0.3px", marginBottom: 12 }}>
          사용자 후기와 신뢰 뱃지
        </h2>

        {/* 평점 요약 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: INK, letterSpacing: "-1px", lineHeight: 1 }}>
            {reviews.rating.toFixed(1)}
          </span>
          <span>
            <Stars rating={reviews.rating} size={12} />
            <span style={{ display: "block", fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.5px", marginTop: 3 }}>
              후기 {reviews.totalCount} · 구매 확인 {reviews.verifiedCount}
            </span>
          </span>
        </div>

        {/* 신뢰 뱃지 */}
        <div style={{ marginBottom: 14 }}>
          {reviews.badges.map((b) => (
            <TrustBadgeChip key={b.id} badge={b} showBasis />
          ))}
        </div>

        {/* 상위 후기 미리보기 2건 */}
        {reviews.top.slice(0, 2).map((r) => (
          <ReviewRow key={r.id} review={r} />
        ))}
      </div>

      {/* 전체 후기로 이동 */}
      <Link
        href="/scan/photo/reviews"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "15px 16px",
          marginTop: 14,
          borderTop: `0.5px solid ${HAIRLINE}`,
          background: CARD,
          textDecoration: "none",
          fontFamily: SANS,
          fontSize: 14,
          fontWeight: 500,
          color: INK,
        }}
      >
        후기 {reviews.totalCount}개 모두 보기
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M2 7H12M12 7L7 2M12 7L7 12" stroke={INK} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </section>
  );
}

export function ReviewRow({ review }: { review: UserReview }) {
  return (
    <div style={{ padding: "12px 0", borderTop: `0.5px solid ${HAIRLINE}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
        <Stars rating={review.rating} />
        <span style={{ fontSize: 12, fontWeight: 500, color: INK }}>{review.userName}</span>
        {review.verified && (
          <span
            style={{
              fontFamily: MONO,
              fontSize: 8,
              letterSpacing: "0.5px",
              color: "#2A8A5C",
              background: "#2A8A5C14",
              borderRadius: 999,
              padding: "2px 6px",
            }}
          >
            구매확인
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.3px" }}>
          도움 {review.helpfulCount}
        </span>
      </div>
      <p style={{ fontSize: 12, color: INK, opacity: 0.7, lineHeight: 1.65 }}>{review.body}</p>
    </div>
  );
}

/**
 * 위험도 한눈 요약 — 목록을 다 읽기 전에 "몇 개가 얼마나 위험한지"를 먼저 준다.
 */
function RiskSummary({ risks }: { risks: RiskItem[] }) {
  const order: RiskItem["level"][] = ["high", "mid", "low"];
  const counts = order
    .map((level) => ({ level, n: risks.filter((r) => r.level === level).length }))
    .filter((c) => c.n > 0);

  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
      {counts.map(({ level, n }) => (
        <span
          key={level}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontFamily: MONO,
            fontSize: 9,
            letterSpacing: "0.5px",
            color: RISK_COLOR[level],
            background: `${RISK_COLOR[level]}14`,
            border: `0.5px solid ${RISK_COLOR[level]}40`,
            borderRadius: 999,
            padding: "5px 10px",
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: RISK_COLOR[level] }} />
          {RISK_LABEL[level]} {n}
        </span>
      ))}
    </div>
  );
}

function RiskRow({ item }: { item: RiskItem }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 0",
        borderTop: `0.5px solid ${HAIRLINE}`,
      }}
    >
      {/* 왼쪽 색 막대 — 스크롤하며 훑을 때 위험도가 먼저 눈에 들어온다 */}
      <span
        aria-hidden="true"
        style={{
          width: 3,
          borderRadius: 2,
          background: RISK_COLOR[item.level],
          flexShrink: 0,
          alignSelf: "stretch",
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: INK, letterSpacing: "-0.2px" }}>
            {item.name}
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: "0.5px",
              color: RISK_COLOR[item.level],
              background: `${RISK_COLOR[item.level]}14`,
              borderRadius: 999,
              padding: "3px 8px",
              flexShrink: 0,
            }}
          >
            {RISK_LABEL[item.level]}
          </span>
        </div>
        <p style={{ fontSize: 12, color: INK, opacity: 0.65, lineHeight: 1.65 }}>{item.reason}</p>
      </div>
    </div>
  );
}
