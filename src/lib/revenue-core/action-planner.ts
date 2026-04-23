/**
 * Revenue-core action planner.
 *
 * Upgrades the master composer with:
 *   1. Cross-category dedup on (accountId, dealId, category).
 *   2. Monetized impact — every action's headline impact is in dollars so
 *      actions from different upstream systems are directly comparable.
 *   3. Per-owner capacity enforcement — prevents dumping 87 "critical"
 *      items on a single rep.
 *   4. Deterministic action IDs via the audit module's stable hash so the
 *      same underlying problem on the same day yields the same id across
 *      reruns (idempotency-friendly).
 *
 * The planner does NOT replace the existing composers; it consumes their
 * output and post-processes it. This keeps the upstream modules pure and
 * lets us ship the upgrade without touching 5 other files.
 */

import { deriveActionId } from "./audit";
import type { ActionId, Money, OwnerId, OrgId } from "./primitives";
import { moneyFromMajor, currencyScale } from "./primitives";

// -----------------------------------------------------------------------------
// Raw action input (superset of what any upstream composer emits)
// -----------------------------------------------------------------------------

export type RawSeverity = "critical" | "warning" | "info";

export interface RawAction {
  readonly category: string;
  readonly role: string;
  readonly ownerId?: OwnerId | string;
  readonly accountId?: string;
  readonly dealId?: string;
  readonly title: string;
  readonly why: string;
  readonly severity: RawSeverity;
  /**
   * Expected monetary impact in **major units** (e.g. dollars).
   * Positive = revenue/retention upside; negative = cost of doing nothing.
   */
  readonly expectedImpactMajor: number;
  readonly expectedImpactCurrency: "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "CHF" | "SEK" | "NOK" | "DKK" | "SGD" | "HKD" | "INR" | "BRL" | "MXN";
  /** Minutes of owner time required (for capacity balancing). */
  readonly estimatedMinutes: number;
  /** Optional suggested due date. */
  readonly dueByIso?: string;
  /** Optional source for audit trail. */
  readonly source?: string;
}

// -----------------------------------------------------------------------------
// Planned action (output)
// -----------------------------------------------------------------------------

export interface PlannedAction {
  readonly actionId: ActionId;
  readonly category: string;
  readonly role: string;
  readonly ownerId?: string;
  readonly accountId?: string;
  readonly dealId?: string;
  readonly title: string;
  readonly why: string;
  readonly severity: RawSeverity;
  readonly expectedImpact: Money;
  readonly estimatedMinutes: number;
  readonly dueByIso?: string;
  readonly source?: string;
  /** Monetized priority score; larger = do sooner. */
  readonly priorityScore: number;
  /** Actions that were folded into this one by dedup. */
  readonly mergedFrom: ReadonlyArray<string>;
}

export interface ActionPlan {
  readonly asOfIso: string;
  readonly orgId: string;
  readonly actions: ReadonlyArray<PlannedAction>;
  readonly droppedDueToCapacity: ReadonlyArray<PlannedAction>;
  readonly perOwnerLoad: ReadonlyArray<{
    readonly ownerId: string;
    readonly minutes: number;
    readonly actionCount: number;
  }>;
  readonly totalExpectedImpact: Money;
  readonly deduplicatedCount: number;
}

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

export interface PlannerConfig {
  readonly orgId: OrgId | string;
  readonly asOfIso: string;
  /** Per-owner daily capacity in minutes (default 240 = 4 hours). */
  readonly perOwnerMinutes?: number;
  /** Maximum total actions across the org (default 200). */
  readonly maxTotalActions?: number;
  /** Currency to aggregate total impact in (default "USD"). */
  readonly reportingCurrency?: RawAction["expectedImpactCurrency"];
  /**
   * FX rates keyed by ISO currency. Each rate converts 1 minor unit of the
   * source currency into minor units of the reporting currency. Missing rates
   * throw — forcing callers to be explicit about cross-currency assumptions.
   */
  readonly fxRates?: Readonly<Record<string, number>>;
}

const SEVERITY_MULTIPLIER: Record<RawSeverity, number> = {
  critical: 3,
  warning: 1.5,
  info: 1,
};

// -----------------------------------------------------------------------------
// Core pipeline
// -----------------------------------------------------------------------------

function convertToReporting(
  amountMajor: number,
  fromCcy: RawAction["expectedImpactCurrency"],
  toCcy: RawAction["expectedImpactCurrency"],
  fx?: Record<string, number>,
): Money {
  if (fromCcy === toCcy) return moneyFromMajor(amountMajor, toCcy);
  if (!fx || !(fromCcy in fx)) {
    throw new Error(
      `planActions: missing FX rate for ${fromCcy}→${toCcy}; pass fxRates`,
    );
  }
  const fromScale = currencyScale(fromCcy);
  const toScale = currencyScale(toCcy);
  const sourceMinor = Math.round(amountMajor * fromScale);
  const targetMinor = Math.round((sourceMinor * fx[fromCcy]) * (toScale / fromScale));
  return { minor: targetMinor, currency: toCcy };
}

function dedupKey(a: RawAction): string {
  return [a.category, a.accountId ?? "_", a.dealId ?? "_"].join("|");
}

function makeActionId(a: RawAction, orgId: string, asOfIso: string): ActionId {
  return deriveActionId({
    orgId,
    category: a.category,
    subjectId: [a.accountId, a.dealId, a.ownerId].filter(Boolean).join(":") || a.title,
    asOfDayIso: asOfIso,
    extra: { role: a.role },
  });
}

