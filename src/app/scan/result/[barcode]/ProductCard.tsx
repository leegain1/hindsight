"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ScoreBreakdown } from "@/lib/scoring";
import { createClient } from "@/lib/supabase";
import { DUMMY_REVIEWS, getDisplayRating, getDisplayReviewCount, type DummyReview } from "@/lib/productData";

interface Nutriments {
  "energy-kcal"?: number;
  carbohydrates?: number;
  sugars?: number;
  proteins?: number;
  fat?: number;
  "saturated-fat"?: number;
  "trans-fat"?: number;
  sodium?: number;  // g/100g from OFF — multiply ×1000 for mg
  fiber?: number;
  cholesterol?: number;
}

interface ProductData {
  barcode: string;
  name: string;
  brand: string;
  ingredients: string;
  image?: string;
  nutriscore_grade?: string;
  nova_group?: number;
  additives_tags?: string[];
  allergens_tags?: string[];
  nutriments?: Nutriments;
  score: ScoreBreakdown;
  source: "local" | "off" | "not_found";
}

interface Analysis {
  verdict: string;
  verdictColor: string;
  score: number;
  body: string;
  risks: string[];
  saferTips: string[];
}

const KNOWN_ALLERGENS: Record<string, string> = {
  "en:gluten": "글루텐",
  "en:milk": "우유",
  "en:eggs": "달걀",
  "en:peanuts": "땅콩",
  "en:tree-nuts": "견과류",
  "en:fish": "생선",
  "en:shellfish": "갑각류",
  "en:soybeans": "대두",
  "en:sesame-seeds": "참깨",
  "en:celery": "셀러리",
  "en:mustard": "겨자",
  "en:sulphur-dioxide-and-sulphites": "아황산염",
  "en:lupin": "루핀",
  "en:molluscs": "연체동물",
};

function ScoreRing({ score, color, label }: { score: number; color: string; label: string }) {
  const r = 60;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div style={{ position: "relative", width: 148, height: 148 }}>
      <svg width="148" height="148" viewBox="0 0 148 148">
        <circle cx="74" cy="74" r={r} fill="none" stroke="rgba(245,242,236,0.08)" strokeWidth="2" />
        <circle
          cx="74"
          cy="74"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{ fontSize: 44, fontWeight: 700, color, letterSpacing: "-2px", lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "rgba(245,242,236,0.4)", letterSpacing: "2px", marginTop: 4 }}>
          {label}
        </span>
      </div>
    </div>
  );
}

function getNutriscoreColor(grade?: string): string {
  if (!grade) return "#8A8880";
  const colors: Record<string, string> = { a: "#2A8A5C", b: "#6BAD3D", c: "#C4780A", d: "#C05000", e: "#C44B4B" };
  return colors[grade.toLowerCase()] ?? "#8A8880";
}

interface CommunityPost {
  id: string;
  title: string;
  likes_count: number;
  comments_count: number;
}

// ── Additive risk data ────────────────────────────────────────────────────────
const VERY_HIGH_RISK_SET = new Set([
  "en:e102","en:e104","en:e110","en:e122","en:e123","en:e124","en:e129","en:e133",
  "en:e211","en:e249","en:e250","en:e251","en:e252","en:e310","en:e311","en:e312",
  "en:e320","en:e321","en:e924","en:e954",
]);
const HIGH_RISK_SET = new Set([
  "en:e150d","en:e210","en:e212","en:e213","en:e219","en:e621","en:e951","en:e950",
  "en:e952","en:e961","en:e999","en:e407","en:e171","en:e172","en:e173",
]);
const MEDIUM_RISK_SET = new Set([
  "en:e220","en:e221","en:e222","en:e223","en:e224","en:e226","en:e433","en:e471",
  "en:e472e","en:e476","en:e627","en:e631","en:e635","en:e900","en:e942",
]);

type AdditiveRisk = "very-high" | "high" | "medium" | "low";
function getAdditiveRisk(tag: string): AdditiveRisk {
  if (VERY_HIGH_RISK_SET.has(tag)) return "very-high";
  if (HIGH_RISK_SET.has(tag)) return "high";
  if (MEDIUM_RISK_SET.has(tag)) return "medium";
  return "low";
}

