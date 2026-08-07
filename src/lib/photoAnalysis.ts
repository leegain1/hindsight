/**
 * 화면이 부르는 사진 분석 진입점.
 *
 * 실제 API 를 먼저 부르고, 실패하면 목 데이터로 떨어진다. 발표장에 인터넷이 없다는
 * 게 확정이라 폴백은 예외 처리가 아니라 기본 설계다. 다만 **조용히** 떨어지지는
 * 않는다 — 목으로 간 결과에는 isDemo:true 가 붙고 화면이 배지로 표시한다.
 * 목 데이터를 실제 분석인 척 보여주면 그건 데모가 아니라 거짓말이다.
 */

import {
  analyzePhoto as analyzeWithMock,
  TOTAL_PIPELINE_MS,
  type PhotoAnalysisResult,
} from "./mockPhotoAnalysis";
import type { AnalysisScore } from "./analyze";
import { EMPTY_HEALTH_PROFILE, type HealthProfile } from "./profiling";

export type { PhotoAnalysisResult } from "./mockPhotoAnalysis";
export { PIPELINE_STAGES, TOTAL_PIPELINE_MS } from "./mockPhotoAnalysis";
export type {
  RiskItem,
  ReviewSummary,
  TrustBadge,
  UserReview,
} from "./mockPhotoAnalysis";

export interface AnalyzedPhoto extends PhotoAnalysisResult {
  /** true = 실제 분석이 아니라 목 데모 결과 */
  isDemo: boolean;
  /** 감점 근거 상세. 목 폴백일 때는 없다 */
  scoreDetail?: AnalysisScore;
  /** 영양성분 일부를 못 읽어 계산에서 뺐는지 */
  partialRead?: boolean;
  /** 표시사항에서 제품명을 못 읽었는지 — 화면이 직접 입력을 받는다 */
  nameUnread?: boolean;
}

/** 다시 촬영이 필요할 때 던진다. 화면이 이걸 잡아 안내 문구를 띄운다. */
export class RetakeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetakeError";
  }
}

/** 사진 장변을 이 값으로 줄인다. Claude 가 받는 상한(2576px)보다 낮게 잡아
 *  업로드 크기와 이미지 토큰 비용을 함께 줄인다. 성분표 글자는 이 해상도로 충분하다. */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

/**
 * 폰 사진은 그대로 올리면 4MB 를 넘어 API 상한(3.5MB)에 걸린다.
 * 브라우저에서 미리 줄여 보낸다 — 서버에 이미지 처리 의존성을 들이지 않아도 된다.
 */
async function shrink(file: File): Promise<Blob> {
  // 브라우저가 아니거나 이미 충분히 작으면 그대로 보낸다
  if (typeof document === "undefined" || file.size < 900_000) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  return blob ?? file;
}

function readProfile(): HealthProfile | null {
  try {
    const raw = localStorage.getItem("hindsight_health_profile");
    if (!raw) return null;
    return { ...EMPTY_HEALTH_PROFILE, ...JSON.parse(raw) } as HealthProfile;
  } catch {
    return null;
  }
}

export async function analyzePhoto(
  file: File,
  signal?: AbortSignal,
): Promise<AnalyzedPhoto> {
  const started = Date.now();

  try {
    const form = new FormData();
    form.append("image", await shrink(file), "photo.jpg");
    const profile = readProfile();
    if (profile) form.append("profile", JSON.stringify(profile));

    const res = await fetch("/api/photo-analyze", {
      method: "POST",
      body: form,
      signal,
    });

    // 재촬영은 폴백 대상이 아니다. 판독이 안 된 사진을 목으로 덮으면
    // 사용자는 자기 사진이 분석된 줄 안다.
    if (res.status === 422) {
      const body = await res.json().catch(() => null);
      throw new RetakeError(
        body?.message ?? "사진을 읽을 수 없어요. 다시 촬영해주세요.",
      );
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const body = (await res.json()) as { ok: boolean; result: AnalyzedPhoto };
    if (!body.ok || !body.result) throw new Error("BAD_PAYLOAD");

    // 화면의 진행 애니메이션이 끝나기 전에 결과가 오면 단계가 튄다.
    // 실제 분석이 빠른 건 좋은 일이므로 최소 시간만 맞춘다.
    const remain = TOTAL_PIPELINE_MS - (Date.now() - started);
    if (remain > 0) await sleep(remain, signal);

    return body.result;
  } catch (err) {
    if (err instanceof RetakeError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") throw err;

    // 여기부터가 폴백 — 네트워크 없음·키 없음·서버 오류
    console.warn("[photoAnalysis] 실제 분석 실패, 목 데모로 대체:", err);
    const mock = await analyzeWithMock(file, signal);
    return { ...mock, isDemo: true };
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("aborted", "AbortError"));
    });
  });
}
