/**
 * Phase 50 — Renewal & expansion orchestrator.
 *
 * Takes a set of account snapshots (health + commercial + contract timing)
 * and produces a coordinated renewal/expansion motion plan:
 *
 *   - per-account motion (advocate / renew / save / expand / exit)
 *   - priority score (ARR × risk × time-decay)
 *   - suggested play (concrete sequence of actions)
 *   - owner assignment hints (CSM / AE / exec sponsor)
 *   - forecast contribution (expected renewal ARR / expansion ARR / at-risk ARR)
 *   - portfolio summary: total book, at-risk book, expansion pipeline, NRR outlook
 *
 * Pure. Callers pre-hydrate each account's HealthScore via customer-health.
 */
import type { HealthScore } from "./customer-health";

// ---------- Inputs ----------

export interface RenewalAccount {
  accountId: string;
  accountName: string;
  currentArr: number; // annualized recurring revenue, same unit across the book
  currency: string;
  renewalDateIso: string; // contract end / next renewal commit
  ownerCsmId?: string;
  ownerAeId?: string;
  /** Health score from scoreAccountHealth() — already computed. */
  health: HealthScore;
  /** Optional expansion-specific signals. */
  expansion?: {
    /** Seats currently provisioned vs used in last 30d. */
    seatUtilization?: number; // 0..1 or > 1 (overage)
    /** Module/feature gaps — uninstalled paid modules they'd likely adopt. */
    openModuleCount?: number;
    /** Optional ARR ceiling for this customer (segment cap). */
    expansionCeilingArr?: number;
    /** "Headcount growth signal" from HR scraping etc. */
    companyHeadcountGrowth12mPct?: number;
  };
  /** Prior renewal outcome used for streak weighting. */
  priorRenewals?: Array<{
    dateIso: string;
    outcome: "renewed" | "expanded" | "contracted" | "churned";
  }>;
}

export interface OrchestratorOptions {
  /** Horizon for "upcoming" renewals — accounts whose renewals fall in [now, now+H]. */
  horizonDays?: number;
  /** Minimum ARR that qualifies as a "strategic" account (gets exec motion). */
  strategicArrFloor?: number;
  /** Risk threshold below which account triggers save play. */
  saveChurnRiskFloor?: number;
  /** "ideal" expansion lift assumption for expansion_play motion (0..1). */
  expansionLiftPct?: number;
}

// ---------- Outputs ----------

export type MotionKind =
  | "advocate"
  | "renew_steady"
  | "expansion_play"
  | "save_play"
  | "exit_intervention"
  | "executive_renewal";

export interface RenewalPlayStep {
  order: number;
  owner: "csm" | "ae" | "exec_sponsor" | "support";
  action: string;
  dueInDays: number;
}

export interface AccountMotion {
  accountId: string;
  accountName: string;
  motion: MotionKind;
  priorityScore: number; // composite, higher = act sooner
  urgencyLabel: "this_week" | "this_month" | "this_quarter" | "later";
  daysToRenewal: number;
  expectedRenewalArr: number; // ARR we realistically expect to keep
  atRiskArr: number; // ARR that could churn if we do nothing
  expansionArrPotential: number; // potential incremental ARR from expansion_play
  play: RenewalPlayStep[];
  recommendedOwners: {
    primary: "csm" | "ae" | "exec_sponsor";
    escalateTo?: "exec_sponsor" | "cro";
  };
  rationale: string;
}

export interface PortfolioForecast {
  totalArr: number;
  atRiskArr: number;
  expansionPotentialArr: number;
  committedRenewalArr: number;
  /** Expected ending ARR = committed + expansion_potential × lift pct. */
  projectedEndArr: number;
  /** Net retention ratio projection (projected / start). */
  projectedNrr: number;
  /** Gross retention ratio projection (committed / start). */
  projectedGrr: number;
  motionCounts: Record<MotionKind, number>;
  topAtRisk: AccountMotion[];
  topExpansion: AccountMotion[];
}

