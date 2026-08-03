"use client";

/**
 * 탭 페이지 공통 헤더.
 *
 * 비교·커뮤니티·사용자 세 탭이 제각각이었다 — 사용자 탭은 이름이 36px/700 로
 * 떡하니 박혀 있었고, 커뮤니티는 36px, 비교는 26px 였다. 탭을 옮길 때마다
 * 제목 크기와 위치가 튀어서 같은 앱처럼 안 읽혔다.
 *
 * 규격을 하나로 고정한다:
 *   상단 바   로고 + 화면 이름(모노, 대문자)
 *   제목      28px / 700 — 한 단어
 *   부제      13px 뮤티드 한 줄 — 이 화면이 무엇을 하는지
 *   right     정렬 버튼 같은 화면별 액션 (선택)
 */

import Link from "next/link";

const INK = "#0A0A0A";
const CANVAS = "#F5F2EC";
const HAIRLINE = "#D8D4CC";
const MUTED = "#8A8880";

const SANS = "'Space Grotesk', -apple-system, sans-serif";
const MONO = "'DM Mono', monospace";

export default function PageHeader({
  /** 상단 바 오른쪽 라벨 — COMPARE / COMMUNITY / PROFILE */
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
          borderBottom: `0.5px solid ${HAIRLINE}`,
          background: CANVAS,
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <svg width="18" height="18" viewBox="0 0 72 72" fill="none" aria-hidden="true">
            <rect x="33" y="8" width="6" height="20" rx="1" fill={INK} />
            <rect x="33" y="44" width="6" height="20" rx="1" fill={INK} />
            <rect x="8" y="33" width="20" height="6" rx="1" fill={INK} />
            <rect x="44" y="33" width="20" height="6" rx="1" fill={INK} />
          </svg>
          <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 400, letterSpacing: "2.5px", color: INK }}>
            HINDSIGHT<span style={{ opacity: 0.25 }}>+</span>
          </span>
        </Link>
        <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "1.5px" }}>
          {eyebrow}
        </span>
      </header>

      <div style={{ maxWidth: 480, margin: "0 auto", width: "100%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            padding: "24px 24px 18px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: SANS, fontSize: 28, fontWeight: 700, color: INK, letterSpacing: "-0.9px", lineHeight: 1.15 }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, marginTop: 5 }}>
                {subtitle}
              </p>
            )}
          </div>
          {right && <div style={{ flexShrink: 0 }}>{right}</div>}
        </div>
      </div>
    </>
  );
}
