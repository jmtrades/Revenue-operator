/**
 * State Layer — Lifecycle states (doctrine).
 * Deterministic, replayable. Stored in leads.state via mapping to LeadState.
 */

export const LIFECYCLE_STATES = [
  "NEW",
  "ENGAGED",
  "QUALIFIED",
  "BOOKED",
  "SCHEDULED",
  "ATTENDED",
  "NO_SHOW",
  "LOST",
  "REACTIVATED",
  "REPEAT",
] as const;

export type LifecycleState = (typeof LIFECYCLE_STATES)[number];

/** Map lifecycle state to persisted LeadState (existing enum) */
export function lifecycleToLeadState(s: LifecycleState): import("@/lib/types").LeadState {
  const map: Record<LifecycleState, import("@/lib/types").LeadState> = {
    NEW: "NEW",
    ENGAGED: "ENGAGED",
    QUALIFIED: "QUALIFIED",
    BOOKED: "BOOKED",
    SCHEDULED: "BOOKED",
    ATTENDED: "SHOWED",
    NO_SHOW: "LOST",
    LOST: "LOST",
    REACTIVATED: "REACTIVATE",
    REPEAT: "RETAIN",
  };
  return map[s] ?? "NEW";
}

/** Map persisted LeadState to lifecycle (for reducer input when replaying) */
export function leadStateToLifecycle(s: string): LifecycleState {
  const map: Record<string, LifecycleState> = {
    NEW: "NEW",
    CONTACTED: "ENGAGED",
    ENGAGED: "ENGAGED",
    QUALIFIED: "QUALIFIED",
    BOOKED: "BOOKED",
    SHOWED: "ATTENDED",
    WON: "REPEAT",
    LOST: "LOST",
    RETAIN: "REPEAT",
    REACTIVATE: "REACTIVATED",
    CLOSED: "REPEAT",
  };
  return (map[s] ?? "NEW") as LifecycleState;
}
