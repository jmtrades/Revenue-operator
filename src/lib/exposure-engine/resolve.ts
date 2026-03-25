/**
 * Mark exposures as interrupted from causal chain, continuation, or coordination displacement.
 */

import { getDb } from "@/lib/db/queries";
import { markExposureResolved } from "./record";
import type { InterruptionSource } from "./types";

/** Call after recordCausalChain insert (dependency_established). */
export async function resolveExposureFromCausalChain(
  workspaceId: string,
  interventionType: string,
  subjectType: string,
  subjectId: string
): Promise<void> {
  const sid = String(subjectId);
  if (interventionType === "commitment_recovery") {
    const db = getDb();
    const { data: comm } = await db
      .from("commitments")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("subject_type", subjectType)
      .eq("subject_id", sid)
      .eq("state", "resolved")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const cid = (comm as { id: string } | null)?.id;
    if (cid) {
      await markExposureResolved(workspaceId, "attendance_uncertainty_risk", "commitment", cid, "causal_chain").catch(() => {});
      await markExposureResolved(workspaceId, "commitment_outcome_uncertain", "commitment", cid, "causal_chain").catch(() => {});
    }
    return;
  }
  if (interventionType === "opportunity_revival") {
    await markExposureResolved(workspaceId, "reply_delay_risk", "conversation", sid, "causal_chain").catch(() => {});
    return;
  }
  if (interventionType === "payment_recovery") {
    const db = getDb();
    const { data: ob } = await db
      .from("payment_obligations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("subject_type", subjectType)
      .eq("subject_id", sid)
      .eq("state", "resolved")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const oid = (ob as { id: string } | null)?.id;
    if (oid) await markExposureResolved(workspaceId, "payment_stall_risk", "payment_obligation", oid, "causal_chain").catch(() => {});
    return;
  }
  if (interventionType === "shared_transaction_ack") {
    await markExposureResolved(workspaceId, "counterparty_unconfirmed_risk", "shared_transaction", sid, "causal_chain").catch(() => {});
  }
}

/** Call after recordContinuationStopped insert. */
export async function resolveExposureFromContinuation(
  workspaceId: string,
  subjectType: string,
  subjectId: string,
  unresolvedState: string
): Promise<void> {
  const sid = String(subjectId);
  const typeMap: Record<string, { exposureType: "reply_delay_risk" | "attendance_uncertainty_risk" | "payment_stall_risk" | "counterparty_unconfirmed_risk"; subjectType: "conversation" | "commitment" | "payment_obligation" | "shared_transaction" }> = {
    waiting: { exposureType: "reply_delay_risk", subjectType: "conversation" },
    uncertain_attendance: { exposureType: "attendance_uncertainty_risk", subjectType: "commitment" },
    unpaid: { exposureType: "payment_stall_risk", subjectType: "payment_obligation" },
    unaligned: { exposureType: "counterparty_unconfirmed_risk", subjectType: "shared_transaction" },
  };
  const m = typeMap[unresolvedState];
  if (m) await markExposureResolved(workspaceId, m.exposureType, m.subjectType, sid, "continuation_stopped").catch(() => {});
}

/** Mark most recent unresolved exposure of given type (for displacement which has no subject_id). */
export async function markMostRecentExposureResolvedByType(
  workspaceId: string,
  exposureType: "reply_delay_risk" | "attendance_uncertainty_risk" | "payment_stall_risk" | "counterparty_unconfirmed_risk",
  subjectType: "conversation" | "commitment" | "payment_obligation" | "shared_transaction",
  source: InterruptionSource
): Promise<void> {
  const db = getDb();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await db
    .from("operational_exposures")
    .select("id, subject_id")
    .eq("workspace_id", workspaceId)
    .eq("exposure_type", exposureType)
    .eq("subject_type", subjectType)
    .is("exposure_resolved_at", null)
    .gte("last_observed_at", since)
    .order("last_observed_at", { ascending: false })
    .limit(1);
  if (!rows?.length) return;
  const subjectId = (rows[0] as { subject_id: string }).subject_id;
  await markExposureResolved(workspaceId, exposureType, subjectType, subjectId, source).catch(() => {});
}

/** Call after recordCoordinationDisplacement insert. decisionType only; marks most recent matching exposure. */
export async function resolveExposureFromDisplacement(
  workspaceId: string,
  decisionType: string
): Promise<void> {
  const map: Record<string, { exposureType: "payment_stall_risk" | "counterparty_unconfirmed_risk" | "attendance_uncertainty_risk" | "reply_delay_risk"; subjectType: "payment_obligation" | "shared_transaction" | "commitment" | "conversation" }> = {
    payment: { exposureType: "payment_stall_risk", subjectType: "payment_obligation" },
    responsibility: { exposureType: "counterparty_unconfirmed_risk", subjectType: "shared_transaction" },
    confirmation: { exposureType: "counterparty_unconfirmed_risk", subjectType: "shared_transaction" },
    attendance: { exposureType: "attendance_uncertainty_risk", subjectType: "commitment" },
    continuation: { exposureType: "reply_delay_risk", subjectType: "conversation" },
  };
  const m = map[decisionType];
  if (!m) return;
  await markMostRecentExposureResolvedByType(workspaceId, m.exposureType, m.subjectType, "coordination_displacement").catch(() => {});
}
