"use client";

/**
 * 첫 진입 흐름.
 *
 *   brand   HINDSIGHT 브랜드 애니메이션
 *   login   로그인 입력이 아래에서 올라옴
 *   intro   무슨 앱인지 3컷으로 설명 (탭으로 진행)
 *   cta     개인 맞춤 분석 시작 / 나중에 하기
 *           → /onboarding (12문항 설문) 또는 / (홈)
 *
 * 건너뛰기를 눌러도 설문은 프로필 탭에서 언제든 다시 할 수 있다(수정 포함).
 * Supabase 가 없으면 로그인 단계는 그대로 통과시킨다 — 데모가 멈추면 안 된다.
 */

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

const INK = "#0A0A0A";
const CANVAS = "#F5F2EC";
const HAIRLINE = "#D8D4CC";
const MUTED = "#8A8880";

const SANS = "'Space Grotesk', -apple-system, sans-serif";
const MONO = "'DM Mono', monospace";

/** 이 흐름을 이미 봤는지 — 홈에서 매번 다시 띄우지 않기 위해 */
export const WELCOME_SEEN_KEY = "hindsight_welcome_seen";

type Phase = "brand" | "login" | "intro" | "cta";

const SLIDES = [
  {
    key: "photo",
    label: "01",
    title: "사진 한 장이면\n됩니다",
    body: "바코드가 없는 신제품·해외 직구 제품도 찍기만 하면 성분을 분석합니다.",
  },
  {
    key: "personal",
    label: "02",
    title: "같은 제품,\n다른 결과",
    body: "알레르기·복용 약물·건강 목표에 따라 나에게 맞는지 따로 계산합니다.",
  },
  {
    key: "evidence",
    label: "03",
    title: "광고가 아니라\n근거로",
    body: "식약처와 논문에 근거가 있는지, 어느 수준인지까지 함께 보여줍니다.",
  },
];


function WelcomeFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 구글 로그인은 페이지를 떠났다 돌아온다. ?step=intro 로 돌아오면 브랜드
  // 애니메이션과 로그인 단계를 건너뛰고 소개부터 이어 붙인다 — 이미 로그인한
  // 사람에게 로그인 화면을 다시 보여주면 흐름이 끊긴다.
  const [phase, setPhase] = useState<Phase>(
    searchParams.get("step") === "intro" ? "intro" : "brand",
  );
  const [slide, setSlide] = useState(0);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);

  const finish = useCallback(
    (next: "/onboarding" | "/") => {
      try {
        localStorage.setItem(WELCOME_SEEN_KEY, "1");
      } catch {
        /* 저장 실패해도 진행은 막지 않는다 */
      }
      router.push(next);
    },
    [router],
  );

  // 브랜드 애니메이션이 끝나면 로그인으로
  useEffect(() => {
    if (phase !== "brand") return;
    const id = setTimeout(() => setPhase("login"), 2100);
    return () => clearTimeout(id);
  }, [phase]);

  // 설명 슬라이드는 탭으로 넘긴다 — 자동 진행은 읽는 속도를 강요한다
  const advance = () => {
    if (slide < SLIDES.length - 1) setSlide(slide + 1);
    else setPhase("cta");
  };

  const handleLogin = async () => {
    setAuthError("");
    if (!email.trim()) {
      setAuthError("이메일을 입력해주세요.");
      return;
    }
    setBusy(true);

    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setBusy(false);
        setAuthError("로그인에 실패했어요. 이메일과 비밀번호를 확인해주세요.");
        return;
      }
    }
    // Supabase 미설정이면 그대로 통과 — 데모는 계속 돌아야 한다
    setBusy(false);
    setPhase("intro");
  };

  const handleGoogle = async () => {
    setAuthError("");

    const supabase = createClient();
    // 이메일 경로와 같은 규칙 — Supabase 가 없으면 막지 않고 통과시킨다
    if (!supabase) {
      setPhase("intro");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/welcome?step=intro")}`,
      },
    });

    // 성공하면 브라우저가 구글로 넘어가므로 busy 를 되돌릴 필요가 없다
    if (error) {
      setBusy(false);
      setAuthError("구글 로그인을 시작할 수 없었어요. 잠시 후 다시 시도해주세요.");
    }
  };

  const dark = phase === "brand" || phase === "login";

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: dark ? INK : CANVAS,
        fontFamily: SANS,
        display: "flex",
        flexDirection: "column",
        paddingTop: "env(safe-area-inset-top)",
        transition: "background 520ms ease",
        overflow: "hidden",
      }}
    >
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes markIn {
          from { opacity: 0; transform: scale(0.7) rotate(-25deg); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes wordmarkIn {
          from { opacity: 0; letter-spacing: 14px; }
          to   { opacity: 1; letter-spacing: 5px; }
        }
        @keyframes lineGrow {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes riseIn  { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes panelUp { from { transform: translateY(100%); } to { transform: none; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }

        .mark      { animation: markIn 780ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .wordmark  { animation: wordmarkIn 900ms cubic-bezier(0.22, 1, 0.36, 1) 260ms both; }
        .rule      { animation: lineGrow 700ms cubic-bezier(0.22, 1, 0.36, 1) 700ms both; transform-origin: left; }
        .tagline   { animation: fadeIn 600ms ease-out 1000ms both; }
        .panel     { animation: panelUp 520ms cubic-bezier(0.32, 0.72, 0, 1) both; }
        .hero-rise { animation: riseIn 460ms var(--ease-out-quart) both; }
        .slide     { animation: slideIn 460ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        input::placeholder { color: rgba(245,242,236,0.3); }

        @media (prefers-reduced-motion: reduce) {
          .mark, .wordmark, .rule, .tagline, .panel, .hero-rise, .slide { animation-duration: 1ms; }
        }
      `}</style>

      {/* ── 브랜드 + 로그인 (검은 화면) ───────────────────────────────── */}
      {dark && (
        <>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "0 32px",
              // 로그인 단계에서 브랜드 블록을 살짝 위로 올려 입력 공간을 내준다.
              // padding 이 아니라 transform 으로 — padding 애니메이션은 매 프레임
              // 레이아웃을 다시 계산시켜 저사양 기기에서 끊긴다.
              transform: phase === "login" ? "translateY(-20px)" : "none",
              transition: "transform 520ms cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          >
            <svg className="mark" width="40" height="40" viewBox="0 0 72 72" fill="none" aria-hidden="true">
              <rect x="33" y="8" width="6" height="20" rx="1" fill={CANVAS} />
              <rect x="33" y="44" width="6" height="20" rx="1" fill={CANVAS} />
              <rect x="8" y="33" width="20" height="6" rx="1" fill={CANVAS} />
              <rect x="44" y="33" width="20" height="6" rx="1" fill={CANVAS} />
            </svg>

            <h1
              className="wordmark"
              style={{
                fontFamily: SANS,
                fontSize: 26,
                fontWeight: 300,
                color: CANVAS,
                marginTop: 22,
                whiteSpace: "nowrap",
              }}
            >
              HINDSIGHT<span style={{ opacity: 0.25 }}>+</span>
            </h1>

            <div className="rule" style={{ height: "0.5px", background: "rgba(245,242,236,0.25)", margin: "18px 0 14px" }} />

            <p className="tagline" style={{ fontFamily: MONO, fontSize: 9, color: "#4A4A48", letterSpacing: "2px", lineHeight: 1.8 }}>
              KNOW WHAT YOU
              <br />
              WERE NEVER TOLD
            </p>
          </div>

          {phase === "login" && (
            <div
              className="panel"
              style={{
                background: "rgba(245,242,236,0.04)",
                borderTop: "0.5px solid rgba(245,242,236,0.12)",
                padding: "26px 24px calc(30px + env(safe-area-inset-bottom))",
              }}
            >
              <p style={{ fontFamily: MONO, fontSize: 9, color: "#4A4A48", letterSpacing: "2px", marginBottom: 16 }}>
                SIGN IN
              </p>

              {/* 소셜 먼저 — 대부분은 여기서 끝난다. 채우기가 아니라 입력칸과
                  같은 재질(반투명 크림)을 써서 아래 크림색 버튼 하나만
                  주 액션으로 남게 한다. */}
              <button
                type="button"
                onClick={() => void handleGoogle()}
                disabled={busy}
                style={{
                  width: "100%",
                  padding: "15px 16px",
                  background: "rgba(245,242,236,0.06)",
                  border: "0.5px solid rgba(245,242,236,0.14)",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 9,
                  fontFamily: SANS,
                  fontSize: 14,
                  fontWeight: 400,
                  color: CANVAS,
                  cursor: busy ? "default" : "pointer",
                  touchAction: "manipulation",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google로 계속하기
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0" }}>
                <div style={{ flex: 1, height: "0.5px", background: "rgba(245,242,236,0.12)" }} />
                <span style={{ fontFamily: MONO, fontSize: 8, color: "#4A4A48", letterSpacing: "1px" }}>OR</span>
                <div style={{ flex: 1, height: "0.5px", background: "rgba(245,242,236,0.12)" }} />
              </div>

              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일"
                style={inputStyle}
              />
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleLogin()}
                placeholder="비밀번호"
                style={{ ...inputStyle, marginTop: 8 }}
              />

              {authError && (
                <p style={{ fontSize: 11, color: "#C44B4B", lineHeight: 1.6, marginTop: 10 }}>{authError}</p>
              )}

              <button
                type="button"
                onClick={() => void handleLogin()}
                disabled={busy}
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  marginTop: 14,
                  background: CANVAS,
                  border: "none",
                  borderRadius: 12,
                  fontFamily: SANS,
                  fontSize: 14,
                  fontWeight: 600,
                  color: INK,
                  cursor: busy ? "default" : "pointer",
                  touchAction: "manipulation",
                }}
              >
                {busy ? "확인 중…" : "로그인하고 시작하기"}
              </button>

              <button
                type="button"
                onClick={() => setPhase("intro")}
                style={{
                  width: "100%",
                  padding: "13px 20px",
                  marginTop: 6,
                  background: "transparent",
                  border: "none",
                  fontFamily: SANS,
                  fontSize: 13,
                  fontWeight: 400,
                  color: MUTED,
                  cursor: "pointer",
                  touchAction: "manipulation",
                }}
              >
                로그인 없이 둘러보기
              </button>
            </div>
          )}
        </>
      )}

      {/* ── 앱 설명 + 설문 권유 ───────────────────────────────────────
          두 단계가 같은 골격을 쓴다. 진행 바 → 본문(상단 정렬) → 액션(하단).
          전에는 설명은 상단, 권유는 하단이라 넘길 때 제목이 튀었다. */}
      {(phase === "intro" || phase === "cta") && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "28px 28px calc(28px + env(safe-area-inset-bottom))",
          }}
        >
          {/* 진행 표시 — cta 는 마지막 단계라 전부 채운다 */}
          <div style={{ display: "flex", gap: 5, marginBottom: 44, flexShrink: 0 }}>
            {SLIDES.map((s, i) => (
              <button
                key={s.key}
                type="button"
                data-press="off"
                aria-label={`${i + 1}번째 소개로 이동`}
                onClick={() => {
                  setPhase("intro");
                  setSlide(i);
                }}
                style={{
                  flex: 1,
                  height: 2,
                  padding: 0,
                  minHeight: 0,
                  minWidth: 0,
                  borderRadius: 2,
                  border: "none",
                  background: phase === "cta" || i <= slide ? INK : HAIRLINE,
                  transition: "background 300ms ease",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>

          {phase === "intro" ? (
            <>
              {/* 본문 전체가 탭 영역 — 어디를 눌러도 다음으로 넘어간다 */}
              <button
                type="button"
                onClick={advance}
                data-press="off"
                aria-label="다음 소개 보기"
                style={{
                  flex: 1,
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  minHeight: 0,
                  minWidth: 0,
                  cursor: "pointer",
                  touchAction: "manipulation",
                }}
              >
                <span key={SLIDES[slide].key} className="slide" style={{ display: "block" }}>
                  <span style={{ display: "block", fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "2px", marginBottom: 14 }}>
                    {SLIDES[slide].label}
                  </span>
                  <span style={{ display: "block", fontFamily: SANS, fontSize: 30, fontWeight: 300, color: INK, lineHeight: 1.3, letterSpacing: "-0.8px", marginBottom: 16, whiteSpace: "pre-line" }}>
                    {SLIDES[slide].title}
                  </span>
                  <span style={{ display: "block", fontFamily: SANS, fontSize: 14, color: INK, opacity: 0.65, lineHeight: 1.75, maxWidth: 300 }}>
                    {SLIDES[slide].body}
                  </span>
                </span>
              </button>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setPhase("cta")}
                  style={ghostStyle}
                >
                  SKIP →
                </button>
                <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "1px", opacity: 0.7 }}>
                  탭해서 다음
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="hero-rise" style={{ flex: 1 }}>
                <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "2px", marginBottom: 14 }}>
                  LAST STEP
                </p>
                <h2 style={{ fontSize: 30, fontWeight: 300, color: INK, lineHeight: 1.3, letterSpacing: "-0.8px", marginBottom: 16 }}>
                  나에게 맞는지
                  <br />
                  알려면 나를 알아야
                </h2>
                <p style={{ fontSize: 14, color: INK, opacity: 0.65, lineHeight: 1.75, marginBottom: 10, maxWidth: 300 }}>
                  알레르기·복용 중인 약·건강 목표를 12문항으로 확인합니다.
                  같은 제품이라도 회원님 기준으로 다시 계산해 드려요.
                </p>
                <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.5px", lineHeight: 1.7 }}>
                  1분이면 끝납니다 · 나중에 프로필에서 언제든 다시 하거나 수정할 수 있어요
                </p>
              </div>

              <div style={{ flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => finish("/onboarding")}
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
                  }}
                >
                  개인 맞춤 분석 시작하기
                </button>

                <button
                  type="button"
                  onClick={() => finish("/")}
                  style={{
                    width: "100%",
                    padding: "14px 20px",
                    marginTop: 6,
                    background: "transparent",
                    border: "none",
                    fontFamily: SANS,
                    fontSize: 13,
                    fontWeight: 400,
                    color: MUTED,
                    cursor: "pointer",
                    touchAction: "manipulation",
                  }}
                >
                  건너뛰고 둘러보기
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}

/**
 * useSearchParams 는 Suspense 경계 안에서만 쓸 수 있다.
 * fallback 은 브랜드 화면과 같은 검은 배경 — 첫 프레임이 하얗게 튀지 않게.
 */
export default function WelcomePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: INK }} />}>
      <WelcomeFlow />
    </Suspense>
  );
}

const ghostStyle: React.CSSProperties = {
  padding: "10px 0",
  background: "transparent",
  border: "none",
  fontFamily: MONO,
  fontSize: 10,
  letterSpacing: "1.5px",
  color: MUTED,
  cursor: "pointer",
  touchAction: "manipulation",
  minHeight: 0,
  minWidth: 0,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "15px 16px",
  background: "rgba(245,242,236,0.06)",
  border: "0.5px solid rgba(245,242,236,0.14)",
  borderRadius: 12,
  outline: "none",
  fontFamily: SANS,
  fontSize: 14,
  fontWeight: 400,
  color: CANVAS,
};
