/**
 * Phase 19 — Multi-channel cadence engine.
 */

import { describe, it, expect } from "vitest";
import {
  buildCadencePlan,
  type CadenceTemplate,
  type LeadState,
  type WorkspaceScheduling,
} from "../src/lib/scheduling/cadence-engine";

const baseLead = (): LeadState => ({
  leadId: "lead-1",
  hasOptedOutEmail: false,
  hasOptedOutSms: false,
  hasOptedOutCall: false,
  hasReplied: false,
  hasBookedMeeting: false,
  minutesSinceLastEmail: null,
  minutesSinceLastSms: null,
  minutesSinceLastCall: null,
});

const baseWs = (): WorkspaceScheduling => ({
  utcOffsetMinutes: -300, // US Eastern ST (not DST)
  businessHoursLocal: [9, 17],
  skipWeekends: true,
  skipUsHolidays: true,
  channelGapMinutes: { email: 60 * 24, sms: 60 * 12, call: 60 * 48 },
});

const basicTemplate: CadenceTemplate = {
  id: "t1",
  name: "Basic 3-step",
  steps: [
    { channel: "email", offsetMinutes: 0, templateId: "em1", subject: "Hi" },
    { channel: "sms", offsetMinutes: 60 * 24, templateId: "sms1" },
    { channel: "call", offsetMinutes: 60 * 24 * 2, templateId: "call1" },
  ],
};

describe("buildCadencePlan — happy path", () => {
  it("schedules all 3 steps when no opt-outs", () => {
    const plan = buildCadencePlan({
      template: basicTemplate,
      lead: baseLead(),
      workspace: baseWs(),
      startAt: "2026-04-22T14:00:00Z", // Wed 10am ET
    });
    expect(plan.touches.length).toBe(3);
    expect(plan.touches[0].channel).toBe("email");
    expect(plan.touches[1].channel).toBe("sms");
    expect(plan.touches[2].channel).toBe("call");
  });

  it("schedules each step forward from startAt", () => {
    const plan = buildCadencePlan({
      template: basicTemplate,
      lead: baseLead(),
      workspace: baseWs(),
      startAt: "2026-04-22T14:00:00Z",
    });
    const t0 = new Date(plan.touches[0].scheduledAt).getTime();
    const t1 = new Date(plan.touches[1].scheduledAt).getTime();
    expect(t1).toBeGreaterThan(t0);
  });
});

describe("buildCadencePlan — opt-outs", () => {
  it("skips email when opted out", () => {
    const lead = { ...baseLead(), hasOptedOutEmail: true };
    const plan = buildCadencePlan({
      template: basicTemplate,
      lead,
      workspace: baseWs(),
      startAt: "2026-04-22T14:00:00Z",
    });
    expect(plan.touches.some((t) => t.channel === "email")).toBe(false);
    expect(plan.touches.some((t) => t.channel === "sms")).toBe(true);
  });

  it("skips sms when opted out", () => {
    const lead = { ...baseLead(), hasOptedOutSms: true };
    const plan = buildCadencePlan({
      template: basicTemplate,
      lead,
      workspace: baseWs(),
      startAt: "2026-04-22T14:00:00Z",
    });
    expect(plan.touches.some((t) => t.channel === "sms")).toBe(false);
  });

  it("skips call when opted out of calls", () => {
    const lead = { ...baseLead(), hasOptedOutCall: true };
    const plan = buildCadencePlan({
      template: basicTemplate,
      lead,
      workspace: baseWs(),
      startAt: "2026-04-22T14:00:00Z",
    });
    expect(plan.touches.some((t) => t.channel === "call")).toBe(false);
  });
});

