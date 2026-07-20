import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/categories";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Build lookup map from central categories lib
const CATEGORY_FOCUS = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, { nameKo: c.nameKo, focus: c.focus }])
) as Record<string, { nameKo: string; focus: string }>;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const cat = CATEGORY_FOCUS[slug];

  if (!cat) {
    return NextResponse.json({ error: "unknown category" }, { status: 404 });
  }

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `건강 정보 앱 HINDSIGHT+의 카테고리 페이지 콘텐츠를 생성하라.
카테고리: ${cat.nameKo}
주제 범위: ${cat.focus}

아래 JSON만 반환. 마크다운 금지. 백틱 금지. 순수 JSON만.
{
  "intro": "이 카테고리 소개 2-3문장 (한국어). 왜 중요한지 포함.",
  "mainRisks": [
    {"title": "위험 요소 1 (20자 이내)", "description": "설명 1-2문장", "severity": "높음|보통|낮음"},
    {"title": "위험 요소 2", "description": "설명", "severity": "높음|보통|낮음"},
    {"title": "위험 요소 3", "description": "설명", "severity": "높음|보통|낮음"}
  ],
  "faqs": [
    {"question": "자주 묻는 질문 1?", "answer": "2-3문장 답변 (한국어)", "verdict": "사실|부분사실|과장됨|거짓|연구중", "verdictColor": "#hex"},
    {"question": "자주 묻는 질문 2?", "answer": "2-3문장 답변", "verdict": "...","verdictColor": "#hex"},
    {"question": "자주 묻는 질문 3?", "answer": "2-3문장 답변", "verdict": "...","verdictColor": "#hex"},
    {"question": "자주 묻는 질문 4?", "answer": "2-3문장 답변", "verdict": "...","verdictColor": "#hex"}
  ],
  "keyIngredients": [
    {"name": "주요 성분/물질명", "riskLevel": "high|medium|low", "note": "한 줄 설명"},
    {"name": "성분 2", "riskLevel": "high|medium|low", "note": "한 줄 설명"},
    {"name": "성분 3", "riskLevel": "high|medium|low", "note": "한 줄 설명"},
    {"name": "성분 4", "riskLevel": "high|medium|low", "note": "한 줄 설명"},
    {"name": "성분 5", "riskLevel": "high|medium|low", "note": "한 줄 설명"}
  ],
  "tips": ["실용적 팁 1 (한국어)", "팁 2", "팁 3"]
}
색상: 사실→#1A1A1A, 부분사실→#6B52D4, 과장됨→#C05000, 거짓→#E23434, 연구중→#8A8880`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text")
    return NextResponse.json({ error: "model error" }, { status: 500 });

  const raw = content.text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  try {
    const data = JSON.parse(raw);
    return NextResponse.json(
      { ...data, slug, nameKo: cat.nameKo },
      { headers: { "Cache-Control": "public, s-maxage=86400" } }
    );
  } catch {
    return NextResponse.json({ error: "parse error" }, { status: 500 });
  }
}
