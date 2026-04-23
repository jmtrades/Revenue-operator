/**
 * Phase 13b — Inbound email ingestion.
 *
 * Takes a raw webhook payload from a supported inbound-email provider and
 * normalizes it into a canonical shape that feeds the reactive event
 * processor as `email_reply` events. Supported providers:
 *
 *   - Resend Inbound  (future-proofed; same event shape as their delivery
 *                      webhook but with `type: "email.received"`)
 *   - Postmark Inbound (`From`, `To`, `Subject`, `TextBody`, `HtmlBody`,
 *                       `MessageID`, `InReplyTo`, `References`)
 *   - SendGrid Parse   (multipart form, but we accept the JSON-equivalent
 *                       fields `from`, `to`, `subject`, `text`, `html`,
 *                       `headers`)
 *   - Generic          (`from`, `to`, `subject`, `text`, `html`,
 *                       `message_id`, `in_reply_to`, `references`)
 *
 * Pure function. No DB IO, no network. The HTTP route persists + dispatches.
 */

export interface NormalizedInboundEmail {
  provider: "resend" | "postmark" | "sendgrid" | "generic";
  fromEmail: string;
  fromName: string | null;
  toEmail: string;
  subject: string;
  text: string;
  html: string | null;
  messageId: string | null;
  inReplyTo: string | null;
  references: string[];
  receivedAt: string;
  raw: Record<string, unknown>;
}

/** Strip "Name <email@host>" → `{ name, email }`. */
export function parseEmailAddress(
  raw: string | null | undefined,
): { name: string | null; email: string | null } {
  if (!raw) return { name: null, email: null };
  const trimmed = raw.trim();
  // "Taylor <taylor@acme.co>" form
  const bracketMatch = trimmed.match(/^(.*?)<\s*([^>]+?)\s*>$/);
  if (bracketMatch) {
    const name = bracketMatch[1].trim().replace(/^"|"$/g, "") || null;
    const email = bracketMatch[2].trim().toLowerCase();
    return { name, email };
  }
  // Bare email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { name: null, email: trimmed.toLowerCase() };
  }
  return { name: trimmed || null, email: null };
}

function parseReferences(raw: string | null | undefined | string[]): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((r) => String(r).trim()).filter(Boolean);
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isoOrNow(v: string | null | undefined): string {
  if (!v) return new Date().toISOString();
  const t = Date.parse(v);
  return Number.isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
}

// ---------------------------------------------------------------------------
// Provider-specific shapes
// ---------------------------------------------------------------------------

export interface PostmarkInbound {
  From?: string;
  FromName?: string;
  To?: string;
  ToFull?: Array<{ Email: string; Name?: string }>;
  Subject?: string;
  TextBody?: string;
  HtmlBody?: string;
  MessageID?: string;
  Headers?: Array<{ Name: string; Value: string }>;
  Date?: string;
}

export interface SendGridParseJson {
  from?: string;
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
  headers?: string; // raw header block
  message_id?: string;
  in_reply_to?: string;
  references?: string;
}

export interface ResendInboundPayload {
  type?: string; // "email.received"
  created_at?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
    headers?: Array<{ name: string; value: string }>;
    in_reply_to?: string;
    references?: string | string[];
  };
}

