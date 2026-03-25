/**
 * Cron: after business hours, if conversations active, send "Everything else will continue."
 * Run hourly, e.g. 0 * * * *
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runAfterHoursStability } from "@/lib/organizational-embedding";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const results = await runAfterHoursStability();
  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
