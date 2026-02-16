/**
 * Signal Layer — Ground Truth
 * All business events normalize to these canonical types. No business logic in connectors.
 * Reconciliation layer adds discovery signals (source: reconciliation, schema_version, discovered_at).
 */

export const CANONICAL_SIGNAL_TYPES = [
  "InboundMessageReceived",
  "OutboundMessageSent",
  "BookingCreated",
  "BookingCancelled",
  "AppointmentStarted",
  "AppointmentCompleted",
  "AppointmentMissed",
  "PaymentCaptured",
  "CustomerReplied",
  "CustomerInactiveTimeout",
  // Reconciliation discovery (re-prove external truth)
  "InboundMessageDiscovered",
  "BookingModified",
  "HumanReplyDiscovered",
  "RefundIssued",
] as const;

export type CanonicalSignalType = (typeof CANONICAL_SIGNAL_TYPES)[number];

/** Minimal payloads per type. All have occurred_at at write time if not provided. */
export interface SignalPayloadInbound {
  conversation_id: string;
  message_id: string;
  content: string;
  channel: string;
  external_id?: string | null;
  occurred_at?: string;
}

export interface SignalPayloadOutbound {
  message_id: string;
  channel: string;
  status: "sent" | "delivered" | "failed";
  occurred_at?: string;
}

export interface SignalPayloadBooking {
  booking_id?: string | null;
  start_at: string;
  end_at?: string | null;
  occurred_at?: string;
}

export interface SignalPayloadPayment {
  amount_cents: number;
  occurred_at?: string;
}

export interface SignalPayloadInactive {
  last_activity_at: string;
  occurred_at?: string;
}

/** Reconciliation payloads (minimal, versioned; source=reconciliation, schema_version=1, discovered_at=now). */
export interface ReconInboundDiscovered {
  provider: "twilio" | "generic";
  provider_message_id: string;
  conversation_id?: string | null;
  from: string;
  to: string;
  body: string;
  received_at: string;
  discovered_at: string;
  source: "reconciliation";
  schema_version: number;
}
export interface ReconBookingModified {
  provider: "calendar";
  booking_id: string;
  external_event_id: string;
  previous_start_at: string;
  new_start_at: string;
  reason?: string | null;
  discovered_at: string;
  source: "reconciliation";
  schema_version: number;
}
export interface ReconBookingCancelled {
  provider: "calendar";
  booking_id: string;
  external_event_id: string;
  cancelled_at: string;
  discovered_at: string;
  source: "reconciliation";
  schema_version: number;
}
export interface ReconAppointmentCompleted {
  provider: "calendar" | "zoom";
  booking_id: string;
  external_event_id?: string | null;
  completed_at: string;
  discovered_at: string;
  evidence?: "meeting_duration" | "attendance_flag" | "join_logs";
  source: "reconciliation";
  schema_version: number;
}
export interface ReconAppointmentMissed {
  provider: "calendar" | "zoom";
  booking_id: string;
  external_event_id?: string | null;
  missed_at: string;
  discovered_at: string;
  evidence?: "no_show_flag" | "no_join";
  source: "reconciliation";
  schema_version: number;
}
export interface ReconHumanReplyDiscovered {
  provider: "twilio" | "generic";
  lead_id: string;
  conversation_id?: string | null;
  provider_message_id: string;
  body: string;
  sent_at: string;
  discovered_at: string;
  evidence?: "approved_by_human_missing" | "author_mismatch";
  source: "reconciliation";
  schema_version: number;
}
export interface ReconPaymentCaptured {
  provider: "stripe";
  payment_id: string;
  amount_cents: number;
  captured_at: string;
  discovered_at: string;
  deal_id?: string | null;
  source: "reconciliation";
  schema_version: number;
}
export interface ReconRefundIssued {
  provider: "stripe";
  refund_id: string;
  amount_cents: number;
  refunded_at: string;
  discovered_at: string;
  payment_id?: string | null;
  source: "reconciliation";
  schema_version: number;
}

export type CanonicalSignalPayload =
  | SignalPayloadInbound
  | SignalPayloadOutbound
  | SignalPayloadBooking
  | SignalPayloadPayment
  | SignalPayloadInactive
  | ReconInboundDiscovered
  | ReconBookingModified
  | ReconBookingCancelled
  | ReconAppointmentCompleted
  | ReconAppointmentMissed
  | ReconHumanReplyDiscovered
  | ReconPaymentCaptured
  | ReconRefundIssued
  | Record<string, unknown>;

export interface CanonicalSignal {
  workspace_id: string;
  lead_id: string;
  signal_type: CanonicalSignalType;
  idempotency_key: string;
  payload: CanonicalSignalPayload;
  occurred_at: string;
}

/**
 * Build idempotency key for a signal. Same key => duplicate => skip.
 * Format: signal_type:workspace_id:lead_id:external_unique_id
 */
export function idempotencyKey(
  signalType: CanonicalSignalType,
  workspaceId: string,
  leadId: string,
  externalUniqueId: string
): string {
  const safe = externalUniqueId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
  return `${signalType}:${workspaceId}:${leadId}:${safe}`;
}

/**
 * Stable idempotency keys for reconciliation signals (provider IDs + type; no lead in key when discovery is global).
 */
export function reconciliationIdempotencyKey(
  type: "InboundMessageDiscovered" | "BookingModified" | "BookingCancelled" | "AppointmentCompleted" | "AppointmentMissed" | "HumanReplyDiscovered" | "PaymentCaptured" | "RefundIssued",
  payload: Record<string, unknown>
): string {
  switch (type) {
    case "InboundMessageDiscovered":
      return `inbound_discovered:${String(payload.provider_message_id ?? "").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    case "BookingModified":
      return `booking_modified:${String(payload.external_event_id ?? "").replace(/[^a-zA-Z0-9_-]/g, "_")}:${String(payload.new_start_at ?? "").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    case "BookingCancelled":
      return `booking_cancelled:${String(payload.external_event_id ?? "").replace(/[^a-zA-Z0-9_-]/g, "_")}:${String(payload.cancelled_at ?? "").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    case "AppointmentCompleted":
      return `appt_completed:${String(payload.external_event_id ?? payload.booking_id ?? "").replace(/[^a-zA-Z0-9_-]/g, "_")}:${String(payload.completed_at ?? "").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    case "AppointmentMissed":
      return `appt_missed:${String(payload.external_event_id ?? payload.booking_id ?? "").replace(/[^a-zA-Z0-9_-]/g, "_")}:${String(payload.missed_at ?? "").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    case "HumanReplyDiscovered":
      return `human_reply:${String(payload.provider_message_id ?? "").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    case "PaymentCaptured":
      return `payment_captured:${String(payload.payment_id ?? "").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    case "RefundIssued":
      return `refund_issued:${String(payload.refund_id ?? "").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    default:
      return `recon:${type}:${crypto.randomUUID()}`;
  }
}
