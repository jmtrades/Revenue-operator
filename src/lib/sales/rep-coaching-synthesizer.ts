/**
 * Phase 51 — Rep coaching synthesizer.
 *
 * Takes aggregated signals about a rep across a coaching window:
 *   - RepScorecard (activity / quality / outcomes / compliance)
 *   - Aggregated TalkRatioReport stats across sampled calls
 *   - Aggregated PlaybookCompliance across sampled calls
 *   - Deal-level win/loss signals (stall rates, push rates, reasons)
 *
 * Produces a coaching plan:
 *   - focusAreas : ranked weaknesses (e.g., "ask more discovery questions")
 *   - drills     : concrete weekly exercises
 *   - goals      : measurable, timeboxed targets for the next cycle
 *   - managerBrief : short executive summary for 1:1
 *
 * Pure, deterministic. No I/O.
 */

import type { RepScorecard } from "./rep-scorecard";
import type { TalkRatioReport } from "./talk-ratio-analyzer";
import type { PlaybookCompliance } from "./playbook-compliance";

// ---------- Inputs ----------

export interface DealSignalSummary {
  dealsInCycle: number;
  dealsClosedWon: number;
  dealsClosedLost: number;
  dealsStalled: number;
  avgStagePushCount: number;
  topLossReasons: string[];
  topWinReasons: string[];
}

export interface TalkRatioAggregate {
  callsSampled: number;
  avgRepTalkShare: number; // 0..1
  avgProspectTalkShare: number; // 0..1
  avgLongestMonologueSeconds: number;
  avgQuestionsPerCall: number;
  avgInterruptions: number;
  avgFillerDensity: number; // 0..1
  balancedCallsPct: number; // fraction of calls with balanced=true
}

export interface PlaybookAggregate {
  callsSampled: number;
  avgScore: number; // 0..100
  sectionCoverage: Array<{ sectionId: string; label: string; coveragePct: number }>;
  commonMisses: string[];
}

export interface CoachingInput {
  rep: {
    id: string;
    name: string;
    tenureMonths: number;
    segment?: string;
  };
  windowStart: string;
  windowEnd: string;
  scorecard?: RepScorecard;
  talkRatio?: TalkRatioAggregate;
  playbook?: PlaybookAggregate;
  dealSignals?: DealSignalSummary;
  /** Raw single-call reports if caller wants per-call granularity. Optional. */
  sampledCalls?: {
    talkRatio?: TalkRatioReport[];
    playbook?: PlaybookCompliance[];
  };
}

// ---------- Outputs ----------

export type FocusCategory =
  | "discovery_quality"
  | "talk_balance"
  | "objection_handling"
  | "multi_threading"
  | "qualification_rigor"
  | "activity_volume"
  | "compliance"
  | "close_discipline"
  | "forecasting_accuracy"
  | "followup_consistency"
  | "mutual_planning"
  | "pricing_discipline";

export interface FocusArea {
  category: FocusCategory;
  label: string;
  severity: "low" | "medium" | "high";
  evidence: string[];
  weight: number; // used for ordering
}

export interface CoachingDrill {
  category: FocusCategory;
  title: string;
  cadence: "daily" | "weekly" | "bi_weekly";
  description: string;
  successCriteria: string;
}

export interface CoachingGoal {
  category: FocusCategory;
  metric: string;
  currentValue: number | null;
  targetValue: number;
  unit: string;
  targetDueIso: string;
}

export interface CoachingPlan {
  repId: string;
  repName: string;
  windowStart: string;
  windowEnd: string;
  focusAreas: FocusArea[];
  drills: CoachingDrill[];
  goals: CoachingGoal[];
  strengths: string[];
  managerBrief: string;
  nextCheckinIso: string;
}

// ---------- Helpers ----------

const MS_DAY = 86_400_000;
const CHECKIN_DAYS = 14;

function endPlusDays(endIso: string, days: number): string {
  const t = Date.parse(endIso);
  if (Number.isNaN(t)) return endIso;
  return new Date(t + days * MS_DAY).toISOString();
}

