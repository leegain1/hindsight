"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/categories";
import { getCategoryTop1s, getScoreBadgeColor } from "@/lib/productData";

const FALLBACK_FACTS = [
  { category: "가공식품", title: "아질산나트륨이 암을 유발한다?", verdict: "부분사실", verdictColor: "#6B52D4", query: "아질산나트륨 발암 위험" },
  { category: "EMF", title: "5G가 면역 체계를 약화시킨다", verdict: "거짓", verdictColor: "#E23434", query: "5G 전자파 면역 건강" },
  { category: "수질", title: "수돗물의 염소가 장기적으로 해롭다", verdict: "과장됨", verdictColor: "#C05000", query: "수돗물 염소 건강 위험" },
];

interface Fact {
  category: string;
  title: string;
  verdict: string;
  verdictColor: string;
  query: string;
}

interface RecentScan {
  barcode: string;
  name: string;
  score: number;
  color: string;
  timestamp: number;
}

interface CommunityPost {
  id: string;
  title: string;
  likes_count: number;
  comments_count: number;
  category: string | null;
}

const FACTS_CACHE_KEY = "hindsight_today_facts";
const FACTS_CACHE_TTL = 86400 * 1000; // 24h

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [facts, setFacts] = useState<Fact[]>(FALLBACK_FACTS);
  const [factsLoading, setFactsLoading] = useState(true);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [popularPosts, setPopularPosts] = useState<CommunityPost[]>([]);

  // Load today's facts (with localStorage cache)
  useEffect(() => {
    try {
      const cached = localStorage.getItem(FACTS_CACHE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < FACTS_CACHE_TTL) {
          setFacts(data);
          setFactsLoading(false);
          return;
        }
      }
    } catch { /* ignore */ }

    fetch("/api/today-facts")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFacts(data);
          try {
            localStorage.setItem(FACTS_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
          } catch { /* ignore */ }
        }
        setFactsLoading(false);
      })
      .catch(() => setFactsLoading(false));
  }, []);

  // 첫 진입이면 시작 화면으로 — 브랜드 → 로그인 → 앱 소개 → 개인 맞춤 설문.
  // 한 번 거치면 localStorage 에 표시가 남아 다시 뜨지 않는다.
  // (다시 보려면 /welcome 으로 직접 들어가면 된다)
  useEffect(() => {
    try {
      if (!localStorage.getItem("hindsight_welcome_seen")) {
        router.replace("/welcome");
      }
    } catch {
      /* localStorage 차단 환경 — 그냥 홈을 보여준다 */
    }
  }, [router]);

  // Load recent scans from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("hindsight_recent_scans");
      if (raw) setRecentScans(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // Load popular community posts
  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase
        .from("community_posts")
        .select("id, title, likes_count, comments_count, category")
        .order("likes_count", { ascending: false })
        .limit(3);
      if (data) setPopularPosts(data as CommunityPost[]);
    })();
  }, [supabase]);

  const handleSearch = () => {
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <main style={{
      minHeight: "100dvh",
      background: "#F5F2EC",
      fontFamily: "'Space Grotesk', -apple-system, sans-serif",
      paddingBottom: 64,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: rgba(10,10,10,0.3); }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes shimmer {
          0%{background-position:-400px 0}
          100%{background-position:400px 0}
        }
        .shimmer {
          background: linear-gradient(90deg, #EDEAE3 25%, #E4E1DA 50%, #EDEAE3 75%);
          background-size: 400px 100%;
          animation: shimmer 1.4s ease-in-out infinite;
        }
        .fact-card:active { opacity: 0.85; }
        .cat-card:active { opacity: 0.85; }
      `}</style>

      {/* ── HERO ── */}
      <section style={{ background: "#0A0A0A", paddingBottom: 1 }}>
        {/* Header */}
        <header style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
          borderBottom: "0.5px solid #1E1E1E",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 72 72" fill="none">
              <rect x="33" y="8" width="6" height="20" rx="1" fill="#F5F2EC" />
              <rect x="33" y="44" width="6" height="20" rx="1" fill="#F5F2EC" />
              <rect x="8" y="33" width="20" height="6" rx="1" fill="#F5F2EC" />
              <rect x="44" y="33" width="20" height="6" rx="1" fill="#F5F2EC" />
            </svg>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 300, letterSpacing: "3px", color: "#F5F2EC" }}>
              HINDSIGHT<span style={{ opacity: 0.25 }}>+</span>
            </span>
          </div>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#4A4A48", letterSpacing: "1.5px" }}>BETA</span>
        </header>

        {/* Tagline + search */}
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "32px 24px 28px" }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#4A4A48", letterSpacing: "2px", marginBottom: 12 }}>
            KNOW WHAT YOU WERE NEVER TOLD
          </p>
          <h1 style={{ fontSize: 30, fontWeight: 300, color: "#F5F2EC", lineHeight: 1.25, letterSpacing: "-0.5px", marginBottom: 28 }}>
            성분을 알면<br />
            <span style={{ opacity: 0.4 }}>선택이 달라진다.</span>
          </h1>

          {/* Search bar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(245,242,236,0.06)",
            border: "0.5px solid rgba(245,242,236,0.12)",
            borderRadius: 12,
            padding: "13px 16px",
            marginBottom: 12,
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="5.5" cy="5.5" r="4" stroke="rgba(245,242,236,0.35)" strokeWidth="1.2" />
              <path d="M8.5 8.5L11.5 11.5" stroke="rgba(245,242,236,0.35)" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="에어팟이 뇌에 해롭나요?"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 14,
                fontWeight: 300,
                color: "#F5F2EC",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            />
            {query && (
              <button
                onClick={handleSearch}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#F5F2EC",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5H8M8 5L5.5 2.5M8 5L5.5 7.5" stroke="#0A0A0A" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Scan CTA */}
          <Link href="/scan" style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              background: "#F5F2EC",
              borderRadius: 12,
              padding: "14px 20px",
            }}>
              <svg width="16" height="16" viewBox="0 0 72 72" fill="none">
                <rect x="33" y="8" width="6" height="20" rx="1" fill="#0A0A0A" />
                <rect x="33" y="44" width="6" height="20" rx="1" fill="#0A0A0A" />
                <rect x="8" y="33" width="20" height="6" rx="1" fill="#0A0A0A" />
                <rect x="44" y="33" width="20" height="6" rx="1" fill="#0A0A0A" />
              </svg>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#0A0A0A", letterSpacing: "0.3px" }}>
                바코드 스캔해서 제품 분석
              </span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7H12M12 7L7 2M12 7L7 12" stroke="#0A0A0A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </Link>

          {/* 사진 분석 CTA — 바코드가 없는 제품용. Yuka 대비 핵심 차별점이라 홈에 둔다.
              ?open=1 로 들어가면 사진 화면이 뜨자마자 카메라/앨범 선택 시트가 열린다
              (홈에서 두 번만 눌러 촬영까지 도달). */}
          <Link href="/scan/photo?open=1" style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#F5F2EC",
              borderRadius: 12,
              padding: "14px 16px 14px 20px",
              marginTop: 10,
            }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                <path d="M2 6.5A1.5 1.5 0 013.5 5h2L7 3h6l1.5 2h2A1.5 1.5 0 0118 6.5v9A1.5 1.5 0 0116.5 17h-13A1.5 1.5 0 012 15.5v-9z" stroke="#0A0A0A" strokeWidth="1.2" strokeLinejoin="round" />
                <circle cx="10" cy="11" r="3.2" stroke="#0A0A0A" strokeWidth="1.2" />
              </svg>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#0A0A0A", letterSpacing: "0.3px" }}>
                바코드 없이 제품 분석
              </span>
              {/* 신규 기능 표시 — 두 CTA 가 둘 다 밝은 버튼이라 이걸로 구분한다 */}
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 8,
                letterSpacing: "1px",
                color: "#F5F2EC",
                background: "#0A0A0A",
                borderRadius: 4,
                padding: "3px 6px",
                flexShrink: 0,
              }}>
                NEW
              </span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                <path d="M2 7H12M12 7L7 2M12 7L7 12" stroke="#0A0A0A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </Link>
        </div>
      </section>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px" }}>

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <div style={{ padding: "28px 0 0" }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px", marginBottom: 12 }}>
              RECENT SCANS
            </p>
            <div className="scroll-x" style={{ display: "flex", gap: 8, paddingBottom: 4 }}>
              {recentScans.slice(0, 5).map((scan) => (
                <div
                  key={scan.barcode}
                  onClick={() => router.push(`/scan/result/${scan.barcode}`)}
                  style={{
                    flexShrink: 0,
                    width: 96,
                    background: "#EDEAE3",
                    border: "0.5px solid #D8D4CC",
                    borderRadius: 12,
                    padding: "12px 10px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: `2px solid ${scan.color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, color: scan.color }}>
                      {scan.score}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 10,
                    fontWeight: 400,
                    color: "#0A0A0A",
                    lineHeight: 1.3,
                    textAlign: "center",
                    wordBreak: "break-word",
                  }}>
                    {scan.name.slice(0, 16)}{scan.name.length > 16 ? "…" : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        <div style={{ padding: "28px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px" }}>
              CATEGORIES
            </p>
            <Link href="/categories" style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", textDecoration: "none", letterSpacing: "1px" }}>
              ALL →
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {CATEGORIES.slice(0, 6).map((cat) => (
              <Link key={cat.slug} href={`/categories/${cat.slug}`} style={{ textDecoration: "none" }}>
                <div
                  className="cat-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    background: "#EDEAE3",
                    border: "0.5px solid #D8D4CC",
                    borderRadius: 12,
                    padding: "14px 8px",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 20, fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', sans-serif" }}>{cat.emoji}</span>
                  <span style={{ fontSize: 10, fontWeight: 400, color: "#0A0A0A", textAlign: "center", lineHeight: 1.3 }}>
                    {cat.nameKo}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Weekly TOP Ranking */}
        {(() => {
          const topItems = getCategoryTop1s().slice(0, 6);
          return (
            <div style={{ padding: "28px 0 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px" }}>이번 주 TOP 랭킹</p>
                <Link href="/categories" style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", textDecoration: "none", letterSpacing: "1px" }}>ALL →</Link>
              </div>
              <div className="scroll-x" style={{ margin: "0 -20px", paddingLeft: 20 }}>
                <div style={{ display: "flex", gap: 8, paddingRight: 20 }}>
                  {topItems.map(({ category, product }) => {
                    const cat = CATEGORIES.find((c) => c.slug === category);
                    const scoreColor = getScoreBadgeColor(product.score);
                    return (
                      <div
                        key={category}
                        onClick={() => router.push(`/scan/result/${product.barcode}`)}
                        style={{ flexShrink: 0, width: 130, background: "#EDEAE3", border: "0.5px solid #D8D4CC", borderRadius: 14, padding: "14px 12px", cursor: "pointer" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                          <span style={{ fontSize: 22, fontFamily: "'Apple Color Emoji','Segoe UI Emoji',sans-serif" }}>{cat?.emoji ?? "📦"}</span>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: scoreColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, color: "#fff" }}>{product.score}</span>
                          </div>
                        </div>
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", letterSpacing: "1px", marginBottom: 5 }}>
                          {cat?.nameEn?.toUpperCase() ?? category.toUpperCase()}
                        </p>
                        <p style={{ fontSize: 11, fontWeight: 500, color: "#0A0A0A", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {product.name}
                        </p>
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {product.brand}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Community Popular Posts */}
        {popularPosts.length > 0 && (
          <div style={{ padding: "28px 0 0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px" }}>
                COMMUNITY
              </p>
              <Link href="/community" style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", textDecoration: "none", letterSpacing: "1px" }}>
                ALL →
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {popularPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => router.push(`/community/${post.id}`)}
                  style={{
                    background: "#EDEAE3",
                    border: "0.5px solid #D8D4CC",
                    borderRadius: 12,
                    padding: "12px 14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 400, color: "#0A0A0A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>
                      {post.title}
                    </p>
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880" }}>
                        ♥ {post.likes_count}
                      </span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880" }}>
                        💬 {post.comments_count}
                      </span>
                    </div>
                  </div>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5H8M8 5L5 2M8 5L5 8" stroke="#8A8880" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's Facts */}
        <div style={{ padding: "28px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px" }}>
              TODAY&apos;S FACTS
            </p>
            {factsLoading && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#D8D4CC", animation: "pulse 1.2s ease-in-out infinite" }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", letterSpacing: "1px" }}>LIVE</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {factsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="shimmer" style={{ height: 88, borderRadius: 12 }} />
                ))
              : facts.map((fact, i) => (
                  <div
                    key={i}
                    className="fact-card"
                    onClick={() => router.push(`/search?q=${encodeURIComponent(fact.query)}`)}
                    style={{
                      background: i === 0 ? "#0A0A0A" : "#EDEAE3",
                      border: `0.5px solid ${i === 0 ? "#2A2A2A" : "#D8D4CC"}`,
                      borderRadius: 12,
                      padding: "14px 16px",
                      cursor: "pointer",
                    }}
                  >
                    <p style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 8,
                      color: i === 0 ? "rgba(245,242,236,0.3)" : "#8A8880",
                      letterSpacing: "1.5px",
                      marginBottom: 6,
                    }}>
                      {fact.category.toUpperCase()}
                    </p>
                    <p style={{
                      fontSize: 13,
                      fontWeight: 300,
                      color: i === 0 ? "#F5F2EC" : "#0A0A0A",
                      lineHeight: 1.45,
                      marginBottom: 8,
                    }}>
                      {fact.title}
                    </p>
                    <span style={{
                      display: "inline-block",
                      fontSize: 9,
                      fontWeight: 500,
                      padding: "3px 10px",
                      borderRadius: 20,
                      background: i === 0 ? "rgba(245,242,236,0.08)" : "#F5F2EC",
                      color: i === 0 ? "rgba(245,242,236,0.65)" : fact.verdictColor,
                      border: i === 0 ? "0.5px solid rgba(245,242,236,0.15)" : "0.5px solid #D8D4CC",
                      letterSpacing: "0.3px",
                    }}>
                      {fact.verdict}
                    </span>
                  </div>
                ))}
          </div>
        </div>

        {/* Brand manifesto */}
        <div style={{ padding: "32px 0 8px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, height: "0.5px", background: "#D8D4CC" }} />
            <svg width="18" height="18" viewBox="0 0 72 72" fill="none">
              <rect x="33" y="8" width="6" height="20" rx="1" fill="#D8D4CC" />
              <rect x="33" y="44" width="6" height="20" rx="1" fill="#D8D4CC" />
              <rect x="8" y="33" width="20" height="6" rx="1" fill="#D8D4CC" />
              <rect x="44" y="33" width="20" height="6" rx="1" fill="#D8D4CC" />
            </svg>
            <div style={{ flex: 1, height: "0.5px", background: "#D8D4CC" }} />
          </div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "2px", lineHeight: 2 }}>
            KNOW WHAT YOU WERE NEVER TOLD
          </p>
        </div>

      </div>

      {/* AI 챗봇 — 탭바에서 내려온 검색(AI 질의)의 새 자리.
          탭바(64px) 바로 위 우측 하단에 떠 있는다. */}
      <Link
        href="/search"
        aria-label="AI 에게 물어보기"
        style={{
          position: "fixed",
          right: 20,
          bottom: 80,
          zIndex: 90,
          width: 54,
          height: 54,
          borderRadius: "50%",
          background: "#0A0A0A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textDecoration: "none",
          boxShadow: "0 4px 16px rgba(10,10,10,0.22)",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 5.5A1.5 1.5 0 015.5 4h13A1.5 1.5 0 0120 5.5v9a1.5 1.5 0 01-1.5 1.5H9l-4 3.5V16H5.5A1.5 1.5 0 014 14.5v-9z"
            stroke="#F5F2EC"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <circle cx="8.7" cy="10" r="1" fill="#F5F2EC" />
          <circle cx="12" cy="10" r="1" fill="#F5F2EC" />
          <circle cx="15.3" cy="10" r="1" fill="#F5F2EC" />
        </svg>
      </Link>
    </main>
  );
}
