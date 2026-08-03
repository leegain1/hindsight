"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

interface Study {
  title: string;
  authors: string;
  year: number;
  journal: string;
  conclusion: string;
  doi: string | null;
  pubmedId: string | null;
}

interface Regulations {
  korea: string;
  eu: string;
  fda: string;
  whoIarc: string | null;
}

interface IngredientData {
  name: string;
  nameEn: string;
  eNumber: string | null;
  riskScore: number;
  description: string;
  positiveEffects: string[];
  negativeEffects: string[];
  studies: Study[];
  regulations: Regulations;
  commonProducts: string[];
  adis: string | null;
}

function getRiskColor(score: number) {
  if (score <= 3) return "#2A8A5C";
  if (score <= 5) return "#C4780A";
  if (score <= 7) return "#C05000";
  return "#C44B4B";
}

function getRiskLabel(score: number) {
  if (score <= 2) return "매우 안전";
  if (score <= 3) return "안전";
  if (score <= 5) return "주의 필요";
  if (score <= 7) return "주의";
  if (score <= 9) return "위험";
  return "매우 위험";
}

function RiskGauge({ score }: { score: number }) {
  const color = getRiskColor(score);
  const pct = ((score - 1) / 9) * 100;

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1px" }}>
          RISK SCORE
        </span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color }}>
          {score}/10 · {getRiskLabel(score)}
        </span>
      </div>
      <div style={{ height: 6, background: "#EDEAE3", borderRadius: 3, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg, #2A8A5C 0%, #C4780A 40%, #C05000 70%, #C44B4B 100%)`,
            borderRadius: 3,
            transition: "width 1s ease",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880" }}>1 안전</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880" }}>10 위험</span>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: "'DM Mono', monospace",
      fontSize: 9,
      color: "#8A8880",
      letterSpacing: "2px",
      marginBottom: 12,
    }}>
      {children}
    </p>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#EDEAE3",
      border: "0.5px solid #D8D4CC",
      borderRadius: 12,
      padding: "16px",
      ...style,
    }}>
      {children}
    </div>
  );
}

