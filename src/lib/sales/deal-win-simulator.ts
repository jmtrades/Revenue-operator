/**
 * Phase 49 — Deal-level "what would it take to win" simulator.
 *
 * Given a deal snapshot (the same shape consumed by predictWinProbability),
 * enumerate concrete interventions an AE / manager could take on the deal,
 * re-score the deal with each intervention applied, and return:
 *
 *   - ranked single-intervention lifts (probability delta)
 *   - ROI per effort-hour
 *   - a greedy "path to close" sequence of interventions chosen to
 *     maximise cumulative lift while respecting an effort budget
 *   - simulated probability trajectory under that path
 *
 * Pure, deterministic. No I/O. Caller passes deal + optional constraints.
 */
import {
  predictWinProbability,
  type WinProbDealSnapshot,
  type WinProbResult,
} from "./win-probability";

// ---------- Intervention catalog ----------

export type InterventionCode =
  | "identify_champion"
  | "engage_economic_buyer"
  | "build_mutual_plan"
  | "complete_poc"
  | "confirm_budget"
  | "engage_legal"
  | "engage_procurement"
  | "expand_stakeholders"
  | "remove_blocker"
  | "reduce_discount"
  | "re_engage_stalled"
  | "pull_in_close_date";

export interface Intervention {
  code: InterventionCode;
  label: string;
  /** Hours of rep/team effort to execute. Used for ROI sorting. */
  effortHours: number;
  /**
   * Mutates a deal snapshot to reflect the intervention being executed.
   * Returns a NEW snapshot — never mutates the input.
   */
  apply: (d: WinProbDealSnapshot) => WinProbDealSnapshot;
  /**
   * Predicate — returns true if this intervention is still meaningful for the
   * current state of the deal (e.g. no point in "identify_champion" if the
   * champion is already identified).
   */
  isApplicable: (d: WinProbDealSnapshot) => boolean;
  /**
   * Short rationale displayed with the recommendation.
   */
  rationale: string;
}