const ADDITIVE_LABELS: Record<string, string> = {
  "en:e100":"쿠르쿠민","en:e101":"리보플라빈","en:e102":"타르트라진","en:e104":"퀴놀린 옐로",
  "en:e110":"선셋 옐로 FCF","en:e120":"코치닐","en:e122":"카르모이신","en:e123":"아마란스",
  "en:e124":"폰소 4R","en:e129":"알루라 레드 AC","en:e131":"패턴트 블루 V","en:e133":"브릴리언트 블루 FCF",
  "en:e150a":"캐러멜 색소 I","en:e150d":"캐러멜 색소 IV (4-MEI)","en:e160a":"베타카로틴",
  "en:e160c":"파프리카 색소","en:e171":"이산화티타늄","en:e172":"산화철","en:e173":"알루미늄",
  "en:e200":"소르빈산","en:e202":"소르빈산칼륨","en:e210":"안식향산","en:e211":"안식향산나트륨",
  "en:e212":"안식향산칼륨","en:e213":"안식향산칼슘","en:e219":"메틸히드록시안식향산나트륨",
  "en:e220":"이산화황","en:e221":"아황산나트륨","en:e222":"중아황산나트륨","en:e223":"메타중아황산나트륨",
  "en:e224":"메타중아황산칼륨","en:e226":"아황산칼슘","en:e249":"아질산칼륨","en:e250":"아질산나트륨",
  "en:e251":"질산나트륨","en:e252":"질산칼륨","en:e282":"프로피온산칼슘","en:e296":"말산",
  "en:e300":"비타민C (아스코르빈산)","en:e301":"아스코르빈산나트륨","en:e306":"비타민E (토코페롤)",
  "en:e307":"알파토코페롤","en:e310":"몰식자산프로필","en:e320":"BHA","en:e321":"BHT",
  "en:e322":"레시틴","en:e330":"구연산","en:e331":"구연산나트륨","en:e332":"구연산칼륨",
  "en:e334":"주석산","en:e338":"인산","en:e339":"인산나트륨","en:e340":"인산칼륨",
  "en:e407":"카라기난","en:e410":"메뚜기콩검","en:e412":"구아검","en:e415":"잔탄검",
  "en:e422":"글리세린","en:e433":"폴리소르베이트 80","en:e440":"펙틴","en:e450":"이인산염",
  "en:e451":"삼인산염","en:e452":"폴리인산염","en:e460":"셀룰로오스","en:e471":"모노디글리세라이드",
  "en:e472e":"DATEM","en:e476":"폴리글리세롤 폴리리시놀레이트","en:e500":"탄산나트륨",
  "en:e500ii":"중탄산나트륨 (베이킹소다)","en:e503":"탄산암모늄","en:e507":"염산",
  "en:e621":"글루탐산모노나트륨 (MSG)","en:e627":"5'-구아닐산이나트륨","en:e631":"5'-이노신산이나트륨",
  "en:e635":"리보뉴클레오타이드이나트륨","en:e900":"폴리디메틸실록산","en:e901":"밀납",
  "en:e942":"아산화질소","en:e950":"아세설팜 K","en:e951":"아스파탐","en:e952":"사이클라메이트",
  "en:e954":"사카린","en:e955":"수크랄로스","en:e960":"스테비아","en:e961":"네오탐",
  "en:e965":"말티톨","en:e967":"자일리톨","en:e999":"퀼라이아 추출물",
};

const ADDITIVE_RISK_CONFIG: Record<AdditiveRisk, { label: string; color: string; bg: string }> = {
  "very-high": { label: "위험", color: "#C44B4B", bg: "rgba(196,75,75,0.08)" },
  "high":      { label: "주의", color: "#C05000", bg: "rgba(192,80,0,0.07)" },
  "medium":    { label: "경고", color: "#C4780A", bg: "rgba(196,120,10,0.07)" },
  "low":       { label: "안전", color: "#2A8A5C", bg: "rgba(42,138,92,0.06)" },
};

// ── Nutrition Table ───────────────────────────────────────────────────────────
const DV = { kcal: 2000, carbs: 324, sugars: 100, protein: 55, fat: 54, satFat: 15, sodium: 2, fiber: 25 };

