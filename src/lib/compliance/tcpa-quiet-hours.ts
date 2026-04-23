/**
 * TCPA Quiet Hours Compliance (layered).
 *
 * Layers applied in order — any one of them blocking short-circuits the call:
 *   1. Federal TCPA: 8am-9pm recipient-local (47 CFR § 64.1200(c)(1))
 *   2. State-specific stricter windows (AL, FL, TX, LA, MS, KS, WY, AR, ...) — see
 *      state-calling-rules.ts. Includes forbidden weekdays (e.g., Sundays in AL/FL/LA).
 *   3. Federal holiday blackout — see calling-holidays.ts.
 *
 * The caller supplies the lead's phone (for area-code → timezone fallback) and
 * optionally the lead's state code. State code is stronger than phone area code
 * because people keep their numbers when they move; area code only resolves
 * TIMEZONE, state code resolves JURISDICTION. Always prefer state when known.
 */

import { log } from "@/lib/logger";
import { getEffectiveCallingWindow } from "./state-calling-rules";
import { isFederalHoliday, getFederalHolidayName, localDateInTimezone } from "./calling-holidays";

/**
 * US Area Code to Timezone Mapping
 * Maps area codes to IANA timezone identifiers
 * Covers major groupings; unknown codes default to strict interpretation
 */