const CATALOG: Intervention[] = [
  {
    code: "identify_champion",
    label: "Identify and validate a champion",
    effortHours: 4,
    isApplicable: (d) => !d.championIdentified,
    apply: (d) => ({ ...d, championIdentified: true }),
    rationale: "Champion is the single largest predictor of close — invest early.",
  },
  {
    code: "engage_economic_buyer",
    label: "Get in front of the economic buyer",
    effortHours: 5,
    isApplicable: (d) => !d.economicBuyerEngaged,
    apply: (d) => ({ ...d, economicBuyerEngaged: true }),
    rationale: "Deals without EB engagement slip or die silently.",
  },
  {
    code: "build_mutual_plan",
    label: "Co-create a mutual action plan",
    effortHours: 3,
    isApplicable: (d) => !d.mutualActionPlanExists,
    apply: (d) => ({ ...d, mutualActionPlanExists: true }),
    rationale: "Forces the buyer to commit to dates and removes ambiguity.",
  },
  {
    code: "complete_poc",
    label: "Finish the POC / technical validation",
    effortHours: 12,
    isApplicable: (d) => !!d.poc && d.poc.completed === false,
    apply: (d) => ({ ...d, poc: { completed: true, passed: true } }),
    rationale: "Converts risk of technical surprise into validated evidence.",
  },
  {
    code: "confirm_budget",
    label: "Confirm budget is allocated and approved",
    effortHours: 2,
    isApplicable: (d) => !(d.salesAcceptedBudget ?? false),
    apply: (d) => ({ ...d, salesAcceptedBudget: true }),
    rationale: "Shifts the conversation from 'if' to 'when'.",
  },
  {
    code: "engage_legal",
    label: "Engage legal on redlines early",
    effortHours: 3,
    isApplicable: (d) => !(d.legalEngaged ?? false),
    apply: (d) => ({ ...d, legalEngaged: true }),
    rationale: "Most slipped deals die in legal — pre-load the cycle.",
  },
  {
    code: "engage_procurement",
    label: "Introduce procurement to shorten late-stage",
    effortHours: 2,
    isApplicable: (d) => !(d.procurementEngaged ?? false),
    apply: (d) => ({ ...d, procurementEngaged: true }),
    rationale: "Procurement involvement predicts deal closure within forecast.",
  },
  {
    code: "expand_stakeholders",
    label: "Multi-thread — add two new stakeholders",
    effortHours: 5,
    isApplicable: (d) => d.stakeholderCount < 5,
    apply: (d) => ({ ...d, stakeholderCount: Math.min(5, d.stakeholderCount + 2) }),
    rationale: "Reduces single-point-of-failure risk from one contact leaving.",
  },
  {
    code: "remove_blocker",
    label: "Resolve the identified blocker",
    effortHours: 6,
    isApplicable: (d) => d.blockerIdentified,
    apply: (d) => ({ ...d, blockerIdentified: false }),
    rationale: "A known blocker left unaddressed becomes a lost-reason tag.",
  },
  {
    code: "reduce_discount",
    label: "Renegotiate discount ask downward",
    effortHours: 4,
    isApplicable: (d) => (d.discountRequestedPct ?? 0) > 0.2,
    apply: (d) => ({
      ...d,
      discountRequestedPct: Math.max(0, (d.discountRequestedPct ?? 0) - 0.1),
    }),
    rationale: "Holding margin protects deal health and simplifies approvals.",
  },
  {
    code: "re_engage_stalled",
    label: "Re-engage after stall with a specific next step",
    effortHours: 1,
    isApplicable: (d) => d.daysSinceLastActivity > 10,
    apply: (d) => ({ ...d, daysSinceLastActivity: 1 }),
    rationale: "Silence is the loudest lost-reason — break it immediately.",
  },
  {
    code: "pull_in_close_date",
    label: "Pull in close date by aligning on signing path",
    effortHours: 3,
    isApplicable: (d) => d.closeDatePushCount > 0 || d.daysToCloseDate < 0,
    apply: (d) => ({
      ...d,
      closeDatePushCount: Math.max(0, d.closeDatePushCount - 1),
      daysToCloseDate: Math.max(d.daysToCloseDate, 7),
    }),
    rationale: "Commit dates earn trust with the forecast hierarchy.",
  },
];

// ---------- Public types ----------

export interface InterventionLift {
  intervention: Intervention;
  baseProbability: number;
  projectedProbability: number;
  absoluteLift: number; // projected - base
  relativeLift: number; // (projected - base) / base (0-safe)
  effortHours: number;
  roi: number; // absoluteLift * 100 / effortHours — lift-points-per-hour
}

export interface SimulatedStep {
  stepIndex: number;
  intervention: Intervention;
  probabilityBefore: number;
  probabilityAfter: number;
  marginalLift: number;
  cumulativeLift: number;
  effortHoursCumulative: number;
}

export interface WinSimulationResult {
  dealId: string;
  baseProbability: number;
  finalProbability: number;
  totalLift: number;
  /** All interventions that would change probability, ranked by ROI. */
  ranked: InterventionLift[];
  /** Greedy sequence chosen to maximize lift within the effort budget. */
  recommendedPath: SimulatedStep[];
  totalEffortHours: number;
  /**
   * Headline single sentence the rep can act on today. Derived from the best
   * 1-step intervention if meaningful lift exists, else a steady-state note.
   */
  headline: string;
}

export interface SimulateOptions {
  /** Cap cumulative effort (hours) that the simulator is allowed to spend. */
  maxEffortHours?: number;
  /** Skip interventions that produce less than this absolute probability lift. */
  minAbsoluteLift?: number;
  /** Inject a custom intervention catalog (tests / per-segment tuning). */
  catalog?: Intervention[];
  /** Forward optional weights & calibration to predictWinProbability. */
  winProbOpts?: Parameters<typeof predictWinProbability>[1];
}

// ---------- Core simulation ----------

function safeDivide(n: number, d: number): number {
  return d === 0 ? 0 : n / d;
}

