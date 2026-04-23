/**
 * Phase 53 — Pricing & deal desk engine.
 *
 * Takes a deal quote request and produces:
 *   - price floor (from segment-specific guardrails + historical win-rate
 *     elasticity), below which the deal is not sustainable
 *   - approval chain (AE → manager → director → VP → CRO → CFO)
 *   - escalation reasons (what triggered each hop in the chain)
 *   - redline suggestions (contractual terms to protect)
 *   - forecasted win lift (if price is held at list vs. discounted)
 *
 * Pure. No database. Pricing rules + history passed in.
 */

// ---------- Inputs ----------

export type DealSegment = "smb" | "mid_market" | "enterprise" | "strategic";
export type DealTerm = 12 | 24 | 36;

export interface PricingRule {
  segment: DealSegment;
  listAnnualFloor: number;
  maxDiscountPctNoApproval: number; // e.g. 0.1 = 10%
  aeApprovalCap: number; // e.g. 0.15 = 15%
  managerApprovalCap: number;
  directorApprovalCap: number;
  vpApprovalCap: number;
  croApprovalCap: number;
  /** Multi-year uplift discount allowed. */
  multiYearBonusPct?: number;
}

export interface HistoricalPricePoint {
  segment: DealSegment;
  discountPct: number;
  won: boolean;
  amount: number;
}

export interface DealDeskRequest {
  dealId: string;
  segment: DealSegment;
  termMonths: DealTerm;
  listAnnualValue: number;
  requestedAnnualValue: number;
  requestedStartIso: string;
  justification?: string;
  /** Optional flags the rep is asserting: strategic logo, expansion play, etc. */
  flags?: {
    strategicLogo?: boolean;
    expansionAttached?: boolean;
    multiProductBundle?: boolean;
    sourceOfHandRaise?: "inbound" | "outbound" | "partner" | "referral";
    competitorSelected?: string;
  };
}

export interface DealDeskOptions {
  /** Rules keyed by segment. */
  rules: PricingRule[];
  /** History used to estimate win-lift curve. */
  history?: HistoricalPricePoint[];
  /** Minimum number of historical points required to honor the discount lift curve. */
  minHistoricalSample?: number;
}

// ---------- Outputs ----------

export type ApprovalRole = "ae" | "manager" | "director" | "vp" | "cro" | "cfo";

export interface ApprovalStep {
  role: ApprovalRole;
  required: boolean;
  reason: string;
}

export interface RedlineSuggestion {
  clause: string;
  guidance: string;
  severity: "info" | "warning" | "critical";
}

export interface DealDeskDecision {
  dealId: string;
  segment: DealSegment;
  requestedDiscountPct: number;
  priceFloorAnnual: number; // deal cannot go below this without CFO sign-off
  belowFloor: boolean;
  suggestedAnnualValue: number; // engine's recommended counter
  suggestedDiscountPct: number;
  expectedWinLift: {
    holdList: number; // probability estimate if priced at list
    atRequested: number; // probability estimate if priced at requested
    atSuggested: number; // probability at engine's counter
  };
  approvals: ApprovalStep[];
  redlines: RedlineSuggestion[];
  commentary: string[];
  /** Overall decision bucket. */
  outcome: "auto_approve" | "needs_approval" | "escalate" | "blocked";
}

// ---------- Helpers ----------

function pct(x: number): number {
  return Math.round(x * 10_000) / 10_000;
}

function discountPctOf(req: DealDeskRequest): number {
  if (req.listAnnualValue === 0) return 0;
  return Math.max(0, 1 - req.requestedAnnualValue / req.listAnnualValue);
}

function lookupRule(rules: PricingRule[], segment: DealSegment): PricingRule {
  const match = rules.find((r) => r.segment === segment);
  if (match) return match;
  // Fallback baseline rule if caller didn't supply for this segment.
  return {
    segment,
    listAnnualFloor: 10_000,
    maxDiscountPctNoApproval: 0.1,
    aeApprovalCap: 0.1,
    managerApprovalCap: 0.15,
    directorApprovalCap: 0.2,
    vpApprovalCap: 0.3,
    croApprovalCap: 0.4,
    multiYearBonusPct: 0.05,
  };
}

/**
 * Estimate win probability at a given discount pct from history.
 * Uses kernel smoothing — weighted average of wins within a discount window.
 */
