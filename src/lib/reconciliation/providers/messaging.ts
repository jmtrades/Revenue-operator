/**
 * Messaging provider read API for reconciliation. No direct state writes.
 */

export interface InboundRow {
  provider_message_id: string;
  from: string;
  to: string;
  body: string;
  received_at: string;
  conversation_key: string;
}

export interface AllMessageRow {
  provider_message_id: string;
  direction: "inbound" | "outbound";
  from: string;
  to: string;
  body: string;
  at: string;
  conversation_key: string;
  author_hint?: "human" | "operator" | "unknown";
}

export interface MessagingReadProvider {
  listRecentInbound(params: {
    workspaceId: string;
    since: string;
    limit: number;
  }): Promise<InboundRow[]>;
  listRecentAll(params: {
    workspaceId: string;
    since: string;
    limit: number;
  }): Promise<AllMessageRow[]>;
}

const FETCH_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(url: string, opts: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Unified messaging provider: list recent messages.
 * Supports both Telnyx and Twilio providers for message reconciliation.
 */

interface TelnyxMessage {
  id: string;
  from: { phone_number: string };
  to: Array<{ phone_number: string }>;
  text: string;
  received_at: string;
  direction: "inbound" | "outbound";
}

async function listTelnyxMessages(since: string, limit: number): Promise<AllMessageRow[]> {
  const apiKey = process.env.TELNYX_API_KEY;
  if (!apiKey) return [];

  const sinceDate = new Date(since);
  const url = `https://api.telnyx.com/v2/messages?page[size]=${Math.min(limit, 100)}`;

  try {
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: TelnyxMessage[] };
    const messages = json.data ?? [];
    const out: AllMessageRow[] = [];
    for (const m of messages) {
      const at = new Date(m.received_at);
      if (at < sinceDate) continue;
      out.push({
        provider_message_id: m.id,
        direction: m.direction === "inbound" ? "inbound" : "outbound",
        from: m.from?.phone_number ?? "",
        to: m.to?.[0]?.phone_number ?? "",
        body: m.text ?? "",
        at: m.received_at,
        conversation_key: m.direction === "inbound" ? (m.from?.phone_number ?? "") : (m.to?.[0]?.phone_number ?? ""),
        author_hint: m.direction === "inbound" ? "unknown" : "operator",
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

async function listTwilioMessages(workspaceId: string, since: string, limit: number, inboundOnly: boolean): Promise<AllMessageRow[]> {
  const db = (await import("@/lib/db/queries")).getDb();
  const { data: phoneConfig } = await db
    .from("phone_configs")
    .select("twilio_account_sid, proxy_number")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .maybeSingle();
  const accountSid = (phoneConfig as { twilio_account_sid?: string } | null)?.twilio_account_sid ?? process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return [];

  const toParam = inboundOnly ? `&To=${encodeURIComponent(process.env.TWILIO_PHONE_NUMBER ?? "")}` : "";
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json?PageSize=${Math.min(limit, 100)}${toParam}`;
  try {
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64") },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { messages?: Array<{ sid: string; From: string; To: string; Body: string; DateCreated: string; Direction: string }> };
    const messages = json.messages ?? [];
    const sinceDate = new Date(since);
    const out: AllMessageRow[] = [];
    for (const m of messages) {
      if (inboundOnly && m.Direction !== "inbound") continue;
      const at = new Date(m.DateCreated);
      if (at < sinceDate) continue;
      out.push({
        provider_message_id: m.sid,
        direction: m.Direction === "inbound" ? "inbound" : "outbound",
        from: m.From,
        to: m.To,
        body: m.Body ?? "",
        at: m.DateCreated,
        conversation_key: m.Direction === "inbound" ? m.From : m.To,
        author_hint: m.Direction === "inbound" ? "unknown" : "operator",
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function createMessagingProvider(): MessagingReadProvider {
  return {
    async listRecentInbound({ workspaceId, since, limit }) {
      const { getTelephonyProvider } = await import("@/lib/telephony/get-telephony-provider");
      const provider = getTelephonyProvider();

      if (provider === "telnyx") {
        const all = await listTelnyxMessages(since, limit);
        return all
          .filter((m) => m.direction === "inbound")
          .map((m) => ({
            provider_message_id: m.provider_message_id,
            from: m.from,
            to: m.to,
            body: m.body,
            received_at: m.at,
            conversation_key: m.conversation_key,
          }));
      }

      const all = await listTwilioMessages(workspaceId, since, limit, true);
      return all.map((m) => ({
        provider_message_id: m.provider_message_id,
        from: m.from,
        to: m.to,
        body: m.body,
        received_at: m.at,
        conversation_key: m.conversation_key,
      }));
    },

    async listRecentAll({ workspaceId, since, limit }) {
      const { getTelephonyProvider } = await import("@/lib/telephony/get-telephony-provider");
      const provider = getTelephonyProvider();

      if (provider === "telnyx") {
        return listTelnyxMessages(since, limit);
      }

      return listTwilioMessages(workspaceId, since, limit, false);
    },
  };
}

/** @deprecated Use createMessagingProvider instead */
export const createTwilioMessagingProvider = createMessagingProvider;

export function getMessagingProvider(): MessagingReadProvider {
  return createMessagingProvider();
}
