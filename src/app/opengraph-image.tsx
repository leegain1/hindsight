import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "HINDSIGHT+ — 성분을 알면 선택이 달라진다";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0A0A0A",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: "60px",
        }}
      >
        {/* Logo cross */}
        <svg width="64" height="64" viewBox="0 0 72 72" fill="none">
          <rect x="33" y="8" width="6" height="20" rx="1" fill="#F5F2EC" />
          <rect x="33" y="44" width="6" height="20" rx="1" fill="#F5F2EC" />
          <rect x="8" y="33" width="20" height="6" rx="1" fill="#F5F2EC" />
          <rect x="44" y="33" width="20" height="6" rx="1" fill="#F5F2EC" />
        </svg>

        {/* Wordmark */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 300,
            color: "#F5F2EC",
            letterSpacing: "16px",
            display: "flex",
          }}
        >
          HINDSIGHT
          <span style={{ opacity: 0.2 }}>+</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 26,
            fontWeight: 300,
            color: "rgba(245,242,236,0.45)",
            letterSpacing: "2px",
          }}
        >
          성분을 알면 선택이 달라진다.
        </div>

        {/* Bottom pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 24px",
            background: "rgba(245,242,236,0.06)",
            border: "0.5px solid rgba(245,242,236,0.1)",
            borderRadius: 40,
            marginTop: 8,
          }}
        >
          <span style={{ fontSize: 18, color: "rgba(245,242,236,0.5)", letterSpacing: "3px" }}>
            KNOW WHAT YOU WERE NEVER TOLD
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
