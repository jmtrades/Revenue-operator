/**
 * Assert: revenue state provides transition_toward_risk_at for scheduling.
 * Decision pipeline uses this for observe/recheck—no fixed intervals when available.
 */

import { describe, it, expect } from "vitest";
import { computeRevenueState } from "@/lib/revenue-state";

describe("revenue state transition_toward_risk_at", () => {
  it("returns transition_toward_risk_at for ENGAGED lead with decay", () => {
    const result = computeRevenueState({
      lead_id: "l1",
      workspace_id: "w1",
      state: "ENGAGED",
      opt_out: false,
      is_vip: false,
      company: null,
      readiness: 60,
      warmth: 50,
      engagement_decay_hours: 36,
      deal_probability: 0.6,
      attendance_probability: 0,
      silence_risk: 0.2,
      recovery_probability: 0,
      deal_id: null,
      next_session_at: null,
      last_activity_at: null,
      no_reply_scheduled_at: null,
      signal_breakdown: {},
      risk_factors: [],
      computed_at: new Date().toISOString(),
    });
    expect(result.state).toBe("REVENUE_INCOMING");
    expect(result.transition_toward_risk_at).toBeTruthy();
    expect(typeof result.transition_toward_risk_at).toBe("string");
    const ts = new Date(result.transition_toward_risk_at!).getTime();
    expect(ts).toBeGreaterThan(Date.now());
  });

  it("returns null transition for REVENUE_LOST", () => {
    const result = computeRevenueState({
      lead_id: "l1",
      workspace_id: "w1",
      state: "LOST",
      opt_out: false,
      is_vip: false,
      company: null,
      readiness: 0,
      warmth: 0,
      engagement_decay_hours: 200,
      deal_probability: 0,
      attendance_probability: 0,
      silence_risk: 1,
      recovery_probability: 0,
      deal_id: null,
      next_session_at: null,
      last_activity_at: null,
      no_reply_scheduled_at: null,
      signal_breakdown: {},
      risk_factors: ["Deal lost"],
      computed_at: new Date().toISOString(),
    });
    expect(result.state).toBe("REVENUE_LOST");
    expect(result.transition_toward_risk_at).toBeNull();
  });
});
