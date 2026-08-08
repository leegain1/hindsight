"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { PROFILE_META, EMPTY_HEALTH_PROFILE, type ProfileType, type HealthProfile } from "@/lib/profiling";
import { getScoreColor } from "@/lib/scoring";
import { MOCK_SCANS } from "@/lib/mockScans";
import { reportHref } from "@/lib/mockReports";
import PageHeader from "@/components/PageHeader";

interface SavedAnalysis {
  id: string;
  productName: string;
  brand: string;
  score: number;
  label: string;
  color: string;
  riskCount: number;
}

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
  // 온보딩 설문이 로컬에 남긴 결과 (Supabase 미설정 시 대체 소스)
  const [localSensitivity, setLocalSensitivity] = useState<ProfileType | null>(null);
  const [health, setHealth] = useState<HealthProfile>(EMPTY_HEALTH_PROFILE);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("hindsight_sensitivity");
      if (raw) setLocalSensitivity((JSON.parse(raw) as { type: ProfileType }).type);
      const h = localStorage.getItem("hindsight_health_profile");
      if (h) setHealth({ ...EMPTY_HEALTH_PROFILE, ...JSON.parse(h) });
    } catch {
      /* 값이 깨졌으면 없는 것으로 본다 */
    }
  }, []);

  // 사진 분석에서 "저장" 누른 것들
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("hindsight_saved_analyses");
      if (raw) setSavedAnalyses(JSON.parse(raw) as SavedAnalysis[]);
    } catch {
      /* 값이 깨졌으면 없는 것으로 본다 */
    }
  }, []);

  // 설문에서 실제로 채운 항목만 보여준다
  const healthGroups = [
    { label: "알레르기", items: health.allergies },
    { label: "질환", items: health.conditions },
    { label: "복용 중인 약", items: health.medications },
    { label: "건강 목표", items: health.goals },
    { label: "피하고 싶은 성분", items: health.avoid },
  ].filter((g) => g.items.length > 0);
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

      /**
       * 구글 로그인은 이름을 user_metadata 에 담아서 온다. 그런데 가입 시
       * profiles 를 채우는 트리거(handle_new_user)는 id·email 만 넣기 때문에
       * profiles.name 이 비어 있다 — 그대로 두면 화면에 이메일 앞부분이
       * 이름처럼 뜬다.
       *
       * 메타데이터에서 이름을 꺼내 쓰고, 다음 방문부터는 조회 한 번으로
       * 끝나도록 profiles 에 되메꿔 둔다. (RLS 의 profiles_update_own 이
       * 본인 행 수정을 허용한다)
       */
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const metaName =
        [meta.full_name, meta.name, meta.user_name]
          .find((v): v is string => typeof v === "string" && v.trim().length > 0)
          ?.trim() ?? null;

      let resolved = profileData as Profile | null;
      if (!resolved) {
        // 트리거가 안 돌았거나 행이 없는 경우 — 계정 정보로 화면을 채운다
        resolved = {
          id: user.id,
          email: user.email ?? "",
          name: metaName,
          sensitivity_type: null,
          onboarding_completed: false,
        };
      } else if (!resolved.name?.trim() && metaName) {
        await supabase.from("profiles").update({ name: metaName }).eq("id", user.id);
        resolved = { ...resolved, name: metaName };
      }
      setProfile(resolved);

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
    // supabase 는 키가 없으면 null 이다. 가드 없이 .auth 를 부르면 로그아웃
    // 버튼을 누른 순간 화면이 그대로 죽는다.
    if (supabase) await supabase.auth.signOut();
    router.replace("/");
  };

  // 서버 값이 우선. Supabase 키가 없으면 온보딩이 로컬에 남긴 결과로 대체한다
  const sensitivityType = profile?.sensitivity_type ?? localSensitivity;
  const profileMeta = sensitivityType ? PROFILE_META[sensitivityType] : null;
  /**
   * 계정에서 가져온 이름. 없으면 null 이고, 그때는 제목을 "내 프로필" 로 둔다 —
   * "게스트님의 프로필" 은 사람 이름 자리에 들어갈 말이 아니다.
   * ?? 대신 || 를 쓴다. 빈 문자열도 없는 것으로 봐야 한다.
   */
  const rawName = profile?.name?.trim() || profile?.email?.split("@")[0] || null;
  /**
   * 제목은 28px/700 한 줄 규격이다. 이름이 길면(구글 표시 이름이나 이메일
   * 앞부분이 긴 경우) 제목이 세 줄로 흘러 헤더가 무너진다. 그래서 자른다.
   */
  const accountName =
    rawName && rawName.length > 14 ? `${rawName.slice(0, 14)}…` : rawName;

  if (loading) {
    return (
      <main style={{ minHeight: "100dvh", background: "#F5F2EC", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spin" style={{ width: 20, height: 20, border: "1px solid #D8D4CC", borderTopColor: "#0A0A0A", borderRadius: "50%", }} />
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

      <PageHeader
        eyebrow="PROFILE"
        title={accountName ? `${accountName}님의 프로필` : "내 프로필"}
        subtitle={
          // 이름이 제목으로 올라갔으므로 부제에서 다시 부르지 않는다
          profileMeta ? profileMeta.label : "개인 맞춤 분석 미설정"
        }
      />

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
                // 색과 밑줄이 같이 넘어가야 탭이 "이동한" 것처럼 읽힌다
                fontFamily: "'DM Mono', monospace",
                fontSize: 8,
                color: active ? "#0A0A0A" : "#8A8880",
                letterSpacing: "2px",
                cursor: "pointer",
                transition: "color var(--dur-state) var(--ease-out-quart), border-color var(--dur-state) var(--ease-out-quart)",
              }}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 28px" }}>

        {/* SCAN HISTORY TAB */}
        {/* key 를 탭에 묶어 탭이 바뀔 때마다 등장이 다시 재생되게 한다 */}
        {activeTab === "history" && (
          <div key="history" style={{ paddingTop: 32 }}>
            {/* 저장한 분석 — 사용자가 직접 남긴 것이라 최근 스캔보다 위에 둔다 */}
            {savedAnalyses.length > 0 && (
              <section className="stagger" style={{ marginBottom: 34 }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", letterSpacing: "2.5px", marginBottom: 14 }}>
                  SAVED · 저장함 {savedAnalyses.length}
                </p>
                {savedAnalyses.map((s, i) => (
                  <div
                    key={s.id}
                    style={{
                      ["--i" as string]: i,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "13px 14px",
                      marginBottom: 8,
                      background: "#FFFFFF",
                      border: "0.5px solid #D8D4CC",
                      borderRadius: 12,
                    }}
                  >
                    <span style={{ fontSize: 18, fontWeight: 700, color: s.color, letterSpacing: "-0.5px", minWidth: 30, flexShrink: 0 }}>
                      {s.score}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#0A0A0A", letterSpacing: "-0.2px" }}>
                        {s.productName}
                      </span>
                      <span style={{ display: "block", fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "0.5px", marginTop: 2 }}>
                        {s.brand} · 주의 성분 {s.riskCount}
                      </span>
                    </span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: s.color, background: `${s.color}14`, borderRadius: 999, padding: "3px 8px", flexShrink: 0 }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </section>
            )}

            {/* 최근 스캔 — 서버 이력 > 로컬 기록 > 목 데이터 순으로 채운다 */}
            <section className="stagger">
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", letterSpacing: "2.5px", marginBottom: 14 }}>
                RECENT · 최근 스캔
              </p>

              {scanHistory.length > 0 ? (
                scanHistory.map((s, i) => (
                  <ScanRow
                    index={i}
                    key={s.id}
                    name={s.product_name || "알 수 없는 제품"}
                    sub={`${s.barcode} · ${new Date(s.scanned_at).toLocaleDateString("ko-KR")}`}
                    score={s.score}
                    color={getScoreColor(s.score)}
                    onClick={() => router.push(reportHref(s.barcode))}
                  />
                ))
              ) : localScans.length > 0 ? (
                localScans.map((s, i) => (
                  <ScanRow
                    index={i}
                    key={s.barcode}
                    name={s.name}
                    sub={s.barcode}
                    score={s.score}
                    color={s.color}
                    onClick={() => router.push(reportHref(s.barcode))}
                  />
                ))
              ) : (
                MOCK_SCANS.map((s, i) => (
                  <ScanRow
                    index={i}
                    key={s.barcode}
                    name={s.name}
                    sub={`${s.brand} · ${s.via === "photo" ? "사진 분석" : "바코드"}`}
                    score={s.score}
                    color={s.color}
                    onClick={
                      s.via === "photo"
                        ? () => router.push("/scan/photo")
                        : () => router.push(reportHref(s.barcode))
                    }
                  />
                ))
              )}
            </section>
          </div>
        )}

        {/* MY POSTS TAB */}
        {activeTab === "posts" && (
          <div key="posts" className="fade-in" style={{ paddingTop: 32 }}>
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
          <div key="settings" className="fade-in" style={{ paddingTop: 32 }}>

            {/* Sensitivity profile row */}
            <div style={{ paddingBottom: 20, borderBottom: "0.5px solid #D8D4CC", marginBottom: 0 }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", letterSpacing: "2.5px", marginBottom: 6 }}>
                SENSITIVITY PROFILE
              </p>
              {/* 처음에 건너뛴 사용자가 여기서 설문을 하거나 답을 고칠 수 있어야 한다.
                  답한 내용이 안 보이면 무엇을 고칠지 모르므로 항목별로 전부 노출한다. */}
              <p style={{ fontSize: 12, color: "#8A8880", lineHeight: 1.6, marginBottom: 14 }}>
                개인 맞춤 분석 — 여기 적힌 조건으로 제품을 다시 판정합니다.
              </p>

              {healthGroups.length > 0 ? (
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "0.5px solid #D8D4CC",
                    borderRadius: 12,
                    padding: "16px 14px",
                    marginBottom: 10,
                  }}
                >
                  {profileMeta && (
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#0A0A0A", letterSpacing: "-0.2px", marginBottom: 14 }}>
                      {profileMeta.label}
                    </p>
                  )}
                  {healthGroups.map((g) => (
                    <div key={g.label} style={{ marginBottom: 12 }}>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1.5px", marginBottom: 6 }}>
                        {g.label}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {g.items.map((it) => (
                          <span
                            key={it}
                            style={{
                              fontSize: 13,
                              color: "#0A0A0A",
                              background: "#EDEAE3",
                              border: "0.5px solid #D8D4CC",
                              borderRadius: 999,
                              padding: "6px 11px",
                            }}
                          >
                            {it}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    background: "#EDEAE3",
                    border: "0.5px solid #D8D4CC",
                    borderRadius: 12,
                    padding: "16px 14px",
                    marginBottom: 10,
                  }}
                >
                  <p style={{ fontSize: 14, fontWeight: 500, color: "#0A0A0A", marginBottom: 4 }}>
                    아직 설문을 안 하셨어요
                  </p>
                  <p style={{ fontSize: 12, color: "#8A8880", lineHeight: 1.6 }}>
                    알레르기·질환을 입력하면 같은 제품도 회원님 기준으로 다시 판정합니다. 1분이면 끝나요.
                  </p>
                </div>
              )}

              <button
                onClick={() => router.push("/onboarding")}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: healthGroups.length > 0 ? "transparent" : "#0A0A0A",
                  border: healthGroups.length > 0 ? "0.5px solid #D8D4CC" : "none",
                  borderRadius: 12,
                  cursor: "pointer",
                  padding: "14px 16px",
                  fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                  fontSize: 14,
                  fontWeight: healthGroups.length > 0 ? 400 : 600,
                  color: healthGroups.length > 0 ? "#0A0A0A" : "#F5F2EC",
                  touchAction: "manipulation",
                }}
              >
                {healthGroups.length > 0 ? "답변 수정하기" : "설문 시작하기"}
                <span aria-hidden="true" style={{ opacity: 0.5 }}>→</span>
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

/** 스캔 이력 한 줄 — 서버·로컬·목 세 소스가 같은 모양으로 보여야 한다 */
function ScanRow({
  name,
  sub,
  score,
  color,
  onClick,
  index = 0,
}: {
  name: string;
  sub: string;
  score: number;
  color: string;
  onClick: () => void;
  /** 목록에서의 순서 — 부모의 .stagger 가 이 값으로 지연을 준다 */
  index?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ["--i" as string]: index,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "14px 0",
        background: "none",
        border: "none",
        borderBottom: "0.5px solid #D8D4CC",
        cursor: "pointer",
        textAlign: "left",
        touchAction: "manipulation",
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 400, color: "#0A0A0A", letterSpacing: "-0.2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </span>
        <span style={{ display: "block", fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "0.5px", marginTop: 4 }}>
          {sub}
        </span>
      </span>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 500, color, flexShrink: 0, letterSpacing: "-0.5px" }}>
        {score}
      </span>
    </button>
  );
}
