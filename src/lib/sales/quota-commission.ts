/**
 * Phase 31 — Quota attainment + commission calculator.
 *
 * Supports the commission shapes sales orgs actually run:
 *   - flat-rate on booked revenue
 *   - tiered (bracketed) commission rates keyed on quota attainment %
 *   - accelerators above 100% attainment
 *   - SPIFFs (flat $ per named deal / product / behavior)
 *   - clawback reservation % (held until revenue rec'd)
 *
 * Pure. Caller provides closed-won deals + plan. Returns:
 *   - booked attainment %
 *   - period commission $
 *   - effective commission rate
 *   - per-deal payout breakdown
 *
 * OTE math: commissionTargetAtQuota is the commission portion of OTE
 * (the "variable target"). Base salary lives outside this module.
 */

export interface CommissionTier {
  /**
   * Attainment threshold at which this tier's rate starts applying,
   * as a fraction (0.5 = 50%, 1.0 = 100%).
   */
  attainmentFrom: number;
  /** Upper bound (exclusive), or null for open-ended. */
  attainmentTo: number | null;
  /** Commission rate on revenue booked while within this tier (e.g. 0.08). */
  rate: number;
}

export interface SpiffRule {
  /** Human-readable name. */
  name: string;
  /** Predicate: does this deal qualify? */
  matches: (deal: ClosedWonDeal) => boolean;
  /** Flat bonus paid per qualifying deal. */
  amount: number;
}

export interface CommissionPlan {
  /** Plan id (e.g. "AE-Enterprise-2026"). */
  id: string;
  /** Quota for the period, in deal currency units. */
  periodQuota: number;
  /** Variable target at 100% attainment — the commission portion of OTE. */
  commissionTargetAtQuota: number;
  /**
   * Bracketed commission tiers. Required. If empty, falls back to a
   * flat rate derived from commissionTargetAtQuota / periodQuota.
   */
  tiers: CommissionTier[];
  /** Optional accelerator tier(s) that kick in above 100%. */
  accelerators?: CommissionTier[];
  /** Optional SPIFFs evaluated per deal. */
  spiffs?: SpiffRule[];
  /**
   * Fraction of commission held back for clawback (0..1). Paid out
   * only after the customer has paid, or the clawback window elapsed.
   */
  clawbackHoldFraction?: number;
}

export interface ClosedWonDeal {
  id: string;
  amount: number;
  currency: string;
  /** ISO date of close. */
  closedAt: string;
  /** Optional product / segment tags for SPIFFs. */
  tags?: string[];
  /** Whether customer has remitted payment. */
  paid?: boolean;
}

export interface DealPayout {
  dealId: string;
  baseCommission: number;
  spiffs: Array<{ name: string; amount: number }>;
  held: number; // clawback hold
  vested: number; // paid now
  effectiveRate: number; // baseCommission / amount
}

export interface CommissionResult {
  planId: string;
  bookedRevenue: number;
  periodQuota: number;
  attainment: number; // fraction, 1.0 = 100%
  /** Sum of base commission + spiffs across the period. */
  totalCommission: number;
  /** Sum vested now (after clawback hold). */
  totalVested: number;
  /** Sum held back. */
  totalHeld: number;
  /** Blended rate: totalCommission / bookedRevenue. */
  effectiveRate: number;
  deals: DealPayout[];
  /** Any notes surfaced while computing (e.g. "no tiers — used flat fallback"). */
  notes: string[];
}

/**
 * Compute the commission on an incremental slice of revenue, stepping
 * through tiers. Tiers are evaluated in order; any given dollar is paid
 * at the rate of the tier it lands in (by cumulative attainment).
 *
 * Example: tiers [0–0.5 @ 4%], [0.5–1.0 @ 8%], accelerators [1.0+ @ 12%].
 * Quota 1,000,000. Revenue to commission = 1,200,000. Payout:
 *   first 500k @ 4% = 20k
 *   next  500k @ 8% = 40k
 *   next  200k @ 12% = 24k
 *   total 84k
 */
