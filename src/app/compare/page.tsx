"use client";

/**
 * ③ 제품 비교
 *
 * 기존 SEARCH 탭 자리를 대체한다. 점수만 나란히 놓는 게 아니라
 * **내 건강 프로파일 기준으로 다시 판정**하는 게 핵심이다 —
 * 같은 제품이라도 견과류 알레르기가 있으면 결과가 달라야 한다.
 * (프로파일은 온보딩 설문이 localStorage 에 남긴 값)
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import {
  getProductsByCategory,
  getScoreBadgeColor,
  type RankedProduct,
} from "@/lib/productData";
import { EMPTY_HEALTH_PROFILE, type HealthProfile } from "@/lib/profiling";

const INK = "#0A0A0A";
const CANVAS = "#F5F2EC";
const CARD = "#EDEAE3";
const WHITE = "#FFFFFF";
const HAIRLINE = "#D8D4CC";
const MUTED = "#8A8880";
const DANGER = "#C44B4B";
const WARN = "#C4780A";
const GOOD = "#2A8A5C";

const SANS = "'Space Grotesk', -apple-system, sans-serif";
const MONO = "'DM Mono', monospace";

const MAX_PICK = 3;

/** 내 조건에 걸리는 항목을 찾는다 — 제품의 경고/하이라이트 문구와 대조 */
function matchMyConditions(product: RankedProduct, profile: HealthProfile) {
  const haystack = [...product.warnings, ...product.highlights, product.name].join(" ");
  const hits = [...profile.allergies, ...profile.avoid].filter((term) =>
    haystack.includes(term),
  );
  return hits;
}

