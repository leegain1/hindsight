/**
 * 사진 기반 미등록 제품 분석 — 목 데이터 + 계약(shape)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 하는 일
 *   발표 데모용으로 "사진 → 성분 분석" 흐름을 목 데이터로 돌린다.
 *   실제 Claude Vision 을 붙일 때는 `analyzePhoto()` 내부만 fetch 로 바꾸면 되고,
 *   화면 코드(`/scan/photo`)는 한 줄도 고칠 필요가 없다.
 *
 * 왜 목 데이터인가
 *   1. 발표장 네트워크·API 지연·실패에 데모가 죽지 않는다
 *   2. ANTHROPIC_API_KEY 없이도 화면 흐름 전체를 완성할 수 있다
 *   3. 보여줄 제품이 고정이라 결과가 매번 동일하다 (리허설 = 본 발표)
 *
 * 실제 API 로 교체하는 법
 *   analyzePhoto() 의 목 분기를 지우고 POST /api/analyze-photo 를 호출한다.
 *   서버 라우트는 Anthropic SDK 의 이미지 블록을 쓴다:
 *     { type: "image", source: { type: "base64", media_type, data } }
 *   응답을 아래 PhotoAnalysisResult 로 맞추면 끝이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * 파이프라인 단계 — 화면에 진행 상황으로 그린다.
 *
 * 라벨은 **실제로 코드가 하는 일**과 맞춘다. 전에는 YOLO·OCR 로 적혀 있었는데
 * 둘 다 붙여둔 적이 없다(의존성 0개). 화면에 없는 기술이 적혀 있으면 발표에서
 * "YOLO 어떻게 학습시켰나요" 라는 질문에 답이 막힌다.
 */
export interface PipelineStage {
  id: string;
  label: string;
  detail: string;
  /** 이 단계가 끝나는 시점(ms). 목에서는 실제 처리 대신 이 타이밍으로 진행을 그린다 */
  atMs: number;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { id: "quality", label: "촬영 품질 검사", detail: "기기 내 처리", atMs: 600 },
  { id: "read", label: "표시사항 판독", detail: "Claude Vision", atMs: 2200 },
  { id: "match", label: "주의성분 교차검증", detail: "규칙 기반", atMs: 3200 },
  { id: "score", label: "내 기준 재계산", detail: "개인 프로파일", atMs: 3900 },
];

export const TOTAL_PIPELINE_MS =
  PIPELINE_STAGES[PIPELINE_STAGES.length - 1].atMs;

export type VerdictLabel = "안전" | "양호" | "주의" | "위험" | "매우위험";

/** 판정 → 색상. 기존 analyze-ingredients API 와 동일한 체계를 유지한다 */
export const VERDICT_COLOR: Record<VerdictLabel, string> = {
  안전: "#2A8A5C",
  양호: "#3B7DD4",
  주의: "#C4780A",
  위험: "#C44B4B",
  매우위험: "#8B0000",
};

/**
 * 성분 정보를 어디서 가져왔는지.
 *
 * 사용자는 **제품 앞면**만 찍는다. 성분표를 찍는 게 아니다.
 * 그래서 "앞면만 보고 성분을 어떻게 아느냐"에 답할 수 있어야 한다 —
 * 제품을 식별한 다음 성분을 조회하는 구조이고, 그 출처를 화면에 명시한다.
 * 발표 Q&A 에서 반드시 나올 질문이라 UI 에 미리 박아둔다.
 */
export type IngredientSource =
  | "식약처 공개데이터"
  | "제조사 표기"
  | "사용자 제보 DB"
  /** 바코드 조회가 아니라 사진에서 직접 판독한 경우 — Yuka 대비 차별점 */
  | "사진 판독";

export interface DetectedProduct {
  productName: string;
  brand: string;
  /** 사진(앞면)에서 실제로 판독한 텍스트 — 식별 근거를 보여주는 증거 */
  ocrText: string;
  ingredients: string[];
  /** 성분 목록의 출처. 사진에서 읽은 게 아니라 식별 후 조회한 것이다 */
  ingredientSource: IngredientSource;
  /** 0~1. 낮으면 화면에서 재촬영을 유도한다 */
  confidence: number;
}

export interface RiskItem {
  name: string;
  reason: string;
  level: "low" | "mid" | "high";
}

/** ② 개인 맞춤 — 사용자 프로파일과 대조한 결과. 프로파일이 없으면 null */
export interface PersonalizedMatch {
  matched: RiskItem[];
  note: string;
}

/** ④ 논문·공식기관 기반 팩트체킹 */
export interface FactCheckItem {
  claim: string;
  verdict: "근거 있음" | "근거 불충분" | "근거 없음";
  detail: string;
  source: string;
}

