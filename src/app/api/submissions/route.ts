import { NextRequest, NextResponse } from "next/server";
import { addSubmission, getAllSubmissions } from "@/lib/product-store";

export async function POST(request: NextRequest) {
  const { barcode, name, brand, ingredients } = await request.json();

  if (!barcode || !ingredients?.trim()) {
    return NextResponse.json({ error: "barcode and ingredients required" }, { status: 400 });
  }

  // 이미 대기 중인 동일 바코드가 있으면 중복 방지
  const existing = getAllSubmissions().find(
    (s) => s.barcode === barcode && s.status === "pending"
  );
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const submission = addSubmission({ barcode, name: name || "", brand: brand || "", ingredients });
  return NextResponse.json({ ok: true, id: submission.id });
}
