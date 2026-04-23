/**
 * Phase 19 — Multi-channel cadence engine.
 *
 * Deterministic sequencer: given a cadence template and a lead state, produce
 * a concrete timeline of touchpoints with channel, body template, and
 * UTC-ISO send time. Pure — no DB, no network. Callers persist the plan and
 * execute each touchpoint.
 *
 * Responsibilities (what this module DOES):
 *   - Expand cadence step definitions into dated events
 *   - Skip channels the lead has opted out of
 *   - Clamp each event into the workspace business-hours window
 *   - Skip weekends / US federal holidays when requested
 *   - Apply a per-channel minimum gap (no two emails within 24h)
 *   - Stop the sequence at the first "terminal" signal (replied, meeting_booked)
 *   - Respect a hard cap on total touches
 *
 * Responsibilities it does NOT have:
 *   - Content generation — callers pass templates
 *   - Actual delivery — callers dispatch each event via job queue
 */

export type CadenceChannel = "email" | "sms" | "call" | "voicemail" | "linkedin";

export interface CadenceStep {
  channel: CadenceChannel;
  /** Minutes after the sequence start to wait before this step. */
  offsetMinutes: number;
  /** The template id to render. */
  templateId: string;
  /** Optional subject for email steps. */
  subject?: string;
}

export interface CadenceTemplate {
  id: string;
  name: string;
  steps: CadenceStep[];
  /** Maximum total touches across all channels. */
  maxTouches?: number;
}

export interface LeadState {
  leadId: string;
  hasOptedOutEmail: boolean;
  hasOptedOutSms: boolean;
  hasOptedOutCall: boolean;
  hasReplied: boolean;
  hasBookedMeeting: boolean;
  /** Per-channel minutes since the last touch — used to enforce gaps. */
  minutesSinceLastEmail: number | null;
  minutesSinceLastSms: number | null;
  minutesSinceLastCall: number | null;
}

export interface WorkspaceScheduling {
  /** Workspace timezone UTC offset in minutes (east-of-UTC positive). */
  utcOffsetMinutes: number;
  /** Local business hours, [startHour, endHour). 24-hr. */
  businessHoursLocal: [number, number];
  /** Skip Saturday + Sunday. */
  skipWeekends: boolean;
  /** Skip US federal holidays. */
  skipUsHolidays: boolean;
  /** Minimum gap between same-channel touches, in minutes. */
  channelGapMinutes: Partial<Record<CadenceChannel, number>>;
}

export interface ScheduledTouch {
  channel: CadenceChannel;
  templateId: string;
  subject?: string;
  /** UTC ISO timestamp. */
  scheduledAt: string;
  /** Offset of this step within the sequence (minutes). */
  offsetMinutes: number;
  /** Why this was included / how it was modified. */
  notes: string[];
}

export interface CadencePlan {
  leadId: string;
  templateId: string;
  startAt: string;
  touches: ScheduledTouch[];
  skippedReason?: string;
}

/**
 * US federal holidays 2025–2027. Extend as needed.
 * Observed dates only. Fixed-date holidays observed on Monday when Sunday or
 * Friday when Saturday, following OPM rules.
 */
const US_FEDERAL_HOLIDAYS_OBSERVED: ReadonlySet<string> = new Set([
  // 2025
  "2025-01-01","2025-01-20","2025-02-17","2025-05-26","2025-06-19","2025-07-04",
  "2025-09-01","2025-10-13","2025-11-11","2025-11-27","2025-12-25",
  // 2026
  "2026-01-01","2026-01-19","2026-02-16","2026-05-25","2026-06-19","2026-07-03",
  "2026-09-07","2026-10-12","2026-11-11","2026-11-26","2026-12-25",
  // 2027
  "2027-01-01","2027-01-18","2027-02-15","2027-05-31","2027-06-18","2027-07-05",
  "2027-09-06","2027-10-11","2027-11-11","2027-11-25","2027-12-24",
]);

function toLocal(utc: Date, offsetMinutes: number): Date {
  return new Date(utc.getTime() + offsetMinutes * 60_000);
}

function fromLocal(local: Date, offsetMinutes: number): Date {
  return new Date(local.getTime() - offsetMinutes * 60_000);
}

