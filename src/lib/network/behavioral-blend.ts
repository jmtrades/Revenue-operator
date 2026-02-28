/**
 * Behavioral Blend — 3-level knowledge hierarchy.
 * lead_memory (strongest) > workspace_history (medium) > behavioral_patterns (weakest)
 * Influences confidence only. Never overrides safety rules.
 */

import { getDb } from "@/lib/db/queries";
import { getLeadMemory } from "@/lib/lead-memory";

export type LearningSource = "lead_specific" | "workspace_history" | "network_pattern";

export interface BlendedExpectationResult {
  expected_success: number;
  learning_sources: LearningSource[];
  lead_memory_weight: number;
  workspace_weight: number;
  behavioral_weight: number;
}

const BASE_LEAD = 0.6;
const BASE_WORKSPACE = 0.3;
const BASE_BEHAVIORAL = 0.1;

const COLD_START_BEHAVIORAL = 0.35;
const MATURE_BEHAVIORAL = 0.05;
const COLD_START_THRESHOLD = 20;
const MATURE_THRESHOLD = 100;

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

/** Lead memory expectation: from past reactions (lifecycle_notes) positive outcomes */
async function getLeadMemoryExpectation(workspaceId: string, leadId: string): Promise<{ value: number; hasData: boolean }> {
  const mem = await getLeadMemory(workspaceId, leadId);
  const reactions = mem?.lifecycle_notes_json?.filter((n) => n.note_type === "webhook_reaction") ?? [];
  if (!reactions.length) return { value: 0, hasData: false };
  const positive = reactions.filter((r) => /replied|booked|positive|yes|engaged/i.test(r.outcome ?? "")).length;
  const rate = reactions.length > 0 ? positive / reactions.length : 0;
  return { value: rate, hasData: true };
}

/** Workspace history: booking + positive outcome rate for this workspace */
async function getWorkspaceExpectation(
  workspaceId: string,
  _stage: string,
  _messageType: string
): Promise<{ value: number; hasData: boolean }> {
  const db = getDb();
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { count: total } = await db
    .from("outbound_messages")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "sent")
    .gte("sent_at", since);
  if ((total ?? 0) < 5) return { value: 0.5, hasData: false };
  const { count: bookings } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("event_type", "booking_created")
    .gte("created_at", since);
  const t = total ?? 1;
  const b = bookings ?? 0;
  const rate = t > 0 ? 0.3 + Math.min(0.5, (b / Math.max(1, t / 15))) : 0.5;
  return { value: Math.min(1, Math.max(0.2, rate)), hasData: true };
}

/** Behavioral patterns: cross-customer aggregate for this situation */
async function getBehavioralExpectation(
  workspaceId: string,
  stage: string,
  messageType: string,
  hoursSinceLastMessage: number
): Promise<{ value: number; hasData: boolean }> {
  const db = getDb();
  const { data: settingsRow } = await db.from("settings").select("business_type").eq("workspace_id", workspaceId).single();
  const industry = toIndustryBucket((settingsRow as { business_type?: string })?.business_type);
  const timeBucket = toTimeBucket(hoursSinceLastMessage);

  const { data: rows } = await db
    .from("behavioral_patterns")
    .select("outcome, success_rate, sample_size")
    .eq("industry", industry)
    .eq("stage", stage)
    .eq("message_type", messageType)
    .eq("time_since_last_message_bucket", timeBucket)
    .gte("sample_size", 20);

  if (!rows?.length) return { value: 0.5, hasData: false };
  const positiveOutcomes = ["reply", "booked", "show", "revived"];
  const weighted = (rows as Array<{ outcome: string; success_rate: number }>).reduce(
    (s, r) => s + (positiveOutcomes.includes(r.outcome) ? r.success_rate : 0),
    0
  );
  return { value: Math.min(1, Math.max(0, weighted)), hasData: true };
}

/**
 * Compute blended expected success for confidence adjustment.
 * Cold start (< 20 samples): behavioral_weight = 0.35
 * Mature (> 100 samples): behavioral_weight = 0.05
 */
export async function getBlendedExpectation(
  workspaceId: string,
  leadId: string,
  context: {
    stage: string;
    messageType: string;
    hoursSinceLastMessage: number;
  }
): Promise<BlendedExpectationResult> {
  const [leadMem, workspaceHist, behavioral] = await Promise.all([
    getLeadMemoryExpectation(workspaceId, leadId),
    getWorkspaceExpectation(workspaceId, context.stage, context.messageType),
    getBehavioralExpectation(workspaceId, context.stage, context.messageType, context.hoursSinceLastMessage),
  ]);

  const db = getDb();
  const { count: localSamples } = await db
    .from("outbound_messages")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  const n = localSamples ?? 0;

  let leadW = BASE_LEAD;
  let wsW = BASE_WORKSPACE;
  const behW = n < COLD_START_THRESHOLD ? COLD_START_BEHAVIORAL : n >= MATURE_THRESHOLD ? MATURE_BEHAVIORAL : BASE_BEHAVIORAL;

  if (!leadMem.hasData) {
    const total = leadW + wsW + behW;
    wsW = (wsW / total) * (1 - behW);
    leadW = 0;
  }

  const expected =
    (leadMem.hasData ? leadMem.value * leadW : 0) +
    workspaceHist.value * wsW +
    behavioral.value * behW;

  const totalW = (leadMem.hasData ? leadW : 0) + wsW + behW;
  const normalized = totalW > 0 ? expected / totalW : 0.5;

  const sources: LearningSource[] = [];
  if (leadMem.hasData) sources.push("lead_specific");
  if (workspaceHist.hasData) sources.push("workspace_history");
  if (behavioral.hasData) sources.push("network_pattern");

  return {
    expected_success: Math.min(1, Math.max(0, normalized)),
    learning_sources: sources,
    lead_memory_weight: leadMem.hasData ? leadW : 0,
    workspace_weight: wsW,
    behavioral_weight: behW,
  };
}
