import { NextRequest, NextResponse } from "next/server";
import { getApprovedByBarcode } from "@/lib/product-store";

export async function GET(request: NextRequest) {
  const barcode = request.nextUrl.searchParams.get("barcode");
  if (!barcode) return NextResponse.json(null);
  return NextResponse.json(getApprovedByBarcode(barcode));
}
