"use client";

/**
 * 개인 맞춤 분석 설문.
 *
 * 기존 12문항(첨가물 지식·수돗물·EMF 등)은 "이 제품이 나에게 안전한가"를 못 답한다.
 * 실제 분석에 쓰이는 5가지만 받는다 — 알레르기 · 지병 · 복용 약 · 목표 · 기피 성분.
 * 전부 선택 사항이라 건너뛰며 진행할 수 있고, 프로필 탭에서 언제든 다시 고친다.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  SURVEY_STEPS,
  EMPTY_HEALTH_PROFILE,
  PROFILE_META,
  deriveProfileType,
  type HealthProfile,
} from "@/lib/profiling";

const INK = "#0A0A0A";
const CANVAS = "#F5F2EC";
const CARD = "#EDEAE3";
const HAIRLINE = "#D8D4CC";
const MUTED = "#8A8880";

const SANS = "'Space Grotesk', -apple-system, sans-serif";
const MONO = "'DM Mono', monospace";

export const HEALTH_PROFILE_KEY = "hindsight_health_profile";

type Phase = "steps" | "result";

export default function OnboardingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("steps");
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<HealthProfile>(EMPTY_HEALTH_PROFILE);
  const [custom, setCustom] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const current = SURVEY_STEPS[step];
  const values = profile[current.id];

  // 이미 답한 적이 있으면 불러와서 "수정"이 되게 한다
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HEALTH_PROFILE_KEY);
      if (raw) setProfile({ ...EMPTY_HEALTH_PROFILE, ...JSON.parse(raw) });
    } catch {
      /* 값이 깨졌으면 빈 프로필로 시작 */
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const res = await supabase.auth.getUser();
      if (res.data.user) setUserId(res.data.user.id);
    })();
  }, []);

  const setValues = (next: string[]) =>
    setProfile((p) => ({ ...p, [current.id]: next }));

  const toggle = (opt: string) =>
    setValues(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);

  /** 직접 입력한 항목을 목록에 추가 (쉼표로 여러 개) */
  const commitCustom = () => {
    const added = custom
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && !values.includes(s));
    if (added.length) setValues([...values, ...added]);
    setCustom("");
  };

  const finishSurvey = async (final: HealthProfile) => {
    const type = deriveProfileType(final);
    try {
      localStorage.setItem(HEALTH_PROFILE_KEY, JSON.stringify(final));
      localStorage.setItem(
        "hindsight_sensitivity",
        JSON.stringify({ type, savedAt: Date.now() }),
      );
    } catch {
      /* 저장 실패해도 결과는 보여준다 */
    }

    const supabase = createClient();
    if (supabase && userId) {
      await supabase
        .from("profiles")
        .update({ sensitivity_type: type, onboarding_completed: true })
        .eq("id", userId);
    }
    setPhase("result");
  };

  const next = () => {
    // 입력창에 쓰다 만 값이 있으면 버리지 않고 반영한다
    const pending = custom.trim();
    const merged: HealthProfile = pending
      ? { ...profile, [current.id]: [...values, ...pending.split(",").map((s) => s.trim()).filter(Boolean)] }
      : profile;
    if (pending) setProfile(merged);
    setCustom("");

    if (step < SURVEY_STEPS.length - 1) setStep(step + 1);
    else void finishSurvey(merged);
  };

  const back = () => {
    setCustom("");
    if (step > 0) setStep(step - 1);
  };

  const progress = ((step + (phase === "result" ? 1 : 0)) / SURVEY_STEPS.length) * 100;

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: CANVAS,
        fontFamily: SANS,
        display: "flex",
        flexDirection: "column",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .rise { animation: fadeUp 380ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        input::placeholder { color: rgba(10,10,10,0.28); }
        button:active { opacity: 0.85; }
        @media (prefers-reduced-motion: reduce) { .rise { animation: none; } }
      `}</style>

      {/* 진행 바 */}
      <div style={{ height: 2, background: HAIRLINE, flexShrink: 0 }}>
        <div
          style={{
            height: "100%",
            width: "100%",
            background: INK,
            transformOrigin: "left",
            transform: `scaleX(${progress / 100})`,
            transition: "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </div>

      {phase === "steps" && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            maxWidth: 480,
            width: "100%",
            margin: "0 auto",
            padding: "28px 28px calc(28px + env(safe-area-inset-bottom))",
          }}
        >
          <div key={current.id} className="rise" style={{ flex: 1 }}>
            <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "2px", marginBottom: 14 }}>
              {step + 1} / {SURVEY_STEPS.length}
            </p>
            <h1 style={{ fontSize: 26, fontWeight: 300, color: INK, lineHeight: 1.3, letterSpacing: "-0.7px", marginBottom: 10 }}>
              {current.title}
            </h1>
            <p style={{ fontSize: 13, color: INK, opacity: 0.6, lineHeight: 1.7, marginBottom: 24 }}>
              {current.hint}
            </p>

            {current.kind === "multi" && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 18 }}>
                {current.options?.map((opt) => {
                  const on = values.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(opt)}
                      style={{
                        fontFamily: SANS,
                        fontSize: 13,
                        fontWeight: on ? 500 : 400,
                        color: on ? CANVAS : INK,
                        background: on ? INK : "transparent",
                        border: `0.5px solid ${on ? INK : HAIRLINE}`,
                        borderRadius: 999,
                        padding: "9px 14px",
                        cursor: "pointer",
                        touchAction: "manipulation",
                        minHeight: 0,
                        minWidth: 0,
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 직접 입력 — 목록에 없는 항목을 놓치지 않기 위해 항상 둔다 */}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitCustom();
                  }
                }}
                placeholder={current.placeholder ?? "직접 입력 (쉼표로 구분)"}
                style={{
                  flex: 1,
                  padding: "13px 14px",
                  background: CARD,
                  border: `0.5px solid ${HAIRLINE}`,
                  borderRadius: 10,
                  outline: "none",
                  fontFamily: SANS,
                  fontSize: 14,
                  color: INK,
                }}
              />
              <button
                type="button"
                onClick={commitCustom}
                disabled={!custom.trim()}
                style={{
                  padding: "0 16px",
                  background: "transparent",
                  border: `0.5px solid ${HAIRLINE}`,
                  borderRadius: 10,
                  fontFamily: SANS,
                  fontSize: 13,
                  color: custom.trim() ? INK : MUTED,
                  cursor: custom.trim() ? "pointer" : "default",
                  touchAction: "manipulation",
                  minWidth: 0,
                }}
              >
                추가
              </button>
            </div>

            {/* 직접 입력으로 추가된 항목 */}
            {values.filter((v) => !current.options?.includes(v)).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
                {values
                  .filter((v) => !current.options?.includes(v))
                  .map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setValues(values.filter((x) => x !== v))}
                      aria-label={`${v} 제거`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontFamily: SANS,
                        fontSize: 13,
                        fontWeight: 500,
                        color: CANVAS,
                        background: INK,
                        border: "none",
                        borderRadius: 999,
                        padding: "9px 12px",
                        cursor: "pointer",
                        touchAction: "manipulation",
                        minHeight: 0,
                        minWidth: 0,
                      }}
                    >
                      {v}
                      <span aria-hidden="true" style={{ opacity: 0.55 }}>✕</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* 하단 액션 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, paddingTop: 20 }}>
            {step > 0 && (
              <button
                type="button"
                onClick={back}
                style={{
                  padding: "15px 18px",
                  background: "transparent",
                  border: `0.5px solid ${HAIRLINE}`,
                  borderRadius: 12,
                  fontFamily: SANS,
                  fontSize: 14,
                  color: INK,
                  cursor: "pointer",
                  touchAction: "manipulation",
                }}
              >
                이전
              </button>
            )}
            <button
              type="button"
              onClick={next}
              style={{
                flex: 1,
                padding: "16px 20px",
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
              {step < SURVEY_STEPS.length - 1
                ? values.length === 0 && !custom.trim()
                  ? "해당 없음, 다음"
                  : "다음"
                : "완료"}
            </button>
          </div>
        </div>
      )}

      {phase === "result" && <ResultView profile={profile} onHome={() => router.push("/")} />}
    </main>
  );
}

function ResultView({ profile, onHome }: { profile: HealthProfile; onHome: () => void }) {
  const meta = PROFILE_META[deriveProfileType(profile)];
  const groups: { label: string; items: string[] }[] = [
    { label: "알레르기", items: profile.allergies },
    { label: "질환", items: profile.conditions },
    { label: "복용 중인 약", items: profile.medications },
    { label: "건강 목표", items: profile.goals },
    { label: "피하고 싶은 성분", items: profile.avoid },
  ];
  const filled = groups.filter((g) => g.items.length > 0);

  return (
    <div
      className="rise"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        maxWidth: 480,
        width: "100%",
        margin: "0 auto",
        padding: "40px 28px calc(28px + env(safe-area-inset-bottom))",
      }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "2px", marginBottom: 14 }}>
          YOUR PROFILE
        </p>
        <h1 style={{ fontSize: 30, fontWeight: 300, color: INK, lineHeight: 1.25, letterSpacing: "-0.8px", marginBottom: 12 }}>
          {filled.length > 0 ? "이제 회원님 기준으로\n분석합니다" : "언제든 다시\n채울 수 있어요"}
        </h1>
        <p style={{ fontSize: 14, color: INK, opacity: 0.65, lineHeight: 1.7, marginBottom: 28 }}>
          {filled.length > 0
            ? `${meta.label} — ${meta.tip}`
            : "지금은 모든 사용자에게 같은 기준으로 분석합니다. 프로필 탭에서 채우면 바로 반영돼요."}
        </p>

        {filled.map((g) => (
          <div key={g.label} style={{ marginBottom: 18 }}>
            <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "1.5px", marginBottom: 8 }}>
              {g.label}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {g.items.map((it) => (
                <span
                  key={it}
                  style={{
                    fontFamily: SANS,
                    fontSize: 13,
                    color: INK,
                    background: CARD,
                    border: `0.5px solid ${HAIRLINE}`,
                    borderRadius: 999,
                    padding: "7px 12px",
                  }}
                >
                  {it}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onHome}
        style={{
          width: "100%",
          padding: "17px 20px",
          marginTop: 20,
          background: INK,
          border: "none",
          borderRadius: 12,
          fontFamily: SANS,
          fontSize: 14,
          fontWeight: 600,
          color: CANVAS,
          cursor: "pointer",
          touchAction: "manipulation",
          flexShrink: 0,
        }}
      >
        시작하기
      </button>
    </div>
  );
}
