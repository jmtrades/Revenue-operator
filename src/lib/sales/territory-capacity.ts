/**
 * Phase 44 — Territory design + capacity planning.
 *
 * Pure, deterministic territory allocation + capacity modeling.
 *
 * Core pieces:
 *  - computeRepCapacity: convert rep attributes (quota, ramp, tenure, avg deal size)
 *    into an effective quota, a target revenue-potential load, and a max account count.
 *  - assignTerritories: greedy balanced assignment of accounts to reps honoring
 *    pinned accounts, segment fit, geo, and per-rep capacity ceilings.
 *  - territoryBalanceReport: per-rep load, std dev, gini, over/under status.
 *  - suggestRebalance: swap/move list that monotonically reduces std dev.
 */

export type AccountTier = "strategic" | "enterprise" | "midmarket" | "smb";

export interface Rep {
  id: string;
  name: string;
  quota: number; // annual quota (revenue)
  ramp: number; // 0..1, current ramp factor
  tenureMonths: number;
  avgDealSize: number;
  segmentFit?: AccountTier[]; // segments this rep is best at
  geo?: string[]; // geos this rep covers, e.g. ["us-west", "canada"]
  namedAccountPins?: string[]; // accountIds forcibly owned
}

export interface AccountLoad {
  accountId: string;
  name: string;
  revenuePotential: number; // expected annual revenue if won
  tier: AccountTier;
  geo?: string;
  industry?: string;
  /** Optional hint from prior ownership — used to prefer stable owners when tie-breaking. */
  currentOwner?: string;
}

export interface TerritoryRules {
  /** Coverage multiple for pipeline (target potential = effectiveQuota * coverage). Default 4. */
  pipelineCoverage?: number;
  /** Accounts per rep absolute ceiling. If omitted, derived from capacity math. */
  hardMaxAccounts?: number;
  /** Allow exceeding capacity when needed to place every account. Default true. */
  allowOverflow?: boolean;
  /** If true, respect rep.namedAccountPins before balancing. Default true. */
  respectPinned?: boolean;
  /** If true, only assign accounts whose geo is in rep.geo (when rep.geo is set). Default true. */
  respectGeo?: boolean;
  /** If true, reward segment matches during assignment. Default true. */
  respectSegment?: boolean;
}

export interface RepCapacity {
  repId: string;
  effectiveQuota: number;
  tenureMultiplier: number;
  targetRevenuePotential: number;
  maxAccounts: number;
}

export interface TerritoryAssignment {
  /** repId → accountIds (in deterministic order) */
  byRep: Record<string, string[]>;
  /** accountId → repId (or "" if unassigned) */
  byAccount: Record<string, string>;
  unassigned: string[];
}

export type RepStatus = "underloaded" | "balanced" | "overloaded";

export interface RepLoad {
  repId: string;
  accountCount: number;
  revenuePotential: number;
  /** revenuePotential / targetRevenuePotential (>1 = over target). */
  utilizationPct: number;
  status: RepStatus;
}

export interface TerritoryBalanceReport {
  perRep: RepLoad[];
  meanRevenuePotential: number;
  meanAccountCount: number;
  stdDevRevenue: number;
  /** Normalized variation (stdDev / mean) — 0 = perfectly balanced. */
  coefficientOfVariation: number;
  /** Gini coefficient over revenue load; 0 = equal, ~1 = max inequality. */
  gini: number;
  overloadedRepIds: string[];
  underloadedRepIds: string[];
}

export interface RebalanceMove {
  accountId: string;
  fromRepId: string;
  toRepId: string;
  revenueDelta: number;
  projectedStdDev: number;
}

export interface RebalanceSuggestion {
  moves: RebalanceMove[];
  startingStdDev: number;
  projectedStdDev: number;
  improvementPct: number;
}

// ---------- capacity math ----------

function tenureMultiplier(months: number): number {
  if (months < 0) return 0;
  if (months < 3) return 0.5;
  if (months < 6) return 0.75;
  if (months < 12) return 0.9;
  return 1.0;
}

