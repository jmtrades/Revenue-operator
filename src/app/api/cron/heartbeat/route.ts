import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  return NextResponse.json({ ok: true, ts: Date.now() });
}