export interface GenericInboundPayload {
  from?: string;
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
  message_id?: string;
  in_reply_to?: string;
  references?: string | string[];
  received_at?: string;
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

export function normalizePostmarkInbound(p: PostmarkInbound): NormalizedInboundEmail | null {
  const from = parseEmailAddress(p.From);
  if (!from.email) return null;
  const toRaw = p.ToFull?.[0]?.Email ?? p.To ?? "";
  const to = parseEmailAddress(toRaw).email ?? toRaw.trim().toLowerCase();
  if (!to) return null;

  const headerMap = new Map<string, string>();
  for (const h of p.Headers ?? []) headerMap.set(h.Name.toLowerCase(), h.Value);

  return {
    provider: "postmark",
    fromEmail: from.email,
    fromName: from.name ?? p.FromName ?? null,
    toEmail: to,
    subject: p.Subject ?? "",
    text: p.TextBody ?? "",
    html: p.HtmlBody ?? null,
    messageId: p.MessageID ?? headerMap.get("message-id") ?? null,
    inReplyTo: headerMap.get("in-reply-to") ?? null,
    references: parseReferences(headerMap.get("references") ?? null),
    receivedAt: isoOrNow(p.Date),
    raw: p as unknown as Record<string, unknown>,
  };
}

export function normalizeSendgridInbound(p: SendGridParseJson): NormalizedInboundEmail | null {
  const from = parseEmailAddress(p.from);
  if (!from.email) return null;
  const to = parseEmailAddress(p.to).email ?? p.to?.trim().toLowerCase() ?? "";
  if (!to) return null;

  return {
    provider: "sendgrid",
    fromEmail: from.email,
    fromName: from.name,
    toEmail: to,
    subject: p.subject ?? "",
    text: p.text ?? "",
    html: p.html ?? null,
    messageId: p.message_id ?? null,
    inReplyTo: p.in_reply_to ?? null,
    references: parseReferences(p.references ?? null),
    receivedAt: new Date().toISOString(),
    raw: p as unknown as Record<string, unknown>,
  };
}

export function normalizeResendInbound(p: ResendInboundPayload): NormalizedInboundEmail | null {
  if (p.type !== "email.received") return null;
  const from = parseEmailAddress(p.data?.from);
  if (!from.email) return null;
  const toRaw = Array.isArray(p.data?.to) ? p.data?.to?.[0] : p.data?.to;
  const to = parseEmailAddress(toRaw).email ?? toRaw?.trim().toLowerCase() ?? "";
  if (!to) return null;

  const headerMap = new Map<string, string>();
  for (const h of p.data?.headers ?? []) headerMap.set(h.name.toLowerCase(), h.value);

  return {
    provider: "resend",
    fromEmail: from.email,
    fromName: from.name,
    toEmail: to,
    subject: p.data?.subject ?? "",
    text: p.data?.text ?? "",
    html: p.data?.html ?? null,
    messageId: p.data?.email_id ?? headerMap.get("message-id") ?? null,
    inReplyTo: p.data?.in_reply_to ?? headerMap.get("in-reply-to") ?? null,
    references: parseReferences(p.data?.references ?? headerMap.get("references") ?? null),
    receivedAt: isoOrNow(p.created_at),
    raw: p as unknown as Record<string, unknown>,
  };
}

export function normalizeGenericInbound(p: GenericInboundPayload): NormalizedInboundEmail | null {
  const from = parseEmailAddress(p.from);
  if (!from.email) return null;
  const to = parseEmailAddress(p.to).email ?? p.to?.trim().toLowerCase() ?? "";
  if (!to) return null;

  return {
    provider: "generic",
    fromEmail: from.email,
    fromName: from.name,
    toEmail: to,
    subject: p.subject ?? "",
    text: p.text ?? "",
    html: p.html ?? null,
    messageId: p.message_id ?? null,
    inReplyTo: p.in_reply_to ?? null,
    references: parseReferences(p.references ?? null),
    receivedAt: isoOrNow(p.received_at),
    raw: p as unknown as Record<string, unknown>,
  };
}

/**
 * Try each normalizer until one succeeds. Providers rarely overlap, but this
 * keeps the HTTP route simple: forward whatever came in, let the module figure
 * it out.
 */
export function normalizeInboundEmail(
  payload: Record<string, unknown>,
): NormalizedInboundEmail | null {
  // Resend shape — has `type` and `data`.
  if (typeof payload.type === "string" && payload.data && typeof payload.data === "object") {
    const r = normalizeResendInbound(payload as ResendInboundPayload);
    if (r) return r;
  }
  // Postmark shape — PascalCase.
  if (typeof payload.From === "string" || Array.isArray(payload.ToFull)) {
    const r = normalizePostmarkInbound(payload as PostmarkInbound);
    if (r) return r;
  }
  // SendGrid Parse — camel/snake.
  if (typeof payload.from === "string" && (typeof payload.text === "string" || typeof payload.html === "string")) {
    // Could be either sendgrid or generic — they share field names. Default to
    // sendgrid for the header-block semantics; fall through if missing.
    const r = normalizeSendgridInbound(payload as SendGridParseJson);
    if (r) return r;
  }
  // Generic catchall.
  if (typeof payload.from === "string") {
    const r = normalizeGenericInbound(payload as GenericInboundPayload);
    if (r) return r;
  }
  return null;
}

/**
 * Build the `data` payload for a LeadEvent(type:"email_reply") from a
 * normalized inbound email. Consumers of processEvent expect `data.text`.
 */
export function toEmailReplyEventData(n: NormalizedInboundEmail): {
  text: string;
  subject: string;
  from_email: string;
  message_id: string | null;
  in_reply_to: string | null;
  provider: string;
} {
  return {
    text: n.text || n.subject || "",
    subject: n.subject,
    from_email: n.fromEmail,
    message_id: n.messageId,
    in_reply_to: n.inReplyTo,
    provider: n.provider,
  };
}
