/**
 * Assurance delivery: when skipped, logs assurance_skipped with reason (no PII).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLog = vi.fn();
vi.mock("@/lib/runtime/log", () => ({ log: (...args: unknown[]) => mockLog(...args) }));

vi.mock("@/lib/confidence-engine", () => ({ getConfidencePhase: () => Promise.resolve("active") }));
vi.mock("@/lib/installation", () => ({ getInstallationState: () => Promise.resolve({ phase: "assisted" }) }));

vi.mock("@/lib/db/queries", () => ({
  getDb: () => ({
    from: (table: string) => {
      if (table === "proof_capsules") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }),
            }),
          }),
        };
      }
      if (table === "assurance_delivery_state") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) };
    },
  }),
}));

describe("assurance delivery skip logging", () => {
  beforeEach(() => {
    mockLog.mockClear();
  });

  it("when no proof line for today, deliverDailyAssuranceIfDue returns false and logs no_line", async () => {
    const { deliverDailyAssuranceIfDue } = await import("@/lib/assurance-delivery");
    const result = await deliverDailyAssuranceIfDue("ws-1");
    expect(result).toBe(false);
    expect(mockLog).toHaveBeenCalledWith("assurance_skipped", { workspace_id: "ws-1", reason: "no_line" });
  });
});
