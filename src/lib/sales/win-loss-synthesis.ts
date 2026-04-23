/**
 * Phase 46 — Win/loss cohort synthesizer.
 *
 * Aggregates per-deal WinLossResult output across cohorts and surfaces:
 *   - top themes overall and sliced by segment, industry, competitor, stage-lost
 *   - period-over-period theme deltas (emerging / fading / stable)
 *   - competitor-specific loss themes
 *   - ranked playbook adjustment recommendations with confidence
 *
 * Pure function. No I/O. Callers feed in current and (optionally) prior periods.
 */

import type {
  OutcomeReason,
  WinReason,
  LossReason,
  WinLossResult,
} from "./win-loss-extractor";

export interface CohortDeal {
  dealId: string;
  outcome: "won" | "lost";
  amount: number;
  segment?: string;
  industry?: string;
  /** Raw CRM stage at close — e.g. "proposal", "negotiation". */
  stageLost?: string;
  closedAtIso?: string;
  reasons: WinLossResult;
  /** Competitor deal tag ("salesforce", "hubspot") — optional override of reasons.winningCompetitor. */
  competitor?: string;
}

export interface WinLossSynthesisInput {
  current: CohortDeal[];
  prior?: CohortDeal[];
}

export interface ThemeCount {
  reason: OutcomeReason;
  count: number;
  share: number; // 0..1 of same-outcome pool
  avgAmount: number;
  totalAmount: number;
}

export interface CohortSlice {
  key: string;
  dealCount: number;
  wonCount: number;
  lostCount: number;
  winRate: number; // 0..1
  topWinReasons: ThemeCount[];
  topLossReasons: ThemeCount[];
}

export interface ThemeDelta {
  reason: OutcomeReason;
  outcome: "won" | "lost";
  currentShare: number;
  priorShare: number;
  absoluteDelta: number;
  relativeDelta: number;
  trend: "emerging" | "fading" | "stable";
}

export interface CompetitorLossAnalysis {
  competitor: string;
  lossCount: number;
  totalLostAmount: number;
  topReasons: ThemeCount[];
}

export interface PlaybookRecommendation {
  id: string;
  title: string;
  body: string;
  confidence: number; // 0..1
  evidenceReasons: OutcomeReason[];
  impactScore: number; // 0..1 — share × severity
}

export interface WinLossSynthesis {
  overall: CohortSlice;
  byIndustry: CohortSlice[];
  bySegment: CohortSlice[];
  byCompetitor: CompetitorLossAnalysis[];
  byStageLost: CohortSlice[];
  themeDeltas: ThemeDelta[];
  recommendations: PlaybookRecommendation[];
}

// ---------- helpers ----------

function countThemes(
  deals: CohortDeal[],
  outcome: "won" | "lost",
): ThemeCount[] {
  const pool = deals.filter((d) => d.outcome === outcome);
  const total = pool.length;
  if (total === 0) return [];
  const map: Map<OutcomeReason, { count: number; totalAmount: number }> = new Map();
  for (const d of pool) {
    const primary = d.reasons.primaryReason;
    const entry = map.get(primary) ?? { count: 0, totalAmount: 0 };
    entry.count += 1;
    entry.totalAmount += d.amount;
    map.set(primary, entry);
    for (const sec of d.reasons.secondaryReasons) {
      // secondary reasons get a half weight to avoid double-counting
      const e2 = map.get(sec) ?? { count: 0, totalAmount: 0 };
      e2.count += 0.5;
      e2.totalAmount += d.amount * 0.5;
      map.set(sec, e2);
    }
  }
  const out: ThemeCount[] = [];
  for (const [reason, { count, totalAmount }] of map) {
    out.push({
      reason,
      count,
      share: count / total,
      avgAmount: count > 0 ? totalAmount / count : 0,
      totalAmount,
    });
  }
  out.sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
  return out;
}

function sliceByKey(
  deals: CohortDeal[],
  getKey: (d: CohortDeal) => string | undefined,
): CohortSlice[] {
  const groups: Map<string, CohortDeal[]> = new Map();
  for (const d of deals) {
    const k = getKey(d);
    if (!k) continue;
    const arr = groups.get(k) ?? [];
    arr.push(d);
    groups.set(k, arr);
  }
  const slices: CohortSlice[] = [];
  for (const [key, arr] of groups) {
    const won = arr.filter((d) => d.outcome === "won");
    const lost = arr.filter((d) => d.outcome === "lost");
    slices.push({
      key,
      dealCount: arr.length,
      wonCount: won.length,
      lostCount: lost.length,
      winRate: arr.length > 0 ? won.length / arr.length : 0,
      topWinReasons: countThemes(arr, "won").slice(0, 5),
      topLossReasons: countThemes(arr, "lost").slice(0, 5),
    });
  }
  slices.sort((a, b) => b.dealCount - a.dealCount || a.key.localeCompare(b.key));
  return slices;
}

