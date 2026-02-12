/**
 * Coverage module flags: respect workspace scope toggles.
 * When a flag is off, log restraint: "Coverage not enabled"
 */

export type CoverageFlag =
  | "continuity_messaging"
  | "booking_protection"
  | "attendance_protection"
  | "post_call_continuity"
  | "notifications";

export interface CoverageFlags {
  continuity_messaging?: boolean;
  booking_protection?: boolean;
  attendance_protection?: boolean;
  post_call_continuity?: boolean;
  notifications?: boolean;
}

const DEFAULT_FLAGS: CoverageFlags = {
  continuity_messaging: true,
  booking_protection: true,
  attendance_protection: true,
  post_call_continuity: true,
  notifications: true,
};

/** Map intervention/action type to coverage flag. */
const INTERVENTION_TO_FLAG: Record<string, CoverageFlag> = {
  follow_up: "continuity_messaging",
  clarifying_question: "continuity_messaging",
  qualification_question: "continuity_messaging",
  winback: "continuity_messaging",
  book_cta: "booking_protection",
  call_invite: "booking_protection",
  booking: "booking_protection",
  confirmation: "attendance_protection",
  reminder: "attendance_protection",
  greeting: "continuity_messaging",
  post_call_checkin: "post_call_continuity",
  hesitation_followup: "post_call_continuity",
  objection_sequence: "post_call_continuity",
};

export function getCoverageFlagForIntervention(interventionType: string): CoverageFlag | null {
  return INTERVENTION_TO_FLAG[interventionType] ?? "continuity_messaging";
}

export function isCoverageEnabled(
  flags: CoverageFlags | null | undefined,
  interventionType: string
): boolean {
  const merged = { ...DEFAULT_FLAGS, ...flags };
  const flag = getCoverageFlagForIntervention(interventionType);
  if (!flag) return true;
  return merged[flag] !== false;
}
