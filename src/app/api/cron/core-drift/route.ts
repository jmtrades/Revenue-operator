/**
 * Cron: Core drift detection. Doctrine-safe conditions only.
 * Records incident "system_drift_detected" when required system action did not occur.
 * Dedupe: once per workspace per UTC day.
 * Bearer CRON_SECRET required.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { runSafeCron } from "@/lib/cron/run-safe";
import { getCronHeartbeats } from "@/lib/runtime/cron-heartbeat";
import { getUnprocessedInboxEvents } from "@/lib/connectors/install-pack/webhook-inbox";
import { getDb } from "@/lib/db/queries";
import { createIncidentStatement } from "@/lib/incidents";

const RECENT_MS = 30 * 60 * 1000; // 30 min for heartbeats
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("core-drift", async () => {
    const heartbeats = await getCronHeartbeats();
    const connectorInboxAt = heartbeats["connector-inbox"] ?? null;
    const handoffAt = heartbeats["handoff-notifications"] ?? null;
    const now = Date.now();
    const connectorRecent = connectorInboxAt && now - new Date(connectorInboxAt).getTime() <= RECENT_MS;
    const handoffRecent = handoffAt && now - new Date(handoffAt).getTime() <= RECENT_MS;

    const db = getDb();
    const since7 = new Date(now - SEVEN_DAYS_MS).toISOString();

    const pendingEvents = await getUnprocessedInboxEvents(200);
    const workspacesWithPendingInbox = [...new Set(pendingEvents.map((e) => e.workspace_id))];

    const { data: escRows } = await db.from("escalation_logs").select("id, workspace_id");
    const { data: ackRows } = await db.from("handoff_acknowledgements").select("escalation_id");
    const ackedSet = new Set((ackRows ?? []).map((r: { escalation_id: string }) => r.escalation_id));
    const unackedWorkspaces = [
      ...new Set(
        (escRows ?? []).filter((r: { id: string; workspace_id: string }) => !ackedSet.has(r.id)).map((r: { workspace_id: string }) => r.workspace_id)
      ),
    ];

    const { data: causalRows } = await db
      .from("causal_chains")
      .select("workspace_id")
      .gte("determined_at", since7);
    const workspacesWithCausal = [...new Set((causalRows ?? []).map((r: { workspace_id: string }) => r.workspace_id))];

    const { data: proofRows } = await db
      .from("proof_capsules")
      .select("workspace_id")
      .gte("period_end", since7.slice(0, 10));
    const workspacesWithProof = new Set((proofRows ?? []).map((r: { workspace_id: string }) => r.workspace_id));

    const driftWorkspaces = new Set<string>();
    if (!connectorRecent && workspacesWithPendingInbox.length > 0) {
      workspacesWithPendingInbox.forEach((w) => driftWorkspaces.add(w));
    }
    if (!handoffRecent && unackedWorkspaces.length > 0) {
      unackedWorkspaces.forEach((w) => driftWorkspaces.add(w));
    }
    for (const w of workspacesWithCausal) {
      if (!workspacesWithProof.has(w)) driftWorkspaces.add(w);
    }

    for (const workspaceId of driftWorkspaces) {
      try {
        await createIncidentStatement(workspaceId, "system_drift_detected");
      } catch {
        // dedupe or DB error; skip
      }
    }

    return { run: 1, drift_recorded: driftWorkspaces.size };
  });

  return NextResponse.json({
    ok: result.ok,
    jobs_run: result.jobs_run,
    failures: result.failures,
    ...(result.error && { error: result.error }),
    ...(result.details && { details: result.details }),
  });
}
