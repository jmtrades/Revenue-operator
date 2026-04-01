/**
 * Outcome dependencies: one outcome relies on another thread's completion for stability.
 * External dependence layer. No blocking, no advice — only observable consequence.
 * Dependencies recorded only when dependent context exists in DB. Never delete rows.
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";

export type OutcomeDependencyType =
  | "verification_reference"
  | "downstream_commitment"
  | "financial_finalization"
  | "delivery_confirmation"
  | "external_reporting"
  | "prior_outcome_reference";

export type DependentContextType =
  | "shared_transaction"
  | "conversation"
  | "lead"
  | "external_report"
  | "commitment"
  | "payment_obligation";

/** Check that the dependent context exists. Do not fabricate. */
async function dependentContextExists(
  contextType: DependentContextType,
  contextId: string
): Promise<boolean> {
  const db = getDb();
  if (contextType === "shared_transaction") {
    const { data } = await db
      .from("shared_transactions")
      .select("id")
      .eq("id", contextId)
      .maybeSingle();
    return !!data;
  }
  if (contextType === "conversation") {
    const { data } = await db.from("conversations").select("id").eq("id", contextId).maybeSingle();
    return !!data;
  }
  if (contextType === "lead") {
    const { data } = await db.from("leads").select("id").eq("id", contextId).maybeSingle();
    return !!data;
  }
  if (contextType === "commitment") {
    const { data } = await db.from("commitments").select("id").eq("id", contextId).maybeSingle();
    return !!data;
  }
  if (contextType === "payment_obligation") {
    const { data } = await db.from("payment_obligations").select("id").eq("id", contextId).maybeSingle();
    return !!data;
  }
  if (contextType === "external_report") {
    return false;
  }
  return false;
}

export interface RecordOutcomeDependencyInput {
  workspaceId: string;
  sourceThreadId: string;
  dependentContextType: DependentContextType;
  dependentContextId: string;
  dependencyType: OutcomeDependencyType;
  stabilityAffected?: boolean;
}

/**
 * Insert one outcome dependency only when the dependent context exists. Never delete.
 */
export async function recordOutcomeDependency(input: RecordOutcomeDependencyInput): Promise<void> {
  const exists = await dependentContextExists(input.dependentContextType, input.dependentContextId);
  if (!exists) return;
  const db = getDb();
  await db.from("outcome_dependencies").insert({
    workspace_id: input.workspaceId,
    source_thread_id: input.sourceThreadId,
    dependent_context_type: input.dependentContextType,
    dependent_context_id: input.dependentContextId,
    dependency_type: input.dependencyType,
    stability_affected: input.stabilityAffected ?? true,
  });
}

/** True if thread has at least one unsatisfied responsibility (existence only). */
async function threadHasUnresolvedResponsibility(threadId: string): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("operational_responsibilities")
    .select("id")
    .eq("thread_id", threadId)
    .eq("satisfied", false)
    .limit(1)
    .maybeSingle();
  return !!data;
}

/**
 * Set resolved_at on all dependencies whose source thread is this thread, when the thread has no unresolved responsibilities.
 */
export async function refreshResolvedAtForThread(threadId: string): Promise<void> {
  const unresolved = await threadHasUnresolvedResponsibility(threadId);
  if (unresolved) return;
  const db = getDb();
  const { data: hadUnresolved } = await db
    .from("outcome_dependencies")
    .select("id")
    .eq("source_thread_id", threadId)
    .is("resolved_at", null)
    .limit(1)
    .maybeSingle();
  const now = new Date().toISOString();
  await db
    .from("outcome_dependencies")
    .update({ resolved_at: now })
    .eq("source_thread_id", threadId)
    .is("resolved_at", null);
  if (hadUnresolved) {
    const { threadIsReliedUpon, recordThreadAmendment } = await import("@/lib/institutional-auditability");
    const relied = await threadIsReliedUpon(threadId).catch(() => false);
    if (relied) {
      await recordThreadAmendment(threadId, "outcome_change", "Dependency resolved.", null).catch((e: unknown) => {
        log("error", "recordThreadAmendment failed", { error: e instanceof Error ? e.message : String(e) });
      });
    }
  }
}

/** Deterministic: true if a dependency exists for this context with resolved_at null. */
export async function contextHasExternalUncertainty(
  contextType: string,
  contextId: string
): Promise<boolean> {
  const db = getDb();
  const rpc = (db as unknown as { rpc: (n: string, p: Record<string, unknown>) => Promise<{ data: boolean | null; error: unknown }> }).rpc;
  const { data, error } = await rpc("context_has_external_uncertainty", {
    p_dependent_context_type: contextType,
    p_dependent_context_id: contextId,
  });
  return !error && data === true;
}

/** Deterministic: true if ≥2 distinct dependent contexts reference unresolved threads. */
export async function workspaceHasDependencyPressure(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const rpc = (db as unknown as { rpc: (n: string, p: Record<string, unknown>) => Promise<{ data: boolean | null; error: unknown }> }).rpc;
  const { data, error } = await rpc("workspace_has_dependency_pressure", {
    p_workspace_id: workspaceId,
  });
  return !error && data === true;
}

/** Deterministic: true if thread has unresolved responsibilities and at least one dependency points to it. */
export async function threadPropagatesUncertainty(threadId: string): Promise<boolean> {
  const db = getDb();
  const rpc = (db as unknown as { rpc: (n: string, p: Record<string, unknown>) => Promise<{ data: boolean | null; error: unknown }> }).rpc;
  const { data, error } = await rpc("thread_propagates_uncertainty", {
    p_thread_id: threadId,
  });
  return !error && data === true;
}

/** Link thread to commitment; creates dependency only if commitment exists. */
export async function linkThreadToCommitment(
  workspaceId: string,
  sourceThreadId: string,
  commitmentId: string,
  dependencyType: OutcomeDependencyType
): Promise<void> {
  await recordOutcomeDependency({
    workspaceId,
    sourceThreadId,
    dependentContextType: "commitment",
    dependentContextId: commitmentId,
    dependencyType,
  });
}

/** Link thread to payment obligation; creates dependency only if obligation exists. */
export async function linkThreadToPayment(
  workspaceId: string,
  sourceThreadId: string,
  paymentObligationId: string,
  dependencyType: OutcomeDependencyType
): Promise<void> {
  await recordOutcomeDependency({
    workspaceId,
    sourceThreadId,
    dependentContextType: "payment_obligation",
    dependentContextId: paymentObligationId,
    dependencyType,
  });
}

/** Deterministic: true if workspace has at least one thread that propagates uncertainty. */
export async function workspaceHasThreadPropagatingUncertainty(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const rpc = (db as unknown as { rpc: (n: string, p: Record<string, unknown>) => Promise<{ data: boolean | null; error: unknown }> }).rpc;
  const { data, error } = await rpc("workspace_has_thread_propagating_uncertainty", {
    p_workspace_id: workspaceId,
  });
  return !error && data === true;
}