function competitorAnalysis(deals: CohortDeal[]): CompetitorLossAnalysis[] {
  const groups: Map<string, CohortDeal[]> = new Map();
  for (const d of deals) {
    if (d.outcome !== "lost") continue;
    const comp = d.competitor ?? d.reasons.winningCompetitor;
    if (!comp) continue;
    const arr = groups.get(comp) ?? [];
    arr.push(d);
    groups.set(comp, arr);
  }
  const out: CompetitorLossAnalysis[] = [];
  for (const [competitor, arr] of groups) {
    out.push({
      competitor,
      lossCount: arr.length,
      totalLostAmount: arr.reduce((s, d) => s + d.amount, 0),
      topReasons: countThemes(arr, "lost").slice(0, 5),
    });
  }
  out.sort((a, b) => b.totalLostAmount - a.totalLostAmount);
  return out;
}

function computeDeltas(
  current: CohortDeal[],
  prior: CohortDeal[],
): ThemeDelta[] {
  const out: ThemeDelta[] = [];
  for (const outcome of ["won", "lost"] as const) {
    const currThemes = countThemes(current, outcome);
    const priorThemes = countThemes(prior, outcome);
    const priorByReason: Record<string, ThemeCount> = {};
    for (const t of priorThemes) priorByReason[t.reason] = t;
    const seen = new Set<string>();
    for (const t of currThemes) {
      seen.add(t.reason);
      const p = priorByReason[t.reason];
      const priorShare = p?.share ?? 0;
      const absoluteDelta = t.share - priorShare;
      const relativeDelta = priorShare > 0 ? absoluteDelta / priorShare : t.share > 0 ? Infinity : 0;
      const trend =
        absoluteDelta > 0.05 ? "emerging"
        : absoluteDelta < -0.05 ? "fading"
        : "stable";
      out.push({
        reason: t.reason,
        outcome,
        currentShare: t.share,
        priorShare,
        absoluteDelta,
        relativeDelta,
        trend,
      });
    }
    // include reasons that disappeared
    for (const p of priorThemes) {
      if (seen.has(p.reason)) continue;
      out.push({
        reason: p.reason,
        outcome,
        currentShare: 0,
        priorShare: p.share,
        absoluteDelta: -p.share,
        relativeDelta: -1,
        trend: p.share > 0.05 ? "fading" : "stable",
      });
    }
  }
  // Most volatile first
  out.sort((a, b) => Math.abs(b.absoluteDelta) - Math.abs(a.absoluteDelta));
  return out;
}

// ---------- recommendations ----------

interface RecommendationSeed {
  id: string;
  title: string;
  body: string;
  triggeredBy: OutcomeReason[];
  outcome: "won" | "lost";
  /** Extra confidence bonus per trigger match. */
  severity: number;
}

