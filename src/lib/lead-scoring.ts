/**
 * Lead scoring: 0–100 from call/event signals.
 * Recalculate on each new call or event; store in leads.metadata.score.
 * Configurable per workspace via workspace_lead_scoring_config.
 */

export interface LeadScoringEvent {
  type: "call" | "sms" | "note" | "stage_change" | "demo_call";
  /** Call duration in seconds */
  durationSeconds?: number;
  sentiment?: "positive" | "neutral" | "negative";
  /** Asked about pricing */
  pricingQuestion?: boolean;
  /** Outcome: booked appointment */
  booked?: boolean;
  /** Return caller (had prior contact) */
  returnCaller?: boolean;
  /** "Just browsing" or low intent */
  justBrowsing?: boolean;
  /** Demo call engagement: number of conversation turns */
  demoTurns?: number;
  /** Demo call quality classification */
  demoQuality?: "high" | "medium" | "low";
}

/** Optional per-workspace weights. Omitted keys use defaults. */
export interface LeadScoringConfig {
  baseScore?: number;
  callCount?: number;
  durationOver2Min?: number;
  positiveSentiment?: number;
  pricingQuestion?: number;
  booked?: number;
  returnCaller?: number;
  negativeSentiment?: number;
  justBrowsing?: number;
  /** Demo-specific scoring weights */
  demoCallBase?: number;
  demoHighEngagement?: number;
  demoMediumEngagement?: number;
  demoRepeatCaller?: number;
}

const DEFAULT_DELTAS = {
  baseScore: 50,
  callCount: 10,
  durationOver2Min: 15,
  positiveSentiment: 20,
  pricingQuestion: 15,
  booked: 25,
  returnCaller: 20,
  negativeSentiment: -15,
  justBrowsing: -10,
  // Demo call scoring: people who try the demo are already interested
  demoCallBase: 15,
  demoHighEngagement: 25,    // 6+ turns, 2+ minutes — very interested
  demoMediumEngagement: 12,  // 3+ turns — somewhat interested
  demoRepeatCaller: 10,      // Came back for another demo — strong signal
} as const;

const MIN_SCORE = 0;
const MAX_SCORE = 100;

export function getDefaultScoringConfig(): Required<LeadScoringConfig> {
  return { ...DEFAULT_DELTAS };
}

/**
 * Compute lead score from a list of events (e.g. calls, SMS, notes).
 * Clamps to 0–100. Uses config weights when provided.
 */
export function calculateLeadScore(
  events: LeadScoringEvent[],
  config?: LeadScoringConfig | null
): number {
  const c = config ? { ...DEFAULT_DELTAS, ...config } : DEFAULT_DELTAS;
  let score = c.baseScore;

  for (const e of events) {
    if (e.type === "call") {
      score += c.callCount;
      if ((e.durationSeconds ?? 0) > 120) score += c.durationOver2Min;
      if (e.sentiment === "positive") score += c.positiveSentiment;
      if (e.sentiment === "negative") score += c.negativeSentiment;
      if (e.pricingQuestion) score += c.pricingQuestion;
      if (e.booked) score += c.booked;
      if (e.returnCaller) score += c.returnCaller;
      if (e.justBrowsing) score += c.justBrowsing;
    }

    // Demo call scoring — people who try the demo are pre-qualified leads
    if (e.type === "demo_call") {
      score += c.demoCallBase;
      if (e.demoQuality === "high" || (e.demoTurns ?? 0) >= 6) {
        score += c.demoHighEngagement;
      } else if (e.demoQuality === "medium" || (e.demoTurns ?? 0) >= 3) {
        score += c.demoMediumEngagement;
      }
      if (e.returnCaller) score += c.demoRepeatCaller;
      // Demo callers who ask about pricing are very hot
      if (e.pricingQuestion) score += c.pricingQuestion;
    }
  }

  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(score)));
}

/**
 * Build a single event from call session data for scoring.
 */
