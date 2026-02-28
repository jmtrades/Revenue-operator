/**
 * Universal Full-List Execution Mode — structured batch controller.
 * Segments by commitment probability, responsiveness, volatility. Prioritizes intelligently.
 * Respects rate ceilings. Bounded waves. Wire into hosted executor only.
 */

import type { CommitmentState } from "./commitment-score";

export interface LeadSegmentItem {
  workspace_id: string;
  thread_id?: string | null;
  work_unit_id?: string | null;
  commitmentState?: CommitmentState | null;
  last_activity_at?: string | null;
  intent_count_pending?: number;
  /** From commitment registry; used for commitment fatigue check. */
  broken_commitments_count?: number;
  /** From universal outcome taxonomy; used for prioritization and pause. */
  lastOutcomeType?: string | null;
  /** 0–100; used for pause when high. */
  hostilityScore?: number | null;
}

export interface BatchControllerInput {
  items: LeadSegmentItem[];
  /** Max items to return per wave */
  maxPerWave: number;
  /** Rate ceiling already consumed this cycle (e.g. message count) */
  rateConsumed: number;
  /** Rate ceiling limit */
  rateLimit: number;
  /** Cadence headroom: max contacts in window (e.g. 24h); skip wave if exceeded. */
  cadenceHeadroom?: number;
}

export interface BatchControllerOutput {
  /** Prioritized subset for this wave. Bounded by maxPerWave and rate headroom. */
  wave: LeadSegmentItem[];
  /** Whether to pause this cycle (e.g. risk spike) */
  pauseCycle: boolean;
}

const VOLATILITY_PAUSE_RATIO = 0.3;
const RISK_OUTCOME_TYPES = ["hostile", "legal_risk", "complaint"];

/**
 * Segment and prioritize leads. Deterministic.
 * Priority: 1) probabilityScore DESC 2) volatilityScore ASC 3) brokenCommitmentsCount ASC 4) lastOutcomeType != hostile.
 * Pause if >30% of wave has high volatility, or >30% has hostile/legal_risk/complaint.
 */
export function selectBatchWave(input: BatchControllerInput): BatchControllerOutput {
  const { items, maxPerWave, rateConsumed, rateLimit, cadenceHeadroom = 999 } = input;
  const headroom = Math.max(0, rateLimit - rateConsumed);
  const capByCadence = cadenceHeadroom > 0 ? Math.min(maxPerWave, cadenceHeadroom) : 0;
  const cap = Math.min(maxPerWave, headroom, items.length, capByCadence);

  const sorted = [...items].sort((a, b) => {
    const pa = a.commitmentState?.probabilityScore ?? 50;
    const pb = b.commitmentState?.probabilityScore ?? 50;
    if (pb !== pa) return pb - pa;
    const va = a.commitmentState?.volatilityScore ?? 0;
    const vb = b.commitmentState?.volatilityScore ?? 0;
    if (va !== vb) return va - vb;
    const ba = a.broken_commitments_count ?? 0;
    const bb = b.broken_commitments_count ?? 0;
    if (ba !== bb) return ba - bb;
    const hostileA = a.lastOutcomeType === "hostile" ? 1 : 0;
    const hostileB = b.lastOutcomeType === "hostile" ? 1 : 0;
    if (hostileA !== hostileB) return hostileA - hostileB;
    const ta = a.last_activity_at ?? "";
    const tb = b.last_activity_at ?? "";
    return tb.localeCompare(ta);
  });

  const wave = sorted.slice(0, cap);
  const highVolatilityCount = wave.filter((w) => (w.commitmentState?.volatilityScore ?? 0) >= 70).length;
  const riskOutcomeCount = wave.filter((w) =>
    w.lastOutcomeType && RISK_OUTCOME_TYPES.includes(w.lastOutcomeType)
  ).length;
  const pauseByVolatility = wave.length > 0 && highVolatilityCount / wave.length > VOLATILITY_PAUSE_RATIO;
  const pauseByOutcome = wave.length > 0 && riskOutcomeCount / wave.length > VOLATILITY_PAUSE_RATIO;
  const pauseCycle = pauseByVolatility || pauseByOutcome;

  return { wave, pauseCycle };
}
