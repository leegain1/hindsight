"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { QUESTIONS, calculateProfile, PROFILE_META } from "@/lib/profiling";

type Phase = "questions" | "saving" | "result";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [phase, setPhase] = useState<Phase>("questions");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(12).fill(0));
  const [selected, setSelected] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileType, setProfileType] = useState<ReturnType<typeof calculateProfile> | null>(null);

  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      const res = await supabase.auth.getUser();
      if (res.data.user) setUserId(res.data.user.id);
    })();
  }, [supabase]);

  const question = QUESTIONS[step];
  const progress = (step / QUESTIONS.length) * 100;

  const handleSelect = (optionIndex: number) => {
    setSelected(optionIndex + 1);
  };

  const handleNext = async () => {
    if (selected === null) return;

    const newAnswers = [...answers];
    newAnswers[step] = selected;
    setAnswers(newAnswers);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
      setSelected(null);
    } else {
      setPhase("saving");
      const type = calculateProfile(newAnswers);
      setProfileType(type);

      if (userId) {
        const rows = newAnswers.map((answer, i) => ({
          user_id: userId,
          question_id: i + 1,
          answer,
        }));
        await supabase.from("sensitivity_answers").delete().eq("user_id", userId);
        await supabase.from("sensitivity_answers").insert(rows);
        await supabase.from("profiles").update({
          sensitivity_type: type,
          onboarding_completed: true,
        }).eq("id", userId);
      }

      setPhase("result");
    }
  };

  const handleBack = () => {
    if (step === 0) return;
    setStep(step - 1);
    setSelected(answers[step - 1] > 0 ? answers[step - 1] : null);
  };

  const profile = profileType ? PROFILE_META[profileType] : null;

  return (
    <main style={{
      minHeight: "100dvh",
      background: "#F5F2EC",
      fontFamily: "'Space Grotesk', -apple-system, sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
        @keyframes slideRight { from { opacity:0; transform: translateX(16px); } to { opacity:1; transform: translateX(0); } }
      `}</style>

      {/* Header */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "22px 28px",
        borderBottom: "0.5px solid #D8D4CC",
      }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#0A0A0A", letterSpacing: "3px" }}>
          HINDSIGHT+
        </span>
        {phase === "questions" && (
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1.5px" }}>
            {step + 1} / {QUESTIONS.length}
          </span>
        )}
      </header>

      {/* Thin progress line */}
      {phase === "questions" && (
        <div style={{ height: "1px", background: "#EDEAE3" }}>
          <div style={{
            height: "100%",
            width: `${progress}%`,
            background: "#0A0A0A",
            transition: "width 0.35s ease",
          }} />
        </div>
      )}

      {/* Saving */}
      {phase === "saving" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
          <div style={{ width: 20, height: 20, border: "1px solid #D8D4CC", borderTopColor: "#0A0A0A", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "3px" }}>ANALYZING...</p>
        </div>
      )}

      {/* Result */}
      {phase === "result" && profile && (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          maxWidth: 480,
          margin: "0 auto",
          width: "100%",
          padding: "56px 28px 32px",
          animation: "fadeUp 0.5s ease",
        }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "3px", marginBottom: 16 }}>
            YOUR PROFILE
          </p>
          <h2 style={{ fontSize: 44, fontWeight: 700, color: "#0A0A0A", letterSpacing: "-1.5px", lineHeight: 1.08, marginBottom: 8 }}>
            {profile.label}
          </h2>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px", marginBottom: 32 }}>
            {profile.type.toUpperCase()}
          </p>

          <p style={{ fontSize: 15, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.65, marginBottom: 40, letterSpacing: "-0.2px" }}>
            {profile.description}
          </p>

          {/* Recommended */}
          <div style={{ marginBottom: 40 }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "2.5px", marginBottom: 16 }}>
              RECOMMENDED
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {profile.recommendedCategories.map((c) => (
                <span
                  key={c}
                  style={{
                    padding: "6px 14px",
                    border: "0.5px solid #D8D4CC",
                    borderRadius: 2,
                    fontSize: 12,
                    fontWeight: 300,
                    color: "#0A0A0A",
                    letterSpacing: "-0.1px",
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Tip */}
          <div style={{ borderLeft: "1px solid #D8D4CC", paddingLeft: 16, marginBottom: 48 }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", letterSpacing: "2px", marginBottom: 8 }}>TIP</p>
            <p style={{ fontSize: 14, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.6, letterSpacing: "-0.1px" }}>{profile.tip}</p>
          </div>

          <button
            onClick={() => router.push("/")}
            style={{
              padding: "16px",
              background: "#0A0A0A",
              color: "#F5F2EC",
              border: "none",
              borderRadius: 2,
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              letterSpacing: "2.5px",
              cursor: "pointer",
            }}
          >
            START →
          </button>
        </div>
      )}

      {/* Questions */}
      {phase === "questions" && (
        <div
          key={step}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            maxWidth: 480,
            margin: "0 auto",
            width: "100%",
            padding: "48px 28px 32px",
            animation: "slideRight 0.22s ease",
          }}
        >
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "3px", marginBottom: 20 }}>
            Q{question.id.toString().padStart(2, "0")}
          </p>
          <h2 style={{
            fontSize: 26,
            fontWeight: 600,
            color: "#0A0A0A",
            lineHeight: 1.3,
            marginBottom: 44,
            letterSpacing: "-0.6px",
          }}>
            {question.text}
          </h2>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1, marginBottom: 32 }}>
            {question.options.map((opt, i) => {
              const val = i + 1;
              const isSelected = selected === val;
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  style={{
                    padding: "16px 0",
                    background: "none",
                    border: "none",
                    borderBottom: "0.5px solid #D8D4CC",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "opacity 0.1s",
                  }}
                >
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: `1px solid ${isSelected ? "#0A0A0A" : "#D8D4CC"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background: isSelected ? "#0A0A0A" : "transparent",
                    transition: "all 0.15s",
                  }}>
                    {isSelected && (
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F5F2EC" }} />
                    )}
                  </div>
                  <span style={{
                    fontSize: 15,
                    fontWeight: isSelected ? 400 : 300,
                    color: "#0A0A0A",
                    letterSpacing: "-0.2px",
                    flex: 1,
                  }}>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", gap: 10 }}>
            {step > 0 && (
              <button
                onClick={handleBack}
                style={{
                  padding: "15px 20px",
                  background: "none",
                  border: "0.5px solid #D8D4CC",
                  borderRadius: 2,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 12,
                  color: "#8A8880",
                  cursor: "pointer",
                }}
              >
                ←
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={selected === null}
              style={{
                flex: 1,
                padding: "15px",
                background: selected !== null ? "#0A0A0A" : "#EDEAE3",
                color: selected !== null ? "#F5F2EC" : "#8A8880",
                border: "none",
                borderRadius: 2,
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                letterSpacing: "2.5px",
                cursor: selected !== null ? "pointer" : "default",
                transition: "all 0.15s ease",
              }}
            >
              {step < QUESTIONS.length - 1 ? "NEXT →" : "FINISH →"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