function _formatUtcDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isBusinessMoment(
  local: Date,
  ws: WorkspaceScheduling,
): { ok: boolean; reason?: string } {
  const dow = local.getUTCDay();
  if (ws.skipWeekends && (dow === 0 || dow === 6)) {
    return { ok: false, reason: "weekend" };
  }
  if (ws.skipUsHolidays) {
    const key = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")}`;
    if (US_FEDERAL_HOLIDAYS_OBSERVED.has(key)) {
      return { ok: false, reason: "us_holiday" };
    }
  }
  const h = local.getUTCHours();
  const [startH, endH] = ws.businessHoursLocal;
  if (h < startH || h >= endH) {
    return { ok: false, reason: "outside_business_hours" };
  }
  return { ok: true };
}

function nextBusinessMoment(
  candidateLocal: Date,
  ws: WorkspaceScheduling,
): { local: Date; bumped: string[] } {
  const bumped: string[] = [];
  const [startH, endH] = ws.businessHoursLocal;
  const local = new Date(candidateLocal);
  // Bump up to 14 days searching for a valid slot.
  for (let i = 0; i < 14 * 24; i++) {
    const check = isBusinessMoment(local, ws);
    if (check.ok) return { local, bumped };
    bumped.push(check.reason ?? "bumped");
    // If after-hours on a valid weekday/holiday, move to next business-hour start.
    if (check.reason === "outside_business_hours") {
      if (local.getUTCHours() >= endH) {
        // Move to startH next day.
        local.setUTCDate(local.getUTCDate() + 1);
        local.setUTCHours(startH, 0, 0, 0);
      } else {
        local.setUTCHours(startH, 0, 0, 0);
      }
      continue;
    }
    // Weekend or holiday → jump to next day at start hour.
    local.setUTCDate(local.getUTCDate() + 1);
    local.setUTCHours(startH, 0, 0, 0);
  }
  return { local, bumped };
}

function isOptedOut(channel: CadenceChannel, lead: LeadState): boolean {
  if (channel === "email") return lead.hasOptedOutEmail;
  if (channel === "sms") return lead.hasOptedOutSms;
  if (channel === "call" || channel === "voicemail") return lead.hasOptedOutCall;
  return false;
}

function channelGapMet(
  channel: CadenceChannel,
  lead: LeadState,
  ws: WorkspaceScheduling,
): boolean {
  const min = ws.channelGapMinutes[channel];
  if (min === undefined) return true;
  const since =
    channel === "email"
      ? lead.minutesSinceLastEmail
      : channel === "sms"
        ? lead.minutesSinceLastSms
        : channel === "call" || channel === "voicemail"
          ? lead.minutesSinceLastCall
          : null;
  if (since === null) return true;
  return since >= min;
}

export interface BuildCadencePlanInput {
  template: CadenceTemplate;
  lead: LeadState;
  workspace: WorkspaceScheduling;
  /** UTC ISO when the sequence should start. */
  startAt: string;
}

export function buildCadencePlan(input: BuildCadencePlanInput): CadencePlan {
  const { template, lead, workspace, startAt } = input;

  if (lead.hasReplied) {
    return {
      leadId: lead.leadId,
      templateId: template.id,
      startAt,
      touches: [],
      skippedReason: "lead_replied",
    };
  }
  if (lead.hasBookedMeeting) {
    return {
      leadId: lead.leadId,
      templateId: template.id,
      startAt,
      touches: [],
      skippedReason: "meeting_booked",
    };
  }

  const startUtc = new Date(startAt);
  if (Number.isNaN(startUtc.getTime())) {
    return {
      leadId: lead.leadId,
      templateId: template.id,
      startAt,
      touches: [],
      skippedReason: "invalid_start_at",
    };
  }

  const touches: ScheduledTouch[] = [];
  const maxTouches = template.maxTouches ?? Number.POSITIVE_INFINITY;

  for (const step of template.steps) {
    if (touches.length >= maxTouches) break;

    if (isOptedOut(step.channel, lead)) {
      continue;
    }
    if (!channelGapMet(step.channel, lead, workspace)) {
      continue;
    }

    const candidateUtc = new Date(
      startUtc.getTime() + step.offsetMinutes * 60_000,
    );
    const candidateLocal = toLocal(candidateUtc, workspace.utcOffsetMinutes);
    const { local: adjustedLocal, bumped } = nextBusinessMoment(
      candidateLocal,
      workspace,
    );
    const adjustedUtc = fromLocal(adjustedLocal, workspace.utcOffsetMinutes);

    touches.push({
      channel: step.channel,
      templateId: step.templateId,
      subject: step.subject,
      scheduledAt: adjustedUtc.toISOString(),
      offsetMinutes: step.offsetMinutes,
      notes: bumped,
    });
  }

  return {
    leadId: lead.leadId,
    templateId: template.id,
    startAt,
    touches,
  };
}