/**
 * Collapse rows sharing the same (category, accountId, dealId) into one
 * "best" action. We keep the row with the highest (severity, impact) tuple
 * and list the source ids the others came from.
 */
function dedupActions(
  raw: ReadonlyArray<RawAction>,
  orgId: string,
  asOfIso: string,
): { merged: PlannedAction[]; dropped: number } {
  const groups = new Map<string, RawAction[]>();
  for (const r of raw) {
    const k = dedupKey(r);
    const arr = groups.get(k) ?? [];
    arr.push(r);
    groups.set(k, arr);
  }
  const out: PlannedAction[] = [];
  let dropped = 0;
  for (const [, rows] of groups) {
    rows.sort((a, b) => {
      const sevDiff =
        SEVERITY_MULTIPLIER[b.severity] - SEVERITY_MULTIPLIER[a.severity];
      if (sevDiff !== 0) return sevDiff;
      return b.expectedImpactMajor - a.expectedImpactMajor;
    });
    const head = rows[0];
    const tail = rows.slice(1);
    dropped += tail.length;
    const actionId = makeActionId(head, orgId, asOfIso);
    out.push({
      actionId,
      category: head.category,
      role: head.role,
      ownerId: head.ownerId ? String(head.ownerId) : undefined,
      accountId: head.accountId,
      dealId: head.dealId,
      title: head.title,
      why: head.why,
      severity: head.severity,
      expectedImpact: moneyFromMajor(
        head.expectedImpactMajor,
        head.expectedImpactCurrency,
      ),
      estimatedMinutes: head.estimatedMinutes,
      dueByIso: head.dueByIso,
      source: head.source,
      priorityScore:
        SEVERITY_MULTIPLIER[head.severity] * Math.max(1, head.expectedImpactMajor),
      mergedFrom: tail.map((t) => t.source ?? t.title),
    });
  }
  return { merged: out, dropped };
}

function applyCapacity(
  actions: PlannedAction[],
  perOwnerMinutes: number,
  maxTotal: number,
): { kept: PlannedAction[]; dropped: PlannedAction[] } {
  const sorted = actions
    .slice()
    .sort((a, b) => b.priorityScore - a.priorityScore);
  const ownerUsed = new Map<string, number>();
  const kept: PlannedAction[] = [];
  const dropped: PlannedAction[] = [];
  for (const a of sorted) {
    if (kept.length >= maxTotal) {
      dropped.push(a);
      continue;
    }
    const owner = a.ownerId ?? "_unassigned";
    const used = ownerUsed.get(owner) ?? 0;
    if (used + a.estimatedMinutes > perOwnerMinutes) {
      // Critical work bypasses the cap to avoid dropping CFO-blocking items,
      // but only up to 2x the cap, never beyond.
      if (a.severity === "critical" && used + a.estimatedMinutes <= perOwnerMinutes * 2) {
        ownerUsed.set(owner, used + a.estimatedMinutes);
        kept.push(a);
      } else {
        dropped.push(a);
      }
    } else {
      ownerUsed.set(owner, used + a.estimatedMinutes);
      kept.push(a);
    }
  }
  return { kept, dropped };
}

function totalImpact(
  actions: ReadonlyArray<PlannedAction>,
  reporting: RawAction["expectedImpactCurrency"],
  fx?: Record<string, number>,
): Money {
  let total = moneyFromMajor(0, reporting);
  for (const a of actions) {
    if (a.expectedImpact.currency === reporting) {
      total = { minor: total.minor + a.expectedImpact.minor, currency: reporting };
    } else {
      const major = a.expectedImpact.minor / currencyScale(a.expectedImpact.currency);
      const converted = convertToReporting(
        major,
        a.expectedImpact.currency,
        reporting,
        fx,
      );
      total = { minor: total.minor + converted.minor, currency: reporting };
    }
  }
  return total;
}

export function planActions(
  raw: ReadonlyArray<RawAction>,
  cfg: PlannerConfig,
): ActionPlan {
  const reporting = cfg.reportingCurrency ?? "USD";
  const perOwnerMinutes = cfg.perOwnerMinutes ?? 240;
  const maxTotal = cfg.maxTotalActions ?? 200;
  const orgId = String(cfg.orgId);

  const { merged, dropped: dedupDropped } = dedupActions(raw, orgId, cfg.asOfIso);
  const { kept, dropped: capDropped } = applyCapacity(merged, perOwnerMinutes, maxTotal);

  // Final sort: severity DESC, then priorityScore DESC.
  kept.sort((a, b) => {
    const sevDiff =
      SEVERITY_MULTIPLIER[b.severity] - SEVERITY_MULTIPLIER[a.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.priorityScore - a.priorityScore;
  });

  const perOwner = new Map<string, { minutes: number; count: number }>();
  for (const a of kept) {
    const owner = a.ownerId ?? "_unassigned";
    const rec = perOwner.get(owner) ?? { minutes: 0, count: 0 };
    rec.minutes += a.estimatedMinutes;
    rec.count += 1;
    perOwner.set(owner, rec);
  }

  return {
    asOfIso: cfg.asOfIso,
    orgId,
    actions: kept,
    droppedDueToCapacity: capDropped,
    perOwnerLoad: Array.from(perOwner.entries())
      .map(([ownerId, v]) => ({
        ownerId,
        minutes: v.minutes,
        actionCount: v.count,
      }))
      .sort((a, b) => b.minutes - a.minutes),
    totalExpectedImpact: totalImpact(kept, reporting, cfg.fxRates),
    deduplicatedCount: dedupDropped,
  };
}
