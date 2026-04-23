/**
 * Phase 40 — Multi-touch attribution engine.
 *
 * Given a customer journey (ordered list of marketing/sales touches) and
 * an outcome (revenue, conversion, opportunity), allocates credit across
 * touches using one of seven industry-standard models plus a custom
 * position-weighted option.
 *
 * Models:
 *   - first_touch          100% to first
 *   - last_touch           100% to last
 *   - linear               equal split
 *   - u_shaped             40% first, 40% last, 20% split middle
 *   - w_shaped             30% first, 30% opp-create, 30% last, 10% middle
 *   - time_decay           half-life weighted (closer to close = more credit)
 *   - position_weighted    fully custom weights
 *
 * Pure. No DB. Deterministic given an ordered touch list.
 */

export type TouchType =
  | "paid_search"
  | "paid_social"
  | "organic_search"
  | "direct"
  | "referral"
  | "email"
  | "webinar"
  | "content_download"
  | "event"
  | "sdr_outbound"
  | "ae_outbound"
  | "inbound_form"
  | "partner"
  | "community"
  | "podcast"
  | "other";

export interface Touch {
  id: string;
  accountId: string;
  type: TouchType;
  /** Source (e.g., "google/cpc", "gong-podcast-ep-42"). */
  source?: string;
  /** ISO timestamp of the touch. */
  at: string;
  /** Optional campaign + ad group. */
  campaign?: string;
  /** Did this touch create an opportunity? (for W-shaped). */
  createdOpportunity?: boolean;
  /** Cost of the touch, if tracked (enables CAC calc). */
  cost?: number;
}

export interface OutcomeEvent {
  accountId: string;
  value: number; // revenue or converted ARR
  at: string;
  type: "opportunity" | "conversion" | "revenue";
}

export type AttributionModel =
  | "first_touch"
  | "last_touch"
  | "linear"
  | "u_shaped"
  | "w_shaped"
  | "time_decay"
  | "position_weighted";