const AREA_CODE_TIMEZONE_MAP: Record<string, string> = {
  // Eastern Time Zone (UTC-5 / UTC-4 DST)
  "201": "America/New_York", // NJ
  "202": "America/New_York", // DC
  "203": "America/New_York", // CT
  "205": "America/Chicago", // AL - actually Central, but some 20x are Eastern
  "212": "America/New_York", // NY
  "215": "America/New_York", // PA
  "239": "America/New_York", // FL
  "240": "America/New_York", // MD
  "246": "America/New_York", // Barbados (edge case, use NY)
  "269": "America/Chicago", // MI - Western part
  "301": "America/New_York", // MD
  "302": "America/New_York", // DE
  "305": "America/New_York", // FL
  "307": "America/Denver", // WY
  "309": "America/Chicago", // IL
  "310": "America/Los_Angeles", // CA
  "312": "America/Chicago", // IL
  "313": "America/Detroit", // MI
  "314": "America/Chicago", // MO
  "315": "America/New_York", // NY
  "317": "America/Indiana/Indianapolis", // IN
  "323": "America/Los_Angeles", // CA
  "325": "America/Chicago", // TX
  "330": "America/New_York", // OH
  "334": "America/Chicago", // AL
  "339": "America/New_York", // MA
  "347": "America/New_York", // NY
  "360": "America/Los_Angeles", // WA
  "385": "America/Denver", // UT
  "402": "America/Chicago", // NE
  "404": "America/New_York", // GA
  "405": "America/Chicago", // OK
  "406": "America/Denver", // MT
  "408": "America/Los_Angeles", // CA
  "410": "America/New_York", // MD
  "412": "America/New_York", // PA
  "413": "America/New_York", // MA
  "414": "America/Chicago", // WI
  "415": "America/Los_Angeles", // CA
  "419": "America/New_York", // OH
  "423": "America/Chicago", // TN
  "425": "America/Los_Angeles", // WA
  "435": "America/Denver", // UT
  "480": "America/Phoenix", // AZ (no DST)
  "503": "America/Los_Angeles", // OR
  "505": "America/Denver", // NM
  "507": "America/Chicago", // MN
  "509": "America/Los_Angeles", // WA
  "510": "America/Los_Angeles", // CA
  "512": "America/Chicago", // TX
  "513": "America/New_York", // OH
  "516": "America/New_York", // NY
  "517": "America/Detroit", // MI
  "520": "America/Phoenix", // AZ
  "530": "America/Los_Angeles", // CA
  "540": "America/New_York", // VA
  "559": "America/Los_Angeles", // CA
  "561": "America/New_York", // FL
  "570": "America/New_York", // PA
  "585": "America/New_York", // NY
  "602": "America/Phoenix", // AZ
  "603": "America/New_York", // NH
  "605": "America/Chicago", // SD
  "606": "America/New_York", // KY
  "610": "America/New_York", // PA
  "612": "America/Chicago", // MN
  "614": "America/New_York", // OH
  "615": "America/Chicago", // TN
  "616": "America/Detroit", // MI
  "617": "America/New_York", // MA
  "619": "America/Los_Angeles", // CA
  "623": "America/Phoenix", // AZ
  "626": "America/Los_Angeles", // CA
  "636": "America/Chicago", // MO
  "646": "America/New_York", // NY
  "650": "America/Los_Angeles", // CA
  "678": "America/New_York", // GA
  "702": "America/Los_Angeles", // NV
  "703": "America/New_York", // VA
  "704": "America/New_York", // NC
  "706": "America/New_York", // GA
  "707": "America/Los_Angeles", // CA
  "708": "America/Chicago", // IL
  "712": "America/Chicago", // IA
  "713": "America/Chicago", // TX
  "714": "America/Los_Angeles", // CA
  "716": "America/New_York", // NY
  "718": "America/New_York", // NY
  "719": "America/Denver", // CO
  "720": "America/Denver", // CO
  "724": "America/New_York", // PA
  "727": "America/New_York", // FL
  "734": "America/Detroit", // MI
  "760": "America/Los_Angeles", // CA
  "770": "America/New_York", // GA
  "773": "America/Chicago", // IL
  "775": "America/Los_Angeles", // NV
  "781": "America/New_York", // MA
  "785": "America/Chicago", // KS
  "786": "America/New_York", // FL
  "801": "America/Denver", // UT
  "802": "America/New_York", // VT
  "803": "America/New_York", // SC
  "804": "America/New_York", // VA
  "805": "America/Los_Angeles", // CA
  "806": "America/Chicago", // TX
  "808": "Pacific/Honolulu", // HI
  "810": "America/Detroit", // MI
  "812": "America/Indiana/Indianapolis", // IN
  "813": "America/New_York", // FL
  "814": "America/New_York", // PA
  "815": "America/Chicago", // IL
  "816": "America/Chicago", // MO
  "818": "America/Los_Angeles", // CA
  "828": "America/New_York", // NC
  "830": "America/Chicago", // TX
  "831": "America/Los_Angeles", // CA
  "832": "America/Chicago", // TX
  "843": "America/New_York", // SC
  "845": "America/New_York", // NY
  "847": "America/Chicago", // IL
  "848": "America/New_York", // NJ
  "850": "America/Chicago", // FL
  "858": "America/Los_Angeles", // CA
  "860": "America/New_York", // CT
  "862": "America/New_York", // NJ
  "863": "America/New_York", // FL
  "864": "America/New_York", // SC
  "865": "America/Chicago", // TN
  "870": "America/Chicago", // AR
  "878": "America/New_York", // PA
  "901": "America/Chicago", // TN
  "902": "America/Halifax", // Nova Scotia (Eastern)
  "903": "America/Chicago", // TX
  "904": "America/New_York", // FL
  "906": "America/Detroit", // MI
  "907": "America/Anchorage", // AK
  "908": "America/New_York", // NJ
  "909": "America/Los_Angeles", // CA
  "910": "America/New_York", // NC
  "912": "America/New_York", // GA
  "913": "America/Chicago", // KS
  "914": "America/New_York", // NY
  "915": "America/Chicago", // TX
  "916": "America/Los_Angeles", // CA
  "917": "America/New_York", // NY
  "918": "America/Chicago", // OK
  "919": "America/New_York", // NC
  "920": "America/Chicago", // WI
  "925": "America/Los_Angeles", // CA
  "931": "America/Chicago", // TN
  "936": "America/Chicago", // TX
  "937": "America/New_York", // OH
  "939": "America/Puerto_Rico", // PR
  "940": "America/Chicago", // TX
  "941": "America/New_York", // FL
  "947": "America/Detroit", // MI
  "949": "America/Los_Angeles", // CA
  "951": "America/Los_Angeles", // CA
  "952": "America/Chicago", // MN
  "954": "America/New_York", // FL
  "956": "America/Chicago", // TX
  "970": "America/Denver", // CO
  "971": "America/Los_Angeles", // OR
  "972": "America/Chicago", // TX
  "973": "America/New_York", // NJ
  "978": "America/New_York", // MA
  "979": "America/Chicago", // TX
  "980": "America/New_York", // NC
  "985": "America/Chicago", // LA
  "989": "America/Detroit", // MI
};

/**
 * Determines the lead's timezone based on their phone number's area code
 * Falls back to strictest interpretation if area code is unknown
 * @param leadPhone - Phone number in any format
 * @returns IANA timezone string
 */
