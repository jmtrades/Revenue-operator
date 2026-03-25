/**
 * Recovery profile: timings are deterministic per profile.
 */

import { describe, it, expect } from "vitest";
import { getRecoveryTimings } from "@/lib/recovery-profile";

describe("Recovery profile", () => {
  it("conservative timings", () => {
    const t = getRecoveryTimings("conservative");
    expect(t.stalledHours).toBe(18);
    expect(t.lostHours).toBe(72);
    expect(t.maxReviveAttempts).toBe(2);
    expect(t.paymentSpacingHours).toBe(24);
    expect(t.commitmentReminderHours).toBe(24);
  });

  it("standard timings", () => {
    const t = getRecoveryTimings("standard");
    expect(t.stalledHours).toBe(12);
    expect(t.lostHours).toBe(60);
    expect(t.maxReviveAttempts).toBe(3);
    expect(t.paymentSpacingHours).toBe(12);
    expect(t.commitmentReminderHours).toBe(12);
  });

  it("assertive timings", () => {
    const t = getRecoveryTimings("assertive");
    expect(t.stalledHours).toBe(6);
    expect(t.lostHours).toBe(36);
    expect(t.maxReviveAttempts).toBe(4);
    expect(t.paymentSpacingHours).toBe(8);
    expect(t.commitmentReminderHours).toBe(6);
  });

  it("profile affects scheduling deterministically", () => {
    const conservative = getRecoveryTimings("conservative");
    const assertive = getRecoveryTimings("assertive");
    expect(assertive.stalledHours).toBeLessThan(conservative.stalledHours);
    expect(assertive.paymentSpacingHours).toBeLessThan(conservative.paymentSpacingHours);
  });
});
