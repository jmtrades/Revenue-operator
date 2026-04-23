/**
 * Phase 56 — Master revenue operator composer.
 *
 * Ties together the outputs of every revenue-operations module (deal stall,
 * win-probability, buying committee, MEDDPICC, discount governance, customer
 * health, attribution, territory capacity, win-loss, benchmarks, exec dashboard,
 * deal-win simulator, renewal orchestrator, coaching synthesizer, board KPI
 * composer, pricing deal-desk, cohort retention, data quality) into a single
 * prioritized operating plan.
 *
 * Produces:
 *   - A ranked action list the RevOps leader can drive this week.
 *   - A KPI spine (pipeline, revenue, retention, forecast, DQ) for morning review.
 *   - An assignment view: what each role (rep, manager, VP, CRO, RevOps, CFO) owes.
 *
 * Pure. No I/O. Caller supplies already-composed sub-reports.
 */

import type { OrchestratorReport } from "./renewal-orchestrator";
import type { CoachingPlan } from "./rep-coaching-synthesizer";
import type { BoardMetricsPackage } from "./board-kpi-composer";
import type { RetentionReport } from "./cohort-retention";
import type { DataQualityReport } from "./revenue-data-quality";
import type { DealDeskDecision } from "./pricing-deal-desk";
import type { WinSimulationResult, PortfolioLeverage } from "./deal-win-simulator";

// ---------- Inputs ----------

export interface MasterRevenueOperatorRequest {
  asOfIso: string;
  company: { name: string; currency: string; fiscalQuarter?: string };
  /** Optional sub-reports. Any may be omitted — composer degrades gracefully. */
  renewal?: OrchestratorReport;
  retention?: RetentionReport;
  coaching?: CoachingPlan[];
  board?: BoardMetricsPackage;
  dataQuality?: DataQualityReport;
  dealDesk?: DealDeskDecision[];
  simulator?: {
    portfolio?: PortfolioLeverage[];
    topDeals?: WinSimulationResult[];
  };
  /** Threshold above which a churn probability triggers an action. */
  churnActionThreshold?: number;
  /** Threshold under which a DQ score triggers a callout. */
  dqScoreThreshold?: number;
}

// ---------- Outputs ----------

export type ActionRole =
  | "rep"
  | "manager"
  | "director"
  | "vp"
  | "cro"
  | "revops"
  | "cfo";

export type ActionCategory =
  | "close_win"
  | "renewal_motion"
  | "churn_save"
  | "coaching"
  | "data_quality"
  | "pricing_guardrail"
  | "pipeline_hygiene"
  | "board_narrative";

export interface RevenueAction {
  id: string;
  category: ActionCategory;
  severity: "info" | "warning" | "critical";
  role: ActionRole;
  subjectEntityId: string;
  /** Short sentence suitable for a Monday morning list. */
  headline: string;
  /** Concrete next step owner should take. */
  instruction: string;
  /** Estimated impact in ARR or win lift (positive). */
  impactScore: number;
  /** ETA for when this should be completed, ISO string. */
  dueIso: string;
}

export interface RoleAssignment {
  role: ActionRole;
  actionCount: number;
  criticalCount: number;
  actions: RevenueAction[];
}

export interface MasterKpiSpine {
  endArr?: number;
  netNewArr?: number;
  nrr?: number;
  grr?: number;
  projectedGrrNextHorizon?: number;
  atRiskArr?: number;
  pipelineCoverage?: number;
  winRate?: number;
  ruleOf40?: number;
  magicNumber?: number;
  dataQualityScore?: number;
  dealDeskBacklog?: number;
  pricingFloorViolations?: number;
  renewalQueueTotalArr?: number;
  coachingInFlight?: number;
}

export interface MasterRevenueOperatorReport {
  asOfIso: string;
  company: { name: string; currency: string; fiscalQuarter?: string };
  kpis: MasterKpiSpine;
  actions: RevenueAction[];
  roleAssignments: RoleAssignment[];
  headline: string;
  callouts: string[];
  coverageNote: string;
}

// ---------- Helpers ----------

function addDays(iso: string, days: number): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  return new Date(t + days * 86_400_000).toISOString();
}

function bounded<T>(arr: T[] | undefined, limit: number): T[] {
  if (!arr || arr.length === 0) return [];
  return arr.slice(0, limit);
}

// ---------- Action generators ----------

