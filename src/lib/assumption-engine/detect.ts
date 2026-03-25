/**
 * Pure detection helpers. No side effects, no DB. Used by hooks and cron to decide when to record.
 */

export type AssumptionType = "outcome_presumed" | "dependency_action_taken" | "absence_only_attention";

/** Stable reference_id prefixes for each type. */
export function referenceIdFor(
  type: AssumptionType,
  id: string
): string {
  const prefix =
    type === "outcome_presumed"
      ? "commitment"
      : type === "dependency_action_taken"
        ? "commitment"
        : type === "absence_only_attention"
          ? "escalation"
          : "subject";
  return `${prefix}:${id}`;
}

/** Outcome presumed: resolution was by intervention (overdue/recovery_required → resolved). No content checks. */
export function wasResolvedByIntervention(
  priorState: string,
  terminalOutcome: string
): boolean {
  const priorUnresolved = ["overdue", "recovery_required", "awaiting_response"].includes(priorState);
  const resolved = ["completed", "rescheduled", "paid", "acknowledged"].includes(terminalOutcome);
  return priorUnresolved && resolved;
}
