/**
 * Lead economic priority — internal state only.
 * 0 low, 1 standard, 2 important, 3 critical.
 * Deterministic signals only. No predictions. Not exposed in UI.
 */

import { getDb } from "@/lib/db/queries";
import { fetchSingleRow, type DbSingleQuery } from "@/lib/db/single-row";

export type EconomicPriorityLevel = 0 | 1 | 2 | 3;
/** 0 low, 1 standard, 2 important, 3 critical */

const URGENCY_WORDS = /\b(asap|urgent|soon|quick|immediately|this week|today)\b/i;
const VALUE_TIER_HIGH_CENTS = 50000;
const VALUE_TIER_MEDIUM_CENTS = 20000;

export interface EconomicPriorityRow {
  economic_priority_level: number;
  updated_at: string;
}

/**
 * Deterministic signals only. Returns a score 0..6; we map to 0-3.
 */
async function computeEconomicScore(leadId: string, workspaceId: string): Promise<number> {
  const db = getDb();
  let score = 0;

  try {
    let lifecycle: unknown = null;
    const q = db
      .from("revenue_lifecycles")
      .select("lifetime_value_stage, lifecycle_stage")
      .eq("lead_id", leadId)
      .eq("workspace_id", workspaceId) as unknown as DbSingleQuery;
    lifecycle = await fetchSingleRow(q);

    if (lifecycle) {
      const l = lifecycle as { lifetime_value_stage?: string; lifecycle_stage?: string };
      if (l.lifetime_value_stage === "repeat" || l.lifetime_value_stage === "vip") score += 2;
      else if (l.lifecycle_stage === "repeat_client") score += 2;
    }
  } catch {
    // revenue_lifecycles may not exist in all environments
  }

  const { data: deals } = await db
    .from("deals")
    .select("value_cents, status")
    .eq("lead_id", leadId)
    .eq("workspace_id", workspaceId);

  let maxValueCents = 0;
  let totalWonCents = 0;
  for (const d of deals ?? []) {
    const cents = (d as { value_cents?: number }).value_cents ?? 0;
    const status = (d as { status?: string }).status;
    if (cents > maxValueCents) maxValueCents = cents;
    if (status === "won") totalWonCents += cents;
  }

  if (maxValueCents >= VALUE_TIER_HIGH_CENTS) score += 2;
  else if (maxValueCents >= VALUE_TIER_MEDIUM_CENTS) score += 1;

  if (totalWonCents >= VALUE_TIER_HIGH_CENTS) score += 2;
  else if (totalWonCents > 0) score += 1;

  let leadRow: unknown = null;
  try {
    const q = db.from("leads").select("metadata").eq("id", leadId) as unknown as DbSingleQuery;
    leadRow = await fetchSingleRow(q);
  } catch {
    leadRow = null;
  }
  const meta = (leadRow as { metadata?: Record<string, unknown> } | null)?.metadata ?? {};
  if (meta.source === "referral" || meta.referral === true) score += 1;
  if (meta.local === true || meta.proximity === true) score += 1;

  let conv: unknown = null;
  try {
    const q = db.from("conversations").select("id").eq("lead_id", leadId) as unknown as DbSingleQuery;
    conv = await fetchSingleRow(q);
  } catch {
    conv = null;
  }
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
      if (URGENCY_WORDS.test((m as { content?: string }).content ?? "")) {
        score += 1;
        break;
      }
    }
  }

  return Math.min(6, score);
}

/**
 * Map raw score to 0-3. Deterministic.
 */
function scoreToLevel(score: number): EconomicPriorityLevel {
  if (score >= 5) return 3;
  if (score >= 3) return 2;
  if (score >= 1) return 1;
  return 0;
}

/**
 * Get current economic priority for lead. Returns null if never computed.
 */
export async function getEconomicPriority(leadId: string): Promise<EconomicPriorityRow | null> {
  const db = getDb();
  try {
    const q = db
      .from("guarantee_economic_priority")
      .select("economic_priority_level, updated_at")
      .eq("lead_id", leadId) as unknown as DbSingleQuery;
    return (await fetchSingleRow(q)) as EconomicPriorityRow | null;
  } catch {
    return null;
  }
}

/**
 * Compute and persist economic priority. Call from cron or before decision batch.
 */
export async function updateEconomicPriority(
  leadId: string,
  workspaceId: string
): Promise<EconomicPriorityLevel> {
  const score = await computeEconomicScore(leadId, workspaceId);
  const level = scoreToLevel(score);
  const db = getDb();
  const now = new Date().toISOString();
  await db
    .from("guarantee_economic_priority")
    .upsert(
      { lead_id: leadId, workspace_id: workspaceId, economic_priority_level: level, updated_at: now },
      { onConflict: "lead_id" }
    );
  return level;
}

/**
 * Whether priority is low (0). Used to defer when capacity critical.
 */
export function isPriorityLow(level: EconomicPriorityLevel | null | undefined): boolean {
  return (level ?? 0) === 0;
}

/**
 * Whether priority is high (2 or 3). Used to prioritise booking when capacity critical.
 */
export function isPriorityHigh(level: EconomicPriorityLevel | null | undefined): boolean {
  return (level ?? 0) >= 2;
}

/**
 * Whether priority is critical (3). Used to increase stabilization attempts.
 */
export function isPriorityCritical(level: EconomicPriorityLevel | null | undefined): boolean {
  return (level ?? 0) === 3;
}
