/**
 * Revenue Operator - Core Types
 * Deterministic revenue workflow engine with AI assistance
 */

export const LEAD_STATES = [
  "NEW",
  "CONTACTED",
  "ENGAGED",
  "QUALIFIED",
  "BOOKED",
  "SHOWED",
  "WON",
  "LOST",
  "RETAIN",
  "REACTIVATE",
  "CLOSED",
] as const;
export type LeadState = (typeof LEAD_STATES)[number];

export const EVENT_TYPES = [
  "message_received",
  "no_reply_timeout",
  "booking_created",
  "call_completed",
  "payment_detected",
  "manual_update",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const AUTONOMY_LEVELS = ["observe", "suggest", "assisted", "auto"] as const;
export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[number];

export const CALL_NODES = ["intro", "situation", "impact", "qualification", "routing"] as const;
export type CallNode = (typeof CALL_NODES)[number];

export const CONFIDENCE_THRESHOLDS = {
  AUTO_SEND: 0.85,
  NEED_APPROVAL: 0.6,
} as const;

// Allowed actions per state (AI can only use these)
export const ALLOWED_ACTIONS_BY_STATE: Record<LeadState, string[]> = {
  NEW: ["greeting", "question"],
  CONTACTED: ["follow_up", "qualification_question"],
  ENGAGED: ["discovery_questions", "value_proposition"],
  QUALIFIED: ["booking", "call_invite"],
  BOOKED: ["reminder", "prep_info"],
  SHOWED: ["follow_up", "next_step"],
  WON: ["retention", "referral_ask"],
  LOST: ["recovery", "feedback_request"],
  RETAIN: ["check_in", "upsell"],
  REACTIVATE: ["win_back", "offer"],
  CLOSED: [],
};

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  settings: Record<string, unknown>;
  autonomy_level: AutonomyLevel;
  working_hours: WorkingHours;
  kill_switch: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkingHours {
  start: string;
  end: string;
  timezone: string;
  days: number[]; // 0=Sun, 1=Mon, ...
}

export interface Lead {
  id: string;
  workspace_id: string;
  external_id: string | null;
  channel: string | null;
  email: string | null;
  phone: string | null;
  name: string | null;
  company: string | null;
  state: LeadState;
  metadata: Record<string, unknown>;
  detected_behaviour: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

export interface Conversation {
  id: string;
  lead_id: string;
  channel: string;
  external_thread_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  external_id: string | null;
  metadata: Record<string, unknown>;
  confidence_score: number | null;
  approved_by_human: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  workspace_id: string;
  event_type: EventType;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  trigger_source: string | null;
  created_at: string;
}

export interface Deal {
  id: string;
  lead_id: string;
  workspace_id: string;
  value_cents: number;
  currency: string;
  status: "open" | "won" | "lost";
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface AttributionRecord {
  id: string;
  deal_id: string;
  milestone: string;
  occurred_at: string;
  metadata: Record<string, unknown>;
}

export interface PendingApproval {
  id: string;
  lead_id: string;
  conversation_id: string;
  proposed_message: string;
  confidence_score: number;
  intent_classification: Record<string, unknown> | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}
