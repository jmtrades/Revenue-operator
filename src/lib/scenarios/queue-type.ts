/**
 * Universal queue type declaration. Deterministic mapping only.
 */

export type QueueType =
  | "inbound_queue"
  | "outbound_queue"
  | "commitment_queue"
  | "collections_queue"
  | "routing_queue"
  | "review_queue"
  | "exception_queue";

export interface ResolveQueueTypeInput {
  /** Whether this is from an inbound event (true) or outbound/list (false) */
  isInbound: boolean;
  primary_objective?: string | null;
  risk_score?: number | null;
  use_mode_key?: string | null;
}

/**
 * Resolve queue type from execution context. Deterministic. No randomness.
 */
export function resolveQueueType(input: ResolveQueueTypeInput): QueueType {
  const { isInbound, primary_objective, risk_score, use_mode_key } = input;
  const risk = risk_score ?? 0;

  if (risk >= 75) return "exception_queue";
  if (use_mode_key === "triage" && isInbound) return "routing_queue";
  if (use_mode_key === "list_execution" && !isInbound) return "outbound_queue";
  if (primary_objective === "collect" || primary_objective === "recover") return "collections_queue";
  if (primary_objective === "confirm" || primary_objective === "book") return "commitment_queue";
  if (primary_objective === "escalate" || primary_objective === "route") return "review_queue";
  if (isInbound) return "inbound_queue";
  return "outbound_queue";
}
