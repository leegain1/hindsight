/**
 * 최근 스캔 항목별 리포트 목 데이터.
 *
 * 왜 필요한가: 최근 스캔 목록은 있는데 눌러도 갈 곳이 없었다. 6건 전부
 * `/scan/result/<barcode>` 로 보내고 있었고 그 화면은 바코드 DB 에서 제품을
 * 찾는다 — photo- 로 시작하는 미등록 제품은 물론이고, 목 목록의 바코드 6건이
 * 전부 "제품을 찾을 수 없음" 으로 떨어졌다. 데모에서 목록을 눌러본 사람이
 * 처음 만나는 화면이 빈 화면이면 그 뒤 설명이 안 들린다.
 *
 * 각 항목은 mockScans.ts 의 MOCK_SCANS 와 같은 barcode·name·brand·score 를
 * 쓴다. 목록에서 본 숫자와 리포트의 숫자가 다르면 그 자리에서 들킨다.
 *
 * 리포트 모양은 mockPhotoAnalysis.ts 의 DEMO_PRODUCT 와 동일한 계약
 * (PhotoAnalysisResult) 이라, 사진 분석 결과 화면이 그대로 렌더한다.
 */

import {
  DEMO_PRODUCT,
  DEMO_REVIEWS,
  VERDICT_COLOR,
  type PhotoAnalysisResult,
} from "./mockPhotoAnalysis";

/** 점수만 넘기면 판정 라벨·색을 채워준다 — 목록과 리포트가 어긋나지 않게 */
function verdict(score: number, body: string): PhotoAnalysisResult["verdict"] {
  const label =
    score >= 85 ? "안전" : score >= 70 ? "양호" : score >= 50 ? "주의" : score >= 30 ? "위험" : "매우위험";
  return { label, color: VERDICT_COLOR[label], score, body };
}

