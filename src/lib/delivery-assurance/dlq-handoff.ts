/**
 * On permanent failure: store in failed_jobs and create human handoff (escalation).
 */

import { getDb } from "@/lib/db/queries";
import { logEscalation, getAssignedUserId } from "@/lib/escalation";
import type { EscalationTrigger } from "@/lib/escalation";

export type FailureStage = "signal" | "state" | "decision" | "action";

export async function toFailedJobAndEscalate(params: {
  workspaceId: string;
  leadId: string | null;
  jobType: string;
  payload: Record<string, unknown>;
  errorMessage: string;
  stage: FailureStage;
  attemptCount?: number;
}): Promise<void> {
  const db = getDb();
  const {
    workspaceId,
    leadId,
    jobType,
    payload,
    errorMessage,
    stage,
    attemptCount = 1,
  } = params;

  await db.from("failed_jobs").insert({
    workspace_id: workspaceId,
    lead_id: leadId,
    job_type: jobType,
    payload,
    error_message: errorMessage,
    stage,
    attempt_count: attemptCount,
  });

  if (!leadId) return;
  const assignedUserId = await getAssignedUserId(workspaceId, leadId);
  const holdUntil = new Date();
  holdUntil.setHours(holdUntil.getHours() + 24);
  await logEscalation(
    workspaceId,
    leadId,
    "delivery_failed" as EscalationTrigger,
    "dlq_handoff",
    `Delivery failed after ${attemptCount} attempt(s). ${errorMessage}`,
    assignedUserId ?? undefined,
    holdUntil
  );
}
