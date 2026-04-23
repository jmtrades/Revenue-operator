/**
 * Federal + observed holiday calendar for outbound calling blackouts.
 *
 * Many state telemarketing statutes and reasonable-business-practice guidance
 * prohibit solicitation calls on federal holidays. Rather than calling on Dec 25
 * and hoping nobody notices, we short-circuit any outbound dial on these dates.
 *
 * Rules covered:
 *  - US federal holidays (observed: nearest weekday when date falls on weekend)
 *  - Some states (e.g., AL, LA) prohibit calls on Sundays or state holidays
 *  - MLK Day, Presidents Day, Memorial Day, Juneteenth, Labor Day, Columbus Day,
 *    Veterans Day, Thanksgiving, Christmas, New Year's, Independence Day
 *
 * NOT a substitute for legal review. Workspace admins can add workspace-local
 * holidays via workspaces.calling_blackout_dates[] (array of YYYY-MM-DD strings).
 */

export interface HolidayInfo {
  /** YYYY-MM-DD in the given calendar year */
  date: string;
  /** Human-readable name */
  name: string;
  /** Whether this is observed (e.g. July 4 on Sat shifts to Fri July 3) */
  observed: boolean;
}

/**
 * Fixed-date holidays (month is 1-indexed).
 * If the fixed date falls on a weekend, "observed" shifts:
 *   Saturday → previous Friday
 *   Sunday   → following Monday
 */
const FIXED_DATE_HOLIDAYS: Array<{ month: number; day: number; name: string }> = [
  { month: 1, day: 1, name: "New Year's Day" },
  { month: 6, day: 19, name: "Juneteenth" },
  { month: 7, day: 4, name: "Independence Day" },
  { month: 11, day: 11, name: "Veterans Day" },
  { month: 12, day: 25, name: "Christmas Day" },
];

/**
 * Nth-weekday holidays (e.g., third Monday of January).
 * weekday: 0=Sun, 1=Mon, ..., 6=Sat
 * nth: 1=first, 2=second, 3=third, 4=fourth, -1=last
 */
const NTH_WEEKDAY_HOLIDAYS: Array<{
  month: number;
  weekday: number;
  nth: number;
  name: string;
}> = [
  { month: 1, weekday: 1, nth: 3, name: "Martin Luther King Jr. Day" },
  { month: 2, weekday: 1, nth: 3, name: "Presidents Day" },
  { month: 5, weekday: 1, nth: -1, name: "Memorial Day" },
  { month: 9, weekday: 1, nth: 1, name: "Labor Day" },
  { month: 10, weekday: 1, nth: 2, name: "Columbus Day" },
  { month: 11, weekday: 4, nth: 4, name: "Thanksgiving Day" },
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/**
 * Find the Nth weekday of a given month/year.
 * Example: nthWeekdayOfMonth(2026, 1, 1, 3) → 3rd Monday of Jan 2026 → 2026-01-19
 */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): number {
  if (nth > 0) {
    // Find first occurrence
    const first = new Date(Date.UTC(year, month - 1, 1));
    const firstWeekday = first.getUTCDay();
    const offset = (weekday - firstWeekday + 7) % 7;
    return 1 + offset + (nth - 1) * 7;
  }
  // nth < 0 → last occurrence
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const last = new Date(Date.UTC(year, month - 1, lastDay));
  const lastWeekday = last.getUTCDay();
  const offset = (lastWeekday - weekday + 7) % 7;
  return lastDay - offset;
}

/**
 * Apply federal "observed" shift rule.
 * If the fixed date is Saturday → observed Friday.
 * If the fixed date is Sunday → observed Monday.
 */
function observedShift(year: number, month: number, day: number): { month: number; day: number } {
  const d = new Date(Date.UTC(year, month - 1, day));
  const w = d.getUTCDay();
  if (w === 6) {
    // Saturday → previous Friday
    const prev = new Date(d.getTime() - 24 * 60 * 60 * 1000);
    return { month: prev.getUTCMonth() + 1, day: prev.getUTCDate() };
  }
  if (w === 0) {
    // Sunday → following Monday
    const next = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    return { month: next.getUTCMonth() + 1, day: next.getUTCDate() };
  }
  return { month, day };
}

/**
 * Build the full federal holiday list for a given year.
 * Includes both "actual" dates (e.g. July 4) and "observed" dates (when shifted).
 * We treat BOTH as blackout dates — some businesses close on the actual date,
 * some on the observed date. Safer to block both.
 */
export function getFederalHolidaysForYear(year: number): HolidayInfo[] {
  const out: HolidayInfo[] = [];

  for (const h of FIXED_DATE_HOLIDAYS) {
    out.push({ date: toIsoDate(year, h.month, h.day), name: h.name, observed: false });
    const shifted = observedShift(year, h.month, h.day);
    if (shifted.month !== h.month || shifted.day !== h.day) {
      out.push({
        date: toIsoDate(year, shifted.month, shifted.day),
        name: `${h.name} (observed)`,
        observed: true,
      });
    }
  }

  for (const h of NTH_WEEKDAY_HOLIDAYS) {
    const day = nthWeekdayOfMonth(year, h.month, h.weekday, h.nth);
    out.push({ date: toIsoDate(year, h.month, day), name: h.name, observed: false });
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Cached holiday set so we don't recompute on every call. Keyed by year.
 */
const holidayCache = new Map<number, Set<string>>();

function getHolidaySet(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const set = new Set(getFederalHolidaysForYear(year).map((h) => h.date));
  holidayCache.set(year, set);
  return set;
}

/**
 * Check whether a given YYYY-MM-DD (in the recipient's local time) is a
 * federal holiday. Treats both actual and observed shifts as blackout.
 */
export function isFederalHoliday(isoDate: string): boolean {
  const year = Number(isoDate.slice(0, 4));
  if (!Number.isFinite(year)) return false;
  return getHolidaySet(year).has(isoDate);
}

/**
 * Return the name of the holiday on a given date, or null if none.
 */
export function getFederalHolidayName(isoDate: string): string | null {
  const year = Number(isoDate.slice(0, 4));
  if (!Number.isFinite(year)) return null;
  const list = getFederalHolidaysForYear(year);
  return list.find((h) => h.date === isoDate)?.name ?? null;
}

/**
 * Compute the YYYY-MM-DD the given Date represents in an IANA timezone.
 * This is what the recipient experiences — `new Date()` in UTC is irrelevant
 * when the recipient in Hawaii is still on Dec 24.
 */
export function localDateInTimezone(utcDate: Date, timezone: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    // en-CA → YYYY-MM-DD directly
    return fmt.format(utcDate);
  } catch {
    // Fall back to UTC representation — better than throwing.
    return utcDate.toISOString().slice(0, 10);
  }
}
