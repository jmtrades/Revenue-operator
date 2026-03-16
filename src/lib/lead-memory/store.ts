/**
 * Lead memory store. Upsert only. No freeform text. Deterministic.
 */

import { getDb } from "@/lib/db/queries";
import type { LeadMemoryRow, LeadMemoryUpdate, LifecycleNote } from "./types";

function parseJson<T>(val: unknown, defaultVal: T): T {
  if (val == null) return defaultVal;
  if (Array.isArray(val)) return val as T;
  if (typeof val === "object") return val as T;
  try {
    const parsed = typeof val === "string" ? JSON.parse(val) : val;
    return (parsed ?? defaultVal) as T;
  } catch {
    return defaultVal;
  }
}

export async function getLeadMemory(workspaceId: string, leadId: string): Promise<LeadMemoryRow | null> {
  const db = getDb();
  const { data } = await db
    .from("lead_memory")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .maybeSingle();

  if (!data) return null;
  const r = data as Record<string, unknown>;
  return {
    workspace_id: r.workspace_id as string,
    lead_id: r.lead_id as string,
    disclosed_price_range: parseJson(r.disclosed_price_range, null),
    objections_history_json: parseJson(r.objections_history_json, []),
    commitments_made_json: parseJson(r.commitments_made_json, []),
    disclosures_acknowledged_json: parseJson(r.disclosures_acknowledged_json, []),
    consent_records_json: parseJson(r.consent_records_json, []),
    last_channel_used: (r.last_channel_used as string) ?? null,
    last_contact_attempt_at: (r.last_contact_attempt_at as string) ?? null,
    risk_flags_json: parseJson(r.risk_flags_json, []),
    emotional_profile_json: parseJson(r.emotional_profile_json, {}),
    lifecycle_notes_json: parseJson(r.lifecycle_notes_json, []),
    updated_at: r.updated_at as string,
  };
}

export async function upsertLeadMemory(
  workspaceId: string,
  leadId: string,
  update: LeadMemoryUpdate,
  nowIso?: string
): Promise<void> {
  const db = getDb();
  const now = nowIso ?? new Date().toISOString();
  const existing = await getLeadMemory(workspaceId, leadId);

  const row = {
    workspace_id: workspaceId,
    lead_id: leadId,
    disclosed_price_range: update.disclosed_price_range ?? existing?.disclosed_price_range ?? null,
    objections_history_json: update.objections_history_json ?? existing?.objections_history_json ?? [],
    commitments_made_json: update.commitments_made_json ?? existing?.commitments_made_json ?? [],
    disclosures_acknowledged_json: update.disclosures_acknowledged_json ?? existing?.disclosures_acknowledged_json ?? [],
    consent_records_json: update.consent_records_json ?? existing?.consent_records_json ?? [],
    last_channel_used: update.last_channel_used ?? existing?.last_channel_used ?? null,
    last_contact_attempt_at: update.last_contact_attempt_at ?? existing?.last_contact_attempt_at ?? null,
    risk_flags_json: update.risk_flags_json ?? existing?.risk_flags_json ?? [],
    emotional_profile_json: update.emotional_profile_json ?? existing?.emotional_profile_json ?? {},
    lifecycle_notes_json: update.lifecycle_notes_json ?? existing?.lifecycle_notes_json ?? [],
    updated_at: now,
  };

  await db
    .from("lead_memory")
    .upsert(row, { onConflict: "workspace_id,lead_id" });
}

/**
 * Build structured lead memory context for AI reasoning. No freeform; short factual summary.
 */
export async function getLeadMemoryContextForReasoning(leadId: string): Promise<string | null> {
  const db = getDb();
  const { data: lead } = await db.from("leads").select("workspace_id").eq("id", leadId).maybeSingle();
  const workspaceId = (lead as { workspace_id?: string } | null)?.workspace_id;
  if (!workspaceId) return null;
  const mem = await getLeadMemory(workspaceId, leadId);
  if (!mem) return null;
  const parts: string[] = [];
  if (mem.objections_history_json.length > 0) {
    const tags = mem.objections_history_json.slice(-5).map((o) => o.tag);
    parts.push(`Objections raised: ${tags.join(", ")}`);
  }
  if (mem.last_channel_used) parts.push(`Last channel: ${mem.last_channel_used}`);
  if (mem.risk_flags_json.length > 0) parts.push(`Risk flags: ${mem.risk_flags_json.join(", ")}`);
  return parts.length > 0 ? parts.join(". ") : null;
}

/**
 * Record a lead reaction (e.g. last action and outcome). Used by webhook pipeline.
 * Structured only; no freeform text.
 */
export async function recordLeadReaction(
  leadId: string,
  workspaceId: string,
  lastAction: string,
  outcome: string,
  nowIso?: string
): Promise<void> {
  const now = nowIso ?? new Date().toISOString();
  const memory = await getLeadMemory(workspaceId, leadId);
  const notes = memory?.lifecycle_notes_json ?? [];
  const newNote: LifecycleNote = {
    stage: "reaction",
    at: now,
    note_type: "webhook_reaction",
    last_action: lastAction,
    outcome,
  };
  await upsertLeadMemory(workspaceId, leadId, {
    lifecycle_notes_json: [...notes, newNote],
    last_contact_attempt_at: now,
    updated_at: now,
  }, now);
}