function getLeadTimezoneFromAreaCode(leadPhone: string): string {
  const digits = leadPhone.replace(/\D/g, "");
  // Strip the US/Canada country code (1) when present. E.164 US numbers are
  // "+1NPAxxxxxxx" — after digit-extraction that's 11 digits starting with 1,
  // and the area code lives at positions 1..4, not 0..3. Without this strip,
  // every E.164 US lead resolved to a bogus area code like "121" or "180",
  // fell through to the Pacific fallback, and was evaluated against
  // Los_Angeles local time — a Hawaii lead at 4am could end up allowed
  // because LA at 10am is "compliant". Pre-existing P0 surfaced by Task 7.5
  // when we started feeding real lead phones through the dialer gate.
  const nationalDigits =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (nationalDigits.length < 10) {
    // Invalid phone number, default to strictest (Eastern)
    return "America/New_York";
  }

  // Extract area code (first 3 digits for US)
  const areaCode = nationalDigits.slice(0, 3);
  const timezone = AREA_CODE_TIMEZONE_MAP[areaCode];

  if (timezone) {
    return timezone;
  }

  // Unknown area code: use strict interpretation
  // Must be compliant on both coasts (8am+ Pacific AND before 9pm Eastern)
  log("warn", "[tcpa-compliance] Unknown area code, using strict interpretation", { areaCode });
  return "America/Los_Angeles"; // Strictest: ensure 8am+ Pacific
}

/**
 * Result of a layered compliance check. Callers that only care about the
 * boolean use `isTCPACompliant`; callers that want to explain WHY a call
 * was blocked (for UI, scheduling retries, or audit logs) use `checkCallingCompliance`.
 */
export interface CallingComplianceResult {
  allowed: boolean;
  reason:
    | "ok"
    | "federal_quiet_hours"
    | "state_quiet_hours"
    | "forbidden_weekday"
    | "federal_holiday"
    | "timezone_error";
  detail?: string;
  timezone: string;
  /** Minutes-from-midnight at time of check, in recipient-local. Useful for retry scheduling. */
  localMinutes?: number;
  /** 0=Sun..6=Sat in recipient-local */
  localWeekday?: number;
  /** YYYY-MM-DD in recipient-local */
  localDate?: string;
}

/**
 * Full layered compliance check. Returns structured result instead of a bare
 * boolean so callers can log and schedule intelligently.
 *
 * @param leadPhone Lead's phone — used for timezone resolution
 * @param leadState Optional USPS state code — used for state-specific rules (preferred over area code for jurisdiction)
 */
