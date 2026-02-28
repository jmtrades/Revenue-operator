/**
 * Outcome closure contract. Opted_out => pause. Legal_risk => escalate only. No randomness.
 */

export type ClosedOutcomeType = "opted_out" | "payment_made" | "appointment_confirmed" | "terminated" | "legal_risk";

export type NextRequiredAction =
  | "schedule_followup"
  | "request_disclosure_confirmation"
  | "escalate_to_human"
  | "pause_execution"
  | "record_commitment"
  | "none";

export interface EnforceOutcomeClosureResult {
  allowed: boolean;
  forcedNextAction: NextRequiredAction | null;
}

/**
 * Enforce outcome closure. If last outcome is closed type, only allow forcedNextAction.
 */
export function enforceOutcomeClosure(
  lastOutcomeType: string | null,
  intendedNextRequiredAction: NextRequiredAction | null
): EnforceOutcomeClosureResult {
  if (!lastOutcomeType) return { allowed: true, forcedNextAction: null };

  if (lastOutcomeType === "opted_out") {
    return { allowed: intendedNextRequiredAction === "pause_execution", forcedNextAction: "pause_execution" };
  }
  if (lastOutcomeType === "legal_risk") {
    return { allowed: intendedNextRequiredAction === "escalate_to_human", forcedNextAction: "escalate_to_human" };
  }
  if (lastOutcomeType === "terminated") {
    return { allowed: intendedNextRequiredAction === "none", forcedNextAction: "none" };
  }
  if (lastOutcomeType === "payment_made") {
    return { allowed: intendedNextRequiredAction === "none", forcedNextAction: "none" };
  }
  if (lastOutcomeType === "appointment_confirmed") {
    return { allowed: intendedNextRequiredAction === "none" || intendedNextRequiredAction === "schedule_followup", forcedNextAction: null };
  }
  return { allowed: true, forcedNextAction: null };
}
