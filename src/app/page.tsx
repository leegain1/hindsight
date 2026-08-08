"use client";

/**
 * 홈.
 *
 * 발표 기준(학술제 슬라이드 4-3 / 5)에서 데모가 증명해야 하는 건 두 가지다 —
 * ① 바코드 없는 제품을 사진으로 분석한다  ② 같은 제품도 내 조건에 따라 결과가
 * 다르다. 홈은 그 두 개로 3초 안에 들어가는 관문이지, 기능 진열장이 아니다.
 *
 * 그래서 세 블록만 둔다.
 *   ① 사진 분석 (히어로의 주 액션)
 *   ② 내 기준   (설문 결과 — 결과가 왜 달라지는지의 근거)
 *   ③ 최근에 본 제품
 * 그 아래 카테고리 평균은 ③④⑤ 축으로 가는 입구다.
 *
 * 걷어낸 것: 히어로 검색바(챗봇 입구가 FAB 과 둘로 갈려 있었다), 이번 주 TOP
 * 랭킹, 커뮤니티 인기글, 오늘의 팩트. 팩트는 /api/today-facts 를 호출하는데
 * 발표장에 인터넷이 없어 스켈레톤이 영원히 돌게 된다.
 */

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/categories";
import { getProductsByCategory, getScoreBadgeColor } from "@/lib/productData";
import { EMPTY_HEALTH_PROFILE, type HealthProfile } from "@/lib/profiling";
import { MOCK_SCANS } from "@/lib/mockScans";
import { sortMockPosts } from "@/lib/mockCommunity";
import { reportHref } from "@/lib/mockReports";
import { isAnonBrowsing } from "@/lib/session";
import ChatModal from "@/components/ChatModal";

/**
 * 팩트 카드의 기본값.
 *
 * 전에는 빈 상태로 시작해 /api/today-facts 를 기다렸고, 응답이 없으면
 * 스켈레톤이 계속 돌았다. 발표장에 인터넷이 없다는 게 확정이라 순서를
 * 뒤집는다 — 이 값으로 먼저 다 그려놓고, API 가 응답하면 그때 갈아끼운다.
 * 스켈레톤이 아예 없으니 영원히 도는 일도 없다.
 */
const FALLBACK_FACTS: Fact[] = [
  { category: "가공식품", title: "아질산나트륨이 암을 유발한다?", verdict: "부분사실", verdictColor: "#6B52D4", query: "아질산나트륨 발암 위험" },
  { category: "EMF", title: "5G가 면역 체계를 약화시킨다", verdict: "거짓", verdictColor: "#E23434", query: "5G 전자파 면역 건강" },
  { category: "수질", title: "수돗물의 염소가 장기적으로 해롭다", verdict: "과장됨", verdictColor: "#C05000", query: "수돗물 염소 건강 위험" },
];

const FACTS_CACHE_KEY = "hindsight_today_facts";
const FACTS_CACHE_TTL = 86400 * 1000; // 24h

interface Fact {
  category: string;
  title: string;
  verdict: string;
  verdictColor: string;
  query: string;
}

interface PopularPost {
  id: string;
  title: string;
  likes_count: number;
  comments_count: number;
}

/** 아직 유효한 캐시가 있으면 그 값을, 없으면 null. setState 는 하지 않는다. */
function readCachedFacts(): Fact[] | null {
  try {
    const cached = localStorage.getItem(FACTS_CACHE_KEY);
    if (!cached) return null;
    const { data, ts } = JSON.parse(cached);
    if (Date.now() - ts < FACTS_CACHE_TTL && Array.isArray(data) && data.length > 0) {
      return data as Fact[];
    }
  } catch { /* 값이 깨졌으면 기본값을 쓴다 */ }
  return null;
}

const INK = "#0A0A0A";
const CANVAS = "#F5F2EC";
const CARD = "#EDEAE3";
const HAIRLINE = "#D8D4CC";
const MUTED = "#8A8880";

const SANS = "'Space Grotesk', -apple-system, sans-serif";
const MONO = "'DM Mono', monospace";

