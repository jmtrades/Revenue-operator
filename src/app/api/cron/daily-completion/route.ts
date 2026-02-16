/**
 * Cron: at business close + 30 min, no unresolved handoffs → "Everything concluded for today."
 * Run every 15 min (cron: 15 * * * *).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runDailyCompletionConfirmation } from "@/lib/negative-signal-semantics";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const results = await runDailyCompletionConfirmation();
  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
