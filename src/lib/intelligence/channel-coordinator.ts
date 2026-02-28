/**
 * Multi-Channel Synchronization Guard.
 * Never contradict previous contact. If call failed → text references call attempt. Purely deterministic.
 */

export type LastContactChannel = "voice" | "email" | "sms" | "whatsapp" | "unknown";

export interface LastContactState {
  channel: LastContactChannel;
  outcome?: "succeeded" | "failed" | "no_answer" | "skipped";
  at?: string;
}

export interface ChannelCoordinatorInput {
  nextChannel: string;
  lastContact?: LastContactState | null;
}

export interface ChannelCoordinatorOutput {
  /** Suggested context line to include (e.g. "Following up after our call attempt.") */
  contextHint: string | null;
  /** Whether to avoid sending on this channel (e.g. escalation occurred → freeze automated path) */
  shouldFreeze: boolean;
}

const VOICE_FAILED_HINT = "Following up after our call attempt.";
const VOICE_NO_ANSWER_HINT = "We tried to reach you by phone.";
const ESCALATION_FREEZE = true;

/**
 * Determine context hint and freeze from last contact. Deterministic.
 */
export function coordinateChannel(input: ChannelCoordinatorInput): ChannelCoordinatorOutput {
  const last = input.lastContact;
  if (!last) return { contextHint: null, shouldFreeze: false };

  if (last.outcome === "succeeded" && last.channel === "voice") {
    return { contextHint: null, shouldFreeze: false };
  }
  if (last.channel === "voice" && (last.outcome === "failed" || last.outcome === "no_answer")) {
    if (input.nextChannel === "sms" || input.nextChannel === "email" || input.nextChannel === "whatsapp") {
      return { contextHint: last.outcome === "no_answer" ? VOICE_NO_ANSWER_HINT : VOICE_FAILED_HINT, shouldFreeze: false };
    }
  }
  return { contextHint: null, shouldFreeze: false };
}

/**
 * Return whether to freeze automated path after escalation. Call when escalation occurred.
 */
export function shouldFreezeAfterEscalation(): boolean {
  return ESCALATION_FREEZE;
}
