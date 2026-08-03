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
  const [directOpen, setDirectOpen] = useState(false);

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
          내 기준으로 나란히 비교
        </h1>
        <p style={{ fontSize: 13, color: INK, opacity: 0.6, lineHeight: 1.7, marginBottom: 18 }}>
          최대 {MAX_PICK}개까지 고르면 회원님 조건에 맞춰 다시 판정합니다.
        </p>

        {/* 직접 비교 — 카테고리를 훑지 않고 아는 제품 두 개를 바로 올린다 */}
        <button
          type="button"
          onClick={() => setDirectOpen(true)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "15px 16px",
            marginBottom: 22,
            background: INK,
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            textAlign: "left",
            touchAction: "manipulation",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <circle cx="7.5" cy="7.5" r="5" stroke={CANVAS} strokeWidth="1.2" />
            <path d="M11.5 11.5L15.5 15.5" stroke={CANVAS} strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontFamily: SANS, fontSize: 14, fontWeight: 600, color: CANVAS }}>
              찾아서 두 제품 바로 비교
            </span>
            <span style={{ display: "block", fontFamily: MONO, fontSize: 9, color: "rgba(245,242,236,0.55)", letterSpacing: "0.5px", marginTop: 2 }}>
              제품명을 검색해 올리면 내 기준으로 분석합니다
            </span>
          </span>
          <span aria-hidden="true" style={{ color: CANVAS, fontSize: 16, opacity: 0.7 }}>→</span>
        </button>

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

      {directOpen && (
        <DirectCompare profile={profile} hasProfile={hasProfile} onClose={() => setDirectOpen(false)} />
      )}
    </main>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   직접 비교 — 카테고리를 훑지 않고 아는 제품 두 개를 검색해 올린다.
   search → loading → 비교 분석 표 (내 맞춤 기준)
   ──────────────────────────────────────────────────────────────────────────── */

const ALL_PRODUCTS: RankedProduct[] = CATEGORIES.flatMap((c) => getProductsByCategory(c.slug));

const LOADING_STEPS = [
  "제품 정보 대조",
  "원재료 교차검증",
  "내 프로파일 적용",
];

type Slot = 0 | 1;

