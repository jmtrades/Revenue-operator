/**
 * Phase 14 — Inbound SMS normalizer.
 *
 * Accepts webhooks from Twilio, Bandwidth, Telnyx, and a generic JSON shape
 * and returns a single canonical `NormalizedInboundSMS` the rest of the
 * pipeline consumes. Pure — no I/O, no DB.
 *
 * Twilio posts form-encoded bodies with fields like From, To, Body,
 * MessageSid. Bandwidth posts JSON events arrays with type=message-received.
 * Telnyx posts JSON with data.event_type=message.received.
 */

export type SmsProvider = "twilio" | "bandwidth" | "telnyx" | "generic";

export interface NormalizedInboundSMS {
  provider: SmsProvider;
  fromNumber: string;
  toNumber: string;
  body: string;
  messageId: string | null;
  receivedAt: string;
  numSegments: number;
  mediaUrls: string[];
  raw: Record<string, unknown>;
}

function digits(s: string | null | undefined): string | null {
  if (!s) return null;
  const d = s.replace(/\D/g, "");
  return d.length >= 10 ? d : null;
}

function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("+") && /^[+][0-9]{7,15}$/.test(trimmed)) return trimmed;
  const d = digits(trimmed);
  if (!d) return null;
  // US default when 10/11 digits
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return `+${d}`;
}

export interface TwilioSmsForm {
  From?: string;
  To?: string;
  Body?: string;
  MessageSid?: string;
  SmsSid?: string;
  NumSegments?: string;
  NumMedia?: string;
  [k: `MediaUrl${number}`]: string | undefined;
}

export function normalizeTwilioSms(p: TwilioSmsForm): NormalizedInboundSMS | null {
  const from = toE164(p.From);
  const to = toE164(p.To);
  if (!from || !to) return null;
  const numMedia = Number.parseInt(p.NumMedia ?? "0", 10) || 0;
  const mediaUrls: string[] = [];
  for (let i = 0; i < numMedia; i++) {
    const key = `MediaUrl${i}` as const;
    const url = p[key];
    if (typeof url === "string" && url.length) mediaUrls.push(url);
  }
  return {
    provider: "twilio",
    fromNumber: from,
    toNumber: to,
    body: p.Body ?? "",
    messageId: p.MessageSid ?? p.SmsSid ?? null,
    receivedAt: new Date().toISOString(),
    numSegments: Number.parseInt(p.NumSegments ?? "1", 10) || 1,
    mediaUrls,
    raw: p as unknown as Record<string, unknown>,
  };
}

export interface BandwidthMessageEvent {
  type?: string;
  time?: string;
  message?: {
    id?: string;
    from?: string;
    to?: string | string[];
    text?: string;
    segmentCount?: number;
    media?: string[];
  };
}

export function normalizeBandwidthSms(p: BandwidthMessageEvent): NormalizedInboundSMS | null {
  if (!p.message) return null;
  const from = toE164(p.message.from);
  const rawTo = Array.isArray(p.message.to) ? p.message.to[0] : p.message.to;
  const to = toE164(rawTo);
  if (!from || !to) return null;
  return {
    provider: "bandwidth",
    fromNumber: from,
    toNumber: to,
    body: p.message.text ?? "",
    messageId: p.message.id ?? null,
    receivedAt: p.time ?? new Date().toISOString(),
    numSegments: p.message.segmentCount ?? 1,
    mediaUrls: p.message.media ?? [],
    raw: p as unknown as Record<string, unknown>,
  };
}

export interface TelnyxMessageEvent {
  data?: {
    event_type?: string;
    occurred_at?: string;
    payload?: {
      id?: string;
      from?: { phone_number?: string };
      to?: Array<{ phone_number?: string }>;
      text?: string;
      parts?: number;
      media?: Array<{ url?: string }>;
    };
  };
}

export function normalizeTelnyxSms(p: TelnyxMessageEvent): NormalizedInboundSMS | null {
  const payload = p.data?.payload;
  if (!payload) return null;
  if (p.data?.event_type && !p.data.event_type.includes("message.received")) return null;
  const from = toE164(payload.from?.phone_number);
  const to = toE164(payload.to?.[0]?.phone_number);
  if (!from || !to) return null;
  return {
    provider: "telnyx",
    fromNumber: from,
    toNumber: to,
    body: payload.text ?? "",
    messageId: payload.id ?? null,
    receivedAt: p.data?.occurred_at ?? new Date().toISOString(),
    numSegments: payload.parts ?? 1,
    mediaUrls: (payload.media ?? []).map((m) => m.url ?? "").filter((u) => u.length > 0),
    raw: p as unknown as Record<string, unknown>,
  };
}

export interface GenericInboundSmsPayload {
  from: string;
  to: string;
  text?: string;
  body?: string;
  message_id?: string | null;
  received_at?: string;
  media_urls?: string[];
  num_segments?: number;
}

export function normalizeGenericSms(p: GenericInboundSmsPayload): NormalizedInboundSMS | null {
  const from = toE164(p.from);
  const to = toE164(p.to);
  if (!from || !to) return null;
  return {
    provider: "generic",
    fromNumber: from,
    toNumber: to,
    body: p.text ?? p.body ?? "",
    messageId: p.message_id ?? null,
    receivedAt: p.received_at ?? new Date().toISOString(),
    numSegments: p.num_segments ?? 1,
    mediaUrls: p.media_urls ?? [],
    raw: p as unknown as Record<string, unknown>,
  };
}

/** Auto-detect the SMS payload's provider and normalize. */
export function normalizeInboundSms(
  payload: Record<string, unknown>,
): NormalizedInboundSMS | null {
  // Twilio form keys are PascalCase: From, To, Body, MessageSid
  if (typeof payload.From === "string" && typeof payload.To === "string") {
    return normalizeTwilioSms(payload as unknown as TwilioSmsForm);
  }
  // Bandwidth: { type, message: { from, to, text } }
  if (typeof payload.type === "string" && typeof payload.message === "object") {
    return normalizeBandwidthSms(payload as unknown as BandwidthMessageEvent);
  }
  // Telnyx: { data: { event_type, payload } }
  if (typeof payload.data === "object" && payload.data !== null) {
    const d = payload.data as { event_type?: string };
    if (typeof d.event_type === "string") {
      return normalizeTelnyxSms(payload as unknown as TelnyxMessageEvent);
    }
  }
  // Generic snake_case
  if (typeof payload.from === "string" && typeof payload.to === "string") {
    return normalizeGenericSms(payload as unknown as GenericInboundSmsPayload);
  }
  return null;
}

/**
 * Translate a normalized inbound SMS into the event-data shape the
 * reactive-event-processor worker consumes.
 */
export function toSmsReplyEventData(n: NormalizedInboundSMS): {
  text: string;
  from_number: string;
  to_number: string;
  message_id: string | null;
  provider: SmsProvider;
  received_at: string;
  media_urls: string[];
} {
  return {
    text: n.body,
    from_number: n.fromNumber,
    to_number: n.toNumber,
    message_id: n.messageId,
    provider: n.provider,
    received_at: n.receivedAt,
    media_urls: n.mediaUrls,
  };
}