function estimateWinRate(
  history: HistoricalPricePoint[],
  segment: DealSegment,
  targetDiscount: number,
  minSample: number,
): number {
  const scoped = history.filter((h) => h.segment === segment);
  if (scoped.length < minSample) {
    // Fall back to a linear heuristic: 50% at 0% discount, +1.5% win per 1% discount, cap at 85%.
    return Math.min(0.85, 0.5 + targetDiscount * 1.5);
  }
  const bandwidth = 0.075;
  let weightSum = 0;
  let winSum = 0;
  for (const h of scoped) {
    const d = Math.abs(h.discountPct - targetDiscount);
    const w = Math.exp(-(d * d) / (2 * bandwidth * bandwidth));
    weightSum += w;
    winSum += w * (h.won ? 1 : 0);
  }
  if (weightSum === 0) return 0.5;
  return winSum / weightSum;
}

function priceFloor(
  rule: PricingRule,
  listAnnual: number,
  termMonths: DealTerm,
): number {
  // List - CRO cap is the "don't go below without CFO sign-off" floor.
  const maxAllowedDiscount = rule.croApprovalCap;
  let floor = listAnnual * (1 - maxAllowedDiscount);
  // Multi-year deals get a small allowance to dip further.
  if (termMonths >= 24) {
    const bonus = rule.multiYearBonusPct ?? 0;
    floor = listAnnual * (1 - Math.min(0.45, maxAllowedDiscount + bonus));
  }
  return Math.max(rule.listAnnualFloor * (termMonths / 12), Math.round(floor));
}

function buildApprovals(
  discount: number,
  rule: PricingRule,
  belowFloor: boolean,
  req: DealDeskRequest,
): ApprovalStep[] {
  const steps: ApprovalStep[] = [];
  if (discount > 0) {
    steps.push({ role: "ae", required: true, reason: "AE signs any discounted contract." });
  }
  if (discount > rule.maxDiscountPctNoApproval) {
    steps.push({
      role: "manager",
      required: true,
      reason: `Discount ${(discount * 100).toFixed(1)}% > auto-approve cap (${(rule.maxDiscountPctNoApproval * 100).toFixed(0)}%).`,
    });
  }
  if (discount > rule.managerApprovalCap) {
    steps.push({
      role: "director",
      required: true,
      reason: `Discount ${(discount * 100).toFixed(1)}% > manager cap (${(rule.managerApprovalCap * 100).toFixed(0)}%).`,
    });
  }
  if (discount > rule.directorApprovalCap) {
    steps.push({
      role: "vp",
      required: true,
      reason: `Discount ${(discount * 100).toFixed(1)}% > director cap (${(rule.directorApprovalCap * 100).toFixed(0)}%).`,
    });
  }
  if (discount > rule.vpApprovalCap) {
    steps.push({
      role: "cro",
      required: true,
      reason: `Discount ${(discount * 100).toFixed(1)}% > VP cap (${(rule.vpApprovalCap * 100).toFixed(0)}%).`,
    });
  }
  if (belowFloor || discount > rule.croApprovalCap) {
    steps.push({
      role: "cfo",
      required: true,
      reason: belowFloor
        ? "Price below engine floor — requires CFO sign-off."
        : `Discount > CRO cap (${(rule.croApprovalCap * 100).toFixed(0)}%) — CFO sign-off needed.`,
    });
  }
  if (req.flags?.strategicLogo && req.segment === "strategic" && steps.some((s) => s.role === "vp")) {
    steps.push({
      role: "cro",
      required: true,
      reason: "Strategic-logo flag — CRO must be in approval chain regardless of discount tier.",
    });
  }
  // De-duplicate roles while preserving order.
  const seen = new Set<ApprovalRole>();
  return steps.filter((s) => {
    if (seen.has(s.role)) return false;
    seen.add(s.role);
    return true;
  });
}

function buildRedlines(req: DealDeskRequest, rule: PricingRule): RedlineSuggestion[] {
  const redlines: RedlineSuggestion[] = [];
  if (req.termMonths >= 24) {
    redlines.push({
      clause: "Annual uplift",
      guidance: "Require CPI-linked annual uplift (minimum 4%) on years 2+.",
      severity: "warning",
    });
  }
  if (req.flags?.multiProductBundle) {
    redlines.push({
      clause: "Bundle separation",
      guidance: "Specify non-severability: removing one module forfeits bundle discount.",
      severity: "warning",
    });
  }
  if (discountPctOf(req) > rule.directorApprovalCap) {
    redlines.push({
      clause: "Ramped commit",
      guidance: "Structure as ramped commit so year-1 exposure is limited until adoption proves out.",
      severity: "critical",
    });
  }
  if (req.flags?.competitorSelected) {
    redlines.push({
      clause: "Competitive replacement clause",
      guidance: `Document competitive-replacement credit from ${req.flags.competitorSelected} to defend pricing.`,
      severity: "info",
    });
  }
  redlines.push({
    clause: "Termination for convenience",
    guidance: "Reject TFC; allow termination for cause only, with cure period.",
    severity: "critical",
  });
  redlines.push({
    clause: "Auto-renew",
    guidance: "Require auto-renew with 90-day notice-to-terminate.",
    severity: "info",
  });
  return redlines;
}

