/**
 * Readiness explainability: drivers, counterfactuals, evidence_chain
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/queries", () => {
  const emptyData = { data: [] };
  const leadData = { state: "ENGAGED", last_activity_at: new Date().toISOString(), created_at: new Date().toISOString(), opt_out: false };
  const convData = { id: "conv1" };
  const _orderLimit = () => ({ data: [] });
  const limitOne = (table: string) => ({
    single: () => (table === "leads" ? { data: leadData, error: null } : table === "conversations" ? { data: convData, error: null } : { data: null, error: null }),
    maybeSingle: () => (table === "conversations" ? { data: convData, error: null } : { data: null, error: null }),
  });
  return {
    getDb: () => ({
      from: (table: string) => ({
        select: () => ({
          eq: (_col: string) => ({
            eq: (_c2: string) => ({
              single: () => (table === "leads" ? { data: leadData, error: null } : { data: null, error: null }),
              order: () => ({ limit: () => emptyData }),
              limit: (n: number) => (n === 1 ? limitOne(table) : emptyData),
            }),
            single: () => (table === "leads" ? { data: leadData, error: null } : { data: null, error: null }),
            order: () => ({ limit: () => emptyData }),
            gte: () => emptyData,
            limit: (n: number) => (n === 1 ? limitOne(table) : emptyData),
          }),
        }),
      }),
    }),
  };
});

vi.mock("@/lib/momentum/warmth", () => ({ getWarmthScores: () => Promise.resolve({}) }));
vi.mock("@/lib/intelligence/deal-prediction", () => ({ predictDealOutcome: () => Promise.resolve({ probability: 0.5 }) }));

describe("Readiness Evidence", () => {
  it("ReadinessResult includes readiness_drivers, counterfactuals, evidence_chain", async () => {
    const { computeReadiness } = await import("@/lib/readiness/engine");
    const result = await computeReadiness("ws1", "lead1", null);
    expect(result).toHaveProperty("readiness_drivers");
    expect(result).toHaveProperty("counterfactuals");
    expect(result).toHaveProperty("evidence_chain");
    expect(Array.isArray(result.readiness_drivers)).toBe(true);
    expect(Array.isArray(result.counterfactuals)).toBe(true);
    expect(Array.isArray(result.evidence_chain)).toBe(true);
  });

  it("readiness_drivers have factor, contribution, evidence_ids", async () => {
    const { computeReadiness } = await import("@/lib/readiness/engine");
    const result = await computeReadiness("ws1", "lead1", null);
    for (const d of result.readiness_drivers) {
      expect(d).toHaveProperty("factor");
      expect(d).toHaveProperty("contribution");
      expect(d).toHaveProperty("evidence_ids");
      expect(Array.isArray(d.evidence_ids)).toBe(true);
    }
  });

  it("counterfactuals have if, then_score, why", async () => {
    const { computeReadiness } = await import("@/lib/readiness/engine");
    const result = await computeReadiness("ws1", "lead1", null);
    for (const c of result.counterfactuals) {
      expect(c).toHaveProperty("if");
      expect(c).toHaveProperty("then_score");
      expect(c).toHaveProperty("why");
    }
  });
});
