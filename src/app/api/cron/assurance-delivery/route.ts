/**
 * Cron: assurance delivery. Hourly. One line from today proof capsule to owner when due.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { runSafeCron } from "@/lib/cron/run-safe";
import { getDb } from "@/lib/db/queries";
import { deliverDailyAssuranceIfDue } from "@/lib/assurance-delivery";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("assurance-delivery", async () => {
    const db = getDb();
    const { data: rows } = await db.from("workspaces").select("id");
    const ids = (rows ?? []).map((r: { id: string }) => r.id);
    let sent = 0;
    for (const workspaceId of ids) {
      const ok = await deliverDailyAssuranceIfDue(workspaceId).catch(() => false);
      if (ok) sent++;
    }
    const { recordCronHeartbeat } = await import("@/lib/runtime/cron-heartbeat");
    await recordCronHeartbeat("assurance-delivery").catch((err) => { console.error("[cron/assurance-delivery] error:", err instanceof Error ? err.message : err); });
    return { run: 1, sent, workspaces: ids.length };
  });

  return NextResponse.json({
    ok: result.ok,
    jobs_run: result.jobs_run,
    failures: result.failures,
    ...(result.error && { error: result.error }),
    ...(result.details && { details: result.details }),
  });
}
