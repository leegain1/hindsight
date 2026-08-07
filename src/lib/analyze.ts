/**
 * 규칙 기반 점수 계산.
 *
 * **여기에 LLM 은 없다.** 판독은 photoExtract.ts 가 하고, 이 모듈은 판독 결과를
 * data/ingredient_risk_db.json 의 규칙에 대조해 점수를 낸다.
 *
 * 왜 나눴나: 한 번의 LLM 호출로 점수까지 내면 모델이 숫자를 지어내고, "왜 58점인가"
 * 를 설명할 수 없다. 발표에서 "광고가 아니라 근거로"를 주장하려면 감점 근거가
 * 코드 안에 있어야 하고, 같은 사진은 항상 같은 점수가 나와야 한다.
 *
 *   최종점수 = clamp(0, 100 - 영양감점 - 주의성분감점)
 */

import db from "../../data/ingredient_risk_db.json";
import type { ExtractedIngredient, ExtractedNutrition } from "./photoExtract";
import type { HealthProfile } from "./profiling";

// ── DB 타입 ────────────────────────────────────────────────────────────────

interface NutrientBand {
  /** 이 구간의 상한(포함). null 이면 그 이상 전부 */
  max: number | null;
  penalty: number;
}

type NutrientKey = "sugar_g" | "sodium_mg" | "sat_fat_g";

interface CautionEntry {
  category: string;
  penalty: number;
  aliases?: string[];
  sensitive_group?: string[];
}

const NUTRIENT_RULES = db.nutrient_rules as Record<NutrientKey, NutrientBand[]>;
const CAUTION = db.caution_ingredients as Record<string, CautionEntry>;
const WEIGHTS = db.personalization_weights as Record<string, Record<string, number>>;

const NUTRIENT_LABEL: Record<NutrientKey, string> = {
  sugar_g: "당류",
  sodium_mg: "나트륨",
  sat_fat_g: "포화지방",
};

const NUTRIENT_UNIT: Record<NutrientKey, string> = {
  sugar_g: "g",
  sodium_mg: "mg",
  sat_fat_g: "g",
};

// ── 결과 타입 ──────────────────────────────────────────────────────────────

/** 감점 한 건. 화면에서 "왜 이 점수인지" 그대로 보여줄 수 있어야 한다. */
export interface Deduction {
  kind: "nutrient" | "ingredient";
  /** 화면에 쓰는 이름 — 영양소명 또는 DB 의 성분 표준명 */
  label: string;
  /** 사진에서 실제로 읽은 표기 (성분일 때만). 표준명과 다를 수 있다 */
  matchedAs?: string;
  category?: string;
  /** 가중치 적용 전 기본 감점 */
  basePenalty: number;
  /** 개인화 가중치 (1이면 미적용) */
  weight: number;
  /** 실제로 깎인 점수 = round(basePenalty * weight) */
  penalty: number;
  /** 왜 깎였는지 한 줄 */
  reason: string;
  /** 이 감점이 개인 조건 때문에 커졌는지 */
  personalized: boolean;
}

export interface AnalysisScore {
  /** 개인 조건을 뺀 기본 점수 */
  baseScore: number;
  /** 개인 조건을 반영한 점수. 조건이 없으면 baseScore 와 같다 */
  personalScore: number;
  nutrientPenalty: number;
  ingredientPenalty: number;
  deductions: Deduction[];
  /** 적용된 개인화 키 (당관리·혈압관리·체중관리·임신) */
  appliedGoals: string[];
  /**
   * 영양성분 중 판독하지 못해 감점 계산에서 빠진 항목.
   * 비어 있지 않으면 점수는 "부분 판독" 이며 화면에서 그렇게 표시해야 한다 —
   * 안 읽힌 걸 0 으로 치면 실제보다 후한 점수가 나온다.
   */
  skippedNutrients: string[];
  /** 사용자가 "피하고 싶다"고 고른 성분과 일치한 항목 (점수에는 영향 없음) */
  avoidHits: string[];
}

// ── 매칭 ───────────────────────────────────────────────────────────────────

/**
 * 표기 흔들림을 흡수한다. 공백·하이픈·가운뎃점을 지우고 영문은 소문자로.
 * 예) "아세설팜 칼륨" · "acesulfame-K" → "아세설팜칼륨" · "acesulfamek"
 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s\-·・_()（）]/g, "");
}

/**
 * 부분 매칭 — 양방향으로 본다.
 * 사진에는 "아세설팜칼륨"이 찍히는데 DB alias 는 "아세설팜"이라 한쪽만 보면 놓친다.
 */