export default function IngredientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const ingredientName = decodeURIComponent(id);

  const [data, setData] = useState<IngredientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeSection, setActiveSection] = useState<"overview" | "science" | "regulation">("overview");

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/ingredient/${encodeURIComponent(ingredientName)}`)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [ingredientName]);

  const riskColor = data ? getRiskColor(data.riskScore) : "#8A8880";

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#F5F2EC",
        fontFamily: "'Space Grotesk', -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        paddingBottom: 64,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Header */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "calc(20px + env(safe-area-inset-top)) 24px 20px",
        borderBottom: "0.5px solid #D8D4CC",
        flexShrink: 0,
      }}>
        <button
          onClick={() => router.back()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 2L4 8L10 14" stroke="#0A0A0A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#8A8880", letterSpacing: "1px" }}>
            BACK
          </span>
        </button>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1.5px" }}>
          INGREDIENT
        </span>
      </header>

      {/* Loading */}
      {loading && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <div style={{
            width: 24,
            height: 24,
            border: "2px solid #D8D4CC",
            borderTopColor: "#0A0A0A",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#8A8880", letterSpacing: "1.5px" }}>
            ANALYZING...
          </p>
          <p style={{ fontSize: 12, fontWeight: 300, color: "#8A8880" }}>{ingredientName}</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "32px 24px" }}>
          <p style={{ fontSize: 14, fontWeight: 300, color: "#C44B4B", textAlign: "center" }}>
            성분 정보를 불러올 수 없습니다.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "12px 24px", background: "#0A0A0A", color: "#F5F2EC", border: "none", borderRadius: 10, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer" }}
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Content */}
      {data && !loading && (
        <div style={{ animation: "fadeIn 0.4s ease" }}>
          {/* Hero */}
          <div style={{ background: "#0A0A0A", padding: "28px 24px 24px" }}>
            <div style={{ maxWidth: 480, margin: "0 auto" }}>
              {(data.eNumber || data.nameEn) && (
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#4A4A48", letterSpacing: "1.5px", marginBottom: 6 }}>
                  {[data.eNumber, data.nameEn].filter(Boolean).join(" · ")}
                </p>
              )}
              <h1 style={{ fontSize: 26, fontWeight: 400, color: "#F5F2EC", letterSpacing: "-0.3px", marginBottom: 20 }}>
                {data.name}
              </h1>
              <RiskGauge score={data.riskScore} />
            </div>
          </div>

          {/* Tab bar */}
          <div style={{
            display: "flex",
            borderBottom: "0.5px solid #D8D4CC",
            background: "#F5F2EC",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}>
            {(["overview", "science", "regulation"] as const).map((tab) => {
              const labels = { overview: "OVERVIEW", science: "SCIENCE", regulation: "REGULATION" };
              const active = activeSection === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveSection(tab)}
                  style={{
                    flex: 1,
                    padding: "12px 0",
                    background: "none",
                    border: "none",
                    borderBottom: active ? `1.5px solid #0A0A0A` : "1.5px solid transparent",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 8,
                    color: active ? "#0A0A0A" : "#8A8880",
                    letterSpacing: "1.5px",
                    cursor: "pointer",
                  }}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          <div style={{ padding: "24px 24px 0", maxWidth: 480, margin: "0 auto" }}>

            {/* OVERVIEW TAB */}
            {activeSection === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Description */}
                <div>
                  <SectionLabel>WHAT IS IT?</SectionLabel>
                  <Card>
                    <p style={{ fontSize: 14, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.6 }}>
                      {data.description}
                    </p>
                    {data.adis && (
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1px", marginTop: 12, paddingTop: 12, borderTop: "0.5px solid #D8D4CC" }}>
                        ADI: {data.adis}
                      </p>
                    )}
                  </Card>
                </div>

                {/* Effects */}
                <div>
                  <SectionLabel>HEALTH EFFECTS</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {data.positiveEffects.length > 0 && (
                      <Card>
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2A8A5C", letterSpacing: "1.5px", marginBottom: 10 }}>POSITIVE</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {data.positiveEffects.map((e, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                              <span style={{ color: "#2A8A5C", fontSize: 14, lineHeight: "20px", flexShrink: 0 }}>+</span>
                              <p style={{ fontSize: 13, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.5 }}>{e}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                    {data.negativeEffects.length > 0 && (
                      <Card>
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#C44B4B", letterSpacing: "1.5px", marginBottom: 10 }}>NEGATIVE</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {data.negativeEffects.map((e, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                              <span style={{ color: "#C44B4B", fontSize: 14, lineHeight: "20px", flexShrink: 0 }}>−</span>
                              <p style={{ fontSize: 13, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.5 }}>{e}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>
                </div>

                {/* Common products */}
                {data.commonProducts.length > 0 && (
                  <div>
                    <SectionLabel>FOUND IN</SectionLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {data.commonProducts.map((p, i) => (
                        <span
                          key={i}
                          style={{
                            padding: "5px 12px",
                            background: "#EDEAE3",
                            border: "0.5px solid #D8D4CC",
                            borderRadius: 20,
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 9,
                            color: "#0A0A0A",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SCIENCE TAB */}
            {activeSection === "science" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {data.studies.length === 0 ? (
                  <Card>
                    <p style={{ fontSize: 13, fontWeight: 300, color: "#8A8880", lineHeight: 1.5 }}>
                      이 성분에 대한 인용 가능한 구체적 연구를 찾을 수 없습니다.
                      최신 정보는 PubMed 또는 Google Scholar에서 직접 검색해 보세요.
                    </p>
                  </Card>
                ) : (
                  data.studies.map((s, i) => (
                    <Card key={i}>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "1px", marginBottom: 8 }}>
                        {s.year} · {s.journal}
                      </p>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "#0A0A0A", lineHeight: 1.4, marginBottom: 6 }}>
                        {s.title}
                      </p>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", marginBottom: 10 }}>
                        {s.authors}
                      </p>
                      <p style={{ fontSize: 12, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.55, marginBottom: 12 }}>
                        {s.conclusion}
                      </p>
                      {(s.doi || s.pubmedId) && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {s.doi && (
                            <a
                              href={`https://doi.org/${s.doi}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "4px 10px",
                                background: "#F5F2EC",
                                border: "0.5px solid #D8D4CC",
                                borderRadius: 6,
                                fontFamily: "'DM Mono', monospace",
                                fontSize: 8,
                                color: "#0A0A0A",
                                textDecoration: "none",
                                letterSpacing: "0.5px",
                              }}
                            >
                              DOI →
                            </a>
                          )}
                          {s.pubmedId && (
                            <a
                              href={`https://pubmed.ncbi.nlm.nih.gov/${s.pubmedId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "4px 10px",
                                background: "#F5F2EC",
                                border: "0.5px solid #D8D4CC",
                                borderRadius: 6,
                                fontFamily: "'DM Mono', monospace",
                                fontSize: 8,
                                color: "#0A0A0A",
                                textDecoration: "none",
                                letterSpacing: "0.5px",
                              }}
                            >
                              PubMed →
                            </a>
                          )}
                        </div>
                      )}
                    </Card>
                  ))
                )}
                <p style={{ fontSize: 10, fontWeight: 300, color: "#8A8880", lineHeight: 1.5, textAlign: "center", paddingBottom: 8 }}>
                  논문 정보는 AI 생성 데이터입니다. 인용 전 원문을 반드시 확인하세요.
                </p>
              </div>
            )}

            {/* REGULATION TAB */}
            {activeSection === "regulation" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { region: "🇰🇷 한국 (MFDS)", text: data.regulations.korea, color: riskColor },
                  { region: "🇪🇺 EU (EFSA)", text: data.regulations.eu, color: riskColor },
                  { region: "🇺🇸 미국 (FDA)", text: data.regulations.fda, color: riskColor },
                  ...(data.regulations.whoIarc
                    ? [{ region: "🌐 WHO/IARC", text: data.regulations.whoIarc, color: riskColor }]
                    : []),
                ].map((r, i) => (
                  <Card key={i}>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1px", marginBottom: 8 }}>
                      {r.region}
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.55 }}>
                      {r.text}
                    </p>
                  </Card>
                ))}
                <p style={{ fontSize: 10, fontWeight: 300, color: "#8A8880", lineHeight: 1.5, textAlign: "center", paddingBottom: 8 }}>
                  규제 현황은 변경될 수 있습니다. 최신 정보는 각 기관 공식 사이트에서 확인하세요.
                </p>
              </div>
            )}

          </div>
        </div>
      )}
    </main>
  );
}
