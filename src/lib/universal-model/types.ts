/**
 * Universal Conversation Model
 * All channels normalize into this model. Revenue Operator owns the conversation layer.
 */

/** Business location (1 workspace = 1 location for billing) */
export interface WorkspaceRef {
  id: string;
}

/** Person in the system */
export interface LeadRef {
  id: string;
  workspace_id: string;
}

/**
 * Phone/email/social/CRM id mapping for a lead.
 * Connectors map external identifiers to a canonical lead.
 */
export interface ParticipantIdentity {
  channel: ChannelType;
  external_id: string;
  thread_id?: string;
  email?: string | null;
  phone?: string | null;
  crm_id?: string | null;
  display_name?: string | null;
}

export type ChannelType =
  | "sms"
  | "email"
  | "web_form"
  | "web_chat"
  | "whatsapp"
  | "instagram"
  | "hubspot"
  | "highlevel"
  | "pipedrive"
  | "zoho"
  | "webhook";

/** Single thread with a lead on one channel */
export interface ConversationRef {
  id: string;
  lead_id: string;
  channel: ChannelType;
  external_thread_id?: string | null;
}

/** Inbound or outbound message in a conversation */
export interface MessageRef {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  external_id?: string | null;
  created_at: string;
}

/** Appointment (from calendar, CRM, or booking link) */
export interface BookingRef {
  id: string;
  lead_id: string;
  workspace_id: string;
  start_at: string;
  end_at?: string | null;
  status: "scheduled" | "completed" | "no_show" | "cancelled";
  external_id?: string | null;
}

/** Outcome: show / no_show / won / lost / reactivated */
export type OutcomeType = "show" | "no_show" | "won" | "lost" | "reactivated";

export interface OutcomeRef {
  lead_id: string;
  workspace_id: string;
  type: OutcomeType;
  at: string;
  booking_id?: string | null;
}

/** Revenue state (at risk / secured / lost / recovered) */
export type RevenueStateType = "at_risk" | "secured" | "lost" | "recovered";

export interface RevenueStateRef {
  lead_id: string;
  workspace_id: string;
  state: RevenueStateType;
  at: string;
}

/**
 * Normalized inbound event — output of any SourceAdapter.
 * Pipeline: normalize → upsert lead + conversation + message → enqueue decision.
 */
export interface NormalizedInboundEvent {
  workspace_id: string;
  channel: ChannelType;
  participant: ParticipantIdentity;
  message: {
    content: string;
    external_id?: string | null;
  };
  idempotency_key?: string | null;
  schema_version?: string;
}
