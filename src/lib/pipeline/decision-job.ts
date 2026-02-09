/**
 * decisionJob: read state -> AI classification -> choose action -> template-slot message
 * -> safety check -> execute send (or safe fallback) -> log. NEVER block on approval.
 */

import { getDb } from "@/lib/db/queries";
import { fillSlots } from "@/lib/ai/templates";
import {
  mergeSettings,
  checkPolicy,
  getSafeFallback,
  isWithinBusinessHours,
  passesCooldownLadder,
  passesStageLimit,
} from "@/lib/autopilot";
import { canSend, getFallbackChannel } from "@/lib/channels/capabilities";
import { getWarmupLimit } from "@/lib/warmup";
import { incrementMetric, METRIC_KEYS } from "@/lib/observability/metrics";
import type { LeadState } from "@/lib/types";
import { ALLOWED_ACTIONS_BY_STATE } from "@/lib/types";
import { redact } from "@/lib/redact";

const SAFE_FALLBACK_MESSAGES: Record<string, string> = {
  clarifying_question: "Thanks for reaching out. Could you tell me a bit more about what you're looking for?",
  book_cta: "I'd be happy to help. Would you like to schedule a quick call to discuss?",
  greeting: "Hi! Thanks for your message. How can I help you today?",
};

export async function runDecisionJob(
  leadId: string,
  workspaceId: string
): Promise<void> {
  const db = getDb();
  const { data: lead, error: leadErr } = await db
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .single();

  if (leadErr || !lead) {
    console.error("[decisionJob] lead not found", redact({ leadId }));
    return;
  }

  const { data: settingsRow } = await db
    .from("settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .single();

  const settings = mergeSettings(settingsRow as Partial<import("@/lib/autopilot").WorkspaceSettings> | undefined);

  const state = lead.state as LeadState;
  const allowedActions = ALLOWED_ACTIONS_BY_STATE[state] ?? [];

  if (allowedActions.length === 0) return;

  if (lead.opt_out) return;

  if (settings.vip_rules.exclude_from_messaging) {
    const domains = settings.vip_rules.domains ?? [];
    const company = (lead.company ?? "").toLowerCase();
    if (lead.is_vip || domains.some((d: string) => company.includes(d.toLowerCase()))) {
      return;
    }
  }

  let action = allowedActions[0];
  let message = "";
  let confidence = 0.9;

  const { data: convRow } = await db.from("conversations").select("id").eq("lead_id", leadId).limit(1).single();
  const convId = (convRow as { id?: string })?.id;
  if (!convId) return;

  try {
    const { data: messages } = await db
      .from("messages")
      .select("content, role")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: false })
      .limit(5);

    const lastUserMsg = (messages ?? []).find((m: { role: string }) => m.role === "user")?.content ?? "";
    const result = await fillSlots(action, {
      leadName: lead.name ?? undefined,
      company: lead.company ?? undefined,
      lastMessage: lastUserMsg,
    });
    message = result.message;
    confidence = result.confidence;
  } catch (err) {
    console.error("[decisionJob] AI fillSlots failed", redact({ leadId, err: String(err) }));
    action = getSafeFallback(settings, allowedActions);
    message = SAFE_FALLBACK_MESSAGES[action] ?? SAFE_FALLBACK_MESSAGES.clarifying_question;
  }

  if (confidence < 0.6) {
    action = getSafeFallback(settings, allowedActions);
    message = SAFE_FALLBACK_MESSAGES[action] ?? SAFE_FALLBACK_MESSAGES.clarifying_question;
  }

  if (!isWithinBusinessHours(settings)) return;

  const { data: wsRow } = await db.from("workspaces").select("created_at, status").eq("id", workspaceId).single();
  const ws = wsRow as { created_at?: string; status?: string } | undefined;
  if (ws?.status === "paused") return;
  const wsCreated = ws?.created_at ? new Date(ws.created_at) : new Date();
  const warmupLimit = getWarmupLimit(wsCreated);
  if (warmupLimit < Number.POSITIVE_INFINITY) {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const { count: warmupToday } = await db
      .from("outbound_messages")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("sent_at", todayStart.toISOString());
    if ((warmupToday ?? 0) >= warmupLimit) return;
  }

  const { data: convRow2 } = await db.from("conversations").select("channel").eq("lead_id", leadId).limit(1).single();
  let channel = (convRow2 as { channel?: string })?.channel ?? "web";
  const channelCanSend = await canSend(channel);
  if (!channelCanSend) {
    const fallback = await getFallbackChannel(channel);
    if (!fallback) return;
    channel = fallback;
  }

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { count: outboundToday } = await db
    .from("outbound_messages")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .gte("sent_at", todayStart.toISOString());
  if (!passesStageLimit(state, outboundToday ?? 0)) return;

  const { data: outboundRows } = await db
    .from("outbound_messages")
    .select("sent_at")
    .eq("lead_id", leadId)
    .order("sent_at", { ascending: false })
    .limit(1);
  const { count: totalOutbound } = await db
    .from("outbound_messages")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", leadId);
  const lastOutbound = outboundRows?.[0] as { sent_at?: string } | undefined;
  const lastAt = lastOutbound?.sent_at ? new Date(lastOutbound.sent_at) : null;
  const attemptCount = (totalOutbound ?? 0) + 1;
  if (!passesCooldownLadder(lastAt, attemptCount)) return;

  const policy = checkPolicy(
    { is_vip: lead.is_vip, company: lead.company, opt_out: lead.opt_out },
    message,
    action,
    settings,
    state
  );

  if (!policy.allowed) {
    message = SAFE_FALLBACK_MESSAGES[policy.safeFallback] ?? SAFE_FALLBACK_MESSAGES.clarifying_question;
  }

  await db.from("messages").insert({
    conversation_id: convId,
    role: "assistant",
    content: message,
    confidence_score: confidence,
    approved_by_human: false,
    metadata: { action, policy_reason: policy.reason },
  });

  const { data: conv } = await db.from("conversations").select("channel").eq("id", convId).single();
  await db.from("outbound_messages").insert({
    workspace_id: workspaceId,
    lead_id: leadId,
    conversation_id: convId,
    content: message,
    channel: (conv as { channel?: string })?.channel ?? "unknown",
    status: "sent",
    attempt_count: attemptCount,
  });

  await incrementMetric(workspaceId, policy.allowed ? METRIC_KEYS.REPLIES_SENT : METRIC_KEYS.FALLBACK_USED);

  await db.from("action_logs").insert({
    workspace_id: workspaceId,
    entity_type: "lead",
    entity_id: leadId,
    action: "send_message",
    actor: "system",
    payload: { action, confidence, policy_reason: policy.reason },
  });
}
