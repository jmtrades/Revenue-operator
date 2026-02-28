/**
 * Unresolved questions: deterministic extract, append-only persist, bounded reads.
 * No DELETE. No TRUNCATE.
 */

import { getDb } from "@/lib/db/queries";
import { appendLedgerEvent } from "@/lib/ops/ledger";
import type { QuestionType, QuestionSourceChannel } from "./question-taxonomy";
import { RESOLUTION_TYPES, type ResolutionType } from "./question-taxonomy";

const MAX_QUESTIONS_PER_EVENT = 3;
const OPEN_QUESTIONS_LIMIT = 10;
const QUESTION_TEXT_MAX = 160;

export interface ExtractedQuestion {
  question_type: QuestionType;
  question_text_short: string;
}

/** Deterministic short label for question type. No paraphrase. */
const SHORT_LABELS: Record<QuestionType, string> = {
  pricing: "Pricing",
  availability: "Availability",
  scheduling: "Scheduling",
  cancellation_terms: "Cancellation terms",
  refund: "Refund",
  proof: "Proof",
  identity: "Identity",
  compliance: "Compliance",
  payment_method: "Payment method",
  address: "Address",
  product_scope: "Product scope",
  contract: "Contract",
  escalation_request: "Escalation request",
  other: "Other",
};

/**
 * Extract questions from voice outcome structured payload. Keyword/flag only. Max 3.
 */
export function extractQuestionsFromVoiceOutcome(structured: {
  objection_key?: string | null;
  next_required_action?: string | null;
  notes_structured?: Record<string, unknown> | null;
}): ExtractedQuestion[] {
  const out: ExtractedQuestion[] = [];
  const obj = (structured.objection_key ?? "").toLowerCase();
  const next = (structured.next_required_action ?? "").toLowerCase();
  const notes = structured.notes_structured ?? {};
  const notesStr = JSON.stringify(notes).toLowerCase();

  if (obj.includes("pricing") || notesStr.includes("price") || notesStr.includes("cost")) {
    out.push({ question_type: "pricing", question_text_short: SHORT_LABELS.pricing.slice(0, QUESTION_TEXT_MAX) });
  }
  if (obj.includes("schedule") || notesStr.includes("availability") || notesStr.includes("when")) {
    out.push({ question_type: "scheduling", question_text_short: SHORT_LABELS.scheduling.slice(0, QUESTION_TEXT_MAX) });
  }
  if (obj.includes("refund") || notesStr.includes("refund")) {
    out.push({ question_type: "refund", question_text_short: SHORT_LABELS.refund.slice(0, QUESTION_TEXT_MAX) });
  }
  if (next.includes("disclosure") || notesStr.includes("compliance")) {
    out.push({ question_type: "compliance", question_text_short: SHORT_LABELS.compliance.slice(0, QUESTION_TEXT_MAX) });
  }
  if (out.length === 0) {
    out.push({ question_type: "other", question_text_short: "Other" });
  }
  return out.slice(0, MAX_QUESTIONS_PER_EVENT).map((q) => ({
    ...q,
    question_text_short: q.question_text_short.slice(0, QUESTION_TEXT_MAX),
  }));
}

/**
 * Extract questions from message metadata. Deterministic. Max 3.
 */
export function extractQuestionsFromMessageMetadata(meta: Record<string, unknown> | null): ExtractedQuestion[] {
  if (!meta || typeof meta !== "object") return [];
  const out: ExtractedQuestion[] = [];
  const str = JSON.stringify(meta).toLowerCase();
  if (str.includes("price") || str.includes("cost")) out.push({ question_type: "pricing", question_text_short: SHORT_LABELS.pricing.slice(0, QUESTION_TEXT_MAX) });
  if (str.includes("schedule") || str.includes("availability")) out.push({ question_type: "scheduling", question_text_short: SHORT_LABELS.scheduling.slice(0, QUESTION_TEXT_MAX) });
  if (str.includes("refund")) out.push({ question_type: "refund", question_text_short: SHORT_LABELS.refund.slice(0, QUESTION_TEXT_MAX) });
  if (out.length === 0 && Object.keys(meta).length > 0) out.push({ question_type: "other", question_text_short: "Other" });
  return out.slice(0, MAX_QUESTIONS_PER_EVENT);
}

/**
 * Insert unresolved question rows and append ledger. Append-only.
 */
export async function recordUnresolvedQuestions(
  workspaceId: string,
  threadId: string,
  channel: QuestionSourceChannel,
  questions: ExtractedQuestion[]
): Promise<{ ok: boolean }> {
  if (questions.length === 0) return { ok: true };
  const db = getDb();
  const now = new Date().toISOString();
  try {
    for (const q of questions) {
      await db.from("unresolved_questions").insert({
        workspace_id: workspaceId,
        thread_id: threadId.slice(0, 512),
        question_type: q.question_type,
        question_text_short: (q.question_text_short || SHORT_LABELS[q.question_type]).slice(0, QUESTION_TEXT_MAX),
        source_channel: channel,
      });
      await appendLedgerEvent({
        workspaceId,
        eventType: "unresolved_question_recorded",
        severity: "info",
        subjectType: "thread",
        subjectRef: threadId.slice(0, 160),
        details: { question_type: q.question_type },
      }).catch(() => {});
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/**
 * Resolve latest open question of given types. Bounded: select by type ORDER BY raised_at DESC LIMIT 1, then update.
 */
export async function resolveQuestions(
  workspaceId: string,
  threadId: string,
  resolutionType: ResolutionType,
  questionTypes: QuestionType[]
): Promise<{ ok: boolean }> {
  if (!RESOLUTION_TYPES.includes(resolutionType) || questionTypes.length === 0) return { ok: false };
  const db = getDb();
  const now = new Date().toISOString();
  const tid = threadId.slice(0, 512);
  try {
    for (const qt of questionTypes) {
      const { data: row } = await db
        .from("unresolved_questions")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("thread_id", tid)
        .eq("question_type", qt)
        .is("resolved_at", null)
        .order("raised_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const id = (row as { id?: string } | null)?.id;
      if (id) {
        await db.from("unresolved_questions").update({ resolved_at: now, resolution_type: resolutionType }).eq("id", id);
        await appendLedgerEvent({
          workspaceId,
          eventType: "unresolved_question_resolved",
          severity: "info",
          subjectType: "thread",
          subjectRef: threadId.slice(0, 160),
          details: { question_type: qt, resolution_type: resolutionType },
        }).catch(() => {});
      }
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/**
 * Get open questions for thread. Bounded: ORDER BY raised_at DESC LIMIT 10.
 */
export async function getOpenQuestions(
  workspaceId: string,
  threadId: string
): Promise<Array<{ question_type: string; question_text_short: string; raised_at: string }>> {
  const db = getDb();
  const { data } = await db
    .from("unresolved_questions")
    .select("question_type, question_text_short, raised_at")
    .eq("workspace_id", workspaceId)
    .eq("thread_id", threadId.slice(0, 512))
    .is("resolved_at", null)
    .order("raised_at", { ascending: false })
    .limit(OPEN_QUESTIONS_LIMIT);
  return (data ?? []) as Array<{ question_type: string; question_text_short: string; raised_at: string }>;
}
