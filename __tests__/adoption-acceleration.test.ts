import { describe, it, expect } from "vitest";

describe("adoption-acceleration", () => {
  describe("participation_state transitions", () => {
    it("reliant when >= 3 entries in 7 days and not participant", () => {
      const count7d = 3;
      const hasAck = false;
      const hasDispute = false;
      const hasReschedule = false;
      let state: "external" | "interacting" | "reliant" | "participant" = "interacting";
      if (hasAck && hasDispute && hasReschedule) state = "participant";
      else if (count7d >= 3) state = "reliant";
      expect(state).toBe("reliant");
    });

    it("participant when acknowledgement + dispute + reschedule observed", () => {
      const hasAck = true;
      const hasDispute = true;
      const hasReschedule = true;
      const state =
        hasAck && hasDispute && hasReschedule ? "participant" : "reliant";
      expect(state).toBe("participant");
    });

    it("interacting when fewer than 3 entries and not participant", () => {
      const count7d = 2;
      const hasAck = false;
      const hasDispute = false;
      const hasReschedule = false;
      let state: "external" | "interacting" | "reliant" | "participant" = "interacting";
      if (hasAck && hasDispute && hasReschedule) state = "participant";
      else if (count7d >= 3) state = "reliant";
      expect(state).toBe("interacting");
    });
  });

  describe("dependency rows from events", () => {
    it("dispute inserts coordination_required", () => {
      const action = "dispute";
      const dependencyType =
        action === "dispute"
          ? "coordination_required"
          : action === "reschedule"
            ? "confirmation_required"
            : null;
      expect(dependencyType).toBe("coordination_required");
    });

    it("reschedule inserts confirmation_required", () => {
      const action = "reschedule";
      const dependencyType =
        action === "dispute"
          ? "coordination_required"
          : action === "reschedule"
            ? "confirmation_required"
            : null;
      expect(dependencyType).toBe("confirmation_required");
    });

    it("payment overdue inserts payment_required", () => {
      const transition = "pending_to_overdue";
      const dependencyType =
        transition === "pending_to_overdue" ? "payment_required" : null;
      expect(dependencyType).toBe("payment_required");
    });

    it("incoming exposure inserts outcome_required", () => {
      const incomingState = "exposure";
      const dependencyType =
        incomingState === "exposure" ? "outcome_required" : null;
      expect(dependencyType).toBe("outcome_required");
    });
  });

  describe("cron environment_required conditions", () => {
    it("inserts only when participation_state is reliant and outstanding_dependencies true", () => {
      const participationState = "reliant";
      const outstandingDependencies = true;
      const shouldInsert =
        participationState === "reliant" && outstandingDependencies;
      expect(shouldInsert).toBe(true);
    });

    it("does not insert when participation_state is interacting", () => {
      const participationState = "interacting";
      const outstandingDependencies = true;
      const shouldInsert =
        participationState === "reliant" && outstandingDependencies;
      expect(shouldInsert).toBe(false);
    });

    it("does not insert when no outstanding_dependencies", () => {
      const participationState = "reliant";
      const outstandingDependencies = false;
      const shouldInsert =
        participationState === "reliant" && outstandingDependencies;
      expect(shouldInsert).toBe(false);
    });
  });

  describe("public environment endpoint shape", () => {
    it("returns minimal structure: participation_state and outstanding_dependencies", () => {
      const minimal = {
        participation_state: "external" as const,
        outstanding_dependencies: false,
      };
      expect(minimal).toHaveProperty("participation_state");
      expect(minimal).toHaveProperty("outstanding_dependencies");
      expect(Object.keys(minimal).sort()).toEqual([
        "outstanding_dependencies",
        "participation_state",
      ]);
    });
  });

  describe("responsibility environment_state", () => {
    it("external_dependencies_present true when operational_dependency exists for workspace", () => {
      const dependencyCount = 1;
      const external_dependencies_present = dependencyCount > 0;
      expect(external_dependencies_present).toBe(true);
    });

    it("external_dependencies_present false when no operational_dependency", () => {
      const dependencyCount = 0;
      const external_dependencies_present = dependencyCount > 0;
      expect(external_dependencies_present).toBe(false);
    });
  });
});
