/**
 * Phase 42 — Discount governance + revenue leakage detector.
 *
 * Routes pricing exceptions through the correct approver, enforces margin
 * floors, and surfaces revenue leakage patterns (rogue discounts, dropped
 * list price, bundling tricks that hide discount) so Deal Desk / CFO sees
 * the real average selling price.
 *
 * Pure. No DB. Input is the proposed deal + the workspace's discount policy.
 */

export type ApprovalLevel =
  | "rep_auto_approve"
  | "manager"
  | "director"
  | "vp_sales"
  | "cro"
  | "cfo"
  | "ceo";

export interface DiscountTier {
  /** Max total discount percent (0..1) allowed at this level. Exclusive upper bound. */
  maxDiscount: number;
  approver: ApprovalLevel;
}

export interface MarginPolicy {
  /** Minimum gross margin percent allowed without escalation. */
  minimumMarginPct: number; // 0..1
  /** Margin below this triggers CFO escalation. */
  cfoFloorPct: number;
  /** Below this, deal MUST be declined. */
  hardFloorPct: number;
}

export interface BundlePolicy {
  /** Max ratio of bundled free units to priced units before flagged as hidden discount. */
  maxFreeRatio: number;
  /** Services/training as % of total ARR that is scrutinized. */
  maxServicesRatioBeforeReview: number;
}

export interface DiscountPolicy {
  tiers: DiscountTier[]; // ordered ascending
  margin: MarginPolicy;
  bundle: BundlePolicy;
  /** Blanket discount ceiling — no one below CEO can approve above this. */
  blanketCeiling: number;
  /** Segments that bypass rep auto-approve. */
  strategicSegments?: string[];
}

export const DEFAULT_POLICY: DiscountPolicy = {
  tiers: [
    { maxDiscount: 0.1, approver: "rep_auto_approve" },
    { maxDiscount: 0.2, approver: "manager" },
    { maxDiscount: 0.3, approver: "director" },
    { maxDiscount: 0.4, approver: "vp_sales" },
    { maxDiscount: 0.5, approver: "cro" },
    { maxDiscount: 0.65, approver: "cfo" },
  ],
  margin: {
    minimumMarginPct: 0.55,
    cfoFloorPct: 0.4,
    hardFloorPct: 0.25,
  },
  bundle: {
    maxFreeRatio: 0.15,
    maxServicesRatioBeforeReview: 0.25,
  },
  blanketCeiling: 0.65,
};

export interface DealProposal {
  id: string;
  ownerId: string;
  segment?: string;
  listPrice: number; // total
  quotedPrice: number; // what rep is proposing
  costOfGoodsPct: number; // 0..1 — cost to deliver as % of listPrice
  lineItems: Array<{
    sku: string;
    listPrice: number;
    quotedPrice: number;
    quantity: number;
    category: "license" | "usage" | "services" | "training" | "other";
    isFree?: boolean;
  }>;
  termLengthMonths: number;
  commitMrr?: number;
  competitorInDeal?: boolean;
}

export interface DiscountLeakageFlag {
  code:
    | "missing_approval"
    | "margin_below_floor"
    | "hard_floor_breach"
    | "hidden_bundle_discount"
    | "services_heavy"
    | "short_term_deep_discount"
    | "strategic_segment_bypass"
    | "rogue_discount"
    | "stacking_promo";
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface DiscountEvaluation {
  dealId: string;
  listPrice: number;
  quotedPrice: number;
  grossDiscountPct: number; // nominal (list - quoted)/list
  effectiveDiscountPct: number; // includes free lines + bundled lines
  approvalRequired: ApprovalLevel;
  marginPct: number; // (list - cogs - discount) / list
  decision: "approved" | "needs_approval" | "escalate" | "reject";
  flags: DiscountLeakageFlag[];
  narrative: string;
}

function clamp(x: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, x));
}

function decideApprover(discount: number, policy: DiscountPolicy): ApprovalLevel {
  if (discount > policy.blanketCeiling) return "ceo";
  for (const tier of policy.tiers) {
    if (discount <= tier.maxDiscount) return tier.approver;
  }
  return "ceo";
}

