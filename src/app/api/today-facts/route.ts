import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET() {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `건강 팩트체크 AI. 한국 소비자에게 중요한 건강/식품/환경 관련 오해 또는 미신 3가지를 팩트체크하라.
주제: 식품 첨가물, 미세플라스틱, 전자파, 보충제, 수질, 세제 화학물질 중에서.
각각 다른 카테고리에서 선택.

아래 JSON 배열만 반환. 마크다운 금지. 백틱 금지. 순수 JSON만.
[
  {"category":"카테고리명","title":"주장 (25자 이내, 의문형)","verdict":"사실|부분사실|과장됨|거짓|연구중","verdictColor":"#hex","query":"검색 키워드"},
  {"category":"카테고리명","title":"주장 (25자 이내)","verdict":"...","verdictColor":"#hex","query":"..."},
  {"category":"카테고리명","title":"주장 (25자 이내)","verdict":"...","verdictColor":"#hex","query":"..."}
]
색상규칙: 사실→#1A1A1A, 부분사실→#6B52D4, 과장됨→#C05000, 거짓→#E23434, 연구중→#8A8880`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text")
    return NextResponse.json([], { status: 500 });

  const raw = content.text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  try {
    const facts = JSON.parse(raw);
    return NextResponse.json(facts, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
      },
    });
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
