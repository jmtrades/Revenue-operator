/**
 * Sales Operations Roles
 * Each role operates safely and independently. The system never performs
 * actions outside a role's responsibility.
 */

import type { LeadState } from "@/lib/types";
import { ALLOWED_ACTIONS_BY_STATE } from "@/lib/types";

export const ROLES = [
  "qualifier",
  "setter",
  "show_manager",
  "follow_up_manager",
  "revival_manager",
  "full_autopilot",
] as const;

export type RoleId = (typeof ROLES)[number];

export const ROLE_LABELS: Record<RoleId, string> = {
  qualifier: "Qualifier",
  setter: "Setter",
  show_manager: "Show Manager",
  follow_up_manager: "Follow-up Manager",
  revival_manager: "Revival Manager",
  full_autopilot: "Full Autopilot",
};

export const ROLE_DESCRIPTIONS: Record<RoleId, string> = {
  qualifier: "Replies to new leads and qualifies interest",
  setter: "Schedules calls when prospects are ready",
  show_manager: "Sends reminders and handles no-shows",
  follow_up_manager: "Keeps conversations going when leads go quiet",
  revival_manager: "Reaches out to lost or cold prospects",
  full_autopilot: "All roles — complete department",
};

/** States this role is responsible for */
export const ROLE_STATES: Record<RoleId, LeadState[]> = {
  qualifier: ["NEW", "CONTACTED", "ENGAGED", "QUALIFIED"],
  setter: ["QUALIFIED"],
  show_manager: ["BOOKED"],
  follow_up_manager: ["CONTACTED", "SHOWED"],
  revival_manager: ["LOST", "REACTIVATE"],
  full_autopilot: ["NEW", "CONTACTED", "ENGAGED", "QUALIFIED", "BOOKED", "SHOWED", "WON", "LOST", "RETAIN", "REACTIVATE"],
};

/** Actions this role may perform (subset of ALLOWED_ACTIONS_BY_STATE) */
export const ROLE_ACTIONS: Record<RoleId, string[]> = {
  qualifier: ["greeting", "question", "follow_up", "qualification_question", "discovery_questions", "value_proposition"],
  setter: ["booking", "call_invite"],
  show_manager: ["reminder", "prep_info"],
  follow_up_manager: ["follow_up", "qualification_question", "next_step"],
  revival_manager: ["recovery", "feedback_request", "win_back", "offer"],
  full_autopilot: ["greeting", "question", "follow_up", "qualification_question", "discovery_questions", "value_proposition", "booking", "call_invite", "reminder", "prep_info", "next_step", "retention", "referral_ask", "recovery", "feedback_request", "check_in", "upsell", "win_back", "offer"],
};

/** Actions this role is FORBIDDEN from performing */
export const ROLE_FORBIDDEN: Record<RoleId, string[]> = {
  qualifier: ["booking", "call_invite", "reminder", "prep_info", "recovery", "win_back", "offer"],
  setter: ["greeting", "recovery", "win_back", "reminder", "prep_info"],
  show_manager: ["greeting", "qualification_question", "booking", "recovery", "win_back"],
  follow_up_manager: ["booking", "call_invite", "recovery", "win_back", "offer"],
  revival_manager: ["greeting", "booking", "call_invite", "reminder", "prep_info"],
  full_autopilot: [],
};

/** Minimum confidence to act (below = use safe fallback) */
export const ROLE_CONFIDENCE_THRESHOLDS: Record<RoleId, number> = {
  qualifier: 0.75,
  setter: 0.85,
  show_manager: 0.8,
  follow_up_manager: 0.75,
  revival_manager: 0.7,
  full_autopilot: 0.8,
};

/** Safe fallback when action blocked or confidence low */
export const ROLE_SAFE_FALLBACK: Record<RoleId, string> = {
  qualifier: "clarifying_question",
  setter: "qualification_question",
  show_manager: "reminder",
  follow_up_manager: "clarifying_question",
  revival_manager: "clarifying_question",
  full_autopilot: "clarifying_question",
};

/** Resolve which role handles this state + action. Returns null if no hired role can act. */
export function resolveRole(
  state: LeadState,
  action: string,
  hiredRoles: RoleId[]
): { role: RoleId; label: string } | null {
  const effectiveRoles = hiredRoles.includes("full_autopilot")
    ? (["full_autopilot"] as RoleId[])
    : hiredRoles;

  for (const roleId of effectiveRoles) {
    if (!ROLE_STATES[roleId].includes(state)) continue;
    if (ROLE_FORBIDDEN[roleId].includes(action)) continue;
    const allowed = ROLE_ACTIONS[roleId];
    if (allowed.includes(action) || (roleId === "full_autopilot" && (ALLOWED_ACTIONS_BY_STATE[state] ?? []).includes(action))) {
      return { role: roleId, label: ROLE_LABELS[roleId] };
    }
  }

  return null;
}

/** Map internal action names to user-facing descriptions */
export function roleActionDescription(action: string): string {
  const map: Record<string, string> = {
    greeting: "Welcomed lead",
    question: "Asked qualifying question",
    follow_up: "Followed up",
    qualification_question: "Qualified interest",
    discovery_questions: "Asked discovery questions",
    value_proposition: "Shared value prop",
    booking: "Booked call",
    call_invite: "Sent call invite",
    reminder: "Sent reminder",
    prep_info: "Sent prep info",
    next_step: "Proposed next step",
    recovery: "Recovery reach-out",
    feedback_request: "Asked for feedback",
    win_back: "Win-back message",
    offer: "Sent offer",
  };
  return map[action] ?? action.replace(/_/g, " ");
}
