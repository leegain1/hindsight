/**
 * POST /api/photo-extract
 *
 * 성분표 사진 한 장을 받아 구조화된 JSON 으로 돌려준다. 점수는 계산하지 않는다.
 *
 * 요청은 두 가지를 다 받는다.
 *   multipart/form-data  field "image" 에 파일        (브라우저 <input type=file>)
 *   application/json     { image: "<base64 또는 data URL>", media_type? }  (curl 테스트)
 *
 * 응답
 *   200 { ok: true,  extraction, usage }
 *   422 { ok: false, code: "RETAKE", message }   판독 불가 — 다시 촬영
 *   4xx/5xx { ok: false, code, message }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  extractFromPhoto,
  MAX_IMAGE_BYTES,
  SUPPORTED_MEDIA_TYPES,
  type SupportedMediaType,
} from "@/lib/photoExtract";

export const runtime = "nodejs";
// 사진 판독은 몇 초가 걸린다. 정적 최적화 대상이 아니다.
export const dynamic = "force-dynamic";

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function isSupported(t: string): t is SupportedMediaType {
  return (SUPPORTED_MEDIA_TYPES as readonly string[]).includes(t);
}

/** data URL 이든 순수 base64 든 받아서 { base64, mediaType } 로 정리한다 */
function parseDataUrl(input: string, fallbackType?: string) {
  // [\s\S] 로 쓴다 — s 플래그는 이 프로젝트 tsconfig target 에서 못 쓴다
  const match = /^data:([^;,]+);base64,([\s\S]*)$/.exec(input.trim());
  if (match) return { base64: match[2], mediaType: match[1] };
  return { base64: input.trim(), mediaType: fallbackType ?? "image/jpeg" };
}

async function readImage(
  request: NextRequest,
): Promise<{ base64: string; mediaType: string } | { error: NextResponse }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return { error: fail("NO_IMAGE", "image 필드에 파일이 없습니다.", 400) };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return {
        error: fail(
          "IMAGE_TOO_LARGE",
          `사진이 너무 큽니다 (${(file.size / 1e6).toFixed(1)}MB). ${MAX_IMAGE_BYTES / 1e6}MB 이하로 줄여주세요.`,
          413,
        ),
      };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    return { base64: buffer.toString("base64"), mediaType: file.type };
  }

  const body = (await request.json().catch(() => null)) as {
    image?: string;
    media_type?: string;
  } | null;

  if (!body?.image) {
    return { error: fail("NO_IMAGE", "image 값이 없습니다.", 400) };
  }

  const { base64, mediaType } = parseDataUrl(body.image, body.media_type);
  // base64 는 원본의 약 4/3 크기다. 디코딩하지 않고 원본 크기를 되짚는다.
  const approxBytes = Math.floor((base64.length * 3) / 4);
  if (approxBytes > MAX_IMAGE_BYTES) {
    return {
      error: fail(
        "IMAGE_TOO_LARGE",
        `사진이 너무 큽니다 (약 ${(approxBytes / 1e6).toFixed(1)}MB).`,
        413,
      ),
    };
  }
  return { base64, mediaType };
}

export async function POST(request: NextRequest) {
  let image: { base64: string; mediaType: string };
  try {
    const read = await readImage(request);
    if ("error" in read) return read.error;
    image = read;
  } catch {
    return fail("BAD_REQUEST", "요청을 읽을 수 없습니다.", 400);
  }

  if (!isSupported(image.mediaType)) {
    return fail(
      "UNSUPPORTED_TYPE",
      `지원하지 않는 형식입니다 (${image.mediaType}). JPEG·PNG·WebP·GIF 만 됩니다.`,
      415,
    );
  }

  try {
    const { extraction, usage } = await extractFromPhoto(
      image.base64,
      image.mediaType,
    );

    // 판독 자체가 안 된 사진으로 분석을 이어가면 없는 성분을 근거로 점수가
    // 나온다. 여기서 끊고 다시 찍게 하는 게 맞다.
    if (extraction.readability === "poor") {
      return NextResponse.json(
        {
          ok: false,
          code: "RETAKE",
          message:
            "원재료명을 읽을 수 없어요. 성분표가 화면에 꽉 차도록, 초점을 맞춰 다시 촬영해주세요.",
          extraction,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ ok: true, extraction, usage });
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";

    if (code === "ANTHROPIC_API_KEY_MISSING") {
      return fail(
        "NOT_CONFIGURED",
        "분석 서버가 아직 연결되지 않았어요. 관리자에게 문의해주세요.",
        503,
      );
    }
    if (code === "EXTRACTION_INVALID_JSON" || code === "EXTRACTION_NO_TEXT_BLOCK") {
      return fail("EXTRACTION_FAILED", "판독 결과를 해석하지 못했어요. 다시 시도해주세요.", 502);
    }

    // 나머지는 SDK 에서 올라온 것 — 원인은 서버 로그에만 남긴다
    console.error("[photo-extract]", err);
    return fail("UPSTREAM_ERROR", "분석에 실패했어요. 잠시 후 다시 시도해주세요.", 502);
  }
}
