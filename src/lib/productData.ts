// ─────────────────────────────────────────────────────────────────────────────
// HINDSIGHT+ — Category product rankings
// Hardcoded data for Korean market products, scored by ingredient safety
// ─────────────────────────────────────────────────────────────────────────────

export interface RankedProduct {
  barcode: string;
  name: string;
  brand: string;
  score: number;
  highlights: string[];
  warnings: string[];
  category: string;
  imageUrl?: string;
}

export function getScoreBadgeColor(score: number): string {
  if (score >= 80) return "#2A8A5C";
  if (score >= 60) return "#C4780A";
  if (score >= 40) return "#C05000";
  return "#C44B4B";
}

const PRODUCTS: Record<string, RankedProduct[]> = {

  water: [
    { barcode: "8801043012345", name: "제주 삼다수 2L", brand: "제주삼다수", score: 92, highlights: ["미네랄 균형 우수", "검증된 수원지"], warnings: [], category: "water" },
    { barcode: "8801043012346", name: "아이시스 8.0 2L", brand: "롯데칠성음료", score: 88, highlights: ["pH 8.0 약알칼리", "깨끗한 수질"], warnings: [], category: "water" },
    { barcode: "8801043012347", name: "백산수 2L", brand: "농심", score: 87, highlights: ["백두산 화산암반수", "천연 규소 함유"], warnings: [], category: "water" },
    { barcode: "3057640100704", name: "에비앙 1.5L", brand: "Evian", score: 85, highlights: ["알프스 천연 미네랄", "칼슘·마그네슘 풍부"], warnings: ["플라스틱 포장"], category: "water", imageUrl: "https://images.openfoodfacts.org/images/products/305/764/010/0704/front.400.jpg" },
    { barcode: "8801043012348", name: "스파클 2L", brand: "스파클", score: 83, highlights: ["국내 청정 수원"], warnings: [], category: "water" },
    { barcode: "8801043012349", name: "강원평창수 2L", brand: "한국코카콜라", score: 82, highlights: ["강원 청정 지하수"], warnings: [], category: "water" },
    { barcode: "3228857000166", name: "볼빅 1.5L", brand: "Volvic", score: 80, highlights: ["화산 여과", "실리카 함유"], warnings: ["수입 탄소발자국"], category: "water", imageUrl: "https://images.openfoodfacts.org/images/products/322/885/700/0166/front.400.jpg" },
    { barcode: "8801043012350", name: "오아시스 2L", brand: "동원F&B", score: 76, highlights: ["지하 암반수"], warnings: [], category: "water" },
    { barcode: "8801043012351", name: "하이트진로 석수 2L", brand: "하이트진로음료", score: 74, highlights: ["천연 암반수"], warnings: [], category: "water" },
    { barcode: "5449000000996", name: "다사니 500mL", brand: "코카콜라", score: 62, highlights: [], warnings: ["정제수 기반", "미네랄 인위 첨가"], category: "water" },
    { barcode: "8801043012352", name: "씨그램 탄산수 350mL", brand: "롯데칠성", score: 60, highlights: ["탄산수"], warnings: ["탄산 산성 (pH 4.5)", "치아 에나멜 주의"], category: "water" },
    { barcode: "8801043012353", name: "풀무원 샘물 2L", brand: "풀무원", score: 85, highlights: ["국내 청정 수원", "무라벨"], warnings: [], category: "water" },
    { barcode: "8801043012354", name: "동원 샘물 2L", brand: "동원F&B", score: 82, highlights: ["국내 산지 지하수"], warnings: [], category: "water" },
    { barcode: "8801043012355", name: "지리산수 2L", brand: "광동제약", score: 84, highlights: ["지리산 화강암반수", "미네랄 풍부"], warnings: [], category: "water" },
    { barcode: "8801043012356", name: "몽베스트 2L", brand: "몽베스트", score: 78, highlights: ["프리미엄 생수"], warnings: [], category: "water" },
    { barcode: "8804278012301", name: "제주 용암해양심층수 330mL", brand: "오리온", score: 90, highlights: ["해양심층수", "미네랄 고함량", "제주 인증"], warnings: ["고가"], category: "water" },
    { barcode: "8801043012357", name: "석수 2L", brand: "롯데칠성음료", score: 80, highlights: ["경기 광주 암반수"], warnings: [], category: "water" },
    { barcode: "8801043012358", name: "평창수 2L", brand: "한국코카콜라", score: 82, highlights: ["강원 청정수"], warnings: [], category: "water" },
    { barcode: "3228857013761", name: "페리에 탄산수 330mL", brand: "Perrier", score: 75, highlights: ["천연 탄산수", "프랑스 원산"], warnings: ["탄산 산성화 (pH 5.5)", "수입 탄소발자국"], category: "water" },
    { barcode: "8801043012359", name: "하이트진로 평창수 500mL", brand: "하이트진로음료", score: 79, highlights: ["평창 청정수"], warnings: [], category: "water" },
  ],

  filters: [
    { barcode: "8806091234501", name: "LG 퓨리케어 정수기 WD523AS", brand: "LG전자", score: 90, highlights: ["UF+RO 복합필터", "직수형", "스테인리스 냉온수"], warnings: [], category: "filters" },
    { barcode: "8806091234502", name: "코웨이 나노직수 정수기 CP-7200N", brand: "코웨이", score: 88, highlights: ["나노 트랩 필터", "미세플라스틱 제거"], warnings: [], category: "filters" },
    { barcode: "8806091234503", name: "쿠쿠 인스퓨어 직수 CP-SS301FW", brand: "쿠쿠", score: 86, highlights: ["스테인리스 직수관", "UV 살균"], warnings: [], category: "filters" },
    { barcode: "8806091234504", name: "청호나이스 얼음정수기 이과수 CHP-3800", brand: "청호나이스", score: 83, highlights: ["6단계 필터", "얼음 기능"], warnings: ["탱크형 세균 주의"], category: "filters" },
    { barcode: "0764568523101", name: "브리타 마렐라 XL 3.5L", brand: "Brita", score: 78, highlights: ["가정용 피칭 필터", "독일 인증"], warnings: ["중금속 제거 한계", "4주 교체 필수"], category: "filters" },
    { barcode: "8806091234505", name: "SK매직 직수정수기 WPU-A400S", brand: "SK매직", score: 82, highlights: ["4단계 복합필터", "직수형"], warnings: [], category: "filters" },
    { barcode: "8806091234506", name: "웅진코웨이 아이콘 얼음정수기", brand: "코웨이", score: 80, highlights: ["얼음+냉온정수"], warnings: ["탱크 세척 주기 중요"], category: "filters" },
    { barcode: "0764568523102", name: "브리타 언더싱크 필터 시스템", brand: "Brita", score: 75, highlights: ["설치형", "고용량"], warnings: ["전문 설치 필요"], category: "filters" },
    { barcode: "8806091234507", name: "3M 정수기 HCD-2", brand: "3M", score: 73, highlights: ["카트리지 교체 간편"], warnings: ["필터 교체 6개월 주기"], category: "filters" },
    { barcode: "0764568523103", name: "브리타 온 탭 필터 (수도꼭지형)", brand: "Brita", score: 68, highlights: ["간편 설치"], warnings: ["수압 낮아짐", "필터 빈번 교체"], category: "filters" },
    { barcode: "8806091234508", name: "웰스 직수 정수기 WP-900W", brand: "웰스", score: 85, highlights: ["직수형", "스테인리스 냉온수", "UV 살균"], warnings: [], category: "filters" },
    { barcode: "8806091234509", name: "바이오세라 알칼리 이온수기 BCA-5000", brand: "바이오세라", score: 72, highlights: ["전기분해 알칼리수", "항산화"], warnings: ["알칼리수 과다 섭취 주의", "전극판 세척 필요"], category: "filters" },
    { barcode: "0075234000176", name: "제로워터 10컵 피처 필터 ZP-010", brand: "ZeroWater", score: 76, highlights: ["TDS 0ppm 달성", "5단계 여과"], warnings: ["미네랄 완전 제거", "필터 교체비 높음"], category: "filters" },
    { barcode: "8806091234510", name: "쿠쿠 정수기 CP-PF301FW", brand: "쿠쿠", score: 84, highlights: ["4단계 필터", "살균 청소"], warnings: [], category: "filters" },
    { barcode: "8806091234511", name: "현대렌탈케어 큐밍 정수기 HQ-600W", brand: "현대렌탈케어", score: 80, highlights: ["나노 직수", "렌탈 관리"], warnings: [], category: "filters" },
    { barcode: "8806091234512", name: "교원 웰스 퓨어 정수기 WN-300", brand: "교원웰스", score: 81, highlights: ["직수형", "자동 세척"], warnings: [], category: "filters" },
    { barcode: "8806091234513", name: "SK매직 올인원 직수정수기 WPU-B400C", brand: "SK매직", score: 83, highlights: ["커피머신 일체형", "직수형"], warnings: [], category: "filters" },
    { barcode: "0764568523104", name: "브리타 스타일 1.4L", brand: "Brita", score: 72, highlights: ["전자 교체 알림", "독일 인증"], warnings: ["중금속 제거 한계", "필터 교체 4주"], category: "filters" },
    { barcode: "8806091234514", name: "위닉스 정수기 WAPU-700B", brand: "위닉스", score: 79, highlights: ["3단계 필터", "스마트 필터 알림"], warnings: [], category: "filters" },
    { barcode: "8806091234515", name: "청호나이스 정수기 CHP-5300 직수형", brand: "청호나이스", score: 82, highlights: ["4단계 복합필터", "직수형"], warnings: [], category: "filters" },
  ],

  "air-purifiers": [
    { barcode: "5025155050859", name: "다이슨 퓨어쿨 TP09", brand: "Dyson", score: 93, highlights: ["HEPA H13 + 활성탄", "VOC 감지", "오존 미발생"], warnings: ["고가"], category: "air-purifiers" },
    { barcode: "8806091234601", name: "LG 퓨리케어 360˚ AS201VNGA", brand: "LG전자", score: 91, highlights: ["360° HEPA 필터", "초미세먼지 센서", "오존 미발생"], warnings: [], category: "air-purifiers" },
    { barcode: "8806091234602", name: "삼성 블루스카이 7000 AX70T9080WFD", brand: "삼성전자", score: 89, highlights: ["트리플 레이어 필터", "Wi-Fi 연동"], warnings: [], category: "air-purifiers" },
    { barcode: "8806091234603", name: "위닉스 타워Q ATXH571-IWK", brand: "위닉스", score: 85, highlights: ["HEPA 13등급", "냄새 제거 우수"], warnings: [], category: "air-purifiers" },
    { barcode: "6934177708756", name: "샤오미 미에어 4 Pro", brand: "Xiaomi", score: 82, highlights: ["HEPA H13", "저소음", "가성비"], warnings: ["앱 데이터 수집 논란"], category: "air-purifiers", imageUrl: "https://images.openfoodfacts.org/images/products/693/417/770/8756/front.400.jpg" },
    { barcode: "8806091234604", name: "코웨이 공기청정기 AP-1516D", brand: "코웨이", score: 80, highlights: ["4단계 필터", "렌탈 서비스"], warnings: [], category: "air-purifiers" },
    { barcode: "8806091234605", name: "블루에어 클래식 480i", brand: "Blueair", score: 88, highlights: ["HEPASilent 기술", "저소음"], warnings: ["필터 교체 비용 높음"], category: "air-purifiers" },
    { barcode: "8806091234606", name: "캐리어 에어원 플러스 CAPO-A082HW", brand: "캐리어", score: 76, highlights: ["HEPA+UV 살균"], warnings: [], category: "air-purifiers" },
    { barcode: "8806091234607", name: "샤크 AIR PURIFIER MAX", brand: "Shark", score: 74, highlights: ["HEPA", "항균 코팅"], warnings: [], category: "air-purifiers" },
    { barcode: "8806091234608", name: "이온에어 음이온 청정기 IS-800", brand: "이온에어", score: 38, highlights: [], warnings: ["오존 발생", "음이온 방식", "WHO 주의"], category: "air-purifiers" },
    { barcode: "8806091234609", name: "필립스 공기청정기 AC3858/73", brand: "Philips", score: 85, highlights: ["HEPA 13 + 활성탄", "VitaShield 기술", "3단계 필터"], warnings: [], category: "air-purifiers" },
    { barcode: "8806091234610", name: "위닉스 제로S ZS000-JMK", brand: "위닉스", score: 83, highlights: ["플라즈마웨이브 (오존 저감)", "HEPA 13"], warnings: ["플라즈마 방식 미미한 오존"], category: "air-purifiers" },
    { barcode: "8806091234611", name: "쿠쿠 공기청정기 AC-12X20FW", brand: "쿠쿠", score: 78, highlights: ["HEPA + 항균 필터", "IoT 연동"], warnings: [], category: "air-purifiers" },
    { barcode: "8806091234612", name: "다이슨 퓨어 핫앤쿨 HP09", brand: "Dyson", score: 91, highlights: ["HEPA H13", "가열·냉각 통합", "오존 미발생"], warnings: ["고가"], category: "air-purifiers" },
    { barcode: "8806091234613", name: "삼성 블루스카이 5000 AX53T9080WFD", brand: "삼성전자", score: 85, highlights: ["Wi-Fi 연동", "HEPA 필터", "미세먼지 센서"], warnings: [], category: "air-purifiers" },
    { barcode: "8806091234614", name: "코웨이 에어메가 400S AP-1519C", brand: "코웨이", score: 86, highlights: ["HyperCaptive 필터", "듀얼 모터", "스마트 관리"], warnings: [], category: "air-purifiers" },
    { barcode: "8806091234615", name: "위닉스 타워 X+ ATXR571-IWK", brand: "위닉스", score: 84, highlights: ["360° 흡입", "HEPA 13", "플라즈마웨이브"], warnings: [], category: "air-purifiers" },
    { barcode: "8806091234616", name: "청정환경 알파 AP-1600E", brand: "청정환경", score: 70, highlights: ["HEPA", "가성비"], warnings: ["필터 교체 비용 확인"], category: "air-purifiers" },
    { barcode: "8806091234617", name: "LG 퓨리케어 Mini PC154MH", brand: "LG전자", score: 85, highlights: ["소형 + 휴대용", "HEPA 13", "차량용 가능"], warnings: [], category: "air-purifiers" },
    { barcode: "8806091234618", name: "다이슨 퓨어쿨 미 DP04", brand: "Dyson", score: 88, highlights: ["HEPA H13", "탁상형", "오존 미발생"], warnings: ["고가"], category: "air-purifiers" },
  ],

  food: [
    { barcode: "8801073151154", name: "신라면 (5개입)", brand: "농심", score: 42, highlights: [], warnings: ["나트륨 1790mg/봉", "팜유 사용", "MSG 함유"], category: "food", imageUrl: "https://images.openfoodfacts.org/images/products/880/107/315/1154/front_ko.400.jpg" },
    { barcode: "8801073007452", name: "켈로그 그래놀라 오리지널", brand: "켈로그", score: 58, highlights: ["통곡물 기반"], warnings: ["당류 12g/30g", "고칼로리"], category: "food", imageUrl: "https://images.openfoodfacts.org/images/products/880/107/300/7452/front_ko.400.jpg" },
    { barcode: "8801007000174", name: "동원 참치 (라이트스탠다드)", brand: "동원", score: 72, highlights: ["단백질 풍부", "오메가3"], warnings: ["나트륨 주의", "수은 미량 함유"], category: "food", imageUrl: "https://images.openfoodfacts.org/images/products/880/100/700/0174/front_ko.400.jpg" },
    { barcode: "8801011234501", name: "CJ 햇반 210g", brand: "CJ제일제당", score: 65, highlights: ["무방부제", "쌀 100%"], warnings: ["BPA 함유 포장 논란"], category: "food" },
    { barcode: "8801011234502", name: "빙그레 바나나맛우유 240mL", brand: "빙그레", score: 55, highlights: ["칼슘 함유"], warnings: ["인공향료", "당류 25g", "색소"], category: "food" },
    { barcode: "8801117600018", name: "롯데 ABC초콜릿 187g", brand: "롯데제과", score: 38, highlights: [], warnings: ["당류 58g/100g", "포화지방", "인공색소"], category: "food" },
    { barcode: "8801045600016", name: "오리온 초코파이 정 (12개입)", brand: "오리온", score: 40, highlights: [], warnings: ["트랜스지방", "인공향료", "당류 과다"], category: "food" },
    { barcode: "8809049750965", name: "풀무원 두부 찌개용 400g", brand: "풀무원", score: 78, highlights: ["Non-GMO 인증", "무방부제", "단백질"], warnings: [], category: "food" },
    { barcode: "8801045600017", name: "오리온 닥터유 단백질바", brand: "오리온", score: 68, highlights: ["단백질 15g", "저당"], warnings: ["인공감미료 (수크랄로스)"], category: "food" },
    { barcode: "8801011234503", name: "CJ 비비고 왕교자 (냉동) 350g", brand: "CJ제일제당", score: 60, highlights: ["야채 포함"], warnings: ["나트륨 높음", "보존제"], category: "food" },
    { barcode: "8801043151200", name: "농심 새우깡 90g", brand: "농심", score: 45, highlights: [], warnings: ["나트륨 540mg", "팜유", "인공조미료"], category: "food" },
    { barcode: "8809049750966", name: "풀무원 생면식감 우동 2인분", brand: "풀무원", score: 62, highlights: ["생면 사용", "무MSG"], warnings: ["나트륨 1200mg"], category: "food" },
    { barcode: "8801073151200", name: "농심 너구리 (4개입)", brand: "농심", score: 40, highlights: ["굵은 면"], warnings: ["나트륨 1850mg/봉", "팜유 사용", "MSG"], category: "food" },
    { barcode: "8801073151201", name: "오뚜기 진라면 순한맛 (5개입)", brand: "오뚜기", score: 44, highlights: ["라면 특유의 감칠맛"], warnings: ["나트륨 1720mg/봉", "팜유"], category: "food" },
    { barcode: "8801073151202", name: "CJ 스팸 클래식 340g", brand: "CJ제일제당", score: 35, highlights: ["돼지고기 기반"], warnings: ["나트륨 800mg/서빙", "아질산나트륨 함유", "포화지방 높음"], category: "food" },
    { barcode: "8801073151203", name: "오뚜기 카레 (중간맛) 200g", brand: "오뚜기", score: 62, highlights: ["카레 향신료 기반"], warnings: ["나트륨 460mg/서빙", "팜유"], category: "food" },
    { barcode: "8801073151204", name: "롯데 빼빼로 초코 오리지널 47g", brand: "롯데제과", score: 36, highlights: [], warnings: ["당류 25g/봉", "팜유", "인공향료", "백설탕 함량 높음"], category: "food" },
    { barcode: "8801073151205", name: "해태 맛동산 90g", brand: "해태제과", score: 40, highlights: [], warnings: ["당류 14g", "팜유 사용", "인공색소"], category: "food" },
    { barcode: "8801073151206", name: "동원 참치 고추참치 135g", brand: "동원", score: 65, highlights: ["단백질 풍부", "오메가3"], warnings: ["나트륨 높음", "고추 자극"], category: "food" },
    { barcode: "8801073151207", name: "CJ 비비고 사골곰탕 500g", brand: "CJ제일제당", score: 68, highlights: ["콜라겐 풍부", "무방부제"], warnings: ["나트륨 900mg/팩"], category: "food" },
    { barcode: "8809049750967", name: "풀무원 올가 유기농 두부 400g", brand: "풀무원", score: 88, highlights: ["유기농 인증", "Non-GMO", "무방부제", "단백질"], warnings: [], category: "food" },
    { barcode: "8801073151208", name: "켈로그 첵스초코 400g", brand: "켈로그", score: 35, highlights: ["철분 강화"], warnings: ["당류 36g/100g", "초코 코팅", "인공향료"], category: "food" },
    { barcode: "8801073151209", name: "농심 새우깡 굿 (무색소) 90g", brand: "농심", score: 52, highlights: ["무색소 리뉴얼"], warnings: ["나트륨 540mg", "팜유"], category: "food" },
    { barcode: "8801011234504", name: "CJ 햇반 흑미밥 210g", brand: "CJ제일제당", score: 70, highlights: ["흑미 함유", "무방부제", "안토시아닌"], warnings: ["BPA 포장 논란"], category: "food" },
  ],

  "personal-care": [
    { barcode: "8809589200016", name: "이니스프리 그린티 씨드 세럼 80mL", brand: "이니스프리", score: 82, highlights: ["천연 성분 기반", "EWG 그린 성분"], warnings: [], category: "personal-care" },
    { barcode: "3337875547048", name: "라로슈포제 안티헬리오스 SPF50+", brand: "La Roche-Posay", score: 79, highlights: ["민감피부 적합", "파라벤 프리"], warnings: ["옥시벤존 미함유 확인 필요"], category: "personal-care" },
    { barcode: "8809589200017", name: "CeraVe 모이스처라이징 크림 454g", brand: "CeraVe", score: 88, highlights: ["세라마이드 3종", "향료 프리", "피부과 테스트"], warnings: [], category: "personal-care" },
    { barcode: "8806185782197", name: "아모레퍼시픽 설화수 자정에센스 60mL", brand: "아모레퍼시픽", score: 74, highlights: ["한방 성분", "항산화"], warnings: ["향료 함유", "고가"], category: "personal-care" },
    { barcode: "8809097805023", name: "닥터지 레드 블레미쉬 크림 70mL", brand: "Dr.G", score: 80, highlights: ["진정 성분", "알코올 프리"], warnings: [], category: "personal-care" },
    { barcode: "8801234567001", name: "LG 엘라스틴 샴푸 (댐니지케어) 400mL", brand: "LG생활건강", score: 52, highlights: ["손상모 케어"], warnings: ["SLS 함유", "실리콘 함유", "합성향료"], category: "personal-care" },
    { barcode: "8801234567002", name: "아모레퍼시픽 미쟝센 퍼펙트 세럼 샴푸", brand: "아모레퍼시픽", score: 56, highlights: [], warnings: ["설페이트 함유", "파라벤 함유"], category: "personal-care" },
    { barcode: "8809097805024", name: "닥터브로너스 퓨어 캐스틸 액체비누 (라벤더)", brand: "Dr. Bronner's", score: 90, highlights: ["유기농 인증", "비건", "생분해 가능"], warnings: [], category: "personal-care" },
    { barcode: "8809589200018", name: "이니스프리 화이트 파우더 선크림 SPF50+ PA+++", brand: "이니스프리", score: 71, highlights: ["미네랄 자외선차단"], warnings: ["산화아연 나노입자 논란"], category: "personal-care" },
    { barcode: "8801234567003", name: "애경 2080 K 치약 120g", brand: "애경", score: 68, highlights: ["불소 함유", "치석 제거"], warnings: ["인공감미료 (사카린)"], category: "personal-care" },
    { barcode: "8801234567004", name: "콜게이트 옵틱화이트 치약 100mL", brand: "콜게이트", score: 62, highlights: ["미백 효과"], warnings: ["과산화수소", "인공향료", "SLS 함유"], category: "personal-care" },
    { barcode: "8809589200019", name: "라네즈 워터뱅크 블루 히알루로닉 세럼 60mL", brand: "라네즈", score: 78, highlights: ["히알루론산 복합체", "보습 강화"], warnings: ["향료 함유"], category: "personal-care" },
    { barcode: "8809589200020", name: "코스알엑스 어드밴시드 스네일 뮤신 에센스 100mL", brand: "COSRX", score: 82, highlights: ["달팽이 분비액 96.3%", "재생 효과", "향료 프리"], warnings: [], category: "personal-care" },
    { barcode: "8809589200021", name: "아이소이 불가리안 로즈 세럼 33g", brand: "Isoi", score: 80, highlights: ["EWG 그린 성분", "불가리아 로즈", "향료 프리"], warnings: [], category: "personal-care" },
    { barcode: "8809589200022", name: "메디힐 N.M.F. 마스크팩 (10매)", brand: "Mediheal", score: 72, highlights: ["NMF 보습", "약산성"], warnings: ["카보머", "향료 미량"], category: "personal-care" },
    { barcode: "8809589200023", name: "미샤 타임 레볼루션 에센스 150mL", brand: "Missha", score: 65, highlights: ["발효 성분", "화이트닝"], warnings: ["알코올 함유", "향료"], category: "personal-care" },
    { barcode: "8809589200024", name: "클리오 킬 블랙 마스카라", brand: "CLIO", score: 60, highlights: ["컬 지속력"], warnings: ["파라벤 함유 여부 확인", "알레르기 주의"], category: "personal-care" },
    { barcode: "8801234567005", name: "LG 온더바디 바디워시 실키 모이스처 500mL", brand: "LG생활건강", score: 55, highlights: ["보습 성분"], warnings: ["SLS 함유", "합성향료 다량", "파라벤"], category: "personal-care" },
    { barcode: "8801234567006", name: "도브 보디워시 모이스처라이징 500mL", brand: "Dove", score: 65, highlights: ["1/4 보습 크림 성분"], warnings: ["SLS 함유", "합성향료"], category: "personal-care" },
    { barcode: "8801234567007", name: "아모레퍼시픽 에뛰드 순정 선크림 SPF50+ PA+++", brand: "에뛰드", score: 70, highlights: ["미네랄 선크림", "순한 성분"], warnings: ["산화아연 나노 논란"], category: "personal-care" },
    { barcode: "8801234567008", name: "닥터브로너스 페퍼민트 바 비누 140g", brand: "Dr. Bronner's", score: 92, highlights: ["유기농 코코넛오일", "비건", "공정무역"], warnings: [], category: "personal-care" },
  ],

  household: [
    { barcode: "8801234560001", name: "LG생활건강 테크 무형광 세탁세제 3L", brand: "LG생활건강", score: 68, highlights: ["무형광 증백제"], warnings: ["합성 계면활성제", "합성향료"], category: "household" },
    { barcode: "8801234560002", name: "피죤 섬유유연제 핑크로즈 2L", brand: "피죤", score: 55, highlights: [], warnings: ["합성향료 다량", "쿼터너리 암모늄 화합물"], category: "household" },
    { barcode: "8801234560003", name: "버넥스 친환경 주방세제 500mL", brand: "버넥스", score: 84, highlights: ["식물성 성분", "무방향", "생분해"], warnings: [], category: "household" },
    { barcode: "8801234560004", name: "아이깨끗해 핸드워시 250mL", brand: "아이깨끗해", score: 60, highlights: ["항균"], warnings: ["트리클로산 대체 성분 주의", "합성향료"], category: "household" },
    { barcode: "8801234560005", name: "옥시크린 세탁조 클리너 450g", brand: "옥시레킷벤키저", score: 58, highlights: ["세탁조 곰팡이 제거"], warnings: ["과탄산나트륨", "취급 주의"], category: "household" },
    { barcode: "8801234560006", name: "홈스타 살충제 에어졸 에프킬라 500mL", brand: "존슨", score: 35, highlights: ["즉각 효과"], warnings: ["피레스로이드", "어린이·반려동물 위험", "밀폐 공간 주의"], category: "household" },
    { barcode: "8801234560007", name: "페브리즈 직물 탈취제 370mL", brand: "P&G", score: 50, highlights: ["냄새 제거"], warnings: ["합성향료 VOC", "환기 필요"], category: "household" },
    { barcode: "8801234560008", name: "유한락스 주방용 750mL", brand: "유한양행", score: 45, highlights: ["강력 살균"], warnings: ["염소계", "암모니아와 혼합 금지", "환기 필수"], category: "household" },
    { barcode: "8801234560009", name: "삼성 세탁세제 크린업 파워젤 2L", brand: "삼성크린업", score: 62, highlights: ["효소 세정"], warnings: ["합성 계면활성제"], category: "household" },
    { barcode: "8801234560010", name: "에코버 주방세제 레몬 500mL", brand: "Ecover", score: 88, highlights: ["식물성", "유럽 에코라벨", "생분해 99%"], warnings: [], category: "household" },
    { barcode: "8801234560011", name: "애경 퍼울 세탁세제 3L", brand: "애경", score: 63, highlights: ["효소 세정", "저자극"], warnings: ["합성 계면활성제", "합성향료"], category: "household" },
    { barcode: "8801234560012", name: "다우니 섬유유연제 (그린·실크) 2.6L", brand: "P&G", score: 52, highlights: ["향 지속력"], warnings: ["합성향료 다량", "쿼터너리 암모늄", "환경 독성"], category: "household" },
    { barcode: "8801234560013", name: "순샘 주방세제 레몬 700mL", brand: "LG생활건강", score: 68, highlights: ["식물성 계면활성제 강화", "항균"], warnings: ["합성향료"], category: "household" },
    { barcode: "8801234560014", name: "깨끗한나라 한스킨 미용티슈 200매", brand: "깨끗한나라", score: 72, highlights: ["무형광", "저자극"], warnings: [], category: "household" },
    { barcode: "8801234560015", name: "자연퐁 주방세제 500mL", brand: "한국판다", score: 82, highlights: ["식물성 성분", "생분해", "EWG 그린"], warnings: [], category: "household" },
    { barcode: "8801234560016", name: "3M 핸디 청소포 40매", brand: "3M", score: 65, highlights: ["정전기 흡착", "간편"], warnings: ["일회용 화학 코팅"], category: "household" },
    { barcode: "8801234560017", name: "옥시 파워 주방세제 500mL", brand: "옥시레킷벤키저", score: 60, highlights: ["강력 세정"], warnings: ["합성 계면활성제", "합성향료"], category: "household" },
    { barcode: "8801234560018", name: "에코버 세탁 리퀴드 1.5L", brand: "Ecover", score: 88, highlights: ["식물성", "유럽 에코라벨", "생분해"], warnings: [], category: "household" },
    { barcode: "8801234560019", name: "탑 세탁세제 파워젤 3L", brand: "애경", score: 60, highlights: ["강력 세정 효소"], warnings: ["합성 계면활성제", "합성향료"], category: "household" },
    { barcode: "8801234560020", name: "위드맘 친환경 아기 세탁세제 1.5L", brand: "위드맘", score: 85, highlights: ["무형광", "무향료", "식물성"], warnings: [], category: "household" },
  ],

  clothing: [
    { barcode: "8900000000001", name: "유니클로 에어리즘 언더셔츠 (면100%)", brand: "유니클로", score: 78, highlights: ["면 혼방", "흡습속건"], warnings: ["기능성 코팅 성분 미공개"], category: "clothing" },
    { barcode: "8900000000002", name: "무인양품 유기농 면 티셔츠", brand: "MUJI", score: 88, highlights: ["유기농 면 100%", "GOTS 인증"], warnings: [], category: "clothing" },
    { barcode: "8900000000003", name: "나이키 드라이핏 러닝 티셔츠", brand: "Nike", score: 62, highlights: ["흡한속건"], warnings: ["폴리에스터 100%", "마이크로플라스틱 방출"], category: "clothing" },
    { barcode: "8900000000004", name: "파타고니아 캡린 쿨 티셔츠", brand: "Patagonia", score: 85, highlights: ["재활용 폴리에스터", "블루사인 인증", "페어트레이드"], warnings: ["합성섬유"], category: "clothing" },
    { barcode: "8900000000005", name: "아디다스 울트라부스트 러닝화", brand: "Adidas", score: 60, highlights: ["재활용 소재 일부 사용"], warnings: ["접착제 성분", "PFAS 방수코팅"], category: "clothing" },
    { barcode: "8900000000006", name: "자라 린넨 셔츠", brand: "Zara", score: 70, highlights: ["린넨 천연소재"], warnings: ["염색 성분 미공개", "생산 과정 투명성"], category: "clothing" },
    { barcode: "8900000000007", name: "H&M 컨셔스 유기농 면 반바지", brand: "H&M", score: 72, highlights: ["유기농 면"], warnings: ["그린워싱 논란", "전체 라인 아님"], category: "clothing" },
    { barcode: "8900000000008", name: "노스페이스 고어텍스 등산화", brand: "The North Face", score: 55, highlights: ["방수", "내구성"], warnings: ["PFAS 고어텍스 코팅", "영구화학물질"], category: "clothing" },
    { barcode: "8900000000009", name: "유니클로 히트텍 이너 (긴팔)", brand: "유니클로", score: 58, highlights: ["보온성"], warnings: ["레이온·폴리에스터 혼방", "화학 처리"], category: "clothing" },
    { barcode: "8900000000010", name: "피렐리 PIRELLI 울 100% 양말", brand: "Pirelli", score: 82, highlights: ["메리노 울", "항균", "자연소재"], warnings: [], category: "clothing" },
    { barcode: "8900000000011", name: "탑텐 에어쿨 반팔 티셔츠", brand: "탑텐", score: 72, highlights: ["쿨링 기능", "국내 브랜드"], warnings: ["폴리에스터 혼방", "코팅 미공개"], category: "clothing" },
    { barcode: "8900000000012", name: "스파오 에어로쿨 슬랙스", brand: "스파오", score: 68, highlights: ["흡습속건", "국내 브랜드"], warnings: ["합성섬유", "마이크로플라스틱"], category: "clothing" },
    { barcode: "8900000000013", name: "코오롱 안타레스 고어텍스 재킷", brand: "코오롱스포츠", score: 58, highlights: ["방수 방풍", "내구성"], warnings: ["PFAS 고어텍스 코팅", "영구화학물질"], category: "clothing" },
    { barcode: "8900000000014", name: "K2 기능성 등산바지 (스트레치)", brand: "K2", score: 65, highlights: ["4방향 스트레치", "경량"], warnings: ["폴리에스터 93%", "PFAS 코팅 가능성"], category: "clothing" },
    { barcode: "8900000000015", name: "아이더 쿨텍스 반팔 (100% 리사이클)", brand: "Eider", score: 75, highlights: ["재활용 폴리에스터", "UPF 50+"], warnings: ["마이크로플라스틱 방출"], category: "clothing" },
    { barcode: "8900000000016", name: "스텔라매카트니 x 아디다스 러닝화", brand: "Adidas x Stella", score: 78, highlights: ["지속가능 소재", "식물성 대안 가죽"], warnings: ["고가", "소재 혼합 처리"], category: "clothing" },
    { barcode: "8900000000017", name: "무인양품 리넨 루즈핏 팬츠", brand: "MUJI", score: 86, highlights: ["린넨 100%", "천연 소재", "무형광염색"], warnings: [], category: "clothing" },
    { barcode: "8900000000018", name: "유니클로 드라이EX 폴로셔츠", brand: "유니클로", score: 62, highlights: ["흡습속건"], warnings: ["폴리에스터 100%", "마이크로플라스틱"], category: "clothing" },
  ],

  pets: [
    { barcode: "9003579007730", name: "로얄캐닌 인도어 어덜트 (고양이) 2kg", brand: "Royal Canin", score: 80, highlights: ["수의사 처방 기반", "AAFCO 인증", "소화 최적화"], warnings: [], category: "pets", imageUrl: "https://images.openfoodfacts.org/images/products/900/357/900/7730/front.400.jpg" },
    { barcode: "0064992117123", name: "오리젠 오리지널 (개) 2kg", brand: "Orijen", score: 90, highlights: ["육류 85% 이상", "그레인 프리", "신선 냉장 원료"], warnings: ["신장 질환 시 고단백 주의"], category: "pets", imageUrl: "https://images.openfoodfacts.org/images/products/006/499/211/7123/front.400.jpg" },
    { barcode: "8801234580001", name: "하림 더리얼 닭고기 (개) 1.2kg", brand: "하림펫푸드", score: 82, highlights: ["국내산 닭고기", "무방부제", "Non-GMO"], warnings: [], category: "pets" },
    { barcode: "8801234580002", name: "사이언스다이어트 어덜트 (개) 1.8kg", brand: "Hill's", score: 75, highlights: ["영양 균형", "오메가3"], warnings: ["옥수수 부산물", "인공향료"], category: "pets" },
    { barcode: "0064992117124", name: "아카나 프리-런 포울트리 (고양이) 1.8kg", brand: "Acana", score: 88, highlights: ["고단백", "그레인 프리", "지역 원료"], warnings: ["신장 기능 약한 고양이 주의"], category: "pets" },
    { barcode: "8801234580003", name: "동원 뉴트리플랜 참치캔 (고양이) 160g", brand: "동원", score: 65, highlights: ["참치 원료"], warnings: ["나트륨 높음", "인 함량 높음", "신장 주의"], category: "pets" },
    { barcode: "8801234580004", name: "그린핏 유기농 강아지 사료 2kg", brand: "그린핏", score: 78, highlights: ["유기농 채소", "무방부제"], warnings: [], category: "pets" },
    { barcode: "8801234580005", name: "유한양행 해피홈 강아지 패드 (200매)", brand: "유한양행", score: 70, highlights: ["고흡수", "항균 처리"], warnings: ["화학 흡수제 SAP"], category: "pets" },
    { barcode: "8801234580006", name: "넥가드 벼룩·진드기 예방 (중형견)", brand: "Boehringer", score: 68, highlights: ["1개월 예방 효과"], warnings: ["아플로쿠알로너 성분", "수의사 처방 권장"], category: "pets" },
    { barcode: "8801234580007", name: "잇츠독 그레인프리 닭고기 트릿 60g", brand: "잇츠독", score: 80, highlights: ["단일 단백질", "그레인 프리"], warnings: [], category: "pets" },
    { barcode: "8801234580008", name: "뉴트리나 어덜트 (개) 15kg", brand: "Purina Nurturina", score: 68, highlights: ["단백질 균형", "비타민 강화"], warnings: ["옥수수 주원료", "인공향료"], category: "pets" },
    { barcode: "8801234580009", name: "내추럴코어 에코 유기농 오리 (개) 1.2kg", brand: "내추럴코어", score: 88, highlights: ["유기농 인증", "단일 단백질", "무방부제"], warnings: [], category: "pets" },
    { barcode: "8801234580010", name: "힐스사이언스 다이어트 어덜트 라이트 (개) 7kg", brand: "Hill's Science Diet", score: 72, highlights: ["저칼로리 설계", "수의사 권장"], warnings: ["옥수수 글루텐", "인공향료"], category: "pets" },
    { barcode: "0064992117125", name: "아카나 와일드코스트 (고양이) 1.8kg", brand: "Acana", score: 91, highlights: ["생선 70% 이상", "그레인 프리", "신선 원료"], warnings: ["고단백 신장 주의"], category: "pets" },
    { barcode: "8801234580011", name: "ANF 유기농 치킨 (개) 3kg", brand: "ANF", score: 82, highlights: ["유기농 인증 (USDA)", "항생제 무사용 닭고기"], warnings: [], category: "pets" },
    { barcode: "8801234580012", name: "지위픽 로컬 레전드 레드 미트 (개) 2kg", brand: "Ziwi Peak", score: 90, highlights: ["뉴질랜드 방목 원료", "95% 육류·내장·뼈"], warnings: ["고단백 신장 주의", "고가"], category: "pets" },
    { barcode: "8801234580013", name: "내추럴배리어티 인스팅크트 오리지널 (고양이) 2kg", brand: "Natural Balance", score: 80, highlights: ["단일 단백질 옵션", "그레인 프리"], warnings: [], category: "pets" },
    { barcode: "8801234580014", name: "먼치킨 클로즈업 치아케어 간식 (고양이) 30g", brand: "먼치킨", score: 65, highlights: ["치아 관리 성분"], warnings: ["인공향료", "당류 주의"], category: "pets" },
    { barcode: "8801234580015", name: "퍼스트초이스 리치 인 치킨 (고양이 성묘) 2kg", brand: "First Choice", score: 74, highlights: ["고단백", "타우린 강화"], warnings: ["옥수수 부산물"], category: "pets" },
    { barcode: "8801234580016", name: "로얄캐닌 스태릴라이즈드 어덜트 (고양이 중성화) 2kg", brand: "Royal Canin", score: 78, highlights: ["중성화 고양이 전용", "체중 관리"], warnings: ["옥수수 함유", "향료"], category: "pets" },
  ],

  supplements: [
    { barcode: "8801234570001", name: "솔가 비타민D3 2000IU (100캡슐)", brand: "Solgar", score: 88, highlights: ["USP 인증", "글루텐 프리", "비건"], warnings: [], category: "supplements" },
    { barcode: "8801234570002", name: "종근당 오메가3 1000mg (30캡슐)", brand: "종근당건강", score: 75, highlights: ["EPA+DHA 균형"], warnings: ["항응고제 복용 시 주의"], category: "supplements" },
    { barcode: "8801234570003", name: "Thorne 마그네슘 비스글리시네이트 (60캡슐)", brand: "Thorne", score: 92, highlights: ["고흡수 킬레이트 형태", "NSF 인증", "무첨가"], warnings: [], category: "supplements" },
    { barcode: "8801234570004", name: "뉴트리원 루테인 & 제아잔틴 (60정)", brand: "뉴트리원", score: 72, highlights: ["눈 건강", "마리골드 추출"], warnings: ["식물성 색소 첨가"], category: "supplements" },
    { barcode: "8801234570005", name: "GNC 멀티비타민 포 멘 (90정)", brand: "GNC", score: 65, highlights: ["종합 영양소"], warnings: ["합성 비타민 다수", "비타민A 과다 위험", "합성 색소"], category: "supplements" },
    { barcode: "8801234570006", name: "닥터베스트 비타민C 1000mg (240정)", brand: "Doctor's Best", score: 85, highlights: ["버퍼드 비타민C", "Quali-C 인증"], warnings: [], category: "supplements" },
    { barcode: "8801234570007", name: "한미약품 트리플러스 우먼 (60정)", brand: "한미약품", score: 68, highlights: ["여성 전용 설계"], warnings: ["합성 철분", "인공색소"], category: "supplements" },
    { barcode: "8801234570008", name: "솔가 아연 킬레이트 22mg (250정)", brand: "Solgar", score: 87, highlights: ["킬레이트 고흡수", "글루텐 프리"], warnings: [], category: "supplements" },
    { barcode: "8801234570009", name: "뉴트리원 프리미엄 프로바이오틱스 50억 (60캡슐)", brand: "뉴트리원", score: 70, highlights: ["다균주", "냉장 보관"], warnings: ["냉장 유통 체인 의존"], category: "supplements" },
    { barcode: "8801234570010", name: "Optimum Nutrition 골드스탠다드 웨이 프로틴 (초코) 907g", brand: "ON", score: 74, highlights: ["유청단백질", "BCAA 풍부"], warnings: ["인공감미료 (수크랄로스)", "유당 민감성"], category: "supplements" },
    { barcode: "8801234570011", name: "종근당 비타민B 콤플렉스 (90정)", brand: "종근당건강", score: 78, highlights: ["B군 전체", "에너지 대사"], warnings: [], category: "supplements" },
    { barcode: "8801234570012", name: "얼라이브 원스데일리 맥스 포텐시 (60정)", brand: "Nature's Way", score: 70, highlights: ["고함량 비타민B", "종합 영양소"], warnings: ["합성 비타민 다수", "고용량 주의"], category: "supplements" },
    { barcode: "8801234570013", name: "센트룸 어드밴스 포 맨 (30정)", brand: "센트룸", score: 62, highlights: ["종합 비타민미네랄"], warnings: ["합성 비타민", "인공색소", "합성 부형제"], category: "supplements" },
    { barcode: "8801234570014", name: "고려은단 비타민C 1000 (60정)", brand: "고려은단", score: 72, highlights: ["고용량 비타민C", "국내 제조"], warnings: ["합성 비타민C", "부형제 함유"], category: "supplements" },
    { barcode: "8801234570015", name: "대웅제약 임팩타민 파워 (60정)", brand: "대웅제약", score: 65, highlights: ["비타민B 고함량", "에너지 지원"], warnings: ["합성 비타민", "인공색소"], category: "supplements" },
    { barcode: "8801234570016", name: "일동제약 비타톤 멀티비타민 (30정)", brand: "일동제약", score: 63, highlights: ["국내 제조 GMP"], warnings: ["합성 비타민", "합성 색소"], category: "supplements" },
    { barcode: "8801234570017", name: "닥터린 장용성 오메가3 1000mg (60캡슐)", brand: "닥터린", score: 80, highlights: ["장용성 캡슐 (위산 보호)", "EPA+DHA 균형"], warnings: ["항응고제 주의"], category: "supplements" },
    { barcode: "8801234570018", name: "뉴트리원 더블엑스 멀티비타민 (62정)", brand: "뉴트리원", score: 68, highlights: ["식물성 원료 기반", "12가지 비타민"], warnings: ["합성 비타민 혼합", "향료"], category: "supplements" },
    { barcode: "8801234570019", name: "솔가 폴릭산 800mcg (250정)", brand: "Solgar", score: 90, highlights: ["USP 인증", "글루텐·유제품 프리", "비건"], warnings: [], category: "supplements" },
    { barcode: "8801234570020", name: "Thorne 비타민D3/K2 (60캡슐)", brand: "Thorne", score: 94, highlights: ["D3+K2 시너지", "NSF 인증", "무첨가"], warnings: [], category: "supplements" },
    { barcode: "8801234570021", name: "종근당건강 아이클리어 루테인 (60캡슐)", brand: "종근당건강", score: 73, highlights: ["마리골드 루테인", "눈 피로 완화"], warnings: ["식물성 색소 첨가"], category: "supplements" },
  ],

  baby: [
    { barcode: "8801234590001", name: "하기스 네이처메이드 기저귀 (뉴본 40매)", brand: "유한킴벌리", score: 78, highlights: ["무형광", "무염소 표백", "순면 커버"], warnings: ["화학 흡수제 SAP"], category: "baby" },
    { barcode: "8801234590002", name: "보솜이 하이드로 순면 기저귀 (스몰 48매)", brand: "LG생활건강", score: 75, highlights: ["순면 최상층", "무형광"], warnings: ["향료 미함유 여부 확인"], category: "baby" },
    { barcode: "8801234590003", name: "마미포코 에어드라이 (미디엄 48매)", brand: "Mamypoko", score: 70, highlights: ["흡수 빠름"], warnings: ["형광증백제 성분 확인 필요", "향료"], category: "baby" },
    { barcode: "8801234590004", name: "남양 아이엠마더 분유 1단계 800g", brand: "남양유업", score: 80, highlights: ["국내 제조", "DHA 함유", "프로바이오틱스"], warnings: [], category: "baby" },
    { barcode: "8801234590005", name: "매일 앱솔루트 명작 분유 1단계 800g", brand: "매일유업", score: 82, highlights: ["모유 단백질 구조", "아라키돈산·DHA"], warnings: [], category: "baby" },
    { barcode: "8801234590006", name: "피죤 아기 섬유유연제 1L", brand: "피죤", score: 65, highlights: ["저자극"], warnings: ["합성향료 함유", "쿼터너리 암모늄"], category: "baby" },
    { barcode: "8801234590007", name: "존슨즈베이비 로션 200mL", brand: "Johnson's", score: 60, highlights: ["순한 보습"], warnings: ["합성향료", "파라벤 프리 여부 확인", "미네랄오일"], category: "baby" },
    { barcode: "8801234590008", name: "닥터노아 아기 샴푸 250mL", brand: "닥터노아", score: 85, highlights: ["EWG 그린 등급", "무향", "파라벤 프리"], warnings: [], category: "baby" },
    { barcode: "8801234590009", name: "프리미아 유기농 이유식 쌀죽 (4개월~) 100g", brand: "프리미아", score: 80, highlights: ["유기농 인증", "무방부제", "Non-GMO"], warnings: ["쌀 기반 비소 주의"], category: "baby" },
    { barcode: "8801234590010", name: "레고 듀플로 클래식 블록 (10개입)", brand: "LEGO", score: 88, highlights: ["EN71 안전 인증", "BPA 프리", "ABS 플라스틱"], warnings: [], category: "baby" },
    { barcode: "8801234590011", name: "피셔프라이스 신생아 딸랑이 세트", brand: "Fisher-Price", score: 82, highlights: ["ASTM F963 인증", "프탈레이트 프리"], warnings: [], category: "baby" },
    { barcode: "8801234590012", name: "베베숲 물티슈 (캡형) 70매", brand: "베베숲", score: 82, highlights: ["99.9% 정제수", "무향", "EWG 그린"], warnings: [], category: "baby" },
    { barcode: "8801234590013", name: "아토팜 리얼베리어 크림 50mL", brand: "아토팜", score: 85, highlights: ["MLE 성분 (모유 지질 모방)", "아토피 피부 적합"], warnings: [], category: "baby" },
    { barcode: "8801234590014", name: "피죤 아기 젖병 세정제 500mL", brand: "피죤", score: 70, highlights: ["젖산 성분 세정", "잔류 없이 헹굼"], warnings: ["합성향료 일부"], category: "baby" },
    { barcode: "8801234590015", name: "그린핑거 아기 보습 로션 200mL", brand: "그린핑거", score: 78, highlights: ["알로에 성분", "약산성", "저자극"], warnings: ["향료 미량"], category: "baby" },
    { barcode: "8801234590016", name: "궁중비책 궁중 한방 아기 로션 200mL", brand: "궁중비책", score: 74, highlights: ["한방 성분", "EWG 그린"], warnings: ["향료 일부"], category: "baby" },
    { barcode: "8801234590017", name: "닥터아토 트리플러스 워터 로션 300mL", brand: "닥터아토", score: 80, highlights: ["아토피 연구 기반", "무향", "파라벤 프리"], warnings: [], category: "baby" },
    { barcode: "8801234590018", name: "마더케이 태열 진정 젤크림 50g", brand: "마더케이", score: 76, highlights: ["태열 진정", "천연 성분"], warnings: ["향료 소량"], category: "baby" },
    { barcode: "8801234590019", name: "보솜이 리얼코튼 기저귀 (미디엄 48매)", brand: "LG생활건강", score: 80, highlights: ["리얼코튼 최상층", "무형광", "피부과 테스트"], warnings: [], category: "baby" },
    { barcode: "8801234590020", name: "남양 드림이 분유 2단계 800g", brand: "남양유업", score: 78, highlights: ["단백질 최적화 설계", "프로바이오틱스"], warnings: [], category: "baby" },
    { barcode: "8801234590021", name: "일동후디스 하이키 산양분유 1단계 800g", brand: "일동후디스", score: 82, highlights: ["산양단백질 기반", "소화 우수", "DHA 함유"], warnings: ["고가"], category: "baby" },
  ],
};

