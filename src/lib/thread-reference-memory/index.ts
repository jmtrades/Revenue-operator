/**
 * Thread reference memory: operational continuation without user choice.
 * Observes new activity and attaches it to existing threads when deterministically justified.
 * No user controls. No configuration. Only consequence surfaces.
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import { recordReciprocalEvent } from "@/lib/reciprocal-events";
import { recordOutcomeDependency } from "@/lib/outcome-dependencies";

export type ReferenceContextType =
  | "conversation"
  | "commitment"
  | "payment_obligation"
  | "lead"
  | "shared_transaction";

export type ReferenceReason =
  | "same_subject"
  | "followup_commitment"
  | "payment_settlement"
  | "conversation_continuation"
  | "dispute_revival";

export interface ReferenceContext {
  workspaceId: string;
  referenceContextType: ReferenceContextType;
  referenceContextId: string;
  /** For same_subject / followup_commitment / payment_settlement. */
  subjectType?: string | null;
  subjectId?: string | null;
  /** For conversation_continuation / same_subject (lead). */
  conversationId?: string | null;
  leadId?: string | null;
  /** For followup_commitment: commitment created_at. */
  createdAt?: string | null;
  /** For shared_transaction / dispute_revival. */
  threadId?: string | null;
  acknowledgedAt?: string | null;
  state?: string | null;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Doctrine-safe statement when thread has references. ≤90 chars. */
export const STATEMENT_LATER_ACTIVITY_REFERENCED = "A later activity referenced this record.";

/** Presence: ≥2 references across days. ≤90 chars. */
export const STATEMENT_RECORD_CONTINUED_ACROSS_OCCASIONS =
  "This record continued across separate occasions.";

type ThreadRow = {
  id: string;
  subject_type: string;
  subject_id: string;
  lead_id: string | null;
  conversation_id: string | null;
  acknowledged_at: string | null;
  state: string;
};

/** Already attached for this context? */
async function alreadyAttached(
  workspaceId: string,
  referenceContextType: string,
  referenceContextId: string
): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("thread_reference_memory")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("reference_context_type", referenceContextType)
    .eq("reference_context_id", referenceContextId)
    .maybeSingle();
  return !!data;
}

/** Insert one reference and return threadId if inserted. */
async function attachReference(
  workspaceId: string,
  threadId: string,
  referenceContextType: ReferenceContextType,
  referenceContextId: string,
  referenceReason: ReferenceReason
): Promise<boolean> {
  const db = getDb();
  const { error } = await db.from("thread_reference_memory").insert({
    workspace_id: workspaceId,
    thread_id: threadId,
    reference_context_type: referenceContextType,
    reference_context_id: referenceContextId,
    reference_reason: referenceReason,
  });
  return !error;
}

/** Load threads in workspace with subject and linkage. */
async function getThreadsForWorkspace(workspaceId: string): Promise<ThreadRow[]> {
  const db = getDb();
  const { data } = await db
    .from("shared_transactions")
    .select("id, subject_type, subject_id, lead_id, conversation_id, acknowledged_at, state")
    .eq("workspace_id", workspaceId);
  return (data ?? []) as ThreadRow[];
}

function subjectMatch(
  t: ThreadRow,
  subjectType: string | undefined | null,
  subjectId: string | undefined | null
): boolean {
  if (subjectType == null || subjectId == null) return false;
  return t.subject_type === subjectType && String(t.subject_id) === String(subjectId);
}

/**
 * Deterministically find a thread that matches the context and attach the reference.
 * Records only once per (workspace_id, reference_context_type, reference_context_id).
 * On attach: records reciprocal_event reference_attached, outcome_dependency external_reporting.
 */
