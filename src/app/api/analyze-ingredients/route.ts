import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const { name, brand, ingredients } = await request.json();

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content:
          `식품 성분 안전성 분석 AI. 제품명: ${name}, 브랜드: ${brand}, 성분표: ${ingredients}\n\n` +
          `아래 JSON만 반환. 마크다운 절대 금지. 백틱 절대 금지. 순수 JSON만.\n` +
          `{"verdict":"안전","verdictColor":"#2A8A5C","score":1,"body":"200자 내외 한국어 설명","risks":["우려 성분명 (이유)"],"saferTips":["실용적인 대안 팁"]}\n` +
          `판정→색상→score 범위: 안전→#2A8A5C→1, 양호→#3B7DD4→2, 주의→#C4780A→3, 위험→#C44B4B→4, 매우위험→#8B0000→5\n` +
          `risks: 첨가물·방부제·색소 등 우려 성분 목록 (없으면 빈 배열). saferTips: 섭취 시 주의사항이나 대안 (없으면 빈 배열).`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text")
    return NextResponse.json({ error: "error" }, { status: 500 });

  const raw = content.text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  const result = JSON.parse(raw);
  return NextResponse.json(result);
}