function matches(ingredientName: string, term: string): boolean {
  const a = normalize(ingredientName);
  const b = normalize(term);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

// ── 개인화 ─────────────────────────────────────────────────────────────────

/**
 * 앱의 건강 설문 답변을 DB 의 personalization_weights 키로 옮긴다.
 *
 * 설문 선택지와 DB 키가 다른 말을 쓴다(설문 "혈당 관리" ↔ DB "당관리").
 * 질환도 목표와 같은 신호로 본다 — 당뇨가 있으면 당 관리가 목표든 아니든
 * 당류 감점은 더 무겁게 봐야 한다.
 */
export function toPersonalizationKeys(profile: HealthProfile | null): string[] {
  if (!profile) return [];
  const goals = profile.goals ?? [];
  const conditions = profile.conditions ?? [];
  const has = (list: string[], term: string) =>
    list.some((v) => v.replace(/\s/g, "").includes(term));

  const keys: string[] = [];
  if (has(goals, "혈당") || has(conditions, "당뇨")) keys.push("당관리");
  if (has(goals, "혈압") || has(conditions, "고혈압")) keys.push("혈압관리");
  if (has(goals, "체중")) keys.push("체중관리");
  if (has(conditions, "임신")) keys.push("임신");
  return keys;
}

/** 해당 대상(영양소 키 또는 성분 표준명)에 적용될 가중치. 없으면 1 */
function weightFor(target: string, appliedGoals: string[]): number {
  let w = 1;
  for (const goal of appliedGoals) {
    const v = WEIGHTS[goal]?.[target];
    // 여러 목표가 같은 대상을 가리키면 가장 큰 가중치를 쓴다.
    // 곱하면 목표를 많이 고른 사람만 점수가 급격히 무너진다.
    if (typeof v === "number" && v > w) w = v;
  }
  return w;
}

// ── 감점 계산 ──────────────────────────────────────────────────────────────

function bandPenalty(bands: NutrientBand[], value: number): number {
  for (const band of bands) {
    if (band.max === null || value <= band.max) return band.penalty;
  }
  return bands[bands.length - 1]?.penalty ?? 0;
}

function scoreNutrition(
  nutrition: ExtractedNutrition,
  appliedGoals: string[],
): { deductions: Deduction[]; skipped: string[] } {
  const deductions: Deduction[] = [];
  const skipped: string[] = [];

  for (const key of Object.keys(NUTRIENT_RULES) as NutrientKey[]) {
    const value = nutrition[key];

    // 판독 못 한 값은 0 으로 치지 않는다 — 실제보다 후한 점수가 나온다
    if (value === null || value === undefined || Number.isNaN(value)) {
      skipped.push(NUTRIENT_LABEL[key]);
      continue;
    }

    const base = bandPenalty(NUTRIENT_RULES[key], value);
    if (base === 0) continue;

    const weight = weightFor(key, appliedGoals);
    deductions.push({
      kind: "nutrient",
      label: NUTRIENT_LABEL[key],
      basePenalty: base,
      weight,
      penalty: Math.round(base * weight),
      reason: `${NUTRIENT_LABEL[key]} ${value}${NUTRIENT_UNIT[key]}`,
      personalized: weight > 1,
    });
  }

  return { deductions, skipped };
}

function scoreIngredients(
  ingredients: ExtractedIngredient[],
  appliedGoals: string[],
): Deduction[] {
  const deductions: Deduction[] = [];

  for (const [standardName, entry] of Object.entries(CAUTION)) {
    const terms = [standardName, ...(entry.aliases ?? [])];
    // 한 성분이 여러 표기로 잡혀도 감점은 한 번만 한다
    const hit = ingredients.find((ing) => terms.some((t) => matches(ing.name, t)));
    if (!hit) continue;

    const weight = weightFor(standardName, appliedGoals);
    const sensitive = entry.sensitive_group?.length
      ? ` · ${entry.sensitive_group.join("·")} 주의`
      : "";

    deductions.push({
      kind: "ingredient",
      label: standardName,
      matchedAs: hit.name,
      category: entry.category,
      basePenalty: entry.penalty,
      weight,
      penalty: Math.round(entry.penalty * weight),
      reason: `${entry.category}${sensitive}`,
      personalized: weight > 1,
    });
  }

  // 감점이 큰 것부터 — 화면에서 위에 오는 게 실제로 중요한 것이어야 한다
  return deductions.sort((a, b) => b.penalty - a.penalty);
}

/** 사용자가 피하고 싶다고 고른 항목과의 일치 — 점수는 건드리지 않고 표시만 한다 */
function findAvoidHits(
  ingredients: ExtractedIngredient[],
  deductions: Deduction[],
  profile: HealthProfile | null,
): string[] {
  const avoid = profile?.avoid ?? [];
  if (avoid.length === 0) return [];

  const hits = new Set<string>();
  for (const term of avoid) {
    const t = normalize(term);
    // 카테고리로도 본다: "인공 감미료" 를 고르면 아스파탐·수크랄로스가 걸린다
    for (const d of deductions) {
      if (d.kind === "ingredient" && d.category && normalize(d.category).includes(t)) {
        hits.add(d.label);
      }
    }
    for (const ing of ingredients) {
      if (matches(ing.name, term)) hits.add(ing.name);
    }
  }
  return [...hits];
}

// ── 진입점 ─────────────────────────────────────────────────────────────────

export function analyze(
  ingredients: ExtractedIngredient[],
  nutrition: ExtractedNutrition,
  profile: HealthProfile | null = null,
): AnalysisScore {
  const appliedGoals = toPersonalizationKeys(profile);

  // 기본 점수는 가중치 없이 한 번 더 계산한다. "같은 제품, 다른 결과"를 보여주려면
  // 비교 대상인 기본 점수가 있어야 한다.
  const basePlain = [
    ...scoreNutrition(nutrition, []).deductions,
    ...scoreIngredients(ingredients, []),
  ];
  const baseScore = clamp(100 - sum(basePlain));

  const { deductions: nutrientDeductions, skipped } = scoreNutrition(nutrition, appliedGoals);
  const ingredientDeductions = scoreIngredients(ingredients, appliedGoals);
  const deductions = [...nutrientDeductions, ...ingredientDeductions];

  const nutrientPenalty = sum(nutrientDeductions);
  const ingredientPenalty = sum(ingredientDeductions);

  return {
    baseScore,
    personalScore: clamp(100 - nutrientPenalty - ingredientPenalty),
    nutrientPenalty,
    ingredientPenalty,
    deductions: deductions.sort((a, b) => b.penalty - a.penalty),
    appliedGoals,
    skippedNutrients: skipped,
    avoidHits: findAvoidHits(ingredients, ingredientDeductions, profile),
  };
}

function sum(ds: Deduction[]): number {
  return ds.reduce((acc, d) => acc + d.penalty, 0);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
