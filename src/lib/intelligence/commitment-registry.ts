/**
 * Commitment Registry — human memory layer. Append-only; status transitions via UPDATE.
 * No DELETE. No TRUNCATE. Bounded queries only.
 */

import { getDb } from "@/lib/db/queries";
import { appendLedgerEvent } from "@/lib/ops/ledger";

export type CommitmentType =
  | "call_back"
  | "payment"
  | "document_send"
  | "appointment"
  | "info_send"
  | "other";

export type CommitmentStatus = "open" | "fulfilled" | "broken" | "escalated";

const OPEN_LIMIT = 20;
const BROKEN_COUNT_LIMIT = 100;

export interface RecordCommitmentInput {
  workspaceId: string;
  threadId: string;
  commitmentType: CommitmentType;
  promisedAt?: string;
  promisedFor?: string | null;
}

export interface CommitmentRow {
  commitment_id: string;
  workspace_id: string;
  thread_id: string;
  commitment_type: string;
  promised_at: string;
  promised_for: string | null;
  fulfilled_at: string | null;
  broken_at: string | null;
  escalated_at: string | null;
  status: string;
  created_at: string;
}

/**
 * Record a new commitment. Insert only.
 */
export async function recordCommitment(input: RecordCommitmentInput): Promise<{ ok: boolean; commitmentId?: string }> {
  const db = getDb();
  const now = (input.promisedAt ?? new Date().toISOString()).slice(0, 32);
  try {
    const { data } = await db
      .from("commitment_registry")
      .insert({
        workspace_id: input.workspaceId,
        thread_id: input.threadId.slice(0, 512),
        commitment_type: input.commitmentType,
        promised_at: now,
        promised_for: input.promisedFor ?? null,
        status: "open",
      })
      .select("commitment_id")
      .maybeSingle();
    const id = (data as { commitment_id?: string } | null)?.commitment_id;
    if (id) {
      await appendLedgerEvent({
        workspaceId: input.workspaceId,
        eventType: "commitment_recorded",
        severity: "info",
        subjectType: "thread",
        subjectRef: input.threadId.slice(0, 160),
        details: { commitment_id: id, commitment_type: input.commitmentType },
      }).catch(() => {});
    }
    return { ok: true, commitmentId: id ?? undefined };
  } catch {
    return { ok: false };
  }
}

/**
 * Mark commitment fulfilled. UPDATE only (fulfilled_at, status).
 */
export async function markCommitmentFulfilled(
  workspaceId: string,
  commitmentId: string
): Promise<{ ok: boolean }> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: row } = await db
    .from("commitment_registry")
    .select("thread_id, status")
    .eq("commitment_id", commitmentId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!row || (row as { status: string }).status !== "open") return { ok: false };
  const { error } = await db
    .from("commitment_registry")
    .update({ fulfilled_at: now, status: "fulfilled" })
    .eq("commitment_id", commitmentId)
    .eq("workspace_id", workspaceId);
  if (error) return { ok: false };
  await appendLedgerEvent({
    workspaceId,
    eventType: "commitment_fulfilled",
    severity: "info",
    subjectType: "thread",
    subjectRef: (row as { thread_id: string }).thread_id?.slice(0, 160) ?? workspaceId,
    details: { commitment_id: commitmentId },
  }).catch(() => {});
  return { ok: true };
}

/**
 * Mark commitment broken. UPDATE only (broken_at, status).
 */
export async function markCommitmentBroken(
  workspaceId: string,
  commitmentId: string
): Promise<{ ok: boolean }> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: row } = await db
    .from("commitment_registry")
    .select("thread_id, status")
    .eq("commitment_id", commitmentId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!row || (row as { status: string }).status !== "open") return { ok: false };
  const { error } = await db
    .from("commitment_registry")
    .update({ broken_at: now, status: "broken" })
    .eq("commitment_id", commitmentId)
    .eq("workspace_id", workspaceId);
  if (error) return { ok: false };
  await appendLedgerEvent({
    workspaceId,
    eventType: "commitment_broken",
    severity: "notice",
    subjectType: "thread",
    subjectRef: (row as { thread_id: string }).thread_id?.slice(0, 160) ?? workspaceId,
    details: { commitment_id: commitmentId },
  }).catch(() => {});
  return { ok: true };
}

/**
 * Get open commitments for thread. Bounded: LIMIT 20.
 */
export async function getOpenCommitments(
  workspaceId: string,
  threadId: string
): Promise<CommitmentRow[]> {
  const db = getDb();
  const { data } = await db
    .from("commitment_registry")
    .select("commitment_id, workspace_id, thread_id, commitment_type, promised_at, promised_for, fulfilled_at, broken_at, escalated_at, status, created_at")
    .eq("workspace_id", workspaceId)
    .eq("thread_id", threadId.slice(0, 512))
    .eq("status", "open")
    .order("promised_at", { ascending: false })
    .limit(OPEN_LIMIT);
  return (data ?? []) as CommitmentRow[];
}

/**
 * Get broken commitments count for thread. Bounded: COUNT with LIMIT 100.
 */
export async function getBrokenCommitmentsCount(
  workspaceId: string,
  threadId: string
): Promise<number> {
  const db = getDb();
  const { data } = await db
    .from("commitment_registry")
    .select("commitment_id")
    .eq("workspace_id", workspaceId)
    .eq("thread_id", threadId.slice(0, 512))
    .eq("status", "broken")
    .order("broken_at", { ascending: false })
    .limit(BROKEN_COUNT_LIMIT);
  return Array.isArray(data) ? data.length : 0;
}
