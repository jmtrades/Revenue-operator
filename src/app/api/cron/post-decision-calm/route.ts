/**
 * Cron: 10 min after last handoff of day resolved, send "No further decisions today."
 * Run every 5 min (cron: 5 * * * *).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runPostDecisionCalm } from "@/lib/organizational-embedding";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const results = await runPostDecisionCalm();
  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
