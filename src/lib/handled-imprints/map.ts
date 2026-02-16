/**
 * Operational dependency imprinting: map handled events to factual "would have required" sentences.
 * No persuasion, no money, no marketing. Only operational effort avoided.
 */

export type ImprintKind =
  | "recovered_no_show"
  | "no_reply_timeout"
  | "late_confirmation"
  | "return_reactivation"
  | "indecision_resolved"
  | "booking_confirmation"
  | "attendance_confirmation";

const IMPRINTS: Record<ImprintKind, string> = {
  recovered_no_show: "Would have required rescheduling manually",
  no_reply_timeout: "Would have required checking back in",
  late_confirmation: "Would have required confirming attendance",
  return_reactivation: "Would have required reaching out again",
  indecision_resolved: "Would have required further follow-up",
  booking_confirmation: "Would have required confirming the appointment",
  attendance_confirmation: "Would have required confirming attendance",
};

/**
 * Map event type + attribution (prior action) to one imprint sentence.
 * Returns null if no factual imprint applies.
 */
export function eventToImprint(
  eventType: string,
  attributedTo: string | undefined
): string | null {
  if (eventType === "booking_created") {
    const a = (attributedTo ?? "").toLowerCase();
    if (a.includes("reminder") || a.includes("prep")) return IMPRINTS.booking_confirmation;
    if (a.includes("follow-through restored") || a.includes("customer returned")) return IMPRINTS.return_reactivation;
    if (a.includes("follow-up")) return IMPRINTS.indecision_resolved;
    return IMPRINTS.booking_confirmation;
  }
  if (eventType === "call_completed") {
    const a = (attributedTo ?? "").toLowerCase();
    if (a.includes("reminder") || a.includes("prep")) return IMPRINTS.attendance_confirmation;
    if (a.includes("follow-through restored") || a.includes("customer returned")) return IMPRINTS.recovered_no_show;
    return IMPRINTS.attendance_confirmation;
  }
  if (eventType === "no_reply_timeout") return IMPRINTS.no_reply_timeout;
  return null;
}

/**
 * Map action_log send_message inner action to imprint (for actions that are outcomes, e.g. reminder sent).
 * Use sparingly; prefer event-based imprints.
 */
export function actionToImprint(innerAction: string): string | null {
  const a = (innerAction ?? "").toLowerCase();
  if (a === "reminder" || a === "prep_info") return IMPRINTS.late_confirmation;
  if (a === "recovery" || a === "win_back") return IMPRINTS.return_reactivation;
  if (a === "follow_up") return IMPRINTS.indecision_resolved;
  return null;
}