describe("buildCadencePlan — terminal signals", () => {
  it("produces empty plan when lead has replied", () => {
    const plan = buildCadencePlan({
      template: basicTemplate,
      lead: { ...baseLead(), hasReplied: true },
      workspace: baseWs(),
      startAt: "2026-04-22T14:00:00Z",
    });
    expect(plan.touches).toHaveLength(0);
    expect(plan.skippedReason).toBe("lead_replied");
  });

  it("produces empty plan when meeting booked", () => {
    const plan = buildCadencePlan({
      template: basicTemplate,
      lead: { ...baseLead(), hasBookedMeeting: true },
      workspace: baseWs(),
      startAt: "2026-04-22T14:00:00Z",
    });
    expect(plan.skippedReason).toBe("meeting_booked");
  });
});

describe("buildCadencePlan — business hours clamp", () => {
  it("bumps after-hours sends into business window", () => {
    // Start on 2026-04-22 02:00 UTC = prev day 9pm ET → outside hours.
    const plan = buildCadencePlan({
      template: { id: "t2", name: "one", steps: [{ channel: "email", offsetMinutes: 0, templateId: "em" }] },
      lead: baseLead(),
      workspace: baseWs(),
      startAt: "2026-04-22T02:00:00Z",
    });
    expect(plan.touches).toHaveLength(1);
    // Adjusted UTC for 9am ET = 14:00 UTC (DST-insensitive offset).
    const scheduled = new Date(plan.touches[0].scheduledAt);
    const local = new Date(scheduled.getTime() + -300 * 60_000);
    expect(local.getUTCHours()).toBeGreaterThanOrEqual(9);
    expect(local.getUTCHours()).toBeLessThan(17);
  });

  it("skips weekends — Saturday push moves to Monday", () => {
    // 2026-04-25 is a Saturday.
    const plan = buildCadencePlan({
      template: { id: "t3", name: "one", steps: [{ channel: "email", offsetMinutes: 0, templateId: "em" }] },
      lead: baseLead(),
      workspace: baseWs(),
      startAt: "2026-04-25T14:00:00Z", // Sat 10am ET
    });
    const scheduled = new Date(plan.touches[0].scheduledAt);
    expect([1, 2, 3, 4, 5]).toContain(scheduled.getUTCDay());
  });

  it("skips US federal holidays (e.g., 2026-07-03)", () => {
    const plan = buildCadencePlan({
      template: { id: "t4", name: "one", steps: [{ channel: "email", offsetMinutes: 0, templateId: "em" }] },
      lead: baseLead(),
      workspace: baseWs(),
      startAt: "2026-07-03T14:00:00Z",
    });
    const s = new Date(plan.touches[0].scheduledAt);
    const local = new Date(s.getTime() + -300 * 60_000);
    const key = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")}`;
    expect(key).not.toBe("2026-07-03");
  });
});

describe("buildCadencePlan — channel gap", () => {
  it("drops email step when gap not met", () => {
    const lead: LeadState = {
      ...baseLead(),
      minutesSinceLastEmail: 60, // only 1 hour since last email
    };
    const plan = buildCadencePlan({
      template: basicTemplate,
      lead,
      workspace: baseWs(), // email gap = 24h
      startAt: "2026-04-22T14:00:00Z",
    });
    expect(plan.touches.some((t) => t.channel === "email")).toBe(false);
  });

  it("keeps step when gap exceeded", () => {
    const lead: LeadState = {
      ...baseLead(),
      minutesSinceLastEmail: 60 * 48,
    };
    const plan = buildCadencePlan({
      template: basicTemplate,
      lead,
      workspace: baseWs(),
      startAt: "2026-04-22T14:00:00Z",
    });
    expect(plan.touches.some((t) => t.channel === "email")).toBe(true);
  });
});

describe("buildCadencePlan — maxTouches cap", () => {
  it("caps at template.maxTouches", () => {
    const plan = buildCadencePlan({
      template: { ...basicTemplate, maxTouches: 2 },
      lead: baseLead(),
      workspace: baseWs(),
      startAt: "2026-04-22T14:00:00Z",
    });
    expect(plan.touches).toHaveLength(2);
  });
});
