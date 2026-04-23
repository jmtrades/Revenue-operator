/**
 * Phase 13a — Email suppression list + delivery-event log.
 *
 * Purpose: every workspace needs a trustworthy send reputation. Once an address
 * hard-bounces, files a spam complaint, or unsubscribes, we must NEVER email it
 * again from that workspace — anything less risks the whole workspace getting
 * its Resend/SendGrid domain slapped down.
 *
 * The public surface is pure: consumers pass in a normalized event, we decide
 * whether to suppress, we return a structured result. The DB IO is injected so
 * tests can run without Supabase.
 */

export type SuppressionReason =
  | "hard_bounce"
  | "soft_bounce_repeated"
  | "complaint"
  | "unsubscribe"
  | "manual"
  | "invalid_address"
  | "list_unsubscribe";

export type SuppressionSource =
  | "system"
  | "resend"
  | "sendgrid"
  | "manual"
  | "import"
  | "reply_classifier";

export type DeliveryEventType =
  | "sent"
  | "delivered"
  | "delivery_delayed"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained"
  | "unsubscribed"
  | "failed";

export type DeliveryProvider = "resend" | "sendgrid" | "postmark" | "ses" | "unknown";

export interface SuppressionRow {
  workspace_id: string;
  email_lower: string;
  reason: SuppressionReason;
  source: SuppressionSource;
  notes?: string | null;
  added_at?: string;
  expires_at?: string | null;
}

export interface DeliveryEventRow {
  workspace_id: string;
  queue_id?: string | null;
  provider: DeliveryProvider;
  provider_event_id?: string | null;
  event_type: DeliveryEventType;
  to_email?: string | null;
  recipient_domain?: string | null;
  occurred_at: string;
  metadata?: Record<string, unknown>;
}

/**
 * Minimal injectable DB surface — tests pass a fake, runtime passes a Supabase
 * wrapper. We keep this narrow on purpose so we don't leak Supabase's chain API.
 */
export interface SuppressionWriter {
  findSuppression: (workspaceId: string, emailLower: string) => Promise<SuppressionRow | null>;
  upsertSuppression: (row: SuppressionRow) => Promise<void>;
  insertDeliveryEvent: (row: DeliveryEventRow) => Promise<{ inserted: boolean }>;
}

/** Normalize an email for list lookup. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Is this address suppressed in this workspace? */
export async function isEmailSuppressed(
  workspaceId: string,
  email: string,
  writer: SuppressionWriter,
): Promise<{ suppressed: boolean; reason?: SuppressionReason }> {
  const lower = normalizeEmail(email);
  if (!lower || !lower.includes("@")) return { suppressed: true, reason: "invalid_address" };
  const row = await writer.findSuppression(workspaceId, lower);
  if (!row) return { suppressed: false };
  // Honor optional expiry.
  if (row.expires_at && Date.parse(row.expires_at) < Date.now()) {
    return { suppressed: false };
  }
  return { suppressed: true, reason: row.reason };
}

/** Add an address to the suppression list. Idempotent (upsert on (workspace, email_lower)). */
export async function suppressEmail(
  workspaceId: string,
  email: string,
  reason: SuppressionReason,
  source: SuppressionSource,
  writer: SuppressionWriter,
  opts?: { notes?: string; expiresAt?: string | null },
): Promise<void> {
  const lower = normalizeEmail(email);
  if (!lower || !lower.includes("@")) return;
  await writer.upsertSuppression({
    workspace_id: workspaceId,
    email_lower: lower,
    reason,
    source,
    notes: opts?.notes ?? null,
    added_at: new Date().toISOString(),
    expires_at: opts?.expiresAt ?? null,
  });
}

// ---------------------------------------------------------------------------
// Resend webhook normalization
// ---------------------------------------------------------------------------

/**
 * Resend delivery webhook shape. Resend sends one POST per event.
 * Shape: { type: "email.bounced", created_at, data: { email_id, from, to, subject, bounce?: {...} } }
 */
export interface ResendWebhookPayload {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[] | string;
    subject?: string;
    bounce?: {
      message?: string;
      type?: string; // "hard" | "soft"
    };
    complained?: {
      feedback_type?: string;
    };
    tags?: Array<{ name: string; value: string }>;
    headers?: Array<{ name: string; value: string }>;
  };
}

/** Map a Resend webhook `type` field to our canonical DeliveryEventType. */
export function mapResendEventType(type: string | undefined): DeliveryEventType | null {
  if (!type) return null;
  switch (type.toLowerCase()) {
    case "email.sent":
      return "sent";
    case "email.delivered":
      return "delivered";
    case "email.delivery_delayed":
      return "delivery_delayed";
    case "email.opened":
      return "opened";
    case "email.clicked":
      return "clicked";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    case "email.unsubscribed":
      return "unsubscribed";
    case "email.failed":
      return "failed";
    default:
      return null;
  }
}

export interface NormalizedResendEvent {
  eventType: DeliveryEventType;
  providerEventId: string | null;
  toEmail: string | null;
  recipientDomain: string | null;
  occurredAt: string;
  bounceType: "hard" | "soft" | null;
  raw: ResendWebhookPayload;
}

