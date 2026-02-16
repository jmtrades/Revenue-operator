/**
 * Operational realization events: first-time adoption milestones.
 * When a trigger condition is first met, insert one event and one orientation statement.
 */

import { getDb } from "@/lib/db/queries";
import { providerDetachmentEstablished } from "@/lib/detachment";
import { normalizationEstablished } from "@/lib/normalization-engine";
import { recordOrientationStatement } from "@/lib/orientation/records";

export type RealizationType =
  | "first_prevented_failure"
  | "first_continuation_stopped"
  | "first_external_acknowledgement"
  | "first_detachment_detected"
  | "first_normalized_operation";

const ORIENTATION_STATEMENT: Record<RealizationType, string> = {
  first_prevented_failure: "An outcome occurred only after intervention.",
  first_continuation_stopped: "An issue did not continue.",
  first_external_acknowledgement: "External coordination used the record.",
  first_detachment_detected: "Operation proceeded without supervision.",
  first_normalized_operation: "Work occurred without verification.",
};

async function hasRecorded(workspaceId: string, realizationType: RealizationType): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("operational_realization_events")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("realization_type", realizationType)
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function recordRealization(
  workspaceId: string,
  realizationType: RealizationType
): Promise<void> {
  const db = getDb();
  await db.from("operational_realization_events").insert({
    workspace_id: workspaceId,
    realization_type: realizationType,
    recorded_at: new Date().toISOString(),
  });
  await recordOrientationStatement(workspaceId, ORIENTATION_STATEMENT[realizationType]).catch(
    () => {}
  );
}

/**
 * Detect first-time realizations and record event + orientation statement.
 * Idempotent per workspace per type. No-op if operational_realization_events table is missing.
 */
export async function detectOperationalRealizations(workspaceId: string): Promise<void> {
  try {
    const db = getDb();
    if (!(await hasRecorded(workspaceId, "first_prevented_failure"))) {
      const { data: exp } = await db
        .from("operational_exposures")
        .select("id")
        .eq("workspace_id", workspaceId)
        .not("exposure_resolved_at", "is", null)
        .eq("interrupted_by_process", true)
        .limit(1)
        .maybeSingle();
      if (exp) {
        await recordRealization(workspaceId, "first_prevented_failure").catch(() => {});
      }
    }

    if (!(await hasRecorded(workspaceId, "first_continuation_stopped"))) {
      const { data: cont } = await db
        .from("continuation_exposures")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("intervention_stopped_it", true)
        .limit(1)
        .maybeSingle();
      if (cont) {
        await recordRealization(workspaceId, "first_continuation_stopped").catch(() => {});
      }
    }

    if (!(await hasRecorded(workspaceId, "first_external_acknowledgement"))) {
      const { data: ack } = await db
        .from("shared_transactions")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("state", "acknowledged")
        .limit(1)
        .maybeSingle();
      if (ack) {
        await recordRealization(workspaceId, "first_external_acknowledgement").catch(() => {});
      }
    }

    if (!(await hasRecorded(workspaceId, "first_detachment_detected"))) {
      if (await providerDetachmentEstablished(workspaceId)) {
        await recordRealization(workspaceId, "first_detachment_detected").catch(() => {});
      }
    }

    if (!(await hasRecorded(workspaceId, "first_normalized_operation"))) {
      if (await normalizationEstablished(workspaceId)) {
        await recordRealization(workspaceId, "first_normalized_operation").catch(() => {});
      }
    }
  } catch {
    // Table may not exist yet (migration not applied). Non-blocking.
  }
}
