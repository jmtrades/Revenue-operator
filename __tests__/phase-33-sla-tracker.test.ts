/**
 * Phase 33 — SLA response-time tracker.
 */

import { describe, it, expect } from "vitest";
import {
  evaluateSla,
  summarizeSla,
  defaultBusinessHours,
  DEFAULT_SLA_TARGETS,
  type InboundLead,
  type SlaTargets,
} from "../src/lib/sales/sla-tracker";

const TARGETS: SlaTargets = { ...DEFAULT_SLA_TARGETS, respectBusinessHours: false };
const BH = defaultBusinessHours("America/New_York");

function leadOf(over: Partial<InboundLead> = {}): InboundLead {
  return {
    id: "lead-1",
    source: "demo_request",
    receivedAt: "2026-04-22T13:00:00.000Z", // 9am NY
    ...over,
  };
}

describe("evaluateSla — wall clock (respectBusinessHours off)", () => {
  it("on_track when inside target window", () => {
    const e = evaluateSla(leadOf(), TARGETS, BH, "2026-04-22T13:02:00.000Z");
    expect(e.status).toBe("on_track");
    expect(e.breached).toBe(false);
    expect(e.remainingMinutes).toBeCloseTo(3, 1);
  });

  it("at_risk when in last 25% of window", () => {
    // Target=5, elapsed=4, remaining=1 < 1.25 → at_risk
    const e = evaluateSla(leadOf(), TARGETS, BH, "2026-04-22T13:04:00.000Z");
    expect(e.status).toBe("at_risk");
  });

  it("breached when past target", () => {
    const e = evaluateSla(leadOf(), TARGETS, BH, "2026-04-22T13:10:00.000Z");
    expect(e.status).toBe("breached");
    expect(e.breached).toBe(true);
    expect(e.remainingMinutes).toBeLessThan(0);
  });
});

describe("evaluateSla — responded leads", () => {
  it("resolved_on_time when answered within window", () => {
    const e = evaluateSla(
      leadOf({ firstResponseAt: "2026-04-22T13:03:00.000Z" }),
      TARGETS,
      BH,
      "2026-04-22T14:00:00.000Z",
    );
    expect(e.status).toBe("resolved_on_time");
    expect(e.responseMinutes).toBeCloseTo(3, 1);
  });

  it("resolved_late when answered after breach", () => {
    const e = evaluateSla(
      leadOf({ firstResponseAt: "2026-04-22T13:20:00.000Z" }),
      TARGETS,
      BH,
      "2026-04-22T14:00:00.000Z",
    );
    expect(e.status).toBe("resolved_late");
    expect(e.responseMinutes).toBeCloseTo(20, 1);
  });
});

describe("evaluateSla — escalation ladder", () => {
  it("notify_owner at 1× target", () => {
    const e = evaluateSla(leadOf(), TARGETS, BH, "2026-04-22T13:06:00.000Z");
    expect(e.escalation).toBe("notify_owner");
  });

  it("notify_manager at 2× target", () => {
    const e = evaluateSla(leadOf(), TARGETS, BH, "2026-04-22T13:11:00.000Z");
    expect(e.escalation).toBe("notify_manager");
  });

  it("notify_vp at 4× target", () => {
    const e = evaluateSla(leadOf(), TARGETS, BH, "2026-04-22T13:21:00.000Z");
    expect(e.escalation).toBe("notify_vp");
  });

  it("no escalation after response", () => {
    const e = evaluateSla(
      leadOf({ firstResponseAt: "2026-04-22T13:20:00.000Z" }),
      TARGETS,
      BH,
      "2026-04-22T13:30:00.000Z",
    );
    expect(e.escalation).toBe("none");
  });
});

describe("evaluateSla — targets by source", () => {
  it("chatbot has 2-minute target", () => {
    const e = evaluateSla(leadOf({ source: "chatbot" }), TARGETS, BH, "2026-04-22T13:00:30.000Z");
    expect(e.targetMinutes).toBe(2);
  });

  it("content_download has 60-minute target", () => {
    const e = evaluateSla(leadOf({ source: "content_download" }), TARGETS, BH, "2026-04-22T13:30:00.000Z");
    expect(e.targetMinutes).toBe(60);
    expect(e.status).toBe("on_track");
  });

  it("VIP priority overrides source target", () => {
    const e = evaluateSla(
      leadOf({ source: "cold_inbound", priority: "vip" }),
      TARGETS,
      BH,
      "2026-04-22T13:03:00.000Z",
    );
    expect(e.targetMinutes).toBe(2); // vipMinutes, not cold_inbound (120)
    expect(e.status).toBe("breached");
  });
});

describe("evaluateSla — business-hours pausing", () => {
  it("does not accrue SLA time over a weekend", () => {
    // Received Fri 6pm NY (past close), check Mon 10am NY — should have only Mon 9-10am = 60min.
    const fridayEvening = "2026-04-17T22:00:00.000Z"; // Fri 6pm NY
    const mondayMorning = "2026-04-20T14:00:00.000Z"; // Mon 10am NY
    const bhTargets: SlaTargets = { ...DEFAULT_SLA_TARGETS, respectBusinessHours: true, defaultMinutes: 10000 };
    const e = evaluateSla(
      { id: "x", source: "other", receivedAt: fridayEvening },
      bhTargets,
      BH,
      mondayMorning,
    );
    // Only Mon 9-10am counts = ~60 min (allow small variance for tz-minute stepping)
    expect(e.elapsedMinutes).toBeGreaterThan(50);
    expect(e.elapsedMinutes).toBeLessThan(75);
  });
});

describe("summarizeSla", () => {
  it("empty input returns sane defaults", () => {
    const s = summarizeSla([]);
    expect(s.total).toBe(0);
    expect(s.onTimeRate).toBe(1);
  });

  it("aggregates on-time rate and breach count", () => {
    const evals = [
      evaluateSla(leadOf({ id: "a", firstResponseAt: "2026-04-22T13:03:00.000Z" }), TARGETS, BH, "2026-04-22T14:00:00.000Z"),
      evaluateSla(leadOf({ id: "b", firstResponseAt: "2026-04-22T13:20:00.000Z" }), TARGETS, BH, "2026-04-22T14:00:00.000Z"),
      evaluateSla(leadOf({ id: "c" }), TARGETS, BH, "2026-04-22T14:00:00.000Z"),
    ];
    const s = summarizeSla(evals);
    expect(s.total).toBe(3);
    expect(s.onTimeRate).toBeCloseTo(0.5, 2); // 1 on-time out of 2 responded
    expect(s.breachedCount).toBe(2); // b resolved_late + c breached
    expect(s.averageResponseMinutes).not.toBeNull();
    expect(s.p90ResponseMinutes).not.toBeNull();
  });
});
