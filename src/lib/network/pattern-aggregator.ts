/**
 * Pattern Aggregator — Nightly job.
 * Scans action_logs + outcomes across all workspaces.
 * Buckets by industry and situation. Updates behavioral_patterns.
 * Never stores: message text, company names, or personal identifiers.
 * Only aggregated statistical outcomes.
 */

import { getDb } from "@/lib/db/queries";

const MIN_SAMPLES = 20;
const LOOKBACK_DAYS = 90;
const TIME_BUCKETS = ["0-4h", "4-24h", "24-72h", "72+"];
const HALFLIFE_DAYS = 30;

function toIndustryBucket(businessType: string | null | undefined): string {
  if (!businessType) return "unknown";
  const t = String(businessType).toLowerCase();
  if (t.includes("saas") || t.includes("software")) return "saas";
  if (t.includes("consulting") || t.includes("agency") || t.includes("services")) return "professional_services";
  if (t.includes("shop") || t.includes("store") || t.includes("retail")) return "ecommerce";
  return "other";
}

function toTimeBucket(hoursSinceLast: number): string {
  if (hoursSinceLast < 4) return "0-4h";
  if (hoursSinceLast < 24) return "4-24h";
  if (hoursSinceLast < 72) return "24-72h";
  return "72+";
}

function decayWeight(createdAt: string): number {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / (24 * 60 * 60 * 1000);
  return Math.pow(0.5, ageDays / HALFLIFE_DAYS);
}