function walkTiers(
  revenue: number,
  quota: number,
  tiers: CommissionTier[],
  accelerators: CommissionTier[],
): { commission: number; notes: string[] } {
  if (revenue <= 0 || quota <= 0) return { commission: 0, notes: [] };

  const notes: string[] = [];
  const allTiers = [...tiers, ...accelerators].sort(
    (a, b) => a.attainmentFrom - b.attainmentFrom,
  );

  let remaining = revenue;
  let cumulativeRevenue = 0;
  let commission = 0;

  for (const tier of allTiers) {
    if (remaining <= 0) break;
    const tierStartRev = tier.attainmentFrom * quota;
    const tierEndRev = tier.attainmentTo === null ? Infinity : tier.attainmentTo * quota;
    // Slice of revenue that lands in this tier, given how far we've walked.
    const effectiveStart = Math.max(cumulativeRevenue, tierStartRev);
    const effectiveEnd = Math.min(cumulativeRevenue + remaining, tierEndRev);
    const slice = Math.max(0, effectiveEnd - effectiveStart);
    if (slice > 0) {
      commission += slice * tier.rate;
      remaining -= slice;
      cumulativeRevenue += slice;
    }
  }

  if (remaining > 0) {
    notes.push(`Unassigned revenue: ${remaining.toFixed(2)} fell outside all tiers`);
  }
  return { commission, notes };
}

export function calculateCommission(
  deals: ClosedWonDeal[],
  plan: CommissionPlan,
): CommissionResult {
  const notes: string[] = [];
  const bookedRevenue = deals.reduce((sum, d) => sum + d.amount, 0);
  const attainment = plan.periodQuota > 0 ? bookedRevenue / plan.periodQuota : 0;

  let tiers = plan.tiers;
  if (!tiers || tiers.length === 0) {
    // Fallback: flat rate = target / quota, applied to all revenue up to quota.
    const fallbackRate = plan.commissionTargetAtQuota / plan.periodQuota;
    tiers = [
      { attainmentFrom: 0, attainmentTo: 1, rate: fallbackRate },
    ];
    notes.push("No tiers provided — applied flat fallback rate");
  }
  const accelerators = plan.accelerators ?? [];

  // Compute the period-level total commission tierwise, then allocate
  // per-deal pro-rata so each deal gets a proportional share.
  const { commission: totalBaseCommission, notes: tierNotes } = walkTiers(
    bookedRevenue,
    plan.periodQuota,
    tiers,
    accelerators,
  );
  notes.push(...tierNotes);

  const clawbackHold = plan.clawbackHoldFraction ?? 0;

  const deals_out: DealPayout[] = deals.map((deal) => {
    // Pro-rata allocation of base commission.
    const share = bookedRevenue > 0 ? deal.amount / bookedRevenue : 0;
    const baseCommission = totalBaseCommission * share;

    // SPIFF evaluation per deal.
    const spiffs: Array<{ name: string; amount: number }> = [];
    for (const rule of plan.spiffs ?? []) {
      if (rule.matches(deal)) {
        spiffs.push({ name: rule.name, amount: rule.amount });
      }
    }
    const spiffTotal = spiffs.reduce((s, x) => s + x.amount, 0);
    const grossPayout = baseCommission + spiffTotal;
    const held = deal.paid ? 0 : grossPayout * clawbackHold;
    const vested = grossPayout - held;
    return {
      dealId: deal.id,
      baseCommission,
      spiffs,
      held,
      vested,
      effectiveRate: deal.amount > 0 ? baseCommission / deal.amount : 0,
    };
  });

  const totalSpiff = deals_out.reduce(
    (s, d) => s + d.spiffs.reduce((ss, x) => ss + x.amount, 0),
    0,
  );
  const totalCommission = totalBaseCommission + totalSpiff;
  const totalHeld = deals_out.reduce((s, d) => s + d.held, 0);
  const totalVested = totalCommission - totalHeld;
  const effectiveRate = bookedRevenue > 0 ? totalCommission / bookedRevenue : 0;

  return {
    planId: plan.id,
    bookedRevenue,
    periodQuota: plan.periodQuota,
    attainment,
    totalCommission,
    totalVested,
    totalHeld,
    effectiveRate,
    deals: deals_out,
    notes,
  };
}

/**
 * Attainment grade for leaderboard rollups.
 */
export function attainmentGrade(attainment: number):
  | "below_threshold"
  | "ramping"
  | "on_track"
  | "at_quota"
  | "over_quota"
  | "president_club" {
  if (attainment < 0.5) return "below_threshold";
  if (attainment < 0.8) return "ramping";
  if (attainment < 1.0) return "on_track";
  if (attainment < 1.2) return "at_quota";
  if (attainment < 1.5) return "over_quota";
  return "president_club";
}
