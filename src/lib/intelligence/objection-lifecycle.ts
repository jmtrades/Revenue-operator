/**
 * Objection lifecycle engine. Deterministic. No GPT. No randomness.
 */

export type ObjectionLifecycleStage = "raised" | "addressed" | "verified" | "resolved" | "reopened";

export const OBJECTION_LIFECYCLE_STAGES: readonly ObjectionLifecycleStage[] = [
  "raised",
  "addressed",
  "verified",
  "resolved",
  "reopened",
] as const;

export interface ResolveObjectionLifecycleInput {
  prevStage: ObjectionLifecycleStage | string | null;
  outcomeType: string | null;
  lastOutcomeType: string | null;
  driftScore: number;
  contradictionScore: number;
}

/**
 * Resolve objection lifecycle stage. Deterministic rules only.
 */
export function resolveObjectionLifecycle(input: ResolveObjectionLifecycleInput): ObjectionLifecycleStage {
  const { prevStage, outcomeType, lastOutcomeType, driftScore, contradictionScore } = input;
  const prev = (prevStage as ObjectionLifecycleStage) ?? "raised";

  const complaintLike = (o: string | null) =>
    o === "complaint" || o === "refund_request" || o === "dispute";
  if (complaintLike(outcomeType) || complaintLike(lastOutcomeType)) {
    if (prev === "resolved" || prev === "verified") return "reopened";
    return "raised";
  }
  if (outcomeType === "information_provided" && (prev === "raised" || prev === "reopened")) return "addressed";
  if ((outcomeType === "appointment_confirmed" || outcomeType === "payment_promised") && prev === "addressed") return "verified";
  if ((outcomeType === "payment_made" || outcomeType === "appointment_confirmed") && prev === "verified") return "resolved";
  if (driftScore >= 70 || contradictionScore >= 60) return "reopened";
  return prev;
}
