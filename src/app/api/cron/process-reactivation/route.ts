/**
 * Cron: Process reactivation attempts for leads in REACTIVATE, CONTACTED, ENGAGED states.
 * Runs on a schedule to check for leads due for reactivation outreach.
 * Triggers the reactivation engine to schedule next attempt with appropriate angle.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { scheduleReactivationAttempts } from "@/lib/reactivation/engine";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const start = Date.now();

  try {
    const scheduled = await scheduleReactivationAttempts();

    return NextResponse.json({
      ok: true,
      message: `Reactivation scheduling completed. Scheduled ${scheduled} leads for reactivation attempts.`,
      scheduled,
      duration_ms: Date.now() - start,
    });
  } catch (error) {
    console.error("[Cron] Reactivation processing failed:", error);
    return NextResponse.json(
      {
        error: "Reactivation processing failed",
        details: error instanceof Error ? error.message : String(error),
        duration_ms: Date.now() - start,
      },
      { status: 500 }
    );
  }
}
