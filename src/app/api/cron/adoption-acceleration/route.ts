/**
 * Cron: adoption acceleration. Every 15 minutes.
 * 1) transitionInstallationPhase for all workspaces with state rows.
 * 2) For counterparties with participation_state = reliant and outstanding_dependencies = true,
 *    insert protocol_event "environment_required".
 * 3) Rare-event detectors.
 * 4) When phase becomes activation_ready, generate and store snapshot (snapshot_generated_at).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { runSafeCron } from "@/lib/cron/run-safe";
import { getDb } from "@/lib/db/queries";
import { hasOutstandingDependenciesForWorkspace } from "@/lib/counterparty-participation";
import {
  getWorkspaceIdsWithInstallationState,
  transitionInstallationPhase,
  getInstallationState,
  generateInstallationSnapshot,
} from "@/lib/installation";
import { runRareEventDetectors } from "@/lib/adoption-acceleration/rare-event-detectors";
import { sendEnvironmentInviteWhenReliant } from "@/lib/shared-transaction-assurance";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("adoption-acceleration", async () => {
    const workspaceIds = await getWorkspaceIdsWithInstallationState();
    for (const workspaceId of workspaceIds) {
      const before = await getInstallationState(workspaceId);
      await transitionInstallationPhase(workspaceId).catch(() => {
      // cron/adoption-acceleration error (details omitted to protect PII) 
    });
      const after = await getInstallationState(workspaceId);
      if (before?.phase !== "activation_ready" && after?.phase === "activation_ready") {
        await generateInstallationSnapshot(workspaceId).catch(() => {
      // cron/adoption-acceleration error (details omitted to protect PII) 
    });
      }
    }

    const db = getDb();
    const { data: reliant } = await db
      .from("counterparty_participation")
      .select("workspace_id, counterparty_identifier")
      .eq("participation_state", "reliant");
    const rows = (reliant ?? []) as { workspace_id: string; counterparty_identifier: string }[];
    let inserted = 0;
    for (const row of rows) {
      const hasDeps = await hasOutstandingDependenciesForWorkspace(row.workspace_id);
      if (!hasDeps) continue;
      const externalRef = `env:${row.workspace_id}:${row.counterparty_identifier}`;
      await db.from("protocol_events").insert({
        external_ref: externalRef,
        workspace_id: row.workspace_id,
        event_type: "environment_required",
        payload: {},
      });
      inserted++;
      await sendEnvironmentInviteWhenReliant(row.workspace_id, row.counterparty_identifier).catch(() => {
      // cron/adoption-acceleration error (details omitted to protect PII) 
    });
    }

    await runRareEventDetectors().catch(() => {
      // cron/adoption-acceleration error (details omitted to protect PII) 
    });

    return { run: 1, environment_required_inserted: inserted };
  });

  return NextResponse.json({
    ok: result.ok,
    jobs_run: result.jobs_run,
    failures: result.failures,
    ...(result.error && { error: result.error }),
    ...(result.details && { details: result.details }),
  });
}
