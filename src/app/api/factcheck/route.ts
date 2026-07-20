import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json() as { query: string };
    if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content:
          "건강 팩트체킹 AI. 질문: " + query +
          " 아래 JSON만 반환. 마크다운 절대 금지. 백틱 절대 금지. 순수 JSON만." +
          ' {"verdict":"사실","verdictColor":"#1A1A1A","summary":"결론","body":"설명",' +
          '"evidenceCount":10,"latestStudy":2024,"alternatives":["대안1"],"severity":3,"category":"기타"}' +
          " 판정→색상: 사실→#1A1A1A 부분사실→#6B52D4 과장됨→#C05000 거짓→#E23434 연구중→#8A8880",
      }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "no text response" }, { status: 500 });
    }

    const raw = content.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "parse error" }, { status: 500 });

    const result = JSON.parse(match[0]) as Record<string, unknown>;
    return NextResponse.json(result);
  } catch (err) {
    console.error("[factcheck] error:", err);
    return NextResponse.json(
      { error: "분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