function rankSingle(
  deal: WinProbDealSnapshot,
  base: WinProbResult,
  catalog: Intervention[],
  opts: SimulateOptions,
): InterventionLift[] {
  const results: InterventionLift[] = [];
  for (const intervention of catalog) {
    if (!intervention.isApplicable(deal)) continue;
    const mutated = intervention.apply(deal);
    const projected = predictWinProbability(mutated, opts.winProbOpts);
    const lift = projected.probability - base.probability;
    if ((opts.minAbsoluteLift ?? 0) > 0 && lift < (opts.minAbsoluteLift ?? 0)) {
      continue;
    }
    results.push({
      intervention,
      baseProbability: base.probability,
      projectedProbability: projected.probability,
      absoluteLift: lift,
      relativeLift: safeDivide(lift, base.probability),
      effortHours: intervention.effortHours,
      roi: safeDivide(lift * 100, intervention.effortHours),
    });
  }
  // Sort by ROI desc, with absolute lift as the tie-breaker.
  results.sort((a, b) => {
    if (b.roi !== a.roi) return b.roi - a.roi;
    return b.absoluteLift - a.absoluteLift;
  });
  return results;
}

function greedyPath(
  deal: WinProbDealSnapshot,
  base: WinProbResult,
  catalog: Intervention[],
  opts: SimulateOptions,
): { steps: SimulatedStep[]; finalProb: number } {
  const maxEffort = opts.maxEffortHours ?? Infinity;
  const minLift = opts.minAbsoluteLift ?? 0.005; // 0.5 probability point default
  let current = { ...deal };
  let currentProb = base.probability;
  let effort = 0;
  const used = new Set<InterventionCode>();
  const steps: SimulatedStep[] = [];

  while (effort < maxEffort) {
    let best: {
      intervention: Intervention;
      mutated: WinProbDealSnapshot;
      next: number;
      marginal: number;
    } | null = null;

    for (const iv of catalog) {
      if (used.has(iv.code)) continue;
      if (!iv.isApplicable(current)) continue;
      if (effort + iv.effortHours > maxEffort) continue;
      const mutated = iv.apply(current);
      const projected = predictWinProbability(mutated, opts.winProbOpts);
      const marginal = projected.probability - currentProb;
      if (marginal < minLift) continue;
      const roi = safeDivide(marginal * 100, iv.effortHours);
      const bestRoi = best ? safeDivide(best.marginal * 100, best.intervention.effortHours) : -Infinity;
      if (!best || roi > bestRoi || (roi === bestRoi && marginal > best.marginal)) {
        best = { intervention: iv, mutated, next: projected.probability, marginal };
      }
    }
    if (!best) break;

    used.add(best.intervention.code);
    current = best.mutated;
    effort += best.intervention.effortHours;
    const stepIndex = steps.length;
    steps.push({
      stepIndex,
      intervention: best.intervention,
      probabilityBefore: currentProb,
      probabilityAfter: best.next,
      marginalLift: best.marginal,
      cumulativeLift: best.next - base.probability,
      effortHoursCumulative: effort,
    });
    currentProb = best.next;
  }

  return { steps, finalProb: currentProb };
}

function buildHeadline(
  base: WinProbResult,
  best: InterventionLift | undefined,
): string {
  if (!best || best.absoluteLift < 0.01) {
    if (base.probability >= 0.75) {
      return "Deal is commit-ready — focus on execution, not new interventions.";
    }
    if (base.probability <= 0.1) {
      return "Probability is structurally low — consider re-qualifying or disqualifying.";
    }
    return "No single intervention meaningfully shifts the outcome — maintain cadence.";
  }
  const pct = (best.absoluteLift * 100).toFixed(1);
  return `Biggest lever right now: ${best.intervention.label} — worth ~${pct} probability points (${best.intervention.effortHours}h).`;
}

/**
 * Simulate "what would it take to win" for a single deal.
 */
