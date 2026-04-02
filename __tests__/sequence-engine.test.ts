/**
 * Sequence engine: starts, advances, stops on reply
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { chooseSequence, stopSequence } from "@/lib/sequences/engine";

const mockStateVector: import("@/lib/engines/perception").DealStateVector = {
  lead_id: "lead-1",
  workspace_id: "ws-1",
  state: "ENGAGED",
  opt_out: false,
  is_vip: false,
  company: null,
  readiness: 50,
  warmth: 40,
  engagement_decay_hours: 48,
  deal_probability: 0,
  attendance_probability: 0,
  silence_risk: 0,
  recovery_probability: 0,
  deal_id: null,
  next_session_at: null,
  last_activity_at: null,
  no_reply_scheduled_at: null,
  signal_breakdown: {},
  risk_factors: [],
  computed_at: new Date().toISOString(),
};

vi.mock("@/lib/db/queries", () => ({
  getDb: () => ({
    from: (table: string) => {
      if (table === "follow_up_sequences") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  single: () => Promise.resolve({ data: null }),
                }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: "seq-1", name: "Default followup", purpose: "followup", steps: [] },
                }),
            }),
          }),
        };
      }
      if (table === "sequence_runs") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: null }),
                }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => Promise.resolve({}),
            }),
          }),
        };
      }
      if (table === "lead_plans") {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }) }) }),
          insert: () => Promise.resolve({}),
          update: () => ({ eq: () => Promise.resolve({}) }),
        };
      }
      return {};
    },
  }),
}));

vi.mock("@/lib/plans/lead-plan", () => ({
  setLeadPlan: vi.fn().mockResolvedValue(undefined),
  cancelLeadPlan: vi.fn().mockResolvedValue(undefined),
}));

describe("sequence engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("chooseSequence returns sequence for followup purpose", async () => {
    const seq = await chooseSequence(mockStateVector, {});
    expect(seq).toBeDefined();
    expect(seq.purpose).toBe("followup");
    expect(Array.isArray(seq.steps)).toBe(true);
  });

  it("stopSequence does not throw", async () => {
    await expect(stopSequence("ws-1", "lead-1", "user_reply")).resolves.not.toThrow();
  });
});