export async function detectAndAttachReference(context: ReferenceContext): Promise<void> {
  const {
    workspaceId,
    referenceContextType,
    referenceContextId,
    subjectType,
    subjectId,
    conversationId,
    leadId,
    createdAt,
    threadId: contextThreadId,
    acknowledgedAt: _acknowledgedAt,
    state,
  } = context;

  if (await alreadyAttached(workspaceId, referenceContextType, referenceContextId)) return;

  const threads = await getThreadsForWorkspace(workspaceId);
  if (!threads.length) return;

  let chosen: { threadId: string; reason: ReferenceReason } | null = null;

  if (referenceContextType === "conversation" && conversationId) {
    const withConv = threads.find((t) => t.conversation_id === conversationId && t.acknowledged_at);
    if (withConv) chosen = { threadId: withConv.id, reason: "conversation_continuation" };
  }

  const excludeSelf = referenceContextType === "shared_transaction" && contextThreadId;

  if (!chosen && (subjectType != null && subjectId != null)) {
    const sameSubject = threads.find(
      (t) => subjectMatch(t, subjectType, subjectId) && (!excludeSelf || t.id !== referenceContextId)
    );
    if (sameSubject) {
      if (referenceContextType === "commitment" && createdAt) {
        const threadAck = sameSubject.acknowledged_at
          ? new Date(sameSubject.acknowledged_at).getTime()
          : null;
        const commitTime = new Date(createdAt).getTime();
        if (threadAck != null && Math.abs(commitTime - threadAck) <= THIRTY_DAYS_MS) {
          chosen = { threadId: sameSubject.id, reason: "followup_commitment" };
        }
      }
      if (!chosen) chosen = { threadId: sameSubject.id, reason: "same_subject" };
    }
  }

  if (!chosen && referenceContextType === "payment_obligation" && subjectType != null && subjectId != null) {
    const sameSubject = threads.find((t) => subjectMatch(t, subjectType, subjectId));
    if (sameSubject) chosen = { threadId: sameSubject.id, reason: "payment_settlement" };
  }

  if (!chosen && leadId) {
    const withLead = threads.find((t) => t.lead_id === leadId);
    if (withLead) chosen = { threadId: withLead.id, reason: "same_subject" };
  }

  if (!chosen && referenceContextType === "shared_transaction" && contextThreadId && state === "disputed") {
    const thread = threads.find((t) => t.id === contextThreadId && t.acknowledged_at);
    if (thread) chosen = { threadId: thread.id, reason: "dispute_revival" };
  }

  if (!chosen) return;

  const inserted = await attachReference(
    workspaceId,
    chosen.threadId,
    referenceContextType,
    referenceContextId,
    chosen.reason
  );
  if (!inserted) return;

  const eventId = await recordReciprocalEvent({
    threadId: chosen.threadId,
    actorRole: "observer",
    operationalAction: "reference_attached",
  }).catch(() => null);

  if (eventId) {
    await recordOutcomeDependency({
      workspaceId,
      sourceThreadId: chosen.threadId,
      dependentContextType:
        referenceContextType === "shared_transaction" ? "shared_transaction" : referenceContextType,
      dependentContextId: referenceContextId,
      dependencyType: "external_reporting",
    }).catch((e) => {
      log("error", "recordOutcomeDependency failed", { error: e instanceof Error ? e.message : String(e) });
    });
    if (referenceContextType === "shared_transaction" && referenceContextId) {
      const { detectAndRecordOffPlatformReference } = await import("@/lib/third-party-reliance/off-platform-reference");
      await detectAndRecordOffPlatformReference(workspaceId, referenceContextId, chosen.threadId).catch((e) => {
        log("error", "detectAndRecordOffPlatformReference failed", { error: e instanceof Error ? e.message : String(e) });
      });
    }
  }
}

/** True if thread has at least one reference. */
export async function threadHasReference(threadId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("thread_reference_memory")
    .select("id")
    .eq("thread_id", threadId)
    .limit(1)
    .maybeSingle();
  return !!data;
}

/** Count distinct days with references for a thread (for presence). */
export async function countReferenceDays(threadId: string): Promise<number> {
  const db = getDb();
  const { data } = await db
    .from("thread_reference_memory")
    .select("recorded_at")
    .eq("thread_id", threadId);
  if (!data || !Array.isArray(data)) return 0;
  const days = new Set(
    (data as { recorded_at: string }[]).map((r) =>
      new Date(r.recorded_at).toISOString().slice(0, 10)
    )
  );
  return days.size;
}

/** True if workspace has any thread with ≥2 reference days (for presence line). */
export async function workspaceHasMultiDayReferences(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { data: threads } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", workspaceId);
  if (!threads?.length) return false;
  for (const t of threads as { id: string }[]) {
    const n = await countReferenceDays(t.id);
    if (n >= 2) return true;
  }
  return false;
}