function severityFrom(weight: number): FocusArea["severity"] {
  if (weight >= 0.75) return "high";
  if (weight >= 0.4) return "medium";
  return "low";
}

function drillFor(category: FocusCategory): CoachingDrill {
  switch (category) {
    case "discovery_quality":
      return {
        category,
        title: "5-for-1 discovery drill",
        cadence: "weekly",
        description:
          "Pick one call each week. Identify 5 open-ended discovery questions that would have deepened value. Submit to manager.",
        successCriteria: "≥5 open questions per discovery call, recorded on Gong.",
      };
    case "talk_balance":
      return {
        category,
        title: "40/60 talk-balance target",
        cadence: "daily",
        description: "End each call under 40% rep talk-share on discovery, under 60% on demo.",
        successCriteria: "Weekly rolling avg rep-share 35-45% on discovery, 50-65% on demo.",
      };
    case "objection_handling":
      return {
        category,
        title: "Objection replay drill",
        cadence: "weekly",
        description:
          "Review 3 objections per week. Script improved response and role-play with peer before next pitch.",
        successCriteria: "3 objection role-plays/week captured in LMS.",
      };
    case "multi_threading":
      return {
        category,
        title: "Stakeholder expansion drill",
        cadence: "weekly",
        description:
          "For every open deal, identify two additional stakeholders and draft tailored outreach this week.",
        successCriteria: "Avg stakeholders per open deal +1 within 2 weeks.",
      };
    case "qualification_rigor":
      return {
        category,
        title: "MEDDPICC gap-fill",
        cadence: "weekly",
        description:
          "Each open opp must have zero F-letters by Friday. Deal review blocks closure if any critical letter is missing.",
        successCriteria: "0 open opps with F on E/Dc/Dp/I/C.",
      };
    case "activity_volume":
      return {
        category,
        title: "Activity floor cadence",
        cadence: "daily",
        description:
          "Hit a minimum daily activity floor (calls+emails+SMS) consistent with team median × 1.2.",
        successCriteria: "7-day rolling activity ≥ 1.2× team median.",
      };
    case "compliance":
      return {
        category,
        title: "Compliance hygiene sprint",
        cadence: "weekly",
        description:
          "Every outbound sequence reviewed against suppression, consent, and opt-out rules before launch.",
        successCriteria: "Zero compliance violations for 14 consecutive days.",
      };
    case "close_discipline":
      return {
        category,
        title: "Close-plan first-call",
        cadence: "weekly",
        description:
          "Every deal past discovery has a mutual action plan with dates. Stop moving to proposal without it.",
        successCriteria: "100% of proposal-stage deals have MAP attached.",
      };
    case "forecasting_accuracy":
      return {
        category,
        title: "Commit integrity sprint",
        cadence: "weekly",
        description:
          "Weekly forecast commits reviewed against outcome. Push counts > 1 require written champion evidence.",
        successCriteria: "Commit hit-rate ≥ 80% for the next two cycles.",
      };
    case "followup_consistency":
      return {
        category,
        title: "24h follow-through rule",
        cadence: "daily",
        description:
          "Every demo or discovery call gets a recap email + next step within 24h.",
        successCriteria: "≥95% of calls have a next-step email in 24h.",
      };
    case "mutual_planning":
      return {
        category,
        title: "Mutual plan template install",
        cadence: "weekly",
        description:
          "Adopt standard MAP template, co-sign with champion within 5 business days of proposal stage.",
        successCriteria: "100% of proposal+ deals have signed MAP.",
      };
    case "pricing_discipline":
      return {
        category,
        title: "Discount defense drill",
        cadence: "weekly",
        description:
          "Each discount request > 15% requires rehearsed value defense before escalation.",
        successCriteria: "Avg discount on closed-won ≤ 12% over next 8 weeks.",
      };
  }
}

