/**
 * Cron: Saturday 10:00 local, upcoming bookings next week → "Next week is prepared."
 * Run every 15 min (cron: 15 * * * *).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runWeekendState } from "@/lib/negative-signal-semantics";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const results = await runWeekendState();
  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