export function eventFromCall(params: {
  durationSeconds?: number;
  sentiment?: "positive" | "neutral" | "negative";
  outcome?: string | null;
  summary?: string | null;
  isReturnCaller?: boolean;
}): LeadScoringEvent {
  const summary = (params.summary ?? "").toLowerCase();
  return {
    type: "call",
    durationSeconds: params.durationSeconds,
    sentiment: params.sentiment ?? "neutral",
    pricingQuestion: /price|pricing|cost|how much|quote/.test(summary),
    booked: params.outcome === "appointment" || /booked|appointment|scheduled/.test(summary),
    returnCaller: params.isReturnCaller,
    justBrowsing: /just looking|browsing|not interested|just checking/.test(summary),
  };
}

/**
 * Load workspace lead scoring config from DB (if table exists). Returns null for defaults.
 */
export async function getWorkspaceScoringConfig(
  workspaceId: string
): Promise<LeadScoringConfig | null> {
  try {
    const { getDb } = await import("@/lib/db/queries");
    const db = getDb();
    const { data: row } = await db
      .from("workspace_lead_scoring_config")
      .select("config")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    const config = (row as { config?: LeadScoringConfig } | null)?.config;
    return config && typeof config === "object" ? config : null;
  } catch {
    return null;
  }
}

/**
 * Recalculate lead score from call (and optional) interactions and persist to lead.metadata.score.
 * Call after post-call or when syncing lead state.
 */
export async function recalculateLeadScoreFromDb(leadId: string): Promise<number | null> {
  const { getDb } = await import("@/lib/db/queries");
  const db = getDb();

  const { data: lead } = await db
    .from("leads")
    .select("id, workspace_id, metadata")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return null;

  const workspaceId = (lead as { workspace_id?: string }).workspace_id;
  if (!workspaceId) return null;

  const { data: sessions } = await db
    .from("call_sessions")
    .select("id, summary, outcome, call_started_at, call_ended_at")
    .eq("lead_id", leadId)
    .order("call_started_at", { ascending: true });

  const sessionIds = (sessions ?? []).map((s: { id: string }) => s.id);
  const analysisBySession: Record<string, { outcome?: string; summary?: string; sentiment?: string }> = {};
  if (sessionIds.length > 0) {
    const { data: analyses } = await db
      .from("call_analysis")
      .select("call_session_id, analysis_json")
      .in("call_session_id", sessionIds);
    for (const a of analyses ?? []) {
      const row = a as { call_session_id: string; analysis_json?: { outcome?: string; summary?: string; sentiment?: string } };
      if (row.call_session_id && row.analysis_json)
        analysisBySession[row.call_session_id] = row.analysis_json;
    }
  }

  const events: LeadScoringEvent[] = [];
  let priorCalls = 0;
  for (const s of sessions ?? []) {
    const row = s as {
      id: string;
      summary?: string | null;
      outcome?: string | null;
      call_started_at?: string | null;
      call_ended_at?: string | null;
    };
    const analysis = analysisBySession[row.id] ?? {};
    const start = row.call_started_at ? new Date(row.call_started_at).getTime() : 0;
    const end = row.call_ended_at ? new Date(row.call_ended_at).getTime() : 0;
    const durationSeconds = start && end && end >= start ? Math.round((end - start) / 1000) : undefined;
    const outcome = row.outcome ?? analysis.outcome ?? null;
    const summary = (row.summary ?? analysis.summary ?? "").toString();
    const sentiment =
      analysis.sentiment === "positive" || analysis.sentiment === "negative"
        ? (analysis.sentiment as "positive" | "negative")
        : "neutral";
    events.push(
      eventFromCall({
        durationSeconds,
        sentiment,
        outcome,
        summary,
        isReturnCaller: priorCalls > 0,
      })
    );
    priorCalls += 1;
  }

  const config = await getWorkspaceScoringConfig(workspaceId);
  const score = calculateLeadScore(events, config);

  const meta = (lead as { metadata?: Record<string, unknown> }).metadata ?? {};
  const nextMeta = { ...meta, score };

  await db
    .from("leads")
    .update({
      metadata: nextMeta,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  return score;
}
