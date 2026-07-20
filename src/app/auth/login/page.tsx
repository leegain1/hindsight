"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/profile";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [magicSent, setMagicSent] = useState(false);

  const supabase = createClient();

  // Redirect if already logged in
  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      const res = await supabase.auth.getUser();
      if (res.data.user) router.replace(next);
    })();
  }, [next, router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "signup") {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (err) { setError(err.message); setLoading(false); return; }
      if (data.user) {
        // Update profile name
        await supabase.from("profiles").update({ name }).eq("id", data.user.id);
        router.replace("/onboarding");
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }

      // Check onboarding status
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();
        router.replace(profile?.onboarding_completed ? next : "/onboarding");
      }
    }
    setLoading(false);
  };

  const handleMagicLink = async () => {
    if (!email) { setError("이메일을 입력해주세요."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    });
    if (err) { setError(err.message); } else { setMagicSent(true); }
    setLoading(false);
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    });
  };

  return (
    <main style={{
      minHeight: "100dvh",
      background: "#F5F2EC",
      fontFamily: "'Space Grotesk', -apple-system, sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: rgba(10,10,10,0.3); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "28px 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 72 72" fill="none">
            <rect x="33" y="8" width="6" height="20" rx="1" fill="#0A0A0A" />
            <rect x="33" y="44" width="6" height="20" rx="1" fill="#0A0A0A" />
            <rect x="8" y="33" width="20" height="6" rx="1" fill="#0A0A0A" />
            <rect x="44" y="33" width="20" height="6" rx="1" fill="#0A0A0A" />
          </svg>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 300, letterSpacing: "3px", color: "#0A0A0A" }}>
            HINDSIGHT<span style={{ opacity: 0.25 }}>+</span>
          </span>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px 80px" }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px", marginBottom: 8 }}>
            {mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
          </p>
          <h2 style={{ fontSize: 24, fontWeight: 300, color: "#0A0A0A", letterSpacing: "-0.3px", marginBottom: 32 }}>
            {mode === "login" ? "다시 오셨군요." : "건강 여정을 시작하세요."}
          </h2>

          {magicSent ? (
            <div style={{ background: "#EDEAE3", border: "0.5px solid #D8D4CC", borderRadius: 12, padding: "20px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.6 }}>
                <strong>{email}</strong>으로<br />로그인 링크를 보냈어요. 이메일을 확인해주세요.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Social logins */}
              <button
                type="button"
                onClick={handleGoogle}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  background: "#EDEAE3",
                  border: "0.5px solid #D8D4CC",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: "#0A0A0A",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google로 계속하기
              </button>

              <button
                type="button"
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  background: "#0A0A0A",
                  border: "none",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: "#F5F2EC",
                  opacity: 0.5,
                }}
                disabled
                title="준비 중"
              >
                <svg width="14" height="17" viewBox="0 0 14 17" fill="none">
                  <path d="M11.7 8.9C11.7 7.4 12.5 6.1 13.8 5.4 13 4.3 11.8 3.7 10.5 3.7 9.1 3.7 8.1 4.5 7.4 4.5 6.7 4.5 5.6 3.7 4.4 3.7 2.2 3.7 0 5.5 0 8.8 0 10.3.5 11.8 1.3 13c.7 1 1.4 1.9 2.5 1.9 1 0 1.5-.7 2.7-.7 1.2 0 1.6.7 2.7.7 1.1 0 1.8-1 2.5-2 .5-.7.8-1.4 1-2.1-1.4-.6-2-1.9-2-2.7zM9.5 2.4c.6-.7.9-1.6.9-2.4-.8.1-1.6.5-2.2 1.1-.5.6-.9 1.4-.9 2.3.8 0 1.6-.4 2.2-1z" fill="#F5F2EC"/>
                </svg>
                Apple로 계속하기 (준비 중)
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
                <div style={{ flex: 1, height: "0.5px", background: "#D8D4CC" }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "1px" }}>OR</span>
                <div style={{ flex: 1, height: "0.5px", background: "#D8D4CC" }} />
              </div>

              {/* Name field (signup only) */}
              {mode === "signup" && (
                <div style={{ background: "#EDEAE3", border: "0.5px solid #D8D4CC", borderRadius: 12, padding: "13px 16px" }}>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="이름"
                    required
                    style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 14, fontWeight: 300, color: "#0A0A0A", fontFamily: "'Space Grotesk', sans-serif" }}
                  />
                </div>
              )}

              {/* Email */}
              <div style={{ background: "#EDEAE3", border: "0.5px solid #D8D4CC", borderRadius: 12, padding: "13px 16px" }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일"
                  required
                  style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 14, fontWeight: 300, color: "#0A0A0A", fontFamily: "'Space Grotesk', sans-serif" }}
                />
              </div>

              {/* Password */}
              <div style={{ background: "#EDEAE3", border: "0.5px solid #D8D4CC", borderRadius: 12, padding: "13px 16px" }}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 (6자 이상)"
                  required
                  minLength={6}
                  style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 14, fontWeight: 300, color: "#0A0A0A", fontFamily: "'Space Grotesk', sans-serif" }}
                />
              </div>

              {error && (
                <p style={{ fontSize: 12, color: "#C44B4B", fontWeight: 300 }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "14px",
                  background: "#0A0A0A",
                  color: "#F5F2EC",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: "'Space Grotesk', sans-serif",
                  cursor: loading ? "default" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {loading && (
                  <div style={{ width: 14, height: 14, border: "1.5px solid rgba(245,242,236,0.4)", borderTopColor: "#F5F2EC", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                )}
                {mode === "login" ? "로그인" : "계정 만들기"}
              </button>

              {mode === "login" && (
                <button
                  type="button"
                  onClick={handleMagicLink}
                  disabled={loading}
                  style={{ background: "none", border: "none", fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1px", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, padding: "12px 8px" }}
                >
                  이메일로 로그인 링크 받기
                </button>
              )}
            </form>
          )}

          {/* Toggle */}
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <button
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
              style={{ background: "none", border: "none", fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1px", cursor: "pointer", padding: "12px 8px" }}
            >
              {mode === "login" ? "계정이 없으신가요? 회원가입 →" : "이미 계정이 있으신가요? 로그인 →"}
            </button>
          </div>

          {/* Skip */}
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <button
              onClick={() => router.push("/")}
              style={{ background: "none", border: "none", fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#D8D4CC", letterSpacing: "1px", cursor: "pointer", padding: "12px 8px" }}
            >
              로그인 없이 계속하기
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