function actionsFromRenewal(
  renewal: OrchestratorReport | undefined,
  asOfIso: string,
): RevenueAction[] {
  if (!renewal) return [];
  const out: RevenueAction[] = [];
  for (const item of renewal.accounts) {
    const severity: RevenueAction["severity"] =
      item.motion === "executive_renewal" || item.motion === "save_play" ? "critical" :
      item.motion === "exit_intervention" ? "warning" : "info";
    const role: ActionRole =
      item.motion === "executive_renewal" ? "cro" :
      item.motion === "save_play" ? "manager" : "rep";
    const totalArrAtStake = Math.max(item.expectedRenewalArr + item.atRiskArr, 0);
    out.push({
      id: `renewal:${item.accountId}`,
      category: "renewal_motion",
      severity,
      role,
      subjectEntityId: item.accountId,
      headline: `${item.motion.replace(/_/g, " ")} — ${item.accountName} ($${Math.round(totalArrAtStake).toLocaleString()} ARR)`,
      instruction: item.play[0]?.action ?? "Execute renewal motion",
      impactScore: totalArrAtStake,
      dueIso: addDays(asOfIso, Math.max(1, item.daysToRenewal - 7)),
    });
  }
  return out;
}

function actionsFromRetention(
  retention: RetentionReport | undefined,
  asOfIso: string,
  threshold: number,
): RevenueAction[] {
  if (!retention) return [];
  return retention.forecasts
    .filter((f) => f.churnProbability >= threshold && f.expectedArrLoss > 0)
    .map((f) => ({
      id: `churn_save:${f.accountId}`,
      category: "churn_save" as const,
      severity: (f.churnProbability >= 0.7
        ? "critical"
        : "warning") as RevenueAction["severity"],
      role: (f.expectedArrLoss >= 250_000 ? "cro" : "manager") as ActionRole,
      subjectEntityId: f.accountId,
      headline: `${(f.churnProbability * 100).toFixed(0)}% churn risk — save play for ${f.accountId} ($${f.expectedArrLoss.toLocaleString()} ARR exposed)`,
      instruction:
        f.topRiskFactors.length > 0
          ? `Address: ${f.topRiskFactors.join("; ")}`
          : "Launch customer save play and schedule executive touch.",
      impactScore: f.expectedArrLoss,
      dueIso: addDays(asOfIso, 7),
    }));
}

function actionsFromCoaching(
  coaching: CoachingPlan[] | undefined,
  _asOfIso: string,
): RevenueAction[] {
  if (!coaching) return [];
  const out: RevenueAction[] = [];
  for (const plan of coaching) {
    const top = plan.focusAreas[0];
    if (!top) continue;
    out.push({
      id: `coaching:${plan.repId}`,
      category: "coaching",
      severity: top.weight >= 3 ? "warning" : "info",
      role: "manager",
      subjectEntityId: plan.repId,
      headline: `Coaching focus for ${plan.repName}: ${top.category.replace(/_/g, " ")}`,
      instruction: plan.drills[0]?.description ?? "Schedule dedicated 1:1 drill.",
      impactScore: top.weight * 10,
      dueIso: plan.nextCheckinIso,
    });
  }
  return out;
}

function actionsFromDataQuality(
  dq: DataQualityReport | undefined,
  asOfIso: string,
): RevenueAction[] {
  if (!dq) return [];
  return dq.issues
    .filter((i) => i.severity !== "info")
    .slice(0, 25)
    .map((i) => ({
      id: `dq:${i.id}`,
      category: "data_quality" as const,
      severity: i.severity,
      role: (i.ownerId ? "rep" : "revops") as ActionRole,
      subjectEntityId: i.entityId,
      headline: i.headline,
      instruction: i.remediation,
      impactScore: i.severity === "critical" ? 50 : 20,
      dueIso: addDays(asOfIso, i.severity === "critical" ? 2 : 7),
    }));
}

function actionsFromDealDesk(
  desk: DealDeskDecision[] | undefined,
  asOfIso: string,
): RevenueAction[] {
  if (!desk) return [];
  const out: RevenueAction[] = [];
  for (const d of desk) {
    if (d.outcome === "auto_approve") continue;
    out.push({
      id: `pricing:${d.dealId}`,
      category: "pricing_guardrail",
      severity:
        d.outcome === "blocked" || d.outcome === "escalate" ? "critical" : "warning",
      role:
        d.outcome === "blocked"
          ? "cfo"
          : d.outcome === "escalate"
          ? "cro"
          : "director",
      subjectEntityId: d.dealId,
      headline: `${d.outcome.replace("_", " ")} — ${d.dealId} (discount ${(d.requestedDiscountPct * 100).toFixed(1)}%)`,
      instruction:
        d.outcome === "blocked"
          ? `Price below engine floor (${Math.round(d.priceFloorAnnual).toLocaleString()}). Counter at ${Math.round(d.suggestedAnnualValue).toLocaleString()}.`
          : `Route for approval; engine counter at ${Math.round(d.suggestedAnnualValue).toLocaleString()}.`,
      impactScore: Math.max(d.priceFloorAnnual - d.suggestedAnnualValue, 1) + 1000,
      dueIso: addDays(asOfIso, d.outcome === "blocked" ? 1 : 3),
    });
  }
  return out;
}

