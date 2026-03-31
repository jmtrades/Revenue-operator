/**
 * Cron: operational ritual cycles. Daily continuity, weekly closure, post-outcome stabilization.
 * Engines enforce timing. Run daily (e.g. 08:00) and weekly (e.g. Sunday).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { runSafeCron } from "@/lib/cron/run-safe";
import { runDailyContinuityCycle, runWeeklyClosureCycle } from "@/lib/ritual-cycles";
import { getDb } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("ritual-cycles", async () => {
    const db = getDb();
    const { data: workspaces } = await db.from("workspace_installation_state").select("workspace_id");
    const ids = (workspaces ?? []).map((r: { workspace_id: string }) => r.workspace_id);
    const now = new Date();
    const isSunday = now.getUTCDay() === 0;

    for (const workspaceId of ids) {
      await runDailyContinuityCycle(workspaceId).catch(() => {
      // cron/ritual-cycles error (details omitted to protect PII) 
    });
      if (isSunday) await runWeeklyClosureCycle(workspaceId).catch(() => {
      // cron/ritual-cycles error (details omitted to protect PII) 
    });
    }
    return { run: 1 };
  });

  return NextResponse.json({
    ok: result.ok,
    jobs_run: result.jobs_run,
    failures: result.failures,
    ...(result.error && { error: result.error }),
    ...(result.details && { details: result.details }),
  });
}
