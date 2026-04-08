/**
 * TCPA Quiet Hours Compliance
 * Enforces TCPA regulations requiring that automated/prerecorded calls cannot be made
 * before 8:00 AM or after 9:00 PM in the RECIPIENT'S local time zone.
 *
 * Reference: 47 CFR § 64.1200(c)(1)
 */

import { log } from "@/lib/logger";

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
  if (digits.length < 10) {
    // Invalid phone number, default to strictest (Eastern)
    return "America/New_York";
  }

  // Extract area code (first 3 digits for US)
  const areaCode = digits.slice(0, 3);
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
 * Checks if the current time in the lead's timezone is within TCPA quiet hours
 * TCPA requires calls between 8:00 AM and 9:00 PM in the recipient's local time
 *
 * @param leadPhone - Lead's phone number
 * @returns true if compliant (within quiet hours), false if blocked
 */
export function isTCPACompliant(leadPhone: string): boolean {
  const now = new Date();
  const leadTimezone = getLeadTimezoneFromAreaCode(leadPhone);

  try {
    // Get current time in the lead's timezone
    const leadLocalTime = new Date(now.toLocaleString("en-US", { timeZone: leadTimezone }));
    const hours = leadLocalTime.getHours();
    const minutes = leadLocalTime.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    // TCPA quiet hours: 8:00 AM = 480 minutes, 9:00 PM = 1260 minutes
    const TCPA_START_MINUTES = 8 * 60; // 480
    const TCPA_END_MINUTES = 21 * 60; // 1260

    const isCompliant = currentMinutes >= TCPA_START_MINUTES && currentMinutes <= TCPA_END_MINUTES;

    if (!isCompliant) {
      log("info", "[tcpa-compliance] Call blocked by TCPA quiet hours", {
        leadPhone: leadPhone.slice(-4), // Log only last 4 digits for privacy
        leadTimezone,
        leadLocalTime: leadLocalTime.toLocaleString(),
        currentTime: `${hours}:${String(minutes).padStart(2, "0")}`,
        allowedWindow: "8:00 AM - 9:00 PM",
      });
    }

    return isCompliant;
  } catch (err) {
    // If timezone conversion fails, log and fail closed (block call for safety)
    log("error", "[tcpa-compliance] Timezone conversion failed, blocking call", {
      leadPhone: leadPhone.slice(-4),
      leadTimezone,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Gets the next compliant time in the lead's timezone when a call can be made
 * Useful for scheduling retries
 *
 * @param leadPhone - Lead's phone number
 * @returns ISO string of next compliant time
 */
export function getNextCompliantTime(leadPhone: string): string {
  const now = new Date();
  const leadTimezone = getLeadTimezoneFromAreaCode(leadPhone);

  try {
    const leadLocalTime = new Date(now.toLocaleString("en-US", { timeZone: leadTimezone }));
    const hours = leadLocalTime.getHours();

    let nextTime = new Date(leadLocalTime);

    // If it's before 8 AM, schedule for 8 AM today
    if (hours < 8) {
      nextTime.setHours(8, 0, 0, 0);
    } else if (hours >= 21) {
      // If it's after 9 PM, schedule for 8 AM tomorrow
      nextTime.setDate(nextTime.getDate() + 1);
      nextTime.setHours(8, 0, 0, 0);
    } else {
      // Within hours, shouldn't happen but return current + 1 hour
      nextTime.setHours(nextTime.getHours() + 1);
    }

    // Convert back to UTC for storage
    const offset = leadLocalTime.getTime() - new Date(leadLocalTime.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
    const utcTime = new Date(nextTime.getTime() - offset);

    return utcTime.toISOString();
  } catch (err) {
    log("error", "[tcpa-compliance] Failed to calculate next compliant time", {
      leadPhone: leadPhone.slice(-4),
      error: err instanceof Error ? err.message : String(err),
    });
    // Default: retry in 24 hours
    return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  }
}