function actionsFromSimulator(
  sim: MasterRevenueOperatorRequest["simulator"] | undefined,
  asOfIso: string,
): RevenueAction[] {
  if (!sim) return [];
  const out: RevenueAction[] = [];
  for (const deal of bounded(sim.topDeals, 10)) {
    const lift = (deal.finalProbability - deal.baseProbability) * 100;
    if (lift <= 0) continue;
    out.push({
      id: `close_win:${deal.dealId}`,
      category: "close_win",
      severity: lift >= 15 ? "critical" : lift >= 7 ? "warning" : "info",
      role: "rep",
      subjectEntityId: deal.dealId,
      headline: `${deal.dealId} — +${lift.toFixed(1)}% close lift via ${deal.recommendedPath.length} intervention(s)`,
      instruction:
        deal.recommendedPath[0]?.intervention.rationale ??
        deal.headline ??
        "Execute recommended intervention sequence.",
      impactScore: lift,
      dueIso: addDays(asOfIso, 7),
    });
  }
  return out;
}

function actionsFromBoard(
  board: BoardMetricsPackage | undefined,
  asOfIso: string,
): RevenueAction[] {
  if (!board) return [];
  return board.callouts.map((c: string, idx: number) => ({
    id: `board:${idx}`,
    category: "board_narrative" as const,
    severity: /below|at risk|weak|low/i.test(c) ? "warning" : "info",
    role: "cro" as ActionRole,
    subjectEntityId: "board",
    headline: c,
    instruction: "Prepare talking-point for board review and remediation plan.",
    impactScore: 30,
    dueIso: addDays(asOfIso, 14),
  }));
}

// ---------- Aggregators ----------

function buildKpis(req: MasterRevenueOperatorRequest): MasterKpiSpine {
  const b = req.board;
  const r = req.retention;
  const dq = req.dataQuality;
  const renewal = req.renewal;
  const coaching = req.coaching;
  const desk = req.dealDesk;
  return {
    endArr: b?.revenue.arrEnd.value,
    netNewArr: b?.revenue.netNewArr.value,
    nrr: b?.revenue.nrr.value,
    grr: b?.revenue.grr.value,
    projectedGrrNextHorizon: r?.projectedGrr,
    atRiskArr: r?.portfolioArrAtRisk ?? renewal?.portfolio.atRiskArr,
    pipelineCoverage: b?.pipeline.coverageRatio.value,
    winRate: b?.pipeline.winRate.value,
    ruleOf40: b?.efficiency.ruleOf40.value,
    magicNumber: b?.efficiency.magicNumber.value,
    dataQualityScore: dq?.overallScore,
    dealDeskBacklog: desk?.filter((d) => d.outcome !== "auto_approve").length,
    pricingFloorViolations: desk?.filter((d) => d.belowFloor).length,
    renewalQueueTotalArr: renewal?.portfolio.totalArr,
    coachingInFlight: coaching?.length,
  };
}

function rankActions(actions: RevenueAction[]): RevenueAction[] {
  const severityRank: Record<RevenueAction["severity"], number> = {
    critical: 3,
    warning: 2,
    info: 1,
  };
  return [...actions].sort((a, b) => {
    const s = severityRank[b.severity] - severityRank[a.severity];
    if (s !== 0) return s;
    return b.impactScore - a.impactScore;
  });
}

function groupByRole(actions: RevenueAction[]): RoleAssignment[] {
  const map = new Map<ActionRole, RevenueAction[]>();
  for (const action of actions) {
    if (!map.has(action.role)) map.set(action.role, []);
    map.get(action.role)!.push(action);
  }
  return Array.from(map.entries())
    .map(([role, rows]) => ({
      role,
      actionCount: rows.length,
      criticalCount: rows.filter((r) => r.severity === "critical").length,
      actions: rows.slice(0, 20),
    }))
    .sort((a, b) => b.criticalCount - a.criticalCount || b.actionCount - a.actionCount);
}