export interface OrchestratorReport {
  asOfIso: string;
  horizonDays: number;
  accounts: AccountMotion[];
  portfolio: PortfolioForecast;
}

// ---------- Math helpers ----------

const MS_DAY = 86_400_000;

function daysUntil(iso: string, now: number): number {
  return Math.floor((Date.parse(iso) - now) / MS_DAY);
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function renewalStreak(rec: RenewalAccount): number {
  const recent = (rec.priorRenewals ?? []).slice(-3);
  if (recent.length === 0) return 0;
  return recent.reduce(
    (s, r) =>
      s +
      (r.outcome === "renewed" ? 1 : r.outcome === "expanded" ? 1.2 : r.outcome === "contracted" ? -0.5 : -1),
    0,
  ) / recent.length;
}

// ---------- Motion selection ----------

function pickMotion(
  account: RenewalAccount,
  opts: Required<OrchestratorOptions>,
): MotionKind {
  const { health } = account;
  if (account.currentArr >= opts.strategicArrFloor &&
      (health.churnRisk >= opts.saveChurnRiskFloor || health.score < 55)) {
    return "executive_renewal";
  }
  if (health.playbook === "advocate") return "advocate";
  if (health.playbook === "exit_intervention") return "exit_intervention";
  if (health.playbook === "save_play" || health.churnRisk >= opts.saveChurnRiskFloor) {
    return "save_play";
  }
  if (health.playbook === "expansion_play" && health.expansionSignal >= 0.4) {
    return "expansion_play";
  }
  return "renew_steady";
}

function buildPlay(motion: MotionKind, _account: RenewalAccount): RenewalPlayStep[] {
  switch (motion) {
    case "advocate":
      return [
        { order: 1, owner: "csm", action: "Request case study + reference quote", dueInDays: 14 },
        { order: 2, owner: "ae", action: "Propose multi-year renewal + expansion bundle", dueInDays: 30 },
        { order: 3, owner: "csm", action: "Invite to customer advisory board", dueInDays: 45 },
      ];
    case "renew_steady":
      return [
        { order: 1, owner: "csm", action: "Send renewal readiness checklist", dueInDays: 30 },
        { order: 2, owner: "ae", action: "Confirm renewal quote + deliver to champion", dueInDays: 60 },
        { order: 3, owner: "csm", action: "Schedule close-out QBR", dueInDays: 75 },
      ];
    case "expansion_play":
      return [
        { order: 1, owner: "csm", action: "Deliver usage readout highlighting expansion thesis", dueInDays: 14 },
        { order: 2, owner: "ae", action: "Workshop expansion proposal with champion", dueInDays: 30 },
        { order: 3, owner: "ae", action: "Present proposal to economic buyer", dueInDays: 45 },
        { order: 4, owner: "csm", action: "Execute co-funded success plan post-close", dueInDays: 90 },
      ];
    case "save_play":
      return [
        { order: 1, owner: "csm", action: "Trigger health review with escalation owner", dueInDays: 3 },
        { order: 2, owner: "ae", action: "Schedule joint call with champion + exec sponsor", dueInDays: 7 },
        { order: 3, owner: "support", action: "Clear outstanding P1/P2 tickets within SLA", dueInDays: 14 },
        { order: 4, owner: "csm", action: "Produce 60-day remediation plan with measurable adoption targets", dueInDays: 14 },
      ];
    case "exit_intervention":
      return [
        { order: 1, owner: "exec_sponsor", action: "Executive-to-executive call within 48h", dueInDays: 2 },
        { order: 2, owner: "csm", action: "Deliver written remediation offer + credit proposal", dueInDays: 7 },
        { order: 3, owner: "ae", action: "Re-scope contract if needed, shorter term + reduced surface area", dueInDays: 21 },
      ];
    case "executive_renewal":
      return [
        { order: 1, owner: "exec_sponsor", action: "Exec sponsor briefed + introduced to account exec", dueInDays: 5 },
        { order: 2, owner: "ae", action: "Dedicated renewal war-room kickoff", dueInDays: 7 },
        { order: 3, owner: "csm", action: "Daily pulse check with champion until signed", dueInDays: 30 },
        { order: 4, owner: "ae", action: "Escalation plan pre-approved with CRO", dueInDays: 14 },
      ];
  }
}

function motionOwners(motion: MotionKind): AccountMotion["recommendedOwners"] {
  switch (motion) {
    case "advocate": return { primary: "csm" };
    case "renew_steady": return { primary: "csm" };
    case "expansion_play": return { primary: "ae" };
    case "save_play": return { primary: "csm", escalateTo: "exec_sponsor" };
    case "exit_intervention": return { primary: "exec_sponsor", escalateTo: "cro" };
    case "executive_renewal": return { primary: "exec_sponsor", escalateTo: "cro" };
  }
}

function urgencyLabel(daysToRenewal: number): AccountMotion["urgencyLabel"] {
  if (daysToRenewal <= 7) return "this_week";
  if (daysToRenewal <= 30) return "this_month";
  if (daysToRenewal <= 90) return "this_quarter";
  return "later";
}

function expectedRenewalArr(a: RenewalAccount, motion: MotionKind): number {
  const arr = a.currentArr;
  // Start from renewalConfidence as the base retention expectation.
  let p = a.health.renewalConfidence;
  // Motion-specific modifier.
  if (motion === "advocate") p = Math.min(1, p + 0.1);
  if (motion === "renew_steady") p = Math.min(1, p + 0.05);
  if (motion === "save_play") p = Math.max(p - 0.1, p * 0.7);
  if (motion === "exit_intervention") p = Math.max(p * 0.4, 0);
  if (motion === "executive_renewal") p = Math.min(1, Math.max(p, 0.75));
  return arr * p;
}

function expansionPotential(
  a: RenewalAccount,
  motion: MotionKind,
  liftPct: number,
): number {
  if (motion !== "expansion_play" && motion !== "advocate") return 0;
  const ceiling = a.expansion?.expansionCeilingArr ?? a.currentArr * 1.5;
  const rawLift = a.currentArr * liftPct * a.health.expansionSignal;
  return Math.min(rawLift, Math.max(0, ceiling - a.currentArr));
}

function atRiskArr(a: RenewalAccount, motion: MotionKind): number {
  const arr = a.currentArr;
  const baseRisk = a.health.churnRisk;
  if (motion === "exit_intervention") return arr * Math.max(0.5, baseRisk);
  if (motion === "save_play") return arr * baseRisk;
  if (motion === "executive_renewal") return arr * Math.max(0.3, baseRisk - 0.2);
  if (motion === "advocate" || motion === "renew_steady") return arr * Math.max(0, baseRisk * 0.5);
  if (motion === "expansion_play") return arr * Math.max(0, baseRisk * 0.5);
  return 0;
}

function priorityScore(
  a: RenewalAccount,
  motion: MotionKind,
  daysToRenewal: number,
): number {
  // ARR weighting.
  const arrTerm = Math.log10(Math.max(1, a.currentArr));
  // Risk weighting (0..1).
  const riskTerm = a.health.churnRisk;
  // Time decay — inverse-proportional to days-to-renewal (floor 7d).
  const timeTerm = 30 / Math.max(7, daysToRenewal);
  // Motion weight.
  const motionWeight: Record<MotionKind, number> = {
    exit_intervention: 1.5,
    executive_renewal: 1.4,
    save_play: 1.25,
    expansion_play: 1.1,
    advocate: 0.8,
    renew_steady: 0.7,
  };
  // Renewal streak — reward healthy streaks slightly less, risky streaks more.
  const streak = renewalStreak(a);
  const streakBoost = streak < 0 ? 0.3 : 0;
  const raw =
    (arrTerm * 0.6 + riskTerm * 0.8 + timeTerm * 0.8 + streakBoost) * motionWeight[motion];
  return Math.round(raw * 100) / 100;
}

function rationale(
  a: RenewalAccount,
  motion: MotionKind,
  daysToRenewal: number,
): string {
  const tag = (label: string) => `[${label}]`;
  const parts = [
    tag(motion),
    `ARR ${a.currentArr.toLocaleString()}`,
    `renewal in ${daysToRenewal}d`,
    `health ${a.health.score}`,
    `risk ${(a.health.churnRisk * 100).toFixed(0)}%`,
    a.health.expansionSignal > 0.4
      ? `expansion ${(a.health.expansionSignal * 100).toFixed(0)}%`
      : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

// ---------- Public API ----------

export function orchestrateRenewals(
  accounts: RenewalAccount[],
  nowIso: string,
  opts: OrchestratorOptions = {},
): OrchestratorReport {
  const now = Date.parse(nowIso);
  const merged: Required<OrchestratorOptions> = {
    horizonDays: opts.horizonDays ?? 120,
    strategicArrFloor: opts.strategicArrFloor ?? 250_000,
    saveChurnRiskFloor: opts.saveChurnRiskFloor ?? 0.5,
    expansionLiftPct: clamp01(opts.expansionLiftPct ?? 0.25),
  };

  const motions: AccountMotion[] = accounts.map((a) => {
    const daysToRenewal = daysUntil(a.renewalDateIso, now);
    const motion = pickMotion(a, merged);
    const play = buildPlay(motion, a);
    const recommendedOwners = motionOwners(motion);
    const expectedRenewal = expectedRenewalArr(a, motion);
    const risk = atRiskArr(a, motion);
    const expansion = expansionPotential(a, motion, merged.expansionLiftPct);

    return {
      accountId: a.accountId,
      accountName: a.accountName,
      motion,
      priorityScore: priorityScore(a, motion, daysToRenewal),
      urgencyLabel: urgencyLabel(daysToRenewal),
      daysToRenewal,
      expectedRenewalArr: Math.round(expectedRenewal),
      atRiskArr: Math.round(risk),
      expansionArrPotential: Math.round(expansion),
      play,
      recommendedOwners,
      rationale: rationale(a, motion, daysToRenewal),
    };
  });

  motions.sort((a, b) => b.priorityScore - a.priorityScore);

  const totalArr = accounts.reduce((s, a) => s + a.currentArr, 0);
  const atRisk = motions.reduce((s, m) => s + m.atRiskArr, 0);
  const expansion = motions.reduce((s, m) => s + m.expansionArrPotential, 0);
  const committedRenewal = motions.reduce((s, m) => s + m.expectedRenewalArr, 0);
  const projectedEnd = committedRenewal + expansion;
  const projectedNrr = totalArr === 0 ? 0 : projectedEnd / totalArr;
  const projectedGrr = totalArr === 0 ? 0 : committedRenewal / totalArr;

  const motionCounts: Record<MotionKind, number> = {
    advocate: 0,
    renew_steady: 0,
    expansion_play: 0,
    save_play: 0,
    exit_intervention: 0,
    executive_renewal: 0,
  };
  for (const m of motions) motionCounts[m.motion] += 1;

  const topAtRisk = [...motions]
    .filter((m) => m.atRiskArr > 0)
    .sort((a, b) => b.atRiskArr - a.atRiskArr)
    .slice(0, 5);
  const topExpansion = [...motions]
    .filter((m) => m.expansionArrPotential > 0)
    .sort((a, b) => b.expansionArrPotential - a.expansionArrPotential)
    .slice(0, 5);

  return {
    asOfIso: nowIso,
    horizonDays: merged.horizonDays,
    accounts: motions,
    portfolio: {
      totalArr,
      atRiskArr: Math.round(atRisk),
      expansionPotentialArr: Math.round(expansion),
      committedRenewalArr: Math.round(committedRenewal),
      projectedEndArr: Math.round(projectedEnd),
      projectedNrr: Math.round(projectedNrr * 10000) / 10000,
      projectedGrr: Math.round(projectedGrr * 10000) / 10000,
      motionCounts,
      topAtRisk,
      topExpansion,
    },
  };
}
