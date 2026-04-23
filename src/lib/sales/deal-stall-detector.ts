/**
 * Phase 32 — Deal stall / slippage detector.
 *
 * Turns raw CRM deal history into a risk signal set that managers can
 * review in pipeline inspection. Pure — no I/O. Caller passes in a
 * hydrated deal + stage-change + activity log + current date.
 *
 * Signals produced:
 *   - idle_days            → days since last meaningful activity
 *   - stage_regression     → stage went backward
 *   - push_count           → how many times closeDate has been pushed out
 *   - close_date_slipped   → closeDate moved past original commit
 *   - no_next_step         → nextStep field empty / stale
 *   - no_multi_thread      → <= 1 contact engaged
 *   - commit_at_risk       → deal in commit with <X days of activity left
 *   - mutual_plan_missing  → no mutual action plan attached
 *
 * Every signal has a severity. Risk score is weighted sum.
 */

export type DealStage =
  | "prospecting"
  | "qualification"
  | "discovery"
  | "proposal"
  | "negotiation"
  | "verbal_commit"
  | "closed_won"
  | "closed_lost";

export interface StageChange {
  at: string; // ISO
  from: DealStage;
  to: DealStage;
}

export interface DealActivity {
  at: string; // ISO
  type: "call" | "email_sent" | "email_received" | "meeting_held" | "note" | "task_completed";
}

export interface DealForecastCategory {
  /** "commit" = AE is vouching it closes this period. */
  category: "pipeline" | "best_case" | "commit" | "closed";
}

export interface Deal extends DealForecastCategory {
  id: string;
  amount: number;
  currency: string;
  stage: DealStage;
  ownerId: string;
  contactCount: number; // engaged contacts (ping-ponged ≥ 1 activity)
  originalCloseDate: string; // ISO — the first commit date
  currentCloseDate: string; // ISO — where it sits now
  nextStep?: string | null;
  nextStepUpdatedAt?: string | null;
  mutualPlanAttached?: boolean;
  stageHistory: StageChange[];
  activity: DealActivity[];
}

export type StallSignalCode =
  | "idle_too_long"
  | "stage_regression"
  | "close_date_slipped"
  | "close_date_pushed_multiple_times"
  | "no_next_step"
  | "stale_next_step"
  | "no_multi_thread"
  | "commit_at_risk"
  | "mutual_plan_missing"
  | "activity_thin";

export type Severity = "info" | "warning" | "critical";

export interface StallSignal {
  code: StallSignalCode;
  severity: Severity;
  detail: string;
  weight: number;
}

export interface StallReport {
  dealId: string;
  idleDays: number;
  pushCount: number;
  daysToClose: number;
  riskScore: number; // 0..100
  riskLevel: "low" | "medium" | "high" | "critical";
  signals: StallSignal[];
  /** Suggested next action for this deal. */
  recommendation: string;
}

const MS_DAY = 86_400_000;

function daysBetween(aIso: string, bIso: string): number {
  return Math.floor((Date.parse(bIso) - Date.parse(aIso)) / MS_DAY);
}

function stageRank(s: DealStage): number {
  switch (s) {
    case "prospecting": return 1;
    case "qualification": return 2;
    case "discovery": return 3;
    case "proposal": return 4;
    case "negotiation": return 5;
    case "verbal_commit": return 6;
    case "closed_won": return 7;
    case "closed_lost": return 0; // treated separately
  }
}

const SIGNIFICANT_ACTIVITY: DealActivity["type"][] = [
  "call",
  "email_sent",
  "email_received",
  "meeting_held",
];

const WEIGHTS: Record<StallSignalCode, number> = {
  idle_too_long: 20,
  stage_regression: 25,
  close_date_slipped: 15,
  close_date_pushed_multiple_times: 20,
  no_next_step: 8,
  stale_next_step: 5,
  no_multi_thread: 12,
  commit_at_risk: 30,
  mutual_plan_missing: 10,
  activity_thin: 10,
};

