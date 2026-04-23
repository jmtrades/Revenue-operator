/**
 * Phase 65 — Observability, model versioning, reproducibility.
 */
import { describe, it, expect } from "vitest";
import {
  ModelRegistry,
  LatencyHistogram,
  CostMeter,
  seededRng,
  tagged,
} from "../src/lib/revenue-core/observability";

const FROZEN = "2026-04-22T00:00:00Z";

describe("ModelRegistry", () => {
  it("register and get by name@semver", () => {
    const reg = new ModelRegistry<{ a: number }>();
    const snap = reg.register({
      name: "churn",
      semver: "1.0.0",
      weights: { a: 1 },
      frozenAtIso: FROZEN,
    });
    expect(snap.version.name).toBe("churn");
    expect(reg.get("churn@1.0.0").version.weightHash).toBe(snap.version.weightHash);
  });

  it("weight hash changes when weights change", () => {
    const reg = new ModelRegistry<{ a: number }>();
    const a = reg.register({
      name: "m",
      semver: "1.0.0",
      weights: { a: 1 },
      frozenAtIso: FROZEN,
    });
    const reg2 = new ModelRegistry<{ a: number }>();
    const b = reg2.register({
      name: "m",
      semver: "1.0.0",
      weights: { a: 2 },
      frozenAtIso: FROZEN,
    });
    expect(a.version.weightHash).not.toBe(b.version.weightHash);
  });

  it("re-registering same key with same weights returns existing", () => {
    const reg = new ModelRegistry<{ a: number }>();
    const a = reg.register({
      name: "m",
      semver: "1.0.0",
      weights: { a: 1 },
      frozenAtIso: FROZEN,
    });
    const b = reg.register({
      name: "m",
      semver: "1.0.0",
      weights: { a: 1 },
      frozenAtIso: FROZEN,
    });
    expect(a).toBe(b);
    expect(reg.list().length).toBe(1);
  });

  it("re-registering with different weights throws", () => {
    const reg = new ModelRegistry<{ a: number }>();
    reg.register({
      name: "m",
      semver: "1.0.0",
      weights: { a: 1 },
      frozenAtIso: FROZEN,
    });
    expect(() =>
      reg.register({
        name: "m",
        semver: "1.0.0",
        weights: { a: 99 },
        frozenAtIso: FROZEN,
      }),
    ).toThrow(/different weights/);
  });

  it("default snapshot is first registered unless overridden", () => {
    const reg = new ModelRegistry<{ a: number }>();
    reg.register({ name: "m", semver: "1.0.0", weights: { a: 1 }, frozenAtIso: FROZEN });
    reg.register({ name: "m", semver: "1.1.0", weights: { a: 2 }, frozenAtIso: FROZEN });
    expect(reg.getDefault().version.semver).toBe("1.0.0");
    reg.register({
      name: "m",
      semver: "1.2.0",
      weights: { a: 3 },
      frozenAtIso: FROZEN,
      setAsDefault: true,
    });
    expect(reg.getDefault().version.semver).toBe("1.2.0");
  });

  it("weights are frozen", () => {
    const reg = new ModelRegistry<{ a: number }>();
    const snap = reg.register({
      name: "m",
      semver: "1.0.0",
      weights: { a: 1 },
      frozenAtIso: FROZEN,
    });
    expect(Object.isFrozen(snap.weights)).toBe(true);
  });

  it("getDefault throws before any register", () => {
    const reg = new ModelRegistry<{ a: number }>();
    expect(() => reg.getDefault()).toThrow();
  });
});

