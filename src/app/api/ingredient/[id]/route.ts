import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const name = decodeURIComponent(id);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: `You are a board-certified food toxicologist and regulatory specialist. You provide accurate, evidence-based information about food ingredients and additives.

CRITICAL RULES — STRICTLY ENFORCE:
1. Only cite papers that ACTUALLY EXIST with VERIFIABLE details. If uncertain, omit the study.
2. DOI must be the real published DOI (format: 10.XXXX/XXXXX). Include only if 100% certain.
3. PubMed IDs must be real. Include only if 100% certain.
4. Never fabricate author names, journal names, or conclusions.
5. Respond ONLY with valid JSON. No markdown, no backticks, no extra text.`,
    messages: [
      {
        role: "user",
        content: `Analyze this food ingredient/additive for a Korean health app: "${name}"

Return ONLY this JSON structure (no markdown, pure JSON):
{
  "name": "공식 한국어 명칭",
  "nameEn": "Official English name",
  "eNumber": "E-number if applicable, else null",
  "riskScore": 1,
  "description": "2-3문장 설명 (한국어). 이 성분이 무엇이고 어디에 쓰이는지.",
  "positiveEffects": ["긍정 효과 1 (한국어)", "긍정 효과 2"],
  "negativeEffects": ["부정 효과 1 (한국어)", "부정 효과 2"],
  "studies": [
    {
      "title": "Exact paper title in original language",
      "authors": "Last F, Last G et al.",
      "year": 2022,
      "journal": "Journal Name",
      "conclusion": "핵심 결론 한 문장 (한국어)",
      "doi": "10.xxxx/xxxxx",
      "pubmedId": "12345678"
    }
  ],
  "regulations": {
    "korea": "한국 식품의약품안전처 규제 현황",
    "eu": "EU EFSA/regulatory status in English",
    "fda": "US FDA status in English",
    "whoIarc": "WHO/IARC classification if applicable, else null"
  },
  "commonProducts": ["제품 예시 1", "제품 예시 2", "제품 예시 3", "제품 예시 4"],
  "adis": "ADI (일일 허용 섭취량) if set by regulators, else null"
}

riskScore scale: 1=매우안전, 2-3=안전, 4-5=주의필요, 6-7=주의, 8-9=위험, 10=매우위험
Include 1-3 studies ONLY if you are certain they exist. Zero studies is fine.`,
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
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=604800" }, // cache 7 days
    });
  } catch {
    return NextResponse.json({ error: "parse error", raw }, { status: 500 });
  }
}
