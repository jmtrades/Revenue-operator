/**
 * Opportunity Recovery Engine — sits above commitment engine.
 * Detects conversation decay (slowing → stalled → lost) and revives before lost.
 * Momentum: active (< 10 min since reply), slowing (2–12h), stalled (12–60h), lost (> 60h).
 * Revival: contextual message; after 3 failed attempts → authority_required.
 */

import { getDb } from "@/lib/db/queries";
import { runWithWriteContextAsync } from "@/lib/safety/unsafe-write-guard";
import { enqueueSendMessage } from "@/lib/action-queue/send-message";

const SLOWING_HOURS = 2;
const REVIVAL_COOLDOWN_MINUTES = 60;

export type MomentumState = "active" | "slowing" | "stalled" | "revived" | "lost";

export interface OpportunityStateRow {
  id: string;
  workspace_id: string;
  conversation_id: string;
  last_customer_message_at: string | null;
  last_business_message_at: string | null;
  momentum_state: string;
  revive_attempts: number;
  next_action_at: string | null;
  authority_required: boolean;
  created_at: string;
  updated_at: string;
}

/** Ensure a row exists for the conversation; create with defaults if missing. */
export async function ensureOpportunityState(
  workspaceId: string,
  conversationId: string
): Promise<void> {
  const db = getDb();
  const { data: existing } = await db
    .from("opportunity_states")
    .select("id")
    .eq("conversation_id", conversationId)
    .maybeSingle();
  if (existing) return;
  await runWithWriteContextAsync("delivery", async () => {
    const db2 = getDb();
    await db2.from("opportunity_states").insert({
      workspace_id: workspaceId,
      conversation_id: conversationId,
      momentum_state: "active",
    });
  });
}

/** Call when a customer message is recorded (inbound). */
export async function updateOnCustomerMessage(
  workspaceId: string,
  conversationId: string
): Promise<void> {
  const now = new Date().toISOString();
  await ensureOpportunityState(workspaceId, conversationId);
  await runWithWriteContextAsync("delivery", async () => {
    const db = getDb();
    await db
      .from("opportunity_states")
      .update({
        last_customer_message_at: now,
        updated_at: now,
      })
      .eq("conversation_id", conversationId);
  });
}

/** Call when a business message is sent (outbound). */
export async function updateOnBusinessMessage(
  workspaceId: string,
  conversationId: string
): Promise<void> {
  const now = new Date().toISOString();
  await ensureOpportunityState(workspaceId, conversationId);
  await runWithWriteContextAsync("delivery", async () => {
    const db = getDb();
    await db
      .from("opportunity_states")
      .update({
        last_business_message_at: now,
        updated_at: now,
      })
      .eq("conversation_id", conversationId);
  });
}

/**
 * Compute momentum state from last_customer_message_at. Uses profile timings.
 */
function computeMomentumState(
  lastCustomerAt: string | null,
  stalledHours: number,
  lostHours: number
): MomentumState {
  if (!lastCustomerAt) return "active";
  const at = new Date(lastCustomerAt).getTime();
  const ageMs = Date.now() - at;
  const ageHours = ageMs / (60 * 60 * 1000);
  if (ageHours <= SLOWING_HOURS) return "active";
  if (ageHours <= stalledHours) return "slowing";
  if (ageHours <= lostHours) return "stalled";
  return "lost";
}

/**
 * Transition all opportunity_states to correct momentum_state based on last_customer_message_at.
 * Profile-based: stalled/lost hours and max attempts per workspace.
 */