function goalFor(category: FocusCategory, input: CoachingInput): CoachingGoal | null {
  const due = endPlusDays(input.windowEnd, 28);
  const talk = input.talkRatio;
  const sc = input.scorecard;
  const _pb = input.playbook;
  const deals = input.dealSignals;
  switch (category) {
    case "discovery_quality":
      return {
        category,
        metric: "avg_questions_per_call",
        currentValue: talk?.avgQuestionsPerCall ?? null,
        targetValue: Math.max(10, Math.ceil((talk?.avgQuestionsPerCall ?? 0) + 3)),
        unit: "questions",
        targetDueIso: due,
      };
    case "talk_balance":
      return {
        category,
        metric: "avg_rep_talk_share",
        currentValue: talk?.avgRepTalkShare ?? null,
        targetValue: 0.45,
        unit: "ratio",
        targetDueIso: due,
      };
    case "objection_handling":
      return {
        category,
        metric: "objection_rolepays_per_week",
        currentValue: 0,
        targetValue: 3,
        unit: "per_week",
        targetDueIso: due,
      };
    case "multi_threading":
      return {
        category,
        metric: "avg_stakeholders_per_open_deal",
        currentValue: null,
        targetValue: 3,
        unit: "stakeholders",
        targetDueIso: due,
      };
    case "qualification_rigor":
      return {
        category,
        metric: "open_opps_with_failing_meddpicc",
        currentValue: null,
        targetValue: 0,
        unit: "deals",
        targetDueIso: due,
      };
    case "activity_volume":
      return {
        category,
        metric: "daily_activity",
        currentValue: sc?.metrics.activityPerDay ?? null,
        targetValue: (sc?.metrics.activityPerDay ?? 0) * 1.3 || 40,
        unit: "per_day",
        targetDueIso: due,
      };
    case "compliance":
      return {
        category,
        metric: "compliance_violations",
        currentValue: null,
        targetValue: 0,
        unit: "violations",
        targetDueIso: due,
      };
    case "close_discipline":
      return {
        category,
        metric: "avg_stage_pushes",
        currentValue: deals?.avgStagePushCount ?? null,
        targetValue: 0.5,
        unit: "per_deal",
        targetDueIso: due,
      };
    case "forecasting_accuracy":
      return {
        category,
        metric: "commit_hit_rate",
        currentValue: null,
        targetValue: 0.8,
        unit: "ratio",
        targetDueIso: due,
      };
    case "followup_consistency":
      return {
        category,
        metric: "recap_within_24h_rate",
        currentValue: null,
        targetValue: 0.95,
        unit: "ratio",
        targetDueIso: due,
      };
    case "mutual_planning":
      return {
        category,
        metric: "proposal_deals_with_map",
        currentValue: null,
        targetValue: 1,
        unit: "ratio",
        targetDueIso: due,
      };
    case "pricing_discipline":
      return {
        category,
        metric: "avg_discount_on_closed_won",
        currentValue: null,
        targetValue: 0.12,
        unit: "ratio",
        targetDueIso: due,
      };
  }
  return null;
}

// ---------- Focus detection ----------

