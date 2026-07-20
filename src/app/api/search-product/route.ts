import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const { barcode, name } = await request.json();

  const prompt =
    `바코드 번호 ${barcode}인 식품 제품의 정확한 성분 정보를 찾아주세요.` +
    (name ? ` 제품명은 "${name}"입니다.` : "") +
    ` 제조사 공식 사이트, 식품안전나라, 쿠팡, 네이버쇼핑 등에서 성분표를 검색해주세요.` +
    ` 성분 정보를 찾으면 아래 JSON만 반환하세요. 마크다운 없이 순수 JSON만.` +
    `\n{"found":true,"name":"제품명","brand":"브랜드","ingredients":"원재료 및 성분 전체 텍스트"}` +
    `\n성분 정보를 찾지 못하면: {"found":false}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools: [{ type: "web_search_20260209", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ found: false });
    }

    const raw = textBlock.text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Claude가 JSON 외 설명을 붙였을 경우 JSON 부분만 추출
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ found: false });

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ found: false });
  }
}
