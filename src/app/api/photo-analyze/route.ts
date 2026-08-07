/**
 * POST /api/photo-analyze
 *
 * 사진 한 장 → 판독(Claude Vision) → 점수(규칙 기반 코드) → 화면이 그대로 쓰는 결과.
 *
 * /api/photo-extract 는 판독 원본만 돌려주는 저수준 엔드포인트다. 화면은 이쪽 하나만
 * 부르면 된다.
 *
 * 하이브리드: 사진에서 실제로 나온 것(제품명·원재료·영양·점수·주의성분)은 실제 값이고,
 * 후기·신뢰뱃지·팩트체크는 아직 실제 데이터 소스가 없어 목을 얹는다. 어느 쪽이 실제인지
 * 응답의 `real` 플래그로 표시해 화면이 구분할 수 있게 한다.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  extractFromPhoto,
  MAX_IMAGE_BYTES,
  SUPPORTED_MEDIA_TYPES,
  type SupportedMediaType,
} from "@/lib/photoExtract";
import { analyze } from "@/lib/analyze";
import type { HealthProfile } from "@/lib/profiling";
import {
  DEMO_REVIEWS,
  VERDICT_COLOR,
  type PhotoAnalysisResult,
  type RiskItem,
  type VerdictLabel,
} from "@/lib/mockPhotoAnalysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function isSupported(t: string): t is SupportedMediaType {
  return (SUPPORTED_MEDIA_TYPES as readonly string[]).includes(t);
}

/** 점수 → 판정. 앱의 기존 임계값(scoring.ts·productData.ts)과 같은 체계를 쓴다 */
function verdictOf(score: number): VerdictLabel {
  if (score >= 85) return "안전";
  if (score >= 70) return "양호";
  if (score >= 50) return "주의";
  if (score >= 30) return "위험";
  return "매우위험";
}

/** 감점 크기 → 화면 표시 단계 */
function levelOf(penalty: number): RiskItem["level"] {
  if (penalty >= 8) return "high";
  if (penalty >= 5) return "mid";
  return "low";
}

export async function POST(request: NextRequest) {
  const started = Date.now();

  let base64: string;
  let mediaType: string;
  let profile: HealthProfile | null = null;

  try {
    const form = await request.formData();

    const file = form.get("image");
    if (!(file instanceof File)) {
      return fail("NO_IMAGE", "image 필드에 파일이 없습니다.", 400);
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return fail(
        "IMAGE_TOO_LARGE",
        `사진이 너무 큽니다 (${(file.size / 1e6).toFixed(1)}MB).`,
        413,
      );
    }
    base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    mediaType = file.type;

    // 건강 프로파일은 localStorage 에만 있으므로 클라이언트가 실어 보낸다.
    // 값이 깨져 있어도 분석 자체는 막지 않는다 — 개인화만 빠진다.
    const raw = form.get("profile");
    if (typeof raw === "string" && raw) {
      try {
        profile = JSON.parse(raw) as HealthProfile;
      } catch {
        profile = null;
      }
    }
  } catch {
    return fail("BAD_REQUEST", "요청을 읽을 수 없습니다.", 400);
  }

  if (!isSupported(mediaType)) {
    return fail(
      "UNSUPPORTED_TYPE",
      `지원하지 않는 형식입니다 (${mediaType}). JPEG·PNG·WebP·GIF 만 됩니다.`,
      415,
    );
  }

  try {
    const { extraction } = await extractFromPhoto(base64, mediaType as SupportedMediaType);

    if (extraction.readability === "poor") {
      return NextResponse.json(
        {
          ok: false,
          code: "RETAKE",
          message:
            "원재료명을 읽을 수 없어요. 성분표가 화면에 꽉 차도록, 초점을 맞춰 다시 촬영해주세요.",
        },
        { status: 422 },
      );
    }

    const score = analyze(extraction.ingredients, extraction.nutrition, profile);
    const shown = score.personalScore;
    const label = verdictOf(shown);

    const risks: RiskItem[] = score.deductions
      .filter((d) => d.kind === "ingredient")
      .map((d) => ({
        name: d.label,
        reason:
          `${d.reason} · -${d.penalty}점` +
          (d.matchedAs && d.matchedAs !== d.label ? ` (표기: ${d.matchedAs})` : ""),
        level: levelOf(d.penalty),
      }));

    const partial = score.skippedNutrients.length > 0;
    const bodyParts = [
      `원재료 ${extraction.ingredients.length}건 중 주의 성분 ${risks.length}건을 찾았습니다.`,
      score.nutrientPenalty > 0
        ? `영양성분에서 ${score.nutrientPenalty}점, 주의 성분에서 ${score.ingredientPenalty}점 감점됐습니다.`
        : `영양성분 감점은 없고, 주의 성분에서 ${score.ingredientPenalty}점 감점됐습니다.`,
      score.appliedGoals.length > 0 && score.personalScore !== score.baseScore
        ? `회원님의 ${score.appliedGoals.join("·")} 조건을 반영해 기본 ${score.baseScore}점에서 ${score.personalScore}점으로 조정했습니다.`
        : "",
      partial ? `${score.skippedNutrients.join("·")}은 사진에서 읽지 못해 계산에서 뺐습니다.` : "",
    ].filter(Boolean);

    const result: PhotoAnalysisResult & {
      /** 실제 분석인지 목 데모인지 — 화면이 배지로 구분한다 */
      isDemo: boolean;
      scoreDetail: typeof score;
      partialRead: boolean;
    } = {
      detected: {
        productName: extraction.product_name ?? "이름을 읽지 못한 제품",
        brand: extraction.brand ?? "브랜드 미상",
        ocrText: [extraction.product_name, extraction.brand].filter(Boolean).join(" · "),
        ingredients: extraction.ingredients.map((i) => i.name),
        // 바코드 조회가 아니라 사진에서 직접 읽었다 — 이게 Yuka 대비 차별점이다
        ingredientSource: "사진 판독",
        confidence: extraction.readability === "good" ? 0.93 : 0.72,
      },
      // 아래 세 개는 아직 실제 소스가 없다 (하이브리드)
      reviews: DEMO_REVIEWS,
      factCheck: [],
      saferTips: [],
      verdict: {
        label,
        color: VERDICT_COLOR[label],
        score: shown,
        body: bodyParts.join(" "),
      },
      risks,
      personalized:
        score.appliedGoals.length > 0
          ? {
              matched: score.deductions
                .filter((d) => d.personalized)
                .map((d) => ({
                  name: d.label,
                  reason: `${score.appliedGoals.join("·")} 조건으로 감점 ${d.basePenalty} → ${d.penalty}`,
                  level: levelOf(d.penalty),
                })),
              note:
                score.personalScore === score.baseScore
                  ? `${score.appliedGoals.join("·")} 조건에 걸리는 항목은 없었습니다.`
                  : `${score.appliedGoals.join("·")} 기준으로 다시 계산했습니다. 일반 기준 ${score.baseScore}점 → 회원님 기준 ${score.personalScore}점.`,
            }
          : null,
      meta: {
        elapsedMs: Date.now() - started,
        model: "claude-sonnet-5",
        unregistered: true,
        yukaResult: "제품을 찾을 수 없음",
      },
      isDemo: false,
      scoreDetail: score,
      partialRead: partial,
    };

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    if (code === "ANTHROPIC_API_KEY_MISSING") {
      return fail("NOT_CONFIGURED", "분석 서버가 아직 연결되지 않았어요.", 503);
    }
    console.error("[photo-analyze]", err);
    return fail("UPSTREAM_ERROR", "분석에 실패했어요.", 502);
  }
}
