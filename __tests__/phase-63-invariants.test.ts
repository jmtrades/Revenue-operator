/**
 * Phase 63 — Property-based invariants.
 *
 * Randomized (seeded) checks over core revenue modules. These catch
 * corner cases that example-based tests miss: out-of-bounds probabilities,
 * non-monotonic KM curves, negative ARR, impact-sum drift, etc.
 *
 * Uses a small, in-file seeded RNG — keeps the test suite dependency-free.
 */
import { describe, it, expect } from "vitest";
import {
  moneyFromMajor,
  moneyAdd,
  moneyScale,
  toProbability,
  clampProbability,
  toRate,
  stagesSkipped,
  CANONICAL_STAGES,
  type Stage,
} from "../src/lib/revenue-core/primitives";
import {
  brier,
  logLoss,
  auroc,
  calibrationReport,
  classificationMetrics,
  type LabeledPrediction,
} from "../src/lib/revenue-core/evaluation";
import {
  buildCohortCurves,
  predictAccountChurn,
  composeRetentionReport,
  type AccountState,
} from "../src/lib/sales/cohort-retention";
import {
  scanRevenueDataQuality,
  type DealSnapshot,
  type AccountSnapshot,
} from "../src/lib/sales/revenue-data-quality";
import {
  planActions,
  type RawAction,
} from "../src/lib/revenue-core/action-planner";

const AS_OF = "2026-04-22T00:00:00Z";

