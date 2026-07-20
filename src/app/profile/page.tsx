"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { PROFILE_META, type ProfileType } from "@/lib/profiling";
import { getScoreColor } from "@/lib/scoring";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  sensitivity_type: ProfileType | null;
  onboarding_completed: boolean;
}

interface ScanRecord {
  id: string;
  barcode: string;
  product_name: string;
  score: number;
  scanned_at: string;
}

interface MyPost {
  id: string;
  title: string;
  likes_count: number;
  comments_count: number;
  category: string | null;
  created_at: string;
}

interface RecentScan {
  barcode: string;
  name: string;
  score: number;
  color: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [localScans, setLocalScans] = useState<RecentScan[]>([]);
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"history" | "posts" | "settings">("history");

  useEffect(() => {
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/login?next=/profile"); return; }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      const { data: history } = await supabase
        .from("scan_history")
        .select("*")
        .eq("user_id", user.id)
        .order("scanned_at", { ascending: false })
        .limit(20);
      setScanHistory(history ?? []);

      try {
        const raw = localStorage.getItem("hindsight_recent_scans");
        if (raw) setLocalScans(JSON.parse(raw));
      } catch { /* ignore */ }

      const { data: posts } = await supabase
        .from("community_posts")
        .select("id, title, likes_count, comments_count, category, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setMyPosts((posts as MyPost[]) ?? []);

      setLoading(false);
    }
    load();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const profileMeta = profile?.sensitivity_type
    ? PROFILE_META[profile.sensitivity_type]
    : null;

  if (loading) {
    return (
      <main style={{ minHeight: "100dvh", background: "#F5F2EC", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 20, height: 20, border: "1px solid #D8D4CC", borderTopColor: "#0A0A0A", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </main>
    );
  }

  return (
    <main style={{
      minHeight: "100dvh",
      background: "#F5F2EC",
      fontFamily: "'Space Grotesk', -apple-system, sans-serif",
      paddingBottom: 80,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
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
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px" }}>PROFILE</span>
      </header>

      {/* Profile hero */}
      <div style={{ padding: "40px 28px 36px", borderBottom: "0.5px solid #D8D4CC", maxWidth: 480, margin: "0 auto", width: "100%" }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "3px", marginBottom: 16 }}>
          {profileMeta ? profileMeta.type.toUpperCase() : "MEMBER"}
        </p>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: "#0A0A0A", letterSpacing: "-1.2px", lineHeight: 1.1, marginBottom: 8 }}>
          {profile?.name ?? profile?.email?.split("@")[0] ?? "사용자"}
        </h1>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1px", marginBottom: 16 }}>
          {profile?.email}
        </p>

        {profileMeta ? (
          <p style={{ fontSize: 13, fontWeight: 300, color: "#8A8880", letterSpacing: "-0.1px" }}>
            {profileMeta.label} — {profileMeta.tip}
          </p>
        ) : (
          <button
            onClick={() => router.push("/onboarding")}
            style={{
              background: "none",
              border: "0.5px solid #D8D4CC",
              borderRadius: 2,
              padding: "8px 16px",
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              color: "#8A8880",
              letterSpacing: "1.5px",
              cursor: "pointer",
            }}
          >
            SETUP PROFILE →
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        borderBottom: "0.5px solid #D8D4CC",
        background: "#F5F2EC",
        position: "sticky",
        top: 0,
        zIndex: 10,
        maxWidth: 480,
        margin: "0 auto",
        width: "100%",
      }}>
        {(["history", "posts", "settings"] as const).map((tab) => {
          const labels = { history: "SCANS", posts: "POSTS", settings: "SETTINGS" };
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "14px 0",
                background: "none",
                border: "none",
                borderBottom: active ? "1px solid #0A0A0A" : "1px solid transparent",
                fontFamily: "'DM Mono', monospace",
                fontSize: 8,
                color: active ? "#0A0A0A" : "#8A8880",
                letterSpacing: "2px",
                cursor: "pointer",
                transition: "color 0.15s",
              }}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 28px" }}>

        {/* SCAN HISTORY TAB */}
        {activeTab === "history" && (
          <div style={{ paddingTop: 32 }}>
            {scanHistory.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {scanHistory.map((s, i) => (
                  <div
                    key={s.id}
                    onClick={() => router.push(`/scan/result/${s.barcode}`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: i === 0 ? 0 : 16,
                      paddingBottom: 16,
                      borderBottom: "0.5px solid #D8D4CC",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 400, color: "#0A0A0A", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.2px" }}>
                        {s.product_name || "알 수 없는 제품"}
                      </p>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "0.5px" }}>
                        {s.barcode} · {new Date(s.scanned_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 500, color: getScoreColor(s.score), marginLeft: 16, flexShrink: 0, letterSpacing: "-0.5px" }}>
                      {s.score}
                    </span>
                  </div>
                ))}
              </div>
            ) : localScans.length > 0 ? (
              <div>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", letterSpacing: "2px", marginBottom: 20 }}>
                  LOCAL · 로그인 전 기록
                </p>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {localScans.map((s, i) => (
                    <div
                      key={s.barcode}
                      onClick={() => router.push(`/scan/result/${s.barcode}`)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingTop: i === 0 ? 0 : 16,
                        paddingBottom: 16,
                        borderBottom: "0.5px solid #D8D4CC",
                        cursor: "pointer",
                      }}
                    >
                      <p style={{ fontSize: 14, fontWeight: 400, color: "#0A0A0A", letterSpacing: "-0.2px" }}>{s.name}</p>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 500, color: s.color, letterSpacing: "-0.5px" }}>{s.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ paddingTop: 48, textAlign: "center" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px", marginBottom: 12 }}>
                  NO SCANS YET
                </p>
                <p style={{ fontSize: 14, fontWeight: 300, color: "#8A8880", marginBottom: 32, letterSpacing: "-0.2px" }}>
                  아직 스캔한 제품이 없어요.
                </p>
                <button
                  onClick={() => router.push("/scan")}
                  style={{
                    padding: "13px 28px",
                    background: "#0A0A0A",
                    color: "#F5F2EC",
                    border: "none",
                    borderRadius: 2,
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 9,
                    letterSpacing: "2px",
                    cursor: "pointer",
                  }}
                >
                  SCAN NOW
                </button>
              </div>
            )}
          </div>
        )}

        {/* MY POSTS TAB */}
        {activeTab === "posts" && (
          <div style={{ paddingTop: 32 }}>
            {myPosts.length === 0 ? (
              <div style={{ paddingTop: 48, textAlign: "center" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px", marginBottom: 12 }}>
                  NO POSTS YET
                </p>
                <p style={{ fontSize: 14, fontWeight: 300, color: "#8A8880", marginBottom: 32, letterSpacing: "-0.2px" }}>
                  커뮤니티에 글을 써보세요.
                </p>
                <button
                  onClick={() => router.push("/community/write")}
                  style={{
                    padding: "13px 28px",
                    background: "#0A0A0A",
                    color: "#F5F2EC",
                    border: "none",
                    borderRadius: 2,
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 9,
                    letterSpacing: "2px",
                    cursor: "pointer",
                  }}
                >
                  WRITE
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {myPosts.map((p, i) => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/community/${p.id}`)}
                    style={{
                      paddingTop: i === 0 ? 0 : 16,
                      paddingBottom: 16,
                      borderBottom: "0.5px solid #D8D4CC",
                      cursor: "pointer",
                    }}
                  >
                    <p style={{ fontSize: 14, fontWeight: 400, color: "#0A0A0A", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.2px" }}>
                      {p.title}
                    </p>
                    <div style={{ display: "flex", gap: 12 }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880" }}>
                        ♥ {p.likes_count} · 💬 {p.comments_count}
                      </span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880" }}>
                        {new Date(p.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <div style={{ paddingTop: 32 }}>

            {/* Sensitivity profile row */}
            <div style={{ paddingBottom: 20, borderBottom: "0.5px solid #D8D4CC", marginBottom: 0 }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", letterSpacing: "2.5px", marginBottom: 14 }}>
                SENSITIVITY PROFILE
              </p>
              <button
                onClick={() => router.push("/onboarding")}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "12px 0",
                }}
              >
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: 15, fontWeight: 400, color: "#0A0A0A", letterSpacing: "-0.2px", marginBottom: 3 }}>
                    {profileMeta?.label ?? "미설정"}
                  </p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "1px" }}>
                    {profileMeta ? "재측정하기" : "측정 시작"}
                  </p>
                </div>
                <span style={{ fontSize: 16, color: "#8A8880", fontWeight: 300 }}>→</span>
              </button>
            </div>

            {/* Settings list */}
            {[
              { label: "알림", sub: "스캔 결과 & 건강 팁", enabled: false },
              { label: "언어", sub: "한국어", enabled: null },
              { label: "다크모드", sub: "시스템 설정 따름", enabled: false },
            ].map((s, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: 20,
                paddingBottom: 20,
                borderBottom: "0.5px solid #D8D4CC",
              }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 400, color: "#0A0A0A", letterSpacing: "-0.2px", marginBottom: 3 }}>{s.label}</p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "0.5px" }}>{s.sub}</p>
                </div>
                {s.enabled !== null ? (
                  <div style={{
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    background: s.enabled ? "#0A0A0A" : "#D8D4CC",
                    position: "relative",
                  }}>
                    <div style={{
                      position: "absolute",
                      top: 2,
                      left: s.enabled ? 18 : 2,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "#fff",
                    }} />
                  </div>
                ) : (
                  <span style={{ fontSize: 14, color: "#8A8880", fontWeight: 300 }}>→</span>
                )}
              </div>
            ))}

            {/* Sign out */}
            <div style={{ paddingTop: 32 }}>
              <button
                onClick={handleSignOut}
                style={{
                  background: "none",
                  border: "none",
                  padding: "12px 0",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9,
                  color: "#C44B4B",
                  letterSpacing: "1.5px",
                  cursor: "pointer",
                }}
              >
                SIGN OUT
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