function outcomeFor(
  approvals: ApprovalStep[],
  belowFloor: boolean,
  discount: number,
  rule: PricingRule,
): DealDeskDecision["outcome"] {
  if (belowFloor) return "blocked";
  if (discount > rule.croApprovalCap) return "escalate";
  if (approvals.some((a) => a.role === "cro" || a.role === "vp")) return "escalate";
  if (approvals.length > 1) return "needs_approval";
  return "auto_approve";
}

function suggestedCounter(
  rule: PricingRule,
  req: DealDeskRequest,
): { annual: number; discount: number } {
  // Counter at the largest auto-approvable tier — manager cap — without
  // forcing director escalation. For strategic logos we allow director tier.
  const capPct =
    req.segment === "strategic" || req.flags?.strategicLogo
      ? rule.directorApprovalCap
      : rule.managerApprovalCap;
  const counter = req.listAnnualValue * (1 - capPct);
  // Counter is the engine's recommended give-back. If the customer already asked
  // for a SMALLER discount than our cap (i.e. requestedAnnualValue > counter),
  // just honor their ask — don't invent a worse offer. Otherwise, walk them back
  // to the cap (the higher annual value, i.e. less discount).
  const boundedAnnual = Math.max(counter, req.requestedAnnualValue);
  const boundedDiscount = 1 - boundedAnnual / Math.max(1, req.listAnnualValue);
  return { annual: Math.round(boundedAnnual), discount: boundedDiscount };
}

function commentary(
  req: DealDeskRequest,
  decision: Omit<DealDeskDecision, "commentary">,
): string[] {
  const out: string[] = [];
  const discountPctStr = (decision.requestedDiscountPct * 100).toFixed(1);
  if (decision.outcome === "auto_approve") {
    out.push(`Within segment guardrails (${discountPctStr}% discount) — AE can proceed.`);
  } else if (decision.outcome === "blocked") {
    out.push(`Requested price is below engine floor — requires CFO override and competitive justification.`);
  } else if (decision.outcome === "escalate") {
    out.push(`Large-discount deal — loop in CRO and prepare board-readout justification.`);
  } else {
    out.push(`Needs manager/director review — prepare written justification and value ROI.`);
  }
  if (req.flags?.multiProductBundle) out.push("Multi-product bundle — protect with non-severability clause.");
  if (req.flags?.strategicLogo) out.push("Strategic-logo flag applied — weighting case-study value in negotiation.");
  return out;
}

// ---------- Public API ----------

export function evaluateDealDesk(
  req: DealDeskRequest,
  opts: DealDeskOptions,
): DealDeskDecision {
  const rule = lookupRule(opts.rules, req.segment);
  const requestedDiscount = discountPctOf(req);
  const floor = priceFloor(rule, req.listAnnualValue, req.termMonths);
  const belowFloor = req.requestedAnnualValue < floor;

  const suggested = suggestedCounter(rule, req);
  const minSample = opts.minHistoricalSample ?? 20;
  const winAtList = estimateWinRate(opts.history ?? [], req.segment, 0, minSample);
  const winAtRequested = estimateWinRate(opts.history ?? [], req.segment, requestedDiscount, minSample);
  const winAtSuggested = estimateWinRate(opts.history ?? [], req.segment, suggested.discount, minSample);

  const approvals = buildApprovals(requestedDiscount, rule, belowFloor, req);
  const redlines = buildRedlines(req, rule);
  const outcome = outcomeFor(approvals, belowFloor, requestedDiscount, rule);

  const partial: Omit<DealDeskDecision, "commentary"> = {
    dealId: req.dealId,
    segment: req.segment,
    requestedDiscountPct: pct(requestedDiscount),
    priceFloorAnnual: floor,
    belowFloor,
    suggestedAnnualValue: suggested.annual,
    suggestedDiscountPct: pct(suggested.discount),
    expectedWinLift: {
      holdList: pct(winAtList),
      atRequested: pct(winAtRequested),
      atSuggested: pct(winAtSuggested),
    },
    approvals,
    redlines,
    outcome,
  };
  return { ...partial, commentary: commentary(req, partial) };
}
