/**
 * Phase 18 — Send-time optimization.
 *
 * Given a lead's historical engagement (opens, replies, calls answered) and a
 * fallback industry profile, produce the optimal UTC send time for a new
 * outreach. Pure module. No DB access — callers pass the engagement rollup.
 *
 * Scoring model:
 *   weight = 3 * replied + 2 * opened + 1 * delivered
 *
 * Each (day-of-week × hour) bucket accumulates weight. The optimal bucket is
 * the argmax. When the lead has <MIN_OBSERVATIONS signals, fall back to the
 * industry profile. When there's no industry profile, fall back to a generic
 * B2B template (Tue–Thu, 10am–11am local).
 *
 * We always translate from the lead's local time to UTC via a passed offset
 * (minutes east of UTC). Pure math — no tz library dependency.
 */

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun, 6=Sat

export interface EngagementDatum {
  /** UTC timestamp of the engagement. */
  at: string;
  /** The lead's IANA UTC offset in minutes at that time. */
  utcOffsetMinutes: number;
  /** What happened — 1pt, 2pts, 3pts respectively. */
  kind: "delivered" | "opened" | "replied";
}

export interface SendTimeHint {
  /** 0–6 */
  dayOfWeek: DayOfWeek;
  /** 0–23 local hour. */
  hourLocal: number;
  /** UTC hour. */
  hourUtc: number;
  /** 0–1 strength of this recommendation. 1 = maximum confidence. */
  confidence: number;
  /** Why we picked this. */
  source: "lead_history" | "industry_profile" | "generic_default";
}

export interface IndustryProfile {
  /** Ranked best days — first element = best. */
  bestDays: DayOfWeek[];
  /** Ranked best local hours (0-23). */
  bestHoursLocal: number[];
}

const MIN_OBSERVATIONS = 6;

/**
 * Sensible per-industry defaults. Local time, targeting the recipient.
 * Derived from HubSpot / Outreach / GMass published benchmarks.
 */
export const INDUSTRY_SEND_PROFILES: Record<string, IndustryProfile> = {
  dental: { bestDays: [2, 3, 4], bestHoursLocal: [10, 14, 15] },
  legal: { bestDays: [2, 3, 4], bestHoursLocal: [10, 11, 15] },
  hvac: { bestDays: [1, 2, 3, 4], bestHoursLocal: [8, 16, 17] },
  medspa: { bestDays: [3, 4, 5], bestHoursLocal: [10, 11, 13] },
  roofing: { bestDays: [1, 2, 3], bestHoursLocal: [8, 17, 18] },
  real_estate: { bestDays: [1, 4, 6], bestHoursLocal: [11, 14, 18] },
  insurance: { bestDays: [2, 3, 4], bestHoursLocal: [10, 11, 14] },
  auto_repair: { bestDays: [1, 2, 3], bestHoursLocal: [8, 16, 17] },
  fitness: { bestDays: [0, 1, 2, 3], bestHoursLocal: [6, 18, 19] },
  restaurant: { bestDays: [2, 3, 4, 5], bestHoursLocal: [11, 16, 19] },
  saas: { bestDays: [2, 3, 4], bestHoursLocal: [10, 11, 14] },
  ecommerce: { bestDays: [1, 4, 6, 0], bestHoursLocal: [9, 12, 20] },
  financial_services: { bestDays: [2, 3, 4], bestHoursLocal: [9, 10, 14] },
  healthcare: { bestDays: [2, 3, 4], bestHoursLocal: [10, 11, 13] },
  mental_health: { bestDays: [1, 2, 3, 4], bestHoursLocal: [11, 14, 18] },
  senior_care: { bestDays: [1, 2, 3, 4], bestHoursLocal: [10, 11, 14] },
  childcare: { bestDays: [1, 2, 3], bestHoursLocal: [9, 12, 17] },
  catering: { bestDays: [1, 2, 3, 4], bestHoursLocal: [10, 14, 15] },
  accounting: { bestDays: [2, 3, 4], bestHoursLocal: [10, 11, 15] },
  nonprofit: { bestDays: [2, 3, 4], bestHoursLocal: [10, 11, 14] },
  general: { bestDays: [2, 3, 4], bestHoursLocal: [10, 11, 14] },
};