function DirectCompare({
  profile,
  hasProfile,
  onClose,
}: {
  profile: HealthProfile;
  hasProfile: boolean;
  onClose: () => void;
}) {
  const [slots, setSlots] = useState<(RankedProduct | null)[]>([null, null]);
  const [active, setActive] = useState<Slot | null>(0);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<"pick" | "loading" | "result">("pick");
  const [loadStep, setLoadStep] = useState(0);

  const ready = slots[0] !== null && slots[1] !== null;

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return ALL_PRODUCTS.filter(
      (p) => p.name.includes(q) || p.brand.includes(q),
    ).slice(0, 8);
  }, [query]);

  // 로딩 단계 진행
  useEffect(() => {
    if (stage !== "loading") return;
    if (loadStep >= LOADING_STEPS.length) {
      const id = setTimeout(() => setStage("result"), 420);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setLoadStep((s) => s + 1), 620);
    return () => clearTimeout(id);
  }, [stage, loadStep]);

  const put = (p: RankedProduct) => {
    if (active === null) return;
    setSlots((cur) => {
      const next = [...cur];
      next[active] = p;
      return next;
    });
    setQuery("");
    // 비어 있는 다음 칸으로 자동 이동
    setActive(active === 0 && slots[1] === null ? 1 : null);
  };

  const start = () => {
    setLoadStep(0);
    setStage("loading");
  };

  const restart = () => {
    setSlots([null, null]);
    setActive(0);
    setQuery("");
    setLoadStep(0);
    setStage("pick");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="두 제품 직접 비교"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: CANVAS,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
          borderBottom: `0.5px solid ${HAIRLINE}`,
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "1.5px" }}>
          DIRECT COMPARE
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          style={{
            background: "transparent",
            border: "none",
            fontFamily: SANS,
            fontSize: 14,
            color: INK,
            cursor: "pointer",
            minHeight: 0,
            minWidth: 0,
            padding: 4,
          }}
        >
          ✕
        </button>
      </header>

      <div style={{ flex: 1, maxWidth: 480, width: "100%", margin: "0 auto", padding: "24px 24px 32px" }}>
        {stage === "pick" && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 300, color: INK, letterSpacing: "-0.6px", marginBottom: 18 }}>
              비교할 두 제품을 올려주세요
            </h2>

            {/* 두 칸 */}
            <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
              {([0, 1] as Slot[]).map((i) => {
                const p = slots[i];
                const on = active === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActive(i)}
                    style={{
                      flex: 1,
                      minHeight: 104,
                      padding: 14,
                      background: p ? WHITE : "transparent",
                      border: `${on ? 1 : 0.5}px ${p ? "solid" : "dashed"} ${on ? INK : HAIRLINE}`,
                      borderRadius: 12,
                      cursor: "pointer",
                      textAlign: "left",
                      touchAction: "manipulation",
                    }}
                  >
                    <span style={{ display: "block", fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "1px", marginBottom: 8 }}>
                      {i === 0 ? "A" : "B"}
                    </span>
                    {p ? (
                      <>
                        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: INK, lineHeight: 1.35, letterSpacing: "-0.2px" }}>
                          {p.name}
                        </span>
                        <span style={{ display: "block", fontFamily: MONO, fontSize: 9, color: MUTED, marginTop: 3 }}>
                          {p.brand}
                        </span>
                      </>
                    ) : (
                      <span style={{ display: "block", fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
                        탭하고 검색해서
                        <br />
                        제품 추가
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {active !== null && (
              <>
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`${active === 0 ? "A" : "B"} 에 넣을 제품명 검색`}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    background: CARD,
                    border: `0.5px solid ${HAIRLINE}`,
                    borderRadius: 12,
                    outline: "none",
                    fontFamily: SANS,
                    fontSize: 14,
                    color: INK,
                    marginBottom: 10,
                  }}
                />

                {query.trim() && results.length === 0 && (
                  <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, padding: "8px 2px" }}>
                    검색 결과가 없어요. 다른 이름으로 찾아보세요.
                  </p>
                )}

                {results.map((p) => (
                  <button
                    key={p.barcode}
                    type="button"
                    onClick={() => put(p)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      marginBottom: 6,
                      background: WHITE,
                      border: `0.5px solid ${HAIRLINE}`,
                      borderRadius: 12,
                      cursor: "pointer",
                      textAlign: "left",
                      touchAction: "manipulation",
                    }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 700, color: getScoreBadgeColor(p.score), minWidth: 26, flexShrink: 0 }}>
                      {p.score}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: INK, letterSpacing: "-0.2px" }}>
                        {p.name}
                      </span>
                      <span style={{ display: "block", fontFamily: MONO, fontSize: 9, color: MUTED, marginTop: 2 }}>
                        {p.brand}
                      </span>
                    </span>
                  </button>
                ))}
              </>
            )}

            <button
              type="button"
              onClick={start}
              disabled={!ready}
              style={{
                width: "100%",
                padding: "17px 20px",
                marginTop: 18,
                background: ready ? INK : CARD,
                border: ready ? "none" : `0.5px solid ${HAIRLINE}`,
                borderRadius: 12,
                fontFamily: SANS,
                fontSize: 14,
                fontWeight: 600,
                color: ready ? CANVAS : MUTED,
                cursor: ready ? "pointer" : "default",
                touchAction: "manipulation",
              }}
            >
              {ready ? "내 기준으로 비교하기" : "두 제품을 모두 올려주세요"}
            </button>
          </>
        )}

        {stage === "loading" && (
          <div style={{ paddingTop: 40 }}>
            <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "2px", marginBottom: 24 }}>
              ANALYZING
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 300, color: INK, letterSpacing: "-0.6px", lineHeight: 1.35, marginBottom: 30 }}>
              {slots[0]?.name}
              <span style={{ color: MUTED }}> vs </span>
              {slots[1]?.name}
            </h2>

            {LOADING_STEPS.map((label, i) => {
              const done = i < loadStep;
              const now = i === loadStep;
              return (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 0",
                    borderBottom: `0.5px solid ${HAIRLINE}`,
                    opacity: done || now ? 1 : 0.35,
                    transition: "opacity 240ms ease",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 16,
                      height: 16,
                      flexShrink: 0,
                      borderRadius: "50%",
                      border: `1px solid ${done ? GOOD : HAIRLINE}`,
                      background: done ? GOOD : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {done && (
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                        <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke={CANVAS} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: done ? 600 : 400, color: INK }}>{label}</span>
                </div>
              );
            })}
          </div>
        )}

        {stage === "result" && slots[0] && slots[1] && (
          <CompareTable
            a={slots[0]}
            b={slots[1]}
            profile={profile}
            hasProfile={hasProfile}
            onRestart={restart}
          />
        )}
      </div>
    </div>
  );
}

