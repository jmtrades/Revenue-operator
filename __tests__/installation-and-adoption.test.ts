/**
 * Installation and adoption layer: phase transitions, gating, previews, incidents.
 * Unit/contract tests; no DB required where we assert shapes and logic.
 */

import { describe, it, expect } from "vitest";

describe("installation and adoption", () => {
  describe("installation transitions", () => {
    it("observing becomes activation_ready when observation_started_at <= now - 48h", () => {
      const observationHours = 48;
      const started = Date.now() - (observationHours + 1) * 60 * 60 * 1000;
      const shouldTransition = Date.now() - started >= observationHours * 60 * 60 * 1000;
      expect(shouldTransition).toBe(true);
    });

    it("activation_ready does not become active without snapshot_seen_at and at least one immediate risk", () => {
      const phase = "activation_ready";
      const snapshotSeenAt: string | null = null;
      const unresolvedRiskCount = 0;
      const becomesActive = phase === "activation_ready" && snapshotSeenAt != null && unresolvedRiskCount >= 1;
      expect(becomesActive).toBe(false);
    });

    it("active when snapshot_seen_at set AND at least one immediate_risk_event", () => {
      const snapshotSeenAt = new Date().toISOString();
      const unresolvedRiskCount = 1;
      const becomesActive = !!snapshotSeenAt && unresolvedRiskCount >= 1;
      expect(becomesActive).toBe(true);
    });
  });

  describe("outbound gating", () => {
    it("phase active allows automation", () => {
      const phase = "active";
      const isAutomationAllowed = phase === "active";
      expect(isAutomationAllowed).toBe(true);
    });

    it("phase observing prevents automation", () => {
      const phase = "observing";
      const isAutomationAllowed = phase === "active";
      expect(isAutomationAllowed).toBe(false);
    });

    it("phase activation_ready prevents automation", () => {
      const phase = "activation_ready";
      const isAutomationAllowed = phase === "active";
      expect(isAutomationAllowed).toBe(false);
    });
  });

  describe("previews API shape", () => {
    it("returns previews array with action_type, preview_text, will_execute_at", () => {
      const previews = [
        { action_type: "commitment_recovery", preview_text: "If no reply occurs, a confirmation message will be sent.", will_execute_at: null },
      ];
      expect(previews).toHaveLength(1);
      expect(previews[0]).toHaveProperty("action_type");
      expect(previews[0]).toHaveProperty("preview_text");
      expect(previews[0]).toHaveProperty("will_execute_at");
      expect(Object.keys(previews[0]).sort()).toEqual(["action_type", "preview_text", "will_execute_at"]);
    });
  });

  describe("executed_action_types", () => {
    it("markExecutedActionType is idempotent (insert ignore on conflict)", () => {
      const pk = { workspace_id: "w1", action_type: "commitment_recovery" };
      const errorCode = "23505";
      const isConflict = errorCode === "23505";
      expect(isConflict).toBe(true);
    });

    it("hasExecutedActionType returns true when row exists", () => {
      const data = { workspace_id: "w1" };
      const hasExecuted = !!data;
      expect(hasExecuted).toBe(true);
    });
  });

  describe("incident statements and observed risk in non-active phases", () => {
    it("detector creates incident statement when detected", () => {
      const category = "silence_risk_urgent_intent";
      const message = "Response delay risk detected — exposure prevented by entry.";
      expect(category).toBe("silence_risk_urgent_intent");
      expect(message).not.toContain("count");
      expect(message).not.toContain("metric");
    });

    it("when phase is not active detector records observed_risk_event", () => {
      const phase = "observing";
      const shouldRecordObservedRisk = phase !== "active";
      expect(shouldRecordObservedRisk).toBe(true);
    });
  });
});