/** 반지름 위계. 전에는 전부 12 라 카드·버튼·칩이 같은 높이로 읽혔다. */
const R_PANEL = 14;
const R_TILE = 10;

interface RecentScan {
  barcode: string;
  name: string;
  score: number;
  color: string;
  timestamp: number;
}

/** 홈에서 보여줄 최근 항목 — 실제 이력과 목 데이터를 같은 모양으로 맞춘다 */
interface RecentItem {
  barcode: string;
  name: string;
  sub: string;
  score: number;
  color: string;
}

/** 한글 제목. 섹션마다 대문자 눈썹 라벨을 붙이는 습관을 여기서 끊는다. */
function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
      <h2 style={{ fontSize: 15, fontWeight: 500, color: INK, letterSpacing: "-0.3px" }}>{children}</h2>
      {action}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  /**
   * 로그인 확인이 끝나기 전에는 홈을 그리지 않는다.
   * 홈이 한 번 번쩍인 뒤 /welcome 으로 넘어가면 화면이 깨진 것처럼 보인다.
   */
  const [gate, setGate] = useState<"checking" | "open">("checking");
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [profile, setProfile] = useState<HealthProfile>(EMPTY_HEALTH_PROFILE);
  const [facts, setFacts] = useState<Fact[]>(FALLBACK_FACTS);
  const [serverPosts, setServerPosts] = useState<PopularPost[]>([]);
  const [chatOpen, setChatOpen] = useState(false);

  /**
   * 로그인하지 않았으면 홈을 보여주지 않고 /welcome 으로 되돌린다.
   *
   * 전에는 "이 흐름을 본 적 있는지"(localStorage)만 봤다. 그래서 한 번
   * 둘러본 뒤로는 로그인 안 한 사람도 홈이 그대로 열렸다.
   *
   * 확인은 getUser() 가 아니라 getSession() 으로 한다. getUser() 는 매번
   * 네트워크를 타서, 발표장처럼 인터넷이 없으면 응답을 기다리다 검은 화면에
   * 갇힌다. getSession() 은 로컬 세션만 읽어 즉시 끝난다. 여기서 필요한 건
   * 인가가 아니라 어디를 보여줄지 정하는 것뿐이고, 실제 보호는 RLS 와
   * proxy 가 한다.
   */
  useEffect(() => {
    let cancelled = false;

    // 프로미스로 한 번 넘긴다 — 이펙트 본문에서 곧바로 setState 하면
    // 렌더가 연쇄로 다시 돈다.
    void Promise.resolve().then(async () => {
      if (cancelled) return;

      // 이 탭에서 "로그인 없이 둘러보기" 를 선택했으면 통과
      if (isAnonBrowsing()) {
        setGate("open");
        return;
      }

      // Supabase 미설정이면 로그인 여부를 알 방법이 없다 — 막지 않는다
      if (!supabase) {
        setGate("open");
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session) {
        setGate("open");
        return;
      }
      router.replace("/welcome");
    });

    return () => { cancelled = true; };
  }, [router, supabase]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("hindsight_recent_scans");
      if (raw) setRecentScans(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("hindsight_health_profile");
      if (raw) setProfile({ ...EMPTY_HEALTH_PROFILE, ...JSON.parse(raw) });
    } catch { /* 값이 깨졌으면 설문 전으로 취급한다 */ }
  }, []);

  // 팩트는 이미 화면에 그려져 있다. 응답이 오면 더 나은 값으로 갈아끼울 뿐,
  // 실패해도 화면은 그대로다.
  //
  // 캐시와 네트워크를 같은 프로미스 체인으로 흘린다. 캐시 적중분을 이펙트
  // 본문에서 바로 setFacts 하면 렌더가 연쇄로 다시 돌고 lint 도 잡는다.
  useEffect(() => {
    Promise.resolve(readCachedFacts())
      .then((hit) =>
        hit
          ? { data: hit, fromCache: true }
          : fetch("/api/today-facts")
              .then((r) => r.json())
              .then((data: unknown) => ({ data, fromCache: false })),
      )
      .then(({ data, fromCache }) => {
        if (!Array.isArray(data) || data.length === 0) return;
        setFacts(data as Fact[]);
        if (fromCache) return;
        try {
          localStorage.setItem(FACTS_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
        } catch { /* ignore */ }
      })
      .catch(() => { /* 기본값이 이미 보이고 있다 */ });
  }, []);

  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase
        .from("community_posts")
        .select("id, title, likes_count, comments_count")
        .order("likes_count", { ascending: false })
        .limit(3);
      if (data) setServerPosts(data as PopularPost[]);
    })();
  }, [supabase]);

  /**
   * 커뮤니티 인기글.
   * Supabase 가 없으면 서버 목록은 늘 비어서 섹션이 통째로 사라졌다 —
   * 실제로는 "글이 없다"가 아니라 "연결이 없다"인데 화면은 구분해주지
   * 않았다. 목 데이터로 채워 발표에서도 채워진 커뮤니티가 보이게 한다.
   */
  const popularPosts: PopularPost[] = useMemo(() => {
    if (serverPosts.length > 0) return serverPosts;
    return sortMockPosts("popular").slice(0, 3).map((p) => ({
      id: p.id,
      title: p.title,
      likes_count: p.likes_count,
      comments_count: p.comments_count,
    }));
  }, [serverPosts]);

  /** 내가 걸어둔 조건 — 결과가 남과 달라지는 이유 그 자체다 */
  const myTerms = useMemo(
    () => [...profile.allergies, ...profile.conditions, ...profile.avoid],
    [profile],
  );

  /** 실제 이력이 없으면 목 데이터로 채운다 — 빈 홈은 데모에서 미완성으로 읽힌다 */
  const recentItems: RecentItem[] = useMemo(() => {
    if (recentScans.length > 0) {
      return recentScans.slice(0, 6).map((s) => ({
        barcode: s.barcode,
        name: s.name,
        sub: s.barcode.startsWith("photo-") ? "사진 분석" : "바코드",
        score: s.score,
        color: s.color,
      }));
    }
    return MOCK_SCANS.slice(0, 6).map((s) => ({
      barcode: s.barcode,
      name: s.name,
      sub: s.via === "photo" ? "사진 분석" : s.brand,
      score: s.score,
      color: s.color,
    }));
  }, [recentScans]);

  /**
   * 카테고리 타일에 이모지 대신 평균 점수를 넣는다.
   * 애플 기본 이모지를 쓰면 화면의 개성이 애플 것이 되고, 무엇보다
   * 이모지는 아무 정보도 주지 않는다. 가공식품 55 / 공기청정기 82 는
   * 이 앱이 무엇을 하는 앱인지 한 줄로 말해준다.
   */
  const categoryAverages = useMemo(
    () =>
      CATEGORIES.slice(0, 6).map((cat) => {
        const products = getProductsByCategory(cat.slug);
        const avg = products.length
          ? Math.round(products.reduce((sum, p) => sum + p.score, 0) / products.length)
          : null;
        return { ...cat, avg, count: products.length };
      }),
    [],
  );

  // /welcome 의 첫 화면과 같은 검정 — 넘어갈 때 화면이 이어 붙는다
  if (gate === "checking") {
    return <div style={{ minHeight: "100dvh", background: INK }} />;
  }

  return (
    <main style={{
      minHeight: "100dvh",
      background: CANVAS,
      fontFamily: SANS,
      paddingBottom: 64,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .tile:active { opacity: 0.85; }
      `}</style>

      {/* ── 히어로 ─────────────────────────────────────────────────────────
          검정을 유지한다. 아이보리 본문과 대비를 만들고, 판정 색이 검정 위에서
          가장 정확하게 읽힌다. */}
      <section style={{ background: INK }}>
        <header style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "calc(20px + env(safe-area-inset-top)) 24px 20px",
          borderBottom: "0.5px solid #1E1E1E",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 72 72" fill="none" aria-hidden="true">
              <rect x="33" y="8" width="6" height="20" rx="1" fill={CANVAS} />
              <rect x="33" y="44" width="6" height="20" rx="1" fill={CANVAS} />
              <rect x="8" y="33" width="20" height="6" rx="1" fill={CANVAS} />
              <rect x="44" y="33" width="20" height="6" rx="1" fill={CANVAS} />
            </svg>
            <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 300, letterSpacing: "3px", color: CANVAS }}>
              HINDSIGHT<span style={{ opacity: 0.25 }}>+</span>
            </span>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 9, color: "#4A4A48", letterSpacing: "1.5px" }}>BETA</span>
        </header>

        <div style={{ maxWidth: 480, margin: "0 auto", padding: "32px 24px 28px" }}>
          {/* 이 앱에 남은 유일한 대문자 라벨 — 브랜드 서명이라 남긴다.
              섹션마다 붙던 나머지 라벨은 전부 한글 제목으로 바꿨다. */}
          <p style={{ fontFamily: MONO, fontSize: 8, color: "#4A4A48", letterSpacing: "2px", marginBottom: 12 }}>
            KNOW WHAT YOU WERE NEVER TOLD
          </p>
          <h1 style={{ fontSize: 30, fontWeight: 300, color: CANVAS, lineHeight: 1.25, letterSpacing: "-0.5px", marginBottom: 26 }}>
            성분을 알면<br />
            <span style={{ opacity: 0.4 }}>선택이 달라진다.</span>
          </h1>

          {/* 주 액션 = 사진 분석. 바코드가 아니다.
              바코드로 찾는 건 다른 앱도 한다. 바코드 없는 제품을 분석하는 게
              이 앱의 주장이고, 화면에서 가장 큰 면적을 그것이 가져야 한다.
              ?open=1 로 들어가면 촬영 시트가 바로 열려 홈에서 두 번에 촬영까지 간다. */}
          <Link href="/scan/photo?open=1" style={{ textDecoration: "none", display: "block" }}>
            <div style={{
              background: CANVAS,
              borderRadius: R_PANEL,
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}>
              <svg width="26" height="26" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
                <path d="M2 6.5A1.5 1.5 0 013.5 5h2L7 3h6l1.5 2h2A1.5 1.5 0 0118 6.5v9A1.5 1.5 0 0116.5 17h-13A1.5 1.5 0 012 15.5v-9z" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
                <circle cx="10" cy="11" r="3.2" stroke={INK} strokeWidth="1.2" />
              </svg>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 16, fontWeight: 600, color: INK, letterSpacing: "-0.2px" }}>
                  성분표 찍어서 분석
                </span>
                <span style={{ display: "block", fontSize: 12, fontWeight: 300, color: "#5A5A56", marginTop: 3, lineHeight: 1.45 }}>
                  바코드가 없는 신제품·해외 직구도 됩니다
                </span>
              </span>
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
                <path d="M2 7H12M12 7L7 2M12 7L7 12" stroke={INK} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </Link>

          {/* 보조 액션.
              처음엔 테두리만 0.22 알파로 뒀는데 검정 위 0.5px 로는 사실상
              안 보였다. 면(0.08)을 깔고 테두리를 1px·0.4 로 올려 "누를 수
              있는 것"으로 읽히게 한다. 위계는 여전히 유지된다 — 위는 크림으로
              꽉 채운 면, 이건 살짝 뜬 면이다. */}
          <Link href="/scan" style={{ textDecoration: "none", display: "block" }}>
            <div style={{
              marginTop: 10,
              background: "rgba(245,242,236,0.08)",
              border: "1px solid rgba(245,242,236,0.4)",
              borderRadius: R_TILE,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <svg width="16" height="16" viewBox="0 0 72 72" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
                <rect x="33" y="8" width="6" height="20" rx="1" fill={CANVAS} />
                <rect x="33" y="44" width="6" height="20" rx="1" fill={CANVAS} />
                <rect x="8" y="33" width="20" height="6" rx="1" fill={CANVAS} />
                <rect x="44" y="33" width="20" height="6" rx="1" fill={CANVAS} />
              </svg>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: CANVAS }}>
                바코드로 찾기
              </span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
                <path d="M2 7H12M12 7L7 2M12 7L7 12" stroke={CANVAS} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </Link>
        </div>
      </section>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px" }}>

        {/* ── 내 기준 ────────────────────────────────────────────────────
            같은 제품도 결과가 달라지는 이유를 홈에서 먼저 보여준다.
            발표 슬라이드 5 의 "개인 맞춤이 결과에 반영되는 장면" 도입부다. */}
        <section style={{ padding: "26px 0 0" }}>
          {myTerms.length > 0 ? (
            <>
              <SectionTitle
                action={
                  <Link href="/onboarding" style={{ fontFamily: MONO, fontSize: 9, color: MUTED, textDecoration: "none", letterSpacing: "0.5px" }}>
                    수정
                  </Link>
                }
              >
                내 기준
              </SectionTitle>
              <div style={{
                background: CARD,
                border: `0.5px solid ${HAIRLINE}`,
                borderRadius: R_PANEL,
                padding: "15px 16px",
              }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 11 }}>
                  {myTerms.slice(0, 8).map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: 12,
                        fontWeight: 400,
                        color: INK,
                        background: CANVAS,
                        border: `0.5px solid ${HAIRLINE}`,
                        borderRadius: 999,
                        padding: "5px 11px",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                  {myTerms.length > 8 && (
                    <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED, alignSelf: "center" }}>
                      +{myTerms.length - 8}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, fontWeight: 300, color: "#5A5A56", lineHeight: 1.55 }}>
                  이 조건으로 모든 제품을 다시 판정합니다. 같은 제품이라도
                  회원님 점수는 남과 다릅니다.
                </p>
              </div>
            </>
          ) : (
            <Link href="/onboarding" style={{ textDecoration: "none", display: "block" }}>
              <div style={{
                background: CARD,
                border: `0.5px solid ${HAIRLINE}`,
                borderRadius: R_PANEL,
                padding: "16px",
              }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: INK, marginBottom: 5, letterSpacing: "-0.2px" }}>
                  같은 제품, 다른 결과 →
                </p>
                <p style={{ fontSize: 12, fontWeight: 300, color: "#5A5A56", lineHeight: 1.6 }}>
                  알레르기·복용 중인 약·건강 목표를 12문항으로 확인하면
                  모든 판정이 회원님 기준으로 다시 계산됩니다. 1분이면 됩니다.
                </p>
              </div>
            </Link>
          )}
        </section>

        {/* ── 최근에 본 제품 ─────────────────────────────────────────────
            점수를 크게 세운다. 성분 점수 앱인데 홈에 숫자가 없으면
            무엇을 하는 앱인지 화면이 말해주지 않는다. */}
        <section style={{ padding: "26px 0 0" }}>
          <SectionTitle>최근에 본 제품</SectionTitle>
          <div className="stagger" style={{ display: "flex", flexDirection: "column" }}>
            {recentItems.map((item, i) => (
              <button
                key={item.barcode}
                type="button"
                onClick={() => router.push(reportHref(item.barcode))}
                style={{
                  ["--i" as string]: i,
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "13px 2px",
                  background: "none",
                  border: "none",
                  borderBottom: i < recentItems.length - 1 ? `0.5px solid ${HAIRLINE}` : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  minHeight: 0,
                }}
              >
                <span style={{
                  fontFamily: MONO,
                  fontSize: 22,
                  fontWeight: 500,
                  color: item.color,
                  letterSpacing: "-0.5px",
                  minWidth: 34,
                  flexShrink: 0,
                }}>
                  {item.score}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 400,
                    color: INK,
                    letterSpacing: "-0.2px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {item.name}
                  </span>
                  <span style={{ display: "block", fontFamily: MONO, fontSize: 10, color: MUTED, marginTop: 2 }}>
                    {item.sub}
                  </span>
                </span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
                  <path d="M2 5H8M8 5L5 2M8 5L5 8" stroke={MUTED} strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
            ))}
          </div>
        </section>

        {/* ── 카테고리 평균 ──────────────────────────────────────────────
            이모지를 뺀 자리에 그 카테고리 제품들의 평균 점수를 넣는다.
            "가공식품 55" 는 이모지 🥗 가 못 하는 말을 한다. */}
        <section style={{ padding: "30px 0 0" }}>
          <SectionTitle
            action={
              <Link href="/categories" style={{ fontFamily: MONO, fontSize: 9, color: MUTED, textDecoration: "none", letterSpacing: "0.5px" }}>
                전체
              </Link>
            }
          >
            카테고리 평균
          </SectionTitle>
          <div className="stagger" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {categoryAverages.map((cat, i) => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="tile"
                style={{ ["--i" as string]: i, textDecoration: "none" }}
              >
                <div style={{
                  background: CARD,
                  border: `0.5px solid ${HAIRLINE}`,
                  borderRadius: R_TILE,
                  padding: "13px 14px",
                }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 9 }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 400,
                      color: INK,
                      letterSpacing: "-0.2px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {cat.nameKo}
                    </span>
                    <span style={{
                      fontFamily: MONO,
                      fontSize: 17,
                      fontWeight: 500,
                      color: cat.avg === null ? MUTED : getScoreBadgeColor(cat.avg),
                      letterSpacing: "-0.5px",
                      flexShrink: 0,
                    }}>
                      {cat.avg ?? "—"}
                    </span>
                  </div>
                  {/* 점수를 막대로도 보여준다. 숫자만 있으면 카테고리끼리
                      비교가 안 되는데, 비교가 이 앱이 파는 것이다. */}
                  <div style={{ height: 3, background: HAIRLINE, borderRadius: 999, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${cat.avg ?? 0}%`,
                      background: cat.avg === null ? MUTED : getScoreBadgeColor(cat.avg),
                      borderRadius: 999,
                    }} />
                  </div>
                  <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginTop: 7 }}>
                    제품 {cat.count}개
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 커뮤니티 인기글 ───────────────────────────────────────────── */}
        <section style={{ padding: "30px 0 0" }}>
          <SectionTitle
            action={
              <Link href="/community" style={{ fontFamily: MONO, fontSize: 9, color: MUTED, textDecoration: "none", letterSpacing: "0.5px" }}>
                전체
              </Link>
            }
          >
            지금 많이 읽는 글
          </SectionTitle>
          <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {popularPosts.map((post, i) => (
              <button
                key={post.id}
                type="button"
                onClick={() => router.push(`/community/${post.id}`)}
                style={{
                  ["--i" as string]: i,
                  width: "100%",
                  background: CARD,
                  border: `0.5px solid ${HAIRLINE}`,
                  borderRadius: R_TILE,
                  padding: "13px 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  textAlign: "left",
                  minHeight: 0,
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 400,
                    color: INK,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginBottom: 5,
                  }}>
                    {post.title}
                  </span>
                  <span style={{ display: "flex", gap: 10, fontFamily: MONO, fontSize: 9, color: MUTED }}>
                    <span>공감 {post.likes_count}</span>
                    <span>댓글 {post.comments_count}</span>
                  </span>
                </span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
                  <path d="M2 5H8M8 5L5 2M8 5L5 8" stroke={MUTED} strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
            ))}
          </div>
        </section>

        {/* ── 오늘의 팩트체크 ────────────────────────────────────────────
            첫 카드만 검정으로 세워 "오늘 하나는 이걸 보라"를 만든다.
            나머지를 같은 크기로 늘어놓으면 세 개 다 안 읽힌다. */}
        <section style={{ padding: "30px 0 0" }}>
          <SectionTitle>오늘의 팩트체크</SectionTitle>
          <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {facts.map((fact, i) => (
              <button
                key={`${fact.title}-${i}`}
                type="button"
                onClick={() => router.push(`/search?q=${encodeURIComponent(fact.query)}`)}
                style={{
                  ["--i" as string]: i,
                  width: "100%",
                  background: i === 0 ? INK : CARD,
                  border: `0.5px solid ${i === 0 ? "#2A2A2A" : HAIRLINE}`,
                  borderRadius: i === 0 ? R_PANEL : R_TILE,
                  padding: i === 0 ? "16px 16px 15px" : "14px 16px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "block",
                  minHeight: 0,
                }}
              >
                <span style={{
                  display: "block",
                  fontFamily: MONO,
                  fontSize: 9,
                  color: i === 0 ? "rgba(245,242,236,0.35)" : MUTED,
                  letterSpacing: "1px",
                  marginBottom: 7,
                }}>
                  {fact.category}
                </span>
                <span style={{
                  display: "block",
                  fontSize: i === 0 ? 15 : 13,
                  fontWeight: i === 0 ? 400 : 300,
                  color: i === 0 ? CANVAS : INK,
                  lineHeight: 1.45,
                  letterSpacing: "-0.2px",
                  marginBottom: 9,
                }}>
                  {fact.title}
                </span>
                <span style={{
                  display: "inline-block",
                  fontSize: 10,
                  fontWeight: 500,
                  padding: "4px 11px",
                  borderRadius: 999,
                  background: i === 0 ? "rgba(245,242,236,0.1)" : CANVAS,
                  color: i === 0 ? CANVAS : fact.verdictColor,
                  border: `0.5px solid ${i === 0 ? "rgba(245,242,236,0.2)" : HAIRLINE}`,
                  letterSpacing: "0.2px",
                }}>
                  {fact.verdict}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* 브랜드 서명 */}
        <div style={{ padding: "34px 0 8px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, height: "0.5px", background: HAIRLINE }} />
            <svg width="18" height="18" viewBox="0 0 72 72" fill="none" aria-hidden="true">
              <rect x="33" y="8" width="6" height="20" rx="1" fill={HAIRLINE} />
              <rect x="33" y="44" width="6" height="20" rx="1" fill={HAIRLINE} />
              <rect x="8" y="33" width="20" height="6" rx="1" fill={HAIRLINE} />
              <rect x="44" y="33" width="20" height="6" rx="1" fill={HAIRLINE} />
            </svg>
            <div style={{ flex: 1, height: "0.5px", background: HAIRLINE }} />
          </div>
          <p style={{ fontFamily: MONO, fontSize: 8, color: MUTED, letterSpacing: "2px", lineHeight: 2 }}>
            KNOW WHAT YOU WERE NEVER TOLD
          </p>
        </div>

      </div>

      {/* AI 챗봇 — 페이지 이동이 아니라 모달로 연다.
          홈이 뒤에 비쳐야 "앱을 떠나지 않았다"는 감각이 유지된다.
          히어로에 있던 검색바를 걷어내면서 질의 창구는 이것 하나가 됐다. */}
      <button
        type="button"
        onClick={() => setChatOpen(true)}
        aria-label="AI 에게 물어보기"
        style={{
          position: "fixed",
          right: 20,
          bottom: 80,
          zIndex: 90,
          width: 54,
          height: 54,
          minHeight: 0,
          minWidth: 0,
          padding: 0,
          borderRadius: "50%",
          background: INK,
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          touchAction: "manipulation",
          boxShadow: "0 4px 16px rgba(10,10,10,0.22)",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 5.5A1.5 1.5 0 015.5 4h13A1.5 1.5 0 0120 5.5v9a1.5 1.5 0 01-1.5 1.5H9l-4 3.5V16H5.5A1.5 1.5 0 014 14.5v-9z"
            stroke={CANVAS}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <circle cx="8.7" cy="10" r="1" fill={CANVAS} />
          <circle cx="12" cy="10" r="1" fill={CANVAS} />
          <circle cx="15.3" cy="10" r="1" fill={CANVAS} />
        </svg>
      </button>

      {chatOpen && <ChatModal onClose={() => setChatOpen(false)} />}
    </main>
  );
}