function CompareTable({
  a,
  b,
  profile,
  hasProfile,
  onRestart,
}: {
  a: RankedProduct;
  b: RankedProduct;
  profile: HealthProfile;
  hasProfile: boolean;
  onRestart: () => void;
}) {
  const hitsA = matchMyConditions(a, profile);
  const hitsB = matchMyConditions(b, profile);

  // 내 조건에 걸린 건수를 먼저 보고, 같으면 점수로 가른다
  const winner =
    hitsA.length !== hitsB.length
      ? hitsA.length < hitsB.length
        ? a
        : b
      : a.score >= b.score
        ? a
        : b;

  const allergyA = hitsFor(a, profile.allergies);
  const allergyB = hitsFor(b, profile.allergies);
  const avoidA = hitsFor(a, profile.avoid);
  const avoidB = hitsFor(b, profile.avoid);
  const catLabel = (p: RankedProduct) =>
    CATEGORIES.find((c) => c.slug === p.category)?.nameKo ?? p.category;

  const rows: { label: string; a: React.ReactNode; b: React.ReactNode }[] = [
    {
      label: "종합 점수",
      a: <Score p={a} />,
      b: <Score p={b} />,
    },
    {
      label: "등급",
      a: <Grade score={a.score} />,
      b: <Grade score={b.score} />,
    },
    {
      label: "내 조건 판정",
      a: <Verdict hits={hitsA} hasProfile={hasProfile} />,
      b: <Verdict hits={hitsB} hasProfile={hasProfile} />,
    },
    {
      label: "알레르기",
      a: <Flag hits={allergyA} hasProfile={profile.allergies.length > 0} safe="해당 없음" />,
      b: <Flag hits={allergyB} hasProfile={profile.allergies.length > 0} safe="해당 없음" />,
    },
    {
      label: "기피 성분",
      a: <Flag hits={avoidA} hasProfile={profile.avoid.length > 0} safe="해당 없음" />,
      b: <Flag hits={avoidB} hasProfile={profile.avoid.length > 0} safe="해당 없음" />,
    },
    {
      label: "주의 항목",
      a: <Count n={a.warnings.length} tone={a.warnings.length ? WARN : GOOD} unit="건" />,
      b: <Count n={b.warnings.length} tone={b.warnings.length ? WARN : GOOD} unit="건" />,
    },
    {
      label: "주의 성분",
      a: <Bullets items={a.warnings} tone={WARN} empty="특이사항 없음" />,
      b: <Bullets items={b.warnings} tone={WARN} empty="특이사항 없음" />,
    },
    {
      label: "장점",
      a: <Bullets items={a.highlights} tone={INK} empty="—" />,
      b: <Bullets items={b.highlights} tone={INK} empty="—" />,
    },
    {
      label: "카테고리",
      a: <Plain text={catLabel(a)} />,
      b: <Plain text={catLabel(b)} />,
    },
    {
      label: "브랜드",
      a: <Plain text={a.brand} />,
      b: <Plain text={b.brand} />,
    },
    {
      label: "최종 추천",
      a: <Pick on={a.barcode === winner.barcode} />,
      b: <Pick on={b.barcode === winner.barcode} />,
    },
  ];

  return (
    <div className="rise">
      <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "2px", marginBottom: 14 }}>
        RESULT
      </p>

      {/* 표 */}
      <div style={{ background: WHITE, border: `0.5px solid ${HAIRLINE}`, borderRadius: 12, overflow: "hidden" }}>
        {/* 헤더 */}
        <div style={{ display: "flex", borderBottom: `0.5px solid ${HAIRLINE}` }}>
          <div style={{ width: 78, flexShrink: 0, padding: "12px 10px", background: CARD }} />
          {[a, b].map((p) => (
            <div
              key={p.barcode}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "12px 10px",
                background: p.barcode === winner.barcode ? `${GOOD}10` : CARD,
                borderLeft: `0.5px solid ${HAIRLINE}`,
              }}
            >
              <p style={{ fontFamily: MONO, fontSize: 8, color: MUTED, letterSpacing: "0.5px", marginBottom: 3 }}>
                {p.brand}
              </p>
              <p style={{ fontSize: 12, fontWeight: 600, color: INK, lineHeight: 1.35, letterSpacing: "-0.2px" }}>
                {p.name}
              </p>
            </div>
          ))}
        </div>

        {rows.map((r) => (
          <div key={r.label} style={{ display: "flex", borderBottom: `0.5px solid ${HAIRLINE}` }}>
            <div style={{ width: 78, flexShrink: 0, padding: "12px 10px", background: CARD }}>
              <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.3px", lineHeight: 1.5 }}>
                {r.label}
              </p>
            </div>
            <div style={{ flex: 1, minWidth: 0, padding: "12px 10px", borderLeft: `0.5px solid ${HAIRLINE}` }}>{r.a}</div>
            <div style={{ flex: 1, minWidth: 0, padding: "12px 10px", borderLeft: `0.5px solid ${HAIRLINE}` }}>{r.b}</div>
          </div>
        ))}
      </div>

      {/* 결론 */}
      <div style={{ background: INK, borderRadius: 12, padding: "16px 16px", marginTop: 12 }}>
        <p style={{ fontFamily: MONO, fontSize: 9, color: GOOD, letterSpacing: "1.5px", marginBottom: 6 }}>
          내 맞춤 결론
        </p>
        <p style={{ fontSize: 14, fontWeight: 600, color: CANVAS, lineHeight: 1.5, marginBottom: 6 }}>
          {winner.name}
        </p>
        <p style={{ fontSize: 12, color: CANVAS, opacity: 0.72, lineHeight: 1.7 }}>
          {hasProfile
            ? hitsA.length !== hitsB.length
              ? `회원님 조건에 걸리는 항목이 더 적습니다 (${Math.min(hitsA.length, hitsB.length)}건 vs ${Math.max(hitsA.length, hitsB.length)}건).`
              : "두 제품 모두 회원님 조건에는 걸리지 않아, 종합 점수가 높은 쪽을 골랐습니다."
            : "알레르기·질환을 입력하면 회원님 조건까지 반영해 다시 계산해 드려요. 지금은 종합 점수 기준입니다."}
        </p>
      </div>

      <button
        type="button"
        onClick={onRestart}
        style={{
          width: "100%",
          padding: "15px 20px",
          marginTop: 10,
          background: "transparent",
          border: `0.5px solid ${HAIRLINE}`,
          borderRadius: 12,
          fontFamily: SANS,
          fontSize: 14,
          color: INK,
          cursor: "pointer",
          touchAction: "manipulation",
        }}
      >
        다른 제품 비교하기
      </button>
    </div>
  );
}

