"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Submission {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  ingredients: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
}

interface ApprovedProduct {
  barcode: string;
  name: string;
  brand: string;
  ingredients: string;
  approvedAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [approved, setApproved] = useState<ApprovedProduct[]>([]);
  const [tab, setTab] = useState<"pending" | "all" | "approved">("pending");
  const [loading, setLoading] = useState(false);

  const fetchData = async (pw: string) => {
    setLoading(true);
    const res = await fetch("/api/admin/submissions", {
      headers: { Authorization: `Bearer ${pw}` },
    });
    if (res.status === 401) {
      setAuthError(true);
      setLoading(false);
      return false;
    }
    const data = await res.json();
    setSubmissions(data.submissions);
    setApproved(data.approved);
    setLoading(false);
    return true;
  };

  const handleLogin = async () => {
    setAuthError(false);
    const ok = await fetchData(password);
    if (ok) setAuthed(true);
  };

  const resolve = async (id: string, status: "approved" | "rejected") => {
    await fetch("/api/admin/submissions", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify({ id, status }),
    });
    await fetchData(password);
  };

  const pending = submissions.filter((s) => s.status === "pending");
  const displayed =
    tab === "pending" ? pending : tab === "all" ? submissions : [];

  if (!authed) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          background: "#F5F2EC",
          fontFamily: "'Space Grotesk', -apple-system, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500&family=DM+Mono:wght@300;400;500&display=swap'); *{box-sizing:border-box;margin:0;padding:0;} input::placeholder{color:rgba(10,10,10,0.3);}`}</style>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              color: "#8A8880",
              letterSpacing: "2px",
              marginBottom: 8,
            }}
          >
            HINDSIGHT+ ADMIN
          </p>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 300,
              color: "#0A0A0A",
              marginBottom: 24,
            }}
          >
            운영자 로그인
          </h1>
          <div
            style={{
              background: "#EDEAE3",
              border: `0.5px solid ${authError ? "#C44B4B" : "#D8D4CC"}`,
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 12,
            }}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="관리자 비밀번호"
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 14,
                fontWeight: 300,
                color: "#0A0A0A",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            />
          </div>
          {authError && (
            <p style={{ fontSize: 11, color: "#C44B4B", marginBottom: 8 }}>
              비밀번호가 틀렸습니다.
            </p>
          )}
          <button
            onClick={handleLogin}
            style={{
              width: "100%",
              padding: "13px",
              background: "#0A0A0A",
              border: "none",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 500,
              color: "#F5F2EC",
              cursor: "pointer",
            }}
          >
            로그인
          </button>
          <button
            onClick={() => router.push("/")}
            style={{
              width: "100%",
              marginTop: 10,
              background: "none",
              border: "none",
              fontSize: 12,
              color: "rgba(10,10,10,0.35)",
              cursor: "pointer",
              fontFamily: "'Space Grotesk', sans-serif",
              padding: "8px 0",
            }}
          >
            홈으로
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#F5F2EC",
        fontFamily: "'Space Grotesk', -apple-system, sans-serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500&family=DM+Mono:wght@300;400;500&display=swap'); *{box-sizing:border-box;margin:0;padding:0;}`}</style>

      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
          borderBottom: "0.5px solid #D8D4CC",
        }}
      >
        <div
          onClick={() => router.push("/")}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        >
          <svg width="20" height="20" viewBox="0 0 72 72" fill="none">
            <rect x="33" y="8" width="6" height="20" rx="1" fill="#0A0A0A" />
            <rect x="33" y="44" width="6" height="20" rx="1" fill="#0A0A0A" />
            <rect x="8" y="33" width="20" height="6" rx="1" fill="#0A0A0A" />
            <rect x="44" y="33" width="20" height="6" rx="1" fill="#0A0A0A" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 300, letterSpacing: "3px", color: "#0A0A0A" }}>
            HINDSIGHT<span style={{ opacity: 0.25 }}>+</span>
          </span>
        </div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1.5px" }}>
          ADMIN
        </span>
      </header>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 24 }}>
          {[
            { label: "PENDING", value: pending.length, color: "#C4780A" },
            { label: "APPROVED", value: approved.length, color: "#2A8A5C" },
            { label: "TOTAL", value: submissions.length, color: "#3B7DD4" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "#EDEAE3",
                border: "0.5px solid #D8D4CC",
                borderRadius: 12,
                padding: "14px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 300, color: "#0A0A0A", marginBottom: 4 }}>
                {s.value}
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "1.5px" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {(["pending", "all", "approved"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "7px 14px",
                borderRadius: 20,
                border: `0.5px solid ${tab === t ? "#0A0A0A" : "#D8D4CC"}`,
                background: tab === t ? "#0A0A0A" : "transparent",
                color: tab === t ? "#F5F2EC" : "#8A8880",
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                letterSpacing: "1.5px",
                cursor: "pointer",
              }}
            >
              {t === "pending" ? "대기 중" : t === "all" ? "전체 제출" : "승인된 제품"}
            </button>
          ))}
          <button
            onClick={() => fetchData(password)}
            style={{
              marginLeft: "auto",
              padding: "7px 12px",
              borderRadius: 20,
              border: "0.5px solid #D8D4CC",
              background: "transparent",
              color: "#8A8880",
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              cursor: "pointer",
            }}
          >
            {loading ? "..." : "↻ 새로고침"}
          </button>
        </div>

        {/* Approved Products list */}
        {tab === "approved" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {approved.length === 0 && (
              <p style={{ fontSize: 13, color: "rgba(10,10,10,0.35)", textAlign: "center", padding: "40px 0" }}>
                승인된 제품이 없습니다.
              </p>
            )}
            {approved.map((p) => (
              <div
                key={p.barcode}
                style={{
                  background: "#EDEAE3",
                  border: "0.5px solid #D8D4CC",
                  borderRadius: 12,
                  padding: "14px 16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 400, color: "#0A0A0A", marginBottom: 2 }}>{p.name || "이름 없음"}</p>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880" }}>{p.barcode}</p>
                  </div>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 8,
                    padding: "3px 8px",
                    borderRadius: 10,
                    background: "rgba(42,138,92,0.12)",
                    color: "#2A8A5C",
                    border: "0.5px solid rgba(42,138,92,0.3)",
                  }}>APPROVED</span>
                </div>
                <p style={{ fontSize: 11, color: "rgba(10,10,10,0.5)", lineHeight: 1.5, marginTop: 6 }}>
                  {p.ingredients.slice(0, 120)}{p.ingredients.length > 120 ? "…" : ""}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Submissions list */}
        {tab !== "approved" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {displayed.length === 0 && (
              <p style={{ fontSize: 13, color: "rgba(10,10,10,0.35)", textAlign: "center", padding: "40px 0" }}>
                {tab === "pending" ? "대기 중인 제출이 없습니다." : "제출 내역이 없습니다."}
              </p>
            )}
            {displayed.map((s) => (
              <div
                key={s.id}
                style={{
                  background: s.status === "pending" ? "#0A0A0A" : "#EDEAE3",
                  border: `0.5px solid ${s.status === "pending" ? "#2A2A2A" : "#D8D4CC"}`,
                  borderRadius: 14,
                  padding: "16px 18px",
                }}
              >
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 400, color: s.status === "pending" ? "#F5F2EC" : "#0A0A0A", marginBottom: 2 }}>
                      {s.name || "이름 없음"}
                    </p>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: s.status === "pending" ? "rgba(245,242,236,0.35)" : "#8A8880" }}>
                      {s.barcode} · {new Date(s.submittedAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 8,
                    padding: "3px 8px",
                    borderRadius: 10,
                    background: s.status === "pending"
                      ? "rgba(196,120,10,0.2)"
                      : s.status === "approved"
                      ? "rgba(42,138,92,0.12)"
                      : "rgba(196,75,75,0.12)",
                    color: s.status === "pending" ? "#C4780A" : s.status === "approved" ? "#2A8A5C" : "#C44B4B",
                    border: `0.5px solid ${s.status === "pending" ? "rgba(196,120,10,0.4)" : s.status === "approved" ? "rgba(42,138,92,0.3)" : "rgba(196,75,75,0.3)"}`,
                  }}>
                    {s.status === "pending" ? "PENDING" : s.status === "approved" ? "APPROVED" : "REJECTED"}
                  </span>
                </div>

                {/* Ingredients */}
                <p style={{
                  fontSize: 11,
                  color: s.status === "pending" ? "rgba(245,242,236,0.5)" : "rgba(10,10,10,0.5)",
                  lineHeight: 1.55,
                  marginBottom: s.status === "pending" ? 14 : 0,
                }}>
                  {s.ingredients.slice(0, 160)}{s.ingredients.length > 160 ? "…" : ""}
                </p>

                {/* Action buttons */}
                {s.status === "pending" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => resolve(s.id, "approved")}
                      style={{
                        flex: 1,
                        padding: "10px",
                        background: "#F5F2EC",
                        border: "none",
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#2A8A5C",
                        cursor: "pointer",
                      }}
                    >
                      승인
                    </button>
                    <button
                      onClick={() => resolve(s.id, "rejected")}
                      style={{
                        flex: 1,
                        padding: "10px",
                        background: "rgba(245,242,236,0.06)",
                        border: "0.5px solid rgba(245,242,236,0.15)",
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 500,
                        color: "rgba(245,242,236,0.4)",
                        cursor: "pointer",
                      }}
                    >
                      거절
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
