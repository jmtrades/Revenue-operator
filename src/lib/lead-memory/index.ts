/**
 * Lead memory: each lead remembers past reactions. Reasoning references previous behavior.
 */

import { getDb } from "@/lib/db/queries";

export type LeadMemoryType =
  | "past_reactions"
  | "follow_up_patterns"
  | "objections_raised"
  | "interests_expressed";

export interface LeadMemoryContent {
  reactions?: Array<{ trigger: string; outcome: string; at?: string }>;
  patterns?: string[];
  objections?: string[];
  interests?: string[];
  [key: string]: unknown;
}

export async function getLeadMemory(
  leadId: string,
  memoryType: LeadMemoryType
): Promise<LeadMemoryContent | null> {
  const db = getDb();
  const { data } = await db
    .from("lead_memories")
    .select("content")
    .eq("lead_id", leadId)
    .eq("memory_type", memoryType)
    .single();
  return (data as { content?: LeadMemoryContent })?.content ?? null;
}

export async function getLeadMemoryContextForReasoning(leadId: string): Promise<string> {
  const parts: string[] = [];
  const types: LeadMemoryType[] = [
    "past_reactions",
    "follow_up_patterns",
    "objections_raised",
    "interests_expressed",
  ];
  for (const t of types) {
    const mem = await getLeadMemory(leadId, t);
    if (!mem) continue;
    if (t === "past_reactions" && Array.isArray(mem.reactions) && mem.reactions.length > 0) {
      const recent = mem.reactions.slice(-3).map((r) => `${r.trigger} → ${r.outcome}`).join("; ");
      parts.push(`Past reactions: ${recent}`);
    }
    if (t === "follow_up_patterns" && Array.isArray(mem.patterns) && mem.patterns.length > 0) {
      parts.push(`Follow-up pattern: ${mem.patterns.join("; ")}`);
    }
    if (t === "objections_raised" && Array.isArray(mem.objections) && mem.objections.length > 0) {
      parts.push(`Objections raised: ${mem.objections.join("; ")}`);
    }
    if (t === "interests_expressed" && Array.isArray(mem.interests) && mem.interests.length > 0) {
      parts.push(`Interests: ${mem.interests.join("; ")}`);
    }
  }
  return parts.length > 0 ? `Lead context from previous behavior: ${parts.join(". ")}` : "";
}

export async function upsertLeadMemory(
  leadId: string,
  workspaceId: string,
  memoryType: LeadMemoryType,
  content: LeadMemoryContent,
  source?: string
): Promise<void> {
  const db = getDb();
  const { data: existing } = await db
    .from("lead_memories")
    .select("content")
    .eq("lead_id", leadId)
    .eq("memory_type", memoryType)
    .single();

  const existingContent = (existing as { content?: LeadMemoryContent })?.content ?? {};
  const merged: LeadMemoryContent = { ...existingContent };

  if (memoryType === "past_reactions" && content.reactions) {
    const reactions = [...(merged.reactions ?? []), ...content.reactions].slice(-10);
    merged.reactions = reactions;
  }
  if (memoryType === "follow_up_patterns" && content.patterns) {
    merged.patterns = [...new Set([...(merged.patterns ?? []), ...content.patterns])];
  }
  if (memoryType === "objections_raised" && content.objections) {
    merged.objections = [...new Set([...(merged.objections ?? []), ...content.objections])];
  }
  if (memoryType === "interests_expressed" && content.interests) {
    merged.interests = [...new Set([...(merged.interests ?? []), ...content.interests])];
  }

  await db
    .from("lead_memories")
    .upsert(
      {
        lead_id: leadId,
        workspace_id: workspaceId,
        memory_type: memoryType,
        content: merged,
        source: source ?? null,
      },
      { onConflict: "lead_id,memory_type" }
    );
}

export async function recordLeadReaction(
  leadId: string,
  workspaceId: string,
  trigger: string,
  outcome: string,
  source?: string
): Promise<void> {
  await upsertLeadMemory(
    leadId,
    workspaceId,
    "past_reactions",
    {
      reactions: [{ trigger, outcome, at: new Date().toISOString() }],
    },
    source ?? "webhook"
  );
}