function computeEffectiveDiscount(d: DealProposal): number {
  // Count free items at their list price as "hidden" discount.
  let pseudoList = d.listPrice;
  const pseudoQuoted = d.quotedPrice;
  for (const li of d.lineItems) {
    if (li.isFree && li.listPrice > 0) {
      // Add the free line's list price to both (i.e., as if it were sold, then fully discounted).
      pseudoList += li.listPrice * li.quantity;
      // pseudoQuoted unchanged — the line is free in the deal
    }
  }
  if (pseudoList === 0) return 0;
  return clamp((pseudoList - pseudoQuoted) / pseudoList);
}

function detectFlags(d: DealProposal, policy: DiscountPolicy, ev: {
  grossDiscountPct: number;
  effectiveDiscountPct: number;
  marginPct: number;
  approvalRequired: ApprovalLevel;
}): DiscountLeakageFlag[] {
  const flags: DiscountLeakageFlag[] = [];

  if (ev.marginPct < policy.margin.hardFloorPct) {
    flags.push({
      code: "hard_floor_breach",
      severity: "critical",
      message: `Margin ${(ev.marginPct * 100).toFixed(1)}% below hard floor ${(policy.margin.hardFloorPct * 100).toFixed(0)}%`,
    });
  } else if (ev.marginPct < policy.margin.cfoFloorPct) {
    flags.push({
      code: "margin_below_floor",
      severity: "warning",
      message: `Margin ${(ev.marginPct * 100).toFixed(1)}% below CFO floor ${(policy.margin.cfoFloorPct * 100).toFixed(0)}%`,
    });
  }

  if (ev.effectiveDiscountPct > ev.grossDiscountPct + 0.02) {
    flags.push({
      code: "hidden_bundle_discount",
      severity: "warning",
      message: `Free line items hide ${((ev.effectiveDiscountPct - ev.grossDiscountPct) * 100).toFixed(1)}% additional discount`,
    });
  }

  const pricedSubtotal = d.lineItems
    .filter((li) => !li.isFree && li.category !== "services" && li.category !== "training")
    .reduce((a, b) => a + b.quotedPrice * b.quantity, 0);
  const servicesSubtotal = d.lineItems
    .filter((li) => li.category === "services" || li.category === "training")
    .reduce((a, b) => a + b.quotedPrice * b.quantity, 0);
  const totalSubtotal = pricedSubtotal + servicesSubtotal;
  if (totalSubtotal > 0 && servicesSubtotal / totalSubtotal > policy.bundle.maxServicesRatioBeforeReview) {
    flags.push({
      code: "services_heavy",
      severity: "info",
      message: `Services/training is ${((servicesSubtotal / totalSubtotal) * 100).toFixed(0)}% of deal — review for discount hiding`,
    });
  }

  if (ev.grossDiscountPct >= 0.3 && d.termLengthMonths <= 12) {
    flags.push({
      code: "short_term_deep_discount",
      severity: "warning",
      message: `${(ev.grossDiscountPct * 100).toFixed(0)}% discount on a ${d.termLengthMonths}-month term — bad per-year precedent`,
    });
  }

  if (policy.strategicSegments && d.segment && policy.strategicSegments.includes(d.segment)) {
    if (ev.approvalRequired === "rep_auto_approve") {
      flags.push({
        code: "strategic_segment_bypass",
        severity: "warning",
        message: `Strategic segment ${d.segment} always requires Deal Desk review`,
      });
    }
  }

  // Rogue discount: rep pushed through near-auto tier without competitor or strategic reason
  if (ev.grossDiscountPct >= 0.08 && ev.grossDiscountPct < 0.15 && !d.competitorInDeal && (!d.segment || d.segment === "smb")) {
    flags.push({
      code: "rogue_discount",
      severity: "info",
      message: `${(ev.grossDiscountPct * 100).toFixed(0)}% discount applied without documented competitive/strategic reason`,
    });
  }

  return flags;
}

function decideFinal(
  flags: DiscountLeakageFlag[],
  approvalRequired: ApprovalLevel,
): DiscountEvaluation["decision"] {
  if (flags.some((f) => f.code === "hard_floor_breach")) return "reject";
  if (flags.some((f) => f.severity === "critical")) return "reject";
  if (approvalRequired === "rep_auto_approve" && !flags.some((f) => f.severity === "warning")) return "approved";
  if (flags.some((f) => f.severity === "warning")) return "escalate";
  return "needs_approval";
}

