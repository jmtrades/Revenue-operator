/**
 * Inbound gaps: find provider inbound messages not yet in canonical signals or messages.
 * Read-only; yields InboundMessageDiscovered candidates.
 */

import { getDb } from "@/lib/db/queries";
import { normalizePhone } from "@/lib/security/phone";
import { getMessagingProvider } from "../providers/messaging";

/**
 * Minimal, strict email validator for PostgREST interpolation safety. This
 * does not aim for full RFC 5322 coverage — it exists to reject the punctuation
 * that lets PostgREST parse extra filter clauses (`,` `.or.` `(` `)` quote),
 * while accepting normal addresses.
 */
const SAFE_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const LOOKBACK_HOURS = 2;

export interface InboundDiscoveredCandidate {
  type: "InboundMessageDiscovered";
  workspace_id: string;
  lead_id: string;
  payload: {
    provider: "twilio" | "generic";
    provider_message_id: string;
    conversation_id?: string | null;
    from: string;
    to: string;
    body: string;
    received_at: string;
    discovered_at: string;
    source: string;
    schema_version: number;
  };
}

export async function detectInboundGaps(workspaceId: string): Promise<InboundDiscoveredCandidate[]> {
  const db = getDb();
  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  const provider = getMessagingProvider();
  const inbound = await provider.listRecentInbound({ workspaceId, since, limit: 50 });
  if (!inbound.length) return [];

  const out: InboundDiscoveredCandidate[] = [];
  for (const row of inbound) {
    const key = `inbound_discovered:${row.provider_message_id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const { data: existing } = await db
      .from("canonical_signals")
      .select("id")
      .eq("idempotency_key", key)
      .maybeSingle();
    if (existing) continue;

    const { data: msgRow } = await db
      .from("messages")
      .select("id")
      .eq("metadata->>external_id", row.provider_message_id)
      .limit(1)
      .maybeSingle();
    if (msgRow) continue;

    const leadId = await resolveLeadFromParticipant(workspaceId, row.from, row.conversation_key);
    if (!leadId) continue;

    out.push({
      type: "InboundMessageDiscovered",
      workspace_id: workspaceId,
      lead_id: leadId,
      payload: {
        provider: "twilio",
        provider_message_id: row.provider_message_id,
        conversation_id: null,
        from: row.from,
        to: row.to,
        body: row.body,
        received_at: row.received_at,
        discovered_at: new Date().toISOString(),
        source: "reconciliation",
        schema_version: 1,
      },
    });
  }
  return out;
}

async function resolveLeadFromParticipant(workspaceId: string, from: string, _conversationKey: string): Promise<string | null> {
  // Phase 78/Phase 3 (D7): `from` comes from external messaging providers and
  // is treated as adversarial. Strict-validate against either E.164 or a
  // conservative email regex before PostgREST interpolation.
  const phoneE164 = normalizePhone(from);
  const emailSafe = !phoneE164 && SAFE_EMAIL.test(from) ? from : null;

  const db = getDb();
  if (phoneE164) {
    const phoneDigits = phoneE164.slice(1);
    const { data: lead } = await db
      .from("leads")
      .select("id")
      .eq("workspace_id", workspaceId)
      .or(`phone.eq.${phoneE164},phone.eq.${phoneDigits}`)
      .limit(1)
      .maybeSingle();
    return (lead as { id: string } | null)?.id ?? null;
  }
  if (emailSafe) {
    const { data: lead } = await db
      .from("leads")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("email", emailSafe)
      .limit(1)
      .maybeSingle();
    return (lead as { id: string } | null)?.id ?? null;
  }
  return null;
}