export function checkCallingCompliance(
  leadPhone: string,
  leadState?: string | null,
): CallingComplianceResult {
  const now = new Date();
  const leadTimezone = getLeadTimezoneFromAreaCode(leadPhone);

  try {
    const leadLocalTime = new Date(now.toLocaleString("en-US", { timeZone: leadTimezone }));
    const hours = leadLocalTime.getHours();
    const minutes = leadLocalTime.getMinutes();
    const currentMinutes = hours * 60 + minutes;
    const weekday = leadLocalTime.getDay(); // 0=Sun..6=Sat
    const localDate = localDateInTimezone(now, leadTimezone);

    // Layer 3: Federal holiday blackout — applied first because it's calendar-day
    // scoped, not time-of-day. Cheapest to check.
    if (isFederalHoliday(localDate)) {
      const holidayName = getFederalHolidayName(localDate) ?? "holiday";
      log("info", "[calling-compliance] Blocked by federal holiday", {
        leadPhone: leadPhone.slice(-4),
        leadTimezone,
        localDate,
        holidayName,
      });
      return {
        allowed: false,
        reason: "federal_holiday",
        detail: holidayName,
        timezone: leadTimezone,
        localMinutes: currentMinutes,
        localWeekday: weekday,
        localDate,
      };
    }

    // Layer 2: State-specific rules (falls back to federal window if state unknown).
    const window = getEffectiveCallingWindow(leadState);

    // Forbidden weekday (e.g., no Sunday in AL/FL/LA/TX).
    if (window.forbiddenWeekdays.includes(weekday)) {
      const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][weekday];
      log("info", "[calling-compliance] Blocked by forbidden weekday", {
        leadPhone: leadPhone.slice(-4),
        leadTimezone,
        weekday,
        dayName,
        state: window.state,
        citation: window.citation,
      });
      return {
        allowed: false,
        reason: "forbidden_weekday",
        detail: `${dayName} calling prohibited${window.citation ? ` (${window.citation})` : ""}`,
        timezone: leadTimezone,
        localMinutes: currentMinutes,
        localWeekday: weekday,
        localDate,
      };
    }

    // State window is narrower than federal by construction — so a single
    // bounds check honors both layers 1 and 2.
    const inWindow = currentMinutes >= window.startMinutes && currentMinutes <= window.endMinutes;
    if (!inWindow) {
      const stateSpecific = window.startMinutes !== 480 || window.endMinutes !== 1260;
      log("info", "[calling-compliance] Blocked by quiet hours", {
        leadPhone: leadPhone.slice(-4),
        leadTimezone,
        currentTime: `${hours}:${String(minutes).padStart(2, "0")}`,
        windowStart: minutesToLabel(window.startMinutes),
        windowEnd: minutesToLabel(window.endMinutes),
        state: window.state,
        citation: window.citation,
      });
      return {
        allowed: false,
        reason: stateSpecific ? "state_quiet_hours" : "federal_quiet_hours",
        detail: `Outside ${minutesToLabel(window.startMinutes)}-${minutesToLabel(window.endMinutes)} ${window.state ?? ""}`.trim(),
        timezone: leadTimezone,
        localMinutes: currentMinutes,
        localWeekday: weekday,
        localDate,
      };
    }

    return {
      allowed: true,
      reason: "ok",
      timezone: leadTimezone,
      localMinutes: currentMinutes,
      localWeekday: weekday,
      localDate,
    };
  } catch (err) {
    // Fail closed for safety.
    log("error", "[calling-compliance] Timezone conversion failed, blocking call", {
      leadPhone: leadPhone.slice(-4),
      leadTimezone,
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      allowed: false,
      reason: "timezone_error",
      detail: err instanceof Error ? err.message : String(err),
      timezone: leadTimezone,
    };
  }
}

function minutesToLabel(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

/**
 * Back-compat wrapper. Returns true when ALL layers allow the call.
 * New callers should prefer `checkCallingCompliance` so they can report WHY.
 */
export function isTCPACompliant(leadPhone: string, leadState?: string | null): boolean {
  return checkCallingCompliance(leadPhone, leadState).allowed;
}

/**
 * Next compliant time — layered: honors federal quiet hours, state rules,
 * state-forbidden weekdays, AND federal holidays. Walks forward at most
 * 14 days (amply enough for any US holiday/weekend combo). If even 14 days
 * out is blocked, returns now+24h as a safety net rather than looping forever.
 */
export function getNextCompliantTime(leadPhone: string, leadState?: string | null): string {
  const now = new Date();
  const leadTimezone = getLeadTimezoneFromAreaCode(leadPhone);

  try {
    // Start from "current time in recipient-local"
    const leadLocalNow = new Date(now.toLocaleString("en-US", { timeZone: leadTimezone }));
    const window = getEffectiveCallingWindow(leadState);
    const cursor = new Date(leadLocalNow);

    // Try today first; if today's window already closed, advance to tomorrow 00:00
    if (cursor.getHours() * 60 + cursor.getMinutes() >= window.endMinutes) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(0, 0, 0, 0);
    }

    // Walk forward up to 14 days until we find a day that:
    //   - isn't a federal holiday
    //   - isn't a forbidden weekday for this state
    for (let i = 0; i < 14; i++) {
      const isoDate = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      const weekday = cursor.getDay();
      const forbidden = window.forbiddenWeekdays.includes(weekday) || isFederalHoliday(isoDate);
      if (!forbidden) break;
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(0, 0, 0, 0);
    }

    // Snap to the earliest allowed minute of the chosen day
    const currentMin = cursor.getHours() * 60 + cursor.getMinutes();
    if (currentMin < window.startMinutes) {
      cursor.setHours(Math.floor(window.startMinutes / 60), window.startMinutes % 60, 0, 0);
    }

    // Convert recipient-local back to UTC for storage
    const offset =
      leadLocalNow.getTime() -
      new Date(leadLocalNow.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
    const utcTime = new Date(cursor.getTime() - offset);
    return utcTime.toISOString();
  } catch (err) {
    log("error", "[calling-compliance] Failed to calculate next compliant time", {
      leadPhone: leadPhone.slice(-4),
      error: err instanceof Error ? err.message : String(err),
    });
    return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  }
}
