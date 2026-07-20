"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Phase = "idle" | "scanning" | "processing" | "error";

function isSecureCtx() {
  if (typeof window === "undefined") return true;
  return window.isSecureContext;
}

export default function ScanPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [manualCode, setManualCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isHttpWarning, setIsHttpWarning] = useState(false);
  const scannerRef = useRef<unknown>(null);
  const detectedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Separate manual code state for the in-camera input
  const [cameraManualCode, setCameraManualCode] = useState("");

  useEffect(() => {
    setIsHttpWarning(!isSecureCtx());
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (scannerRef.current as any).stop();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (scannerRef.current as any).clear();
      } catch { /* ignore */ }
      scannerRef.current = null;
    }
    // Nuke any canvas/video the library left behind
    const el = document.getElementById("qr-reader");
    if (el) el.innerHTML = "";
  }, []);

  useEffect(() => {
    if (phase !== "scanning") return;

    detectedRef.current = false;
    let mounted = true;

    (async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (!mounted) return;

        const scanner = new Html5Qrcode("qr-reader", {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 160 } },
          async (decodedText) => {
            if (detectedRef.current) return;
            detectedRef.current = true;
            await stopScanner();
            router.push(`/scan/result/${encodeURIComponent(decodedText)}`);
          },
          () => { /* per-frame error — ignore */ }
        );
      } catch (err) {
        if (!mounted) return;
        const msg = err instanceof Error ? err.message.toLowerCase() : "";
        const isPermDenied =
          msg.includes("permission") ||
          msg.includes("notallowed") ||
          msg.includes("denied");
        const isHttps = !isSecureCtx();

        if (isHttps) {
          // Non-secure context: auto-fallback to idle, show HTTP warning banner
          setIsHttpWarning(true);
          setPhase("idle");
        } else if (isPermDenied) {
          setErrorMsg("카메라 접근 권한이 거부됐습니다. 브라우저 설정에서 카메라를 허용해주세요.");
          setPhase("error");
        } else {
          setErrorMsg("카메라를 시작할 수 없습니다. 다른 앱이 카메라를 사용 중이거나 카메라가 없을 수 있어요.");
          setPhase("error");
        }
      }
    })();

    return () => {
      mounted = false;
      void stopScanner();
    };
  }, [phase, router, stopScanner]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPhase("processing");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-file-reader");
      const result = await scanner.scanFile(file, false);
      router.push(`/scan/result/${encodeURIComponent(result)}`);
    } catch {
      setErrorMsg("이미지에서 바코드를 인식할 수 없어요. 바코드가 선명하게 나온 사진으로 다시 시도해보세요.");
      setPhase("error");
    }
  };

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (!code) return;
    router.push(`/scan/result/${encodeURIComponent(code)}`);
  };

  const handleCameraManualSubmit = () => {
    const code = cameraManualCode.trim();
    if (!code) return;
    void stopScanner();
    router.push(`/scan/result/${encodeURIComponent(code)}`);
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const startCamera = () => {
    setCameraManualCode("");
    setPhase("scanning");
  };

  const closeCamera = () => {
    void stopScanner();
    setPhase("idle");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: rgba(10,10,10,0.3); }
        .camera-input::placeholder { color: rgba(245,242,236,0.35); }

        /* ── html5-qrcode: strip all its own chrome, block pointer events on media ── */
        #qr-reader canvas,
        #qr-reader video          { pointer-events: none !important; }
        #qr-reader                { border: none !important; padding: 0 !important; width: 100% !important; height: 100% !important; }
        #qr-reader video          { width: 100% !important; height: 100% !important; object-fit: cover !important; border-radius: 0 !important; display: block !important; }
        #qr-reader__dashboard,
        #qr-reader__status_span,
        #qr-reader__camera_selection,
        #qr-reader__filescan_input,
        #qr-reader__header_message,
        #qr-shaded-region,
        #qr-reader img[alt="Info icon"] { display: none !important; }

        /* Tap-to-scan logo: press scale + visual feedback */
        .tap-btn               { transition: transform 0.1s ease, background 0.1s ease; touch-action: manipulation; }
        .tap-btn:active        { transform: scale(0.91); }

        /* Primary action buttons */
        .primary-btn:active    { opacity: 0.85; }
        .ghost-btn:active      { opacity: 0.7; }

        @keyframes scanPulse {
          0%, 100% { opacity: 1; transform: scaleX(1); }
          50%       { opacity: 0.4; transform: scaleX(0.85); }
        }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* ── Off-screen anchor for file-scan (never intercepts touches) ── */}
      <div
        id="qr-file-reader"
        style={{ position: "fixed", top: -9999, left: -9999, width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />

      {/* ════════════════════════════════════════════════════════════════════════
          CAMERA OVERLAY
          position:fixed so it is completely isolated from the main page.
          Canvas/video inside #qr-reader have pointer-events:none (CSS above).
          Every tappable element here has an explicit min 44×44px touch target.
         ════════════════════════════════════════════════════════════════════════ */}
      {phase === "scanning" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "#000",
            display: "flex",
            flexDirection: "column",
            animation: "fadeIn 0.2s ease",
          }}
        >
          {/* Camera feed — fills available space above the bottom bar */}
          <div
            id="qr-reader"
            style={{ flex: 1, minHeight: 0, background: "#000", position: "relative" }}
          />

          {/* Scan-guide frame (decorative only — pointer-events:none) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              bottom: 180, // keep above the input bar
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div style={{ position: "relative", width: 260, height: 160 }}>
              {/* Corner brackets */}
              <div style={{ position: "absolute", top: -1, left: -1,    width: 28, height: 28, borderTop:    "2.5px solid #F5F2EC", borderLeft:   "2.5px solid #F5F2EC", borderRadius: "5px 0 0 0" }} />
              <div style={{ position: "absolute", top: -1, right: -1,   width: 28, height: 28, borderTop:    "2.5px solid #F5F2EC", borderRight:  "2.5px solid #F5F2EC", borderRadius: "0 5px 0 0" }} />
              <div style={{ position: "absolute", bottom: -1, left: -1,  width: 28, height: 28, borderBottom: "2.5px solid #F5F2EC", borderLeft:   "2.5px solid #F5F2EC", borderRadius: "0 0 0 5px" }} />
              <div style={{ position: "absolute", bottom: -1, right: -1, width: 28, height: 28, borderBottom: "2.5px solid #F5F2EC", borderRight:  "2.5px solid #F5F2EC", borderRadius: "0 0 5px 0" }} />
              {/* Scan line */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  right: 0,
                  height: 1.5,
                  background: "linear-gradient(90deg, transparent, rgba(245,242,236,0.7), transparent)",
                  animation: "scanPulse 1.6s ease-in-out infinite",
                }}
              />
            </div>
          </div>

          {/* Top bar: hint + close button */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              padding: "16px 20px",
              paddingTop: "max(16px, env(safe-area-inset-top))",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)",
              pointerEvents: "none", // gradient is decorative; only the button below gets events
            }}
          >
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: "rgba(245,242,236,0.55)",
                letterSpacing: "1.5px",
              }}
            >
              바코드를 프레임 안에 맞추세요
            </span>

            {/* Close — explicit pointer-events:auto to override parent "none" */}
            <button
              type="button"
              onClick={closeCamera}
              className="ghost-btn"
              style={{
                pointerEvents: "auto",
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(245,242,236,0.14)",
                border: "0.5px solid rgba(245,242,236,0.22)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#F5F2EC",
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          {/* Bottom overlay: manual input + photo fallback */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "rgba(6,6,6,0.82)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              padding: "20px 20px",
              paddingBottom: "max(28px, env(safe-area-inset-bottom))",
              borderTop: "0.5px solid rgba(245,242,236,0.1)",
            }}
          >
            {/* Hint label */}
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 8,
                color: "rgba(245,242,236,0.4)",
                letterSpacing: "1.5px",
                marginBottom: 10,
              }}
            >
              또는 직접 입력
            </p>

            {/* Input row */}
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                background: "rgba(245,242,236,0.08)",
                border: "0.5px solid rgba(245,242,236,0.15)",
                borderRadius: 12,
                padding: "4px 4px 4px 14px",
                marginBottom: 14,
              }}
            >
              <input
                type="text"
                inputMode="numeric"
                value={cameraManualCode}
                onChange={(e) => setCameraManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCameraManualSubmit()}
                placeholder="바코드 번호 직접 입력"
                className="camera-input"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 14,
                  fontWeight: 300,
                  color: "#F5F2EC",
                  fontFamily: "'DM Mono', monospace",
                  letterSpacing: "1px",
                  minHeight: 44,
                }}
              />
              <button
                type="button"
                onClick={handleCameraManualSubmit}
                disabled={!cameraManualCode.trim()}
                className="primary-btn"
                style={{
                  padding: "10px 16px",
                  minHeight: 44,
                  background: cameraManualCode.trim() ? "#F5F2EC" : "rgba(245,242,236,0.15)",
                  color: cameraManualCode.trim() ? "#0A0A0A" : "rgba(245,242,236,0.35)",
                  border: "none",
                  borderRadius: 9,
                  fontSize: 12,
                  fontFamily: "'DM Mono', monospace",
                  letterSpacing: "1px",
                  cursor: cameraManualCode.trim() ? "pointer" : "default",
                  flexShrink: 0,
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
              >
                검색 →
              </button>
            </div>

            {/* Photo fallback — smaller secondary option */}
            <button
              type="button"
              onClick={triggerFileInput}
              className="ghost-btn"
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "rgba(245,242,236,0.06)",
                border: "0.5px solid rgba(245,242,236,0.12)",
                borderRadius: 10,
                color: "rgba(245,242,236,0.6)",
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                letterSpacing: "1px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              🖼️ <span>갤러리에서 바코드 사진 선택</span>
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MAIN PAGE — always tappable; camera overlay sits above via z-index
         ════════════════════════════════════════════════════════════════════════ */}
      <main
        style={{
          minHeight: "100dvh",
          background: "#F5F2EC",
          fontFamily: "'Space Grotesk', -apple-system, sans-serif",
          display: "flex",
          flexDirection: "column",
          paddingBottom: 64,
        }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "0.5px solid #D8D4CC",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 72 72" fill="none">
              <rect x="33" y="8"  width="6" height="20" rx="1" fill="#0A0A0A" />
              <rect x="33" y="44" width="6" height="20" rx="1" fill="#0A0A0A" />
              <rect x="8"  y="33" width="20" height="6" rx="1" fill="#0A0A0A" />
              <rect x="44" y="33" width="20" height="6" rx="1" fill="#0A0A0A" />
            </svg>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 300, letterSpacing: "3px", color: "#0A0A0A" }}>
              HINDSIGHT<span style={{ opacity: 0.25 }}>+</span>
            </span>
          </div>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1.5px" }}>SCAN</span>
        </header>

        {/* ── IDLE ── */}
        {phase === "idle" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "28px 24px 24px",
              gap: 16,
              animation: "fadeUp 0.3s ease",
              maxWidth: 480,
              margin: "0 auto",
              width: "100%",
            }}
          >
            {/* ── Tap-to-scan logo ── */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <button
                type="button"
                onClick={startCamera}
                className="tap-btn"
                aria-label="카메라로 스캔"
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: "50%",
                  background: "#0A0A0A",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(10,10,10,0.18)",
                }}
              >
                <svg width="40" height="40" viewBox="0 0 72 72" fill="none">
                  <rect x="33" y="8"  width="6" height="20" rx="1" fill="#F5F2EC" />
                  <rect x="33" y="44" width="6" height="20" rx="1" fill="#F5F2EC" />
                  <rect x="8"  y="33" width="20" height="6" rx="1" fill="#F5F2EC" />
                  <rect x="44" y="33" width="20" height="6" rx="1" fill="#F5F2EC" />
                </svg>
              </button>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "2.5px" }}>
                TAP TO SCAN
              </p>
            </div>

            <div style={{ textAlign: "center", marginBottom: 4 }}>
              <h2 style={{ fontSize: 20, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.3, letterSpacing: "-0.3px" }}>
                바코드를 스캔해<br />성분을 분석하세요
              </h2>
            </div>

            {/* HTTPS warning banner */}
            {isHttpWarning && (
              <div
                style={{
                  width: "100%",
                  background: "rgba(196,120,10,0.08)",
                  border: "0.5px solid rgba(196,120,10,0.3)",
                  borderRadius: 10,
                  padding: "10px 14px",
                }}
              >
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#C4780A", letterSpacing: "1px", marginBottom: 4 }}>HTTP 연결 감지됨 — 카메라 사용 불가</p>
                <p style={{ fontSize: 11, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.55 }}>
                  모바일 카메라는 HTTPS가 필요합니다. 아래 대안을 이용하거나{" "}
                  <code style={{ fontFamily: "'DM Mono', monospace", fontSize: 10 }}>npm run dev:https</code>로 재시작하세요.
                </p>
              </div>
            )}

            {/* Camera button (explicit large button — belt-and-suspenders with the logo) */}
            <button
              type="button"
              onClick={startCamera}
              className="primary-btn"
              style={{
                width: "100%",
                padding: "16px 24px",
                background: "#0A0A0A",
                color: "#F5F2EC",
                border: "none",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "0.5px",
                cursor: "pointer",
                touchAction: "manipulation",
              }}
            >
              📷 카메라로 스캔
            </button>

            {/* Photo from gallery */}
            <button
              type="button"
              onClick={triggerFileInput}
              className="primary-btn"
              style={{
                width: "100%",
                padding: "14px 24px",
                background: "#EDEAE3",
                color: "#0A0A0A",
                border: "0.5px solid #D8D4CC",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 400,
                fontFamily: "'Space Grotesk', sans-serif",
                cursor: "pointer",
                touchAction: "manipulation",
              }}
            >
              🖼️ 갤러리에서 바코드 사진 선택
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", margin: "2px 0" }}>
              <div style={{ flex: 1, height: "0.5px", background: "#D8D4CC" }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "1px" }}>OR</span>
              <div style={{ flex: 1, height: "0.5px", background: "#D8D4CC" }} />
            </div>

            {/* Manual barcode entry — always visible */}
            <div style={{ width: "100%" }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "1.5px", marginBottom: 8 }}>
                바코드 번호 직접 입력
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  background: "#EDEAE3",
                  border: "0.5px solid #D8D4CC",
                  borderRadius: 12,
                  padding: "4px 4px 4px 14px",
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  inputMode="numeric"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                  placeholder="예: 8801043012345"
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: 14,
                    fontWeight: 300,
                    color: "#0A0A0A",
                    fontFamily: "'DM Mono', monospace",
                    letterSpacing: "1px",
                    minHeight: 44,
                  }}
                />
                <button
                  type="button"
                  onClick={handleManualSubmit}
                  disabled={!manualCode.trim()}
                  style={{
                    padding: "10px 16px",
                    minHeight: 44,
                    background: manualCode.trim() ? "#0A0A0A" : "#D8D4CC",
                    color: "#F5F2EC",
                    border: "none",
                    borderRadius: 9,
                    fontSize: 12,
                    fontFamily: "'DM Mono', monospace",
                    letterSpacing: "1px",
                    cursor: manualCode.trim() ? "pointer" : "default",
                    flexShrink: 0,
                    transition: "background 0.15s ease",
                    touchAction: "manipulation",
                  }}
                >
                  검색 →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {phase === "processing" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
              padding: "32px 24px",
              animation: "fadeUp 0.2s ease",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                border: "2px solid #EDEAE3",
                borderTopColor: "#0A0A0A",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px", marginBottom: 6 }}>
                SCANNING IMAGE
              </p>
              <p style={{ fontSize: 13, fontWeight: 300, color: "#0A0A0A" }}>바코드 인식 중...</p>
            </div>
          </div>
        )}

        {/* ── ERROR ── */}
        {phase === "error" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "40px 24px",
              maxWidth: 480,
              margin: "0 auto",
              width: "100%",
              animation: "fadeUp 0.25s ease",
            }}
          >
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#C44B4B", letterSpacing: "2px", marginBottom: 8 }}>
                CAMERA ERROR
              </p>
              <p style={{ fontSize: 14, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.6 }}>{errorMsg}</p>
            </div>

            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px", marginBottom: 14 }}>
              대안 방법
            </p>

            {/* Photo scan */}
            <button
              type="button"
              onClick={triggerFileInput}
              style={{
                width: "100%",
                padding: "15px 20px",
                background: "#EDEAE3",
                border: "0.5px solid #D8D4CC",
                borderRadius: 12,
                fontSize: 14,
                fontFamily: "'Space Grotesk', sans-serif",
                color: "#0A0A0A",
                cursor: "pointer",
                marginBottom: 10,
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 12,
                touchAction: "manipulation",
              }}
            >
              <span style={{ fontSize: 20 }}>🖼️</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>바코드 사진으로 스캔</p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "0.5px" }}>갤러리 사진 또는 카메라 촬영</p>
              </div>
            </button>

            {/* Manual entry shortcut → back to idle */}
            <button
              type="button"
              onClick={() => { setErrorMsg(""); setPhase("idle"); }}
              style={{
                width: "100%",
                padding: "15px 20px",
                background: "#EDEAE3",
                border: "0.5px solid #D8D4CC",
                borderRadius: 12,
                fontSize: 14,
                fontFamily: "'Space Grotesk', sans-serif",
                color: "#0A0A0A",
                cursor: "pointer",
                marginBottom: 24,
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 12,
                touchAction: "manipulation",
              }}
            >
              <span style={{ fontSize: 20 }}>✏️</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>바코드 번호 직접 입력</p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "0.5px" }}>숫자 바코드를 직접 입력</p>
              </div>
            </button>

            {/* Retry camera */}
            <button
              type="button"
              onClick={() => { setErrorMsg(""); setPhase("scanning"); }}
              style={{
                background: "none",
                border: "none",
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: "#8A8880",
                letterSpacing: "1px",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                padding: "12px 8px",
                touchAction: "manipulation",
              }}
            >
              카메라 다시 시도
            </button>
          </div>
        )}
      </main>
    </>
  );
}