/** 특정 조건 목록만 대조 — 알레르기와 기피 성분을 행으로 갈라 보여주기 위해 */
function hitsFor(product: RankedProduct, terms: string[]) {
  const haystack = [...product.warnings, ...product.highlights, product.name].join(" ");
  return terms.filter((t) => haystack.includes(t));
}

const GRADES: { min: number; label: string; color: string }[] = [
  { min: 85, label: "안전", color: GOOD },
  { min: 70, label: "양호", color: "#3B7DD4" },
  { min: 50, label: "주의", color: WARN },
  { min: 0, label: "위험", color: DANGER },
];

function Grade({ score }: { score: number }) {
  const g = GRADES.find((x) => score >= x.min) ?? GRADES[GRADES.length - 1];
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: MONO,
        fontSize: 9,
        letterSpacing: "0.3px",
        color: g.color,
        background: `${g.color}14`,
        border: `0.5px solid ${g.color}40`,
        borderRadius: 999,
        padding: "4px 9px",
      }}
    >
      {g.label}
    </span>
  );
}

function Flag({ hits, hasProfile, safe }: { hits: string[]; hasProfile: boolean; safe: string }) {
  if (!hasProfile) {
    return <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.3px" }}>미입력</span>;
  }
  if (hits.length === 0) {
    return <span style={{ fontSize: 11, color: GOOD, lineHeight: 1.6 }}>{safe}</span>;
  }
  return (
    <>
      {hits.map((h) => (
        <p key={h} style={{ fontSize: 11, color: DANGER, fontWeight: 500, lineHeight: 1.6 }}>
          {h}
        </p>
      ))}
    </>
  );
}

