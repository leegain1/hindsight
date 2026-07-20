"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[HINDSIGHT+ Error]", error);
  }, [error]);

  return (
    <main style={{
      minHeight: "100dvh",
      background: "#F5F2EC",
      fontFamily: "'Space Grotesk', -apple-system, sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      gap: 16,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500&family=DM+Mono:wght@300;400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <div style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        background: "rgba(196,75,75,0.08)",
        border: "0.5px solid rgba(196,75,75,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{ fontSize: 20 }}>⚠</span>
      </div>

      <div style={{ textAlign: "center" }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#C44B4B", letterSpacing: "2px", marginBottom: 10 }}>
          ERROR
        </p>
        <h2 style={{ fontSize: 20, fontWeight: 300, color: "#0A0A0A", marginBottom: 10, letterSpacing: "-0.3px" }}>
          문제가 발생했어요
        </h2>
        <p style={{ fontSize: 13, fontWeight: 300, color: "#8A8880", lineHeight: 1.6, maxWidth: 280 }}>
          일시적인 오류입니다. 다시 시도하거나 홈으로 이동해주세요.
        </p>
        {error.digest && (
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#D8D4CC", marginTop: 8, letterSpacing: "0.5px" }}>
            {error.digest}
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={reset}
          style={{
            padding: "13px 24px",
            background: "#0A0A0A",
            color: "#F5F2EC",
            border: "none",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "'Space Grotesk', sans-serif",
            cursor: "pointer",
          }}
        >
          다시 시도
        </button>
        <a
          href="/"
          style={{
            padding: "13px 24px",
            background: "#EDEAE3",
            color: "#0A0A0A",
            border: "0.5px solid #D8D4CC",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 400,
            fontFamily: "'Space Grotesk', sans-serif",
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          홈으로
        </a>
      </div>
    </main>
  );
}
