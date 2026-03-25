/**
 * Guarantee Layer — invariant definitions and thresholds.
 * Deterministic state only. No user-visible scoring.
 */

export type InvariantId =
  | "response_continuity"
  | "decision_momentum"
  | "attendance_stability"
  | "recovery_persistence"
  | "lifecycle_return";

/** Human-reasonable max delay before we must acknowledge an inbound (hours). */
export const RESPONSE_CONTINUITY_MAX_HOURS = 24;

/** Max days in same decision/conversation state before we must re-engage or escalate. */
export const DECISION_MOMENTUM_MAX_DAYS = 7;

/** Window before appointment (hours) in which we check attendance stability. */
export const ATTENDANCE_NEAR_APPOINTMENT_HOURS = 48;

/** Max automated corrective attempts (re-engage / recovery) before we escalate. */
export const MAX_CORRECTIVE_ATTEMPTS = 3;

/** Min days after service completion before we consider return-timed re-engagement. */
export const LIFECYCLE_RETURN_MIN_DAYS = 30;

export interface GuaranteeBreach {
  invariant: InvariantId;
  leadId: string;
  workspaceId: string;
  reason: string;
  /** When we last attempted corrective action for this invariant (if any). */
  lastAttemptAt?: string;
}