const SEED: RecommendationSeed[] = [
  {
    id: "price-defense",
    title: "Tighten price-defense playbook",
    body: "Multiple losses cite price. Roll out ROI calculator, multi-year incentives, and value-based discovery script.",
    triggeredBy: ["price_too_high"],
    outcome: "lost",
    severity: 0.9,
  },
  {
    id: "feature-gap-prioritization",
    title: "Prioritize product gaps driving losses",
    body: "Losses attributed to missing features — feed top gaps into product council and build feature-request battlecards.",
    triggeredBy: ["missing_feature"],
    outcome: "lost",
    severity: 0.85,
  },
  {
    id: "competitive-playbook",
    title: "Strengthen competitive battlecards",
    body: "Competitor-driven losses above baseline. Update trap-setting questions, landmines, and 3rd-party proof per competitor.",
    triggeredBy: ["competitor_won"],
    outcome: "lost",
    severity: 0.9,
  },
  {
    id: "ghosting-prevention",
    title: "Deploy ghosting-prevention cadence",
    body: "Ghosted deals above acceptable rate — enforce mutual action plans, EB-date anchor, and exec reach-out at day 14 silence.",
    triggeredBy: ["ghosted"],
    outcome: "lost",
    severity: 0.8,
  },
  {
    id: "no-decision-hygiene",
    title: "Qualify out 'no-decision' earlier",
    body: "High share of no_decision_made — add compelling-event qualifier, cost-of-inaction quantification, and stricter MEDDPICC gates.",
    triggeredBy: ["no_decision_made", "timing_wrong"],
    outcome: "lost",
    severity: 0.85,
  },
  {
    id: "champion-retention",
    title: "Invest in champion retention",
    body: "Champion-departure losses elevated — add executive sponsor program and multi-thread requirement before stage 3.",
    triggeredBy: ["lost_champion"],
    outcome: "lost",
    severity: 0.85,
  },
  {
    id: "compliance-preclearance",
    title: "Pre-clear compliance earlier",
    body: "Compliance-blocker losses elevated — front-load security review, data residency, and audit docs in stage 2.",
    triggeredBy: ["compliance_blocker"],
    outcome: "lost",
    severity: 0.8,
  },
  {
    id: "value-replication",
    title: "Replicate value-driven wins",
    body: "Wins concentrated around feature_fit / ROI — package into case studies and ROI calculators for every rep.",
    triggeredBy: ["feature_fit", "price_competitive"],
    outcome: "won",
    severity: 0.5,
  },
  {
    id: "urgency-replication",
    title: "Replicate urgency plays",
    body: "Timing-urgent wins pattern — build trigger-based plays (funding, new exec, compliance deadline) and repeat across cohort.",
    triggeredBy: ["timing_urgent"],
    outcome: "won",
    severity: 0.5,
  },
  {
    id: "expansion-motion",
    title: "Double down on expansion motion",
    body: "Expansion wins outpacing new-logo — reallocate CSM and AM capacity toward expansion playbooks.",
    triggeredBy: ["expansion_existing_customer"],
    outcome: "won",
    severity: 0.6,
  },
];

function buildRecommendations(
  current: CohortDeal[],
  deltas: ThemeDelta[],
): PlaybookRecommendation[] {
  const lossThemes = countThemes(current, "lost");
  const winThemes = countThemes(current, "won");
  const byReasonLoss: Record<string, ThemeCount> = {};
  for (const t of lossThemes) byReasonLoss[t.reason] = t;
  const byReasonWin: Record<string, ThemeCount> = {};
  for (const t of winThemes) byReasonWin[t.reason] = t;
  const deltaByReason: Record<string, ThemeDelta> = {};
  for (const d of deltas) deltaByReason[`${d.outcome}:${d.reason}`] = d;

  const out: PlaybookRecommendation[] = [];
  for (const seed of SEED) {
    const pool = seed.outcome === "lost" ? byReasonLoss : byReasonWin;
    const matched = seed.triggeredBy.filter((r) => pool[r] && pool[r].share > 0.05);
    if (matched.length === 0) continue;
    const shareSum = matched.reduce((s, r) => s + pool[r].share, 0);
    const deltaSum = matched.reduce((s, r) => s + (deltaByReason[`${seed.outcome}:${r}`]?.absoluteDelta ?? 0), 0);
    const confidence = Math.min(1, 0.3 + shareSum * 0.8 + Math.max(0, deltaSum) * 1.5);
    const impactScore = Math.min(1, shareSum * seed.severity + Math.max(0, deltaSum));
    out.push({
      id: seed.id,
      title: seed.title,
      body: seed.body,
      confidence,
      evidenceReasons: matched,
      impactScore,
    });
  }
  out.sort((a, b) => b.impactScore - a.impactScore);
  return out;
}

// ---------- public entry ----------

export function synthesizeWinLoss(input: WinLossSynthesisInput): WinLossSynthesis {
  const { current, prior = [] } = input;
  const won = current.filter((d) => d.outcome === "won");
  const lost = current.filter((d) => d.outcome === "lost");
  const overall: CohortSlice = {
    key: "overall",
    dealCount: current.length,
    wonCount: won.length,
    lostCount: lost.length,
    winRate: current.length > 0 ? won.length / current.length : 0,
    topWinReasons: countThemes(current, "won").slice(0, 5),
    topLossReasons: countThemes(current, "lost").slice(0, 5),
  };

  const byIndustry = sliceByKey(current, (d) => d.industry);
  const bySegment = sliceByKey(current, (d) => d.segment);
  const byStageLost = sliceByKey(
    current.filter((d) => d.outcome === "lost"),
    (d) => d.stageLost,
  );
  const byCompetitor = competitorAnalysis(current);
  const themeDeltas = computeDeltas(current, prior);
  const recommendations = buildRecommendations(current, themeDeltas);

  return {
    overall,
    byIndustry,
    bySegment,
    byCompetitor,
    byStageLost,
    themeDeltas,
    recommendations,
  };
}

// Re-export convenience type for callers
export type { OutcomeReason, WinReason, LossReason };
