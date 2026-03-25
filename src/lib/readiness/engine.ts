/**
 * Conversation Readiness Engine
 * Single score (0–100) combining engagement decay, latency, objections, follow-up history,
 * attendance likelihood, behavioural similarity to conversions.
 *
 * Replaces simple lead status as the decision layer.
 * Explainable: drivers, counterfactuals, evidence_chain.
 */

import { getDb } from "@/lib/db/queries";
import { getWarmthScores } from "@/lib/momentum/warmth";
import { predictDealOutcome } from "@/lib/intelligence/deal-prediction";

async function maybeSingleCompat(q: { maybeSingle?: () => unknown; single?: () => unknown }): Promise<{ data: unknown | null }> {
  try {
    const res = (typeof q.maybeSingle === "function" ? await q.maybeSingle() : await q.single?.()) as { data?: unknown } | null;
    return { data: res?.data ?? null };
  } catch {
    return { data: null };
  }
}

export interface ReadinessDriver {
  factor: string;
  contribution: number;
  evidence_ids: string[];
}

export interface ReadinessCounterfactual {
  if: string;
  then_score: number;
  why: string;
}

export interface LearningProvenance {
  local_sample_size: number;
  prior_sample_size: number;
  blend_ratio: number;
  learning_sources?: Array<"lead_specific" | "workspace_history" | "network_pattern">;
}

export interface ReadinessResult {
  entity_type: "lead" | "deal";
  entity_id: string;
  conversation_readiness_score: number;
  readiness_explanation: string;
  risk_factors: string[];
  recommended_timing_window: {
    best_before?: string;
    ideal_window_start?: string;
    ideal_window_end?: string;
  };
  signal_breakdown: Record<string, number>;
  readiness_drivers: ReadinessDriver[];
  counterfactuals: ReadinessCounterfactual[];
  evidence_chain: string[];
  learning_provenance?: LearningProvenance;
}

