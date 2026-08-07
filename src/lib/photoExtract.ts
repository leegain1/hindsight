/**
 * 성분표 사진 → 구조화된 JSON 추출 (Claude Vision).
 *
 * 이 모듈은 "사진에 뭐라고 적혀 있는가"만 담당한다. 점수 계산은 하지 않는다 —
 * 그건 lib/analyze.ts 가 규칙 기반 코드로 한다. 판독과 판정을 섞으면 모델이
 * 점수를 지어내기 시작하고, 왜 그 점수가 나왔는지 설명할 수 없게 된다.
 */

import Anthropic from "@anthropic-ai/sdk";

/** 지원하는 이미지 타입 — Claude 가 받는 것과 동일 */
export const SUPPORTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

/** base64 인코딩 후 5MB 를 넘으면 API 가 거부한다. 원본 기준으로 미리 자른다. */
export const MAX_IMAGE_BYTES = 3_500_000;

export interface ExtractedIngredient {
  name: string;
  /** 원재료명 표기 순서 (1부터). 함량 순 표기가 원칙이라 순서 자체가 정보다. */
  order: number;
}

export interface ExtractedNutrition {
  sugar_g: number | null;
  sodium_mg: number | null;
  sat_fat_g: number | null;
  calories_kcal: number | null;
}

export type Readability = "good" | "partial" | "poor";

export interface PhotoExtraction {
  product_name: string | null;
  brand: string | null;
  ingredients: ExtractedIngredient[];
  nutrition: ExtractedNutrition;
  readability: Readability;
  /** 사진에서 읽어내지 못한 항목 이름들 — 사용자에게 무엇을 다시 찍어야 하는지 알려준다 */
  unreadable_fields: string[];
}

/** null 허용 필드. 구조화 출력은 숫자 범위 제약을 지원하지 않으므로 타입만 지정한다. */
const nullable = (type: "string" | "number") => ({
  anyOf: [{ type }, { type: "null" }],
});

/**
 * 응답 스키마.
 *
 * 모든 object 에 additionalProperties:false 와 전체 required 가 필요하다 —
 * 구조화 출력의 요구사항이다. 값이 없을 수 있는 필드는 optional 로 빼는 게
 * 아니라 null 을 허용하는 방식으로 표현한다. "판독 불가"와 "필드가 없음"을
 * 구분해야 하기 때문이다.
 */
const EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "product_name",
    "brand",
    "ingredients",
    "nutrition",
    "readability",
    "unreadable_fields",
  ],
  properties: {
    product_name: nullable("string"),
    brand: nullable("string"),
    ingredients: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "order"],
        properties: {
          name: { type: "string" },
          order: { type: "integer" },
        },
      },
    },
    nutrition: {
      type: "object",
      additionalProperties: false,
      required: ["sugar_g", "sodium_mg", "sat_fat_g", "calories_kcal"],
      properties: {
        sugar_g: nullable("number"),
        sodium_mg: nullable("number"),
        sat_fat_g: nullable("number"),
        calories_kcal: nullable("number"),
      },
    },
    readability: { type: "string", enum: ["good", "partial", "poor"] },
    unreadable_fields: { type: "array", items: { type: "string" } },
  },
} as const;

const SYSTEM_PROMPT = [
  "당신은 식품 포장지 사진에서 표기 내용을 그대로 옮겨 적는 판독기다.",
  "",
  "규칙:",
  "1. 사진에 실제로 보이는 내용만 사용한다. 제품에 대한 사전 지식으로 채우지 않는다.",
  "2. 글자가 흐리거나 잘려서 확신할 수 없으면 추측하지 말고 null 을 넣고,",
  "   해당 항목 이름을 unreadable_fields 에 적는다.",
  "3. 원재료명은 표기된 순서 그대로 order 에 1부터 매긴다. 순서를 바꾸지 않는다.",
  "4. 괄호 안의 세부 성분도 각각 별개 항목으로 넣는다.",
  "   예: '혼합제제(구연산, 향료)' → '혼합제제', '구연산', '향료'",
  "5. 영양성분은 총 내용량 기준 수치를 숫자로만 넣는다. 단위 문자는 넣지 않는다.",
  "   '1일 영양성분 기준치에 대한 비율(%)' 은 값이 아니므로 쓰지 않는다.",
  "6. readability 판정:",
  "   good    — 원재료명과 영양성분을 모두 읽을 수 있다",
  "   partial — 둘 중 하나만 읽을 수 있거나 일부가 잘렸다",
  "   poor    — 원재료명을 사실상 읽을 수 없다 (초점 나감·반사·너무 멀다)",
  "7. 판정에 해당하는 말(안전/위험/점수)은 절대 쓰지 않는다. 판독만 한다.",
  "",
  "주어진 JSON 스키마에 맞는 값만 출력한다.",
].join("\n");

/** 판독 결과와 함께 비용 추적용 토큰 사용량을 돌려준다 */
export interface ExtractResult {
  extraction: PhotoExtraction;
  usage: { input_tokens: number; output_tokens: number };
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.startsWith("sk-ant-...")) {
    throw new Error("ANTHROPIC_API_KEY_MISSING");
  }
  // 요청마다 새로 만들 이유가 없다. 커넥션 재사용이 그대로 지연 시간이 된다.
  client ??= new Anthropic({ apiKey });
  return client;
}

/**
 * 사진 한 장에서 제품 정보를 뽑는다.
 *
 * @param imageBase64 base64 문자열 (data URL 접두사 없이)
 * @param mediaType   image/jpeg 등
 */
export async function extractFromPhoto(
  imageBase64: string,
  mediaType: SupportedMediaType,
): Promise<ExtractResult> {
  const message = await getClient().messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    // temperature 는 쓰지 않는다. Claude Sonnet 5 는 비기본 샘플링 파라미터를
    // 400 으로 거부한다. 판독의 일관성은 effort: "low" 와 좁은 스키마로 잡는다.
    thinking: { type: "adaptive" },
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: EXTRACTION_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          {
            type: "text",
            text: "이 사진에서 제품명·브랜드·원재료명·영양성분을 판독해줘.",
          },
        ],
      },
    ],
  });

  // 구조화 출력이라도 응답 블록을 눈으로 찾아야 한다. adaptive thinking 이
  // 켜져 있으면 text 블록 앞에 thinking 블록이 온다 — content[0] 를 그냥
  // 집으면 빈 thinking 을 파싱하려다 터진다.
  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("EXTRACTION_NO_TEXT_BLOCK");
  }

  let extraction: PhotoExtraction;
  try {
    extraction = JSON.parse(textBlock.text) as PhotoExtraction;
  } catch {
    throw new Error("EXTRACTION_INVALID_JSON");
  }

  return {
    extraction,
    usage: {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    },
  };
}