export function detectStall(deal: Deal, nowIso: string): StallReport {
  const signals: StallSignal[] = [];

  // Idle days — last meaningful activity.
  const meaningful = deal.activity.filter((a) => SIGNIFICANT_ACTIVITY.includes(a.type));
  const lastActivityAt = meaningful
    .map((a) => Date.parse(a.at))
    .sort((a, b) => b - a)[0];
  const now = Date.parse(nowIso);
  const idleDays =
    lastActivityAt !== undefined
      ? Math.floor((now - lastActivityAt) / MS_DAY)
      : deal.stageHistory.length > 0
        ? Math.floor((now - Date.parse(deal.stageHistory[0].at)) / MS_DAY)
        : 0;

  // Idle thresholds scale with stage.
  const idleThreshold = deal.stage === "negotiation" ? 5 :
    deal.stage === "proposal" ? 7 :
    deal.stage === "discovery" ? 14 : 21;
  if (idleDays >= idleThreshold) {
    signals.push({
      code: "idle_too_long",
      severity: idleDays >= idleThreshold * 2 ? "critical" : "warning",
      detail: `${idleDays}d since last activity (threshold for ${deal.stage}: ${idleThreshold}d)`,
      weight: WEIGHTS.idle_too_long,
    });
  }

  // Stage regression.
  const regressed = deal.stageHistory.some(
    (c) => stageRank(c.to) < stageRank(c.from) && c.to !== "closed_lost",
  );
  if (regressed) {
    signals.push({
      code: "stage_regression",
      severity: "critical",
      detail: "Deal moved backward through the stage funnel",
      weight: WEIGHTS.stage_regression,
    });
  }

  // Close-date push count.
  const pushCount = daysBetween(deal.originalCloseDate, deal.currentCloseDate) > 0
    ? Math.max(1, Math.floor(daysBetween(deal.originalCloseDate, deal.currentCloseDate) / 14))
    : 0;
  if (Date.parse(deal.currentCloseDate) > Date.parse(deal.originalCloseDate)) {
    signals.push({
      code: "close_date_slipped",
      severity: "warning",
      detail: `Close date slipped ${daysBetween(deal.originalCloseDate, deal.currentCloseDate)}d`,
      weight: WEIGHTS.close_date_slipped,
    });
    if (pushCount >= 2) {
      signals.push({
        code: "close_date_pushed_multiple_times",
        severity: "critical",
        detail: `Close date pushed ~${pushCount}× since original commit`,
        weight: WEIGHTS.close_date_pushed_multiple_times,
      });
    }
  }

  // Next-step missing / stale.
  if (!deal.nextStep || deal.nextStep.trim().length === 0) {
    signals.push({
      code: "no_next_step",
      severity: "warning",
      detail: "No next step captured",
      weight: WEIGHTS.no_next_step,
    });
  } else if (deal.nextStepUpdatedAt) {
    const staleDays = Math.floor((now - Date.parse(deal.nextStepUpdatedAt)) / MS_DAY);
    if (staleDays >= 14) {
      signals.push({
        code: "stale_next_step",
        severity: "info",
        detail: `Next step not refreshed in ${staleDays}d`,
        weight: WEIGHTS.stale_next_step,
      });
    }
  }

  // Multi-threading.
  if (deal.contactCount <= 1 && stageRank(deal.stage) >= 3) {
    signals.push({
      code: "no_multi_thread",
      severity: "warning",
      detail: `Only ${deal.contactCount} contact engaged past discovery`,
      weight: WEIGHTS.no_multi_thread,
    });
  }

  // Commit risk.
  const daysToClose = Math.floor((Date.parse(deal.currentCloseDate) - now) / MS_DAY);
  if (deal.category === "commit" && daysToClose <= 10 && stageRank(deal.stage) < 5) {
    signals.push({
      code: "commit_at_risk",
      severity: "critical",
      detail: `On commit, ${daysToClose}d to close, still in ${deal.stage}`,
      weight: WEIGHTS.commit_at_risk,
    });
  }

  // Mutual action plan missing past proposal.
  if (!deal.mutualPlanAttached && stageRank(deal.stage) >= 4) {
    signals.push({
      code: "mutual_plan_missing",
      severity: "warning",
      detail: "No mutual action plan attached past proposal",
      weight: WEIGHTS.mutual_plan_missing,
    });
  }

  // Thin activity overall (<3 meaningful in a 30-day window near close).
  if (daysToClose <= 30 && meaningful.length < 3) {
    signals.push({
      code: "activity_thin",
      severity: "warning",
      detail: `Only ${meaningful.length} meaningful activities on deal`,
      weight: WEIGHTS.activity_thin,
    });
  }

  const rawScore = signals.reduce((s, sig) => s + sig.weight, 0);
  const riskScore = Math.min(100, rawScore);
  const riskLevel: StallReport["riskLevel"] =
    riskScore >= 70 ? "critical" :
    riskScore >= 45 ? "high" :
    riskScore >= 20 ? "medium" : "low";

  const recommendation = buildRecommendation(deal, signals, daysToClose);

  return {
    dealId: deal.id,
    idleDays,
    pushCount,
    daysToClose,
    riskScore,
    riskLevel,
    signals,
    recommendation,
  };
}

function buildRecommendation(
  deal: Deal,
  signals: StallSignal[],
  daysToClose: number,
): string {
  const codes = new Set(signals.map((s) => s.code));
  if (codes.has("commit_at_risk")) {
    return `Remove from commit unless champion confirms close within ${daysToClose}d.`;
  }
  if (codes.has("stage_regression")) {
    return "Schedule inspection with manager — investigate why deal regressed.";
  }
  if (codes.has("close_date_pushed_multiple_times")) {
    return "Flag as slipping; require written champion confirmation of new date.";
  }
  if (codes.has("no_multi_thread")) {
    return "Introduce a second stakeholder before advancing.";
  }
  if (codes.has("idle_too_long")) {
    return "Send a 2-line re-engagement email referencing the last commitment.";
  }
  if (codes.has("mutual_plan_missing")) {
    return "Draft a mutual action plan and send for champion sign-off.";
  }
  if (codes.has("no_next_step")) {
    return "Book a next touch and capture it in the deal record today.";
  }
  return "Deal is healthy — keep cadence on next step.";
}

/**
 * Roll stall reports up for a manager's pipeline view.
 */
export function summarizeStallRisk(reports: StallReport[]): {
  total: number;
  byLevel: Record<StallReport["riskLevel"], number>;
  criticalDealIds: string[];
  avgRiskScore: number;
} {
  const byLevel: Record<StallReport["riskLevel"], number> = {
    low: 0, medium: 0, high: 0, critical: 0,
  };
  for (const r of reports) byLevel[r.riskLevel]++;
  const criticalDealIds = reports.filter((r) => r.riskLevel === "critical").map((r) => r.dealId);
  const avgRiskScore =
    reports.length === 0 ? 0 : reports.reduce((s, r) => s + r.riskScore, 0) / reports.length;
  return {
    total: reports.length,
    byLevel,
    criticalDealIds,
    avgRiskScore,
  };
}
