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
 * Twilio: list recent inbound messages. Returns empty if creds missing or API fails.
 */
export function createTwilioMessagingProvider(): MessagingReadProvider {
  return {
    async listRecentInbound({ workspaceId, since, limit }) {
      const db = (await import("@/lib/db/queries")).getDb();
      const { data: phoneConfig } = await db
        .from("phone_configs")
        .select("twilio_account_sid")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .maybeSingle();
      const accountSid = (phoneConfig as { twilio_account_sid?: string } | null)?.twilio_account_sid ?? process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (!accountSid || !authToken) return [];

      const sinceDate = new Date(since);
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json?PageSize=${Math.min(limit, 100)}&To=${encodeURIComponent(process.env.TWILIO_PHONE_NUMBER ?? "")}`;
      try {
        const res = await fetchWithTimeout(url, {
          headers: { Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64") },
        });
        if (!res.ok) return [];
        const json = (await res.json()) as { messages?: Array<{ sid: string; From: string; To: string; Body: string; DateCreated: string; Direction: string }> };
        const messages = json.messages ?? [];
        const out: InboundRow[] = [];
        for (const m of messages) {
          if (m.Direction !== "inbound") continue;
          const created = new Date(m.DateCreated);
          if (created < sinceDate) continue;
          out.push({
            provider_message_id: m.sid,
            from: m.From,
            to: m.To,
            body: m.Body ?? "",
            received_at: m.DateCreated,
            conversation_key: m.From,
          });
          if (out.length >= limit) break;
        }
        return out;
      } catch {
        return [];
      }
    },

    async listRecentAll({ workspaceId, since, limit }) {
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

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json?PageSize=${Math.min(limit, 100)}`;
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
    },
  };
}

export function getMessagingProvider(): MessagingReadProvider {
  return createTwilioMessagingProvider();
}