/**
 * ⑤ 사용자 후기 + 신뢰 뱃지
 *
 * 광고보다 후기를 믿는 소비자 성향(구매 전 리뷰 확인 97.2% / 광고보다 리뷰 신뢰 75.3%)을
 * 반영한 축. 브랜드 인증이 아니라 **사용자 간 평판 데이터**라는 점이 해자의 근거다.
 */
export interface TrustBadge {
  id: string;
  label: string;
  /** 이 뱃지가 붙은 근거 — 탭 없이도 왜 붙었는지 보이게 한다 */
  basis: string;
  tone: "positive" | "neutral" | "caution";
}

export interface UserReview {
  id: string;
  userName: string;
  rating: number;
  body: string;
  createdAt: string;
  helpfulCount: number;
  /** 실제로 구매·사용한 게 확인된 후기인지 — 신뢰도의 핵심 */
  verified: boolean;
}

export interface ReviewSummary {
  /** 0~5 */
  rating: number;
  totalCount: number;
  verifiedCount: number;
  badges: TrustBadge[];
  /** 리포트에 미리 보여줄 상위 후기. 전체는 후기 페이지에서 */
  top: UserReview[];
}

export interface PhotoAnalysisResult {
  detected: DetectedProduct;
  reviews: ReviewSummary;
  verdict: {
    label: VerdictLabel;
    color: string;
    /** 0~100 */
    score: number;
    body: string;
  };
  risks: RiskItem[];
  personalized: PersonalizedMatch | null;
  factCheck: FactCheckItem[];
  saferTips: string[];
  meta: {
    /** 응답 시간 — 발표 목표 지표가 "5초 이내"라 화면에 노출한다 */
    elapsedMs: number;
    model: string;
    /** true = 바코드 DB 에 없는 제품. 이게 Yuka 대비 핵심 차별점이다 */
    unregistered: boolean;
    /** 대조군. 슬라이드 4-3 좌우 스플릿의 왼쪽 */
    yukaResult: "제품을 찾을 수 없음" | "분석 완료";
  };
}

/**
 * ⚠️ 발표용 시연 제품 — 여기를 실제로 보여줄 제품으로 바꾸세요.
 *
 * 조건: Yuka 에서 "제품을 찾을 수 없음"이 뜨는 미등록 제품이어야 합니다.
 * (신제품 · 니치 브랜드 · 로컬 브랜드 · 해외 직구 제품)
 * 성분표는 실제 제품 뒷면을 그대로 옮겨 적으면 설득력이 가장 큽니다.
 */
/**
 * 후기 목 데이터 — 리포트의 요약과 전체 후기 페이지가 같은 소스를 쓴다.
 * 두 화면이 어긋나면 데모에서 바로 들통나므로 한 곳에서만 정의한다.
 */
export const DEMO_REVIEWS: ReviewSummary = {
  rating: 4.1,
  totalCount: 218,
  verifiedCount: 173,
  badges: [
    {
      id: "verified-majority",
      label: "구매 확인 79%",
      basis: "218개 후기 중 173개가 구매 인증된 사용자",
      tone: "positive",
    },
    {
      id: "no-sponsored",
      label: "협찬 후기 0건",
      basis: "협찬·체험단 표기 후기가 없습니다",
      tone: "positive",
    },
    {
      id: "allergy-reports",
      label: "알레르기 언급 12건",
      basis: "견과류 관련 불편을 보고한 후기가 있습니다",
      tone: "caution",
    },
  ],
  top: [
    {
      id: "r1",
      userName: "아침만드는사람",
      rating: 5,
      body: "흑임자 향이 진하고 안 눅눅해서 좋아요. 요거트에 넣어 먹는데 식감이 오래갑니다.",
      createdAt: "2026-07-21",
      helpfulCount: 42,
      verified: true,
    },
    {
      id: "r2",
      userName: "성분꼼꼼",
      rating: 3,
      body: "맛은 괜찮은데 결정과당이 생각보다 앞쪽에 있네요. 매일 먹기엔 당이 좀 부담됩니다.",
      createdAt: "2026-07-14",
      helpfulCount: 38,
      verified: true,
    },
    {
      id: "r3",
      userName: "견과류알러지",
      rating: 2,
      body: "아몬드가 들어있는 줄 모르고 먹었다가 고생했어요. 앞면에 더 크게 표기됐으면 합니다.",
      createdAt: "2026-07-02",
      helpfulCount: 55,
      verified: true,
    },
    {
      id: "r4",
      userName: "그래놀라덕후",
      rating: 4,
      body: "다른 브랜드보다 덜 달아서 재구매했습니다. 양이 좀 적은 게 아쉬워요.",
      createdAt: "2026-06-28",
      helpfulCount: 19,
      verified: true,
    },
    {
      id: "r5",
      userName: "다이어터",
      rating: 4,
      body: "30g씩 계량해서 먹으면 부담 없어요. 포만감은 확실합니다.",
      createdAt: "2026-06-11",
      helpfulCount: 14,
      verified: false,
    },
    {
      id: "r6",
      userName: "주말브런치",
      rating: 5,
      body: "우유보다 두유랑 더 잘 맞아요. 흑임자라 고소함이 오래 남습니다.",
      createdAt: "2026-05-30",
      helpfulCount: 11,
      verified: true,
    },
  ],
};

