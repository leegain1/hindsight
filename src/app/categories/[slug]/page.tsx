"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { getCategoryBySlug } from "@/lib/categories";
import { getProductsByCategory, sortProducts, getScoreBadgeColor, getDisplayRating, getDisplayReviewCount, type SortOrder } from "@/lib/productData";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FAQ { question: string; answer: string; verdict: string; verdictColor: string; }
interface Risk { title: string; description: string; severity: string; }
interface KeyIngredient { name: string; riskLevel: "high" | "medium" | "low"; note: string; }
interface CategoryData {
  intro: string;
  mainRisks: Risk[];
  faqs: FAQ[];
  keyIngredients: KeyIngredient[];
  tips: string[];
}

// ─── Hardcoded fallback data (shown immediately, replaced by API on success) ──
const FALLBACK: Record<string, CategoryData> = {
  water: {
    intro: "우리가 매일 마시는 물에는 생각보다 다양한 오염 물질이 포함될 수 있습니다. 수원, 정수 방식, 배관 상태에 따라 수질이 크게 달라지므로 올바른 정보가 중요합니다.",
    mainRisks: [
      { title: "미세플라스틱 오염", description: "페트병 생수와 수돗물 모두에서 검출되며, 장기 노출 시 건강 영향이 연구 중입니다.", severity: "보통" },
      { title: "중금속 (납·비소)", description: "노후 배관이나 일부 지역 수원에서 기준치 초과 사례가 보고됩니다.", severity: "높음" },
      { title: "잔류 염소", description: "소독 목적으로 첨가되며 단기 노출은 안전하나, 부산물(THM) 축적이 우려됩니다.", severity: "낮음" },
    ],
    faqs: [
      { question: "수돗물을 그냥 마셔도 되나요?", answer: "한국 수돗물은 WHO 기준을 충족하며 음용 가능합니다. 다만 노후 배관 건물은 필터 사용을 권장합니다.", verdict: "사실", verdictColor: "#2A8A5C" },
      { question: "생수가 수돗물보다 안전하다?", answer: "반드시 그렇지는 않습니다. 생수도 미세플라스틱, 세균 오염 사례가 있으며 규제도 수돗물보다 덜 엄격합니다.", verdict: "과장됨", verdictColor: "#C4780A" },
      { question: "알칼리수가 건강에 좋다?", answer: "소화 개선 효과 일부 연구가 있지만, 일반 음용수보다 우월하다는 근거는 부족합니다.", verdict: "부분사실", verdictColor: "#6B52D4" },
    ],
    keyIngredients: [
      { name: "잔류 염소", riskLevel: "low", note: "소독 부산물 트리할로메탄(THM) 주의" },
      { name: "불소 (Fluoride)", riskLevel: "low", note: "치아 건강에 도움, 고농도 시 반점치 위험" },
      { name: "납 (Lead)", riskLevel: "high", note: "노후 배관 용출, 어린이 신경계 영향" },
      { name: "미세플라스틱", riskLevel: "medium", note: "모든 수원에서 검출, 장기 영향 연구 중" },
    ],
    tips: ["냉장고 정수 필터는 제조사 권장 주기대로 교체하세요.", "노후 아파트는 주방 수도꼭지 필터 추가 설치를 고려하세요.", "생수 페트병은 햇빛·고온 노출 시 미세플라스틱 용출이 증가합니다."],
  },
  filters: {
    intro: "정수기와 필터는 수돗물 품질을 개선하는 효과적인 수단이지만, 관리 소홀 시 오히려 세균 번식의 온상이 될 수 있습니다.",
    mainRisks: [
      { title: "필터 미교체 시 세균 오염", description: "교체 주기를 넘긴 필터는 세균, 곰팡이 번식 위험이 급증합니다.", severity: "높음" },
      { title: "역삼투압의 미네랄 제거", description: "RO 방식은 중금속뿐 아니라 칼슘, 마그네슘 등 유익 미네랄도 제거합니다.", severity: "보통" },
      { title: "2차 오염", description: "내부 탱크·배관 청소 미흡 시 정수된 물이 오히려 오염될 수 있습니다.", severity: "보통" },
    ],
    faqs: [
      { question: "역삼투압(RO) 정수기가 가장 좋은가요?", answer: "중금속·불순물 제거율이 높지만, 미네랄도 함께 제거되고 물 낭비가 3-4배입니다. 수질에 따라 적합한 방식이 다릅니다.", verdict: "부분사실", verdictColor: "#6B52D4" },
      { question: "필터 교체 안 하면 안전하지 않나요?", answer: "네. 활성탄 필터는 포화 시 오히려 오염물을 방류하며, 습한 환경에서 세균이 증식합니다.", verdict: "사실", verdictColor: "#2A8A5C" },
    ],
    keyIngredients: [
      { name: "활성탄 (Activated Carbon)", riskLevel: "low", note: "염소·냄새 제거, 포화 후 오염물 방류 위험" },
      { name: "역삼투압 멤브레인", riskLevel: "low", note: "99% 불순물 제거, 미네랄도 제거됨" },
      { name: "UV 살균 램프", riskLevel: "low", note: "세균 사멸 효과적, 화학물질 미제거" },
    ],
    tips: ["필터 교체 일정을 달력/앱에 등록하세요.", "정수기 내부 탱크는 6개월마다 세척을 권장합니다.", "렌탈 정수기는 계약 시 정기 위생점검 조항을 확인하세요."],
  },
  "air-purifiers": {
    intro: "공기청정기는 미세먼지와 알레르겐 제거에 효과적이지만, 모든 실내 오염 물질을 제거하지는 못하며 적절한 환기를 대체할 수 없습니다.",
    mainRisks: [
      { title: "HEPA 필터 한계", description: "바이러스·VOC·이산화탄소 등은 HEPA 필터로 제거되지 않습니다.", severity: "보통" },
      { title: "오존 발생 제품", description: "일부 이온·플라즈마 방식 제품은 오존을 발생시켜 기도를 자극합니다.", severity: "높음" },
      { title: "필터 교체 미흡", description: "포화된 필터는 미세먼지를 재방출하거나 세균 번식지가 됩니다.", severity: "보통" },
    ],
    faqs: [
      { question: "공기청정기로 코로나 바이러스를 막을 수 있나요?", answer: "H13 이상 HEPA 필터는 에어로졸 입자를 걸러내지만, 완전한 차단은 불가능합니다. 환기와 병행해야 합니다.", verdict: "부분사실", verdictColor: "#6B52D4" },
      { question: "음이온 공기청정기가 더 효과적이다?", answer: "음이온 발생 방식은 오존 부산물이 생성될 수 있어 건강에 해로울 수 있습니다. 일반 HEPA 방식이 더 안전합니다.", verdict: "거짓", verdictColor: "#C44B4B" },
    ],
    keyIngredients: [
      { name: "HEPA 필터", riskLevel: "low", note: "0.3μm 이상 입자 99.97% 포집" },
      { name: "활성탄 필터", riskLevel: "low", note: "VOC·냄새 흡착, 정기 교체 필요" },
      { name: "오존 (부산물)", riskLevel: "high", note: "이온·UV 방식에서 발생, 폐 자극" },
    ],
    tips: ["CADR 수치가 공간 면적의 2/3 이상인 제품을 선택하세요.", "취침 시에는 저소음 모드로 켜두되, 낮에는 창문을 열어 환기하세요.", "HEPA 필터 교체 시기를 알림으로 설정하세요."],
  },
  food: {
    intro: "현대 식품 시스템에서 첨가물과 초가공식품은 일상이 되었습니다. 어떤 성분이 실제로 위험하고 어떤 것이 과장된 우려인지 구분하는 것이 중요합니다.",
    mainRisks: [
      { title: "초가공식품 (NOVA 4)", description: "NOVA 4 식품의 과다 섭취는 비만, 심혈관 질환, 암과 연관된다는 대규모 연구가 있습니다.", severity: "높음" },
      { title: "인공 색소", description: "일부 타르 색소(적색 40호 등)는 어린이 과잉행동과 연관 가능성이 연구 중입니다.", severity: "보통" },
      { title: "나트륨 과다", description: "가공식품의 나트륨은 고혈압·신장 질환의 주요 원인입니다.", severity: "높음" },
    ],
    faqs: [
      { question: "아질산나트륨이 암을 유발하나요?", answer: "가공육의 아질산나트륨은 고온 조리 시 발암 가능성이 있는 니트로사민을 생성합니다. WHO는 가공육을 1군 발암물질로 분류했습니다.", verdict: "부분사실", verdictColor: "#6B52D4" },
      { question: "천연 방부제는 인공 방부제보다 안전한가요?", answer: "반드시 그렇지 않습니다. 소르빈산 등 천연 방부제도 고농도에서는 독성이 있으며, 안전성은 성분과 용량으로 판단해야 합니다.", verdict: "과장됨", verdictColor: "#C4780A" },
    ],
    keyIngredients: [
      { name: "아질산나트륨", riskLevel: "medium", note: "햄·소시지 보존제, 고온 조리 시 발암 가능" },
      { name: "아스파탐", riskLevel: "medium", note: "WHO 2B군 발암 가능성, 섭취 허용량 내 안전" },
      { name: "인산염", riskLevel: "medium", note: "가공육·음료에 다량, 신장 기능 영향" },
      { name: "고과당 옥수수 시럽", riskLevel: "high", note: "비만·대사증후군 강한 연관성" },
    ],
    tips: ["식품 라벨에서 성분 목록 앞 5개를 확인하세요. 설탕이 상위에 있으면 주의하세요.", "가공육(햄, 소시지)은 주 2회 이하로 제한하세요.", "NOVA 분류 앱을 활용해 초가공식품 섭취를 추적하세요."],
  },
  "personal-care": {
    intro: "우리가 매일 피부에 바르는 화장품과 위생용품에는 수백 가지 화학 성분이 포함됩니다. 피부를 통한 흡수율은 낮지만, 매일 반복되는 노출의 누적 영향을 고려해야 합니다.",
    mainRisks: [
      { title: "파라벤 (방부제)", description: "에스트로겐 유사 작용으로 호르몬 교란 가능성이 있으나, 저농도 노출의 실제 위험은 불명확합니다.", severity: "보통" },
      { title: "설페이트 (계면활성제)", description: "SLS/SLES는 피부 자극과 수분 장벽 손상의 원인이 될 수 있습니다.", severity: "낮음" },
      { title: "옥시벤존 (선크림)", description: "호르몬 교란 가능성과 산호초 생태계 파괴로 일부 지역에서 금지됩니다.", severity: "보통" },
    ],
    faqs: [
      { question: "파라벤 없는 제품이 더 안전한가요?", answer: "파라벤 대체 방부제(페녹시에탄올 등)가 반드시 더 안전하지는 않습니다. 제품 전체 성분 맥락에서 판단해야 합니다.", verdict: "부분사실", verdictColor: "#6B52D4" },
      { question: "자외선 차단제를 매일 발라야 하나요?", answer: "네. 자외선 노출로 인한 피부암 위험을 고려하면 매일 사용이 권장됩니다. 옥시벤존이 우려되면 미네랄 선크림을 대안으로 사용하세요.", verdict: "사실", verdictColor: "#2A8A5C" },
    ],
    keyIngredients: [
      { name: "파라벤 (Paraben)", riskLevel: "medium", note: "호르몬 교란 우려, EU 일부 제한" },
      { name: "SLS/SLES", riskLevel: "low", note: "피부 자극, 민감성 피부 주의" },
      { name: "옥시벤존", riskLevel: "medium", note: "선크림 자외선 차단제, 호르몬 교란 가능" },
      { name: "포름알데히드 방출 방부제", riskLevel: "high", note: "알레르기·발암 가능성, 라벨 확인 필수" },
    ],
    tips: ["EWG 코스메틱스 데이터베이스에서 제품 성분을 확인하세요.", "향수 성분은 라벨에 '향료'로만 표기되어 수십 가지 화학물이 숨어 있을 수 있습니다.", "임산부는 레티놀, 살리실산 고농도 제품을 피하세요."],
  },
  household: {
    intro: "가정에서 사용하는 세제, 방향제, 살충제는 실내 공기질에 직접 영향을 미칩니다. 실내 공기가 실외보다 2-5배 오염되어 있다는 연구 결과도 있습니다.",
    mainRisks: [
      { title: "VOC (휘발성 유기화합물)", description: "세정제, 방향제, 페인트에서 방출되며 실내 공기를 오염시키고 두통, 호흡기 자극을 유발합니다.", severity: "높음" },
      { title: "계면활성제 잔류", description: "세탁 후 옷에 남은 계면활성제가 피부에 장시간 접촉할 수 있습니다.", severity: "보통" },
      { title: "살충제 신경독성", description: "피레스로이드 계열 살충제는 어린이와 반려동물에게 더 민감하게 작용합니다.", severity: "높음" },
    ],
    faqs: [
      { question: "친환경 세제가 세척력이 떨어지나요?", answer: "현대 친환경 세제는 기존 제품과 유사한 세척력을 가집니다. 단, 기름기 심한 오염에서는 차이가 있을 수 있습니다.", verdict: "부분사실", verdictColor: "#6B52D4" },
      { question: "방향제가 실내 공기에 나쁜가요?", answer: "합성 방향제는 VOC를 방출하며 특히 밀폐된 공간에서 실내 공기질을 악화시킵니다. 환기와 함께 사용하거나 천연 제품을 선택하세요.", verdict: "사실", verdictColor: "#2A8A5C" },
    ],
    keyIngredients: [
      { name: "클로로포름 (부산물)", riskLevel: "high", note: "표백제+암모니아 혼합 시 생성" },
      { name: "에탄올아민 (MEA/DEA/TEA)", riskLevel: "medium", note: "발암 가능성, EU 일부 제한" },
      { name: "합성 향료", riskLevel: "medium", note: "알레르겐 포함 가능, VOC 방출" },
      { name: "피레스로이드", riskLevel: "medium", note: "살충 성분, 어린이·고양이 민감" },
    ],
    tips: ["세제를 섞지 마세요. 표백제+암모니아는 독성 가스가 발생합니다.", "살충제 사용 후 30분 이상 환기하세요.", "가능하면 베이킹소다, 구연산 등 천연 세정제를 활용하세요."],
  },
  clothing: {
    intro: "의류에 사용되는 합성섬유, 염료, 방수 코팅제는 피부 접촉을 통해 장기간 노출될 수 있습니다. 특히 새 옷의 잔류 화학물질과 세탁 시 방출되는 마이크로플라스틱이 주목받고 있습니다.",
    mainRisks: [
      { title: "PFAS (방수 코팅)", description: "영구화학물질로 불리는 PFAS는 분해되지 않아 체내 축적되며 암, 호르몬 교란과 연관됩니다.", severity: "높음" },
      { title: "마이크로플라스틱 방출", description: "합성섬유 세탁 시 수백만 개의 마이크로파이버가 방출되어 수계를 오염시킵니다.", severity: "보통" },
      { title: "포름알데히드 처리 (구김 방지)", description: "주름 방지 처리 의류에서 포름알데히드가 방출되어 피부를 자극할 수 있습니다.", severity: "보통" },
    ],
    faqs: [
      { question: "새 옷은 세탁 후 입어야 하나요?", answer: "네. 제조 과정에서 사용된 화학 처리제, 보존제, 운송 오염물 제거를 위해 새 옷은 한 번 세탁 후 착용을 권장합니다.", verdict: "사실", verdictColor: "#2A8A5C" },
      { question: "면 100% 옷이 항상 안전한가요?", answer: "천연섬유도 농약 잔류물, 염료, 구김 방지 처리 등의 화학물질이 포함될 수 있습니다. 유기농 인증 제품이 더 안전합니다.", verdict: "부분사실", verdictColor: "#6B52D4" },
    ],
    keyIngredients: [
      { name: "PFAS (과불화화합물)", riskLevel: "high", note: "방수·발수 코팅, 체내 축적, 암 연관성" },
      { name: "아조 염료", riskLevel: "medium", note: "일부 발암 아민 방출, EU 제한" },
      { name: "포름알데히드", riskLevel: "medium", note: "구김 방지 처리, 피부 알레르기" },
      { name: "폴리에스터 마이크로파이버", riskLevel: "medium", note: "세탁 시 미세플라스틱 방출" },
    ],
    tips: ["새 옷은 반드시 한 번 세탁 후 착용하세요.", "합성섬유 세탁 시 마이크로플라스틱 필터 세탁망 사용을 권장합니다.", "방수 재킷은 PFAS-free 제품인지 확인하세요."],
  },
  pets: {
    intro: "반려동물은 사람보다 체중이 작고 화학물질에 더 민감하게 반응합니다. 특히 고양이는 간 대사 능력이 달라 사람에게 안전한 성분도 위험할 수 있습니다.",
    mainRisks: [
      { title: "사료 내 중금속", description: "일부 반려동물 사료에서 납, 비소, 카드뮴이 기준치를 초과한 사례가 있습니다.", severity: "높음" },
      { title: "필수 영양소 불균형", description: "곡물 없는(Grain-free) 사료와 심장병 연관성이 FDA 조사 중입니다.", severity: "보통" },
      { title: "살충제 성분 (벼룩 예방)", description: "피레스린 계열 벼룩 예방 제품은 고양이에게 치명적일 수 있습니다.", severity: "높음" },
    ],
    faqs: [
      { question: "그레인프리 사료가 더 건강한가요?", answer: "과학적으로 입증되지 않았으며, FDA는 그레인프리 사료와 개의 확장성 심근증(DCM) 연관성을 조사 중입니다.", verdict: "부분사실", verdictColor: "#6B52D4" },
      { question: "집에서 만든 반려동물 식단이 더 좋나요?", answer: "영양 불균형 위험이 높습니다. 수의사 영양 전문가의 처방 없이 자가 제조 식단은 권장되지 않습니다.", verdict: "거짓", verdictColor: "#C44B4B" },
    ],
    keyIngredients: [
      { name: "에톡시퀸 (방부제)", riskLevel: "medium", note: "사료 산화방지제, 발암 논란" },
      { name: "BHA/BHT", riskLevel: "medium", note: "합성 방부제, 발암 가능성 논란" },
      { name: "피레스린", riskLevel: "high", note: "벼룩 구제제, 고양이 신경독성 위험" },
      { name: "자일리톨", riskLevel: "high", note: "개에게 치명적 저혈당 유발" },
    ],
    tips: ["반려동물 사료는 AAFCO 또는 FEDIAF 인증 제품을 선택하세요.", "고양이 주변에는 방향제, 에센셜오일(특히 티트리)을 사용하지 마세요.", "벼룩 예방 제품 선택 전 수의사와 상담하세요."],
  },
  supplements: {
    intro: "보충제 시장은 규제가 식품·의약품보다 느슨한 경우가 많아 품질과 효능이 제품마다 크게 다릅니다. 필요한 영양소를 적절한 용량으로 섭취하는 것이 핵심입니다.",
    mainRisks: [
      { title: "과다 복용 독성", description: "지용성 비타민(A, D, E, K)은 과다 복용 시 체내 축적되어 독성을 나타냅니다.", severity: "높음" },
      { title: "약물 상호작용", description: "오메가3, 비타민E, 마늘 보충제는 항응고제와 상호작용이 있어 출혈 위험을 높일 수 있습니다.", severity: "보통" },
      { title: "품질 불일치", description: "일부 보충제는 라벨 표기량과 실제 함량이 크게 다르거나 오염 물질이 포함된 경우가 있습니다.", severity: "보통" },
    ],
    faqs: [
      { question: "비타민D 보충제가 필요한가요?", answer: "한국인의 80% 이상이 비타민D 부족 상태입니다. 실내 생활이 많다면 하루 1000-2000IU 보충이 권장됩니다.", verdict: "사실", verdictColor: "#2A8A5C" },
      { question: "마그네슘이 수면에 도움이 되나요?", answer: "마그네슘 결핍이 있을 경우 수면 개선 효과가 있다는 연구가 있습니다. 그러나 결핍이 없을 경우 효과는 제한적입니다.", verdict: "부분사실", verdictColor: "#6B52D4" },
    ],
    keyIngredients: [
      { name: "비타민 A (레티놀)", riskLevel: "medium", note: "과다복용 시 간독성, 임산부 주의" },
      { name: "비타민 D", riskLevel: "low", note: "10,000IU 이상 장기복용 시 독성" },
      { name: "철분 (Iron)", riskLevel: "medium", note: "비빈혈인에게 과다복용 시 산화 스트레스" },
      { name: "크레아틴", riskLevel: "low", note: "신장 기능 정상인에게 안전, 신장 질환 시 주의" },
    ],
    tips: ["보충제 복용 전 혈액 검사로 실제 결핍 여부를 확인하세요.", "NSF, USP, Informed Sport 인증 제품을 선택하면 품질을 더 신뢰할 수 있습니다.", "여러 보충제를 동시에 복용할 때는 약사 또는 의사와 상호작용을 확인하세요."],
  },
  baby: {
    intro: "유아는 단위 체중당 화학물질 노출량이 성인보다 많고, 해독 능력이 미성숙합니다. 유아용품 선택에서 성분 안전성이 특히 중요한 이유입니다.",
    mainRisks: [
      { title: "BPA·BPS (비스페놀)", description: "플라스틱 젖병, 식품 용기에서 용출되어 호르몬 교란을 일으킬 수 있습니다.", severity: "높음" },
      { title: "프탈레이트 (장난감·기저귀)", description: "부드러운 플라스틱 장난감과 일부 기저귀에서 검출되며 생식 독성이 우려됩니다.", severity: "높음" },
      { title: "이유식 중금속", description: "일부 이유식(쌀 기반)에서 비소, 납이 기준치에 근접하거나 초과한 사례가 보고됩니다.", severity: "높음" },
    ],
    faqs: [
      { question: "BPA-free 제품은 완전히 안전한가요?", answer: "BPA를 대체한 BPS, BPF도 유사한 호르몬 교란 우려가 있습니다. '비스페놀-free' 전체를 확인하는 것이 더 안전합니다.", verdict: "부분사실", verdictColor: "#6B52D4" },
      { question: "분유가 모유보다 안전한가요?", answer: "모유는 아기에게 최적화된 영양과 면역물질을 제공하지만, 산모 환경 오염물질이 전달될 수 있습니다. 분유도 안전하게 제조되나 모유의 면역 기능은 대체할 수 없습니다.", verdict: "부분사실", verdictColor: "#6B52D4" },
    ],
    keyIngredients: [
      { name: "BPA (비스페놀A)", riskLevel: "high", note: "호르몬 교란, 플라스틱 용기 주의" },
      { name: "프탈레이트", riskLevel: "high", note: "생식 독성, 부드러운 PVC 장난감" },
      { name: "무기 비소", riskLevel: "high", note: "쌀 이유식에서 검출, 발달 영향" },
      { name: "파라벤 (유아 스킨케어)", riskLevel: "medium", note: "호르몬 교란, 유아 제품 사용 주의" },
    ],
    tips: ["유리 또는 스테인리스 젖병을 우선 고려하세요.", "이유식은 쌀 기반만 의존하지 말고 다양한 곡물을 혼합하세요.", "유아 장난감은 EN71 또는 KC 인증 제품을 확인하세요."],
  },
};

