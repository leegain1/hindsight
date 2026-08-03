"use client";

/**
 * ⑤ 사용자 후기 전체 보기.
 * 리포트의 후기 섹션을 탭하면 여기로 온다. 데이터는 목(mockPhotoAnalysis)에서 온다.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { DEMO_REVIEWS, type UserReview } from "@/lib/mockPhotoAnalysis";

const INK = "#0A0A0A";
const CANVAS = "#F5F2EC";
const CARD = "#EDEAE3";
const WHITE = "#FFFFFF";
const HAIRLINE = "#D8D4CC";
const MUTED = "#8A8880";

const SANS = "'Space Grotesk', -apple-system, sans-serif";
const MONO = "'DM Mono', monospace";

type SortKey = "helpful" | "recent" | "low";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "helpful", label: "도움순" },
  { key: "recent", label: "최신순" },
  { key: "low", label: "낮은 평점순" },
];

function Stars({ rating, size = 11 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }} aria-label={`5점 만점에 ${rating}점`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path
            d="M5 0.8l1.1 2.3 2.5.4-1.8 1.8.4 2.5L5 6.6 2.8 7.8l.4-2.5L1.4 3.5l2.5-.4L5 .8z"
            fill={i <= Math.round(rating) ? "#C4780A" : "#D8D4CC"}
          />
        </svg>
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const [sort, setSort] = useState<SortKey>("helpful");
  const { rating, totalCount, verifiedCount, badges, top } = DEMO_REVIEWS;

  const sorted = useMemo(() => {
    const list = [...top];
    if (sort === "helpful") return list.sort((a, b) => b.helpfulCount - a.helpfulCount);
    if (sort === "recent") return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list.sort((a, b) => a.rating - b.rating);
  }, [sort, top]);

  // 평점 분포 — 목 데이터의 상위 후기로 만든 근사치
  const distribution = useMemo(() => {
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      n: top.filter((r) => r.rating === star).length,
    }));
  }, [top]);
  const maxBar = Math.max(1, ...distribution.map((d) => d.n));

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: CANVAS,
        fontFamily: SANS,
        display: "flex",
        flexDirection: "column",
        paddingBottom: 64,
      }}
    >
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "calc(20px + env(safe-area-inset-top)) 24px 20px",
          borderBottom: `0.5px solid ${HAIRLINE}`,
        }}
      >
        <Link href="/scan/photo" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M11 3L5 9L11 15" stroke={INK} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 400, letterSpacing: "3px", color: INK }}>
            HINDSIGHT<span style={{ opacity: 0.25 }}>+</span>
          </span>
        </Link>
        <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "1.5px" }}>REVIEWS</span>
      </header>

      <div style={{ flex: 1, maxWidth: 480, width: "100%", margin: "0 auto", padding: "24px 24px 32px" }}>
        {/* 요약 */}
        <div
          style={{
            background: WHITE,
            border: `0.5px solid ${HAIRLINE}`,
            borderRadius: 12,
            padding: "18px 16px",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 16 }}>
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <p style={{ fontSize: 36, fontWeight: 700, color: INK, letterSpacing: "-1.5px", lineHeight: 1 }}>
                {rating.toFixed(1)}
              </p>
              <div style={{ marginTop: 6 }}>
                <Stars rating={rating} size={12} />
              </div>
              <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.5px", marginTop: 5 }}>
                후기 {totalCount}
              </p>
            </div>

            {/* 평점 분포 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {distribution.map(({ star, n }) => (
                <div key={star} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, width: 8, flexShrink: 0 }}>{star}</span>
                  <span style={{ flex: 1, height: 4, background: HAIRLINE, borderRadius: 2, overflow: "hidden" }}>
                    <span
                      style={{
                        display: "block",
                        height: "100%",
                        width: "100%",
                        background: "#C4780A",
                        transformOrigin: "left",
                        transform: `scaleX(${n / maxBar})`,
                      }}
                    />
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, width: 12, textAlign: "right", flexShrink: 0 }}>
                    {n}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 신뢰 뱃지 */}
          <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "2px", marginBottom: 10 }}>
            신뢰 뱃지
          </p>
          {badges.map((b) => {
            const fg = b.tone === "positive" ? "#2A8A5C" : b.tone === "caution" ? "#C4780A" : "#3B7DD4";
            return (
              <div key={b.id} style={{ marginBottom: 8 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontFamily: MONO,
                    fontSize: 9,
                    letterSpacing: "0.5px",
                    color: fg,
                    background: `${fg}14`,
                    border: `0.5px solid ${fg}40`,
                    borderRadius: 999,
                    padding: "5px 10px",
                  }}
                >
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M5 0.8l1.1 2.3 2.5.4-1.8 1.8.4 2.5L5 6.6 2.8 7.8l.4-2.5L1.4 3.5l2.5-.4L5 .8z" fill={fg} />
                  </svg>
                  {b.label}
                </span>
                <p style={{ fontSize: 11, color: INK, opacity: 0.6, lineHeight: 1.6, marginTop: 4 }}>{b.basis}</p>
              </div>
            );
          })}

          <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.3px", lineHeight: 1.6, marginTop: 10 }}>
            구매 확인 {verifiedCount} / {totalCount} · 브랜드 인증이 아닌 사용자 평판 데이터입니다
          </p>
        </div>

        {/* 정렬 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {SORTS.map((s) => {
            const active = s.key === sort;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSort(s.key)}
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: "0.5px",
                  color: active ? CANVAS : INK,
                  background: active ? INK : "transparent",
                  border: `0.5px solid ${active ? INK : HAIRLINE}`,
                  borderRadius: 999,
                  padding: "7px 13px",
                  cursor: "pointer",
                  touchAction: "manipulation",
                  minHeight: 0,
                  minWidth: 0,
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* 후기 목록 */}
        <div style={{ background: WHITE, border: `0.5px solid ${HAIRLINE}`, borderRadius: 12, padding: "4px 16px 8px" }}>
          {sorted.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>

        <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.5px", textAlign: "center", marginTop: 16, lineHeight: 1.6 }}>
          {sorted.length}개 표시 중 · 전체 {totalCount}개
        </p>

        <Link
          href="/scan/photo"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "15px 20px",
            marginTop: 16,
            background: CARD,
            border: `0.5px solid ${HAIRLINE}`,
            borderRadius: 12,
            textDecoration: "none",
            fontFamily: SANS,
            fontSize: 14,
            fontWeight: 500,
            color: INK,
          }}
        >
          분석 리포트로 돌아가기
        </Link>
      </div>
    </main>
  );
}

function ReviewCard({ review }: { review: UserReview }) {
  return (
    <div style={{ padding: "14px 0", borderBottom: `0.5px solid ${HAIRLINE}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Stars rating={review.rating} />
        <span style={{ fontSize: 12, fontWeight: 500, color: INK }}>{review.userName}</span>
        {review.verified && (
          <span
            style={{
              fontFamily: MONO,
              fontSize: 8,
              letterSpacing: "0.5px",
              color: "#2A8A5C",
              background: "#2A8A5C14",
              borderRadius: 999,
              padding: "2px 6px",
            }}
          >
            구매확인
          </span>
        )}
      </div>
      <p style={{ fontSize: 13, color: INK, opacity: 0.75, lineHeight: 1.7, marginBottom: 7 }}>{review.body}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.3px" }}>
          {review.createdAt}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.3px" }}>
          도움 {review.helpfulCount}
        </span>
      </div>
    </div>
  );
}
