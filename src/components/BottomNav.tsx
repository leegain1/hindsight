"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    label: "HOME",
    href: "/",
    icon: (active: boolean) => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path
          d="M2 8L9 2L16 8V16H12V11H6V16H2V8Z"
          stroke={active ? "#0A0A0A" : "#8A8880"}
          strokeWidth="1.2"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    ),
    match: (p: string) => p === "/",
  },
  {
    // 검색(AI 질의)은 홈의 플로팅 버튼으로 옮기고, 이 자리는 제품 비교가 쓴다
    label: "COMPARE",
    href: "/compare",
    icon: (active: boolean) => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="4" width="5.5" height="11" rx="1" stroke={active ? "#0A0A0A" : "#8A8880"} strokeWidth="1.2" />
        <rect x="10.5" y="7" width="5.5" height="8" rx="1" stroke={active ? "#0A0A0A" : "#8A8880"} strokeWidth="1.2" />
        <path d="M9.25 2v14" stroke={active ? "#0A0A0A" : "#8A8880"} strokeWidth="1.2" strokeLinecap="round" strokeDasharray="1.5 2" />
      </svg>
    ),
    match: (p: string) => p.startsWith("/compare"),
  },
  {
    label: "SCAN",
    href: "/scan",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 72 72" fill="none">
        <rect x="33" y="8" width="6" height="20" rx="1" fill={active ? "#F5F2EC" : "#8A8880"} />
        <rect x="33" y="44" width="6" height="20" rx="1" fill={active ? "#F5F2EC" : "#8A8880"} />
        <rect x="8" y="33" width="20" height="6" rx="1" fill={active ? "#F5F2EC" : "#8A8880"} />
        <rect x="44" y="33" width="20" height="6" rx="1" fill={active ? "#F5F2EC" : "#8A8880"} />
      </svg>
    ),
    match: (p: string) => p.startsWith("/scan"),
    center: true,
  },
  {
    label: "COMMUNITY",
    href: "/community",
    icon: (active: boolean) => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path
          d="M2 3C2 2.44772 2.44772 2 3 2H15C15.5523 2 16 2.44772 16 3V11C16 11.5523 15.5523 12 15 12H10L6 16V12H3C2.44772 12 2 11.5523 2 11V3Z"
          stroke={active ? "#0A0A0A" : "#8A8880"}
          strokeWidth="1.2"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    ),
    match: (p: string) => p.startsWith("/community"),
  },
  {
    label: "PROFILE",
    href: "/profile",
    icon: (active: boolean) => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle
          cx="9"
          cy="6"
          r="3"
          stroke={active ? "#0A0A0A" : "#8A8880"}
          strokeWidth="1.2"
        />
        <path
          d="M2 16C2 13.2386 5.13401 11 9 11C12.866 11 16 13.2386 16 16"
          stroke={active ? "#0A0A0A" : "#8A8880"}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    ),
    match: (p: string) => p === "/profile",
  },
];

/**
 * 탭바를 숨길 경로.
 * 첫 진입 흐름(브랜드 → 로그인 → 앱 소개 → 개인 맞춤 설문)은 홈에 들어오기 전
 * 단계라 탭바가 보이면 안 된다. 아직 "앱 안"이 아니기 때문이다.
 */
const HIDE_ON = ["/welcome", "/onboarding", "/auth"];

export default function BottomNav() {
  const pathname = usePathname();

  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
      `}</style>
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          // 아이폰 홈 인디케이터에 탭이 깔리지 않도록 아래 여백을 더한다.
          // box-sizing 이 border-box 라 고정 height 에 패딩을 얹으면 탭이 눌리므로
          // height 대신 최소 높이로 잡는다.
          minHeight: 64,
          paddingBottom: "env(safe-area-inset-bottom)",
          background: "#F5F2EC",
          borderTop: "0.5px solid #D8D4CC",
          display: "flex",
          alignItems: "stretch",
          zIndex: 100,
        }}
      >
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              style={{
                flex: tab.center ? "0 0 72px" : 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                textDecoration: "none",
                position: "relative",
              }}
            >
              {tab.center ? (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: active ? "#0A0A0A" : "#EDEAE3",
                    border: "0.5px solid #D8D4CC",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: -10,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                >
                  {tab.icon(active)}
                </div>
              ) : (
                tab.icon(active)
              )}
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 7,
                  color: active ? "#0A0A0A" : "#8A8880",
                  letterSpacing: "1.5px",
                  marginTop: tab.center ? 0 : 0,
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