function detectFocus(input: CoachingInput): FocusArea[] {
  const areas: FocusArea[] = [];
  const { scorecard, talkRatio, playbook, dealSignals } = input;

  if (talkRatio) {
    if (talkRatio.avgRepTalkShare > 0.6) {
      const w = Math.min(1, (talkRatio.avgRepTalkShare - 0.6) / 0.4 + 0.4);
      areas.push({
        category: "talk_balance",
        label: "Rep dominates talk time on calls",
        severity: severityFrom(w),
        evidence: [
          `Avg rep talk share ${(talkRatio.avgRepTalkShare * 100).toFixed(0)}% (target ≤55%)`,
          `Avg longest monologue ${talkRatio.avgLongestMonologueSeconds.toFixed(0)}s`,
        ],
        weight: w,
      });
    }
    if (talkRatio.avgQuestionsPerCall < 8) {
      const w = Math.min(1, (8 - talkRatio.avgQuestionsPerCall) / 8 + 0.3);
      areas.push({
        category: "discovery_quality",
        label: "Low discovery depth",
        severity: severityFrom(w),
        evidence: [`Avg ${talkRatio.avgQuestionsPerCall.toFixed(1)} questions/call (target ≥10)`],
        weight: w,
      });
    }
    if (talkRatio.avgFillerDensity > 0.05) {
      areas.push({
        category: "discovery_quality",
        label: "High filler density — reduce ums/likes",
        severity: "low",
        evidence: [`Filler density ${(talkRatio.avgFillerDensity * 100).toFixed(1)}%`],
        weight: 0.25,
      });
    }
  }

  if (playbook) {
    if (playbook.avgScore < 70) {
      const w = Math.min(1, (70 - playbook.avgScore) / 70 + 0.4);
      areas.push({
        category: "qualification_rigor",
        label: "Playbook adherence below bar",
        severity: severityFrom(w),
        evidence: [
          `Avg playbook score ${playbook.avgScore.toFixed(0)} (bar 70)`,
          ...playbook.commonMisses.slice(0, 3).map((m) => `Missed: ${m}`),
        ],
        weight: w,
      });
    }
  }

  if (scorecard) {
    if (scorecard.dimensions.activity < 50) {
      const w = (50 - scorecard.dimensions.activity) / 50;
      areas.push({
        category: "activity_volume",
        label: "Activity volume below team baseline",
        severity: severityFrom(w),
        evidence: [`Activity dimension ${scorecard.dimensions.activity}`],
        weight: w,
      });
    }
    if (scorecard.dimensions.compliance < 60) {
      areas.push({
        category: "compliance",
        label: "Compliance dimension weak",
        severity: "high",
        evidence: [`Compliance dimension ${scorecard.dimensions.compliance}`],
        weight: 0.9,
      });
    }
    if (scorecard.metrics.meetingShowRate < 0.6) {
      areas.push({
        category: "followup_consistency",
        label: "Meeting no-show rate elevated",
        severity: "medium",
        evidence: [`Show rate ${(scorecard.metrics.meetingShowRate * 100).toFixed(0)}%`],
        weight: 0.55,
      });
    }
    if (scorecard.metrics.opportunityWinRate < 0.2) {
      areas.push({
        category: "close_discipline",
        label: "Win rate under benchmark",
        severity: "medium",
        evidence: [`Opp win rate ${(scorecard.metrics.opportunityWinRate * 100).toFixed(0)}%`],
        weight: 0.6,
      });
    }
  }

  if (dealSignals) {
    if (dealSignals.avgStagePushCount >= 1) {
      areas.push({
        category: "close_discipline",
        label: "Deals push close date repeatedly",
        severity: "medium",
        evidence: [`Avg push count ${dealSignals.avgStagePushCount.toFixed(1)}`],
        weight: 0.65,
      });
      areas.push({
        category: "forecasting_accuracy",
        label: "Forecast commits slipping",
        severity: "medium",
        evidence: [`Avg push count ${dealSignals.avgStagePushCount.toFixed(1)} per deal`],
        weight: 0.5,
      });
    }
    if (dealSignals.dealsStalled / Math.max(1, dealSignals.dealsInCycle) > 0.25) {
      areas.push({
        category: "followup_consistency",
        label: "High proportion of stalled deals",
        severity: "high",
        evidence: [
          `${dealSignals.dealsStalled}/${dealSignals.dealsInCycle} deals stalled`,
        ],
        weight: 0.85,
      });
    }
    if (dealSignals.topLossReasons.some((r) => /price|discount/i.test(r))) {
      areas.push({
        category: "pricing_discipline",
        label: "Losing on price — discount defense weak",
        severity: "medium",
        evidence: [`Top loss reasons: ${dealSignals.topLossReasons.slice(0, 2).join(", ")}`],
        weight: 0.55,
      });
    }
    if (dealSignals.topLossReasons.some((r) => /stakeholder|committee|champion/i.test(r))) {
      areas.push({
        category: "multi_threading",
        label: "Deals die for single-threading",
        severity: "high",
        evidence: [
          `Top loss reasons: ${dealSignals.topLossReasons.slice(0, 2).join(", ")}`,
        ],
        weight: 0.8,
      });
    }
  }

  // De-duplicate by category, keep highest weight.
  const byCategory = new Map<FocusCategory, FocusArea>();
  for (const a of areas) {
    const existing = byCategory.get(a.category);
    if (!existing || a.weight > existing.weight) byCategory.set(a.category, a);
  }
  return [...byCategory.values()].sort((a, b) => b.weight - a.weight);
}