function headlineFor(
  company: MasterRevenueOperatorRequest["company"],
  kpis: MasterKpiSpine,
  actions: RevenueAction[],
): string {
  const pieces: string[] = [];
  pieces.push(`${company.name}${company.fiscalQuarter ? ` ${company.fiscalQuarter}` : ""} operating picture`);
  if (kpis.endArr != null) {
    pieces.push(`ARR ${company.currency} ${Math.round(kpis.endArr).toLocaleString()}`);
  }
  if (kpis.nrr != null) pieces.push(`NRR ${(kpis.nrr * 100).toFixed(1)}%`);
  const effectiveGrr = kpis.grr ?? kpis.projectedGrrNextHorizon;
  if (effectiveGrr != null) pieces.push(`GRR ${(effectiveGrr * 100).toFixed(1)}%`);
  if (kpis.pipelineCoverage != null)
    pieces.push(`Coverage ${kpis.pipelineCoverage.toFixed(2)}x`);
  if (kpis.dataQualityScore != null) pieces.push(`DQ ${kpis.dataQualityScore}`);
  pieces.push(`${actions.filter((a) => a.severity === "critical").length} critical actions`);
  return pieces.join(" · ");
}

function calloutsFor(
  kpis: MasterKpiSpine,
  actions: RevenueAction[],
  dqThreshold: number,
): string[] {
  const out: string[] = [];
  if (kpis.nrr != null && kpis.nrr < 1.0) out.push(`NRR below 100% — land-and-expand motion underperforming.`);
  const effectiveGrr = kpis.grr ?? kpis.projectedGrrNextHorizon;
  if (effectiveGrr != null && effectiveGrr < 0.9) out.push(`GRR ${(effectiveGrr * 100).toFixed(1)}% below 90% — retention at risk, prioritize save plays.`);
  if (kpis.pipelineCoverage != null && kpis.pipelineCoverage < 3) out.push(`Pipeline coverage below 3x — pipeline generation deficit.`);
  if (kpis.ruleOf40 != null && kpis.ruleOf40 < 0.4) out.push(`Rule of 40 below benchmark — growth+margin tradeoff slipping.`);
  if (kpis.dataQualityScore != null && kpis.dataQualityScore < dqThreshold) {
    out.push(`Data quality score ${kpis.dataQualityScore} is below ${dqThreshold} — RevOps sweep needed.`);
  }
  if (kpis.pricingFloorViolations != null && kpis.pricingFloorViolations > 0) {
    out.push(`${kpis.pricingFloorViolations} deal(s) below pricing floor — CFO review required.`);
  }
  const criticalCount = actions.filter((a) => a.severity === "critical").length;
  if (criticalCount >= 5) {
    out.push(`${criticalCount} critical actions this week — block leadership time for triage.`);
  }
  return out;
}

function coverageNote(req: MasterRevenueOperatorRequest): string {
  const have: string[] = [];
  const missing: string[] = [];
  (req.board ? have : missing).push("board");
  (req.renewal ? have : missing).push("renewal");
  (req.retention ? have : missing).push("retention");
  (req.coaching ? have : missing).push("coaching");
  (req.dataQuality ? have : missing).push("dataQuality");
  (req.dealDesk ? have : missing).push("dealDesk");
  (req.simulator ? have : missing).push("simulator");
  if (missing.length === 0) {
    return `All sub-systems reporting (${have.length}/${have.length}).`;
  }
  return `Sub-systems reporting: ${have.join(", ") || "none"}. Missing: ${missing.join(", ")}.`;
}

// ---------- Public API ----------

export function composeMasterRevenueOperator(
  req: MasterRevenueOperatorRequest,
): MasterRevenueOperatorReport {
  const churnThreshold = req.churnActionThreshold ?? 0.35;
  const dqThreshold = req.dqScoreThreshold ?? 75;

  const allActions: RevenueAction[] = [
    ...actionsFromRenewal(req.renewal, req.asOfIso),
    ...actionsFromRetention(req.retention, req.asOfIso, churnThreshold),
    ...actionsFromCoaching(req.coaching, req.asOfIso),
    ...actionsFromDataQuality(req.dataQuality, req.asOfIso),
    ...actionsFromDealDesk(req.dealDesk, req.asOfIso),
    ...actionsFromSimulator(req.simulator, req.asOfIso),
    ...actionsFromBoard(req.board, req.asOfIso),
  ];
  const ranked = rankActions(allActions);
  const kpis = buildKpis(req);
  const roleAssignments = groupByRole(ranked);
  return {
    asOfIso: req.asOfIso,
    company: req.company,
    kpis,
    actions: ranked,
    roleAssignments,
    headline: headlineFor(req.company, kpis, ranked),
    callouts: calloutsFor(kpis, ranked, dqThreshold),
    coverageNote: coverageNote(req),
  };
}

/** Lightweight accessor to pull just the top N critical actions for a daily standup. */
export function pickTopCriticalActions(
  report: MasterRevenueOperatorReport,
  n: number = 10,
): RevenueAction[] {
  return report.actions.filter((a) => a.severity === "critical").slice(0, n);
}
