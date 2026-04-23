/**
 * Phase 22 — Meeting scheduler availability calculator.
 *
 * Given:
 *   - a host's working hours (per day-of-week in local tz)
 *   - the host's existing busy intervals (from Google/Outlook calendar)
 *   - a desired meeting duration
 *   - a booking window [earliest, latest]
 *   - buffer (pre + post) and maximum-per-day caps
 *
 * Produce a list of bookable start times in UTC ISO format, in the lead's
 * timezone-aware slot grid. Also supports:
 *   - multi-host (round-robin / collective) — intersection of all hosts' free
 *   - minimum notice ("don't let people book <2 hours out")
 *   - max-per-day cap on new bookings
 *
 * Pure — no DB, no network. Callers fetch busy lists + pass them in.
 */

export interface TimeInterval {
  /** UTC ISO. */
  startUtc: string;
  /** UTC ISO. */
  endUtc: string;
}

export interface DailyWorkingHours {
  /** 0=Sun … 6=Sat. */
  dayOfWeek: number;
  /** Local start hour (0–24, may be fractional for :30). */
  startHour: number;
  /** Local end hour (exclusive). */
  endHour: number;
}

export interface HostAvailability {
  hostId: string;
  /** Host's UTC offset in minutes (east-of-UTC positive). */
  utcOffsetMinutes: number;
  /** Working hours by day-of-week in the host's local time. */
  workingHours: readonly DailyWorkingHours[];
  /** Busy intervals in UTC (from calendar providers). */
  busy: readonly TimeInterval[];
}

export type MultiHostStrategy =
  | "any_available" // round-robin — first host with a free slot wins
  | "all_required"; // collective — intersection of all hosts' free time

export interface AvailabilityInput {
  hosts: readonly HostAvailability[];
  strategy?: MultiHostStrategy;
  /** Meeting duration in minutes. */
  durationMinutes: number;
  /** Gap (minutes) before + after every slot to respect. */
  bufferMinutes?: number;
  /** Slot grid stride (minutes). 15 = offer every 15 min. Default 30. */
  slotStepMinutes?: number;
  /** Earliest UTC the caller wants to offer. */
  earliestUtc: string;
  /** Latest UTC (exclusive). */
  latestUtc: string;
  /** Minimum notice in minutes. */
  minNoticeMinutes?: number;
  /** Maximum offered slots per calendar day across the output list. */
  maxPerDay?: number;
  /** "Now" override — defaults to Date.now(). */
  nowUtc?: string;
}

export interface AvailableSlot {
  /** UTC ISO start. */
  startUtc: string;
  /** UTC ISO end. */
  endUtc: string;
  /** Which host(s) are free at this slot. */
  hostIds: string[];
}

const MIN_STEP = 5;

function toEpoch(iso: string): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) throw new Error(`invalid ISO: ${iso}`);
  return t;
}

function intervalsOverlap(a: TimeInterval, bStart: number, bEnd: number): boolean {
  return toEpoch(a.startUtc) < bEnd && toEpoch(a.endUtc) > bStart;
}

/**
 * Is the given UTC interval within the host's working hours (as defined in
 * their local time)? Respects crossing midnight by testing each minute.
 */
function isWithinWorkingHours(
  startUtc: number,
  endUtc: number,
  host: HostAvailability,
): boolean {
  if (host.workingHours.length === 0) return false;
  // Check both the start and end local — if they fall on different local days
  // with different rules, we require BOTH days to permit the range.
  const localStart = new Date(startUtc + host.utcOffsetMinutes * 60_000);
  const localEnd = new Date(endUtc - 1 + host.utcOffsetMinutes * 60_000);

  function isOk(local: Date): boolean {
    const dow = local.getUTCDay();
    const hrs = local.getUTCHours() + local.getUTCMinutes() / 60;
    for (const wh of host.workingHours) {
      if (wh.dayOfWeek === dow && hrs >= wh.startHour && hrs < wh.endHour) {
        return true;
      }
    }
    return false;
  }
  return isOk(localStart) && isOk(localEnd);
}

function isHostFree(
  startUtc: number,
  endUtc: number,
  host: HostAvailability,
  bufferMs: number,
): boolean {
  for (const b of host.busy) {
    if (intervalsOverlap(b, startUtc - bufferMs, endUtc + bufferMs)) {
      return false;
    }
  }
  return true;
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function calculateAvailability(input: AvailabilityInput): AvailableSlot[] {
  const {
    hosts,
    strategy = "any_available",
    durationMinutes,
    bufferMinutes = 0,
    slotStepMinutes = 30,
    earliestUtc,
    latestUtc,
    minNoticeMinutes = 0,
    maxPerDay,
    nowUtc,
  } = input;

  if (hosts.length === 0) return [];
  if (durationMinutes <= 0) return [];

  const step = Math.max(MIN_STEP, slotStepMinutes);
  const durMs = durationMinutes * 60_000;
  const bufferMs = bufferMinutes * 60_000;
  const now = nowUtc ? toEpoch(nowUtc) : Date.now();
  const earliest = toEpoch(earliestUtc);
  const latest = toEpoch(latestUtc);
  const effEarliest = Math.max(earliest, now + minNoticeMinutes * 60_000);

  // Align to step boundary.
  const base = Math.ceil(effEarliest / (step * 60_000)) * step * 60_000;

  const slots: AvailableSlot[] = [];
  const perDayCount = new Map<string, number>();

  for (let s = base; s + durMs <= latest; s += step * 60_000) {
    const e = s + durMs;

    // Which hosts qualify?
    const freeHosts: string[] = [];
    for (const h of hosts) {
      if (!isWithinWorkingHours(s, e, h)) continue;
      if (!isHostFree(s, e, h, bufferMs)) continue;
      freeHosts.push(h.hostId);
    }

    let ok = false;
    let emittedHosts: string[] = [];
    if (strategy === "all_required") {
      ok = freeHosts.length === hosts.length;
      emittedHosts = freeHosts;
    } else {
      // any_available
      ok = freeHosts.length > 0;
      emittedHosts = freeHosts;
    }

    if (!ok) continue;

    if (maxPerDay !== undefined) {
      const key = dayKey(s);
      const cur = perDayCount.get(key) ?? 0;
      if (cur >= maxPerDay) continue;
      perDayCount.set(key, cur + 1);
    }

    slots.push({
      startUtc: new Date(s).toISOString(),
      endUtc: new Date(e).toISOString(),
      hostIds: emittedHosts,
    });
  }
  return slots;
}

/**
 * Convenience — invert an availability result to produce a set of
 * display-ready { dateLabel, slots } groups in the lead's tz.
 */
export function groupSlotsByLocalDate(
  slots: readonly AvailableSlot[],
  leadUtcOffsetMinutes: number,
): Array<{ dateLabel: string; slots: AvailableSlot[] }> {
  const byDate = new Map<string, AvailableSlot[]>();
  for (const slot of slots) {
    const ms = toEpoch(slot.startUtc) + leadUtcOffsetMinutes * 60_000;
    const key = dayKey(ms);
    const arr = byDate.get(key) ?? [];
    arr.push(slot);
    byDate.set(key, arr);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([dateLabel, slots]) => ({ dateLabel, slots }));
}