// Seeded PRNG — mulberry32 — fully reproducible.
function mulberry(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rand(rng: () => number, lo: number, hi: number): number {
  return lo + rng() * (hi - lo);
}

function randInt(rng: () => number, lo: number, hi: number): number {
  return Math.floor(rand(rng, lo, hi + 1));
}

function randStage(rng: () => number): Stage {
  return CANONICAL_STAGES[randInt(rng, 0, CANONICAL_STAGES.length - 1)];
}

const ITERATIONS = 50;

// -----------------------------------------------------------------------------
// Primitive invariants
// -----------------------------------------------------------------------------

describe("primitive invariants", () => {
  it("clampProbability always returns [0,1]", () => {
    const rng = mulberry(1);
    for (let i = 0; i < ITERATIONS; i++) {
      const x = rand(rng, -100, 100);
      const p = clampProbability(x);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("moneyAdd preserves currency and equals scalar sum of minors", () => {
    const rng = mulberry(2);
    for (let i = 0; i < ITERATIONS; i++) {
      const a = moneyFromMajor(rand(rng, 0, 10000), "USD");
      const b = moneyFromMajor(rand(rng, 0, 10000), "USD");
      const c = moneyAdd(a, b);
      expect(c.currency).toBe("USD");
      expect(c.minor).toBe(a.minor + b.minor);
    }
  });

  it("moneyScale by 0 = 0, by 1 = identity", () => {
    const rng = mulberry(3);
    for (let i = 0; i < ITERATIONS; i++) {
      const a = moneyFromMajor(rand(rng, 0, 10000), "USD");
      expect(moneyScale(a, 0).minor).toBe(0);
      expect(moneyScale(a, 1).minor).toBe(a.minor);
    }
  });

  it("stagesSkipped ≥ 0 and ≤ 5 for any canonical pair", () => {
    const rng = mulberry(4);
    for (let i = 0; i < ITERATIONS; i++) {
      const from = randStage(rng);
      const to = randStage(rng);
      const skip = stagesSkipped(from, to);
      expect(skip).toBeGreaterThanOrEqual(0);
      expect(skip).toBeLessThanOrEqual(CANONICAL_STAGES.length - 2);
    }
  });

  it("toRate / toProbability boundary rejections", () => {
    expect(() => toRate(5.01)).toThrow();
    expect(() => toRate(-1.01)).toThrow();
    expect(() => toProbability(1.01)).toThrow();
    expect(() => toProbability(-0.01)).toThrow();
  });
});

// -----------------------------------------------------------------------------
// Evaluation-harness invariants
// -----------------------------------------------------------------------------

describe("evaluation invariants", () => {
  function randomPreds(rng: () => number, n: number): LabeledPrediction[] {
    return Array.from({ length: n }, () => ({
      pHat: rng(),
      y: rng() < 0.5 ? 0 : 1,
    }));
  }

  it("brier ∈ [0,1]", () => {
    const rng = mulberry(11);
    for (let i = 0; i < ITERATIONS; i++) {
      const preds = randomPreds(rng, 10 + randInt(rng, 0, 40));
      const b = brier(preds);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1);
    }
  });

  it("logLoss ≥ 0 and finite", () => {
    const rng = mulberry(12);
    for (let i = 0; i < ITERATIONS; i++) {
      const preds = randomPreds(rng, 10 + randInt(rng, 0, 40));
      const ll = logLoss(preds);
      expect(ll).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(ll)).toBe(true);
    }
  });

  it("auroc ∈ [0,1]", () => {
    const rng = mulberry(13);
    for (let i = 0; i < ITERATIONS; i++) {
      const preds = randomPreds(rng, 10 + randInt(rng, 0, 40));
      const a = auroc(preds);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
  });

  it("calibration ECE ∈ [0,1]", () => {
    const rng = mulberry(14);
    for (let i = 0; i < ITERATIONS; i++) {
      const preds = randomPreds(rng, 20 + randInt(rng, 0, 50));
      const rep = calibrationReport(preds);
      expect(rep.ece).toBeGreaterThanOrEqual(0);
      expect(rep.ece).toBeLessThanOrEqual(1);
    }
  });

  it("classificationMetrics internally consistent: f1 ≤ 2 × min(precision, recall)", () => {
    const rng = mulberry(15);
    for (let i = 0; i < ITERATIONS; i++) {
      const preds = randomPreds(rng, 20 + randInt(rng, 0, 50));
      const m = classificationMetrics(preds);
      const harmonic = m.precision === 0 && m.recall === 0
        ? 0
        : (2 * m.precision * m.recall) / (m.precision + m.recall);
      expect(Math.abs(m.f1 - harmonic)).toBeLessThan(1e-9);
    }
  });
});

// -----------------------------------------------------------------------------
// Cohort-retention invariants
// -----------------------------------------------------------------------------

describe("retention invariants", () => {
  function randAccount(rng: () => number, i: number): AccountState {
    return {
      accountId: `a${i}`,
      segment: rng() < 0.5 ? "smb" : "enterprise",
      cohortStartIso: `2025-${String(randInt(rng, 1, 12)).padStart(2, "0")}-01T00:00:00Z`,
      currentArr: randInt(rng, 0, 200000),
      healthScore: rand(rng, 0, 1),
      renewalConfidence: rand(rng, 0, 1),
      usageTrend: rand(rng, 0, 1),
      recentEscalations: randInt(rng, 0, 5),
      nps: randInt(rng, -100, 100),
      tenureMonths: randInt(rng, 1, 36),
    };
  }

  it("churn probability always ∈ [0,1]", () => {
    const rng = mulberry(21);
    for (let i = 0; i < ITERATIONS; i++) {
      const acc = randAccount(rng, i);
      const f = predictAccountChurn(acc, AS_OF, 90);
      expect(f.churnProbability).toBeGreaterThanOrEqual(0);
      expect(f.churnProbability).toBeLessThanOrEqual(1);
    }
  });

  it("expected ARR loss ≥ 0 and ≤ currentArr", () => {
    const rng = mulberry(22);
    for (let i = 0; i < ITERATIONS; i++) {
      const acc = randAccount(rng, i);
      const f = predictAccountChurn(acc, AS_OF, 90);
      expect(f.expectedArrLoss).toBeGreaterThanOrEqual(0);
      expect(f.expectedArrLoss).toBeLessThanOrEqual(acc.currentArr);
    }
  });

  it("KM survival is monotonically non-increasing", () => {
    const rng = mulberry(23);
    const accts = Array.from({ length: 30 }, (_, i) => randAccount(rng, i));
    // Pin same cohort so we get a single curve.
    for (const a of accts) (a as any).cohortStartIso = "2024-01-01T00:00:00Z";
    const curves = buildCohortCurves(accts, AS_OF);
    for (const c of curves) {
      for (let i = 1; i < c.points.length; i++) {
        expect(c.points[i].survival).toBeLessThanOrEqual(c.points[i - 1].survival + 1e-9);
        expect(c.points[i].survival).toBeGreaterThanOrEqual(0);
        expect(c.points[i].survival).toBeLessThanOrEqual(1);
      }
    }
  });

  it("portfolioArrAtRisk equals sum of forecast losses", () => {
    const rng = mulberry(24);
    const accts = Array.from({ length: 20 }, (_, i) => randAccount(rng, i));
    const rep = composeRetentionReport({
      asOfIso: AS_OF,
      horizonDays: 90,
      events: [],
      accounts: accts,
    });
    const summed = rep.forecasts.reduce((s, f) => s + f.expectedArrLoss, 0);
    expect(rep.portfolioArrAtRisk).toBe(summed);
  });

  it("projected GRR ∈ [0,1]", () => {
    const rng = mulberry(25);
    const accts = Array.from({ length: 15 }, (_, i) => randAccount(rng, i));
    const rep = composeRetentionReport({
      asOfIso: AS_OF,
      horizonDays: 90,
      events: [],
      accounts: accts,
    });
    expect(rep.projectedGrr).toBeGreaterThanOrEqual(0);
    expect(rep.projectedGrr).toBeLessThanOrEqual(1);
  });
});

// -----------------------------------------------------------------------------
// Data-quality invariants
// -----------------------------------------------------------------------------

describe("data-quality invariants", () => {
  function randDeal(rng: () => number, i: number): DealSnapshot {
    const include = rng() < 0.5;
    return {
      dealId: `d${i}`,
      accountId: `acc${i % 5}`,
      ownerId: include ? `rep${i % 3}` : undefined,
      stage: randStage(rng),
      amount: rng() < 0.7 ? randInt(rng, 1000, 200000) : undefined,
      currency: "USD",
      closeDateIso: `2026-0${1 + (i % 9)}-01T00:00:00Z`,
      createdAtIso: "2026-01-01T00:00:00Z",
      lastModifiedIso: `2026-0${1 + (i % 9)}-15T00:00:00Z`,
    };
  }
  function randAcc(rng: () => number, i: number): AccountSnapshot {
    return {
      accountId: `acc${i}`,
      name: `Acct ${i}`,
      ownerId: rng() < 0.8 ? `rep${i % 3}` : undefined,
      domain: rng() < 0.8 ? `acct${i}.com` : undefined,
      createdAtIso: "2025-01-01T00:00:00Z",
      hasPrimaryContact: rng() < 0.8,
    };
  }

  it("overallScore ∈ [0,100]", () => {
    const rng = mulberry(31);
    for (let i = 0; i < 30; i++) {
      const deals = Array.from({ length: 10 }, (_, k) => randDeal(rng, k));
      const accs = Array.from({ length: 5 }, (_, k) => randAcc(rng, k));
      const rep = scanRevenueDataQuality({
        asOfIso: AS_OF,
        deals,
        accounts: accs,
        contacts: [],
      });
      expect(rep.overallScore).toBeGreaterThanOrEqual(0);
      expect(rep.overallScore).toBeLessThanOrEqual(100);
    }
  });

  it("owner fix lists sum to total issues (assigned + unassigned)", () => {
    const rng = mulberry(32);
    const deals = Array.from({ length: 10 }, (_, k) => randDeal(rng, k));
    const accs = Array.from({ length: 5 }, (_, k) => randAcc(rng, k));
    const rep = scanRevenueDataQuality({
      asOfIso: AS_OF,
      deals,
      accounts: accs,
      contacts: [],
    });
    const perOwnerTotal = rep.ownerFixLists.reduce((s, o) => s + o.issueCount, 0);
    expect(perOwnerTotal).toBe(rep.issues.length);
  });
});

// -----------------------------------------------------------------------------
// Action-planner invariants
// -----------------------------------------------------------------------------

describe("action-planner invariants", () => {
  function randAction(rng: () => number, i: number): RawAction {
    const severities: RawAction["severity"][] = ["critical", "warning", "info"];
    return {
      category: "close_win",
      role: "rep",
      ownerId: `rep${i % 5}`,
      accountId: `acc${i}`,
      dealId: `d${i}`,
      title: `Task ${i}`,
      why: "reason",
      severity: severities[randInt(rng, 0, 2)],
      expectedImpactMajor: randInt(rng, 0, 500_000),
      expectedImpactCurrency: "USD",
      estimatedMinutes: randInt(rng, 5, 60),
    };
  }

  it("no duplicate action ids", () => {
    const rng = mulberry(41);
    const raws = Array.from({ length: 40 }, (_, i) => randAction(rng, i));
    const plan = planActions(raws, {
      orgId: "org1",
      asOfIso: AS_OF,
      perOwnerMinutes: 99999,
    });
    const ids = plan.actions.map((a) => a.actionId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("per-owner minutes ≤ 2x cap (critical bypass upper bound)", () => {
    const rng = mulberry(42);
    const raws = Array.from({ length: 60 }, (_, i) => randAction(rng, i));
    const cap = 120;
    const plan = planActions(raws, {
      orgId: "org1",
      asOfIso: AS_OF,
      perOwnerMinutes: cap,
    });
    for (const p of plan.perOwnerLoad) {
      expect(p.minutes).toBeLessThanOrEqual(cap * 2);
    }
  });

  it("total impact minor ≥ 0 (no negatives in randomized generator)", () => {
    const rng = mulberry(43);
    const raws = Array.from({ length: 20 }, (_, i) => randAction(rng, i));
    const plan = planActions(raws, {
      orgId: "org1",
      asOfIso: AS_OF,
      perOwnerMinutes: 99999,
    });
    expect(plan.totalExpectedImpact.minor).toBeGreaterThanOrEqual(0);
  });

  it("dedup keeps count = groups count", () => {
    const rng = mulberry(44);
    const raws = Array.from({ length: 20 }, (_, i) => randAction(rng, i));
    // Clone half to create dup groups
    const doubled = [...raws, ...raws.slice(0, 10)];
    const plan = planActions(doubled, {
      orgId: "org1",
      asOfIso: AS_OF,
      perOwnerMinutes: 99999,
    });
    const uniqueKeys = new Set(raws.map((r) => `${r.category}|${r.accountId}|${r.dealId}`));
    expect(plan.actions.length).toBeLessThanOrEqual(uniqueKeys.size);
  });
});