function detectStrengths(input: CoachingInput): string[] {
  const out: string[] = [];
  if (input.scorecard) {
    const d = input.scorecard.dimensions;
    if (d.activity >= 80) out.push(`Activity ${d.activity} — top-tier output`);
    if (d.outcomes >= 80) out.push(`Outcomes ${d.outcomes} — converting at the top of the team`);
    if (d.compliance >= 85) out.push(`Compliance ${d.compliance} — clean book`);
  }
  if (input.talkRatio && input.talkRatio.balancedCallsPct >= 0.7) {
    out.push(`${(input.talkRatio.balancedCallsPct * 100).toFixed(0)}% of calls balanced on talk ratio`);
  }
  if (input.playbook && input.playbook.avgScore >= 80) {
    out.push(`Playbook adherence ${input.playbook.avgScore.toFixed(0)}`);
  }
  if (
    input.dealSignals &&
    input.dealSignals.dealsInCycle > 0 &&
    input.dealSignals.dealsClosedWon / Math.max(1, input.dealSignals.dealsInCycle) >= 0.3
  ) {
    out.push(
      `Won ${input.dealSignals.dealsClosedWon}/${input.dealSignals.dealsInCycle} (${(
        (input.dealSignals.dealsClosedWon / input.dealSignals.dealsInCycle) *
        100
      ).toFixed(0)}%)`,
    );
  }
  return out;
}

function buildBrief(input: CoachingInput, focus: FocusArea[], strengths: string[]): string {
  if (focus.length === 0 && strengths.length === 0) {
    return `${input.rep.name}: steady performance in window — continue cadence.`;
  }
  const focusLine =
    focus.length > 0
      ? `Focus: ${focus.slice(0, 3).map((f) => f.label).join(" · ")}.`
      : "";
  const strengthLine =
    strengths.length > 0 ? `Strengths: ${strengths.slice(0, 2).join(" · ")}.` : "";
  return `${input.rep.name} — ${focusLine}${focusLine && strengthLine ? " " : ""}${strengthLine}`.trim();
}

// ---------- Public API ----------

export function synthesizeCoachingPlan(input: CoachingInput): CoachingPlan {
  const focusAreas = detectFocus(input).slice(0, 4);
  const drills = focusAreas.map((f) => drillFor(f.category));
  const goals = focusAreas
    .map((f) => goalFor(f.category, input))
    .filter((g): g is CoachingGoal => g !== null);
  const strengths = detectStrengths(input);
  const managerBrief = buildBrief(input, focusAreas, strengths);
  const nextCheckinIso = endPlusDays(input.windowEnd, CHECKIN_DAYS);

  return {
    repId: input.rep.id,
    repName: input.rep.name,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    focusAreas,
    drills,
    goals,
    strengths,
    managerBrief,
    nextCheckinIso,
  };
}

/**
 * Roll coaching plans up across a team for a manager dashboard view.
 */
export function aggregateTeamCoaching(plans: CoachingPlan[]): {
  reps: number;
  focusDistribution: Record<FocusCategory, number>;
  repsNeedingAttention: CoachingPlan[];
} {
  const distribution: Record<FocusCategory, number> = {
    discovery_quality: 0,
    talk_balance: 0,
    objection_handling: 0,
    multi_threading: 0,
    qualification_rigor: 0,
    activity_volume: 0,
    compliance: 0,
    close_discipline: 0,
    forecasting_accuracy: 0,
    followup_consistency: 0,
    mutual_planning: 0,
    pricing_discipline: 0,
  };
  for (const p of plans) {
    for (const f of p.focusAreas) distribution[f.category] += 1;
  }
  const needsAttention = plans
    .filter((p) => p.focusAreas.some((f) => f.severity === "high"))
    .sort((a, b) => (b.focusAreas[0]?.weight ?? 0) - (a.focusAreas[0]?.weight ?? 0));
  return {
    reps: plans.length,
    focusDistribution: distribution,
    repsNeedingAttention: needsAttention,
  };
}
