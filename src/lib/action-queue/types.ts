/**
 * Action Layer — Safe Execution
 * All outbound actions go through this queue. No direct send from business logic.
 */

export const ACTION_COMMAND_TYPES = [
  "SendMessage",
  "ScheduleFollowup",
  "SendReminder",
  "RecoverNoShow",
  "ReactivateLead",
] as const;

export type ActionCommandType = (typeof ACTION_COMMAND_TYPES)[number];

export interface SendMessagePayload {
  conversation_id: string;
  channel: string;
  content: string;
  /** Email: subject line when channel is email */
  email_subject?: string;
  /** Human presence: when to send (ISO). If past or within threshold, run immediately. */
  send_at?: string;
  /** Human presence: delay used for anti-pattern recording after send */
  delay_seconds?: number;
  template_key?: string;
  metadata?: Record<string, unknown>;
  /** Adoption: action_type for pending preview removal after first send */
  action_type?: string;
}

export interface ScheduleFollowupPayload {
  next_action_at: string;
  next_action_type: string;
}

export interface SendReminderPayload {
  conversation_id: string;
  channel: string;
  content: string;
  reminder_type?: string;
}

export interface RecoverNoShowPayload {
  conversation_id: string;
  channel: string;
  booking_id?: string | null;
}

export interface ReactivateLeadPayload {
  conversation_id: string;
  channel: string;
}

export type ActionPayload =
  | SendMessagePayload
  | ScheduleFollowupPayload
  | SendReminderPayload
  | RecoverNoShowPayload
  | ReactivateLeadPayload;

export interface ActionCommand {
  type: ActionCommandType;
  workspace_id: string;
  lead_id: string;
  payload: ActionPayload;
  /** Idempotency: same dedup_key => at most one execution */
  dedup_key: string;
  /** Which operator requested this (for audit) */
  operator_id?: string;
  /** Optional signal that triggered (for proof) */
  signal_id?: string | null;
}
