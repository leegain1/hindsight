/**
 * 첫 진입 흐름을 제어하는 키들.
 *
 * 전에는 홈과 /welcome 이 각자 문자열을 들고 있었다. 한쪽만 바꾸면 조용히
 * 어긋나는 종류의 중복이라 여기로 모았다.
 */

/** /welcome 흐름을 한 번이라도 끝까지 봤는지 (기기 단위로 남는다) */
export const WELCOME_SEEN_KEY = "hindsight_welcome_seen";

/**
 * "로그인 없이 둘러보기" 를 선택했다는 표시.
 *
 * localStorage 가 아니라 **sessionStorage** 다. 이게 기기에 영구히 남으면
 * 한 번 건너뛴 뒤로는 /welcome 을 다시 볼 수 없는데, 발표에서는 매번 브랜드
 * 화면부터 보여줘야 한다. 탭을 새로 열면 다시 /welcome 에서 시작한다.
 *
 * 이 표시가 없으면 홈은 로그인 여부를 확인하고, 로그인 안 되어 있으면
 * /welcome 으로 되돌린다.
 */
export const ANON_BROWSE_KEY = "hindsight_anon_browse";

/** 이 탭에서 로그인 없이 둘러보기를 허용했는지 */
export function isAnonBrowsing(): boolean {
  try {
    return sessionStorage.getItem(ANON_BROWSE_KEY) === "1";
  } catch {
    // sessionStorage 가 차단된 환경 — 게이트로 사람을 막느니 통과시킨다
    return true;
  }
}

/** 로그인 없이 지나가기로 했다고 표시한다 */
export function allowAnonBrowsing(): void {
  try {
    sessionStorage.setItem(ANON_BROWSE_KEY, "1");
  } catch {
    /* 저장 실패해도 진행은 막지 않는다 */
  }
}
