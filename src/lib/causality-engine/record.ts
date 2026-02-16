/**
 * Record a causal chain. Deterministic: only state transitions and timing.
 */

import { getDb } from "@/lib/db/queries";
import type { CausalChainInput } from "./types";

export async function recordCausalChain(input: CausalChainInput): Promise<void> {
  const db = getDb();
  await db.from("causal_chains").insert({
    workspace_id: input.workspace_id,
    subject_type: input.subject_type,
    subject_id: input.subject_id,
    baseline_expected_outcome: input.baseline_expected_outcome,
    intervention_type: input.intervention_type,
    observed_outcome: input.observed_outcome,
    dependency_established: input.dependency_established,
    determined_at: new Date().toISOString(),
  });
  if (input.dependency_established) {
    const { recordContinuityLoad } = await import("@/lib/continuity-load");
    recordContinuityLoad(
      input.workspace_id,
      "outcome_caused",
      `${input.subject_type}:${input.subject_id}`
    ).catch(() => {});
    const { resolveExposureFromCausalChain } = await import("@/lib/exposure-engine");
    resolveExposureFromCausalChain(
      input.workspace_id,
      input.intervention_type,
      input.subject_type,
      input.subject_id
    ).catch(() => {});
  }
}

export async function countCausalChainsInLastDays(
  workspaceId: string,
  days: number
): Promise<number> {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { count } = await db
    .from("causal_chains")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("dependency_established", true)
    .gte("determined_at", since.toISOString());
  return count ?? 0;
}
