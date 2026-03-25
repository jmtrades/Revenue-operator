export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifyWrapupToken } from "@/lib/calls/wrapup-token";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false, reason: "missing" });
  const result = await verifyWrapupToken(token);
  if (result.valid) return NextResponse.json({ valid: true });
  return NextResponse.json({ valid: false, reason: result.reason });
}