export function getProductsByCategory(slug: string): RankedProduct[] {
  return PRODUCTS[slug] ?? [];
}

// Flat lookup across all categories — used by the product detail page
export function getProductByBarcode(barcode: string): RankedProduct | null {
  for (const products of Object.values(PRODUCTS)) {
    const found = products.find((p) => p.barcode === barcode);
    if (found) return found;
  }
  return null;
}

export type SortOrder = "score-desc" | "score-asc" | "name-asc";

export function sortProducts(products: RankedProduct[], order: SortOrder): RankedProduct[] {
  const copy = [...products];
  if (order === "score-desc") return copy.sort((a, b) => b.score - a.score);
  if (order === "score-asc") return copy.sort((a, b) => a.score - b.score);
  return copy.sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

// Star rating display: maps score (0–100) → 1.0–5.0 stars, rounded to nearest 0.5
export function getDisplayRating(score: number): number {
  const raw = 1.5 + (score / 100) * 3.5;
  return Math.round(raw * 2) / 2;
}

// Deterministic pseudo-random review count seeded from barcode chars
export function getDisplayReviewCount(barcode: string): number {
  const hash = barcode.split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffff, 0);
  return 8 + (hash % 287);
}

export interface DummyReview {
  id: string;
  user_name: string;
  rating: number;
  title: string;
  content: string;
  created_at: string;
  helpful_count: number;
}