export const MOCK_REPORTS: Record<string, PhotoAnalysisResult> = {
  // ── 사진 분석 (미등록 제품) ───────────────────────────────────────────────
  // 그래놀라는 사진 분석 데모가 쓰는 것과 같은 리포트다. 목록에서 눌러 들어간
  // 화면과 실제로 찍어서 나온 화면이 같아야 리허설이 본 발표와 일치한다.
  "photo-onedays-granola": DEMO_PRODUCT,

  "photo-local-bakery-granola": {
    detected: {
      productName: "통곡물 그래놀라 (소분)",
      brand: "동네베이커리",
      ocrText: "동네베이커리 · 통곡물 그래놀라 · 소분 250g",
      ingredientSource: "사진 판독",
      ingredients: [
        "귀리", "현미", "보리", "아몬드", "호두", "건포도",
        "조청", "포도씨유", "정제소금", "계피분말",
      ],
      confidence: 0.88,
    },
    reviews: DEMO_REVIEWS,
    verdict: verdict(
      61,
      "소분 판매라 바코드가 없어 사진으로 분석했습니다. 첨가물이 거의 없는 편이고 당류는 조청에서 옵니다. " +
        "합성 착색료·향료가 없다는 점이 같은 카테고리 공산품과의 가장 큰 차이입니다.",
    ),
    risks: [
      { name: "조청", reason: "첨가당. 정제당보다 완만하지만 당류로 계산됩니다.", level: "mid" },
      { name: "아몬드 · 호두", reason: "견과류 알레르기가 있다면 피해야 합니다.", level: "high" },
    ],
    personalized: {
      matched: [
        { name: "아몬드 · 호두", reason: "회원님이 등록한 기피 성분 '견과류'에 해당합니다.", level: "high" },
      ],
      note:
        "첨가물 기준으로는 무난하지만, 등록하신 견과류 알레르기 때문에 회원님 기준에서는 피하시는 게 좋습니다.",
    },
    factCheck: [
      {
        claim: "소분 판매 제품은 표시 의무가 없다",
        verdict: "근거 없음",
        detail:
          "즉석판매제조·가공업 영업자도 원재료명과 알레르기 유발물질을 표시해야 합니다. 표시가 없다면 판매자에게 요청할 수 있습니다.",
        source: "식품 등의 표시·광고에 관한 법률 시행규칙",
      },
    ],
    saferTips: [
      "견과류가 빠진 구성으로 소분해 달라고 요청할 수 있습니다.",
      "조청 대신 무가당으로 만들어 달라고 하면 당류가 크게 줄어듭니다.",
    ],
    meta: { elapsedMs: 3900, model: "claude-sonnet-5", unregistered: true, yukaResult: "제품을 찾을 수 없음" },
  },

  "photo-imported-protein": {
    detected: {
      productName: "웨이 아이솔레이트 (직구)",
      brand: "해외브랜드",
      ocrText: "WHEY ISOLATE · CHOCOLATE · 2 LBS · 907g",
      ingredientSource: "사진 판독",
      ingredients: [
        "분리유청단백", "코코아분말", "천연·인공향료", "수크랄로스",
        "아세설팜칼륨", "잔탄검", "대두레시틴", "정제소금",
      ],
      confidence: 0.81,
    },
    reviews: DEMO_REVIEWS,
    verdict: verdict(
      74,
      "국내 유통 제품이 아니라 바코드 DB 에 없습니다. 영문 표기를 사진으로 판독했습니다. " +
        "단백질 함량은 높고, 감미료로 수크랄로스와 아세설팜칼륨이 함께 쓰였습니다.",
    ),
    risks: [
      { name: "수크랄로스", reason: "인공감미료. 통상 섭취량에서는 안전하다고 보지만 매일 반복 섭취라면 총량을 보는 게 좋습니다.", level: "mid" },
      { name: "아세설팜칼륨", reason: "인공감미료. 다른 감미료와 함께 쓰이는 경우가 많아 합산 섭취량을 확인하세요.", level: "mid" },
      { name: "대두레시틴", reason: "대두 알레르기가 있다면 확인이 필요합니다.", level: "mid" },
    ],
    personalized: null,
    factCheck: [
      {
        claim: "해외 직구 보충제는 국내 기준을 적용받지 않는다",
        verdict: "근거 있음",
        detail:
          "자가소비용 직구는 통관 기준을 따르지만 국내 표시기준 대상은 아닙니다. 다만 식약처가 위해성분 검출 제품을 반입차단 목록으로 관리합니다.",
        source: "식약처 해외직구식품 올(ALL)바로",
      },
      {
        claim: "분리유청단백이 농축유청단백보다 항상 낫다",
        verdict: "근거 불충분",
        detail:
          "유당 함량이 낮아 유당불내증에는 유리하지만, 단백질 이용 효율 자체의 차이는 크지 않다는 연구가 많습니다.",
        source: "국제스포츠영양학회(ISSN) 단백질 포지션 스탠드",
      },
    ],
    saferTips: [
      "식약처 '해외직구식품 올바로' 에서 반입차단 원료가 있는지 확인해보세요.",
      "감미료가 부담되면 무맛(Unflavored) 제품이 대안입니다.",
    ],
    meta: { elapsedMs: 5100, model: "claude-sonnet-5", unregistered: true, yukaResult: "제품을 찾을 수 없음" },
  },

  "photo-zero-soda": {
    detected: {
      productName: "제로 콜라 355ml",
      brand: "편의점 PB",
      ocrText: "PB · 제로 콜라 · 355ml · 0 kcal",
      ingredientSource: "사진 판독",
      ingredients: [
        "정제수", "탄산가스", "카라멜색소", "인산", "천연착향료",
        "카페인", "아스파탐", "아세설팜칼륨", "구연산나트륨",
      ],
      confidence: 0.9,
    },
    reviews: DEMO_REVIEWS,
    verdict: verdict(
      47,
      "열량은 0 이지만 첨가물 구성은 일반 콜라와 크게 다르지 않습니다. " +
        "인공감미료 두 종과 카라멜색소·인산·카페인이 함께 들어 있어 매일 반복 섭취라면 총량을 보는 게 좋습니다.",
    ),
    risks: [
      { name: "아스파탐", reason: "인공감미료. 페닐케톤뇨증이 있다면 피해야 합니다.", level: "mid" },
      { name: "아세설팜칼륨", reason: "인공감미료. 아스파탐과 함께 쓰여 합산 섭취량을 보는 게 좋습니다.", level: "mid" },
      { name: "카라멜색소", reason: "제조 방식에 따라 4-MEI 가 생성될 수 있어 논의가 있습니다.", level: "mid" },
      { name: "카페인", reason: "임산부·어린이는 1일 섭취권고량이 더 낮게 잡혀 있습니다.", level: "mid" },
      { name: "인산", reason: "과잉 섭취 시 칼슘 대사에 영향을 준다는 보고가 있습니다.", level: "low" },
    ],
    personalized: null,
    factCheck: [
      {
        claim: "제로 음료는 살이 안 찐다",
        verdict: "근거 불충분",
        detail:
          "열량 자체는 0 에 가깝습니다. 다만 단맛이 식욕에 미치는 영향에 대한 연구는 결론이 갈립니다.",
        source: "WHO 비당류 감미료 사용 가이드라인(2023)",
      },
      {
        claim: "아스파탐은 발암물질이다",
        verdict: "근거 불충분",
        detail:
          "IARC 가 2023년 2B군(발암 가능성 있음)으로 분류했지만, 같은 시점 JECFA 는 1일 섭취허용량을 그대로 유지했습니다. 체중 60kg 기준 하루 캔 수십 개 수준입니다.",
        source: "WHO IARC 2023 · JECFA ADI",
      },
    ],
    saferTips: [
      "카페인이 부담되면 무카페인 표기 제품이 있는지 확인해보세요.",
      "탄산수에 레몬을 넣으면 첨가물 없이 비슷한 청량감을 얻을 수 있습니다.",
    ],
    meta: { elapsedMs: 4400, model: "claude-sonnet-5", unregistered: true, yukaResult: "제품을 찾을 수 없음" },
  },

  // ── 바코드 스캔 (등록 제품) ──────────────────────────────────────────────
  // unregistered:false · yukaResult:"분석 완료" — 이 둘은 Yuka 도 찾는 제품이다.
  // 슬라이드 4-3 의 좌우 스플릿에서 "왼쪽도 되는 경우" 의 대조군이 된다.
  "8801043012345": {
    detected: {
      productName: "제주 삼다수 2L",
      brand: "제주삼다수",
      ocrText: "제주삼다수 · 먹는샘물 · 2L",
      ingredientSource: "식약처 공개데이터",
      ingredients: ["천연수(제주 화산암반수)"],
      confidence: 0.99,
    },
    reviews: DEMO_REVIEWS,
    verdict: verdict(
      92,
      "먹는샘물이라 원재료가 물 하나입니다. 첨가물도 당류도 없습니다. " +
        "수질 기준 항목은 정기 검사로 관리되며, 표기된 무기물 함량은 지역 수원에 따라 달라집니다.",
    ),
    risks: [],
    personalized: null,
    factCheck: [
      {
        claim: "생수는 개봉 후에도 오래 두고 마셔도 된다",
        verdict: "근거 불충분",
        detail:
          "개봉 시점부터 미생물이 유입될 수 있어 실온 장기 보관은 권장되지 않습니다. 유통기한은 미개봉 기준입니다.",
        source: "식약처 먹는샘물 보관 안내",
      },
    ],
    saferTips: ["개봉 후에는 냉장 보관하고 되도록 빨리 드세요."],
    meta: { elapsedMs: 1800, model: "claude-sonnet-5", unregistered: false, yukaResult: "분석 완료" },
  },

  "8801043012346": {
    detected: {
      productName: "아이시스 8.0 2L",
      brand: "롯데칠성음료",
      ocrText: "아이시스 8.0 · 먹는샘물 · 2L",
      ingredientSource: "식약처 공개데이터",
      ingredients: ["천연수"],
      confidence: 0.98,
    },
    reviews: DEMO_REVIEWS,
    verdict: verdict(
      88,
      "먹는샘물이라 첨가물이 없습니다. 제품명의 '8.0' 은 pH 표기이며, 알칼리성 자체가 건강 효과를 보장하지는 않습니다.",
    ),
    risks: [],
    personalized: null,
    factCheck: [
      {
        claim: "알칼리수가 몸을 알칼리성으로 바꿔준다",
        verdict: "근거 없음",
        detail:
          "혈액 pH 는 7.35~7.45 로 정교하게 조절되며 음용수로 바뀌지 않습니다. 위산이 pH 2 수준이라 위에서 중화됩니다.",
        source: "대한의사협회 건강정보",
      },
    ],
    saferTips: ["pH 표기보다 보관 상태와 개봉 후 섭취 기간이 실제로 중요합니다."],
    meta: { elapsedMs: 1700, model: "claude-sonnet-5", unregistered: false, yukaResult: "분석 완료" },
  },
};

/** 목록 항목에 리포트가 준비돼 있는지 */
export function hasMockReport(barcode: string): boolean {
  return barcode in MOCK_REPORTS;
}

/**
 * 최근 스캔 항목을 눌렀을 때 갈 곳.
 *
 * 리포트가 준비된 항목은 사진 분석 결과 화면으로 보낸다 — 같은 화면을 쓰므로
 * 리포트 저장·이미지 내보내기가 그대로 동작한다. 없으면 기존 바코드 결과
 * 화면으로 보낸다(실제 제품 DB 조회).
 */
export function reportHref(barcode: string): string {
  return hasMockReport(barcode)
    ? `/scan/photo?report=${encodeURIComponent(barcode)}`
    : `/scan/result/${barcode}`;
}
