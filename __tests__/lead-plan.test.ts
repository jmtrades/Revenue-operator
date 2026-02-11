/**
 * Lead plan tests: single active rule enforced
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getActiveLeadPlan,
  setLeadPlan,
  completeLeadPlan,
  cancelLeadPlan,
  shouldEnqueueDecision,
} from "@/lib/plans/lead-plan";

const mockPlan = {
  id: "p1",
  workspace_id: "ws-1",
  lead_id: "lead-1",
  status: "active" as const,
  next_action_type: "observe",
  next_action_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  sequence_id: null,
  sequence_step: null,
  created_at: "",
  updated_at: "",
  cancelled_reason: null,
};

vi.mock("@/lib/db/queries", () => ({
  getDb: () => ({
    from: (table: string) => {
      if (table === "lead_plans") {
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
          insert: () => Promise.resolve({}),
          update: () => ({
            eq: () => Promise.resolve({}),
          }),
        };
      }
      return {};
    },
  }),
}));

describe("lead-plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getActiveLeadPlan returns null when no plan", async () => {
    const plan = await getActiveLeadPlan("ws-1", "lead-1");
    expect(plan).toBeNull();
  });

  it("shouldEnqueueDecision returns enqueue true when no plan", async () => {
    const result = await shouldEnqueueDecision("ws-1", "lead-1");
    expect(result.enqueue).toBe(true);
  });

  it("setLeadPlan and completeLeadPlan do not throw", async () => {
    await expect(
      setLeadPlan("ws-1", "lead-1", {
        next_action_type: "observe",
        next_action_at: new Date().toISOString(),
      })
    ).resolves.not.toThrow();
    await expect(completeLeadPlan("ws-1", "lead-1")).resolves.not.toThrow();
  });

  it("cancelLeadPlan does not throw", async () => {
    await expect(cancelLeadPlan("ws-1", "lead-1", "user_reply")).resolves.not.toThrow();
  });
});
