/**
 * Cron: Assumption engine. Runs every 30 minutes. Bounded scan for derived assumptions.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { runSafeCron } from "@/lib/cron/run-safe";
import { getDb } from "@/lib/db/queries";
import { recordOperationalAssumption } from "@/lib/assumption-engine";
import { log } from "@/lib/logger";

const SCAN_MINUTES = 30;
const MAX_WORKSPACES = 200;
const MAX_COMMITMENTS_PER_WORKSPACE = 50;

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("assumption-engine", async () => {
    const db = getDb();
    const { data: workspaceRows } = await db.from("workspaces").select("id");
    const workspaceIds = (workspaceRows ?? []).slice(0, MAX_WORKSPACES).map((r: { id: string }) => r.id);
    let run = 0;
    const since = new Date(Date.now() - SCAN_MINUTES * 60 * 1000).toISOString();

    for (const workspaceId of workspaceIds) {
      const { data: recent } = await db
        .from("commitments")
        .select("id, subject_type, subject_id, created_at")
        .eq("workspace_id", workspaceId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(MAX_COMMITMENTS_PER_WORKSPACE);

      for (const c of recent ?? []) {
        const row = c as { id: string; subject_type: string; subject_id: string };
        const { data: awaiting } = await db
          .from("commitments")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("subject_type", row.subject_type)
          .eq("subject_id", row.subject_id)
          .in("state", ["overdue", "recovery_required", "awaiting_response"])
          .neq("id", row.id)
          .limit(1);
        if ((awaiting?.length ?? 0) > 0) {
          await recordOperationalAssumption(workspaceId, "dependency_action_taken", `commitment:${row.id}`).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
          run++;
        }
      }
    }

    const { recordCronHeartbeat } = await import("@/lib/runtime/cron-heartbeat");
    await recordCronHeartbeat("assumption-engine").catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
    return { run, workspaces: workspaceIds.length };
  });

  return NextResponse.json({
    ok: result.ok,
    jobs_run: result.jobs_run,
    failures: result.failures,
    ...(result.error && { error: result.error }),
    ...(result.details && { details: result.details }),
  });
}