export function normalizeResendWebhook(
  payload: ResendWebhookPayload,
): NormalizedResendEvent | null {
  const eventType = mapResendEventType(payload.type);
  if (!eventType) return null;

  const toRaw = payload.data?.to;
  const to = Array.isArray(toRaw) ? toRaw[0] : toRaw ?? null;
  const toEmail = to ? normalizeEmail(to) : null;
  const recipientDomain = toEmail && toEmail.includes("@") ? toEmail.split("@")[1] : null;

  const providerEventId = payload.data?.email_id ?? null;
  const occurredAt =
    payload.created_at && !Number.isNaN(Date.parse(payload.created_at))
      ? new Date(payload.created_at).toISOString()
      : new Date().toISOString();

  let bounceType: "hard" | "soft" | null = null;
  const bt = payload.data?.bounce?.type?.toLowerCase();
  if (bt === "hard" || bt === "soft") bounceType = bt;

  return {
    eventType,
    providerEventId,
    toEmail,
    recipientDomain,
    occurredAt,
    bounceType,
    raw: payload,
  };
}

/**
 * Decide if a delivery event should add the recipient to the suppression list.
 * Pure — no DB access. Returns the reason to suppress, or null.
 */
export function suppressionReasonForEvent(
  ev: Pick<NormalizedResendEvent, "eventType" | "bounceType">,
): SuppressionReason | null {
  if (ev.eventType === "bounced" && ev.bounceType === "hard") return "hard_bounce";
  if (ev.eventType === "bounced" && ev.bounceType !== "hard") return null; // soft bounces handled by threshold logic
  if (ev.eventType === "complained") return "complaint";
  if (ev.eventType === "unsubscribed") return "unsubscribe";
  if (ev.eventType === "failed") return null; // transient; don't auto-suppress
  return null;
}

/**
 * Apply a normalized Resend event end-to-end: log the delivery event (deduped)
 * and — if it implies a durable suppression — add the recipient to the list.
 *
 * Returns a structured summary so the HTTP handler can respond with helpful
 * diagnostics without leaking internals.
 */
export async function applyResendEvent(
  workspaceId: string,
  ev: NormalizedResendEvent,
  writer: SuppressionWriter,
  opts?: { queueId?: string | null },
): Promise<{
  eventInserted: boolean;
  suppressed: boolean;
  suppressionReason: SuppressionReason | null;
}> {
  const { inserted } = await writer.insertDeliveryEvent({
    workspace_id: workspaceId,
    queue_id: opts?.queueId ?? null,
    provider: "resend",
    provider_event_id: ev.providerEventId,
    event_type: ev.eventType,
    to_email: ev.toEmail,
    recipient_domain: ev.recipientDomain,
    occurred_at: ev.occurredAt,
    metadata: (ev.raw.data ?? {}) as Record<string, unknown>,
  });

  const reason = suppressionReasonForEvent(ev);
  if (reason && ev.toEmail) {
    await suppressEmail(workspaceId, ev.toEmail, reason, "resend", writer, {
      notes: `Auto-added from Resend ${ev.eventType} at ${ev.occurredAt}`,
    });
    return { eventInserted: inserted, suppressed: true, suppressionReason: reason };
  }

  return { eventInserted: inserted, suppressed: false, suppressionReason: null };
}

/**
 * Minimal shape of the Supabase-like client used here. Only `from` is
 * exercised; the downstream chainable builders are inferred via `unknown` +
 * runtime casts so we stay off `any` without pulling Supabase generics in.
 */
type SuppressionDbClient = {
  from: (table: string) => unknown;
};

type SuppressionChainable = PromiseLike<{ data: unknown; error: unknown }> & {
  select: (cols: string) => SuppressionChainable;
  insert: (row: unknown) => SuppressionChainable;
  upsert: (row: unknown, opts?: { onConflict: string }) => SuppressionChainable;
  eq: (col: string, val: unknown) => SuppressionChainable;
  maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }>;
};

/**
 * Build the runtime SuppressionWriter on top of Supabase `getDb()`. Kept out of
 * the pure module so the pure functions stay DB-free.
 */
export function createSupabaseSuppressionWriter(
  db: SuppressionDbClient
): SuppressionWriter {
  const table = (name: string) => db.from(name) as unknown as SuppressionChainable;
  return {
    async findSuppression(workspaceId, emailLower) {
      const { data } = await table("email_suppression_list")
        .select("workspace_id, email_lower, reason, source, notes, added_at, expires_at")
        .eq("workspace_id", workspaceId)
        .eq("email_lower", emailLower)
        .maybeSingle();
      return (data as SuppressionRow | null) ?? null;
    },
    async upsertSuppression(row) {
      // Upsert — idempotent on (workspace_id, email_lower).
      await table("email_suppression_list")
        .upsert(row, { onConflict: "workspace_id,email_lower" });
    },
    async insertDeliveryEvent(row) {
      // Dedup on (workspace_id, provider, provider_event_id).
      if (row.provider_event_id) {
        const { data: existing } = await table("email_delivery_events")
          .select("id")
          .eq("workspace_id", row.workspace_id)
          .eq("provider", row.provider)
          .eq("provider_event_id", row.provider_event_id)
          .maybeSingle();
        if (existing) return { inserted: false };
      }
      await table("email_delivery_events").insert(row);
      return { inserted: true };
    },
  };
}
