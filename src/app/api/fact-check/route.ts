import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request: Request) {
  const { title, content } = await request.json() as { title: string; content: string };

  if (!title || !content) {
    return NextResponse.json({ error: "title and content required" }, { status: 400 });
  }

  const truncated = content.slice(0, 2000);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `당신은 건강·식품 안전 전문 팩트체커입니다. 아래 포스트의 핵심 주장을 과학적으로 검토하세요.

제목: ${title}
내용: ${truncated}

반드시 JSON만 출력하세요 (다른 텍스트 없이):
{
  "verdict": "사실" | "부분사실" | "과장됨" | "거짓" | "확인불가",
  "verdictColor": "#2A8A5C" | "#6B52D4" | "#C4780A" | "#C44B4B" | "#8A8880",
  "explanation": "2-3문장으로 한국어 설명. 근거 포함."
}

판정 기준: 사실(충분한 과학적 근거)=#2A8A5C, 부분사실(일부 맞음)=#6B52D4, 과장됨(핵심은 맞으나 과장)=#C4780A, 거짓(근거 없음)=#C44B4B, 확인불가(연구 부족)=#8A8880`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ error: "parse error" }, { status: 500 });

  try {
    const result = JSON.parse(match[0]) as {
      verdict: string;
      verdictColor: string;
      explanation: string;
    };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "parse error" }, { status: 500 });
  }
}
