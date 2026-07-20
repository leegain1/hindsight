export interface OFFProduct {
  nutriscore_grade?: string;
  nova_group?: number;
  additives_tags?: string[];
  allergens_tags?: string[];
  ingredients_text?: string;
  ingredients_text_ko?: string;
}

export interface ScoreBreakdown {
  total: number;
  nutriScore: number;
  novaScore: number;
  additivesScore: number;
  allergenScore: number;
  color: string;
  label: string;
  additivesCount: number;
  allergensCount: number;
}

// E-numbers known to be potentially harmful (sourced from EFSA / IARC classifications)
const VERY_HIGH_RISK_ADDITIVES = new Set([
  "en:e102",  // Tartrazine – hyperactivity in children
  "en:e104",  // Quinoline Yellow
  "en:e110",  // Sunset Yellow
  "en:e122",  // Carmoisine
  "en:e123",  // Amaranth – banned in USA
  "en:e124",  // Ponceau 4R
  "en:e129",  // Allura Red
  "en:e133",  // Brilliant Blue
  "en:e211",  // Sodium benzoate – forms benzene with vitamin C
  "en:e249",  // Potassium nitrite
  "en:e250",  // Sodium nitrite – processed meat carcinogen
  "en:e251",  // Sodium nitrate
  "en:e252",  // Potassium nitrate
  "en:e310",  // Propyl gallate
  "en:e311",  // Octyl gallate
  "en:e312",  // Dodecyl gallate
  "en:e320",  // BHA – possible carcinogen
  "en:e321",  // BHT – possible carcinogen
  "en:e924",  // Potassium bromate – banned in EU
  "en:e954",  // Saccharin
]);

const HIGH_RISK_ADDITIVES = new Set([
  "en:e150d", // Caramel colour IV (contains 4-MEI)
  "en:e210",  // Benzoic acid
  "en:e212",  // Potassium benzoate
  "en:e213",  // Calcium benzoate
  "en:e219",  // Methyl p-hydroxybenzoate sodium salt
  "en:e621",  // Monosodium glutamate (MSG) – sensitivity issues
  "en:e951",  // Aspartame – controversial
  "en:e950",  // Acesulfame K
  "en:e952",  // Cyclamate
  "en:e961",  // Neotame
  "en:e999",  // Quillaia extract
  "en:e407",  // Carrageenan – gut inflammation
  "en:e171",  // Titanium dioxide (EU banned)
  "en:e172",  // Iron oxides
  "en:e173",  // Aluminium
]);

const MEDIUM_RISK_ADDITIVES = new Set([
  "en:e220",  // Sulphur dioxide
  "en:e221",  // Sodium sulphite
  "en:e222",  // Sodium bisulphite
  "en:e223",  // Sodium metabisulphite
  "en:e224",  // Potassium metabisulphite
  "en:e226",  // Calcium sulphite
  "en:e433",  // Polysorbate 80
  "en:e471",  // Mono- and diglycerides of fatty acids
  "en:e472e", // Diacetyl tartaric acid ester of mono/diglycerides
  "en:e476",  // Polyglycerol polyricinoleate
  "en:e627",  // Disodium guanylate
  "en:e631",  // Disodium inosinate
  "en:e635",  // Disodium ribonucleotides
  "en:e900",  // Dimethylpolysiloxane
  "en:e942",  // Nitrous oxide
]);

export function calculateScore(product: OFFProduct): ScoreBreakdown {
  let score = 50;

  // ── Nutriscore ──────────────────────────────────────────
  const nutriMap: Record<string, number> = { a: 20, b: 10, c: 0, d: -10, e: -20 };
  const grade = (product.nutriscore_grade ?? "").toLowerCase();
  const nutriScore = nutriMap[grade] ?? 0;
  score += nutriScore;

  // ── NOVA group ──────────────────────────────────────────
  const novaMap: Record<number, number> = { 1: 15, 2: 5, 3: -5, 4: -15 };
  const nova = product.nova_group;
  const novaScore = nova != null ? (novaMap[nova] ?? 0) : 0;
  score += novaScore;

  // ── Additives ───────────────────────────────────────────
  const additives = product.additives_tags ?? [];
  const additivesCount = additives.length;
  let additivesScore = 0;

  for (const tag of additives) {
    if (VERY_HIGH_RISK_ADDITIVES.has(tag)) {
      additivesScore -= 15;
    } else if (HIGH_RISK_ADDITIVES.has(tag)) {
      additivesScore -= 10;
    } else if (MEDIUM_RISK_ADDITIVES.has(tag)) {
      additivesScore -= 5;
    } else {
      additivesScore -= 2; // generic additive penalty
    }
  }
  // Extra count-based penalty (max -20)
  additivesScore -= Math.min(additivesCount, 10);
  score += additivesScore;

  // ── Allergens ───────────────────────────────────────────
  const allergens = product.allergens_tags ?? [];
  const allergensCount = allergens.length;
  const allergenScore = -Math.min(allergensCount * 3, 15);
  score += allergenScore;

  // ── Clamp 1-100 ─────────────────────────────────────────
  score = Math.max(1, Math.min(100, Math.round(score)));

  // ── Color & label ────────────────────────────────────────
  let color: string;
  let label: string;
  if (score >= 80) {
    color = "#2A8A5C";
    label = "안전";
  } else if (score >= 60) {
    color = "#C4780A";
    label = "양호";
  } else if (score >= 40) {
    color = "#C05000";
    label = "주의";
  } else {
    color = "#C44B4B";
    label = "위험";
  }

  return {
    total: score,
    nutriScore,
    novaScore,
    additivesScore,
    allergenScore,
    color,
    label,
    additivesCount,
    allergensCount,
  };
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "#2A8A5C";
  if (score >= 60) return "#C4780A";
  if (score >= 40) return "#C05000";
  return "#C44B4B";
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return "안전";
  if (score >= 60) return "양호";
  if (score >= 40) return "주의";
  return "위험";
}
