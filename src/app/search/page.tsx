"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";

interface FactCheckResult {
  verdict: string;
  verdictColor: string;
  summary: string;
  body: string;
  evidenceCount: number;
  latestStudy: number;
  alternatives: string[];
  severity: number;
  category: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // inputValue: what the user is currently typing
  // activeQuery: what was last submitted (drives the API call)
  const initialQ = searchParams.get("q") ?? "";
  const [inputValue, setInputValue] = useState(initialQ);
  const [activeQuery, setActiveQuery] = useState(initialQ);
  const [result, setResult] = useState<FactCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync URL → state when navigating from home search bar
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setInputValue(q);
    setActiveQuery(q);
  }, [searchParams]);

  // Fire API whenever activeQuery changes (and is non-empty)
  useEffect(() => {
    if (!activeQuery.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    fetch("/api/factcheck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: activeQuery }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
        return res.json() as Promise<FactCheckResult>;
      })
      .then((data) => setResult(data))
      .catch((err: Error) => {
        if (err.name === "AbortError") {
          setError("응답 시간이 초과되었어요. 다시 시도해주세요.");
        } else {
          setError("분석 중 오류가 발생했어요.");
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [activeQuery]);

  const handleSearch = () => {
    const q = inputValue.trim();
    if (!q) return;
    // Update URL so sharing/back works
    router.replace(`/search?q=${encodeURIComponent(q)}`);
    setActiveQuery(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <main style={{
      minHeight: "100dvh",
      background: "#F5F2EC",
      fontFamily: "'Space Grotesk', -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: rgba(10,10,10,0.3); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "calc(20px + env(safe-area-inset-top)) 24px 20px",
        borderBottom: "0.5px solid #D8D4CC",
        position: "sticky",
        top: 0,
        background: "#F5F2EC",
        zIndex: 20,
      }}>
        <div
          onClick={() => router.push("/")}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        >
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
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1.5px" }}>FACT CHECK</span>
      </header>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px 80px" }}>

        {/* Search bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#EDEAE3",
          border: "0.5px solid #D8D4CC",
          borderRadius: 12,
          padding: "13px 16px",
          marginBottom: 24,
        }}>
          {/* Magnifier icon */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="6" cy="6" r="4.5" stroke="#8A8880" strokeWidth="1.2" />
            <path d="M9.5 9.5L12.5 12.5" stroke="#8A8880" strokeWidth="1.2" strokeLinecap="round" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="건강 관련 궁금한 것을 검색하세요"
            autoFocus
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 14,
              fontWeight: 300,
              color: "#0A0A0A",
              fontFamily: "'Space Grotesk', sans-serif",
              minWidth: 0,
            }}
          />

          {/* Clear button */}
          {inputValue && !loading && (
            <button
              onClick={() => {
                setInputValue("");
                setResult(null);
                setError(null);
                setActiveQuery("");
                inputRef.current?.focus();
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 2,
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2L10 10M10 2L2 10" stroke="#8A8880" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>
          )}

          {/* Search button */}
          <button
            onClick={handleSearch}
            disabled={loading || !inputValue.trim()}
            style={{
              padding: "7px 14px",
              background: inputValue.trim() ? "#0A0A0A" : "#D8D4CC",
              border: "none",
              borderRadius: 8,
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              letterSpacing: "1.5px",
              color: inputValue.trim() ? "#F5F2EC" : "#8A8880",
              cursor: inputValue.trim() && !loading ? "pointer" : "default",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s",
            }}
          >
            {loading && (
              <div style={{
                width: 10,
                height: 10,
                border: "1.5px solid rgba(245,242,236,0.4)",
                borderTopColor: "#F5F2EC",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
            )}
            {loading ? "..." : "검색"}
          </button>
        </div>

        {/* Current query label */}
        {activeQuery && (
          <div style={{ marginBottom: 20 }}>
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 8,
              color: "#8A8880",
              letterSpacing: "1.5px",
              marginBottom: 4,
            }}>
              QUERY
            </p>
            <p style={{ fontSize: 15, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.45 }}>
              {activeQuery}
            </p>
          </div>
        )}

        {/* Empty state */}
        {!activeQuery && !loading && (
          <div style={{ paddingTop: 32, textAlign: "center" }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px", marginBottom: 12 }}>
              FACT CHECK
            </p>
            <p style={{ fontSize: 14, fontWeight: 300, color: "#8A8880", lineHeight: 1.6 }}>
              건강 주장, 성분, 제품에 대해<br />AI가 과학적으로 검토해드려요.
            </p>
            {/* Example queries */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 28, alignItems: "flex-start" }}>
              {[
                "아질산나트륨이 암을 유발한다?",
                "에어팟 전자파가 뇌에 해롭나요?",
                "수돗물의 염소가 장기적으로 해롭다",
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => {
                    setInputValue(ex);
                    setActiveQuery(ex);
                    router.replace(`/search?q=${encodeURIComponent(ex)}`);
                  }}
                  style={{
                    background: "#EDEAE3",
                    border: "0.5px solid #D8D4CC",
                    borderRadius: 20,
                    padding: "8px 14px",
                    fontSize: 12,
                    fontWeight: 300,
                    color: "#0A0A0A",
                    cursor: "pointer",
                    fontFamily: "'Space Grotesk', sans-serif",
                    textAlign: "left",
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{
            background: "#EDEAE3",
            border: "0.5px solid #D8D4CC",
            borderRadius: 14,
            padding: "36px",
            textAlign: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 16, height: 16, border: "1.5px solid #D8D4CC", borderTopColor: "#0A0A0A", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#8A8880", letterSpacing: "2px" }}>ANALYZING...</p>
            </div>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#D8D4CC", letterSpacing: "1px" }}>
              최대 30초 소요됩니다
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{
            background: "#EDEAE3",
            border: "0.5px solid rgba(196,75,75,0.25)",
            borderRadius: 14,
            padding: "20px 24px",
          }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#C44B4B", letterSpacing: "1.5px", marginBottom: 8 }}>ERROR</p>
            <p style={{ fontSize: 13, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.6, marginBottom: 16 }}>
              {error}
            </p>
            <button
              onClick={handleSearch}
              style={{
                background: "#0A0A0A",
                border: "none",
                borderRadius: 8,
                padding: "9px 18px",
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                color: "#F5F2EC",
                cursor: "pointer",
                letterSpacing: "1px",
              }}
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Verdict card */}
            <div style={{
              background: "#0A0A0A",
              borderRadius: 14,
              padding: "20px",
            }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "rgba(245,242,236,0.3)", letterSpacing: "2px", marginBottom: 10 }}>
                VERDICT
              </div>
              <div style={{
                display: "inline-block",
                fontSize: 13,
                fontWeight: 500,
                padding: "5px 14px",
                borderRadius: 20,
                background: "rgba(245,242,236,0.08)",
                color: result.verdictColor === "#1A1A1A" ? "#F5F2EC" : result.verdictColor,
                border: "0.5px solid rgba(245,242,236,0.15)",
                marginBottom: 14,
                letterSpacing: "0.3px",
              }}>
                {result.verdict}
              </div>
              <p style={{ fontSize: 14, fontWeight: 300, color: "#F5F2EC", lineHeight: 1.65 }}>{result.body}</p>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: "STUDIES", value: result.evidenceCount },
                { label: "LATEST", value: result.latestStudy },
                { label: "SEVERITY", value: `${result.severity}/5` },
              ].map((item) => (
                <div key={item.label} style={{
                  background: "#EDEAE3",
                  border: "0.5px solid #D8D4CC",
                  borderRadius: 10,
                  padding: "12px",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 18, color: "#0A0A0A", marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>
                    {item.value}
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", letterSpacing: "1px" }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Alternatives */}
            {result.alternatives && result.alternatives.length > 0 && (
              <div style={{
                background: "#EDEAE3",
                border: "0.5px solid #D8D4CC",
                borderRadius: 14,
                padding: "18px 20px",
              }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "2px", marginBottom: 12 }}>
                  ALTERNATIVES
                </div>
                {result.alternatives.map((alt, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < result.alternatives.length - 1 ? 10 : 0, alignItems: "flex-start" }}>
                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#F5F2EC",
                      border: "0.5px solid #D8D4CC",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 8,
                      color: "#8A8880",
                    }}>
                      {i + 1}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.55 }}>{alt}</span>
                  </div>
                ))}
              </div>
            )}

            {/* New search CTA */}
            <button
              onClick={() => {
                setInputValue("");
                setResult(null);
                setError(null);
                setActiveQuery("");
                router.replace("/search");
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              style={{
                width: "100%",
                padding: "14px",
                background: "#EDEAE3",
                border: "0.5px solid #D8D4CC",
                borderRadius: 12,
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                letterSpacing: "1.5px",
                color: "#0A0A0A",
                cursor: "pointer",
                marginTop: 4,
              }}
            >
              새 검색
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