export default function ComparePage() {
  const [profile, setProfile] = useState<HealthProfile>(EMPTY_HEALTH_PROFILE);
  const [categorySlug, setCategorySlug] = useState<string>(CATEGORIES[0].slug);
  const [picked, setPicked] = useState<RankedProduct[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("hindsight_health_profile");
      if (raw) setProfile({ ...EMPTY_HEALTH_PROFILE, ...JSON.parse(raw) });
    } catch {
      /* 값이 깨졌으면 조건 없이 비교한다 */
    }
  }, []);

  const products = useMemo(() => getProductsByCategory(categorySlug), [categorySlug]);
  const hasProfile =
    profile.allergies.length + profile.conditions.length + profile.avoid.length > 0;

  const toggle = (p: RankedProduct) => {
    setPicked((cur) => {
      if (cur.some((x) => x.barcode === p.barcode)) {
        return cur.filter((x) => x.barcode !== p.barcode);
      }
      if (cur.length >= MAX_PICK) return cur;
      return [...cur, p];
    });
  };

  // 내 조건에 안 걸리면서 점수가 가장 높은 것 = 추천
  const best = useMemo(() => {
    if (picked.length < 2) return null;
    const safe = picked.filter((p) => matchMyConditions(p, profile).length === 0);
    const pool = safe.length > 0 ? safe : picked;
    return pool.reduce((a, b) => (b.score > a.score ? b : a));
  }, [picked, profile]);

  return (
    <main style={{ minHeight: "100dvh", background: CANVAS, fontFamily: SANS, paddingBottom: 64 }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .rise { animation: fadeUp 340ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        button:active { opacity: 0.85; }
        .scroll-x { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .scroll-x::-webkit-scrollbar { display: none; }
        @media (prefers-reduced-motion: reduce) { .rise { animation: none; } }
      `}</style>

      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
          borderBottom: `0.5px solid ${HAIRLINE}`,
        }}
      >
        <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 300, letterSpacing: "3px", color: INK }}>
          HINDSIGHT<span style={{ opacity: 0.25 }}>+</span>
        </span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "1.5px" }}>COMPARE</span>
      </header>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 24px 32px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 300, color: INK, lineHeight: 1.3, letterSpacing: "-0.7px", marginBottom: 8 }}>
          내 기준으로
          <br />
          나란히 비교
        </h1>
        <p style={{ fontSize: 13, color: INK, opacity: 0.6, lineHeight: 1.7, marginBottom: 18 }}>
          최대 {MAX_PICK}개까지 고르면 회원님 조건에 맞춰 다시 판정합니다.
        </p>

        {/* 내 조건 요약 */}
        {hasProfile ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 22 }}>
            {[...profile.allergies, ...profile.conditions, ...profile.avoid].slice(0, 8).map((t) => (
              <span
                key={t}
                style={{
                  fontFamily: MONO,
                  fontSize: 9,
                  letterSpacing: "0.5px",
                  color: INK,
                  background: CARD,
                  border: `0.5px solid ${HAIRLINE}`,
                  borderRadius: 999,
                  padding: "5px 10px",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        ) : (
          <Link
            href="/onboarding"
            style={{
              display: "block",
              background: CARD,
              border: `0.5px solid ${HAIRLINE}`,
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 22,
              textDecoration: "none",
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 500, color: INK, marginBottom: 3 }}>
              개인 맞춤 분석을 아직 안 하셨어요 →
            </p>
            <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.5px" }}>
              알레르기·질환을 입력하면 내 기준으로 비교합니다
            </p>
          </Link>
        )}

        {/* 카테고리 선택 */}
        <div className="scroll-x" style={{ display: "flex", gap: 6, marginBottom: 16, paddingBottom: 2 }}>
          {CATEGORIES.map((c) => {
            const on = c.slug === categorySlug;
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => {
                  setCategorySlug(c.slug);
                  setPicked([]);
                }}
                style={{
                  flexShrink: 0,
                  fontFamily: SANS,
                  fontSize: 13,
                  fontWeight: on ? 500 : 400,
                  color: on ? CANVAS : INK,
                  background: on ? INK : "transparent",
                  border: `0.5px solid ${on ? INK : HAIRLINE}`,
                  borderRadius: 999,
                  padding: "8px 14px",
                  cursor: "pointer",
                  touchAction: "manipulation",
                  minHeight: 0,
                  minWidth: 0,
                }}
              >
                {c.emoji} {c.nameKo}
              </button>
            );
          })}
        </div>

        {/* 비교 결과 */}
        {picked.length >= 2 && best && (
          <div className="rise" style={{ marginBottom: 22 }}>
            <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "2px", marginBottom: 10 }}>
              COMPARISON
            </p>

            <div className="scroll-x" style={{ display: "flex", gap: 10, paddingBottom: 4 }}>
              {picked.map((p) => {
                const hits = matchMyConditions(p, profile);
                const isBest = p.barcode === best.barcode;
                return (
                  <div
                    key={p.barcode}
                    style={{
                      flexShrink: 0,
                      width: 190,
                      background: WHITE,
                      border: `${isBest ? 1 : 0.5}px solid ${isBest ? GOOD : HAIRLINE}`,
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    {isBest && (
                      <span
                        style={{
                          display: "inline-block",
                          fontFamily: MONO,
                          fontSize: 8,
                          letterSpacing: "1px",
                          color: CANVAS,
                          background: GOOD,
                          borderRadius: 4,
                          padding: "3px 7px",
                          marginBottom: 8,
                        }}
                      >
                        추천
                      </span>
                    )}
                    <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.5px", marginBottom: 3 }}>
                      {p.brand}
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: INK, lineHeight: 1.35, marginBottom: 10, letterSpacing: "-0.2px" }}>
                      {p.name}
                    </p>

                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
                      <span style={{ fontSize: 26, fontWeight: 700, color: getScoreBadgeColor(p.score), letterSpacing: "-1px", lineHeight: 1 }}>
                        {p.score}
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.5px" }}>
                        일반 점수
                      </span>
                    </div>

                    {/* 내 조건 판정 — 이게 다른 비교 서비스와의 차이다 */}
                    <div
                      style={{
                        background: hits.length ? `${DANGER}12` : `${GOOD}12`,
                        border: `0.5px solid ${hits.length ? DANGER : GOOD}40`,
                        borderRadius: 8,
                        padding: "8px 10px",
                        marginBottom: 10,
                      }}
                    >
                      <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.5px", color: hits.length ? DANGER : GOOD, marginBottom: hits.length ? 4 : 0 }}>
                        {hits.length ? "내 조건 주의" : "내 조건 이상 없음"}
                      </p>
                      {hits.map((h) => (
                        <p key={h} style={{ fontSize: 11, color: INK, opacity: 0.75, lineHeight: 1.5 }}>
                          · {h}
                        </p>
                      ))}
                    </div>

                    {p.warnings.slice(0, 2).map((w) => (
                      <p key={w} style={{ fontSize: 11, color: WARN, lineHeight: 1.55, marginBottom: 3 }}>
                        · {w}
                      </p>
                    ))}
                    {p.highlights.slice(0, 2).map((h) => (
                      <p key={h} style={{ fontSize: 11, color: INK, opacity: 0.6, lineHeight: 1.55, marginBottom: 3 }}>
                        · {h}
                      </p>
                    ))}
                  </div>
                );
              })}
            </div>

            <div
              style={{
                background: INK,
                borderRadius: 12,
                padding: "14px 16px",
                marginTop: 12,
              }}
            >
              <p style={{ fontFamily: MONO, fontSize: 9, color: GOOD, letterSpacing: "1.5px", marginBottom: 5 }}>
                우리의 추천
              </p>
              <p style={{ fontSize: 13, color: CANVAS, opacity: 0.85, lineHeight: 1.65 }}>
                {hasProfile
                  ? `회원님 조건을 반영하면 «${best.name}» 이 가장 낫습니다.`
                  : `점수만 놓고 보면 «${best.name}» 이 가장 높습니다. 알레르기·질환을 입력하면 회원님 기준으로 다시 계산해 드려요.`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPicked([])}
              style={{
                width: "100%",
                padding: "12px 16px",
                marginTop: 8,
                background: "transparent",
                border: `0.5px solid ${HAIRLINE}`,
                borderRadius: 12,
                fontFamily: SANS,
                fontSize: 13,
                color: MUTED,
                cursor: "pointer",
                touchAction: "manipulation",
              }}
            >
              선택 초기화
            </button>
          </div>
        )}

        {/* 제품 목록 */}
        <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "2px", marginBottom: 10 }}>
          {picked.length}/{MAX_PICK} 선택됨
        </p>

        {products.map((p) => {
          const on = picked.some((x) => x.barcode === p.barcode);
          const full = picked.length >= MAX_PICK && !on;
          const hits = matchMyConditions(p, profile);
          return (
            <button
              key={p.barcode}
              type="button"
              onClick={() => toggle(p)}
              disabled={full}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "13px 14px",
                marginBottom: 8,
                background: on ? INK : WHITE,
                border: `0.5px solid ${on ? INK : HAIRLINE}`,
                borderRadius: 12,
                cursor: full ? "default" : "pointer",
                opacity: full ? 0.4 : 1,
                textAlign: "left",
                touchAction: "manipulation",
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: on ? CANVAS : getScoreBadgeColor(p.score),
                  letterSpacing: "-0.5px",
                  minWidth: 28,
                  flexShrink: 0,
                }}
              >
                {p.score}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: on ? CANVAS : INK, letterSpacing: "-0.2px" }}>
                  {p.name}
                </span>
                <span style={{ display: "block", fontFamily: MONO, fontSize: 9, color: on ? "rgba(245,242,236,0.6)" : MUTED, letterSpacing: "0.5px", marginTop: 2 }}>
                  {p.brand}
                  {hits.length > 0 && ` · 내 조건 ${hits.length}건 주의`}
                </span>
              </span>
              {hits.length > 0 && (
                <span
                  aria-hidden="true"
                  style={{ width: 6, height: 6, borderRadius: "50%", background: DANGER, flexShrink: 0 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </main>
  );
}
