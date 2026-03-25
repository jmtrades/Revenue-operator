/**
 * Conversation Memory Layer — store and probabilistically recall context.
 * Future messages sometimes reference past context (40–60% of the time).
 */

import { getDb } from "@/lib/db/queries";

export interface ConversationMemoryRow {
  topic?: string;
  intent?: string;
  hesitation_reason?: string;
  urgency_level?: string;
  previous_objections?: string[];
  preferred_time_refs?: string[];
  availability_constraints?: string[];
  raw_notes?: Record<string, unknown>;
}

const RECALL_PROBABILITY_MIN = 0.4;
const RECALL_PROBABILITY_MAX = 0.6;

function shouldRecall(): boolean {
  return Math.random() < (RECALL_PROBABILITY_MIN + Math.random() * (RECALL_PROBABILITY_MAX - RECALL_PROBABILITY_MIN));
}

/**
 * Load conversation memory for a lead.
 */
export async function getConversationMemory(
  leadId: string
): Promise<ConversationMemoryRow | null> {
  const db = getDb();
  const { data } = await db
    .from("conversation_memory")
    .select("topic, intent, hesitation_reason, urgency_level, previous_objections, preferred_time_refs, availability_constraints, raw_notes")
    .eq("lead_id", leadId)
    .maybeSingle();
  if (!data) return null;
  return data as ConversationMemoryRow;
}

/**
 * Upsert conversation memory (merge with existing).
 */
export async function upsertConversationMemory(
  leadId: string,
  workspaceId: string,
  updates: Partial<ConversationMemoryRow>
): Promise<void> {
  const db = getDb();
  const existing = await getConversationMemory(leadId);
  const now = new Date().toISOString();
  const merged: Record<string, unknown> = {
    lead_id: leadId,
    workspace_id: workspaceId,
    updated_at: now,
    ...(existing ?? {}),
    ...updates,
  };
  if (Array.isArray(updates.previous_objections) && (existing?.previous_objections?.length ?? 0) > 0) {
    const combined = [...new Set([...(existing?.previous_objections ?? []), ...updates.previous_objections])];
    merged.previous_objections = combined.slice(-10);
  }
  if (Array.isArray(updates.preferred_time_refs) && (existing?.preferred_time_refs?.length ?? 0) > 0) {
    const combined = [...new Set([...(existing?.preferred_time_refs ?? []), ...updates.preferred_time_refs])];
    merged.preferred_time_refs = combined.slice(-5);
  }
  if (Array.isArray(updates.availability_constraints) && (existing?.availability_constraints?.length ?? 0) > 0) {
    const combined = [...new Set([...(existing?.availability_constraints ?? []), ...updates.availability_constraints])];
    merged.availability_constraints = combined.slice(-5);
  }
  await db.from("conversation_memory").upsert(merged as Record<string, unknown>, { onConflict: "lead_id" });
}

/**
 * Optionally weave a memory reference into the message (40–60% of the time).
 * Returns original message or a version with a short, natural reference.
 */
export function maybeWeaveMemory(
  message: string,
  memory: ConversationMemoryRow | null
): string {
  if (!memory || !shouldRecall()) return message;
  const parts: string[] = [];
  if (memory.hesitation_reason && /price|cost|budget/i.test(memory.hesitation_reason)) {
    parts.push("re price — ");
  }
  if (memory.preferred_time_refs && memory.preferred_time_refs.length > 0) {
    const ref = memory.preferred_time_refs[memory.preferred_time_refs.length - 1];
    if (ref && message.toLowerCase().includes("when") && !message.toLowerCase().includes("same")) {
      return `${message.trim()} Same sort of time as before?`;
    }
  }
  if (parts.length > 0) {
    return parts.join(" ") + message.trim();
  }
  return message;
}
