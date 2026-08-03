/**
 * 커뮤니티 목 데이터.
 *
 * Supabase 가 없을 때 커뮤니티 탭이 텅 비지 않도록 채운다.
 * 발표에서 ⑤ "사용자 후기 + 신뢰 뱃지"와 해자(커뮤니티 평판 축적)를 보여주려면
 * 글이 실제로 쌓여 있어 보여야 한다.
 *
 * 글감은 앱의 성격에 맞췄다 — 성분 질문, 미등록 제품 제보, 오해 바로잡기,
 * 알레르기 경험, 비교 후기. 팩트체크 판정이 붙은 글이 섞여 있어야
 * "광고가 아니라 근거로" 축이 커뮤니티에서도 이어진다.
 *
 * 날짜는 고정 문자열이다. Date.now() 로 만들면 스크린샷마다 값이 달라져
 * 발표 자료가 어긋난다.
 */

export interface MockAuthor {
  name: string;
  sensitivity_type: string | null;
}

export interface MockComment {
  id: string;
  author: MockAuthor;
  body: string;
  createdAt: string;
  likes: number;
}

export interface MockPost {
  id: string;
  title: string;
  content: string;
  category: string | null;
  likes_count: number;
  comments_count: number;
  /** 팩트체크가 붙은 글만 값이 있다 */
  fact_check_verdict: string | null;
  fact_check_color: string | null;
  created_at: string;
  profiles: MockAuthor;
  comments: MockComment[];
}

const VERDICT = {
  true: { label: "사실", color: "#2A8A5C" },
  partial: { label: "부분사실", color: "#6B52D4" },
  exaggerated: { label: "과장됨", color: "#C05000" },
  false: { label: "거짓", color: "#E23434" },
} as const;