// ─── Colors ───────────────────────────────────────────────────────────────────
const SEVERITY_COLOR: Record<string, string> = {
  높음: "#C44B4B",
  보통: "#C4780A",
  낮음: "#2A8A5C",
};

const RISK_COLOR: Record<string, string> = {
  high: "#C44B4B",
  medium: "#C4780A",
  low: "#2A8A5C",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const meta = getCategoryBySlug(slug);
  const fallback = FALLBACK[slug] ?? null;

  // Start with fallback data so the page renders immediately
  const [data, setData] = useState<CategoryData | null>(fallback);
  const [apiState, setApiState] = useState<"loading" | "done" | "error">(
    fallback ? "loading" : "done"
  );
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("score-desc");

  const allProducts = getProductsByCategory(slug);
  const rankedProducts = sortProducts(allProducts, sortOrder);

  useEffect(() => {
    if (!meta) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    fetch(`/api/category/${slug}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<CategoryData>;
      })
      .then((d) => {
        setData(d);
        setApiState("done");
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") console.error("[category api]", err);
        setApiState("error");
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [slug, meta]);

  if (!meta) {
    return (
      <main style={{ minHeight: "100dvh", background: "#F5F2EC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap'); * { box-sizing:border-box; margin:0; padding:0; }`}</style>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#8A8880" }}>알 수 없는 카테고리입니다.</p>
        <button onClick={() => router.push("/categories")} style={{ padding: "10px 20px", background: "#0A0A0A", color: "#F5F2EC", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
          카테고리로 돌아가기
        </button>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: "100dvh",
      background: "#F5F2EC",
      fontFamily: "'Space Grotesk', -apple-system, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif",
      paddingBottom: 64,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "calc(20px + env(safe-area-inset-top)) 24px 20px", borderBottom: "0.5px solid #D8D4CC" }}>
        <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "0 8px", minHeight: 44 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 2L4 8L10 14" stroke="#0A0A0A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#8A8880", letterSpacing: "1px" }}>CATEGORIES</span>
        </button>
        <span style={{ fontSize: 18, fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', sans-serif" }}>{meta.emoji}</span>
      </header>

      {/* Hero — always visible */}
      <div style={{ background: "#0A0A0A", padding: "32px 24px 28px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#4A4A48", letterSpacing: "2px", marginBottom: 10 }}>CATEGORY</p>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <span style={{ fontSize: 36, fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', sans-serif" }}>{meta.emoji}</span>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 300, color: "#F5F2EC", letterSpacing: "-0.3px" }}>{meta.nameKo}</h1>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#4A4A48", letterSpacing: "1px", marginTop: 4 }}>{meta.nameEn.toUpperCase()}</p>
            </div>
          </div>
          {/* Intro — from fallback immediately, updated by API */}
          {data?.intro && (
            <p style={{ fontSize: 13, fontWeight: 300, color: "rgba(245,242,236,0.6)", lineHeight: 1.6 }}>
              {data.intro}
            </p>
          )}
          {/* AI loading badge */}
          {apiState === "loading" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4A4A48", animation: "pulse 1.2s ease-in-out infinite" }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#4A4A48", letterSpacing: "1.5px" }}>
                AI 추가 정보 로딩 중...
              </span>
            </div>
          )}
          {apiState === "error" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#6A6A60", letterSpacing: "1px" }}>
                AI 추가 정보 로드 실패
              </span>
              <button
                onClick={() => {
                  setApiState("loading");
                  const controller = new AbortController();
                  const tid = setTimeout(() => controller.abort(), 30000);
                  fetch(`/api/category/${slug}`, { signal: controller.signal })
                    .then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<CategoryData>; })
                    .then((d) => { setData(d); setApiState("done"); })
                    .catch(() => setApiState("error"))
                    .finally(() => clearTimeout(tid));
                }}
                style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#F5F2EC", background: "rgba(245,242,236,0.1)", border: "0.5px solid rgba(245,242,236,0.2)", borderRadius: 4, padding: "2px 8px", cursor: "pointer", letterSpacing: "1px" }}
              >
                재시도
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content — always rendered from fallback, no spinner blocking */}
      {data && (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px 0", animation: "fadeUp var(--dur-reveal) var(--ease-out-quint) both" }}>

          {/* Product Ranking */}
          {rankedProducts.length > 0 && (
            <div style={{ marginBottom: 28 }}>

              {/* ── TOP 3 horizontal scroll ── */}
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px", marginBottom: 12 }}>TOP 3</p>
              <div className="scroll-x" style={{ margin: "0 -20px", paddingLeft: 20, marginBottom: 24 }}>
                <div style={{ display: "flex", gap: 10, paddingRight: 20 }}>
                  {[...allProducts].sort((a, b) => b.score - a.score).slice(0, 3).map((product, i) => {
                    const MEDALS = [
                      { label: "1ST", bg: "#C4A500", text: "#fff" },
                      { label: "2ND", bg: "#8A8880", text: "#fff" },
                      { label: "3RD", bg: "#A0653A", text: "#fff" },
                    ];
                    const medal = MEDALS[i];
                    const scoreColor = getScoreBadgeColor(product.score);
                    const rating = getDisplayRating(product.score);
                    return (
                      <div
                        key={product.barcode}
                        onClick={() => router.push(`/scan/result/${product.barcode}`)}
                        style={{ flexShrink: 0, width: 148, background: "#EDEAE3", border: `0.5px solid ${medal.bg}40`, borderRadius: 14, overflow: "hidden", cursor: "pointer" }}
                      >
                        {/* Image area */}
                        <div style={{ position: "relative", height: 100, background: "#E4E1DA", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 36, fontFamily: "'Apple Color Emoji','Segoe UI Emoji',sans-serif" }}>{meta.emoji}</span>
                          {product.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              loading="lazy"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
                            />
                          )}
                          {/* Medal badge */}
                          <div style={{ position: "absolute", top: 8, left: 8, minWidth: 28, height: 20, borderRadius: 4, background: medal.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, fontWeight: 500, color: medal.text, letterSpacing: "0.5px" }}>{medal.label}</span>
                          </div>
                          {/* Score badge */}
                          <div style={{ position: "absolute", top: 8, right: 8, width: 32, height: 32, borderRadius: "50%", background: scoreColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, color: "#fff" }}>{product.score}</span>
                          </div>
                        </div>
                        {/* Info */}
                        <div style={{ padding: "10px 12px 12px" }}>
                          <p style={{ fontSize: 12, fontWeight: 500, color: "#0A0A0A", lineHeight: 1.35, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {product.name}
                          </p>
                          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", letterSpacing: "0.3px", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {product.brand}
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ color: "#C4780A", fontSize: 10, lineHeight: 1 }}>{"★".repeat(Math.round(rating))}</span>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880" }}>{rating.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Sort toggle + 2-col grid ── */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px" }}>ALL PRODUCTS</p>
                <div style={{ display: "flex", gap: 2 }}>
                  {([ ["score-desc", "점수↓"], ["score-asc", "점수↑"], ["name-asc", "이름순"] ] as [SortOrder, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setSortOrder(val)}
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 7,
                        letterSpacing: "0.5px",
                        padding: "3px 7px",
                        border: "0.5px solid",
                        borderColor: sortOrder === val ? "#0A0A0A" : "#D8D4CC",
                        borderRadius: 4,
                        background: sortOrder === val ? "#0A0A0A" : "transparent",
                        color: sortOrder === val ? "#F5F2EC" : "#8A8880",
                        cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2-col grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {rankedProducts.map((product, i) => {
                  const scoreColor = getScoreBadgeColor(product.score);
                  const rating = getDisplayRating(product.score);
                  const reviewCount = getDisplayReviewCount(product.barcode);
                  return (
                    <div
                      key={product.barcode}
                      onClick={() => router.push(`/scan/result/${product.barcode}`)}
                      style={{ background: "#EDEAE3", border: "0.5px solid #D8D4CC", borderRadius: 14, overflow: "hidden", cursor: "pointer" }}
                    >
                      {/* Image area */}
                      <div style={{ position: "relative", height: 110, background: "#E4E1DA", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 30, fontFamily: "'Apple Color Emoji','Segoe UI Emoji',sans-serif", opacity: product.imageUrl ? 0.2 : 1 }}>{meta.emoji}</span>
                        {product.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            loading="lazy"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
                          />
                        )}
                        {/* Rank badge */}
                        <span style={{ position: "absolute", top: 8, left: 8, fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 500, color: i < 3 ? "#0A0A0A" : "#8A8880", background: "rgba(245,242,236,0.88)", borderRadius: 4, padding: "2px 6px", letterSpacing: "0.3px" }}>
                          #{i + 1}
                        </span>
                        {/* Score badge */}
                        <div style={{ position: "absolute", top: 8, right: 8, width: 34, height: 34, borderRadius: "50%", background: scoreColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, color: "#fff", letterSpacing: "-0.5px" }}>{product.score}</span>
                        </div>
                      </div>
                      {/* Info */}
                      <div style={{ padding: "10px 12px 12px" }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: "#0A0A0A", lineHeight: 1.35, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {product.name}
                        </p>
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", letterSpacing: "0.3px", marginBottom: 7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {product.brand}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ color: "#C4780A", fontSize: 9, lineHeight: 1 }}>
                            {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
                          </span>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880" }}>({reviewCount})</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* Main Risks */}
          {data.mainRisks?.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px", marginBottom: 12 }}>MAIN RISKS</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.mainRisks.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, background: "#EDEAE3", border: "0.5px solid #D8D4CC", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: SEVERITY_COLOR[r.severity] ?? "#8A8880", flexShrink: 0, marginTop: 5 }} />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "#0A0A0A" }}>{r.title}</p>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: SEVERITY_COLOR[r.severity] ?? "#8A8880", letterSpacing: "1px" }}>{r.severity}</span>
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.5 }}>{r.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Ingredients */}
          {data.keyIngredients?.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px", marginBottom: 12 }}>KEY INGREDIENTS TO WATCH</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {data.keyIngredients.map((ing, i) => (
                  <div
                    key={i}
                    onClick={() => router.push(`/ingredient/${encodeURIComponent(ing.name)}`)}
                    style={{ display: "flex", alignItems: "center", gap: 12, background: "#EDEAE3", border: "0.5px solid #D8D4CC", borderRadius: 10, padding: "12px 14px", cursor: "pointer" }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: RISK_COLOR[ing.riskLevel], flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 400, color: "#0A0A0A", marginBottom: 2 }}>{ing.name}</p>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "0.5px" }}>{ing.note}</p>
                    </div>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M3 2L9 6L3 10" stroke="#8A8880" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQ */}
          {data.faqs?.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px", marginBottom: 12 }}>FAQ</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.faqs.map((faq, i) => (
                  <div key={i} style={{ background: "#EDEAE3", border: "0.5px solid #D8D4CC", borderRadius: 12, overflow: "hidden" }}>
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", gap: 12, textAlign: "left" }}
                    >
                      <p style={{ fontSize: 13, fontWeight: 400, color: "#0A0A0A", lineHeight: 1.4, flex: 1 }}>{faq.question}</p>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform var(--dur-state) var(--ease-out-quart)" }}>
                        <path d="M2 4L7 10L12 4" stroke="#8A8880" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {/* 조건부 렌더에서 grid 펼치기로 바꿨다. 내용이 DOM 에서
                        사라졌다 나타나면 애니메이션할 대상 자체가 없다.
                        aria-hidden 으로 닫힌 답변은 스크린리더에서도 빼둔다. */}
                    <div className="collapsible" data-open={openFaq === i} aria-hidden={openFaq !== i}>
                      <div>
                        <div style={{ padding: "0 16px 16px" }}>
                          <p style={{ fontSize: 12, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.6, marginBottom: 10 }}>{faq.answer}</p>
                          <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, background: "#F5F2EC", border: "0.5px solid #D8D4CC", fontFamily: "'DM Mono', monospace", fontSize: 8, color: faq.verdictColor, letterSpacing: "0.5px" }}>
                            {faq.verdict}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {data.tips?.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px", marginBottom: 12 }}>PRACTICAL TIPS</p>
              <div style={{ background: "#0A0A0A", borderRadius: 12, padding: "16px" }}>
                {data.tips.map((tip, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < data.tips.length - 1 ? 10 : 0 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#4A4A48", flexShrink: 0, paddingTop: 1 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p style={{ fontSize: 13, fontWeight: 300, color: "#F5F2EC", lineHeight: 1.5 }}>{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deep dive CTA */}
          <div
            style={{ background: "#EDEAE3", border: "0.5px solid #D8D4CC", borderRadius: 12, padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, cursor: "pointer" }}
            onClick={() => router.push(`/search?q=${encodeURIComponent(meta.nameKo + " 건강 위험")}`)}
          >
            <div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1px", marginBottom: 4 }}>DEEP DIVE</p>
              <p style={{ fontSize: 13, fontWeight: 300, color: "#0A0A0A" }}>{meta.nameKo} 팩트체크 더 보기</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M13 8L8 3M13 8L8 13" stroke="#0A0A0A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

        </div>
      )}
    </main>
  );
}
