"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

import { CATEGORIES as CAT_LIST } from "@/lib/categories";

const CATEGORIES = [
  ...CAT_LIST.map((c) => ({ value: c.slug, label: c.nameKo, color: c.color })),
  { value: "general", label: "일반", color: "#8A8880" },
];

export default function CommunityWritePage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("general");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [productBarcode, setProductBarcode] = useState("");
  const [productName, setProductName] = useState("");
  const [factCheck, setFactCheck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [factChecking, setFactChecking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      const res = await supabase.auth.getUser();
      if (!res.data.user) {
        router.replace("/auth/login?next=/community/write");
        return;
      }
      setUserId(res.data.user.id);
    })();
  }, [router, supabase]);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setError("제목과 내용을 입력해주세요.");
      return;
    }
    if (!userId) { router.replace("/auth/login?next=/community/write"); return; }

    setSubmitting(true);
    setError("");

    let factVerdict: string | null = null;
    let factColor: string | null = null;
    let factExplanation: string | null = null;

    if (factCheck) {
      setFactChecking(true);
      try {
        const res = await fetch("/api/fact-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        });
        const data = await res.json() as { verdict: string; verdictColor: string; explanation: string };
        factVerdict = data.verdict;
        factColor = data.verdictColor;
        factExplanation = data.explanation;
      } catch {
        /* ignore, post without fact check */
      }
      setFactChecking(false);
    }

    const { data: post, error: insertErr } = await supabase
      .from("community_posts")
      .insert({
        user_id: userId,
        title: title.trim(),
        content: content.trim(),
        category,
        fact_check_verdict: factVerdict,
        fact_check_color: factColor,
        fact_check_explanation: factExplanation,
        product_barcode: productBarcode.trim() || null,
        product_name: productName.trim() || null,
      })
      .select("id")
      .single();

    if (insertErr) {
      setError("저장 중 오류가 발생했어요. 다시 시도해주세요.");
      setSubmitting(false);
      return;
    }

    router.replace(`/community/${post.id}`);
  };

  const selectedCat = CATEGORIES.find((c) => c.value === category);

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
        textarea { resize: none; }
        input::placeholder, textarea::placeholder { color: rgba(10,10,10,0.3); }
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
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "#0A0A0A", padding: "0 8px", minHeight: 44 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="#0A0A0A" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "1px", color: "#8A8880" }}>BACK</span>
        </button>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px" }}>NEW POST</span>
        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !content.trim()}
          style={{
            padding: "8px 16px",
            background: title.trim() && content.trim() ? "#0A0A0A" : "#EDEAE3",
            color: title.trim() && content.trim() ? "#F5F2EC" : "#8A8880",
            border: "none",
            borderRadius: 8,
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            letterSpacing: "1px",
            cursor: title.trim() && content.trim() ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {submitting && (
            <div className="spin" style={{ width: 10, height: 10, border: "1.5px solid rgba(245,242,236,0.4)", borderTopColor: "#F5F2EC", borderRadius: "50%", }} />
          )}
          {factChecking ? "CHECKING..." : submitting ? "POSTING..." : "POST"}
        </button>
      </header>

      <div style={{ flex: 1, maxWidth: 480, width: "100%", margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Category picker */}
        <div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "1.5px", marginBottom: 10 }}>CATEGORY</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {CATEGORIES.map((cat) => {
              const active = category === cat.value;
              return (
                <button
                  className="state-swap"
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 20,
                    background: active ? cat.color : "#EDEAE3",
                    border: `0.5px solid ${active ? cat.color : "#D8D4CC"}`,
                    color: active ? "#fff" : "#0A0A0A",
                    fontSize: 11,
                    fontWeight: 400,
                    cursor: "pointer",
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div style={{ background: "#EDEAE3", border: "0.5px solid #D8D4CC", borderRadius: 12, padding: "14px 16px" }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", letterSpacing: "1.5px", marginBottom: 8 }}>TITLE</p>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="이 제품 성분이 정말 안전한가요?"
            maxLength={100}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 15,
              fontWeight: 400,
              color: "#0A0A0A",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          />
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#D8D4CC", textAlign: "right", marginTop: 6 }}>
            {title.length}/100
          </p>
        </div>

        {/* Content */}
        <div style={{ background: "#EDEAE3", border: "0.5px solid #D8D4CC", borderRadius: 12, padding: "14px 16px" }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", letterSpacing: "1.5px", marginBottom: 8 }}>CONTENT</p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="경험이나 질문을 자유롭게 공유해주세요..."
            rows={8}
            maxLength={2000}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 14,
              fontWeight: 300,
              color: "#0A0A0A",
              fontFamily: "'Space Grotesk', sans-serif",
              lineHeight: 1.6,
            }}
          />
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#D8D4CC", textAlign: "right", marginTop: 4 }}>
            {content.length}/2000
          </p>
        </div>

        {/* Product tag */}
        <div style={{ background: "#EDEAE3", border: "0.5px solid #D8D4CC", borderRadius: 12, padding: "14px 16px" }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", letterSpacing: "1.5px", marginBottom: 8 }}>PRODUCT TAG (선택)</p>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="제품명"
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 13,
              fontWeight: 300,
              color: "#0A0A0A",
              fontFamily: "'Space Grotesk', sans-serif",
              marginBottom: 8,
            }}
          />
          <div style={{ height: "0.5px", background: "#D8D4CC", marginBottom: 8 }} />
          <input
            type="text"
            value={productBarcode}
            onChange={(e) => setProductBarcode(e.target.value)}
            placeholder="바코드 번호 (선택)"
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 13,
              fontWeight: 300,
              color: "#0A0A0A",
              fontFamily: "'DM Mono', monospace",
            }}
          />
        </div>

        {/* Fact check toggle */}
        <div
          className="state-swap"
          style={{
            background: factCheck ? "#0A0A0A" : "#EDEAE3",
            border: `0.5px solid ${factCheck ? "#0A0A0A" : "#D8D4CC"}`,
            borderRadius: 12,
            padding: "14px 16px",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            cursor: "pointer",
          }}
          onClick={() => setFactCheck(!factCheck)}
        >
          <div style={{
            width: 40,
            height: 22,
            borderRadius: 11,
            background: factCheck ? "#F5F2EC" : "#D8D4CC",
            position: "relative",
            flexShrink: 0,
            marginTop: 2,
            transition: "background 0.2s",
          }}>
            <div style={{
              position: "absolute",
              top: 3,
              left: factCheck ? 21 : 3,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: factCheck ? "#0A0A0A" : "#fff",
              transition: "left 0.2s",
            }} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: factCheck ? "#F5F2EC" : "#0A0A0A", marginBottom: 3 }}>
              AI 팩트체크 요청
            </p>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: factCheck ? "rgba(245,242,236,0.5)" : "#8A8880", letterSpacing: "0.5px", lineHeight: 1.5 }}>
              Claude AI가 포스트의 건강 주장을 검토하고{"\n"}배지를 추가합니다.
            </p>
          </div>
        </div>

        {error && (
          <p style={{ fontSize: 12, color: "#C44B4B", fontWeight: 300 }}>{error}</p>
        )}

        {/* Bottom submit button (mobile convenience) */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim() || !content.trim()}
          style={{
            width: "100%",
            padding: "16px",
            background: title.trim() && content.trim() ? "#0A0A0A" : "#EDEAE3",
            color: title.trim() && content.trim() ? "#F5F2EC" : "#8A8880",
            border: "none",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "'Space Grotesk', sans-serif",
            cursor: title.trim() && content.trim() ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginTop: 8,
          }}
        >
          {submitting && (
            <div className="spin" style={{ width: 14, height: 14, border: "1.5px solid rgba(245,242,236,0.4)", borderTopColor: "#F5F2EC", borderRadius: "50%", }} />
          )}
          {factChecking ? "AI 검증 중..." : submitting ? "게시 중..." : "게시하기"}
        </button>

        {factCheck && (
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", textAlign: "center", letterSpacing: "0.5px" }}>
            팩트체크 요청 시 5-10초 더 소요됩니다
          </p>
        )}

        {selectedCat && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: selectedCat.color }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "0.5px" }}>
              {selectedCat.label} 카테고리에 게시됩니다
            </span>
          </div>
        )}
      </div>
    </main>
  );
}