function Count({ n, tone, unit }: { n: number; tone: string; unit: string }) {
  return (
    <span style={{ fontSize: 15, fontWeight: 600, color: tone, letterSpacing: "-0.2px" }}>
      {n}
      <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 400, marginLeft: 2 }}>{unit}</span>
    </span>
  );
}

function Plain({ text }: { text: string }) {
  return <span style={{ fontSize: 11, color: INK, opacity: 0.7, lineHeight: 1.6 }}>{text}</span>;
}

function Pick({ on }: { on: boolean }) {
  return on ? (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontFamily: MONO,
        fontSize: 9,
        letterSpacing: "0.5px",
        color: CANVAS,
        background: GOOD,
        borderRadius: 999,
        padding: "4px 9px",
      }}
    >
      ✓ 추천
    </span>
  ) : (
    <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.3px" }}>—</span>
  );
}

function Score({ p }: { p: RankedProduct }) {
  return (
    <span style={{ fontSize: 22, fontWeight: 700, color: getScoreBadgeColor(p.score), letterSpacing: "-0.8px" }}>
      {p.score}
    </span>
  );
}

function Verdict({ hits, hasProfile }: { hits: string[]; hasProfile: boolean }) {
  if (!hasProfile) {
    return <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.3px" }}>미설정</span>;
  }
  const bad = hits.length > 0;
  return (
    <>
      <span
        style={{
          display: "inline-block",
          fontFamily: MONO,
          fontSize: 9,
          letterSpacing: "0.3px",
          color: bad ? DANGER : GOOD,
          background: `${bad ? DANGER : GOOD}14`,
          border: `0.5px solid ${bad ? DANGER : GOOD}40`,
          borderRadius: 999,
          padding: "4px 8px",
          marginBottom: bad ? 5 : 0,
        }}
      >
        {bad ? `주의 ${hits.length}` : "이상 없음"}
      </span>
      {hits.map((h) => (
        <p key={h} style={{ fontSize: 11, color: DANGER, lineHeight: 1.55 }}>
          {h}
        </p>
      ))}
    </>
  );
}

function Bullets({ items, tone, empty }: { items: string[]; tone: string; empty: string }) {
  if (items.length === 0) {
    return <span style={{ fontSize: 11, color: MUTED, lineHeight: 1.6 }}>{empty}</span>;
  }
  return (
    <>
      {items.map((t) => (
        <p key={t} style={{ fontSize: 11, color: tone, opacity: tone === INK ? 0.7 : 1, lineHeight: 1.6, marginBottom: 3 }}>
          · {t}
        </p>
      ))}
    </>
  );
}