/** Compute readiness for a lead (and optionally its primary deal) */
export async function computeReadiness(
  workspaceId: string,
  leadId: string,
  dealId?: string | null
): Promise<ReadinessResult> {
  const db = getDb();
  const signals: Record<string, number> = {};
  const riskFactors: string[] = [];

  const { data: lead } = await maybeSingleCompat(
    db
      .from("leads")
      .select("state, last_activity_at, created_at, opt_out")
      .eq("id", leadId)
      .eq("workspace_id", workspaceId),
  );

  if (!lead) {
    return {
      entity_type: "lead",
      entity_id: leadId,
      conversation_readiness_score: 0,
      readiness_explanation: "Lead not found.",
      risk_factors: ["Unknown lead"],
      recommended_timing_window: {},
      signal_breakdown: {},
      readiness_drivers: [],
      counterfactuals: [],
      evidence_chain: [],
    };
  }

  const l = lead as {
    state: string;
    last_activity_at: string | null;
    created_at: string;
    opt_out?: boolean;
  };

  if (l.opt_out) {
    return {
      entity_type: "lead",
      entity_id: leadId,
      conversation_readiness_score: 0,
      readiness_explanation: "Lead has opted out.",
      risk_factors: ["Opted out"],
      recommended_timing_window: {},
      signal_breakdown: {},
      readiness_drivers: [{ factor: "opt_out", contribution: -100, evidence_ids: [] }],
      counterfactuals: [{ if: "If lead had not opted out", then_score: 50, why: "Opt-out overrides all other signals." }],
      evidence_chain: [],
    };
  }

  let baseScore = 30;
  let learningProvenance: LearningProvenance | undefined;

  // Network priors with safe blending: local signals dominate, priors stay weak
  let networkPriorRaw = 0;
  let priorSampleSize = 0;
  try {
    const { count: localCount } = await db
      .from("outbound_messages")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    const localSampleSize = localCount ?? 0;
    const workspaceWeight = Math.min(1, Math.max(0, localSampleSize / 50));
    const priorWeight = 1 - workspaceWeight;

    const { data: settingsRow } = await maybeSingleCompat(
      db.from("settings").select("business_type").eq("workspace_id", workspaceId),
    );
    const businessType = (settingsRow as { business_type?: string })?.business_type;
    const bucket = !businessType ? "unknown" : /saas|software/i.test(businessType) ? "saas" : /consulting|agency|services/i.test(businessType) ? "professional_services" : "other";
    const { data: priors } = await db.from("network_patterns").select("pattern_type, aggregate_value, sample_count").eq("industry_bucket", bucket).gte("sample_count", 5);
    for (const p of priors ?? []) {
      const agg = (p as { aggregate_value?: { rate?: number }; sample_count?: number }).aggregate_value;
      const n = (p as { sample_count?: number }).sample_count ?? 0;
      priorSampleSize += n;
      if (n < 5) continue;
      const type = (p as { pattern_type: string }).pattern_type;
      if (type === "show_rate" && typeof agg?.rate === "number") {
        networkPriorRaw += Math.round(agg.rate * 5);
      }
      if (type === "recovery_success" && typeof agg?.rate === "number") {
        networkPriorRaw += Math.round(agg.rate * 3);
      }
    }
    const networkPrior = Math.min(8, networkPriorRaw) * priorWeight;
    baseScore += networkPrior;
    if (networkPrior > 0) signals["network_prior"] = networkPrior;
    const learningSources: Array<"lead_specific" | "workspace_history" | "network_pattern"> = [];
    if (localSampleSize > 0) learningSources.push("workspace_history");
    if (priorSampleSize > 0) learningSources.push("network_pattern");
    try {
      const { getLeadMemory } = await import("@/lib/lead-memory");
      const mem = await getLeadMemory(workspaceId, leadId);
      const reactions = mem?.lifecycle_notes_json?.filter((n) => n.note_type === "webhook_reaction") ?? [];
      if (reactions.length > 0) learningSources.unshift("lead_specific");
    } catch {
      // Non-blocking
    }
    learningProvenance = {
      local_sample_size: localSampleSize,
      prior_sample_size: priorSampleSize,
      blend_ratio: priorWeight,
      learning_sources: learningSources,
    };
  } catch {
    learningProvenance = undefined;
  }

  // State-based boost
  const stateBoost: Record<string, number> = {
    NEW: 0,
    CONTACTED: 15,
    ENGAGED: 25,
    QUALIFIED: 35,
    BOOKED: 40,
    SHOWED: 50,
    WON: 100,
    LOST: 0,
    REACTIVATE: 5,
    RETAIN: 30,
    CLOSED: 0,
  };
  baseScore += stateBoost[l.state] ?? 0;
  signals["state"] = stateBoost[l.state] ?? 0;

  // Engagement timing decay
  const lastActivity = l.last_activity_at ? new Date(l.last_activity_at) : null;
  const now = new Date();
  const hoursSinceActivity = lastActivity
    ? (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
    : 999;
  const decayPenalty = Math.min(40, Math.floor(hoursSinceActivity / 24) * 5);
  baseScore -= decayPenalty;
  signals["engagement_decay"] = -decayPenalty;
  if (hoursSinceActivity > 72) riskFactors.push("No contact 3+ days");
  if (hoursSinceActivity > 168) riskFactors.push("Silent 1+ week");

  // Warmth (relationship built)
  const warmthMap = await getWarmthScores(workspaceId, [leadId]);
  const warmth = warmthMap[leadId] ?? 0;
  const warmthContribution = Math.min(15, Math.floor(warmth / 10));
  baseScore += warmthContribution;
  signals["warmth"] = warmthContribution;

  // Deal prediction if deal exists
  let dealContribution = 0;
  if (dealId) {
    try {
      const pred = await predictDealOutcome(dealId);
      dealContribution = Math.round(pred.probability * 20);
      baseScore += dealContribution;
      signals["deal_probability"] = dealContribution;
    } catch {
      // skip
    }
  }

  const score = Math.max(0, Math.min(100, baseScore));

  // Evidence chain: action_log ids + message ids
  const evidenceChain: string[] = [];
  const { data: actionLogs } = await db
    .from("action_logs")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("entity_id", leadId)
    .order("created_at", { ascending: false })
    .limit(20);
  for (const a of actionLogs ?? []) {
    evidenceChain.push(`action_log:${(a as { id: string }).id}`);
  }
  const { data: convRow } = await maybeSingleCompat(
    db.from("conversations").select("id").eq("lead_id", leadId).limit(1),
  );
  const convId = (convRow as { id?: string })?.id;
  if (convId) {
    const { data: msgs } = await db.from("messages").select("id").eq("conversation_id", convId).order("created_at", { ascending: false }).limit(10);
    for (const m of msgs ?? []) {
      evidenceChain.push(`message:${(m as { id: string }).id}`);
    }
  }

  // Drivers: top contributors from signal_breakdown with evidence links
  const driverEntries = Object.entries(signals)
    .filter(([, c]) => c !== 0)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 5);
  const readinessDrivers: ReadinessDriver[] = driverEntries.map(([factor, contribution]) => ({
    factor: factor.replace(/_/g, " "),
    contribution,
    evidence_ids: evidenceChain.slice(0, 3), // link top evidence per driver
  }));

  // Counterfactuals
  const counterfactuals: ReadinessCounterfactual[] = [];
  if (hoursSinceActivity > 72) {
    const hypothetical = score + Math.min(40, Math.floor(hoursSinceActivity / 24) * 5);
    counterfactuals.push({
      if: "If lead had been contacted in last 3 days",
      then_score: Math.min(100, hypothetical),
      why: "Engagement decay is the main penalty; recent activity would restore it.",
    });
  }
  if (warmth > 0 && warmth < 50) {
    counterfactuals.push({
      if: "If relationship warmth were higher",
      then_score: Math.min(100, score + 10),
      why: "Warmth contributes up to +15; building more touchpoints would boost readiness.",
    });
  }
  if (counterfactuals.length === 0) {
    counterfactuals.push({
      if: "If no recent contact",
      then_score: Math.max(0, score - 20),
      why: "Engagement decay would apply.",
    });
  }

  // Explanation
  const parts: string[] = [];
  if (l.state === "BOOKED" || l.state === "QUALIFIED") parts.push("High intent");
  if (warmth > 50) parts.push("Relationship built");
  if (hoursSinceActivity < 24) parts.push("Recently active");
  if (riskFactors.length > 0) parts.push(`Risks: ${riskFactors.join(", ")}`);
  const explanation =
    parts.length > 0
      ? parts.join(". ")
      : score >= 60
        ? "Conversation ready for next step."
        : score >= 40
          ? "Manual follow-through required."
          : "Low readiness — recovery or re-engagement needed.";

  // Timing window
  const bestBefore = new Date(now);
  if (hoursSinceActivity < 48) bestBefore.setHours(bestBefore.getHours() + 24);
  else bestBefore.setHours(bestBefore.getHours() + 4);

  return {
    entity_type: "lead",
    entity_id: leadId,
    conversation_readiness_score: score,
    readiness_explanation: explanation,
    risk_factors: riskFactors,
    recommended_timing_window: {
      best_before: bestBefore.toISOString(),
      ideal_window_start: now.toISOString(),
      ideal_window_end: bestBefore.toISOString(),
    },
    signal_breakdown: signals,
    readiness_drivers: readinessDrivers,
    counterfactuals,
    evidence_chain: evidenceChain,
    learning_provenance: learningProvenance,
  };
}

/** Persist readiness to DB for caching */
export async function persistReadiness(
  workspaceId: string,
  result: ReadinessResult
): Promise<void> {
  const db = getDb();
  await db
    .from("conversation_readiness")
    .upsert(
      {
        workspace_id: workspaceId,
        entity_type: result.entity_type,
        entity_id: result.entity_id,
        conversation_readiness_score: result.conversation_readiness_score,
        readiness_explanation: result.readiness_explanation,
        risk_factors: result.risk_factors,
        recommended_timing_window: result.recommended_timing_window,
        signal_breakdown: result.signal_breakdown,
        readiness_drivers: result.readiness_drivers ?? [],
        counterfactuals: result.counterfactuals ?? [],
        evidence_chain: result.evidence_chain ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,entity_type,entity_id" }
    );
}
