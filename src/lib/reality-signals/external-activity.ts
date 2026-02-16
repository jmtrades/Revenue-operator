/**
 * External activity detection: when related activity occurs outside the record.
 * Deterministic: uses existing reference memory detection.
 */

import { getDb } from "@/lib/db/queries";

/**
 * True when a commitment, payment, or transaction exists for the same subject
 * but has no thread_reference_memory link (occurred outside record).
 * Checks existing activity, not the newly created one.
 */
export async function hasExternalActivityForSubject(
  workspaceId: string,
  subjectType: string,
  subjectId: string,
  excludeContextId?: string
): Promise<boolean> {
  const db = getDb();
  const { data: commitments } = await db
    .from("commitments")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .limit(10);
  if (commitments?.length) {
    for (const c of commitments) {
      const commitmentId = (c as { id: string }).id;
      const { data: ref } = await db
        .from("thread_reference_memory")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("reference_context_type", "commitment")
        .eq("reference_context_id", commitmentId)
        .limit(1)
        .maybeSingle();
      if (!ref) return true;
    }
  }
  const { data: payments } = await db
    .from("payment_obligations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .limit(10);
  if (payments?.length) {
    for (const p of payments) {
      const paymentId = (p as { id: string }).id;
      const { data: ref } = await db
        .from("thread_reference_memory")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("reference_context_type", "payment_obligation")
        .eq("reference_context_id", paymentId)
        .limit(1)
        .maybeSingle();
      if (!ref) return true;
    }
  }
  const { data: txs } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .limit(10);
  if (txs?.length) {
    for (const t of txs) {
      const txId = (t as { id: string }).id;
      if (excludeContextId && txId === excludeContextId) continue;
      const { data: ref } = await db
        .from("thread_reference_memory")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("reference_context_type", "shared_transaction")
        .eq("reference_context_id", txId)
        .limit(1)
        .maybeSingle();
      if (!ref) return true;
    }
  }
  return false;
}
