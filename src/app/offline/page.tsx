"use client";

export default function OfflinePage() {
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

      <svg width="32" height="32" viewBox="0 0 72 72" fill="none" style={{ opacity: 0.2 }}>
        <rect x="33" y="8" width="6" height="20" rx="1" fill="#0A0A0A" />
        <rect x="33" y="44" width="6" height="20" rx="1" fill="#0A0A0A" />
        <rect x="8" y="33" width="20" height="6" rx="1" fill="#0A0A0A" />
        <rect x="44" y="33" width="20" height="6" rx="1" fill="#0A0A0A" />
      </svg>

      <div style={{ textAlign: "center" }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px", marginBottom: 10 }}>
          OFFLINE
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 300, color: "#0A0A0A", marginBottom: 10, letterSpacing: "-0.3px" }}>
          인터넷이 연결되어 있지 않아요
        </h1>
        <p style={{ fontSize: 13, fontWeight: 300, color: "#8A8880", lineHeight: 1.6, maxWidth: 280 }}>
          연결을 확인한 후 다시 시도해주세요.
          이전에 조회한 페이지는 캐시에서 볼 수 있어요.
        </p>
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          padding: "13px 28px",
          background: "#0A0A0A",
          color: "#F5F2EC",
          border: "none",
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 500,
          fontFamily: "'Space Grotesk', sans-serif",
          cursor: "pointer",
          marginTop: 8,
        }}
      >
        다시 시도
      </button>
    </main>
  );
}
