/**
 * Cron: refresh Zoom tokens that expire within 1 hour.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { refreshAllZoomTokensNearExpiry } from "@/lib/zoom/refresh-token";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;
  const refreshed = await refreshAllZoomTokensNearExpiry();
  return NextResponse.json({ ok: true, refreshed });
}
