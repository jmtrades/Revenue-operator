/**
 * Cron: negative signal — if no morning-state email by 11:30 local, zero handoffs since midnight → "No decisions waiting."
 * Run every 15 min (cron: 15 * * * *).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runMorningAbsence } from "@/lib/negative-signal-semantics";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const results = await runMorningAbsence();
  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
