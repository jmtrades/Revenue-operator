/**
 * Cron: System Integrity Audit. Run daily across workspaces.
 * Verifies operator guarantees; no UI, no config, no metrics.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runSafeCron } from "@/lib/cron/run-safe";
import { runIntegrityAudit } from "@/lib/integrity/run-integrity-audit";
import { getDb } from "@/lib/db/queries";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

const MAX_WORKSPACES = 50;

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("integrity-audit", async () => {
    const db = getDb();
    const { data: rows } = await db
      .from("workspaces")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(MAX_WORKSPACES);
    const workspaceIds = (rows ?? []).map((r: { id: string }) => r.id);

    let run = 0;
    let failures = 0;
    const details: { workspace_id: string; result: string; violation_count: number }[] = [];

    for (const workspaceId of workspaceIds) {
      try {
        const audit = await runIntegrityAudit(workspaceId);
        run++;
        details.push({
          workspace_id: workspaceId,
          result: audit.result,
          violation_count: audit.violationCount,
        });
        if (audit.violationCount > 0) failures++;
      } catch (_err) {
        failures++;
        details.push({
          workspace_id: workspaceId,
          result: "error",
          violation_count: -1,
        });
      }
    }

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
