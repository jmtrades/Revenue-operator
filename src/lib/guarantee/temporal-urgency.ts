/**
 * Lead temporal urgency — internal state only.
 * 0 flexible, 1 normal, 2 time_sensitive, 3 immediate.
 * Deterministic signals only. Used for time allocation. Not exposed in UI.
 */

import { getDb } from "@/lib/db/queries";
import { getCapacityInputs } from "./capacity-stability";

export type TemporalUrgencyLevel = 0 | 1 | 2 | 3;
/** 0 flexible, 1 normal, 2 time_sensitive, 3 immediate */

const URGENCY_IMMEDIATE = /\b(asap|immediately|today|right away|urgent|as soon as)\b/i;
const URGENCY_SOON = /\b(soon|this week|quick|next few days)\b/i;
const TYPICAL_BOOKING_DAYS = 7;
const MS_DAY = 24 * 60 * 60 * 1000;

export interface TemporalUrgencyRow {
  temporal_urgency_level: number;
  updated_at: string;
}

/**
 * Deterministic signals only. Returns a score; we map to 0-3.
 */
async function computeTemporalScore(leadId: string, workspaceId: string): Promise<number> {
  const db = getDb();
  let score = 0;

  const { data: conv } = await db.from("conversations").select("id").eq("lead_id", leadId).limit(1).single();
  const convId = (conv as { id?: string } | null)?.id;
  if (convId) {
    const { data: msgs } = await db
      .from("messages")
      .select("content")
      .eq("conversation_id", convId)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(10);
    for (const m of msgs ?? []) {
      const content = (m as { content?: string }).content ?? "";
      if (URGENCY_IMMEDIATE.test(content)) {
        score += 2;
        break;
      }
      if (URGENCY_SOON.test(content)) {
        score += 1;
        break;
      }
    }
  }

  const { data: leadRow } = await db.from("leads").select("metadata, created_at").eq("id", leadId).single();
  const meta = (leadRow as { metadata?: Record<string, unknown>; created_at?: string } | null)?.metadata ?? {};
  const createdAt = (leadRow as { created_at?: string } | null)?.created_at;
  const serviceUrgency = meta.service_urgency as string | undefined;
  if (serviceUrgency === "immediate" || serviceUrgency === "urgent") score += 2;
  else if (serviceUrgency === "time_sensitive") score += 1;

  try {
    const { data: sessions } = await db
      .from("call_sessions")
      .select("started_at")
      .eq("lead_id", leadId)
      .not("started_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(5);
    if ((sessions ?? []).length >= 2) score += 0;
  } catch {
    // call_sessions may vary by schema
  }

  const capacityInputs = await getCapacityInputs(workspaceId);
  const daysUntilFree = capacityInputs.days_until_next_free_slot;
  if (daysUntilFree === 0) score += 2;
  else if (daysUntilFree <= 2) score += 1;

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * MS_DAY).toISOString();
    const { count: cancellations } = await db
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("event_type", ["booking_cancelled", "call_cancelled"])
      .gte("created_at", sevenDaysAgo);
    if ((cancellations ?? 0) > 0) score += 1;
  } catch {
    // event_type may vary
  }

  if (createdAt) {
    const enquiryAt = new Date(createdAt).getTime();
    const daysSinceEnquiry = (Date.now() - enquiryAt) / MS_DAY;
    if (daysSinceEnquiry > TYPICAL_BOOKING_DAYS) score += 1;
    else if (daysSinceEnquiry < 2) score = Math.max(0, score - 1);
  }

  return Math.min(6, Math.max(0, score));
}

/**
 * Map raw score to 0-3. Deterministic.
 */
function scoreToLevel(score: number): TemporalUrgencyLevel {
  if (score >= 5) return 3;
  if (score >= 3) return 2;
  if (score >= 1) return 1;
  return 0;
}

/**
 * Get current temporal urgency for lead. Returns null if never computed.
 */
export async function getTemporalUrgency(leadId: string): Promise<TemporalUrgencyRow | null> {
  const db = getDb();
  const { data } = await db
    .from("guarantee_temporal_urgency")
    .select("temporal_urgency_level, updated_at")
    .eq("lead_id", leadId)
    .single();
  return data as TemporalUrgencyRow | null;
}

/**
 * Compute and persist temporal urgency. Call from cron or before decision batch.
 */
export async function updateTemporalUrgency(
  leadId: string,
  workspaceId: string
): Promise<TemporalUrgencyLevel> {
  const score = await computeTemporalScore(leadId, workspaceId);
  const level = scoreToLevel(score);
  const db = getDb();
  const now = new Date().toISOString();
  await db
    .from("guarantee_temporal_urgency")
    .upsert(
      { lead_id: leadId, workspace_id: workspaceId, temporal_urgency_level: level, updated_at: now },
      { onConflict: "lead_id" }
    );
  return level;
}

/**
 * Whether urgency is immediate (3). Offer nearest slot when combined with high priority.
 */
export function isTemporalImmediate(level: TemporalUrgencyLevel | null | undefined): boolean {
  return (level ?? 0) === 3;
}

/**
 * Whether urgency is flexible (0). Offer distant availability first when combined with low priority.
 */
export function isTemporalFlexible(level: TemporalUrgencyLevel | null | undefined): boolean {
  return (level ?? 0) === 0;
}

/**
 * Whether urgency is time-sensitive or immediate (2 or 3). Replacement-slot logic when calendar full.
 */
export function isTemporalUrgent(level: TemporalUrgencyLevel | null | undefined): boolean {
  return (level ?? 0) >= 2;
}

/**
 * Slot preference for this lead: 'nearest' | 'distant' | 'historical' | null (default).
 * Used by calendar-optimization. Not exposed to user.
 */
export type SlotPreference = "nearest" | "distant" | "historical" | null;

/**
 * Derive slot preference from temporal urgency, economic priority, and repeat pattern.
 * Immediate + high priority → nearest; flexible + low priority → distant; repeat customer → historical.
 */
export async function getSlotPreference(
  leadId: string,
  workspaceId: string,
  temporalLevel: TemporalUrgencyLevel | null | undefined,
  priorityLevel: number | null | undefined
): Promise<SlotPreference> {
  const db = getDb();
  if (isTemporalImmediate(temporalLevel) && (priorityLevel ?? 0) >= 2) return "nearest";
  if (isTemporalFlexible(temporalLevel) && (priorityLevel ?? 0) === 0) return "distant";
  try {
    const { count } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", leadId);
    if ((count ?? 0) >= 2) return "historical";
  } catch {
    // ignore
  }
  return null;
}
