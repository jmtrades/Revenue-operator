/**
 * State-specific telemarketing calling rules that are STRICTER than the
 * federal TCPA 8am-9pm window. When a state overrides, we use the narrower
 * window — federal is a floor, not a ceiling.
 *
 * Rules here are based on state telemarketing statutes as of 2025. This is
 * not legal advice; workspace admins should have counsel verify for their
 * specific industry and call type. Default behavior when unsure is always
 * to fall through to the strict federal 8am-9pm window.
 *
 * References (non-exhaustive):
 *   - Alabama Code § 8-19C (no Sunday calls, 8am-8pm Mon-Sat)
 *   - Louisiana R.S. 45:844.13 (no Sunday calls)
 *   - Florida Stat. § 501.059 (8am-8pm, no Sunday)
 *   - Texas Business & Commerce Code Ch. 304 (9am-9pm, no Sunday)
 *   - Mississippi Code § 77-3-703 (8am-8pm, no Sunday)
 *   - Missouri RSMo § 407.1076 (must honor state DNC; 8am-9pm)
 *
 * Implementation detail: we store hour windows as minutes-from-midnight so
 * time arithmetic is unambiguous around DST boundaries (the tz conversion
 * is done upstream by the caller, this module just compares bucket minutes).
 */

export interface StateCallingRule {
  /** USPS 2-letter state code */
  state: string;
  /** Earliest allowed call time in recipient-local minutes (e.g., 8am = 480) */
  startMinutes: number;
  /** Latest allowed call time in recipient-local minutes (e.g., 9pm = 1260) */
  endMinutes: number;
  /** Weekdays when calling is FORBIDDEN, 0=Sun, 6=Sat. Empty = no weekday restriction. */
  forbiddenWeekdays: number[];
  /** Optional human-readable citation for logs / UI */
  citation?: string;
}

const H = (hours: number, minutes = 0) => hours * 60 + minutes;

/**
 * State overrides. Only states STRICTER than 8am-9pm Mon-Sun belong here.
 * States not listed fall through to the federal window.
 */
export const STATE_RULES: Record<string, StateCallingRule> = {
  AL: {
    state: "AL",
    startMinutes: H(8),
    endMinutes: H(20), // 8pm
    forbiddenWeekdays: [0], // No Sunday
    citation: "Ala. Code § 8-19C",
  },
  AR: {
    state: "AR",
    startMinutes: H(8),
    endMinutes: H(21),
    forbiddenWeekdays: [0],
    citation: "Ark. Code § 4-99-403",
  },
  FL: {
    state: "FL",
    startMinutes: H(8),
    endMinutes: H(20), // 8pm
    forbiddenWeekdays: [0],
    citation: "Fla. Stat. § 501.059",
  },
  LA: {
    state: "LA",
    startMinutes: H(8),
    endMinutes: H(21),
    forbiddenWeekdays: [0], // No Sunday
    citation: "La. R.S. 45:844.13",
  },
  MS: {
    state: "MS",
    startMinutes: H(8),
    endMinutes: H(20), // 8pm
    forbiddenWeekdays: [0],
    citation: "Miss. Code § 77-3-703",
  },
  TX: {
    state: "TX",
    startMinutes: H(9), // 9am
    endMinutes: H(21),
    forbiddenWeekdays: [0],
    citation: "Tex. Bus. & Com. Code Ch. 304",
  },
  KS: {
    state: "KS",
    startMinutes: H(8),
    endMinutes: H(21),
    forbiddenWeekdays: [0],
    citation: "Kan. Stat. § 50-670",
  },
  WY: {
    state: "WY",
    startMinutes: H(9),
    endMinutes: H(21),
    forbiddenWeekdays: [0],
    citation: "Wyo. Stat. § 40-12-301",
  },
};

/**
 * Apply state rule to determine the effective calling window. Falls back to
 * strict federal 8am-9pm if state is unknown / not stricter.
 */
export function getEffectiveCallingWindow(stateCode: string | null | undefined): {
  startMinutes: number;
  endMinutes: number;
  forbiddenWeekdays: number[];
  state: string | null;
  citation: string | null;
} {
  const s = (stateCode ?? "").toUpperCase().trim().slice(0, 2);
  const rule = STATE_RULES[s];
  if (rule) {
    return {
      startMinutes: rule.startMinutes,
      endMinutes: rule.endMinutes,
      forbiddenWeekdays: rule.forbiddenWeekdays,
      state: rule.state,
      citation: rule.citation ?? null,
    };
  }
  // Federal default
  return {
    startMinutes: H(8),
    endMinutes: H(21),
    forbiddenWeekdays: [],
    state: s || null,
    citation: "47 CFR § 64.1200(c)(1)",
  };
}
