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
 *   최종점수 = min(신뢰상한, clamp(0, 100 - 영양감점 - 주의성분감점 - 미확인첨가물감점))
 *
 * 신뢰상한이 왜 있나: 감점만으로 점수를 내면 **판독이 부실할수록 점수가 높아진다.**
 * 영양성분을 하나도 못 읽고 성분도 전부 DB 밖이면 감점이 0 이라 100 점이 나온다.
 * 실제로 불닭소스 사진에서 그렇게 됐다 — 원재료 36건 중 0건 확인, 영양성분 3개
 * 모두 판독 실패, 그래서 만점. 모르는 것은 감점 사유가 아니라 **주장할 수 있는
 * 범위의 상한**을 깎는 사유다.
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

/** DB 밖 성분 중 표기만으로 첨가물인 게 드러나는 것에 매기는 규칙 */
interface UnknownAdditiveRules {
  penalty_each: number;
  max_total: number;
  patterns: string[];
}

/** 확인하지 못한 축이 있을 때 점수의 상한을 내리는 규칙 */
interface CeilingRules {
  per_unread_nutrient: number;
  low_coverage_threshold: number;
  low_coverage_min_unassessed: number;
  low_coverage_penalty: number;
  floor: number;
}

const NUTRIENT_RULES = db.nutrient_rules as Record<NutrientKey, NutrientBand[]>;
const CAUTION = db.caution_ingredients as Record<string, CautionEntry>;
const WEIGHTS = db.personalization_weights as Record<string, Record<string, number>>;
const UNKNOWN_RULES = db.unknown_additive_rules as UnknownAdditiveRules;
const CEILING_RULES = db.confidence_ceiling as CeilingRules;

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
  /**
   * unknown = DB 에 없지만 표기가 첨가물인 성분.
   * ingredient(=DB 등재 주의성분)와 구분해야 화면에서 "확인된 감점"과
   * "모르는 채로 깎은 감점"을 섞어 보여주지 않는다.
   */
  kind: "nutrient" | "ingredient" | "unknown";
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
  /** DB 밖 첨가물 표기에서 깎인 점수 */
  unknownPenalty: number;
  deductions: Deduction[];

  /**
   * 이 사진으로 주장할 수 있는 점수의 상한.
   * 감점을 다 해도 이 값을 넘지 못한다. 100 이면 상한이 걸리지 않았다는 뜻.
   */
  ceiling: number;
  /** 상한이 내려간 이유 — 점수 옆에 그대로 보여준다 */
  ceilingReasons: string[];
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

  /**
   * DB 에 등재돼 있어 실제로 평가한 성분 표기.
   * 감점된 것뿐 아니라 "DB 에 있고 확인했다"는 사실이 신뢰도의 분자다.
   */
  assessed: string[];
  /**
   * DB 에 없어 평가하지 못한 성분 표기 = 미확인 성분.
   *
   * 이걸 그냥 버리면 "감점이 없다"가 "안전하다"로 읽힌다. 우리 DB 는 주의성분
   * 샘플이라 실제 제품 성분 상당수가 여기로 떨어진다. 모르는 것을 모른다고
   * 말하지 않으면 점수가 실제보다 후해 보인다.
   *
   * 이 중 표기가 첨가물인 것(용도명·화학명)은 unknownPenalty 로 일부 감점되고,
   * 나머지는 ceiling 을 통해 점수 상한에 반영된다.
   */
  unassessed: string[];
  /** 평가한 성분 / 전체 성분 (0~1) */
  coverage: number;
  /**
   * 이 점수를 얼마나 믿을 수 있는지.
   * 판독 품질과 DB 커버리지가 함께 떨어뜨린다.
   */
  confidence: "high" | "medium" | "low";
  /** 신뢰도가 내려간 이유 — 화면에 그대로 보여준다 */
  confidenceReasons: string[];
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

