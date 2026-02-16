/**
 * Compositional sentence fragments per intent. Not templates; selected by plan + stance + tone.
 * Max 90 chars per fragment; factual, short.
 */

import type { MessageIntentType, Stance, Tone } from "./types";

const MAX_FRAGMENT = 90;
const FORBIDDEN = /\b(you|your|we|us|click|optimize|ROI|KPI|dashboard|assistant)\b/i;

function trim(s: string): string {
  const t = s.length > MAX_FRAGMENT ? s.slice(0, MAX_FRAGMENT).trim() : s;
  return t.replace(FORBIDDEN, "").trim() || s.slice(0, MAX_FRAGMENT).trim();
}

/** Fragments: intent -> (stance -> (tone -> string[])). One fragment chosen deterministically. */
const LATTICE: Record<
  MessageIntentType,
  Partial<Record<Stance, Partial<Record<Tone, string[]>>>>
> = {
  follow_up: {
    request: { neutral: ["Previous message may need a response.", "Follow-up in case you had questions."], warm: ["Still here if you want to pick this up."], firm: ["A response is needed to move forward."] },
    inform: { neutral: ["No rush — reply when ready."] },
  },
  confirm_booking: {
    request: { neutral: ["Please confirm your upcoming appointment.", "Confirm the time that works for you."], warm: ["Happy to confirm — when are you free?"], firm: ["Appointment confirmation required."] },
    confirm: { neutral: ["Appointment confirmed."] },
  },
  reschedule_request: {
    request: { neutral: ["Need to reschedule? Reply with a preferred time."], firm: ["Reschedule required before the deadline."] },
  },
  payment_link: {
    inform: { neutral: ["Payment link is available.", "Link sent for payment."] },
    request: { neutral: ["Payment is due. Link was sent."] },
  },
  payment_reminder: {
    request: { neutral: ["Payment reminder: link was sent earlier.", "Friendly reminder: payment pending."], firm: ["Payment is overdue. Please complete."] },
  },
  clarification: {
    request: { neutral: ["What were you looking to get done?", "What would help?"], warm: ["Happy to clarify — what matters to you?"] },
  },
  close_loop: {
    close: { neutral: ["No further action needed."] },
    inform: { neutral: ["This is closed."] },
  },
  handoff_hold: {
    inform: { neutral: ["A team member will follow up."] },
  },
  acknowledgement_request: {
    request: { neutral: ["Shared record needs your confirmation. Reply to confirm or dispute.", "Please confirm or reschedule the shared record."], firm: ["Acknowledgement required for the shared record."] },
  },
  dispute_resolution: {
    request: { neutral: ["Dispute recorded. A team member will follow up."] },
  },
  outcome_confirmation: {
    confirm: { neutral: ["Outcome was recorded."] },
  },
};

export function getFragment(intent: MessageIntentType, stance: Stance, tone: Tone): string {
  const byStance = LATTICE[intent];
  if (!byStance) return "No further action needed.";
  const byTone = byStance[stance] ?? byStance.request ?? byStance.inform ?? byStance.confirm ?? byStance.close;
  if (!byTone) return "No further action needed.";
  const arr = byTone[tone] ?? byTone.neutral ?? Object.values(byTone)[0];
  const line = Array.isArray(arr) ? arr[0] : arr;
  return trim(line ?? "No further action needed.");
}

export function applyEntitiesToFragment(fragment: string, entities: Record<string, string | undefined>): string {
  let out = fragment;
  if (entities.time && !out.includes(entities.time)) {
    const appended = ` ${entities.time}.`;
    if (out.length + appended.length <= MAX_FRAGMENT) out = out + appended;
  }
  return out.length > MAX_FRAGMENT ? out.slice(0, MAX_FRAGMENT).trim() : out;
}
