/**
 * Institutional state: deterministic from operational_position and evidence.
 * none -> embedded -> reliant -> assumed -> institutional. Idempotent.
 */

import { getDb } from "@/lib/db/queries";
import { getContinuityDuration } from "@/lib/operational-timeline-memory";
import { getMemoryRoleStatements } from "@/lib/memory-replacement";
import { getExternalRecognition } from "@/lib/environment-recognition";
import {
  outcomesDependOnProcess,
  processPreventsContinuation,
  coordinationExternalized,
} from "@/lib/operational-perception/dependence-recognition";
import { hasCounterpartyConfirmationDisplacementInLastDays } from "@/lib/coordination-displacement";
import { hasReferenceAcrossDays } from "@/lib/record-reference";
import { authorityExternalized } from "@/lib/responsibility-moments";
import { log } from "@/lib/logger";

export type InstitutionalState = "none" | "embedded" | "reliant" | "assumed" | "institutional";

const logInstitutionalStateSideEffect = (ctx: string) => (e: unknown) => {
  log("warn", `institutional-state.${ctx}`, {
    error: e instanceof Error ? e.message : String(e),
  });
};

const DAYS = 7;

export async function getInstitutionalState(workspaceId: string): Promise<InstitutionalState> {
  const db = getDb();
  const { data } = await db
    .from("workspace_orientation_state")
    .select("institutional_state")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const v = (data as { institutional_state?: string } | null)?.institutional_state;
  return (v === "embedded" || v === "reliant" || v === "assumed" || v === "institutional" ? v : "none") as InstitutionalState;
}

export async function recomputeInstitutionalState(workspaceId: string): Promise<InstitutionalState> {
  const db = getDb();
  const [continuityDuration, memoryRoleStatements, externalRecognition, outcomesDepend, continuationPrevented, coordinationExt, currentRow] =
    await Promise.all([
      getContinuityDuration(workspaceId),
      getMemoryRoleStatements(workspaceId),
      getExternalRecognition(workspaceId),
      outcomesDependOnProcess(workspaceId),
      processPreventsContinuation(workspaceId),
      coordinationExternalized(workspaceId),
      db
        .from("workspace_orientation_state")
        .select("institutional_state, assumed_orientation_recorded_at, institutional_orientation_recorded_at")
        .eq("workspace_id", workspaceId)
        .maybeSingle(),
    ]);

  const operationally_embedded =
    continuityDuration.operations_have_been_continuous &&
    memoryRoleStatements.length > 0 &&
    externalRecognition.recognized_as_shared_process;
  const structurally_dependent =
    operationally_embedded && outcomesDepend && continuationPrevented && coordinationExt;

  let next: InstitutionalState = "none";
  if (operationally_embedded) next = "embedded";
  if (structurally_dependent) next = "reliant";
  if (
    structurally_dependent &&
    coordinationExt &&
    (await hasCounterpartyConfirmationDisplacementInLastDays(workspaceId, DAYS)) &&
    (await hasReferenceAcrossDays(workspaceId, DAYS))
  ) {
    next = "assumed";
  }
  if (structurally_dependent && coordinationExt && (await authorityExternalized(workspaceId))) {
    next = "institutional";
  }

  const existing = (currentRow as {
    institutional_state?: string;
    assumed_orientation_recorded_at?: string | null;
    institutional_orientation_recorded_at?: string | null;
  } | null) ?? {};
  const prevState = (existing.institutional_state as InstitutionalState) ?? "none";

  if (next !== prevState || !existing.institutional_state) {
    const { data: upsertRow } = await db
      .from("workspace_orientation_state")
      .select("workspace_id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (upsertRow) {
      await db
        .from("workspace_orientation_state")
        .update({ institutional_state: next })
        .eq("workspace_id", workspaceId);
    } else {
      await db.from("workspace_orientation_state").insert({
        workspace_id: workspaceId,
        institutional_state: next,
      });
    }
  }

  if (next === "assumed" && prevState !== "assumed" && !existing.assumed_orientation_recorded_at) {
    const { recordOrientationStatement } = await import("@/lib/orientation/records");
    await recordOrientationStatement(workspaceId, "The operating standard became assumed.").catch(logInstitutionalStateSideEffect("record-assumed"));
    const now = new Date().toISOString();
    await db
      .from("workspace_orientation_state")
      .update({ assumed_orientation_recorded_at: now })
      .eq("workspace_id", workspaceId);
  }

  if (next === "institutional" && prevState !== "institutional" && !existing.institutional_orientation_recorded_at) {
    const { recordOrientationStatement } = await import("@/lib/orientation/records");
    await recordOrientationStatement(workspaceId, "The operating responsibility transferred to the process.").catch(logInstitutionalStateSideEffect("record-institutional"));
    const now = new Date().toISOString();
    await db
      .from("workspace_orientation_state")
      .update({ institutional_orientation_recorded_at: now })
      .eq("workspace_id", workspaceId);
  }

  return next;
}