/**
 * DB 밖 성분 중 표기 자체가 첨가물인 것을 감점한다.
 *
 * 근거: 한국 식품표시 규칙상 첨가물은 용도명(향미증진제·산도조절제·유화제…)이나
 * 화학명(~인산·아질산~)으로 적게 되어 있다. 그 표기가 붙어 있으면 개별 위험도는
 * 몰라도 **첨가물이라는 사실 자체는 확실하다.** 그래서 확인된 주의성분보다는
 * 가볍게(건당 2점), 그러나 0 이 아니게 깎는다.
 *
 * 상한(max_total)이 필요한 이유: 성분이 40건인 제품과 8건인 제품에 같은 잣대를
 * 대야 한다. 상한이 없으면 성분 수가 많은 것만으로 0 점이 나온다.
 *
 * 여기서는 개인화 가중치를 쓰지 않는다. 무엇인지 모르는 성분에 "당뇨에 나쁘다"
 * 같은 가중치를 붙이는 건 근거 없는 주장이다.
 */
function scoreUnknownAdditives(unassessed: string[]): Deduction[] {
  const deductions: Deduction[] = [];
  let spent = 0;

  for (const name of unassessed) {
    if (spent >= UNKNOWN_RULES.max_total) break;
    const n = normalize(name);
    const pattern = UNKNOWN_RULES.patterns.find((p) => n.includes(normalize(p)));
    if (!pattern) continue;

    const penalty = Math.min(UNKNOWN_RULES.penalty_each, UNKNOWN_RULES.max_total - spent);
    spent += penalty;
    deductions.push({
      kind: "unknown",
      label: name,
      category: "미확인 첨가물",
      basePenalty: UNKNOWN_RULES.penalty_each,
      weight: 1,
      penalty,
      reason: `'${pattern}' 표기 · DB에 없어 개별 위험도는 확인하지 못함`,
      personalized: false,
    });
  }

  return deductions;
}

/**
 * 점수의 상한을 계산한다.
 *
 * 감점은 "이만큼 나쁘다"는 주장이고, 상한은 "이 이상은 주장할 수 없다"는 선언이다.
 * 둘을 섞으면 안 된다 — 못 읽은 나트륨을 감점하면 없는 수치를 지어내는 것이고,
 * 그냥 넘기면 판독이 부실할수록 점수가 올라간다. 상한이 그 사이를 메운다.
 *
 * floor 가 있는 이유: 상한은 "좋다고 말할 수 없다"까지만 해야 한다. 판독을 못 했다는
 * 이유로 '위험' 등급까지 끌어내리면 그건 근거 없는 반대 방향의 주장이 된다.
 */
