/**
 * Cron: refresh Zoom tokens that expire within 1 hour.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { refreshAllZoomTokensNearExpiry } from "@/lib/zoom/refresh-token";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const refreshed = await refreshAllZoomTokensNearExpiry();
  return NextResponse.json({ ok: true, refreshed });
}
