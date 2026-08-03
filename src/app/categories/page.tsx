import Link from "next/link";
import type { Metadata } from "next";
import { CATEGORIES } from "@/lib/categories";

export const metadata: Metadata = { title: "카테고리" };

export default function CategoriesPage() {
  return (
    <main style={{
      minHeight: "100dvh",
      background: "#F5F2EC",
      fontFamily: "'Space Grotesk', -apple-system, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif",
      paddingBottom: 64,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .cat-card:active { opacity: 0.8; }
      `}</style>

      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "calc(20px + env(safe-area-inset-top)) 24px 20px", borderBottom: "0.5px solid #D8D4CC" }}>
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
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1.5px" }}>CATEGORIES</span>
      </header>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px 0" }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px", marginBottom: 6 }}>
          BROWSE BY CATEGORY
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 300, color: "#0A0A0A", letterSpacing: "-0.3px", marginBottom: 24 }}>
          카테고리별<br />건강 정보 탐색
        </h2>

        {/* 2-column grid */}
        <div className="stagger" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {CATEGORIES.map((cat, i) => (
            <Link key={cat.slug} href={`/categories/${cat.slug}`} style={{ ["--i" as string]: i, textDecoration: "none" }}>
              <div
                className="cat-card"
                style={{
                  background: `${cat.color}0D`,
                  border: `0.5px solid ${cat.color}28`,
                  borderRadius: 16,
                  padding: "18px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  cursor: "pointer",
                  transition: "opacity var(--dur-state), transform var(--dur-press) var(--ease-out-quart)",
                  minHeight: 120,
                }}
              >
                {/* Emoji icon box */}
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 11,
                  background: "#F5F2EC",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif",
                }}>
                  {cat.emoji}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#0A0A0A", marginBottom: 3, lineHeight: 1.3 }}>
                    {cat.nameKo}
                  </p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: cat.color, letterSpacing: "0.3px", lineHeight: 1.4 }}>
                    {cat.nameEn}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#D8D4CC", letterSpacing: "1px", textAlign: "center", marginTop: 24 }}>
          {CATEGORIES.length} CATEGORIES
        </p>
      </div>
    </main>
  );
}