export async function runPatternAggregator(): Promise<{ patterns_updated: number }> {
  const db = getDb();
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const { data: settingsRows } = await db
    .from("settings")
    .select("workspace_id, business_type")
    .not("workspace_id", "is", null);
  const workspaceToIndustry = new Map<string, string>();
  for (const r of settingsRows ?? []) {
    const row = r as { workspace_id: string; business_type?: string };
    workspaceToIndustry.set(row.workspace_id, toIndustryBucket(row.business_type));
  }

  const { data: actionRows } = await db
    .from("action_logs")
    .select("workspace_id, entity_id, action, payload, created_at")
    .eq("entity_type", "lead")
    .in("action", ["send_message", "simulated_send_message"])
    .gte("created_at", since.toISOString())
    .limit(10000);

  if (!actionRows || actionRows.length === 0) {
    return { patterns_updated: 0 };
  }

  const leadIds = [...new Set((actionRows as { entity_id: string }[]).map((a) => a.entity_id))];
  const { data: leadsData } = await db
    .from("leads")
    .select("id, workspace_id, state")
    .in("id", leadIds);
  const leadMap = new Map<string, { workspace_id: string; state: string }>();
  for (const l of leadsData ?? []) {
    const row = l as { id: string; workspace_id: string; state: string };
    leadMap.set(row.id, { workspace_id: row.workspace_id, state: row.state });
  }

  const convIds = new Set<string>();
  const { data: convs } = await db.from("conversations").select("id, lead_id").in("lead_id", leadIds);
  for (const c of convs ?? []) {
    convIds.add((c as { id: string }).id);
  }

  let userMessages: Array<{ conversation_id: string; created_at: string }> = [];
  if (convIds.size > 0) {
    const { data: msgs } = await db
      .from("messages")
      .select("conversation_id, created_at")
      .eq("role", "user")
      .in("conversation_id", [...convIds])
      .gte("created_at", since.toISOString());
    userMessages = (msgs ?? []) as Array<{ conversation_id: string; created_at: string }>;
  }
  const convIdByLead = new Map<string, string>();
  for (const c of convs ?? []) {
    const row = c as { id: string; lead_id: string };
    convIdByLead.set(row.lead_id, row.id);
  }

  const { data: eventsData } = await db
    .from("events")
    .select("workspace_id, entity_id, event_type, created_at")
    .eq("entity_type", "lead")
    .in("event_type", ["booking_created", "call_completed"])
    .gte("created_at", since.toISOString())
    .limit(5000);

  const { data: outboundRows } = await db
    .from("outbound_messages")
    .select("lead_id, workspace_id, sent_at")
    .eq("status", "sent")
    .gte("sent_at", since.toISOString())
    .limit(5000);

  const userMsgByConv = new Map<string, Array<{ created_at: string }>>();
  for (const m of userMessages) {
    const list = userMsgByConv.get(m.conversation_id) ?? [];
    list.push({ created_at: m.created_at });
    userMsgByConv.set(m.conversation_id, list);
  }
  for (const [, list] of userMsgByConv) {
    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  const outboundByLead = new Map<string, Array<{ sent_at: string }>>();
  for (const ob of outboundRows ?? []) {
    const row = ob as { lead_id: string; sent_at: string };
    const list = outboundByLead.get(row.lead_id) ?? [];
    list.push({ sent_at: row.sent_at });
    outboundByLead.set(row.lead_id, list);
  }
  for (const [, list] of outboundByLead) {
    list.sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
  }

  type BucketKey = string;
  const counts: Map<BucketKey, Map<string, { weighted: number; total: number }>> = new Map();
  const eventsByLead = new Map<string, Array<{ event_type: string; created_at: string }>>();
  for (const e of eventsData ?? []) {
    const row = e as { entity_id: string; event_type: string; created_at: string };
    const list = eventsByLead.get(row.entity_id) ?? [];
    list.push({ event_type: row.event_type, created_at: row.created_at });
    eventsByLead.set(row.entity_id, list);
  }

  for (const a of actionRows as Array<{ workspace_id: string; entity_id: string; action: string; payload?: { action?: string }; created_at: string }>) {
    const industry = workspaceToIndustry.get(a.workspace_id) ?? "unknown";
    const lead = leadMap.get(a.entity_id);
    const stage = lead?.state ?? "CONTACTED";
    const messageType = (a.payload?.action as string) ?? "follow_up";
    const leadIntentType = "general";
    const dayOfWeek = new Date(a.created_at).getUTCDay();
    const sentAt = new Date(a.created_at);

    const convId = convIdByLead.get(a.entity_id);
    let hoursSinceLast = 72;
    if (convId) {
      const msgs = userMsgByConv.get(convId) ?? [];
      const prevUser = msgs.filter((m) => new Date(m.created_at) < sentAt).pop();
      if (prevUser) {
        hoursSinceLast = (sentAt.getTime() - new Date(prevUser.created_at).getTime()) / (1000 * 60 * 60);
      } else {
        const obs = outboundByLead.get(a.entity_id) ?? [];
        const prevOb = obs.filter((o) => new Date(o.sent_at) < sentAt).pop();
        if (prevOb) {
          hoursSinceLast = (sentAt.getTime() - new Date(prevOb.sent_at).getTime()) / (1000 * 60 * 60);
        }
      }
    }
    const timeBucket = toTimeBucket(hoursSinceLast);
    const weight = decayWeight(a.created_at);

    const key: BucketKey = [industry, leadIntentType, stage, timeBucket, dayOfWeek, messageType].join("|");
    if (!counts.has(key)) {
      counts.set(key, new Map());
    }
    const outcomeMap = counts.get(key)!;

    let outcome: "reply" | "no_reply" | "booked" | "lost" | "revived" | "show" = "no_reply";
    const eventsForLead = eventsByLead.get(a.entity_id) ?? [];
    const afterSent = eventsForLead.filter((e) => new Date(e.created_at) > sentAt);
    const within7d = afterSent.filter((e) => (new Date(e.created_at).getTime() - sentAt.getTime()) < 7 * 24 * 60 * 60 * 1000);

    if (within7d.some((e) => e.event_type === "booking_created")) {
      outcome = "booked";
    } else if (within7d.some((e) => e.event_type === "call_completed")) {
      outcome = "show";
    } else if (convId) {
      const userAfter = (userMsgByConv.get(convId) ?? []).filter((m) => new Date(m.created_at) > sentAt);
      const replyWithin7d = userAfter.some((m) => (new Date(m.created_at).getTime() - sentAt.getTime()) < 7 * 24 * 60 * 60 * 1000);
      if (replyWithin7d) outcome = "reply";
    }

    const entry = outcomeMap.get(outcome) ?? { weighted: 0, total: 0 };
    entry.weighted += weight;
    entry.total += 1;
    outcomeMap.set(outcome, entry);
  }

  let updated = 0;
  for (const [key, outcomeMap] of counts) {
    const [industry, leadIntentType, stage, time_since_last_message_bucket, day_of_week_str, message_type] = key.split("|");
    const day_of_week = parseInt(day_of_week_str, 10);

    const totalWeighted = [...outcomeMap.values()].reduce((s, e) => s + e.weighted, 0);
    const totalSamples = [...outcomeMap.values()].reduce((s, e) => s + e.total, 0);
    if (totalSamples < MIN_SAMPLES) continue;

    for (const [outcome, { weighted }] of outcomeMap) {
      const successRate = totalWeighted > 0 ? weighted / totalWeighted : 0;
      const confidence = Math.min(1, Math.sqrt(totalSamples) / Math.sqrt(200));
      const now = new Date().toISOString();

      await db
        .from("behavioral_patterns")
        .upsert(
          {
            industry,
            lead_intent_type: leadIntentType,
            stage,
            time_since_last_message_bucket,
            day_of_week,
            message_type,
            outcome,
            success_rate: successRate,
            sample_size: totalSamples,
            confidence,
            last_updated_at: now,
          },
          {
            onConflict: "industry,lead_intent_type,stage,time_since_last_message_bucket,day_of_week,message_type,outcome",
          }
        );
      updated++;
    }
  }

  return { patterns_updated: updated };
}
