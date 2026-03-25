/**
 * Cron: 14 consecutive days no escalations + no interruption signals → "Operations have remained uninterrupted." Once per 60 days.
 * Run daily, e.g. 0 12 * * *
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runLongSilenceConfidence } from "@/lib/temporal-anchoring";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const results = await runLongSilenceConfidence();
  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
