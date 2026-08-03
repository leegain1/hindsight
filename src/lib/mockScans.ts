/**
 * 최근 스캔 목 데이터.
 *
 * 프로필 SCANS 탭이 비어 있으면 "기록 관리"(BM 슬라이드의 유료 가치 중 하나)를
 * 보여줄 수 없다. 실제 스캔 이력이 없을 때 이걸로 채운다.
 *
 * 제품은 productData 카탈로그의 실제 항목에서 골랐다 — 탭하면 결과 페이지가
 * 정상적으로 열려야 데모가 끊기지 않는다.
 *
 * 날짜는 고정 문자열이다. Date.now() 로 만들면 스크린샷마다 값이 달라진다.
 */

export interface MockScan {
  barcode: string;
  name: string;
  brand: string;
  score: number;
  color: string;
  scannedAt: string;
  /** 바코드 스캔인지 사진 분석인지 — 사진 경로가 우리 차별점이라 구분해 보여준다 */
  via: "barcode" | "photo";
}

/** 점수 → 색. productData.getScoreBadgeColor 와 같은 체계 */
function color(score: number): string {
  if (score >= 85) return "#2A8A5C";
  if (score >= 70) return "#3B7DD4";
  if (score >= 50) return "#C4780A";
  return "#C44B4B";
}

export const MOCK_SCANS: MockScan[] = [
  {
    barcode: "photo-onedays-granola",
    name: "흑임자 크런치 그래놀라",
    brand: "온데이즈",
    score: 58,
    color: color(58),
    scannedAt: "2026-08-02T09:14:00+09:00",
    via: "photo",
  },
  {
    barcode: "8801043012345",
    name: "제주 삼다수 2L",
    brand: "제주삼다수",
    score: 92,
    color: color(92),
    scannedAt: "2026-08-01T20:32:00+09:00",
    via: "barcode",
  },
  {
    barcode: "photo-local-bakery-granola",
    name: "통곡물 그래놀라 (소분)",
    brand: "동네베이커리",
    score: 61,
    color: color(61),
    scannedAt: "2026-08-01T13:05:00+09:00",
    via: "photo",
  },
  {
    barcode: "8801043012346",
    name: "아이시스 8.0 2L",
    brand: "롯데칠성음료",
    score: 88,
    color: color(88),
    scannedAt: "2026-07-31T18:47:00+09:00",
    via: "barcode",
  },
  {
    barcode: "photo-imported-protein",
    name: "웨이 아이솔레이트 (직구)",
    brand: "해외브랜드",
    score: 74,
    color: color(74),
    scannedAt: "2026-07-30T08:20:00+09:00",
    via: "photo",
  },
  {
    barcode: "photo-zero-soda",
    name: "제로 콜라 355ml",
    brand: "편의점 PB",
    score: 47,
    color: color(47),
    scannedAt: "2026-07-29T22:11:00+09:00",
    via: "barcode",
  },
];

export function timeAgoKo(dateStr: string, now: number): string {
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR");
}
