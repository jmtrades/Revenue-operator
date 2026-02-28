/**
 * Conversation state snapshot builder. Append-only. Bounded retrieval only. No DELETE.
 */

import { getDb } from "@/lib/db/queries";
import { appendLedgerEvent } from "@/lib/ops/ledger";
import type { ConversationStage } from "./conversation-stage";

const RETRIEVAL_LIMIT = 1;

export interface BuildConversationSnapshotInput {
  workspaceId: string;
  threadId: string;
  stage: ConversationStage | string;
  objectionStage?: string | null;
  complianceStage?: string | null;
  decisionConfidence?: number | null;
  goodwillScore?: number | null;
  frictionScore?: number | null;
  driftScore?: number | null;
  contradictionScore?: number | null;
  /** May include open_questions_count, last_question_types (max 5), objection_lifecycle_stage, attempt_number, recommended_variant */
  snapshotJson?: Record<string, unknown>;
}

/**
 * Persist one snapshot row and append ledger. Append-only.
 */
export async function buildConversationSnapshot(input: BuildConversationSnapshotInput): Promise<{ ok: boolean; id?: string }> {
  const db = getDb();
  try {
    const { data } = await db
      .from("conversation_state_snapshots")
      .insert({
        workspace_id: input.workspaceId,
        thread_id: input.threadId.slice(0, 512),
        stage: input.stage,
        objection_stage: input.objectionStage ?? null,
        compliance_stage: input.complianceStage ?? null,
        decision_confidence: input.decisionConfidence ?? null,
        goodwill_score: input.goodwillScore ?? null,
        friction_score: input.frictionScore ?? null,
        drift_score: input.driftScore ?? null,
        contradiction_score: input.contradictionScore ?? null,
        snapshot_json: input.snapshotJson ?? {},
      })
      .select("id")
      .single();
    const id = (data as { id?: string } | null)?.id;
    if (id) {
      await appendLedgerEvent({
        workspaceId: input.workspaceId,
        eventType: "conversation_snapshot_recorded",
        severity: "info",
        subjectType: "thread",
        subjectRef: input.threadId.slice(0, 160),
        details: { stage: input.stage, snapshot_id: id },
      }).catch(() => {});
    }
    return { ok: true, id };
  } catch {
    return { ok: false };
  }
}

/**
 * Get previous snapshot for thread. Bounded: ORDER BY recorded_at DESC LIMIT 1.
 */
export async function getPreviousSnapshot(
  workspaceId: string,
  threadId: string
): Promise<{
  stage: string | null;
  goodwill_score: number | null;
  drift_score: number | null;
  contradiction_score: number | null;
  snapshot_json: Record<string, unknown> | null;
  recorded_at: string | null;
} | null> {
  const db = getDb();
  const { data } = await db
    .from("conversation_state_snapshots")
    .select("stage, goodwill_score, drift_score, contradiction_score, snapshot_json, recorded_at")
    .eq("workspace_id", workspaceId)
    .eq("thread_id", threadId.slice(0, 512))
    .order("recorded_at", { ascending: false })
    .limit(RETRIEVAL_LIMIT)
    .maybeSingle();
  return data as typeof data & { snapshot_json?: Record<string, unknown>; recorded_at?: string | null } | null;
}