function buildNarrative(
  d: DealProposal,
  ev: {
    grossDiscountPct: number;
    effectiveDiscountPct: number;
    marginPct: number;
    approvalRequired: ApprovalLevel;
    decision: DiscountEvaluation["decision"];
  },
): string {
  const parts: string[] = [];
  parts.push(`Deal ${d.id}: gross ${(ev.grossDiscountPct * 100).toFixed(1)}%, effective ${(ev.effectiveDiscountPct * 100).toFixed(1)}%, margin ${(ev.marginPct * 100).toFixed(1)}%.`);
  parts.push(`Approver: ${ev.approvalRequired}.`);
  if (ev.decision === "reject") parts.push("Rejected: violates policy.");
  else if (ev.decision === "escalate") parts.push("Needs Deal Desk escalation.");
  else if (ev.decision === "needs_approval") parts.push(`Pending ${ev.approvalRequired} approval.`);
  else parts.push("Auto-approved.");
  return parts.join(" ");
}

/**
 * Evaluate a single deal.
 */
export function evaluateDiscount(
  deal: DealProposal,
  policy: DiscountPolicy = DEFAULT_POLICY,
): DiscountEvaluation {
  const grossDiscountPct = deal.listPrice === 0 ? 0 : clamp((deal.listPrice - deal.quotedPrice) / deal.listPrice);
  const effectiveDiscountPct = computeEffectiveDiscount(deal);
  const cogs = deal.listPrice * deal.costOfGoodsPct;
  const discountAmount = deal.listPrice - deal.quotedPrice;
  const marginPct = deal.listPrice === 0 ? 0 : (deal.listPrice - cogs - discountAmount) / deal.listPrice;
  const approvalRequired = decideApprover(effectiveDiscountPct, policy);
  const flags = detectFlags(deal, policy, {
    grossDiscountPct,
    effectiveDiscountPct,
    marginPct,
    approvalRequired,
  });
  const decision = decideFinal(flags, approvalRequired);
  const narrative = buildNarrative(deal, {
    grossDiscountPct,
    effectiveDiscountPct,
    marginPct,
    approvalRequired,
    decision,
  });
  return {
    dealId: deal.id,
    listPrice: deal.listPrice,
    quotedPrice: deal.quotedPrice,
    grossDiscountPct,
    effectiveDiscountPct,
    approvalRequired,
    marginPct,
    decision,
    flags,
    narrative,
  };
}

/**
 * Run evaluations on a batch and return leakage rollup.
 */
export function auditDiscountLeakage(
  evaluations: DiscountEvaluation[],
): {
  totalListPrice: number;
  totalQuoted: number;
  totalLeakage: number;
  avgDiscountPct: number;
  avgMarginPct: number;
  flagCountsByCode: Record<string, number>;
  criticalCount: number;
  warningCount: number;
  worstOffenders: DiscountEvaluation[];
} {
  let totalListPrice = 0;
  let totalQuoted = 0;
  let totalDiscountPct = 0;
  let totalMarginPct = 0;
  let criticalCount = 0;
  let warningCount = 0;
  const flagCountsByCode: Record<string, number> = {};
  for (const e of evaluations) {
    totalListPrice += e.listPrice;
    totalQuoted += e.quotedPrice;
    totalDiscountPct += e.effectiveDiscountPct;
    totalMarginPct += e.marginPct;
    for (const f of e.flags) {
      flagCountsByCode[f.code] = (flagCountsByCode[f.code] ?? 0) + 1;
      if (f.severity === "critical") criticalCount += 1;
      else if (f.severity === "warning") warningCount += 1;
    }
  }
  const n = Math.max(1, evaluations.length);
  const worstOffenders = [...evaluations]
    .sort((a, b) => b.effectiveDiscountPct - a.effectiveDiscountPct)
    .slice(0, 10);
  return {
    totalListPrice,
    totalQuoted,
    totalLeakage: totalListPrice - totalQuoted,
    avgDiscountPct: totalDiscountPct / n,
    avgMarginPct: totalMarginPct / n,
    flagCountsByCode,
    criticalCount,
    warningCount,
    worstOffenders,
  };
}
