/**
 * Proof Layer — Record revenue outcomes with causality. Idempotent: same dedup_key => no double count.
 */

import { getDb } from "@/lib/db/queries";
import type { RevenueProofRecord } from "./types";

const TABLE = "revenue_proof";

function proofDedupKey(record: RevenueProofRecord): string {
  const parts = [record.proof_type, record.lead_id];
  if (record.signal_id) parts.push(record.signal_id);
  if (record.state_before) parts.push(record.state_before);
  if (record.state_after) parts.push(record.state_after);
  return parts.join(":");
}

export async function recordProof(record: RevenueProofRecord): Promise<string> {
  const db = getDb();
  const dedup_key = proofDedupKey(record);
  const row = {
    workspace_id: record.workspace_id,
    lead_id: record.lead_id,
    proof_type: record.proof_type,
    operator_id: record.operator_id ?? null,
    signal_id: record.signal_id ?? null,
    state_before: record.state_before ?? null,
    state_after: record.state_after ?? null,
    payload: record.payload ?? {},
    proof_dedup_key: dedup_key,
  };

  const { data, error } = await db
    .from(TABLE)
    .upsert(row, { onConflict: "proof_dedup_key", ignoreDuplicates: true })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return (data as { id: string } | null)?.id ?? "";
}
