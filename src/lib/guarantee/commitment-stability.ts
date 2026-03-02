/**
 * Commitment Stability — preventative guarantee.
 * Detects weakening commitment before booking/attendance fails.
 * Internal state only (0–3). Not exposed in UI. Deterministic signals only.
 */

import { getDb } from "@/lib/db/queries";

export type CommitmentPressureLevel = 0 | 1 | 2 | 3;
/** 0 stable, 1 weakening, 2 unstable, 3 high_risk */

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;
const PERSISTENT_LEVEL3_HOURS = 24;

/** Phrases that increase pressure (vague / non-commitment). */
const VAGUE_PHRASES = /\b(maybe|i'll see|we'll see|depends|not sure|perhaps|might|thinking about it)\b/i;

/** Phrases that count as delaying scheduling. */
const DELAY_PHRASES = /\b(later|next week|next month|maybe next|not yet|have to check|get back to you)\b/i;

/** Logistical / confirmation (reset pressure). */
const LOGISTICAL = /\b(what time|where is|address|parking|how long|duration|location)\b/i;
const CONFIRMS_TIME = /\b(tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|morning|afternoon|am|pm|\d{1,2}:\d{2})\b/i;
const AVAILABILITY = /\b(available|free|open|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|next week)\b/i;

/** Outbound that looks like booking link or scheduling ask. */
const BOOKING_SENT = /\b(book|schedule|link|calendly|cal\.ly|when works)\b/i;
const REMINDER_OR_CONFIRM = /\b(still on|confirm|tomorrow|appointment|see you)\b/i;

interface MessageRow {
  role: string;
  content: string;
  created_at: string;
}

/**
 * Load last N messages (user + assistant), newest first.
 */
async function getRecentMessages(conversationId: string, limit: number): Promise<MessageRow[]> {
  const db = getDb();
  const { data } = await db
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as MessageRow[];
}