export function computeRepCapacity(rep: Rep, rules: TerritoryRules = {}): RepCapacity {
  const coverage = rules.pipelineCoverage ?? 4;
  const tm = tenureMultiplier(rep.tenureMonths);
  const effectiveQuota = Math.max(0, rep.quota) * clamp01(rep.ramp) * tm;
  const targetRevenuePotential = effectiveQuota * coverage;
  const avgDealSize = rep.avgDealSize > 0 ? rep.avgDealSize : 1;
  const derivedMax = Math.ceil(targetRevenuePotential / avgDealSize);
  const hardMax = rules.hardMaxAccounts ?? Infinity;
  const maxAccounts = Math.max(1, Math.min(derivedMax, hardMax));
  return { repId: rep.id, effectiveQuota, tenureMultiplier: tm, targetRevenuePotential, maxAccounts };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

// ---------- assignment ----------

interface RepRuntime {
  rep: Rep;
  capacity: RepCapacity;
  accounts: string[];
  revenue: number;
}

function fitScore(rep: Rep, account: AccountLoad, rules: TerritoryRules): number {
  let score = 1.0;
  if ((rules.respectSegment ?? true) && rep.segmentFit && rep.segmentFit.length > 0) {
    score *= rep.segmentFit.includes(account.tier) ? 1.5 : 0.7;
  }
  if ((rules.respectGeo ?? true) && rep.geo && rep.geo.length > 0 && account.geo) {
    score *= rep.geo.includes(account.geo) ? 1.25 : 0.5;
  }
  if (account.currentOwner === rep.id) score *= 1.1;
  return score;
}

function geoAllowed(rep: Rep, account: AccountLoad, rules: TerritoryRules): boolean {
  if (!(rules.respectGeo ?? true)) return true;
  if (!rep.geo || rep.geo.length === 0) return true;
  if (!account.geo) return true;
  return rep.geo.includes(account.geo);
}

export function assignTerritories(
  accounts: AccountLoad[],
  reps: Rep[],
  rules: TerritoryRules = {},
): TerritoryAssignment {
  const respectPinned = rules.respectPinned ?? true;
  const allowOverflow = rules.allowOverflow ?? true;

  const runtime: Record<string, RepRuntime> = {};
  for (const r of reps) {
    runtime[r.id] = {
      rep: r,
      capacity: computeRepCapacity(r, rules),
      accounts: [],
      revenue: 0,
    };
  }

  const byAccount: Record<string, string> = {};
  const unassigned: string[] = [];
  const accountIdx: Record<string, AccountLoad> = {};
  for (const a of accounts) accountIdx[a.accountId] = a;

  // 1) place pinned accounts first
  if (respectPinned) {
    for (const r of reps) {
      for (const pinId of r.namedAccountPins ?? []) {
        const acc = accountIdx[pinId];
        if (!acc || byAccount[pinId]) continue;
        runtime[r.id].accounts.push(pinId);
        runtime[r.id].revenue += acc.revenuePotential;
        byAccount[pinId] = r.id;
      }
    }
  }

  // 2) order remaining accounts by revenuePotential desc, then by id for determinism
  const remaining = accounts
    .filter((a) => !byAccount[a.accountId])
    .sort((a, b) => {
      if (b.revenuePotential !== a.revenuePotential) return b.revenuePotential - a.revenuePotential;
      return a.accountId.localeCompare(b.accountId);
    });

  for (const acc of remaining) {
    const candidates = reps
      .filter((r) => geoAllowed(r, acc, rules))
      .map((r) => ({ rep: r, rt: runtime[r.id] }));

    // utility: fit × remaining capacity ratio (so less-loaded reps are preferred)
    const scored = candidates
      .map(({ rep, rt }) => {
        const fit = fitScore(rep, acc, rules);
        const capLeft = rt.capacity.targetRevenuePotential - rt.revenue;
        const capRatio = rt.capacity.targetRevenuePotential > 0
          ? Math.max(0, capLeft) / rt.capacity.targetRevenuePotential
          : 0;
        const countRoom = rt.capacity.maxAccounts - rt.accounts.length;
        const countFeasible = countRoom > 0 ? 1 : allowOverflow ? 0.2 : 0;
        return { rep, rt, score: fit * (0.25 + capRatio) * countFeasible, capLeft, countRoom };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // tie-break by lowest current revenue then by id
        if (a.rt.revenue !== b.rt.revenue) return a.rt.revenue - b.rt.revenue;
        return a.rep.id.localeCompare(b.rep.id);
      });

    if (scored.length === 0) {
      if (allowOverflow && reps.length > 0) {
        // pick least-loaded rep regardless of geo
        const fallback = [...reps].sort((a, b) => runtime[a.id].revenue - runtime[b.id].revenue)[0];
        runtime[fallback.id].accounts.push(acc.accountId);
        runtime[fallback.id].revenue += acc.revenuePotential;
        byAccount[acc.accountId] = fallback.id;
      } else {
        unassigned.push(acc.accountId);
      }
      continue;
    }

    const winner = scored[0];
    winner.rt.accounts.push(acc.accountId);
    winner.rt.revenue += acc.revenuePotential;
    byAccount[acc.accountId] = winner.rep.id;
  }

  const byRep: Record<string, string[]> = {};
  for (const r of reps) {
    byRep[r.id] = [...runtime[r.id].accounts].sort();
  }

  return { byRep, byAccount, unassigned };
}

// ---------- balance report ----------

export function territoryBalanceReport(
  assignment: TerritoryAssignment,
  reps: Rep[],
  accounts: AccountLoad[],
  rules: TerritoryRules = {},
): TerritoryBalanceReport {
  const accIdx: Record<string, AccountLoad> = {};
  for (const a of accounts) accIdx[a.accountId] = a;

  const caps: Record<string, RepCapacity> = {};
  for (const r of reps) caps[r.id] = computeRepCapacity(r, rules);

  const perRep: RepLoad[] = reps.map((r) => {
    const ids = assignment.byRep[r.id] ?? [];
    const revenue = ids.reduce((sum, id) => sum + (accIdx[id]?.revenuePotential ?? 0), 0);
    const target = caps[r.id].targetRevenuePotential;
    const util = target > 0 ? revenue / target : 0;
    let status: RepStatus = "balanced";
    if (util > 1.2) status = "overloaded";
    else if (util < 0.8) status = "underloaded";
    return {
      repId: r.id,
      accountCount: ids.length,
      revenuePotential: revenue,
      utilizationPct: util,
      status,
    };
  });

  const revenues = perRep.map((p) => p.revenuePotential);
  const counts = perRep.map((p) => p.accountCount);
  const meanRevenue = mean(revenues);
  const meanCount = mean(counts);
  const sd = stdDev(revenues);
  const cov = meanRevenue > 0 ? sd / meanRevenue : 0;
  const g = gini(revenues);

  return {
    perRep,
    meanRevenuePotential: meanRevenue,
    meanAccountCount: meanCount,
    stdDevRevenue: sd,
    coefficientOfVariation: cov,
    gini: g,
    overloadedRepIds: perRep.filter((p) => p.status === "overloaded").map((p) => p.repId),
    underloadedRepIds: perRep.filter((p) => p.status === "underloaded").map((p) => p.repId),
  };
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stdDev(xs: number[]): number {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  const v = xs.reduce((sum, x) => sum + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(v);
}

function gini(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  if (sum <= 0) return 0;
  let cum = 0;
  for (let i = 0; i < n; i++) cum += (i + 1) * sorted[i];
  // Gini = (2·Σi·x_i) / (n · Σx_i) − (n + 1) / n
  return (2 * cum) / (n * sum) - (n + 1) / n;
}

// ---------- rebalance ----------

export function suggestRebalance(
  assignment: TerritoryAssignment,
  reps: Rep[],
  accounts: AccountLoad[],
  rules: TerritoryRules = {},
  maxMoves: number = 10,
): RebalanceSuggestion {
  const accIdx: Record<string, AccountLoad> = {};
  for (const a of accounts) accIdx[a.accountId] = a;

  // Working copy of assignment
  const byRep: Record<string, string[]> = {};
  for (const r of reps) byRep[r.id] = [...(assignment.byRep[r.id] ?? [])];

  const pinned = new Set<string>();
  if (rules.respectPinned ?? true) {
    for (const r of reps) for (const id of r.namedAccountPins ?? []) pinned.add(id);
  }

  const revenueOf = (rid: string) =>
    (byRep[rid] ?? []).reduce((s, id) => s + (accIdx[id]?.revenuePotential ?? 0), 0);

  const startingStdDev = stdDev(reps.map((r) => revenueOf(r.id)));
  const moves: RebalanceMove[] = [];
  let currentStd = startingStdDev;

  for (let step = 0; step < maxMoves; step++) {
    const revs = reps.map((r) => ({ id: r.id, rev: revenueOf(r.id) }));
    const sortedByRev = [...revs].sort((a, b) => b.rev - a.rev);
    const heaviest = sortedByRev[0];
    const lightest = sortedByRev[sortedByRev.length - 1];
    if (!heaviest || !lightest || heaviest.id === lightest.id) break;
    const gap = heaviest.rev - lightest.rev;
    if (gap <= 0) break;

    // Find an account on heaviest (not pinned) whose move to lightest reduces std dev the most.
    let bestMove: { accId: string; projected: number } | null = null;
    for (const accId of byRep[heaviest.id]) {
      if (pinned.has(accId)) continue;
      const acc = accIdx[accId];
      if (!acc) continue;
      const acctRev = acc.revenuePotential;
      // Simulate
      const simRevs = revs.map((r) => {
        if (r.id === heaviest.id) return { ...r, rev: r.rev - acctRev };
        if (r.id === lightest.id) return { ...r, rev: r.rev + acctRev };
        return r;
      });
      const sd = stdDev(simRevs.map((r) => r.rev));
      if (sd < currentStd - 1e-9 && (!bestMove || sd < bestMove.projected)) {
        bestMove = { accId, projected: sd };
      }
    }

    if (!bestMove) break;

    // Apply move
    const acc = accIdx[bestMove.accId];
    byRep[heaviest.id] = byRep[heaviest.id].filter((id) => id !== bestMove!.accId);
    byRep[lightest.id] = [...byRep[lightest.id], bestMove.accId];
    moves.push({
      accountId: bestMove.accId,
      fromRepId: heaviest.id,
      toRepId: lightest.id,
      revenueDelta: acc.revenuePotential,
      projectedStdDev: bestMove.projected,
    });
    currentStd = bestMove.projected;
  }

  const improvementPct = startingStdDev > 0 ? (startingStdDev - currentStd) / startingStdDev : 0;
  return {
    moves,
    startingStdDev,
    projectedStdDev: currentStd,
    improvementPct,
  };
}
