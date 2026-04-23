import { describe, it, expect } from "vitest";
import {
  scoreAppointmentRisk,
  buildPreventionPlan,
  pruneRemindersOnConfirm,
  type Appointment,
  type AppointmentRiskInputs,
} from "../src/lib/sales/no-show-prevention";

function inFuture(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function baseAppt(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "appt-1",
    leadId: "lead-1",
    workspaceId: "ws-1",
    scheduledAt: inFuture(30),
    durationMinutes: 30,
    type: "demo",
    source: "paid_ad",
    ...overrides,
  };
}

describe("no-show-prevention — scoreAppointmentRisk", () => {
  it("high commitment + clean history → low tier", () => {
    const r = scoreAppointmentRisk({
      commitmentScore: 0.9,
      priorNoShows: 0,
      priorReschedules: 0,
      isNew: false,
    });
    expect(r.tier).toBe("low");
    expect(r.score).toBeLessThan(0.3);
  });

  it("low commitment + 3 no-shows + new + high-risk source → severe tier", () => {
    const r = scoreAppointmentRisk({
      commitmentScore: 0.05,
      priorNoShows: 3,
      priorReschedules: 2,
      isNew: true,
      highRiskSource: true,
    });
    expect(r.tier).toBe("severe");
    expect(r.score).toBeGreaterThanOrEqual(0.75);
  });

  it("scores are clamped to [0,1]", () => {
    const r = scoreAppointmentRisk({
      commitmentScore: 2, // absurd
      priorNoShows: -3,
      priorReschedules: 0,
      isNew: false,
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(1);
  });
});

describe("no-show-prevention — buildPreventionPlan", () => {
  it("low tier plan includes at least the 24h reminder + email confirmation (30d out)", () => {
    const plan = buildPreventionPlan(baseAppt({ scheduledAt: inFuture(30) }), {
      commitmentScore: 0.9,
      priorNoShows: 0,
      priorReschedules: 0,
      isNew: false,
    });
    expect(plan.riskTier).toBe("low");
    const templates = plan.reminders.map((r) => r.templateId);
    expect(templates).toContain("confirmation_email");
    expect(templates).toContain("24h_reminder_sms");
    // low tier should NOT include final sms / ai call / human escalation
    expect(templates).not.toContain("final_sms");
    expect(templates).not.toContain("ai_confirmation_call");
    expect(templates).not.toContain("human_escalation");
  });

  it("severe tier plan includes ai_call and human escalation", () => {
    const plan = buildPreventionPlan(baseAppt({ scheduledAt: inFuture(30) }), {
      commitmentScore: 0.05,
      priorNoShows: 3,
      priorReschedules: 2,
      isNew: true,
      highRiskSource: true,
    });
    expect(plan.riskTier).toBe("severe");
    const templates = plan.reminders.map((r) => r.templateId);
    expect(templates).toContain("ai_confirmation_call");
    expect(templates).toContain("human_escalation");
    expect(templates).toContain("no_show_recovery_sms");
  });

  it("only schedules reminders in the future", () => {
    const plan = buildPreventionPlan(baseAppt({ scheduledAt: inFuture(30) }), {
      commitmentScore: 0.5,
      priorNoShows: 0,
      priorReschedules: 0,
      isNew: false,
    });
    const now = Date.now();
    for (const r of plan.reminders) {
      expect(new Date(r.at).getTime()).toBeGreaterThan(now);
    }
  });

  it("skips past-due reminders for an appointment < 4h out", () => {
    const plan = buildPreventionPlan(baseAppt({ scheduledAt: inFuture(0.05) }), {
      commitmentScore: 0.5,
      priorNoShows: 0,
      priorReschedules: 0,
      isNew: false,
    });
    const templates = plan.reminders.map((r) => r.templateId);
    expect(templates).not.toContain("confirmation_email"); // 72h in past
    expect(templates).not.toContain("24h_reminder_sms"); // 24h in past
  });

  it("surfaces a note when lead has ≥2 prior no-shows", () => {
    const plan = buildPreventionPlan(baseAppt(), {
      commitmentScore: 0.4,
      priorNoShows: 2,
      priorReschedules: 0,
      isNew: false,
    });
    expect(plan.notes.some((n) => /prior no-shows/i.test(n))).toBe(true);
  });
});

describe("no-show-prevention — pruneRemindersOnConfirm", () => {
  it("drops reminders with priority >=3 but keeps post-miss recovery", () => {
    const plan = buildPreventionPlan(baseAppt({ scheduledAt: inFuture(30) }), {
      commitmentScore: 0.2,
      priorNoShows: 1,
      priorReschedules: 0,
      isNew: true,
      highRiskSource: true,
    });
    const pruned = pruneRemindersOnConfirm(plan);
    const templates = pruned.reminders.map((r) => r.templateId);
    expect(templates).toContain("no_show_recovery_sms");
    expect(templates).not.toContain("24h_reminder_sms");
    expect(templates).not.toContain("ai_confirmation_call");
  });
});

// Make noises not visible inline — ensure types compile too
const _unused: AppointmentRiskInputs = {
  commitmentScore: 0.5,
  priorNoShows: 0,
  priorReschedules: 0,
  isNew: false,
};
void _unused;