export const DUMMY_REVIEWS: Record<string, DummyReview[]> = {
  "8801043012345": [
    { id: "dr1", user_name: "건강러버", rating: 5, title: "매일 마시는 물", content: "제주 삼다수는 역시 믿을 수 있는 물이에요. 미네랄 함량도 적당하고 맛도 깔끔합니다.", created_at: "2026-03-15", helpful_count: 24 },
    { id: "dr2", user_name: "워터소믈리에", rating: 4, title: "맛은 좋은데 가격이...", content: "물맛 자체는 정말 좋습니다. 다만 배달비 포함하면 가격이 좀 올라가는 게 아쉬워요.", created_at: "2026-02-28", helpful_count: 12 },
    { id: "dr3", user_name: "꼼꼼한소비자", rating: 5, title: "성분 분석 결과 신뢰", content: "HINDSIGHT+ 점수 92점인 이유가 있네요. 실제로 마셔보니 다른 생수와 확실히 달라요.", created_at: "2026-01-20", helpful_count: 8 },
  ],
  "8806091234502": [
    { id: "dr4", user_name: "정수기마니아", rating: 5, title: "나노 필터 진짜 효과있어요", content: "미세플라스틱 제거 성능이 탁월합니다. 설치도 간편하고 AS도 빠르게 왔어요.", created_at: "2026-03-20", helpful_count: 31 },
    { id: "dr5", user_name: "주부아이사랑", rating: 4, title: "아이 있는 집에 강추", content: "미세플라스틱 걱정이 많았는데 이 정수기 설치 후 안심이 돼요.", created_at: "2026-02-14", helpful_count: 18 },
  ],
  "5025155050859": [
    { id: "dr6", user_name: "다이슨팬", rating: 5, title: "공기청정기 끝판왕", content: "HEPA H13에 VOC까지 감지해요. 오존도 발생 안 하고요. 비싸지만 확실히 다릅니다.", created_at: "2026-03-10", helpful_count: 45 },
    { id: "dr7", user_name: "알레르기환자", rating: 4, title: "알레르기 있는 분께 추천", content: "먼지 알레르기가 심한데 이거 쓰고 나서 많이 나아졌어요. 소음도 생각보다 적습니다.", created_at: "2026-01-05", helpful_count: 22 },
  ],
  "8801073151154": [
    { id: "dr8", user_name: "라면러버", rating: 3, title: "맛있지만 나트륨은 주의", content: "HINDSIGHT+ 점수 42점인 게 이해됩니다. 맛은 최고지만 나트륨이 1790mg이라 일주일에 한두 번만 먹으려고 해요.", created_at: "2026-03-18", helpful_count: 38 },
    { id: "dr9", user_name: "건강챙기는미식가", rating: 2, title: "성분 알고 나서 좀 줄였어요", content: "팜유에 MSG까지... 가끔 먹는 건 괜찮지만 자주 먹기엔 부담스럽네요.", created_at: "2026-02-22", helpful_count: 15 },
  ],
  "8809049750965": [
    { id: "dr10", user_name: "Non-GMO추구자", rating: 5, title: "믿을 수 있는 두부", content: "Non-GMO 인증에 무방부제, 성분 분석 점수도 78점이네요. 건두부나 연두부도 다 이걸로 삽니다.", created_at: "2026-03-25", helpful_count: 27 },
  ],
  "8806091234601": [
    { id: "dr11", user_name: "공기덕후", rating: 5, title: "LG 국내 최고의 선택", content: "360도 흡입에 초미세먼지 센서까지. 가격 대비 성능이 정말 뛰어납니다.", created_at: "2026-03-12", helpful_count: 33 },
    { id: "dr12", user_name: "미세먼지걱정맘", rating: 4, title: "아이 방에 설치", content: "어린이 방에 설치했는데 공기 질이 눈에 띄게 좋아졌어요. 다만 필터 가격이 좀 세네요.", created_at: "2026-02-08", helpful_count: 19 },
  ],
  "0064992117123": [
    { id: "dr13", user_name: "반려견전문가", rating: 5, title: "강아지 건강이 달라졌어요", content: "육류 85% 이상의 고단백 사료로 바꾸고 나서 털 상태와 활동성이 확 좋아졌습니다.", created_at: "2026-03-08", helpful_count: 42 },
    { id: "dr14", user_name: "포메키우는집", rating: 4, title: "비싸지만 가치있어요", content: "그레인프리 고단백 사료가 이렇게 비싼지 몰랐는데, 강아지 건강 생각하면 아깝지 않아요.", created_at: "2026-01-30", helpful_count: 28 },
  ],
  "8801234570003": [
    { id: "dr15", user_name: "Thorne신봉자", rating: 5, title: "마그네슘 보충제 최고", content: "비스글리시네이트 형태라 흡수율이 다르네요. NSF 인증도 있고 성분 깔끔합니다. 수면 질이 확실히 개선됐어요.", created_at: "2026-03-22", helpful_count: 35 },
    { id: "dr16", user_name: "영양제공부중", rating: 5, title: "HINDSIGHT 92점 납득", content: "무첨가에 고흡수형. 가격 좀 비싸도 이게 맞는 선택이라는 게 성분 보면 알아요.", created_at: "2026-02-16", helpful_count: 17 },
  ],
};

// Returns the highest-scoring product for each category (for home ranking section)
export function getCategoryTop1s(): Array<{ category: string; product: RankedProduct }> {
  return Object.entries(PRODUCTS).map(([cat, products]) => ({
    category: cat,
    product: [...products].sort((a, b) => b.score - a.score)[0],
  }));
}
