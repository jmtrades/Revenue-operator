/**
 * Human override drift: find outbound messages from provider that look human-authored
 * but are not recorded with approved_by_human=true. Yields HumanReplyDiscovered.
 * Read-only.
 */

import { getDb } from "@/lib/db/queries";
import { getMessagingProvider } from "../providers/messaging";

const LOOKBACK_HOURS = 2;

export interface HumanReplyDiscoveredCandidate {
  type: "HumanReplyDiscovered";
  workspace_id: string;
  lead_id: string;
  payload: Record<string, unknown>;
}

export async function detectHumanOverride(workspaceId: string): Promise<HumanReplyDiscoveredCandidate[]> {
  const db = getDb();
  const provider = getMessagingProvider();
  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  const all = await provider.listRecentAll({ workspaceId, since, limit: 100 });
  const outbound = all.filter((m) => m.direction === "outbound");
  if (!outbound.length) return [];

  const out: HumanReplyDiscoveredCandidate[] = [];
  for (const row of outbound) {
    const key = `human_reply:${row.provider_message_id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const { data: existing } = await db.from("canonical_signals").select("id").eq("idempotency_key", key).maybeSingle();
    if (existing) continue;

    const leadId = await resolveLeadFromConversationKey(workspaceId, row.conversation_key);
    if (!leadId) continue;

    const { data: msg } = await db
      .from("messages")
      .select("id, approved_by_human")
      .eq("metadata->>external_id", row.provider_message_id)
      .limit(1)
      .maybeSingle();
    const approved = (msg as { approved_by_human?: boolean } | null)?.approved_by_human === true;
    if (approved) continue;

    out.push({
      type: "HumanReplyDiscovered",
      workspace_id: workspaceId,
      lead_id: leadId,
      payload: {
        provider: "twilio",
        lead_id: leadId,
        provider_message_id: row.provider_message_id,
        body: row.body,
        sent_at: row.at,
        discovered_at: new Date().toISOString(),
        evidence: "approved_by_human_missing",
        source: "reconciliation",
        schema_version: 1,
      },
    });
  }
  return out;
}

async function resolveLeadFromConversationKey(workspaceId: string, conversationKey: string): Promise<string | null> {
  const db = getDb();
  const phone = conversationKey.replace(/[^0-9+]/g, "");
  const { data: lead } = await db
    .from("leads")
    .select("id")
    .eq("workspace_id", workspaceId)
    .or(`phone.eq.${phone},email.eq.${conversationKey}`)
    .limit(1)
    .maybeSingle();
  return (lead as { id: string } | null)?.id ?? null;
}