export function simulateWinPath(
  deal: WinProbDealSnapshot,
  opts: SimulateOptions = {},
): WinSimulationResult {
  const catalog = opts.catalog ?? CATALOG;
  const base = predictWinProbability(deal, opts.winProbOpts);

  if (deal.stage === "closed_won" || deal.stage === "closed_lost") {
    return {
      dealId: deal.id,
      baseProbability: base.probability,
      finalProbability: base.probability,
      totalLift: 0,
      ranked: [],
      recommendedPath: [],
      totalEffortHours: 0,
      headline:
        deal.stage === "closed_won"
          ? "Deal already won — move to onboarding."
          : "Deal already lost — route to win-loss analysis.",
    };
  }

  const ranked = rankSingle(deal, base, catalog, opts);
  const { steps, finalProb } = greedyPath(deal, base, catalog, opts);

  const effortTotal = steps.reduce((s, st) => s + st.intervention.effortHours, 0);

  return {
    dealId: deal.id,
    baseProbability: base.probability,
    finalProbability: finalProb,
    totalLift: finalProb - base.probability,
    ranked,
    recommendedPath: steps,
    totalEffortHours: effortTotal,
    headline: buildHeadline(base, ranked[0]),
  };
}

/**
 * Batch variant — run the simulator across a pipeline and summarize where
 * rep effort produces the most incremental pipeline-weighted revenue.
 */
export interface PortfolioLeverage {
  dealId: string;
  amount: number;
  baseProbability: number;
  bestIntervention?: Intervention;
  bestLift: number;
  /** Expected revenue lift = amount × absoluteLift. */
  expectedRevenueLift: number;
  effortHours: number;
  revenueLiftPerHour: number;
}

export interface PortfolioSimulation {
  totals: {
    deals: number;
    totalBaseExpected: number;
    totalProjectedExpected: number;
    totalRevenueLift: number;
    totalEffortHours: number;
    revenueLiftPerHour: number;
  };
  perDeal: WinSimulationResult[];
  /** Sorted desc by revenueLiftPerHour — "where a manager should spend the next hour". */
  leverageRanking: PortfolioLeverage[];
}

export function simulatePortfolio(
  deals: WinProbDealSnapshot[],
  opts: SimulateOptions = {},
): PortfolioSimulation {
  const perDeal = deals.map((d) => simulateWinPath(d, opts));
  const leverage: PortfolioLeverage[] = perDeal.map((sim, i) => {
    const top = sim.ranked[0];
    const baseExpected = deals[i].amount * sim.baseProbability;
    const projectedExpected = deals[i].amount * (sim.baseProbability + (top?.absoluteLift ?? 0));
    const revenueLift = projectedExpected - baseExpected;
    const effort = top?.effortHours ?? 0;
    return {
      dealId: deals[i].id,
      amount: deals[i].amount,
      baseProbability: sim.baseProbability,
      bestIntervention: top?.intervention,
      bestLift: top?.absoluteLift ?? 0,
      expectedRevenueLift: revenueLift,
      effortHours: effort,
      revenueLiftPerHour: effort > 0 ? revenueLift / effort : 0,
    };
  });
  leverage.sort((a, b) => b.revenueLiftPerHour - a.revenueLiftPerHour);

  const totalBaseExpected = deals.reduce(
    (s, d, i) => s + d.amount * perDeal[i].baseProbability,
    0,
  );
  const totalProjectedExpected = deals.reduce(
    (s, d, i) => s + d.amount * perDeal[i].finalProbability,
    0,
  );
  const totalEffort = perDeal.reduce((s, p) => s + p.totalEffortHours, 0);
  const totalLift = totalProjectedExpected - totalBaseExpected;

  return {
    totals: {
      deals: deals.length,
      totalBaseExpected,
      totalProjectedExpected,
      totalRevenueLift: totalLift,
      totalEffortHours: totalEffort,
      revenueLiftPerHour: totalEffort > 0 ? totalLift / totalEffort : 0,
    },
    perDeal,
    leverageRanking: leverage,
  };
}

export const DEFAULT_INTERVENTION_CATALOG = CATALOG;
