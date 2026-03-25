/**
 * Continuation engine: proves absence of intervention would leave state unresolved.
 * State + time only. No prediction, no probabilities.
 */

export type UnresolvedState = "waiting" | "uncertain_attendance" | "unpaid" | "unaligned";
