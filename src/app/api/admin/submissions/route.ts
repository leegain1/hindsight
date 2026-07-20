import { NextRequest, NextResponse } from "next/server";
import { getAllSubmissions, resolveSubmission, getAllApproved } from "@/lib/product-store";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "hindsight-admin";

function auth(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${ADMIN_PASSWORD}`;
}

export async function GET(request: NextRequest) {
  if (!auth(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  return NextResponse.json({
    submissions: getAllSubmissions().reverse(),
    approved: getAllApproved(),
  });
}

export async function PATCH(request: NextRequest) {
  if (!auth(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id, status } = await request.json();
  if (!id || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const updated = resolveSubmission(id, status);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ ok: true, submission: updated });
}
