/**
 * Adaptive Follow-Up + Recovery Profile Integration Tests
 *
 * Tests that recovery profiles properly influence:
 * 1. Strategy selection (selectAdaptiveStrategy)
 * 2. Delay timing adjustments (buildAdaptiveFollowUpPlan)
 * 3. Backward compatibility (no profile = standard behavior)
 */

import { describe, it, expect } from "vitest";
import {
  selectAdaptiveStrategy,
  buildAdaptiveFollowUpPlan,
  type AdaptiveStrategy,
} from "@/lib/intelligence/adaptive-followup";
import type { LeadIntelligence } from "@/lib/intelligence/lead-brain";
import type { RecoveryProfile } from "@/lib/recovery-profile";

const createMockIntelligence = (overrides: Partial<LeadIntelligence> = {}): LeadIntelligence => ({
  lead_id: "lead-123",
  workspace_id: "ws-123",
  risk_flags: [],
  lifecycle_phase: "QUALIFY",
  conversion_probability: 0.5,
  urgency_score: 50,
  action_confidence: 0.7,
  ...overrides,
});

describe("Recovery Profile Integration", () => {
  describe("selectAdaptiveStrategy", () => {
    it("without profile: hot lead returns aggressive_nurture", () => {
      const intel = createMockIntelligence({
        conversion_probability: 0.8,
        urgency_score: 70,
      });
      const strategy = selectAdaptiveStrategy(intel);
      expect(strategy).toBe("aggressive_nurture");
    });

    it("with conservative profile: hot lead returns gentle_nurture", () => {
      const intel = createMockIntelligence({
        conversion_probability: 0.8,
        urgency_score: 70,
      });
      const strategy = selectAdaptiveStrategy(intel, "conservative");
      expect(strategy).toBe("gentle_nurture");
    });

    it("with assertive profile: hot lead returns aggressive_nurture", () => {
      const intel = createMockIntelligence({
        conversion_probability: 0.8,
        urgency_score: 70,
      });
      const strategy = selectAdaptiveStrategy(intel, "assertive");
      expect(strategy).toBe("aggressive_nurture");
    });

    it("with standard profile: hot lead returns aggressive_nurture (default)", () => {
      const intel = createMockIntelligence({
        conversion_probability: 0.8,
        urgency_score: 70,
      });
      const strategy = selectAdaptiveStrategy(intel, "standard");
      expect(strategy).toBe("aggressive_nurture");
    });

    it("with conservative profile: warm lead only proceeds if > 0.6 prob", () => {
      const intelLow = createMockIntelligence({
        conversion_probability: 0.5,
        urgency_score: 40,
      });
      const strategyLow = selectAdaptiveStrategy(intelLow, "conservative");
      expect(strategyLow).toBe("value_drip");

      const intelHigh = createMockIntelligence({
        conversion_probability: 0.65,
        urgency_score: 40,
      });
      const strategyHigh = selectAdaptiveStrategy(intelHigh, "conservative");
      expect(strategyHigh).toBe("gentle_nurture");
    });

    it("opt_out_signal always returns pause regardless of profile", () => {
      const intel = createMockIntelligence({
        risk_flags: ["opt_out_signal"],
        conversion_probability: 0.9,
        urgency_score: 100,
      });

      expect(selectAdaptiveStrategy(intel, "conservative")).toBe("pause");
      expect(selectAdaptiveStrategy(intel, "assertive")).toBe("pause");
      expect(selectAdaptiveStrategy(intel)).toBe("pause");
    });

    it("anger flag always returns escalation_prep regardless of profile", () => {
      const intel = createMockIntelligence({
        risk_flags: ["anger"],
        conversion_probability: 0.9,
      });

      expect(selectAdaptiveStrategy(intel, "conservative")).toBe("escalation_prep");
      expect(selectAdaptiveStrategy(intel, "assertive")).toBe("escalation_prep");
      expect(selectAdaptiveStrategy(intel)).toBe("escalation_prep");
    });
  });

  describe("buildAdaptiveFollowUpPlan", () => {
    describe("delay multipliers", () => {
      it("conservative profile: delays are multiplied by 1.5x", () => {
        const intel = createMockIntelligence({
          conversion_probability: 0.8,
          urgency_score: 70,
        });
        const plan = buildAdaptiveFollowUpPlan("aggressive_nurture", intel, "conservative");

        // Base delays for aggressive_nurture: 60, 240, 1440, 2880
        // With conservative (1.5x): 90, 360, 2160, 4320
        expect(plan.steps[1].delay_minutes).toBe(Math.round(60 * 1.5)); // 90
        expect(plan.steps[2].delay_minutes).toBe(Math.round(240 * 1.5)); // 360
        expect(plan.steps[3].delay_minutes).toBe(Math.round(1440 * 1.5)); // 2160
        expect(plan.steps[4].delay_minutes).toBe(Math.round(2880 * 1.5)); // 4320
        expect(plan.cooldown_hours).toBe(Math.round(24 * 1.5)); // 36
      });

      it("assertive profile: delays are multiplied by 0.7x", () => {
        const intel = createMockIntelligence({
          conversion_probability: 0.8,
          urgency_score: 70,
        });
        const plan = buildAdaptiveFollowUpPlan("aggressive_nurture", intel, "assertive");

        // Base delays for aggressive_nurture: 60, 240, 1440, 2880
        // With assertive (0.7x): 42, 168, 1008, 2016
        expect(plan.steps[1].delay_minutes).toBe(Math.round(60 * 0.7)); // 42
        expect(plan.steps[2].delay_minutes).toBe(Math.round(240 * 0.7)); // 168
        expect(plan.steps[3].delay_minutes).toBe(Math.round(1440 * 0.7)); // 1008
        expect(plan.steps[4].delay_minutes).toBe(Math.round(2880 * 0.7)); // 2016
        expect(plan.cooldown_hours).toBe(Math.round(24 * 0.7)); // 17
      });

      it("standard/no profile: delays unchanged (1.0x multiplier)", () => {
        const intel = createMockIntelligence({
          conversion_probability: 0.8,
          urgency_score: 70,
        });
        const planStandard = buildAdaptiveFollowUpPlan("aggressive_nurture", intel, "standard");
        const planNoProfile = buildAdaptiveFollowUpPlan("aggressive_nurture", intel);

        // Both should have identical delays
        expect(planStandard.steps[1].delay_minutes).toBe(60);
        expect(planNoProfile.steps[1].delay_minutes).toBe(60);
        expect(planStandard.cooldown_hours).toBe(24);
        expect(planNoProfile.cooldown_hours).toBe(24);
      });
    });

    describe("all strategies apply delays consistently", () => {
      const strategies: AdaptiveStrategy[] = [
        "aggressive_nurture",
        "gentle_nurture",
        "value_drip",
        "reactivation_sequence",
        "appointment_protect",
        "win_back",
        "retention_loop",
      ];

      const intel = createMockIntelligence();

      strategies.forEach((strategy) => {
        it(`${strategy}: conservative delays > standard delays`, () => {
          const conservativePlan = buildAdaptiveFollowUpPlan(strategy, intel, "conservative");
          const standardPlan = buildAdaptiveFollowUpPlan(strategy, intel, "standard");

          conservativePlan.steps.forEach((step, idx) => {
            const standardStep = standardPlan.steps[idx];
            // Skip hardcoded timing steps (e.g., appointment_protect's 1h_before condition)
            if (
              step.delay_minutes > 0 &&
              standardStep?.delay_minutes > 0 &&
              !step.condition
            ) {
              expect(step.delay_minutes).toBe(
                Math.round(standardStep.delay_minutes * 1.5),
                `Step ${idx} in ${strategy}`
              );
            }
          });
          // Appointment_protect has hardcoded cooldown_hours: 1 (not multiplied)
          if (strategy !== "appointment_protect") {
            expect(conservativePlan.cooldown_hours).toBe(
              Math.round(standardPlan.cooldown_hours * 1.5)
            );
          }
        });

        it(`${strategy}: assertive delays < standard delays`, () => {
          const assertivePlan = buildAdaptiveFollowUpPlan(strategy, intel, "assertive");
          const standardPlan = buildAdaptiveFollowUpPlan(strategy, intel, "standard");

          assertivePlan.steps.forEach((step, idx) => {
            const standardStep = standardPlan.steps[idx];
            // Skip hardcoded timing steps (e.g., appointment_protect's 1h_before condition)
            if (
              step.delay_minutes > 0 &&
              standardStep?.delay_minutes > 0 &&
              !step.condition
            ) {
              expect(step.delay_minutes).toBe(
                Math.round(standardStep.delay_minutes * 0.7),
                `Step ${idx} in ${strategy}`
              );
            }
          });
          // Appointment_protect has hardcoded cooldown_hours: 1 (not multiplied)
          if (strategy !== "appointment_protect") {
            expect(assertivePlan.cooldown_hours).toBe(
              Math.round(standardPlan.cooldown_hours * 0.7)
            );
          }
        });
      });
    });

    it("pause strategy: no delays regardless of profile", () => {
      const intel = createMockIntelligence();
      const pausePlan = buildAdaptiveFollowUpPlan("pause", intel, "assertive");

      expect(pausePlan.steps).toHaveLength(0);
      expect(pausePlan.max_touches).toBe(0);
      expect(pausePlan.cooldown_hours).toBe(0);
    });
  });

  describe("backward compatibility", () => {
    it("selectAdaptiveStrategy works without recovery profile parameter", () => {
      const intel = createMockIntelligence({
        conversion_probability: 0.75,
        urgency_score: 65,
      });
      // Should work with old signature (no recovery profile)
      const strategy = selectAdaptiveStrategy(intel);
      expect(strategy).toBeDefined();
      expect(typeof strategy).toBe("string");
    });

    it("buildAdaptiveFollowUpPlan works without recovery profile parameter", () => {
      const intel = createMockIntelligence();
      // Should work with old signature (no recovery profile)
      const plan = buildAdaptiveFollowUpPlan("gentle_nurture", intel);
      expect(plan).toBeDefined();
      expect(plan.steps).toHaveLength(3);
    });
  });

  describe("realistic scenarios", () => {
    it("Conservative SaaS B2B with high-intent lead: scales back to gentle", () => {
      const intel = createMockIntelligence({
        conversion_probability: 0.75,
        urgency_score: 65,
        lifecycle_phase: "QUALIFY",
      });

      // Even hot lead becomes gentle in conservative mode
      const strategy = selectAdaptiveStrategy(intel, "conservative");
      expect(strategy).toBe("gentle_nurture");

      const plan = buildAdaptiveFollowUpPlan(strategy, intel, "conservative");
      // Delays are stretched: 1440 * 1.5 = 2160 minutes (36 hours)
      expect(plan.steps[1].delay_minutes).toBe(2160);
      expect(plan.cooldown_hours).toBe(72); // 48 * 1.5
    });

    it("Assertive sales team with warm lead: faster cadence", () => {
      const intel = createMockIntelligence({
        conversion_probability: 0.55,
        urgency_score: 45,
      });

      const strategy = selectAdaptiveStrategy(intel, "assertive");
      expect(strategy).toBe("gentle_nurture");

      const plan = buildAdaptiveFollowUpPlan(strategy, intel, "assertive");
      // Delays compressed: 1440 * 0.7 = 1008 minutes (16.8 hours)
      expect(plan.steps[1].delay_minutes).toBe(Math.round(1440 * 0.7));
      expect(plan.cooldown_hours).toBe(Math.round(48 * 0.7)); // 33.6 -> 34 hours
    });

    it("Standard profile: unchanged behavior from baseline", () => {
      const intel = createMockIntelligence({
        conversion_probability: 0.6,
        urgency_score: 50,
      });

      const strategyWithProfile = selectAdaptiveStrategy(intel, "standard");
      const strategyWithoutProfile = selectAdaptiveStrategy(intel);
      expect(strategyWithProfile).toBe(strategyWithoutProfile);

      const planWithProfile = buildAdaptiveFollowUpPlan("gentle_nurture", intel, "standard");
      const planWithoutProfile = buildAdaptiveFollowUpPlan("gentle_nurture", intel);
      planWithProfile.steps.forEach((step, idx) => {
        expect(step.delay_minutes).toBe(planWithoutProfile.steps[idx].delay_minutes);
      });
    });
  });
});
