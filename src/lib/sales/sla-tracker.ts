/**
 * Phase 33 — Inbound lead SLA response-time tracker.
 *
 * Inbound leads decay FAST — the Harvard/MIT study and subsequent InsideSales
 * replication show call-within-5-minutes gets ~100× the contact rate of
 * call-within-30-minutes. This module:
 *
 *   - computes elapsed-since-received for an inbound lead
 *   - computes response time (once answered)
 *   - respects business hours (configurable per workspace)
 *   - applies per-source SLA targets
 *   - reports breach + escalation trigger + time remaining
 *
 * Pure. Caller passes in the lead + business-hour config + current time.
 */

export type LeadSource =
  | "demo_request"
  | "contact_form"
  | "content_download"
  | "chatbot"
  | "referral"
  | "cold_inbound"
  | "trial_signup"
  | "webinar"
  | "other";

export interface BusinessHours {
  /** IANA timezone, e.g. "America/Los_Angeles". */
  timezone: string;
  /**
   * Per-day-of-week hours (0 = Sunday .. 6 = Saturday). Null = closed.
   * Fractional hours supported, e.g. 17.5 = 5:30 PM.
   */
  dayHours: Record<number, { startHour: number; endHour: number } | null>;
  /** ISO dates on which the business is closed (holidays). */
  holidays?: string[];
}

export interface InboundLead {
  id: string;
  source: LeadSource;
  receivedAt: string; // ISO
  firstResponseAt?: string | null;
  priority?: "low" | "normal" | "high" | "vip";
}

export interface SlaTargets {
  /** Target minutes to first response, by source. */
  bySource: Partial<Record<LeadSource, number>>;
  /** Default if source not in map. */
  defaultMinutes: number;
  /** VIP override — use this instead for priority=vip. */
  vipMinutes?: number;
  /**
   * Whether SLA clock pauses outside business hours (default true).
   * If false, SLA is wall-clock 24/7.
   */
  respectBusinessHours?: boolean;
}

export interface SlaEvaluation {
  leadId: string;
  source: LeadSource;
  targetMinutes: number;
  elapsedMinutes: number; // business-hour aware if configured
  remainingMinutes: number; // negative if breached
  breached: boolean;
  responded: boolean;
  responseMinutes: number | null;
  /** Suggested escalation level. */
  escalation: "none" | "notify_owner" | "notify_manager" | "notify_vp";
  status: "on_track" | "at_risk" | "breached" | "resolved_on_time" | "resolved_late";
}

/**
 * Reasonable default SLA ladder. These are aggressive on purpose —
 * every minute a demo request sits unattended cuts conversion.
 */
export const DEFAULT_SLA_TARGETS: SlaTargets = {
  bySource: {
    demo_request: 5,
    trial_signup: 15,
    contact_form: 10,
    chatbot: 2,
    content_download: 60,
    webinar: 60,
    referral: 15,
    cold_inbound: 120,
    other: 120,
  },
  defaultMinutes: 30,
  vipMinutes: 2,
  respectBusinessHours: true,
};

const MS_MIN = 60_000;

/**
 * Compute business-hour-aware minutes elapsed between two ISO timestamps,
 * in the business-hour timezone. Naive implementation: step minute-by-minute,
 * summing only minutes inside a working window. Practical up to ~10d windows.
 */
function elapsedBusinessMinutes(
  startIso: string,
  endIso: string,
  bh: BusinessHours,
): number {
  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endIso);
  if (endMs <= startMs) return 0;

  const holidays = new Set(bh.holidays ?? []);
  // We'll iterate in 1-minute chunks but short-circuit via day windows.
  let total = 0;
  let cursor = startMs;
  while (cursor < endMs) {
    const local = new Date(cursor);
    // Convert to tz by using Intl to fetch the local wall-clock fields.
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: bh.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(local);

    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const year = Number(get("year"));
    const month = Number(get("month"));
    const day = Number(get("day"));
    const hour = Number(get("hour"));
    const minute = Number(get("minute"));
    const dowName = get("weekday").toLowerCase();
    const dowMap: Record<string, number> = {
      sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
    };
    const dow = dowMap[dowName.slice(0, 3)];
    const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayWindow = bh.dayHours[dow];

    if (!dayWindow || holidays.has(isoDate)) {
      // Skip to tomorrow local midnight.
      const stepMs = MS_MIN * (60 * (24 - hour) - minute);
      cursor += Math.max(stepMs, MS_MIN);
      continue;
    }

    const nowFrac = hour + minute / 60;
    if (nowFrac >= dayWindow.endHour) {
      // After close — advance to next day.
      const stepMs = MS_MIN * (60 * (24 - hour) - minute);
      cursor += Math.max(stepMs, MS_MIN);
      continue;
    }
    if (nowFrac < dayWindow.startHour) {
      // Before open — advance to open.
      const openMinOfDay = Math.round(dayWindow.startHour * 60);
      const nowMinOfDay = hour * 60 + minute;
      const stepMs = (openMinOfDay - nowMinOfDay) * MS_MIN;
      cursor += Math.max(stepMs, MS_MIN);
      continue;
    }
    // Inside window — count 1 minute and advance.
    if (cursor + MS_MIN <= endMs) {
      total += 1;
      cursor += MS_MIN;
    } else {
      // Partial minute.
      total += (endMs - cursor) / MS_MIN;
      cursor = endMs;
    }
  }
  return total;
}