describe("LatencyHistogram", () => {
  it("empty snapshot has zero count", () => {
    const h = new LatencyHistogram();
    expect(h.snapshot().count).toBe(0);
  });

  it("records and computes percentiles", () => {
    const h = new LatencyHistogram();
    for (let i = 1; i <= 100; i++) h.record(i);
    const s = h.snapshot();
    expect(s.count).toBe(100);
    expect(s.p50Ms).toBeGreaterThan(0);
    expect(s.p95Ms).toBeGreaterThanOrEqual(s.p50Ms);
    expect(s.p99Ms).toBeGreaterThanOrEqual(s.p95Ms);
    expect(s.maxMs).toBe(100);
  });

  it("rejects non-finite / negative", () => {
    const h = new LatencyHistogram();
    h.record(-1);
    h.record(NaN);
    expect(h.snapshot().count).toBe(0);
  });

  it("very large values land in overflow bucket", () => {
    const h = new LatencyHistogram();
    h.record(500_000);
    const s = h.snapshot();
    expect(s.count).toBe(1);
    expect(s.maxMs).toBe(500_000);
  });
});

describe("CostMeter", () => {
  it("aggregates totals correctly", () => {
    const m = new CostMeter();
    m.record({ op: "churn_score", unit: "call", quantity: 100, unitCostUsd: 0.001 });
    m.record({ op: "pricing", unit: "call", quantity: 50, unitCostUsd: 0.002 });
    expect(m.totalUsd()).toBeCloseTo(0.1 + 0.1, 6);
  });

  it("byOp sorts by cost desc", () => {
    const m = new CostMeter();
    m.record({ op: "a", unit: "call", quantity: 1, unitCostUsd: 1 });
    m.record({ op: "b", unit: "call", quantity: 100, unitCostUsd: 1 });
    m.record({ op: "a", unit: "call", quantity: 10, unitCostUsd: 1 });
    const by = m.byOp();
    expect(by[0].op).toBe("b");
    expect(by[0].usd).toBe(100);
    expect(by[1].op).toBe("a");
    expect(by[1].usd).toBe(11);
  });

  it("rejects negative / non-finite", () => {
    const m = new CostMeter();
    m.record({ op: "x", unit: "call", quantity: -1, unitCostUsd: 0.1 });
    m.record({ op: "x", unit: "call", quantity: NaN, unitCostUsd: 0.1 });
    m.record({ op: "x", unit: "call", quantity: 1, unitCostUsd: Infinity });
    expect(m.lineCount()).toBe(0);
  });
});

describe("seededRng", () => {
  it("same seed produces same sequence", () => {
    const a = seededRng(42);
    const b = seededRng(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });

  it("string seed also deterministic", () => {
    const a = seededRng("v1.0.0");
    const b = seededRng("v1.0.0");
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });

  it("different seeds diverge", () => {
    const a = seededRng(1);
    const b = seededRng(2);
    let matches = 0;
    for (let i = 0; i < 20; i++) if (a() === b()) matches++;
    expect(matches).toBeLessThan(20);
  });

  it("output ∈ [0,1)", () => {
    const rng = seededRng(123);
    for (let i = 0; i < 100; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe("tagged", () => {
  it("wraps value with frozen envelope", () => {
    const reg = new ModelRegistry<{ a: number }>();
    const snap = reg.register({
      name: "m",
      semver: "1.0.0",
      weights: { a: 1 },
      frozenAtIso: FROZEN,
    });
    const t = tagged({
      value: { score: 0.7 },
      modelVersion: snap.version,
      producedAtIso: FROZEN,
      latencyMs: 12,
      seed: "s1",
    });
    expect(Object.isFrozen(t)).toBe(true);
    expect(t.value.score).toBe(0.7);
    expect(t.modelVersion.semver).toBe("1.0.0");
    expect(t.latencyMs).toBe(12);
    expect(t.seed).toBe("s1");
  });

  it("latencyMs / seed optional", () => {
    const reg = new ModelRegistry<{ a: number }>();
    const snap = reg.register({
      name: "m",
      semver: "1.0.0",
      weights: { a: 1 },
      frozenAtIso: FROZEN,
    });
    const t = tagged({
      value: 1,
      modelVersion: snap.version,
      producedAtIso: FROZEN,
    });
    expect(t.latencyMs).toBeNull();
    expect(t.seed).toBeNull();
  });
});
