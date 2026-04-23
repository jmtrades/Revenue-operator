/**
 * Phase 18 — Send-time optimizer.
 */

import { describe, it, expect } from "vitest";
import {
  optimizeSendTime,
  nextSendSlot,
  INDUSTRY_SEND_PROFILES,
  type EngagementDatum,
} from "../src/lib/scheduling/send-time-optimizer";

describe("optimizeSendTime — generic default", () => {
  it("returns generic default when no data + no industry", () => {
    const hint = optimizeSendTime({ engagements: [] });
    expect(hint.source).toBe("generic_default");
    expect(hint.dayOfWeek).toBe(2); // Tuesday
    expect(hint.hourLocal).toBe(10);
  });
});

describe("optimizeSendTime — industry profile fallback", () => {
  it("uses industry profile when known", () => {
    const hint = optimizeSendTime({ engagements: [], industry: "fitness" });
    expect(hint.source).toBe("industry_profile");
    expect(INDUSTRY_SEND_PROFILES.fitness.bestDays).toContain(hint.dayOfWeek);
    expect(INDUSTRY_SEND_PROFILES.fitness.bestHoursLocal).toContain(hint.hourLocal);
  });

  it("falls through to generic when industry unknown", () => {
    const hint = optimizeSendTime({ engagements: [], industry: "completely_made_up" });
    expect(hint.source).toBe("generic_default");
  });

  it("has profiles for all Phase 13e packs", () => {
    for (const id of [
      "saas",
      "nonprofit",
      "catering",
      "childcare",
      "senior_care",
      "mental_health",
    ]) {
      expect(INDUSTRY_SEND_PROFILES[id]).toBeDefined();
    }
  });
});

describe("optimizeSendTime — lead history", () => {
  it("uses lead history when enough engagements present", () => {
    // 6 replies all Tuesday @ 10am Eastern (offset -300). UTC = 15:00.
    const engagements: EngagementDatum[] = [];
    const tuesdayRefs = [
      "2026-04-07T15:00:00Z", // Tue
      "2026-04-14T15:00:00Z", // Tue
      "2026-04-21T15:00:00Z", // Tue
      "2026-03-31T15:00:00Z", // Tue
      "2026-03-24T15:00:00Z", // Tue
      "2026-03-17T15:00:00Z", // Tue
    ];
    for (const at of tuesdayRefs) {
      engagements.push({ at, utcOffsetMinutes: -300, kind: "replied" });
    }
    const hint = optimizeSendTime({ engagements, utcOffsetMinutes: -300 });
    expect(hint.source).toBe("lead_history");
    expect(hint.dayOfWeek).toBe(2); // Tuesday
    expect(hint.hourLocal).toBe(10);
  });

  it("weighted by kind (reply > open > delivered)", () => {
    // Wednesday @ 14:00 local has a few replies → should beat Monday with lots of deliveries.
    const engagements: EngagementDatum[] = [];
    for (let i = 0; i < 4; i++) {
      engagements.push({
        at: `2026-03-${4 + i * 7}T19:00:00Z`, // Wed @ 14 ET
        utcOffsetMinutes: -300,
        kind: "replied",
      });
    }
    for (let i = 0; i < 10; i++) {
      engagements.push({
        at: `2026-03-${2 + i * 7}T14:00:00Z`, // Mon @ 9 ET
        utcOffsetMinutes: -300,
        kind: "delivered",
      });
    }
    const hint = optimizeSendTime({ engagements, utcOffsetMinutes: -300 });
    expect(hint.source).toBe("lead_history");
    // 4 * 3 = 12 > 10 * 1 = 10 — replies win.
    expect(hint.dayOfWeek).toBe(3); // Wednesday
  });

  it("falls back to industry profile with <6 engagements", () => {
    const engagements: EngagementDatum[] = [
      { at: "2026-03-03T15:00:00Z", utcOffsetMinutes: -300, kind: "replied" },
    ];
    const hint = optimizeSendTime({ engagements, industry: "saas" });
    expect(hint.source).toBe("industry_profile");
  });
});

describe("nextSendSlot", () => {
  it("schedules the next occurrence after fromIso", () => {
    // 2026-04-22 is a Wednesday. Ask for Thursday 15:00 UTC.
    const next = nextSendSlot(
      { dayOfWeek: 4, hourLocal: 11, hourUtc: 15, confidence: 0.5, source: "generic_default" },
      "2026-04-22T12:00:00Z",
    );
    const d = new Date(next);
    expect(d.getUTCDay()).toBe(4); // Thu
    expect(d.getUTCHours()).toBe(15);
    expect(d > new Date("2026-04-22T12:00:00Z")).toBe(true);
  });

  it("skips to next week if requested dow passed", () => {
    // 2026-04-22 Wed 12:00. Request Wed 10:00 → already passed, so +7 days.
    const next = nextSendSlot(
      { dayOfWeek: 3, hourLocal: 10, hourUtc: 10, confidence: 0.5, source: "generic_default" },
      "2026-04-22T12:00:00Z",
    );
    const d = new Date(next);
    expect(d.getUTCDay()).toBe(3);
    expect(d.toISOString()).toMatch(/2026-04-29/);
  });
});