function wallMinutesBetween(startIso: string, endIso: string): number {
  return (Date.parse(endIso) - Date.parse(startIso)) / MS_MIN;
}

export function evaluateSla(
  lead: InboundLead,
  targets: SlaTargets,
  bh: BusinessHours,
  nowIso: string,
): SlaEvaluation {
  const targetMinutes =
    lead.priority === "vip" && targets.vipMinutes !== undefined
      ? targets.vipMinutes
      : targets.bySource[lead.source] ?? targets.defaultMinutes;

  const respectBH = targets.respectBusinessHours !== false;

  const endIso = lead.firstResponseAt ?? nowIso;
  const elapsed = respectBH
    ? elapsedBusinessMinutes(lead.receivedAt, endIso, bh)
    : wallMinutesBetween(lead.receivedAt, endIso);

  const responded = Boolean(lead.firstResponseAt);
  const responseMinutes = responded ? elapsed : null;
  const remaining = targetMinutes - elapsed;
  const breached = elapsed > targetMinutes;

  let status: SlaEvaluation["status"];
  if (responded) {
    status = elapsed <= targetMinutes ? "resolved_on_time" : "resolved_late";
  } else if (breached) {
    status = "breached";
  } else if (remaining <= targetMinutes * 0.25) {
    status = "at_risk";
  } else {
    status = "on_track";
  }

  // Escalation ladder: after 1× target → owner, 2× → manager, 4× → VP.
  let escalation: SlaEvaluation["escalation"] = "none";
  if (!responded) {
    if (elapsed >= targetMinutes * 4) escalation = "notify_vp";
    else if (elapsed >= targetMinutes * 2) escalation = "notify_manager";
    else if (elapsed >= targetMinutes) escalation = "notify_owner";
  }

  return {
    leadId: lead.id,
    source: lead.source,
    targetMinutes,
    elapsedMinutes: Math.round(elapsed * 100) / 100,
    remainingMinutes: Math.round(remaining * 100) / 100,
    breached,
    responded,
    responseMinutes: responseMinutes !== null ? Math.round(responseMinutes * 100) / 100 : null,
    escalation,
    status,
  };
}

/**
 * Default 9-6 M-F business hours in a given timezone.
 */
export function defaultBusinessHours(timezone: string): BusinessHours {
  const standard = { startHour: 9, endHour: 18 };
  return {
    timezone,
    dayHours: {
      0: null, // Sun
      1: standard,
      2: standard,
      3: standard,
      4: standard,
      5: standard,
      6: null, // Sat
    },
  };
}

/**
 * Roll up SLA evaluations for a team dashboard.
 */
export function summarizeSla(evals: SlaEvaluation[]): {
  total: number;
  onTimeRate: number;
  breachedCount: number;
  averageResponseMinutes: number | null;
  p90ResponseMinutes: number | null;
  escalationsNeeded: number;
} {
  const total = evals.length;
  if (total === 0) {
    return { total: 0, onTimeRate: 1, breachedCount: 0, averageResponseMinutes: null, p90ResponseMinutes: null, escalationsNeeded: 0 };
  }
  const responded = evals.filter((e) => e.responded);
  const onTime = evals.filter((e) => e.status === "resolved_on_time").length;
  const breached = evals.filter((e) => e.breached).length;
  const esc = evals.filter((e) => e.escalation !== "none").length;

  const responseTimes = responded
    .map((e) => e.responseMinutes as number)
    .sort((a, b) => a - b);
  const avg = responseTimes.length === 0 ? null :
    responseTimes.reduce((s, n) => s + n, 0) / responseTimes.length;
  const p90Index = Math.floor(responseTimes.length * 0.9);
  const p90 = responseTimes.length === 0 ? null : responseTimes[Math.min(p90Index, responseTimes.length - 1)];
  return {
    total,
    onTimeRate: responded.length === 0 ? 1 : onTime / responded.length,
    breachedCount: breached,
    averageResponseMinutes: avg,
    p90ResponseMinutes: p90,
    escalationsNeeded: esc,
  };
}
