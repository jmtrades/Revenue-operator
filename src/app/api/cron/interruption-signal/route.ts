/**
 * Cron: system health fails or queues stall >10 min → "Handling may be interrupted." Once per incident.
 * Run every 5 min (cron: 5 * * * *).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runInterruptionSignal } from "@/lib/negative-signal-semantics";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const results = await runInterruptionSignal();
  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