export interface AttributionResult {
  model: AttributionModel;
  outcomeValue: number;
  allocations: Array<{
    touchId: string;
    type: TouchType;
    source?: string;
    at: string;
    weight: number; // 0..1
    credit: number; // weight * outcomeValue
  }>;
  channelSummary: Array<{
    channel: TouchType;
    credit: number;
    share: number;
    touchCount: number;
  }>;
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

function sortTouches(touches: Touch[]): Touch[] {
  return [...touches].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

function buildAllocations(
  touches: Touch[],
  weights: number[],
  value: number,
): AttributionResult["allocations"] {
  return touches.map((t, i) => ({
    touchId: t.id,
    type: t.type,
    source: t.source,
    at: t.at,
    weight: weights[i],
    credit: weights[i] * value,
  }));
}

function summarizeByChannel(
  allocations: AttributionResult["allocations"],
): AttributionResult["channelSummary"] {
  const map = new Map<TouchType, { credit: number; touchCount: number }>();
  const total = sum(allocations.map((a) => a.credit));
  for (const a of allocations) {
    if (!map.has(a.type)) map.set(a.type, { credit: 0, touchCount: 0 });
    const b = map.get(a.type)!;
    b.credit += a.credit;
    b.touchCount += 1;
  }
  const out: AttributionResult["channelSummary"] = [];
  for (const [channel, b] of map) {
    out.push({
      channel,
      credit: b.credit,
      share: total === 0 ? 0 : b.credit / total,
      touchCount: b.touchCount,
    });
  }
  return out.sort((a, b) => b.credit - a.credit);
}

// ----- Model implementations -----

function weightsFirstTouch(n: number): number[] {
  if (n === 0) return [];
  return [1, ...new Array(n - 1).fill(0)];
}

function weightsLastTouch(n: number): number[] {
  if (n === 0) return [];
  const w = new Array(n).fill(0);
  w[n - 1] = 1;
  return w;
}

function weightsLinear(n: number): number[] {
  if (n === 0) return [];
  return new Array(n).fill(1 / n);
}

function weightsUShaped(n: number): number[] {
  if (n === 0) return [];
  if (n === 1) return [1];
  if (n === 2) return [0.5, 0.5];
  const w = new Array(n).fill(0);
  w[0] = 0.4;
  w[n - 1] = 0.4;
  const middle = n - 2;
  const share = 0.2 / middle;
  for (let i = 1; i < n - 1; i++) w[i] = share;
  return w;
}

function weightsWShaped(touches: Touch[]): number[] {
  const n = touches.length;
  if (n === 0) return [];
  if (n === 1) return [1];
  if (n === 2) return [0.5, 0.5];

  // Find opportunity-create index.
  const oppIdx = touches.findIndex((t) => t.createdOpportunity);
  const idxSet = new Set<number>();
  idxSet.add(0);
  idxSet.add(n - 1);
  if (oppIdx !== -1 && oppIdx !== 0 && oppIdx !== n - 1) idxSet.add(oppIdx);

  const primaryCount = idxSet.size;
  const middleIdxs = touches.map((_, i) => i).filter((i) => !idxSet.has(i));
  const w = new Array(n).fill(0);
  // Distribute 90% across primary positions equally, 10% across middle.
  const primaryShare = 0.9 / primaryCount;
  for (const i of idxSet) w[i] = primaryShare;
  if (middleIdxs.length > 0) {
    const mShare = 0.1 / middleIdxs.length;
    for (const i of middleIdxs) w[i] = mShare;
  } else {
    // Scale up primary to 1.0 if there are no middle touches.
    for (const i of idxSet) w[i] = 1 / primaryCount;
  }
  return w;
}

function weightsTimeDecay(
  touches: Touch[],
  outcomeAt: string,
  halfLifeDays: number,
): number[] {
  if (touches.length === 0) return [];
  const outcomeMs = new Date(outcomeAt).getTime();
  const raw = touches.map((t) => {
    const deltaDays = (outcomeMs - new Date(t.at).getTime()) / (1000 * 60 * 60 * 24);
    // Treat future touches (post-outcome) as 0 contribution.
    if (deltaDays < 0) return 0;
    return Math.pow(0.5, deltaDays / halfLifeDays);
  });
  const s = sum(raw);
  if (s === 0) return new Array(touches.length).fill(0);
  return raw.map((r) => r / s);
}

function weightsPositionWeighted(n: number, positionWeights: number[]): number[] {
  if (n === 0) return [];
  // positionWeights indexed by position; if shorter, fill trailing with last value or 0.
  const raw: number[] = [];
  for (let i = 0; i < n; i++) {
    const pos = i / Math.max(1, n - 1); // 0..1
    const idx = Math.min(positionWeights.length - 1, Math.floor(pos * (positionWeights.length - 1)));
    raw.push(positionWeights[idx] ?? 0);
  }
  const s = sum(raw);
  return s === 0 ? new Array(n).fill(1 / n) : raw.map((r) => r / s);
}

// ----- Public API -----

export interface AttributionOptions {
  model: AttributionModel;
  /** Outcome value + time — required for time_decay. */
  outcome: OutcomeEvent;
  /** Time decay half-life in days (default 7). */
  halfLifeDays?: number;
  /** Weights for position_weighted (0..∞, any length). */
  positionWeights?: number[];
}

export function attributeOutcome(
  touches: Touch[],
  options: AttributionOptions,
): AttributionResult {
  // Filter out touches that occurred AFTER the outcome event.
  const outcomeMs = new Date(options.outcome.at).getTime();
  const eligible = sortTouches(touches).filter(
    (t) => new Date(t.at).getTime() <= outcomeMs,
  );

  let weights: number[];
  switch (options.model) {
    case "first_touch":
      weights = weightsFirstTouch(eligible.length);
      break;
    case "last_touch":
      weights = weightsLastTouch(eligible.length);
      break;
    case "linear":
      weights = weightsLinear(eligible.length);
      break;
    case "u_shaped":
      weights = weightsUShaped(eligible.length);
      break;
    case "w_shaped":
      weights = weightsWShaped(eligible);
      break;
    case "time_decay":
      weights = weightsTimeDecay(eligible, options.outcome.at, options.halfLifeDays ?? 7);
      break;
    case "position_weighted":
      weights = weightsPositionWeighted(eligible.length, options.positionWeights ?? [1]);
      break;
    default:
      weights = weightsLinear(eligible.length);
  }

  const allocations = buildAllocations(eligible, weights, options.outcome.value);
  const channelSummary = summarizeByChannel(allocations);

  return {
    model: options.model,
    outcomeValue: options.outcome.value,
    allocations,
    channelSummary,
  };
}

/**
 * Compare multiple models side-by-side so marketing leaders can see channel
 * credit shift as model changes.
 */
export function compareAttributionModels(
  touches: Touch[],
  outcome: OutcomeEvent,
  models: AttributionModel[],
): {
  byModel: Record<AttributionModel, AttributionResult>;
  channelSwing: Array<{
    channel: TouchType;
    byModel: Record<AttributionModel, number>;
    min: number;
    max: number;
    swingPct: number;
  }>;
} {
  const byModel: Record<string, AttributionResult> = {};
  for (const m of models) {
    byModel[m] = attributeOutcome(touches, { model: m, outcome });
  }
  const channels = new Set<TouchType>();
  for (const m of models) {
    for (const c of byModel[m].channelSummary) channels.add(c.channel);
  }
  const swing: Array<{ channel: TouchType; byModel: Record<string, number>; min: number; max: number; swingPct: number }> = [];
  for (const ch of channels) {
    const row: Record<string, number> = {};
    for (const m of models) {
      const entry = byModel[m].channelSummary.find((c) => c.channel === ch);
      row[m] = entry ? entry.credit : 0;
    }
    const values = Object.values(row);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const base = max === 0 ? 1 : max;
    swing.push({ channel: ch, byModel: row, min, max, swingPct: (max - min) / base });
  }
  swing.sort((a, b) => b.swingPct - a.swingPct);
  return { byModel: byModel as Record<AttributionModel, AttributionResult>, channelSwing: swing };
}

/**
 * Channel-level ROI rollup across many attributions.
 */
export function channelROIRollup(
  attributions: AttributionResult[],
  touchCosts: Map<string, number>, // touchId -> cost
): Array<{
  channel: TouchType;
  credit: number;
  cost: number;
  roi: number; // (credit - cost) / cost
  touches: number;
}> {
  const map = new Map<TouchType, { credit: number; cost: number; touches: number }>();
  for (const a of attributions) {
    for (const alloc of a.allocations) {
      if (!map.has(alloc.type)) map.set(alloc.type, { credit: 0, cost: 0, touches: 0 });
      const b = map.get(alloc.type)!;
      b.credit += alloc.credit;
      b.touches += 1;
      b.cost += touchCosts.get(alloc.touchId) ?? 0;
    }
  }
  const out: Array<{ channel: TouchType; credit: number; cost: number; roi: number; touches: number }> = [];
  for (const [channel, b] of map) {
    const roi = b.cost === 0 ? (b.credit > 0 ? Infinity : 0) : (b.credit - b.cost) / b.cost;
    out.push({ channel, credit: b.credit, cost: b.cost, roi, touches: b.touches });
  }
  return out.sort((a, b) => b.roi - a.roi);
}
