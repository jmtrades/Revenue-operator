/**
 * Cooldown tests: prevents thrash (same lead, same type within window)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  canInterveneNow,
  recordIntervention,
  interventionToCooldownCategory,
  hashMessage,
} from "@/lib/stability/cooldowns";

vi.mock("@/lib/db/queries", () => ({
  getDb: () => ({
    from: (table: string) => {
      if (table === "lead_intervention_limits") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: null,
                  }),
              }),
            }),
          }),
          insert: () => Promise.resolve({}),
          update: () => ({
            eq: () => ({
              eq: () => Promise.resolve({}),
            }),
          }),
        };
      }
      if (table === "settings") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    cooldown_by_type_hours: { reassurance: 6, clarify: 12, urgency: 24, schedule: 12, confirm: 6, revive: 24 },
                    max_touches_per_day_by_stage: { NEW: 2, ENGAGED: 3 },
                  },
                }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }) };
    },
  }),
}));

describe("cooldowns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps intervention types to cooldown categories", () => {
    expect(interventionToCooldownCategory("reminder")).toBe("confirm");
    expect(interventionToCooldownCategory("booking")).toBe("schedule");
    expect(interventionToCooldownCategory("recovery")).toBe("revive");
    expect(interventionToCooldownCategory("clarifying_question")).toBe("clarify");
    expect(interventionToCooldownCategory("follow_up")).toBe("urgency");
  });

  it("hashMessage returns deterministic hash", () => {
    const h1 = hashMessage("Hello world");
    const h2 = hashMessage("Hello world");
    expect(h1).toBe(h2);
    expect(typeof h1).toBe("string");
    expect(hashMessage("Different")).not.toBe(h1);
  });

  it("canInterveneNow returns allowed when no limits row", async () => {
    const result = await canInterveneNow("ws-1", "lead-1", "follow_up", "ENGAGED");
    expect(result.allowed).toBe(true);
  });

  it("recordIntervention does not throw", async () => {
    await expect(recordIntervention("ws-1", "lead-1", "follow_up", "abc123")).resolves.not.toThrow();
  });
});
