export type ProfileType = "beginner" | "selective" | "comprehensive" | "expert";

export interface Question {
  id: number;
  text: string;
  options: [string, string, string]; // 1pt, 2pt, 3pt
}

export const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "식품 첨가물에 대해 얼마나 알고 있나요?",
    options: ["전혀 모름", "조금 알음", "잘 알음"],
  },
  {
    id: 2,
    text: "물 속 미세플라스틱이 걱정되나요?",
    options: ["신경 안 씀", "약간 걱정", "매우 걱정"],
  },
  {
    id: 3,
    text: "화장품 성분표를 확인하나요?",
    options: ["안 봄", "가끔 봄", "항상 봄"],
  },
  {
    id: 4,
    text: "EMF(전자파) 노출을 관리하나요?",
    options: ["아니오", "약간", "적극적으로"],
  },
  {
    id: 5,
    text: "유기농 제품을 선호하나요?",
    options: ["상관없음", "가능하면", "반드시"],
  },
  {
    id: 6,
    text: "영양제를 복용 중인가요?",
    options: ["아니오", "1-3종", "4종 이상"],
  },
  {
    id: 7,
    text: "가공식품을 얼마나 자주 먹나요?",
    options: ["매일", "주 3-4회", "거의 안 먹음"],
  },
  {
    id: 8,
    text: "건강 관련 뉴스/정보를 얼마나 팔로우하나요?",
    options: ["거의 안 함", "가끔", "적극적"],
  },
  {
    id: 9,
    text: "제품 구매 시 성분 기반으로 결정하나요?",
    options: ["아니오", "가끔", "항상"],
  },
  {
    id: 10,
    text: "수돗물을 그대로 마시나요?",
    options: ["네", "정수기 사용", "생수만"],
  },
  {
    id: 11,
    text: "건강 제품에 얼마나 투자하나요?",
    options: ["최소한", "적당히", "적극적"],
  },
  {
    id: 12,
    text: "건강 정보의 신뢰도를 어떻게 판단하나요?",
    options: ["그냥 믿음", "가끔 확인", "항상 근거 확인"],
  },
];

export interface ProfileMeta {
  type: ProfileType;
  label: string;
  description: string;
  emoji: string;
  color: string;
  recommendedCategories: string[];
  tip: string;
}

export const PROFILE_META: Record<ProfileType, ProfileMeta> = {
  beginner: {
    type: "beginner",
    label: "입문자",
    description:
      "건강에 관심이 생기기 시작한 단계예요. 기본적인 식품 안전과 수질부터 알아가보세요.",
    emoji: "🌱",
    color: "#2A8A5C",
    recommendedCategories: ["가공식품", "물 & 정수"],
    tip: "바코드 스캔으로 매일 먹는 제품의 성분을 확인해보는 것부터 시작하세요.",
  },
  selective: {
    type: "selective",
    label: "선택적 관리자",
    description:
      "특정 분야에서 건강을 챙기는 타입이에요. 관심 분야를 넓혀보면 더 좋아요.",
    emoji: "🎯",
    color: "#C4780A",
    recommendedCategories: ["가공식품", "보충제 & 영양제", "퍼스널케어"],
    tip: "성분 분석 기능을 활용해 구매 결정에 적용해보세요.",
  },
  comprehensive: {
    type: "comprehensive",
    label: "종합 관리자",
    description:
      "전반적으로 건강을 적극 관리하는 타입이에요. 과학적 근거도 함께 확인해보세요.",
    emoji: "⚡",
    color: "#8A5BC4",
    recommendedCategories: ["성분 분석", "EMF & 전자파", "생활용품"],
    tip: "성분 상세 분석 페이지에서 논문 근거까지 확인해보세요.",
  },
  expert: {
    type: "expert",
    label: "전문 관리자",
    description:
      "근거 기반으로 철저히 건강을 관리하는 타입이에요. HINDSIGHT+ 의 모든 기능을 활용하세요.",
    emoji: "🔬",
    color: "#C44B4B",
    recommendedCategories: ["성분 분석", "과학적 근거", "규제 현황"],
    tip: "논문 레퍼런스와 규제 현황을 비교해 더 깊이 있는 판단을 해보세요.",
  },
};

/**
 * answers: array of 12 values (1|2|3), index 0 = Q1
 * Total range: 12–36
 */
export function calculateProfile(answers: number[]): ProfileType {
  const total = answers.reduce((sum, a) => sum + a, 0);
  if (total <= 16) return "beginner";
  if (total <= 24) return "selective";
  if (total <= 30) return "comprehensive";
  return "expert";
}