export async function transitionMomentumStates(): Promise<number> {
  const db = getDb();
  const { data: rows } = await db
    .from("opportunity_states")
    .select("id, workspace_id, last_customer_message_at, momentum_state")
    .not("momentum_state", "in", "('revived','lost')");
  const list = (rows ?? []) as { id: string; workspace_id: string; last_customer_message_at: string | null; momentum_state: string }[];
  const workspaceIds = [...new Set(list.map((r) => r.workspace_id))];
  const { getRecoveryProfile, getRecoveryTimings } = await import("@/lib/recovery-profile");
  const profileMap = new Map<string, { stalledHours: number; lostHours: number }>();
  for (const wid of workspaceIds) {
    const profile = await getRecoveryProfile(wid);
    const t = getRecoveryTimings(profile);
    profileMap.set(wid, { stalledHours: t.stalledHours, lostHours: t.lostHours });
  }
  let updated = 0;
  const now = new Date().toISOString();
  for (const row of list) {
    const timings = profileMap.get(row.workspace_id) ?? getRecoveryTimings("standard");
    const next = computeMomentumState(row.last_customer_message_at, timings.stalledHours, timings.lostHours);
    if (next === row.momentum_state) continue;
    await runWithWriteContextAsync("delivery", async () => {
      const db2 = getDb();
      await db2
        .from("opportunity_states")
        .update({ momentum_state: next, updated_at: now })
        .eq("id", row.id);
    });
    updated++;
  }
  return updated;
}

/** Revival message pools by context; index by revive_attempts so we never repeat. */
const REVIVAL_POOL_BOOKING = [
  "When would work best for you to schedule?",
  "Do you have a preferred day or time?",
  "Happy to find a time that works — when are you free?",
];
const REVIVAL_POOL_PRICING = [
  "Happy to clarify any pricing questions — what would help?",
  "Any specific numbers or options you’d like to go through?",
  "Want to go over options that fit your budget?",
];
const REVIVAL_POOL_GENERAL = [
  "Still here if you’d like to pick this up.",
  "No rush — reply when you’re ready and we’ll continue.",
  "Quick follow-up in case you had any other questions.",
];

function _inferContextFromMessages(messages: { role: string; content: string }[]): "booking" | "pricing" | "general" {
  const text = messages.map((m) => m.content).join(" ").toLowerCase();
  if (/\b(book|schedule|appointment|calendar|time slot|when can we meet)\b/.test(text)) return "booking";
  if (/\b(price|cost|fee|how much|pricing|quote)\b/.test(text)) return "pricing";
  return "general";
}

function _pickRevivalMessage(context: "booking" | "pricing" | "general", attemptIndex: number): string {
  const pool =
    context === "booking" ? REVIVAL_POOL_BOOKING : context === "pricing" ? REVIVAL_POOL_PRICING : REVIVAL_POOL_GENERAL;
  return pool[attemptIndex % pool.length] ?? REVIVAL_POOL_GENERAL[0]!;
}

/**
 * Load opportunities that need revival: state slowing or stalled, revive_attempts < 3, not authority_required.
 */
const MAX_REVIVE_ATTEMPTS_QUERY = 4;

export async function getOpportunitiesNeedingRevival(limit: number): Promise<OpportunityStateRow[]> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data } = await db
    .from("opportunity_states")
    .select("*")
    .in("momentum_state", ["slowing", "stalled"])
    .eq("authority_required", false)
    .lt("revive_attempts", MAX_REVIVE_ATTEMPTS_QUERY)
    .or(`next_action_at.is.null,next_action_at.lte.${now}`)
    .order("last_customer_message_at", { ascending: true })
    .limit(limit * 2);
  const rows = (data ?? []) as OpportunityStateRow[];
  const { getRecoveryTimingsForWorkspace } = await import("@/lib/recovery-profile");
  const filtered: OpportunityStateRow[] = [];
  for (const row of rows) {
    const timings = await getRecoveryTimingsForWorkspace(row.workspace_id);
    if (row.revive_attempts >= timings.maxReviveAttempts) continue;
    filtered.push(row);
    if (filtered.length >= limit) break;
  }
  return filtered;
}

/**
 * Send one contextual revival message; increment revive_attempts; set next_action_at cooldown.
 */
