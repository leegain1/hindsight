/**
 * 촬영 품질 사전 검사 — 분석을 보내기 전에 브라우저에서 판정한다.
 *
 * Vision 의 readability 와 이중 체크다. 이쪽이 먼저 걸러주면
 *   1) 못 읽을 사진에 API 비용과 9초를 쓰지 않고
 *   2) 사용자는 결과를 기다렸다가 "다시 찍으세요"를 듣지 않는다.
 *
 * ── 임계값 근거 (실측, 합성 성분표 이미지) ───────────────────────────────
 *   선명도(라플라시안 분산)   정상 3533 · 약한 흔들림 104 · 심한 흔들림 3.5
 *   Vision 은 선명도 104 를 readability:"good" 으로 정확히 읽었고,
 *   3.5 는 "poor" 로 떨어졌다. 그래서 차단선은 104 보다 한참 아래에 둔다.
 *
 * ── 차단은 흐림만 한다 ──────────────────────────────────────────────────
 *   반사·어두움은 경고만 하고 분석을 진행시킨다. 오탐으로 정상 사진이 막히는
 *   것이 흐린 사진이 통과하는 것보다 나쁘다 — 뒤쪽은 Vision 의 readability 가
 *   한 번 더 잡아주지만, 앞쪽은 사용자가 아예 못 쓰게 된다.
 *
 *   특히 반사 지표는 **보정되지 않았다.** 흰 성분표는 원래 화면 대부분이
 *   포화 밝기라 정상 사진(0.652)과 반사 사진(0.668)이 구분되지 않았다.
 *   실제 제품 사진(색·질감이 있는 배경)으로 다시 보정하기 전까지는 참고용이다.
 */

export type QualityFlag = "blurry" | "glare" | "dark";

export interface QualityReport {
  /** 라플라시안 분산 — 클수록 선명 */
  sharpness: number;
  /** 밝으면서 국소 대비가 죽은 영역의 비율 (0~1). 보정 전이라 참고용 */
  glare: number;
  /** 평균 밝기 0~255 */
  luma: number;
  flags: QualityFlag[];
  /** true 면 분석을 보내지 말고 다시 찍게 한다 */
  block: boolean;
  /** 사용자에게 보여줄 한 줄. 문제가 없으면 null */
  message: string | null;
}

/** 이 아래면 사람이 봐도 글자를 못 읽는다 — 차단 */
const SHARPNESS_BLOCK = 30;
/** 이 아래면 흔들렸을 수 있다 — 경고만 */
const SHARPNESS_WARN = 90;
/** 참고용. 실제 제품 사진으로 보정 전 */
const GLARE_WARN = 0.82;
const LUMA_DARK = 80;

/** 계산은 축소본으로 한다. 원본 해상도로 돌리면 폰에서 눈에 띄게 버벅인다. */
const SAMPLE_EDGE = 480;

export async function inspectImage(file: Blob): Promise<QualityReport> {
  const gray = await toGrayscale(file);
  if (!gray) {
    // 검사할 수 없으면 통과시킨다. 검사 실패로 사용자를 막을 이유가 없다.
    return { sharpness: 0, glare: 0, luma: 0, flags: [], block: false, message: null };
  }

  const sharpness = laplacianVariance(gray);
  const glare = blownRatio(gray);
  const luma = mean(gray.data);

  const flags: QualityFlag[] = [];
  if (sharpness < SHARPNESS_WARN) flags.push("blurry");
  if (glare > GLARE_WARN) flags.push("glare");
  if (luma < LUMA_DARK) flags.push("dark");

  const block = sharpness < SHARPNESS_BLOCK;

  let message: string | null = null;
  if (block) {
    message = "사진이 흔들렸어요. 폰을 고정하고 성분표에 초점을 맞춰 다시 찍어주세요.";
  } else if (flags.includes("dark")) {
    message = "사진이 어두워요. 밝은 곳에서 찍으면 더 정확합니다.";
  } else if (flags.includes("glare")) {
    message = "빛 반사가 있는 것 같아요. 각도를 살짝 틀면 더 정확합니다.";
  } else if (flags.includes("blurry")) {
    message = "조금 흔들렸어요. 다시 찍으면 더 정확합니다.";
  }

  return { sharpness, glare, luma, flags, block, message };
}

interface Gray {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

async function toGrayscale(file: Blob): Promise<Gray | null> {
  if (typeof document === "undefined") return null;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;

  const scale = Math.min(1, SAMPLE_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    return null;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const rgba = ctx.getImageData(0, 0, w, h).data;
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
    // Rec.601 휘도 — 사람 눈의 민감도에 맞춘 가중치
    gray[p] = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
  }
  return { data: gray, width: w, height: h };
}

/** 3x3 라플라시안 응답의 분산. 초점이 나가면 고주파가 사라져 값이 급락한다. */
function laplacianVariance({ data, width: w, height: h }: Gray): number {
  if (w < 3 || h < 3) return 0;
  const out: number[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      out.push(-4 * data[i] + data[i - 1] + data[i + 1] + data[i - w] + data[i + w]);
    }
  }
  const m = out.reduce((a, b) => a + b, 0) / out.length;
  return out.reduce((a, v) => a + (v - m) * (v - m), 0) / out.length;
}

/**
 * 밝으면서 국소 대비가 죽은 칸의 비율.
 * 글자가 있으면 대비가 살아 있고, 반사는 밝은 채로 질감이 지워진다.
 */
function blownRatio({ data, width: w, height: h }: Gray, grid = 16): number {
  const cw = Math.max(1, Math.floor(w / grid));
  const ch = Math.max(1, Math.floor(h / grid));
  let blown = 0;
  let total = 0;

  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      let sum = 0;
      let sumSq = 0;
      let n = 0;
      for (let y = gy * ch; y < Math.min((gy + 1) * ch, h); y++) {
        for (let x = gx * cw; x < Math.min((gx + 1) * cw, w); x++) {
          const v = data[y * w + x];
          sum += v;
          sumSq += v * v;
          n++;
        }
      }
      if (!n) continue;
      total++;
      const m = sum / n;
      const sd = Math.sqrt(Math.max(0, sumSq / n - m * m));
      if (m >= 246 && sd < 6) blown++;
    }
  }
  return total ? blown / total : 0;
}

function mean(a: Uint8ClampedArray): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return a.length ? s / a.length : 0;
}