function computeCeiling(
  skippedNutrients: string[],
  coverage: number,
  unassessedCount: number,
  /** 미확인 성분 중 표기가 첨가물인 건수 — 이게 0 이면 커버리지 공백은 무해하다 */
  unknownAdditiveCount: number,
): { ceiling: number; reasons: string[] } {
  const reasons: string[] = [];
  let ceiling = 100;

  if (skippedNutrients.length > 0) {
    ceiling -= skippedNutrients.length * CEILING_RULES.per_unread_nutrient;
    reasons.push(
      `${skippedNutrients.join("·")}을 읽지 못해 ${skippedNutrients.length * CEILING_RULES.per_unread_nutrient}점 상한`,
    );
  }

  // 커버리지가 낮다는 것만으로는 상한을 걸지 않는다. 이 DB 는 주의성분만 담고
  // 있어서 **깨끗한 제품일수록 매칭이 0건**이다 — 비율만 보면 '정제수' 한 줄짜리
  // 생수나 귀리·아몬드뿐인 그래놀라가 벌을 받는다. 확인하지 못한 것 중에 실제로
  // 첨가물이 섞여 있을 때만, 즉 진짜 지식 공백일 때만 상한을 건다.
  if (
    unknownAdditiveCount > 0 &&
    unassessedCount >= CEILING_RULES.low_coverage_min_unassessed &&
    coverage < CEILING_RULES.low_coverage_threshold
  ) {
    ceiling -= CEILING_RULES.low_coverage_penalty;
    reasons.push(
      `원재료 ${Math.round(coverage * 100)}%만 DB에서 확인돼 ${CEILING_RULES.low_coverage_penalty}점 상한`,
    );
  }

  return { ceiling: Math.max(CEILING_RULES.floor, ceiling), reasons };
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
  /** Vision 이 매긴 판독 품질 — 신뢰도 계산에 함께 쓴다 */
  readability: "good" | "partial" | "poor" = "good",
): AnalysisScore {
  const appliedGoals = toPersonalizationKeys(profile);

  const { assessed, unassessed } = crossCheck(ingredients);
  const coverage = ingredients.length ? assessed.length / ingredients.length : 0;

  const { deductions: nutrientDeductions, skipped } = scoreNutrition(nutrition, appliedGoals);
  const ingredientDeductions = scoreIngredients(ingredients, appliedGoals);
  const unknownDeductions = scoreUnknownAdditives(unassessed);
  const deductions = [...nutrientDeductions, ...ingredientDeductions, ...unknownDeductions];

  const nutrientPenalty = sum(nutrientDeductions);
  const ingredientPenalty = sum(ingredientDeductions);
  const unknownPenalty = sum(unknownDeductions);

  const { ceiling, reasons: ceilingReasons } = computeCeiling(
    skipped,
    coverage,
    unassessed.length,
    unknownDeductions.length,
  );

  // 상한은 개인 조건과 무관하다 — 판독 품질의 문제지 그 사람의 문제가 아니다.
  // 그래서 기본 점수에도 같은 상한을 씌운다. 안 그러면 "일반 90 → 회원님 60" 처럼
  // 개인 조건 탓으로 보이는 낙차가 생긴다.
  const capped = (raw: number) => Math.min(ceiling, clamp(raw));

  // 기본 점수는 가중치 없이 한 번 더 계산한다. "같은 제품, 다른 결과"를 보여주려면
  // 비교 대상인 기본 점수가 있어야 한다. 미확인 감점은 가중치를 안 타므로 그대로 쓴다.
  const basePlain = [
    ...scoreNutrition(nutrition, []).deductions,
    ...scoreIngredients(ingredients, []),
  ];
  const baseScore = capped(100 - sum(basePlain) - unknownPenalty);

  // 신뢰도는 한 단계씩 깎아 내린다. 원인이 겹치면 그만큼 더 내려간다.
  const reasons: string[] = [];
  let level = 2; // 2 high · 1 medium · 0 low
  if (readability === "partial") {
    level--;
    reasons.push("사진 일부를 읽지 못했습니다");
  }
  if (skipped.length > 0) {
    level--;
    reasons.push(`${skipped.join("·")}을 읽지 못해 계산에서 뺐습니다`);
  }
  if (unassessed.length > 0 && coverage < 0.35) {
    level--;
    reasons.push(`성분 ${unassessed.length}건이 DB에 없어 평가하지 못했습니다`);
  }
  const confidence = level >= 2 ? "high" : level === 1 ? "medium" : "low";

  return {
    baseScore,
    personalScore: capped(100 - nutrientPenalty - ingredientPenalty - unknownPenalty),
    nutrientPenalty,
    ingredientPenalty,
    unknownPenalty,
    ceiling,
    ceilingReasons,
    deductions: deductions.sort((a, b) => b.penalty - a.penalty),
    appliedGoals,
    skippedNutrients: skipped,
    avoidHits: findAvoidHits(ingredients, ingredientDeductions, profile),
    assessed,
    unassessed,
    coverage,
    confidence,
    confidenceReasons: reasons,
  };
}

/**
 * 식약처 기준 DB 교차검증.
 *
 * 추출된 성분 하나하나를 DB 표준명·aliases 와 부분 매칭해, 평가한 것과 평가하지
 * 못한 것으로 가른다. 감점 여부와는 다른 축이다 — 감점 0 점인 성분도 "DB 에서
 * 확인했다"면 평가한 것이다(지금 DB 는 주의성분만 담고 있어 실질적으로는
 * 매칭 = 감점이지만, 안전 성분이 추가돼도 이 구분은 그대로 성립한다).
 */
function crossCheck(ingredients: ExtractedIngredient[]): {
  assessed: string[];
  unassessed: string[];
} {
  const assessed: string[] = [];
  const unassessed: string[] = [];

  for (const ing of ingredients) {
    const hit = Object.entries(CAUTION).some(([standard, entry]) =>
      [standard, ...(entry.aliases ?? [])].some((t) => matches(ing.name, t)),
    );
    (hit ? assessed : unassessed).push(ing.name);
  }
  return { assessed, unassessed };
}

function sum(ds: Deduction[]): number {
  return ds.reduce((acc, d) => acc + d.penalty, 0);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