export async function runRevivalForOpportunity(opp: OpportunityStateRow): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  try {
    const { data: conv } = await db
      .from("conversations")
      .select("id, lead_id, channel")
      .eq("id", opp.conversation_id)
      .single();
    if (!conv) return { ok: false, error: "Conversation not found" };
    const c = conv as { id: string; lead_id: string; channel: string };
    const { data: msgs } = await db
      .from("messages")
      .select("role, content")
      .eq("conversation_id", opp.conversation_id)
      .order("created_at", { ascending: false })
      .limit(20);
    const _messages = (msgs ?? []) as { role: string; content: string }[];
    const { compileMessage } = await import("@/lib/message-compiler");
    const content = compileMessage("follow_up", {
      channel: (c.channel || "sms") as "sms" | "email" | "web",
      tone: opp.revive_attempts >= 2 ? "warm" : "neutral",
    });
    const dedupKey = `opportunity-revival:${opp.id}:${opp.revive_attempts}`;
    const { shouldSuppressOutbound } = await import("@/lib/outbound-suppression");
    if (await shouldSuppressOutbound(opp.workspace_id, `lead:${c.lead_id}`, "daily_nudge", 24 * 60)) {
      return { ok: true };
    }
    const { hasExecutedActionType, setPendingPreview } = await import("@/lib/adoption-acceleration/previews");
    if (!(await hasExecutedActionType(opp.workspace_id, "opportunity_revival"))) {
      await setPendingPreview(opp.workspace_id, "opportunity_revival", "If no reply occurs, a response will be sent.").catch(() => {});
    }
    await enqueueSendMessage(
      opp.workspace_id,
      c.lead_id,
      opp.conversation_id,
      c.channel,
      content,
      dedupKey,
      { action_type: "opportunity_revival" }
    );
    const now = new Date();
    const cooldown = new Date(now.getTime() + REVIVAL_COOLDOWN_MINUTES * 60 * 1000).toISOString();
    await runWithWriteContextAsync("delivery", async () => {
      const db2 = getDb();
      await db2
        .from("opportunity_states")
        .update({
          revive_attempts: opp.revive_attempts + 1,
          next_action_at: cooldown,
          updated_at: now.toISOString(),
        })
        .eq("id", opp.id);
    });
    return { ok: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { ok: false, error: err };
  }
}

/** After 3 revival attempts: mark authority_required, add to responsibility. */
export async function escalateOpportunityToAuthority(opportunityId: string): Promise<void> {
  const now = new Date().toISOString();
  await runWithWriteContextAsync("delivery", async () => {
    const db = getDb();
    await db
      .from("opportunity_states")
      .update({ authority_required: true, updated_at: now })
      .eq("id", opportunityId);
  });
}

/** Opportunities requiring human authority (for GET /api/responsibility). */
export async function getStalledOpportunitiesRequiringAuthority(
  workspaceId: string
): Promise<OpportunityStateRow[]> {
  const db = getDb();
  const { data } = await db
    .from("opportunity_states")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("authority_required", true)
    .order("last_customer_message_at", { ascending: true });
  return (data ?? []) as OpportunityStateRow[];
}

/**
 * Call when customer replies: set state = revived if was slowing/stalled; log revenue_recovery_event.
 */
