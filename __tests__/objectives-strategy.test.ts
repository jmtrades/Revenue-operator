/**
 * Objectives & Strategy: falling behind → aggressive, ahead → conservative,
 * decision/sequence behavior changes with strategy state.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  planWorkspaceStrategy,
  getSequenceDelayMultiplier,
  type WorkspaceStrategyState,
} from "@/lib/strategy/planner";
import { decideIntervention } from "@/lib/engines/decision";
import { advanceSequence } from "@/lib/sequences/engine";

const mockStateVector: import("@/lib/engines/perception").DealStateVector = {
  lead_id: "lead-1",
  workspace_id: "ws-1",
  state: "REACTIVATE",
  opt_out: false,
  is_vip: false,
  company: null,
  readiness: 50,
  warmth: 40,
  engagement_decay_hours: 96,
  deal_probability: 0,
  attendance_probability: 0,
  silence_risk: 0,
  recovery_probability: 0.7,
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
      if (table === "workspace_strategy_state") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null }),
            }),
          }),
          insert: () => Promise.resolve({}),
          update: () => ({
            eq: () => Promise.resolve({}),
          }),
        };
      }
      if (table === "workspaces") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { status: "active", created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() } }),
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
                    vip_rules: null,
                    business_hours: { start: "09:00", end: "18:00" },
                    min_confidence_to_act: 0.6,
                  },
                }),
            }),
          }),
        };
      }
      if (table === "leads") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { metadata: null } }),
              }),
            }),
          }),
        };
      }
      if (table === "conversations") {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: { channel: "web" } }),
              }),
            }),
          }),
        };
      }
      if (table === "outbound_messages") {
        const countRes = Promise.resolve({ count: 0 });
        return {
          select: (cols: unknown, opts?: unknown) => {
            const isCount = opts && typeof opts === "object" && "count" in (opts as Record<string, unknown>);
            return {
              eq: (col: string) => {
                if (col === "workspace_id") {
                  return {
                    eq: () => ({ gte: () => countRes }),
                    gte: () => countRes,
                  };
                }
                if (col === "lead_id") {
                  if (isCount) return countRes;
                  return {
                    order: () => ({ limit: () => Promise.resolve({ data: [] }) }),
                    not: () => ({
                      order: () => ({
                        limit: () => ({
                          single: () => Promise.resolve({ data: null }),
                        }),
                      }),
                    }),
                  };
                }
                return {};
              },
            };
          },
        };
      }
      if (table === "deals") {
        return {
          select: () => ({
            eq: () => ({
              neq: () => ({
                limit: () => ({
                  single: () => Promise.resolve({ data: null }),
                }),
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
                  single: () =>
                    Promise.resolve({
                      data: { sequence_id: "seq-1", current_step: 1 },
                    }),
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
      if (table === "follow_up_sequences") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    steps: [
                      { step: 1, delay_hours: 24, intervention_type: "revive", template_key: "revival_1", stop_on_reply: true },
                      { step: 2, delay_hours: 72, intervention_type: "revive", template_key: "revival_2", stop_on_reply: true },
                    ],
                  },
                }),
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
      return {
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }),
        insert: () => Promise.resolve({}),
        update: () => ({ eq: () => Promise.resolve({}) }),
      };
    },
  }),
}));

vi.mock("@/lib/autonomy", () => ({
  isRampComplete: vi.fn().mockResolvedValue(true),
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/autopilot", () => ({
  isWithinBusinessHours: vi.fn().mockReturnValue(true),
  passesCooldownLadder: vi.fn().mockReturnValue(true),
  passesStageLimit: vi.fn().mockReturnValue(true),
  mergeSettings: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/channels/capabilities", () => ({
  canSend: vi.fn().mockResolvedValue(true),
  getFallbackChannel: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/warmup", () => ({
  getWarmupLimit: vi.fn().mockReturnValue(Number.POSITIVE_INFINITY),
}));

vi.mock("@/lib/plans/lead-plan", () => ({
  setLeadPlan: vi.fn().mockResolvedValue(undefined),
}));

describe("objectives & strategy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSequenceDelayMultiplier", () => {
    it("aggressive multiplies delay by 0.6", () => {
      expect(getSequenceDelayMultiplier("aggressive")).toBe(0.6);
    });

    it("conservative multiplies delay by 1.4", () => {
      expect(getSequenceDelayMultiplier("conservative")).toBe(1.4);
    });

    it("balanced uses 1.0", () => {
      expect(getSequenceDelayMultiplier("balanced")).toBe(1);
    });
  });

  describe("planWorkspaceStrategy", () => {
    it("falling behind increases aggressiveness", async () => {
      const strategy = await planWorkspaceStrategy("ws-1", "behind");
      expect(strategy.aggressiveness_level).toBe("aggressive");
      expect(strategy.recovery_priority).toBe("high");
      expect(strategy.followup_intensity).toBe("heavy");
      expect(strategy.reason).toContain("Behind");
    });

    it("getting ahead reduces outreach (conservative)", async () => {
      const strategy = await planWorkspaceStrategy("ws-1", "ahead");
      expect(strategy.aggressiveness_level).toBe("conservative");
      expect(strategy.recovery_priority).toBe("low");
      expect(strategy.followup_intensity).toBe("light");
      expect(strategy.reason).toContain("Ahead");
    });

    it("on_track uses balanced", async () => {
      const strategy = await planWorkspaceStrategy("ws-1", "on_track");
      expect(strategy.aggressiveness_level).toBe("balanced");
      expect(strategy.recovery_priority).toBe("normal");
      expect(strategy.followup_intensity).toBe("standard");
    });
  });

  describe("decision output with strategy state", () => {
    it("aggressive strategy lowers recovery confidence threshold", async () => {
      const aggressive: WorkspaceStrategyState = {
        workspace_id: "ws-1",
        aggressiveness_level: "aggressive",
        recovery_priority: "high",
        followup_intensity: "heavy",
        last_changed_at: new Date().toISOString(),
        reason: null,
      };
      const decision = await decideIntervention("ws-1", "lead-1", mockStateVector, aggressive);
      expect(decision.intervene).toBe(true);
      expect(decision.intervention_type).toBe("win_back");
      expect(decision.confidence).toBe(0.65);
    });

    it("conservative strategy raises act threshold and may use follow_up for recovery", async () => {
      const conservative: WorkspaceStrategyState = {
        workspace_id: "ws-1",
        aggressiveness_level: "conservative",
        recovery_priority: "low",
        followup_intensity: "light",
        last_changed_at: new Date().toISOString(),
        reason: null,
      };
      const decision = await decideIntervention("ws-1", "lead-1", mockStateVector, conservative);
      expect(decision.intervene).toBe(true);
      expect(decision.intervention_type).toBe("follow_up");
      expect(decision.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it("balanced strategy uses default recovery confidence", async () => {
      const balanced: WorkspaceStrategyState = {
        workspace_id: "ws-1",
        aggressiveness_level: "balanced",
        recovery_priority: "normal",
        followup_intensity: "standard",
        last_changed_at: new Date().toISOString(),
        reason: null,
      };
      const decision = await decideIntervention("ws-1", "lead-1", mockStateVector, balanced);
      expect(decision.intervene).toBe(true);
      expect(decision.intervention_type).toBe("win_back");
      expect(decision.confidence).toBe(0.75);
    });
  });

  describe("sequence adaptation", () => {
    it("advanceSequence applies aggressive delay multiplier (shorter than balanced)", async () => {
      const aggressive: WorkspaceStrategyState = {
        workspace_id: "ws-1",
        aggressiveness_level: "aggressive",
        recovery_priority: "high",
        followup_intensity: "heavy",
        last_changed_at: new Date().toISOString(),
        reason: null,
      };
      const result = await advanceSequence("ws-1", "lead-1", aggressive);
      expect(result.advanced).toBe(true);
      expect(result.nextStep).toBeDefined();
      expect(result.nextActionAt).toBeDefined();
      const nextAt = new Date(result.nextActionAt!);
      const hoursFromNow = (nextAt.getTime() - Date.now()) / (60 * 60 * 1000);
      expect(hoursFromNow).toBeGreaterThanOrEqual(40);
      expect(hoursFromNow).toBeLessThan(50);
    });

    it("advanceSequence applies conservative delay multiplier (longer than balanced)", async () => {
      const conservative: WorkspaceStrategyState = {
        workspace_id: "ws-1",
        aggressiveness_level: "conservative",
        recovery_priority: "low",
        followup_intensity: "light",
        last_changed_at: new Date().toISOString(),
        reason: null,
      };
      const result = await advanceSequence("ws-1", "lead-1", conservative);
      expect(result.advanced).toBe(true);
      expect(result.nextStep).toBeDefined();
      const nextAt = new Date(result.nextActionAt!);
      const hoursFromNow = (nextAt.getTime() - Date.now()) / (60 * 60 * 1000);
      expect(hoursFromNow).toBeGreaterThanOrEqual(98);
    });
  });
});