function NutritionTable({ nutriments }: { nutriments: Nutriments }) {
  const rows: Array<{ label: string; value: number | undefined; unit: string; dv: number | null; indent?: boolean }> = [
    { label: "열량",     value: nutriments["energy-kcal"],      unit: "kcal", dv: DV.kcal },
    { label: "탄수화물", value: nutriments.carbohydrates,        unit: "g",    dv: DV.carbs },
    { label: "당류",     value: nutriments.sugars,              unit: "g",    dv: DV.sugars,  indent: true },
    { label: "식이섬유", value: nutriments.fiber,               unit: "g",    dv: DV.fiber,   indent: true },
    { label: "단백질",   value: nutriments.proteins,            unit: "g",    dv: DV.protein },
    { label: "지방",     value: nutriments.fat,                 unit: "g",    dv: DV.fat },
    { label: "포화지방", value: nutriments["saturated-fat"],    unit: "g",    dv: DV.satFat,  indent: true },
    { label: "트랜스지방",value: nutriments["trans-fat"],       unit: "g",    dv: null,       indent: true },
    { label: "나트륨",   value: nutriments.sodium != null ? nutriments.sodium * 1000 : undefined, unit: "mg", dv: DV.sodium * 1000 },
  ].filter(r => r.value != null && r.value > 0);

  if (rows.length === 0) return null;

  return (
    <div style={{ paddingTop: 32, paddingBottom: 32, borderBottom: "0.5px solid #D8D4CC" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "3px" }}>NUTRITION FACTS</p>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", letterSpacing: "1px" }}>100G 기준</p>
      </div>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#D8D4CC", letterSpacing: "1px", marginBottom: 16 }}>일일 영양소 기준치 2000kcal 기준</p>
      <div style={{ border: "0.5px solid #EDEAE3", borderRadius: 10, overflow: "hidden" }}>
        {rows.map((row, i) => {
          const pct = row.dv ? Math.round(((row.value ?? 0) / row.dv) * 100) : null;
          const isHigh = pct != null && pct > 30;
          const isVeryHigh = pct != null && pct > 60;
          return (
            <div key={row.label} style={{
              display: "flex",
              alignItems: "center",
              padding: "9px 14px",
              borderBottom: i < rows.length - 1 ? "0.5px solid #EDEAE3" : "none",
              background: isVeryHigh ? "rgba(196,75,75,0.04)" : "transparent",
            }}>
              <span style={{ fontSize: 12, fontWeight: row.indent ? 300 : 400, color: "#0A0A0A", flex: 1, paddingLeft: row.indent ? 14 : 0 }}>
                {row.label}
              </span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: isHigh ? "#C44B4B" : "#0A0A0A" }}>
                {(row.value ?? 0).toFixed(row.unit === "kcal" || row.unit === "mg" ? 0 : 1)}{row.unit}
              </span>
              {pct != null && (
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: isVeryHigh ? "#C44B4B" : isHigh ? "#C05000" : "#8A8880", width: 36, textAlign: "right", marginLeft: 6 }}>
                  {pct}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Additives List ────────────────────────────────────────────────────────────
function AdditivesList({ additives_tags }: { additives_tags: string[] }) {
  const router = useRouter();
  if (!additives_tags.length) return null;

  const sorted = [...additives_tags].sort((a, b) => {
    const order: Record<AdditiveRisk, number> = { "very-high": 0, high: 1, medium: 2, low: 3 };
    return order[getAdditiveRisk(a)] - order[getAdditiveRisk(b)];
  });

  return (
    <div style={{ paddingTop: 32, paddingBottom: 32, borderBottom: "0.5px solid #D8D4CC" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "3px" }}>ADDITIVES ({additives_tags.length})</p>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", letterSpacing: "1px" }}>TAP TO LEARN MORE</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {sorted.map((tag, i) => {
          const risk = getAdditiveRisk(tag);
          const cfg = ADDITIVE_RISK_CONFIG[risk];
          const code = tag.replace("en:", "").toUpperCase();
          const name = ADDITIVE_LABELS[tag] ?? code;
          return (
            <div
              key={tag}
              onClick={() => router.push(`/ingredient/${encodeURIComponent(name)}`)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: i === 0 ? 0 : 10,
                paddingBottom: 10,
                borderBottom: i < sorted.length - 1 ? "0.5px solid #EDEAE3" : "none",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#D8D4CC", flexShrink: 0, width: 32 }}>{code}</span>
                <span style={{ fontSize: 13, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
              </div>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 7,
                letterSpacing: "0.5px",
                color: cfg.color,
                background: cfg.bg,
                border: `0.5px solid ${cfg.color}40`,
                borderRadius: 3,
                padding: "2px 6px",
                flexShrink: 0,
                marginLeft: 8,
              }}>{cfg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Star helper ──────────────────────────────────────────────────────────────
function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    <span style={{ fontSize: size, lineHeight: 1 }}>
      <span style={{ color: "#C4780A" }}>{"★".repeat(full)}</span>
      {half === 1 && <span style={{ color: "#C4780A", opacity: 0.5 }}>★</span>}
      <span style={{ color: "#D8D4CC" }}>{"★".repeat(empty)}</span>
    </span>
  );
}

// ── Review Section ────────────────────────────────────────────────────────────
interface SupabaseReview {
  id: string;
  user_id: string;
  rating: number;
  title: string;
  content: string;
  helpful_count: number;
  created_at: string;
}

function ReviewSection({ barcode, productName }: { barcode: string; productName: string }) {
  const supabase = createClient();
  const [reviews, setReviews] = useState<DummyReview[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (!supabase) return;
      // Try Supabase reviews
      const { data: sbData } = await supabase
        .from("product_reviews")
        .select("id, user_id, rating, title, content, helpful_count, created_at")
        .eq("product_barcode", barcode)
        .order("created_at", { ascending: false })
        .limit(10);

      // Check auth
      const { data: authData } = await supabase.auth.getUser();
      setUserId(authData.user?.id ?? null);

      if (sbData && sbData.length > 0) {
        const mapped: DummyReview[] = (sbData as SupabaseReview[]).map((r) => ({
          id: r.id,
          user_name: r.user_id.slice(0, 8) + "...",
          rating: r.rating,
          title: r.title,
          content: r.content,
          helpful_count: r.helpful_count,
          created_at: r.created_at.slice(0, 10),
        }));
        setReviews(mapped);
      } else {
        // Fall back to dummy data
        setReviews(DUMMY_REVIEWS[barcode] ?? []);
      }
      setLoaded(true);
    })();
  }, [barcode, supabase]);

  const handleSubmit = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSubmitting(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) { setSubmitting(false); return; }
    await supabase.from("product_reviews").insert({
      user_id: authData.user.id,
      product_barcode: barcode,
      rating: newRating,
      title: newTitle.trim(),
      content: newContent.trim(),
      helpful_count: 0,
    });
    setShowModal(false);
    setNewTitle("");
    setNewContent("");
    setSubmitting(false);
    // Reload reviews
    const { data } = await supabase
      .from("product_reviews")
      .select("id, user_id, rating, title, content, helpful_count, created_at")
      .eq("product_barcode", barcode)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data && data.length > 0) {
      const mapped: DummyReview[] = (data as SupabaseReview[]).map((r) => ({
        id: r.id,
        user_name: r.user_id.slice(0, 8) + "...",
        rating: r.rating,
        title: r.title,
        content: r.content,
        helpful_count: r.helpful_count,
        created_at: r.created_at.slice(0, 10),
      }));
      setReviews(mapped);
    }
  };

  if (!loaded) return null;

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : getDisplayRating(0);
  const totalReviews = reviews.length > 0 ? reviews.length : getDisplayReviewCount(barcode);

  // Rating distribution
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
    pct: reviews.length > 0
      ? Math.round((reviews.filter((r) => Math.round(r.rating) === star).length / reviews.length) * 100)
      : [60, 25, 10, 3, 2][5 - star],
  }));

  return (
    <div style={{ marginBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "3px" }}>REVIEWS</p>
        <button
          onClick={() => {
            if (!userId) { alert("리뷰 작성은 로그인 후 가능합니다."); return; }
            setShowModal(true);
          }}
          style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#0A0A0A", background: "none", border: "0.5px solid #0A0A0A", borderRadius: 4, cursor: "pointer", letterSpacing: "1px", padding: "4px 10px" }}
        >
          WRITE +
        </button>
      </div>

      {/* Summary row */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, paddingBottom: 16, borderBottom: "0.5px solid #D8D4CC", marginBottom: 16 }}>
        {/* Big rating */}
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#0A0A0A", letterSpacing: "-1px", lineHeight: 1 }}>
            {reviews.length > 0 ? avgRating.toFixed(1) : getDisplayRating(50).toFixed(1)}
          </div>
          <Stars rating={reviews.length > 0 ? avgRating : getDisplayRating(50)} size={12} />
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", marginTop: 4 }}>{totalReviews}개 리뷰</p>
        </div>
        {/* Distribution bars */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          {dist.map(({ star, pct }) => (
            <div key={star} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", width: 8, textAlign: "right" }}>{star}</span>
              <span style={{ color: "#C4780A", fontSize: 9 }}>★</span>
              <div style={{ flex: 1, height: 4, background: "#EDEAE3", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "#C4780A", borderRadius: 2 }} />
              </div>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", width: 24, textAlign: "right" }}>{pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review list */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {(reviews.length > 0 ? reviews : DUMMY_REVIEWS[barcode] ?? []).slice(0, 5).map((review, i, arr) => (
          <div key={review.id} style={{ paddingTop: i === 0 ? 0 : 16, paddingBottom: 16, borderBottom: i < arr.length - 1 ? "0.5px solid #D8D4CC" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#EDEAE3", border: "0.5px solid #D8D4CC", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880" }}>{review.user_name.slice(0, 1).toUpperCase()}</span>
                </div>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880" }}>{review.user_name}</span>
              </div>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880" }}>{review.created_at}</span>
            </div>
            <Stars rating={review.rating} size={11} />
            <p style={{ fontSize: 13, fontWeight: 500, color: "#0A0A0A", marginTop: 6, marginBottom: 4 }}>{review.title}</p>
            <p style={{ fontSize: 12, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.55 }}>{review.content}</p>
            {review.helpful_count > 0 && (
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", marginTop: 8 }}>
                {review.helpful_count}명에게 도움이 됐어요
              </p>
            )}
          </div>
        ))}
        {reviews.length === 0 && DUMMY_REVIEWS[barcode] === undefined && (
          <p style={{ fontSize: 13, fontWeight: 300, color: "#8A8880", lineHeight: 1.5, paddingTop: 4 }}>
            아직 리뷰가 없어요. 첫 번째 리뷰를 남겨보세요 →
          </p>
        )}
      </div>

      {/* Write modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(10,10,10,0.5)" }} onClick={() => setShowModal(false)} />
          <div style={{ position: "relative", width: "100%", maxWidth: 480, margin: "0 auto", background: "#F5F2EC", borderRadius: "20px 20px 0 0", padding: "24px 24px 40px" }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px", marginBottom: 16 }}>WRITE A REVIEW</p>
            <p style={{ fontSize: 13, fontWeight: 400, color: "#0A0A0A", marginBottom: 16, lineHeight: 1.4 }}>{productName}</p>
            {/* Star picker */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setNewRating(s)} style={{ fontSize: 24, background: "none", border: "none", cursor: "pointer", color: s <= newRating ? "#C4780A" : "#D8D4CC", padding: "8px", lineHeight: 1, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>★</button>
              ))}
            </div>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="제목"
              maxLength={60}
              style={{ width: "100%", padding: "12px 14px", background: "#EDEAE3", border: "0.5px solid #D8D4CC", borderRadius: 10, fontSize: 14, color: "#0A0A0A", outline: "none", marginBottom: 10, boxSizing: "border-box" }}
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="이 제품에 대한 경험을 공유해주세요."
              rows={4}
              maxLength={500}
              style={{ width: "100%", padding: "12px 14px", background: "#EDEAE3", border: "0.5px solid #D8D4CC", borderRadius: 10, fontSize: 13, color: "#0A0A0A", outline: "none", resize: "none", fontFamily: "inherit", marginBottom: 14, boxSizing: "border-box" }}
            />
            <button
              onClick={() => { void handleSubmit(); }}
              disabled={submitting || !newTitle.trim() || !newContent.trim()}
              style={{ width: "100%", padding: "14px", background: "#0A0A0A", color: "#F5F2EC", border: "none", borderRadius: 2, fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "2px", cursor: "pointer", opacity: submitting || !newTitle.trim() || !newContent.trim() ? 0.4 : 1 }}
            >
              {submitting ? "등록 중..." : "리뷰 등록"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CommunitySection({ barcode, productName }: { barcode: string; productName: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!supabase) { setLoaded(true); return; }
      const { data } = await supabase
        .from("community_posts")
        .select("id, title, likes_count, comments_count")
        .eq("product_barcode", barcode)
        .order("likes_count", { ascending: false })
        .limit(3);
      setPosts((data as CommunityPost[]) ?? []);
      setLoaded(true);
    })();
  }, [barcode, supabase]);

  if (!loaded) return null;

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "3px" }}>
          COMMUNITY
        </p>
        <button
          onClick={() => router.push("/community/write?product=" + encodeURIComponent(productName) + "&barcode=" + encodeURIComponent(barcode))}
          style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", background: "none", border: "none", cursor: "pointer", letterSpacing: "1px", padding: "10px 8px" }}
        >
          WRITE +
        </button>
      </div>

      {posts.length === 0 ? (
        <div
          style={{ paddingTop: 16, paddingBottom: 16, borderTop: "0.5px solid #D8D4CC", borderBottom: "0.5px solid #D8D4CC", cursor: "pointer" }}
          onClick={() => router.push("/community/write?product=" + encodeURIComponent(productName) + "&barcode=" + encodeURIComponent(barcode))}
        >
          <p style={{ fontSize: 13, fontWeight: 300, color: "#8A8880", letterSpacing: "-0.1px" }}>
            이 제품에 대한 첫 번째 경험을 공유해보세요 →
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {posts.map((p, i) => (
            <div
              key={p.id}
              onClick={() => router.push(`/community/${p.id}`)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: i === 0 ? 0 : 14,
                paddingBottom: 14,
                borderBottom: "0.5px solid #D8D4CC",
                cursor: "pointer",
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 300, color: "#0A0A0A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 12, letterSpacing: "-0.1px" }}>
                {p.title}
              </p>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", flexShrink: 0 }}>
                ♥ {p.likes_count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductCard({ product }: { product: ProductData }) {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    if (product.source === "not_found" || !product.name) return;

    try {
      const raw = localStorage.getItem("hindsight_recent_scans");
      const existing: { barcode: string; name: string; score: number; color: string; timestamp: number }[] =
        raw ? JSON.parse(raw) : [];
      const filtered = existing.filter((s) => s.barcode !== product.barcode);
      filtered.unshift({
        barcode: product.barcode,
        name: product.name,
        score: product.score.total,
        color: product.score.color,
        timestamp: Date.now(),
      });
      localStorage.setItem("hindsight_recent_scans", JSON.stringify(filtered.slice(0, 10)));
    } catch { /* ignore */ }

    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const res = await supabase.auth.getUser();
      if (!res.data.user) return;
      await supabase.from("scan_history").insert({
        user_id: res.data.user.id,
        barcode: product.barcode,
        product_name: product.name,
        score: product.score.total,
      });
    })();
  }, [product]);

  useEffect(() => {
    if (!product.ingredients || product.source === "not_found") return;
    setLoadingAnalysis(true);
    fetch("/api/analyze-ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: product.name,
        brand: product.brand,
        ingredients: product.ingredients,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        setAnalysis(data);
        setLoadingAnalysis(false);
      })
      .catch(() => setLoadingAnalysis(false));
  }, [product]);

  const { score } = product;

  if (product.source === "not_found") {
    return (
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 28px",
        gap: 24,
        textAlign: "center",
      }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "3px", marginBottom: 4 }}>
          NOT FOUND
        </p>
        <h3 style={{ fontSize: 28, fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.8px", lineHeight: 1.15 }}>
          제품 정보를<br />찾을 수 없어요
        </h3>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1px" }}>
          {product.barcode}
        </p>
        <button
          onClick={() => router.push("/scan")}
          style={{
            padding: "14px 32px",
            background: "#0A0A0A",
            color: "#F5F2EC",
            border: "none",
            borderRadius: 2,
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            letterSpacing: "2.5px",
            cursor: "pointer",
            marginTop: 8,
          }}
        >
          SCAN AGAIN
        </button>
      </div>
    );
  }

  const allergenLabels = (product.allergens_tags ?? [])
    .map((t) => KNOWN_ALLERGENS[t] ?? t.replace("en:", "").replace(/-/g, " "))
    .slice(0, 6);

  const ingredientList = product.ingredients
    ? product.ingredients
        .split(/,(?![^(]*\))/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  return (
    <div>
      {/* Dark hero */}
      <div style={{ background: "#0A0A0A" }}>
        {/* Large product image */}
        {product.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            style={{
              width: "100%",
              height: 240,
              objectFit: "contain",
              background: "#111",
              display: "block",
            }}
          />
        )}

        <div style={{ padding: product.image ? "28px 28px 40px" : "56px 28px 40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Score ring */}
          <ScoreRing score={score.total} color={score.color} label={score.label} />

          {/* Product info */}
          <div style={{ textAlign: "center", marginTop: 24, width: "100%" }}>
            {product.brand && (
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#3A3A38", letterSpacing: "2px", marginBottom: 8 }}>
                {product.brand.toUpperCase()}
              </p>
            )}
            <h2 style={{ fontSize: 22, fontWeight: 600, color: "#F5F2EC", lineHeight: 1.25, letterSpacing: "-0.5px", marginBottom: 8 }}>
              {product.name}
            </h2>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2A2A28", letterSpacing: "1px" }}>
              {product.barcode}
            </p>
          </div>

          {/* Nutriscore + NOVA inline */}
          {(product.nutriscore_grade || product.nova_group) && (
            <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
              {product.nutriscore_grade && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#3A3A38", letterSpacing: "1.5px" }}>NUTRI</span>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 12,
                    fontWeight: 500,
                    color: getNutriscoreColor(product.nutriscore_grade),
                    letterSpacing: "1px",
                  }}>
                    {product.nutriscore_grade.toUpperCase()}
                  </span>
                </div>
              )}
              {product.nova_group && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#3A3A38", letterSpacing: "1.5px" }}>NOVA</span>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 12,
                    fontWeight: 500,
                    color: ["", "#2A8A5C", "#C4780A", "#C05000", "#C44B4B"][product.nova_group] ?? "#8A8880",
                    letterSpacing: "1px",
                  }}>
                    {product.nova_group}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 28px" }}>

        {/* Score breakdown — table style */}
        <div style={{ paddingTop: 40, paddingBottom: 32, borderBottom: "0.5px solid #D8D4CC" }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "3px", marginBottom: 24 }}>
            SCORE BREAKDOWN
          </p>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Base */}
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 12, borderBottom: "0.5px solid #EDEAE3" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1px" }}>BASE</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880" }}>50</span>
            </div>

            {score.nutriScore !== 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, paddingBottom: 10, borderBottom: "0.5px solid #EDEAE3" }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1px" }}>NUTRI-SCORE</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: score.nutriScore > 0 ? "#2A8A5C" : "#C44B4B" }}>
                  {score.nutriScore > 0 ? "+" : ""}{score.nutriScore}
                </span>
              </div>
            )}
            {score.novaScore !== 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, paddingBottom: 10, borderBottom: "0.5px solid #EDEAE3" }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1px" }}>NOVA (가공도)</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: score.novaScore > 0 ? "#2A8A5C" : "#C44B4B" }}>
                  {score.novaScore > 0 ? "+" : ""}{score.novaScore}
                </span>
              </div>
            )}
            {score.additivesScore !== 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, paddingBottom: 10, borderBottom: "0.5px solid #EDEAE3" }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1px" }}>첨가물 ({score.additivesCount}개)</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#C44B4B" }}>{score.additivesScore}</span>
              </div>
            )}
            {score.allergenScore !== 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, paddingBottom: 10, borderBottom: "0.5px solid #EDEAE3" }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1px" }}>알러지 ({score.allergensCount}종)</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#C05000" }}>{score.allergenScore}</span>
              </div>
            )}

            {/* Total */}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 14, marginTop: 2 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#0A0A0A", letterSpacing: "1.5px" }}>TOTAL</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 500, color: score.color, letterSpacing: "-0.5px" }}>{score.total}</span>
            </div>
          </div>
        </div>

        {/* Nutrition Table */}
        {product.nutriments && <NutritionTable nutriments={product.nutriments} />}

        {/* Additives List */}
        {(product.additives_tags?.length ?? 0) > 0 && (
          <AdditivesList additives_tags={product.additives_tags!} />
        )}

        {/* Allergens */}
        {allergenLabels.length > 0 && (
          <div style={{ paddingTop: 32, paddingBottom: 32, borderBottom: "0.5px solid #D8D4CC" }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "3px", marginBottom: 16 }}>
              ALLERGENS
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {allergenLabels.map((a) => (
                <span
                  key={a}
                  style={{
                    padding: "5px 12px",
                    border: "0.5px solid rgba(192,80,0,0.3)",
                    borderRadius: 2,
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 9,
                    color: "#C05000",
                    letterSpacing: "0.5px",
                  }}
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Ingredients — numbered list */}
        {ingredientList.length > 0 && (
          <div style={{ paddingTop: 32, paddingBottom: 32, borderBottom: "0.5px solid #D8D4CC" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "3px" }}>
                INGREDIENTS
              </p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", letterSpacing: "1px" }}>
                TAP TO ANALYZE
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {ingredientList.map((item, i) => (
                <Link
                  key={i}
                  href={`/ingredient/${encodeURIComponent(item)}`}
                  style={{ textDecoration: "none" }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 14,
                    paddingTop: i === 0 ? 0 : 10,
                    paddingBottom: 10,
                    borderBottom: i < ingredientList.length - 1 ? "0.5px solid #EDEAE3" : "none",
                  }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#D8D4CC", letterSpacing: "0.5px", flexShrink: 0, width: 18 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.4, letterSpacing: "-0.1px" }}>
                      {item}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* AI Analysis */}
        <div style={{ paddingTop: 32, paddingBottom: 32, borderBottom: "0.5px solid #D8D4CC" }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "3px", marginBottom: 20 }}>
            AI HEALTH ANALYSIS
          </p>

          {loadingAnalysis && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 14,
                height: 14,
                border: "1px solid #D8D4CC",
                borderTopColor: "#0A0A0A",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                flexShrink: 0,
              }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px" }}>
                ANALYZING...
              </span>
            </div>
          )}

          {analysis && !loadingAnalysis && (
            <div>
              {/* Verdict */}
              <div style={{ marginBottom: 16 }}>
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9,
                  color: analysis.verdictColor,
                  letterSpacing: "1.5px",
                }}>
                  {analysis.verdict}
                </span>
              </div>

              <p style={{ fontSize: 14, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.65, marginBottom: 20, letterSpacing: "-0.1px" }}>
                {analysis.body}
              </p>

              {analysis.risks?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#C44B4B", letterSpacing: "2px", marginBottom: 10 }}>
                    CONCERNS
                  </p>
                  {analysis.risks.map((r, i) => (
                    <p key={i} style={{ fontSize: 13, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.5, marginBottom: 6, paddingLeft: 12, borderLeft: "1px solid #C44B4B", letterSpacing: "-0.1px" }}>
                      {r}
                    </p>
                  ))}
                </div>
              )}

              {analysis.saferTips?.length > 0 && (
                <div>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#2A8A5C", letterSpacing: "2px", marginBottom: 10 }}>
                    TIPS
                  </p>
                  {analysis.saferTips.map((t, i) => (
                    <p key={i} style={{ fontSize: 13, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.5, marginBottom: 6, paddingLeft: 12, borderLeft: "1px solid #2A8A5C", letterSpacing: "-0.1px" }}>
                      {t}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Review section */}
        <div style={{ paddingTop: 40 }}>
          <ReviewSection barcode={product.barcode} productName={product.name} />
        </div>

        {/* Community section */}
        <div style={{ paddingTop: 0 }}>
          <CommunitySection barcode={product.barcode} productName={product.name} />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, paddingBottom: 40 }}>
          <button
            onClick={() => router.push("/scan")}
            style={{
              flex: 1,
              padding: "15px",
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
            SCAN AGAIN
          </button>
          <button
            onClick={() => router.push("/")}
            style={{
              flex: 1,
              padding: "15px",
              background: "none",
              color: "#0A0A0A",
              border: "0.5px solid #D8D4CC",
              borderRadius: 2,
              fontFamily: "'DM Mono', monospace",
              fontSize: 9,
              letterSpacing: "2px",
              cursor: "pointer",
            }}
          >
            HOME
          </button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