export async function onCustomerReply(workspaceId: string, conversationId: string): Promise<void> {
  const db = getDb();
  const { data: row } = await db
    .from("opportunity_states")
    .select("id, momentum_state")
    .eq("conversation_id", conversationId)
    .single();
  if (!row) return;
  const r = row as { id: string; momentum_state: string };
  const wasDecayed = r.momentum_state === "slowing" || r.momentum_state === "stalled";
  const wasStalled = r.momentum_state === "stalled";
  const wasActive = r.momentum_state === "active";
  const now = new Date().toISOString();
  if (wasActive) {
    const { recordCoordinationDisplacement } = await import("@/lib/coordination-displacement");
    recordCoordinationDisplacement(workspaceId, "staff", "continuation", false).catch(() => {});
    const { recordResponsibilityMoment } = await import("@/lib/responsibility-moments");
    recordResponsibilityMoment({
      workspaceId,
      subjectType: "opportunity",
      subjectId: conversationId,
      authorityHolder: "environment",
      determinedFrom: "timeout",
    }).catch(() => {});
    const { recordNonParticipationIfApplicable } = await import("@/lib/detachment");
    recordNonParticipationIfApplicable(workspaceId, `opportunity:${conversationId}`, "opportunity").catch(() => {});
  }
  if (wasDecayed) {
    const { removeOperationalExpectation } = await import("@/lib/operability-anchor");
    removeOperationalExpectation(workspaceId, "awaiting_reply", conversationId).catch(() => {});
    await runWithWriteContextAsync("delivery", async () => {
      const db2 = getDb();
      await db2
        .from("opportunity_states")
        .update({ momentum_state: "revived", updated_at: now })
        .eq("id", r.id);
    });
    if (wasStalled) {
      const { recordCausalChain } = await import("@/lib/causality-engine");
      recordCausalChain({
        workspace_id: workspaceId,
        subject_type: "conversation",
        subject_id: conversationId,
        baseline_expected_outcome: "no_reply",
        intervention_type: "opportunity_revival",
        observed_outcome: "reply_received",
        dependency_established: true,
      }).catch(() => {});
      const { recordContinuationStopped } = await import("@/lib/continuation-engine");
      recordContinuationStopped(workspaceId, "conversation", conversationId, "waiting", 0).catch(() => {});
      const { recordCoordinationDisplacement } = await import("@/lib/coordination-displacement");
      recordCoordinationDisplacement(workspaceId, "staff", "continuation").catch(() => {});
      const { recordResponsibilityMoment } = await import("@/lib/responsibility-moments");
      recordResponsibilityMoment({
        workspaceId,
        subjectType: "opportunity",
        subjectId: conversationId,
        authorityHolder: "environment",
        determinedFrom: "intervention",
      }).catch(() => {});
      const { recordNonParticipationIfApplicable } = await import("@/lib/detachment");
      recordNonParticipationIfApplicable(workspaceId, `opportunity:${conversationId}`, "opportunity").catch(() => {});
      const { recordEconomicEvent } = await import("@/lib/economic-events");
      recordEconomicEvent({
        workspaceId,
        eventType: "opportunity_recovered",
        subjectType: "conversation",
        subjectId: conversationId,
        valueAmount: 0,
      }).catch(() => {});
      const { recordReliefEvent } = await import("@/lib/awareness-timing/relief-events");
      recordReliefEvent(workspaceId, "A delay did not continue.").catch(() => {});
      const { recordOrientationStatement } = await import("@/lib/orientation/records");
      recordOrientationStatement(workspaceId, "The conversation resumed after outreach.").catch(() => {});
      const { recordStaffRelianceEvent } = await import("@/lib/staff-reliance");
      recordStaffRelianceEvent(workspaceId).catch(() => {});
      const { touchDependencyMemory } = await import("@/lib/operational-dependency-memory");
      touchDependencyMemory(workspaceId, "followup_tracking").catch(() => {});
      const { recordMemoryReplacementEvent } = await import("@/lib/memory-replacement");
      recordMemoryReplacementEvent(workspaceId, "conversation_revived").catch(() => {});
    }
    const { data: conv } = await db.from("conversations").select("lead_id").eq("id", conversationId).single();
    const leadId = (conv as { lead_id?: string })?.lead_id;
    if (leadId) {
      try {
        await db.from("events").insert({
          workspace_id: workspaceId,
          event_type: "revenue_recovery_event",
          entity_type: "conversation",
          entity_id: conversationId,
          payload: { conversation_id: conversationId, lead_id: leadId, trigger: "customer_reply_after_revival" },
          trigger_source: "opportunity_recovery",
        });
      } catch {
        // Enum value may not exist until migration applied
      }
    }
  }
}
