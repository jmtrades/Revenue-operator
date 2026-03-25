/**
 * Cron: Reality Reconciliation. Run every 15 minutes.
 * Detectors find gaps; emit canonical signals only; enqueue process_signal. No direct state mutation.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { runSafeCron } from "@/lib/cron/run-safe";
import { getWorkspacesForReconciliation, runReconciliationForWorkspaceSafe } from "@/lib/reconciliation/run";

const MAX_WORKSPACES = 25;

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("reconcile-reality", async () => {
    const workspaceIds = await getWorkspacesForReconciliation(MAX_WORKSPACES);
    let run = 0;
    const details: { workspace_id: string; emitted: number; errors: string[] }[] = [];
    const { getDb } = await import("@/lib/db/queries");
    const db = getDb();
    for (const workspaceId of workspaceIds) {
      const { emitted, errors } = await runReconciliationForWorkspaceSafe(workspaceId);
      run += emitted;
      try {
        await db
          .from("workspace_reconciliation_last_run")
          .upsert({ workspace_id: workspaceId, last_run_at: new Date().toISOString() }, { onConflict: "workspace_id" });
      } catch {
        // Table may not exist yet
      }
      if (emitted > 0 || errors.length > 0) {
        details.push({ workspace_id: workspaceId, emitted, errors });
      }
    }
    const failures = details.reduce((s, d) => s + d.errors.length, 0);
    return { run, failures, details };
  });

  return NextResponse.json({
    ok: result.ok,
    jobs_run: result.jobs_run,
    failures: result.failures,
    ...(result.error && { error: result.error }),
    ...(result.details && { details: result.details }),
  });
}