/** Chronological order (oldest first) for latency pairing. */
function chronological(messages: MessageRow[]): MessageRow[] {
  return [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

/**
 * Deterministic signals that increase pressure. Returns count of signals that fired.
 */
function signalsIncreasePressure(messages: MessageRow[]): number {
  let count = 0;
  const desc = messages;
  const userMessages = desc.filter((m) => m.role === "user");
  const lastUser = userMessages[0];
  const prevUser = userMessages[1];
  if (!lastUser) return 0;

  const outbound = desc.filter((m) => m.role === "assistant");
  const lastOut = outbound[0];
  const content = (lastUser.content ?? "").trim().toLowerCase();
  const prevContent = (prevUser?.content ?? "").trim().toLowerCase();

  if (VAGUE_PHRASES.test(lastUser.content ?? "")) count++;
  if (content.length > 0 && content.length < 25 && !content.includes("?")) count++;
  if (prevUser && content && prevContent && (content === prevContent || content.includes(prevContent) || prevContent.includes(content))) count++;
  if (DELAY_PHRASES.test(lastUser.content ?? "")) count++;
  if (!(lastUser.content ?? "").includes("?")) count++;
  if (lastOut && (lastUser.content ?? "").length < 15 && REMINDER_OR_CONFIRM.test(lastOut.content ?? "")) count++;

  // Long pause after we sent booking link / ask (last message is our booking ask, > 24h ago)
  const veryLast = messages[0];
  if (
    veryLast?.role === "assistant" &&
    BOOKING_SENT.test(veryLast.content ?? "") &&
    Date.now() - new Date(veryLast.created_at).getTime() > 24 * MS_HOUR
  )
    count++;

  const chrono = chronological(messages);
  let prevOutAt: number | null = null;
  const latencies: number[] = [];
  for (const m of chrono) {
    if (m.role === "assistant") prevOutAt = new Date(m.created_at).getTime();
    if (m.role === "user" && prevOutAt != null) {
      latencies.push(new Date(m.created_at).getTime() - prevOutAt);
    }
  }
  if (latencies.length >= 2 && latencies[latencies.length - 1]! > latencies[latencies.length - 2]! * 1.5) count++;

  if (/\b(reschedule|change time|move it|different time)\b/i.test(lastUser.content ?? "")) count++;

  return count;
}

/**
 * Deterministic signals that reset or decrease pressure.
 */
function signalsResetPressure(lastUserMessage: MessageRow | undefined): boolean {
  if (!lastUserMessage?.content) return false;
  const c = lastUserMessage.content;
  if (LOGISTICAL.test(c)) return true;
  if (CONFIRMS_TIME.test(c) && (/\d/.test(c) || /tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i.test(c))) return true;
  if (AVAILABILITY.test(c) && c.length > 10) return true;
  return false;
}

/**
 * User initiated (first in thread or first after long gap with no recent outbound).
 */
function signalsInitiated(messages: MessageRow[]): boolean {
  if (messages.length === 0) return false;
  const userMessages = messages.filter((m) => m.role === "user");
  const outbound = messages.filter((m) => m.role === "assistant");
  const lastUser = userMessages[0];
  const lastOut = outbound[0];
  if (!lastUser) return false;
  const userAt = new Date(lastUser.created_at).getTime();
  if (!lastOut) return true; // user wrote first
  const outAt = new Date(lastOut.created_at).getTime();
  if (userAt > outAt && (userAt - outAt) > 5 * MS_DAY) return true; // user came back after 5+ days
  return false;
}

export interface CommitmentStateRow {
  pressure_level: number;
  updated_at: string;
  last_increase_at: string | null;
  last_reset_at: string | null;
}

export async function getCommitmentPressure(leadId: string): Promise<CommitmentStateRow | null> {
  const db = getDb();
  const { data } = await db
    .from("guarantee_commitment_state")
    .select("pressure_level, updated_at, last_increase_at, last_reset_at")
    .eq("lead_id", leadId)
    .single();
  return data as CommitmentStateRow | null;
}

/**
 * Update commitment pressure from conversation signals. Returns new level (0–3).
 * Not exposed to UI.
 */
export async function updateCommitmentPressure(leadId: string, workspaceId: string): Promise<CommitmentPressureLevel> {
  const db = getDb();
  const { data: conv } = await db.from("conversations").select("id").eq("lead_id", leadId).limit(1).single();
  const convId = (conv as { id?: string } | null)?.id;
  if (!convId) return 0;

  const messages = await getRecentMessages(convId, 12);
  const userMessages = messages.filter((m) => m.role === "user");
  const _outboundMessages = messages.filter((m) => m.role === "assistant");
  const lastUser = userMessages[0];

  const current = await getCommitmentPressure(leadId);
  let level = (current?.pressure_level ?? 0) as CommitmentPressureLevel;
  const now = new Date().toISOString();

  if (signalsResetPressure(lastUser) || signalsInitiated(messages)) {
    level = 0;
    await db.from("guarantee_commitment_state").upsert(
      {
        lead_id: leadId,
        workspace_id: workspaceId,
        pressure_level: level,
        updated_at: now,
        last_reset_at: now,
        last_increase_at: current?.last_increase_at ?? null,
      },
      { onConflict: "lead_id" }
    );
    return level;
  }

  const increaseSignals = signalsIncreasePressure(messages);
  if (increaseSignals > 0) {
    level = Math.min(3, level + 1) as CommitmentPressureLevel;
    await db.from("guarantee_commitment_state").upsert(
      {
        lead_id: leadId,
        workspace_id: workspaceId,
        pressure_level: level,
        updated_at: now,
        last_increase_at: now,
        last_reset_at: current?.last_reset_at ?? null,
      },
      { onConflict: "lead_id" }
    );
    return level;
  }

  if (current != null) {
    return current.pressure_level as CommitmentPressureLevel;
  }

  if (level > 0) {
    await db.from("guarantee_commitment_state").upsert(
      {
        lead_id: leadId,
        workspace_id: workspaceId,
        pressure_level: level,
        updated_at: now,
        last_increase_at: null,
        last_reset_at: null,
      },
      { onConflict: "lead_id" }
    );
  }
  return level;
}

/**
 * Whether we should send a stabilization message (level 2 or 3).
 */
export function shouldEnforceStabilization(level: CommitmentPressureLevel): boolean {
  return level >= 2;
}

/**
 * Whether we should escalate (persistent level 3).
 */
export async function shouldEscalateCommitment(leadId: string): Promise<boolean> {
  const row = await getCommitmentPressure(leadId);
  if (!row || row.pressure_level < 3) return false;
  const lastIncrease = row.last_increase_at ? new Date(row.last_increase_at).getTime() : 0;
  return lastIncrease > 0 && Date.now() - lastIncrease >= PERSISTENT_LEVEL3_HOURS * MS_HOUR;
}

/**
 * Enforce commitment stability: level 2 → stabilization via decision layer;
 * level 3 → proactive reassurance; persistent level 3 → escalate.
 * Receptionist-style only. No persuasion. Runs BEFORE time-based invariants.
 */
export async function enforceCommitmentStability(
  leadId: string,
  workspaceId: string
): Promise<"stabilization" | "reassurance" | "escalated" | null> {
  const level = await getCommitmentPressure(leadId).then((r) => (r?.pressure_level ?? 0) as CommitmentPressureLevel);
  if (level < 2) return null;

  if (await shouldEscalateCommitment(leadId)) {
    const { getEconomicPriority, isPriorityCritical } = await import("@/lib/guarantee/economic-priority");
    const priorityRow = await getEconomicPriority(leadId);
    if (isPriorityCritical((priorityRow?.economic_priority_level ?? null) as import("@/lib/guarantee/economic-priority").EconomicPriorityLevel | null)) {
      const { enqueue } = await import("@/lib/queue");
      const { setLeadPlan } = await import("@/lib/plans/lead-plan");
      await setLeadPlan(workspaceId, leadId, {
        next_action_type: "clarifying_question",
        next_action_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });
      await enqueue({ type: "decision", leadId, workspaceId, eventId: leadId });
      return "reassurance";
    }
    const { escalateLead } = await import("./enforce");
    await escalateLead(workspaceId, leadId, "commitment_persistent_high_risk");
    return "escalated";
  }

  const { enqueue } = await import("@/lib/queue");
  const { setLeadPlan } = await import("@/lib/plans/lead-plan");
  if (level === 3) {
    await setLeadPlan(workspaceId, leadId, {
      next_action_type: "clarifying_question",
      next_action_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
  }
  await enqueue({ type: "decision", leadId, workspaceId, eventId: leadId });
  return level === 3 ? "reassurance" : "stabilization";
}
