// ─────────────────────────────────────────────────
// HINDSIGHT+ — Central category definitions
// Single source of truth for all category data
// ─────────────────────────────────────────────────

export const CATEGORIES = [
  {
    slug: "water",
    nameKo: "물",
    nameEn: "Drinking Water",
    emoji: "💧",
    desc: "생수 · 수돗물 · 미네랄워터",
    color: "#3B7DD4",
    focus: "생수, 수돗물의 안전성, 미세플라스틱 오염, 수질 기준, 불소 첨가 논란",
  },
  {
    slug: "filters",
    nameKo: "정수기/필터",
    nameEn: "Water Filters",
    emoji: "🚰",
    desc: "정수기 · 필터 · 역삼투압",
    color: "#2A7DB5",
    focus: "정수기, 물 필터, 역삼투압 장치의 효과, 관리 방법, 2차 오염 위험",
  },
  {
    slug: "air-purifiers",
    nameKo: "공기청정기",
    nameEn: "Air Purifiers",
    emoji: "🌬️",
    desc: "공기청정기 · HEPA필터 · 실내공기",
    color: "#4A9E8A",
    focus: "공기청정기, HEPA 필터, 실내 공기질, 미세먼지, VOC 제거 효과와 한계",
  },
  {
    slug: "food",
    nameKo: "식품/가공식품",
    nameEn: "Food & Processed",
    emoji: "🥗",
    desc: "첨가물 · 방부제 · 가공식품",
    color: "#C4780A",
    focus: "식품 첨가물, 방부제, 인공색소, 초가공식품(NOVA 4)의 건강 영향",
  },
  {
    slug: "personal-care",
    nameKo: "퍼스널케어",
    nameEn: "Personal Care",
    emoji: "🧴",
    desc: "화장품 · 치약 · 샴푸",
    color: "#8A5BC4",
    focus: "화장품, 치약, 샴푸, 선크림의 유해 성분(파라벤, 설페이트, 옥시벤존 등)",
  },
  {
    slug: "household",
    nameKo: "가정용품",
    nameEn: "Household",
    emoji: "🧹",
    desc: "세제 · 방향제 · 살충제",
    color: "#8A7A2A",
    focus: "세제, 방향제, 탈취제, 살충제의 화학 물질 위험성과 대안",
  },
  {
    slug: "clothing",
    nameKo: "의류/섬유",
    nameEn: "Clothing & Textiles",
    emoji: "👕",
    desc: "합성섬유 · 염료 · 방수코팅",
    color: "#5B6BC4",
    focus: "합성섬유, 섬유 염료, PFAS 방수 코팅, 마이크로플라스틱 방출과 피부 영향",
  },
  {
    slug: "pets",
    nameKo: "반려동물 용품",
    nameEn: "Pet Products",
    emoji: "🐾",
    desc: "사료 · 간식 · 위생용품",
    color: "#C47A3B",
    focus: "반려동물 사료, 간식, 위생용품의 유해 성분, 펫푸드 안전 기준",
  },
  {
    slug: "supplements",
    nameKo: "보충제/영양제",
    nameEn: "Supplements",
    emoji: "💊",
    desc: "비타민 · 미네랄 · 오메가3",
    color: "#2A8A5C",
    focus: "비타민, 미네랄, 프로바이오틱스, 오메가3의 효과·과다 섭취 위험·상호작용",
  },
  {
    slug: "baby",
    nameKo: "유아용품",
    nameEn: "Baby Products",
    emoji: "👶",
    desc: "분유 · 이유식 · 장난감",
    color: "#D45B8A",
    focus: "유아 분유, 이유식, 장난감, 기저귀의 화학 성분과 안전 기준",
  },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) ?? null;
}
