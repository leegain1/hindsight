import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없어요",
};

export default function NotFound() {
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
      paddingBottom: 80,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500&family=DM+Mono:wght@300;400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <svg width="32" height="32" viewBox="0 0 72 72" fill="none">
        <rect x="33" y="8" width="6" height="20" rx="1" fill="#D8D4CC" />
        <rect x="33" y="44" width="6" height="20" rx="1" fill="#D8D4CC" />
        <rect x="8" y="33" width="20" height="6" rx="1" fill="#D8D4CC" />
        <rect x="44" y="33" width="20" height="6" rx="1" fill="#D8D4CC" />
      </svg>

      <div style={{ textAlign: "center" }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px", marginBottom: 10 }}>
          404
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 300, color: "#0A0A0A", marginBottom: 10, letterSpacing: "-0.3px" }}>
          페이지를 찾을 수 없어요
        </h1>
        <p style={{ fontSize: 13, fontWeight: 300, color: "#8A8880", lineHeight: 1.6 }}>
          링크가 잘못되었거나 삭제된 페이지입니다.
        </p>
      </div>

      <Link
        href="/"
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
          textDecoration: "none",
          marginTop: 8,
        }}
      >
        홈으로 돌아가기
      </Link>
    </main>
  );
}