/** 사진 분석 데모 결과. 최근 스캔 목록의 리포트로도 재사용한다(mockReports.ts) */
export const DEMO_PRODUCT: PhotoAnalysisResult = {
  detected: {
    productName: "흑임자 크런치 그래놀라",
    brand: "온데이즈",
    // 앞면 사진에서 판독한 텍스트. 성분표가 아니라 패키지 전면 문구다.
    ocrText: "온데이즈 · 흑임자 크런치 그래놀라 · 통곡물 아침 · 300g",
    ingredientSource: "식약처 공개데이터",
    ingredients: [
      "귀리",
      "흑임자",
      "정제소금",
      "아몬드",
      "해바라기씨",
      "결정과당",
      "카라멜색소",
      "합성향료",
      "산도조절제",
      "자당지방산에스테르",
      "비타민E",
      "대두레시틴",
    ],
    confidence: 0.94,
  },
  reviews: DEMO_REVIEWS,
  verdict: {
    label: "주의",
    color: VERDICT_COLOR["주의"],
    score: 58,
    body:
      "곡물 기반이라 기본 영양은 무난하지만, 결정과당과 카라멜색소·합성향료가 함께 들어 있습니다. " +
      "매일 먹는 아침 대용으로는 당류 섭취가 누적될 수 있어 섭취량을 확인하는 게 좋습니다.",
  },
  risks: [
    {
      name: "결정과당",
      reason: "첨가당. 혈당을 빠르게 올리고 포만감이 낮아 과잉 섭취로 이어지기 쉽습니다.",
      level: "mid",
    },
    {
      name: "카라멜색소",
      reason: "착색 목적의 첨가물. 제조 방식에 따라 4-MEI 가 생성될 수 있어 논의가 있습니다.",
      level: "mid",
    },
    {
      name: "합성향료",
      reason: "향을 내기 위한 첨가물. 개별 성분이 공개되지 않아 구성 확인이 어렵습니다.",
      level: "low",
    },
    {
      name: "아몬드 · 대두레시틴",
      reason: "견과류·대두 알레르기가 있다면 피해야 합니다.",
      level: "high",
    },
  ],
  personalized: {
    matched: [
      {
        name: "아몬드",
        reason: "회원님이 등록한 기피 성분 '견과류'에 해당합니다.",
        level: "high",
      },
    ],
    note:
      "같은 제품이라도 회원님 기준에서는 '위험'입니다. " +
      "등록하신 견과류 알레르기 때문에 다른 사용자보다 주의도가 높게 계산됐습니다.",
  },
  factCheck: [
    {
      claim: "흑임자가 모발 건강에 좋다",
      verdict: "근거 불충분",
      detail:
        "동물 실험 수준의 보고는 있으나 사람 대상 임상 근거는 부족합니다. 식약처 기능성 인정 원료가 아닙니다.",
      source: "식품의약품안전처 건강기능식품 기능성 원료 목록",
    },
    {
      claim: "귀리의 베타글루칸이 콜레스테롤 개선에 도움",
      verdict: "근거 있음",
      detail:
        "1일 3g 이상 섭취 시 혈중 콜레스테롤 개선에 도움을 줄 수 있다는 기능성이 인정되어 있습니다. 이 제품의 함량은 표기되어 있지 않습니다.",
      source: "식약처 고시형 기능성 원료 — 귀리 베타글루칸",
    },
  ],
  saferTips: [
    "1회 섭취량을 30~40g 으로 두고 무가당 요거트와 곁들이면 당류 부담이 줄어듭니다.",
    "같은 카테고리에서 첨가당·착색료가 없는 제품과 비교해보세요.",
  ],
  meta: {
    elapsedMs: 4200,
    model: "claude-sonnet-5",
    unregistered: true,
    yukaResult: "제품을 찾을 수 없음",
  },
};

/**
 * 사진을 분석한다.
 *
 * 지금은 목 데이터를 파이프라인 소요 시간만큼 지연시켜 반환한다.
 * 실제 API 로 바꿀 때는 이 함수 본문만 교체하면 된다 — 호출부는 그대로다.
 *
 * @param _file 사용자가 고른 이미지. 목에서는 쓰지 않지만 실제 구현에서는 base64 로 보낸다.
 * @param signal 화면 이탈 시 취소용
 */
export async function analyzePhoto(
  _file: File,
  signal?: AbortSignal,
): Promise<PhotoAnalysisResult> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, TOTAL_PIPELINE_MS);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("aborted", "AbortError"));
    });
  });

  return DEMO_PRODUCT;
}