export const MOCK_POSTS: MockPost[] = [
  {
    id: "c1",
    title: "무설탕이라고 적힌 제품, 정말 당이 없나요?",
    content:
      "다이어트 중이라 '무설탕' 표시만 보고 골랐는데, 성분표를 보니 말티톨이랑 에리스리톨이 들어있더라고요.\n\n스캔해보니 당류 0g 은 맞는데 당알코올이 따로 있었어요. 이거 혈당에는 영향이 없는 건가요? 표시 기준이 어떻게 되는지 궁금합니다.",
    category: "food",
    likes_count: 184,
    comments_count: 3,
    fact_check_verdict: VERDICT.partial.label,
    fact_check_color: VERDICT.partial.color,
    created_at: "2026-07-29T10:20:00+09:00",
    profiles: { name: "성분꼼꼼", sensitivity_type: "comprehensive" },
    comments: [
      {
        id: "c1-1",
        author: { name: "영양사입니다", sensitivity_type: "expert" },
        body: "'무설탕(무당류)' 은 식약처 기준으로 100g당 당류 0.5g 미만이면 표시 가능합니다. 당알코올은 당류에 포함되지 않아요. 말티톨은 혈당지수가 35 정도로 설탕보단 낮지만 0은 아닙니다.",
        createdAt: "2026-07-29T11:05:00+09:00",
        likes: 96,
      },
      {
        id: "c1-2",
        author: { name: "당뇨관리중", sensitivity_type: "expert" },
        body: "말티톨은 사람마다 혈당 반응이 꽤 달라요. 저는 식후 혈당 30 정도 올라갑니다. 에리스리톨은 거의 영향 없었고요.",
        createdAt: "2026-07-29T13:41:00+09:00",
        likes: 54,
      },
      {
        id: "c1-3",
        author: { name: "글쓴이", sensitivity_type: "comprehensive" },
        body: "두 분 답변 덕에 정리됐습니다. 프로필에 당뇨 등록해두니 같은 제품이 '주의' 로 바뀌네요.",
        createdAt: "2026-07-29T18:02:00+09:00",
        likes: 22,
      },
    ],
  },
  {
    id: "c2",
    title: "[미등록 제보] 로컬 베이커리 그래놀라 3종 분석 결과 공유",
    content:
      "동네 베이커리에서 파는 소분 그래놀라라 바코드가 아예 없습니다. 다른 앱에선 전부 '제품 없음' 이 떠서 사진으로 올려봤어요.\n\n세 개 중 두 개에 카라멜색소가 있었고, 하나는 첨가당이 두 번째 순서였습니다. 미등록 제품도 잡히니까 로컬 브랜드 사는 사람한테는 이게 제일 큽니다.",
    category: "food",
    likes_count: 231,
    comments_count: 2,
    fact_check_verdict: null,
    fact_check_color: null,
    created_at: "2026-07-28T09:14:00+09:00",
    profiles: { name: "동네빵집탐험", sensitivity_type: "selective" },
    comments: [
      {
        id: "c2-1",
        author: { name: "그래놀라덕후", sensitivity_type: "selective" },
        body: "저도 이 브랜드 먹는데 첨가당 순서까지는 몰랐네요. 감사합니다.",
        createdAt: "2026-07-28T10:30:00+09:00",
        likes: 41,
      },
      {
        id: "c2-2",
        author: { name: "운영팀", sensitivity_type: null },
        body: "제보 감사합니다. 세 제품 모두 미등록 DB 에 등록했습니다. 이제 다른 분들도 바로 조회됩니다.",
        createdAt: "2026-07-28T15:00:00+09:00",
        likes: 88,
      },
    ],
  },
  {
    id: "c3",
    title: "MSG 가 몸에 해롭다는 말, 아직도 맞나요?",
    content:
      "부모님이 MSG 들어간 건 절대 안 사십니다. 근데 최근에 안전하다는 얘기도 많이 보여서 헷갈려요. 정리된 근거가 있을까요?",
    category: "food",
    likes_count: 312,
    comments_count: 2,
    fact_check_verdict: VERDICT.false.label,
    fact_check_color: VERDICT.false.color,
    created_at: "2026-07-27T20:11:00+09:00",
    profiles: { name: "요리초보", sensitivity_type: "beginner" },
    comments: [
      {
        id: "c3-1",
        author: { name: "식품공학전공", sensitivity_type: "expert" },
        body: "FDA·WHO·식약처 모두 통상 섭취량에서 안전하다고 봅니다. 1968년 '중국음식점 증후군' 보고가 출발점인데, 이후 이중맹검 연구에서 재현되지 않았어요.",
        createdAt: "2026-07-27T21:02:00+09:00",
        likes: 176,
      },
      {
        id: "c3-2",
        author: { name: "민감체질", sensitivity_type: "comprehensive" },
        body: "일반적으로 안전한 건 맞는데, 소수는 두통을 호소하기도 합니다. 저는 프로필 기피 성분에 넣어두고 씁니다.",
        createdAt: "2026-07-28T08:20:00+09:00",
        likes: 63,
      },
    ],
  },
  {
    id: "c4",
    title: "견과류 알레르기인데 앞면 표기만 믿었다가 응급실 갔습니다",
    content:
      "'아몬드 함유' 같은 문구가 뒷면에만 작게 있는 제품이 생각보다 많아요.\n\n프로필에 견과류 등록해두니 스캔할 때 바로 빨간색으로 뜹니다. 같은 제품인데 남들한테는 '양호' 로 나오는 게 저한텐 '위험' 으로 나와요. 알레르기 있는 분들 꼭 등록해두세요.",
    category: "food",
    likes_count: 428,
    comments_count: 3,
    fact_check_verdict: null,
    fact_check_color: null,
    created_at: "2026-07-26T14:35:00+09:00",
    profiles: { name: "견과류알러지", sensitivity_type: "expert" },
    comments: [
      {
        id: "c4-1",
        author: { name: "두아이엄마", sensitivity_type: "comprehensive" },
        body: "아이가 땅콩 알레르기라 항상 뒷면 확인하는데도 놓칠 때가 있어요. 이 기능 진짜 필요했습니다.",
        createdAt: "2026-07-26T16:12:00+09:00",
        likes: 132,
      },
      {
        id: "c4-2",
        author: { name: "약사입니다", sensitivity_type: "expert" },
        body: "표시 대상 알레르기 유발물질은 22종이지만 '같은 시설에서 제조' 문구는 의무가 아닙니다. 교차오염 우려가 있으면 제조사 문의가 가장 확실해요.",
        createdAt: "2026-07-26T18:44:00+09:00",
        likes: 98,
      },
      {
        id: "c4-3",
        author: { name: "글쓴이", sensitivity_type: "expert" },
        body: "맞습니다. 그래서 저는 교차오염 문구 있는 건 아예 거릅니다.",
        createdAt: "2026-07-26T19:50:00+09:00",
        likes: 37,
      },
    ],
  },
  {
    id: "c5",
    title: "생수 3종 비교해봤습니다 (미네랄 함량 기준)",
    content:
      "비교 기능으로 세 개 올려봤는데 경도 차이가 꽤 큽니다.\n\n신장 결석 이력이 있어서 칼슘·마그네슘 낮은 걸 찾고 있었는데, 프로필에 신장질환 넣으니까 추천이 바뀌더라고요. 점수만 보고 골랐으면 다른 걸 샀을 겁니다.",
    category: "water",
    likes_count: 156,
    comments_count: 1,
    fact_check_verdict: null,
    fact_check_color: null,
    created_at: "2026-07-25T11:20:00+09:00",
    profiles: { name: "워터소믈리에", sensitivity_type: "comprehensive" },
    comments: [
      {
        id: "c5-1",
        author: { name: "신장내과환자", sensitivity_type: "expert" },
        body: "저도 같은 이유로 경도 낮은 물 찾습니다. 비교 결과 캡처해서 저장해뒀어요.",
        createdAt: "2026-07-25T13:08:00+09:00",
        likes: 44,
      },
    ],
  },
  {
    id: "c6",
    title: "'천연 유래 성분 100%' 라는 화장품, 무슨 뜻인가요?",
    content:
      "샴푸 광고에 크게 적혀 있던데 성분표에는 낯선 이름이 잔뜩입니다. 천연 유래면 다 안전한 건가요?",
    category: "personal-care",
    likes_count: 203,
    comments_count: 2,
    fact_check_verdict: VERDICT.exaggerated.label,
    fact_check_color: VERDICT.exaggerated.color,
    created_at: "2026-07-24T16:48:00+09:00",
    profiles: { name: "두피고민", sensitivity_type: "beginner" },
    comments: [
      {
        id: "c6-1",
        author: { name: "화장품연구원", sensitivity_type: "expert" },
        body: "'천연 유래' 는 천연물에서 출발했다는 뜻이지 가공을 안 했다는 뜻이 아닙니다. 법적 정의도 표시 기준마다 달라요. 천연이라고 다 순한 것도 아니고요.",
        createdAt: "2026-07-24T18:30:00+09:00",
        likes: 141,
      },
      {
        id: "c6-2",
        author: { name: "민감성피부", sensitivity_type: "comprehensive" },
        body: "저는 에센셜 오일 때문에 더 트러블 났던 적 있어요. 천연 = 순함은 아닙니다.",
        createdAt: "2026-07-25T09:12:00+09:00",
        likes: 67,
      },
    ],
  },
  {
    id: "c7",
    title: "영양제 과다 복용 주의 — 지용성 비타민은 쌓입니다",
    content:
      "종합비타민에 개별 영양제까지 같이 먹다가 비타민A 권장량을 훌쩍 넘겼던 적이 있습니다.\n\n스캔할 때 복용 중인 약 등록해두면 중복되는 성분을 잡아주더라고요. 영양제 여러 개 드시는 분들 한 번씩 확인해보세요.",
    category: "supplements",
    likes_count: 267,
    comments_count: 2,
    fact_check_verdict: VERDICT.true.label,
    fact_check_color: VERDICT.true.color,
    created_at: "2026-07-23T08:55:00+09:00",
    profiles: { name: "영양제정리중", sensitivity_type: "comprehensive" },
    comments: [
      {
        id: "c7-1",
        author: { name: "약사입니다", sensitivity_type: "expert" },
        body: "A·D·E·K 는 지용성이라 배출이 잘 안 됩니다. 특히 비타민A 는 임신부에게 위험할 수 있어요.",
        createdAt: "2026-07-23T10:02:00+09:00",
        likes: 158,
      },
      {
        id: "c7-2",
        author: { name: "헬스하는사람", sensitivity_type: "selective" },
        body: "저도 이거 모르고 3개월 겹쳐 먹었네요. 정리 감사합니다.",
        createdAt: "2026-07-23T12:30:00+09:00",
        likes: 39,
      },
    ],
  },
  {
    id: "c8",
    title: "유통기한이랑 소비기한, 뭐가 다른가요?",
    content: "작년부터 소비기한으로 바뀌었다는데 실제로 언제까지 먹어도 되는 건지 헷갈립니다.",
    category: "food",
    likes_count: 178,
    comments_count: 1,
    fact_check_verdict: VERDICT.true.label,
    fact_check_color: VERDICT.true.color,
    created_at: "2026-07-22T19:10:00+09:00",
    profiles: { name: "냉장고정리", sensitivity_type: "beginner" },
    comments: [
      {
        id: "c8-1",
        author: { name: "식품공학전공", sensitivity_type: "expert" },
        body: "유통기한은 '판매 가능 기한', 소비기한은 '먹어도 안전한 기한' 입니다. 소비기한이 더 길어요. 다만 보관 조건을 지켰을 때 기준입니다.",
        createdAt: "2026-07-22T20:25:00+09:00",
        likes: 122,
      },
    ],
  },
  {
    id: "c9",
    title: "아기 물티슈 성분, 어디까지 봐야 할까요?",
    content:
      "성분표에 20개 넘게 적혀 있는데 뭘 봐야 하는지 모르겠습니다. 보존료만 없으면 되는 건가요?",
    category: "baby",
    likes_count: 194,
    comments_count: 2,
    fact_check_verdict: null,
    fact_check_color: null,
    created_at: "2026-07-21T13:22:00+09:00",
    profiles: { name: "초보아빠", sensitivity_type: "beginner" },
    comments: [
      {
        id: "c9-1",
        author: { name: "두아이엄마", sensitivity_type: "comprehensive" },
        body: "보존료가 아예 없으면 오히려 세균 문제가 생깁니다. 어떤 보존료를 쓰는지가 중요해요.",
        createdAt: "2026-07-21T14:40:00+09:00",
        likes: 108,
      },
      {
        id: "c9-2",
        author: { name: "피부과전공의", sensitivity_type: "expert" },
        body: "향료·에탄올 유무를 먼저 보시고, 그 다음 보존료 종류를 보세요. 아이 피부 반응이 가장 확실한 지표입니다.",
        createdAt: "2026-07-21T17:15:00+09:00",
        likes: 143,
      },
    ],
  },
  {
    id: "c10",
    title: "해외 직구 프로틴, 국내 표기랑 성분이 다릅니다",
    content:
      "같은 브랜드인데 국내판이랑 직구판 성분이 달라요. 직구판은 바코드 조회도 안 되고요.\n\n사진으로 분석하니까 감미료 종류가 다른 게 잡혔습니다. 직구 많이 하시는 분들 참고하세요.",
    category: "supplements",
    likes_count: 145,
    comments_count: 1,
    fact_check_verdict: null,
    fact_check_color: null,
    created_at: "2026-07-20T10:05:00+09:00",
    profiles: { name: "직구러", sensitivity_type: "selective" },
    comments: [
      {
        id: "c10-1",
        author: { name: "헬스하는사람", sensitivity_type: "selective" },
        body: "국가별 규제가 달라서 그렇습니다. 수크랄로스 허용량도 나라마다 달라요.",
        createdAt: "2026-07-20T11:33:00+09:00",
        likes: 52,
      },
    ],
  },
  {
    id: "c11",
    title: "제로 음료 매일 마시면 안 좋을까요?",
    content: "하루에 2~3캔 마시는데 괜찮은지 궁금합니다. 아스파탐 발암물질 얘기도 봤어요.",
    category: "food",
    likes_count: 356,
    comments_count: 2,
    fact_check_verdict: VERDICT.partial.label,
    fact_check_color: VERDICT.partial.color,
    created_at: "2026-07-19T21:40:00+09:00",
    profiles: { name: "제로러버", sensitivity_type: "beginner" },
    comments: [
      {
        id: "c11-1",
        author: { name: "영양사입니다", sensitivity_type: "expert" },
        body: "WHO 산하 IARC 가 2023년 아스파탐을 2B군(발암 가능성 있음)으로 분류했지만, 같은 시점 JECFA 는 1일 섭취허용량을 유지했습니다. 체중 60kg 기준 하루 캔 수십 개 수준이라 통상 섭취는 문제되지 않는다고 봅니다.",
        createdAt: "2026-07-19T22:15:00+09:00",
        likes: 231,
      },
      {
        id: "c11-2",
        author: { name: "당뇨관리중", sensitivity_type: "expert" },
        body: "다만 단맛에 대한 갈망이 유지된다는 연구도 있어서, 저는 물로 조금씩 바꾸는 중입니다.",
        createdAt: "2026-07-20T07:50:00+09:00",
        likes: 87,
      },
    ],
  },
  {
    id: "c12",
    title: "세탁세제 '무형광' 표시, 실제로 확인 가능한가요?",
    content: "형광증백제 무첨가라고 적혀 있는데 성분표엔 관련 표기가 없습니다. 어떻게 검증하나요?",
    category: "household",
    likes_count: 92,
    comments_count: 1,
    fact_check_verdict: null,
    fact_check_color: null,
    created_at: "2026-07-18T15:30:00+09:00",
    profiles: { name: "살림9년차", sensitivity_type: "selective" },
    comments: [
      {
        id: "c12-1",
        author: { name: "화장품연구원", sensitivity_type: "expert" },
        body: "생활화학제품은 전성분 표시 의무가 식품보다 느슨합니다. 안전확인대상 신고번호로 조회하는 게 그나마 확실해요.",
        createdAt: "2026-07-18T17:02:00+09:00",
        likes: 61,
      },
    ],
  },
];

export function getMockPost(id: string): MockPost | null {
  return MOCK_POSTS.find((p) => p.id === id) ?? null;
}

export function sortMockPosts(sort: "latest" | "popular"): MockPost[] {
  const list = [...MOCK_POSTS];
  return sort === "popular"
    ? list.sort((a, b) => b.likes_count - a.likes_count)
    : list.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