const GENERIC_DEFAULT: IndustryProfile = {
  bestDays: [2, 3, 4],
  bestHoursLocal: [10, 11, 14],
};

function weightFor(kind: EngagementDatum["kind"]): number {
  if (kind === "replied") return 3;
  if (kind === "opened") return 2;
  return 1;
}

/** Build the day/hour heat map from observations. Returns a Map<"dow-hour", weight>. */
function buildHeatMap(
  engagements: readonly EngagementDatum[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of engagements) {
    const d = new Date(e.at);
    if (Number.isNaN(d.getTime())) continue;
    // Convert UTC to local using the passed offset.
    const localMs = d.getTime() + e.utcOffsetMinutes * 60_000;
    const local = new Date(localMs);
    const dow = local.getUTCDay() as DayOfWeek;
    const hour = local.getUTCHours();
    const key = `${dow}-${hour}`;
    m.set(key, (m.get(key) ?? 0) + weightFor(e.kind));
  }
  return m;
}

export interface OptimizeSendTimeInput {
  engagements: readonly EngagementDatum[];
  industry?: string | null;
  /** Lead's UTC offset in minutes, east-of-UTC positive. Defaults to -300 (US/Eastern ST). */
  utcOffsetMinutes?: number;
}

/**
 * Compute the optimal send time hint.
 *
 * Returns lead-specific when data is rich enough; otherwise falls back to
 * industry profile, then generic template.
 */
export function optimizeSendTime(input: OptimizeSendTimeInput): SendTimeHint {
  const offset = input.utcOffsetMinutes ?? -300;
  if (input.engagements.length >= MIN_OBSERVATIONS) {
    const heat = buildHeatMap(input.engagements);
    let bestKey = "";
    let bestWeight = -1;
    let total = 0;
    for (const [key, w] of heat) {
      total += w;
      if (w > bestWeight) {
        bestWeight = w;
        bestKey = key;
      }
    }
    if (bestKey && bestWeight > 0) {
      const [dowStr, hourStr] = bestKey.split("-");
      const dow = Number(dowStr) as DayOfWeek;
      const hourLocal = Number(hourStr);
      const hourUtc = (hourLocal - offset / 60 + 24) % 24;
      const confidence = Math.min(1, bestWeight / Math.max(1, total));
      return {
        dayOfWeek: dow,
        hourLocal,
        hourUtc: Math.floor(hourUtc),
        confidence: Math.max(0.4, confidence),
        source: "lead_history",
      };
    }
  }

  // Industry fallback.
  const profile =
    (input.industry && INDUSTRY_SEND_PROFILES[input.industry]) || null;
  if (profile) {
    const dow = profile.bestDays[0];
    const hourLocal = profile.bestHoursLocal[0];
    const hourUtc = (hourLocal - offset / 60 + 24) % 24;
    return {
      dayOfWeek: dow,
      hourLocal,
      hourUtc: Math.floor(hourUtc),
      confidence: 0.5,
      source: "industry_profile",
    };
  }

  // Generic default.
  const dow = GENERIC_DEFAULT.bestDays[0];
  const hourLocal = GENERIC_DEFAULT.bestHoursLocal[0];
  const hourUtc = (hourLocal - offset / 60 + 24) % 24;
  return {
    dayOfWeek: dow,
    hourLocal,
    hourUtc: Math.floor(hourUtc),
    confidence: 0.3,
    source: "generic_default",
  };
}

/**
 * Given a "send from" moment, compute the next UTC ISO timestamp that
 * satisfies the SendTimeHint. Strict forward-only.
 */
export function nextSendSlot(
  hint: SendTimeHint,
  fromIso: string,
): string {
  const from = new Date(fromIso);
  if (Number.isNaN(from.getTime())) return fromIso;

  // Iterate forward up to 14 days to find the next matching (dow, hour).
  for (let i = 0; i < 14; i++) {
    const candidate = new Date(from.getTime() + i * 86_400_000);
    candidate.setUTCHours(hint.hourUtc, 0, 0, 0);
    if (candidate.getTime() <= from.getTime()) continue;
    if ((candidate.getUTCDay() as DayOfWeek) === hint.dayOfWeek) {
      return candidate.toISOString();
    }
  }
  return fromIso;
}
