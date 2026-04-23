/**
 * Revenue-core feedback loop + learned-weight fitter.
 *
 * Replaces hand-picked logistic weights and hand-picked kernel bandwidths
 * with ones fit from history. Everything is a pure, deterministic function
 * so a frozen-weight snapshot can be checked into Git and reproduced
 * bit-for-bit in CI.
 *
 * Routines:
 *   - `fitLogisticWeights`    — L2-regularized batch logistic regression via
 *                               gradient descent with line-search fallback.
 *   - `selectKernelBandwidth` — leave-one-out cross-validation over a grid
 *                               of bandwidths for 1D Gaussian kernel regression.
 *   - `ingestOutcomeEvents`   — builds labeled training rows from raw
 *                               won/lost/retained/churned events; enforces
 *                               dedup and chronological ordering.
 */

import type { ISODate } from "./primitives";

// -----------------------------------------------------------------------------
// Outcome events & training-row ingest
// -----------------------------------------------------------------------------

export type OutcomeKind =
  | "deal_won"
  | "deal_lost"
  | "renewal_retained"
  | "renewal_churned";

export interface OutcomeEvent {
  readonly kind: OutcomeKind;
  readonly subjectId: string;
  readonly asOfIso: ISODate | string;
  readonly features: Record<string, number>;
  /** Optional event id for dedup; if absent, (kind, subjectId, asOfIso) is used. */
  readonly eventId?: string;
  /** Optional override weight (e.g. deal size). */
  readonly weight?: number;
}

export interface LabeledRow {
  readonly subjectId: string;
  readonly asOfIso: string;
  readonly features: Record<string, number>;
  readonly y: 0 | 1;
  readonly weight: number;
}

const POSITIVE_KINDS: readonly OutcomeKind[] = ["deal_won", "renewal_retained"];

/**
 * Build ML-ready labeled rows from outcome events. De-duplicates by
 * `eventId` (or fallback composite), drops rows with non-finite features,
 * and sorts chronologically so walk-forward backtests are deterministic.
 */
export function ingestOutcomeEvents(
  events: ReadonlyArray<OutcomeEvent>,
): ReadonlyArray<LabeledRow> {
  const seen = new Set<string>();
  const out: LabeledRow[] = [];
  for (const e of events) {
    const key = e.eventId ?? `${e.kind}::${e.subjectId}::${e.asOfIso}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const featureEntries = Object.entries(e.features);
    const allFinite = featureEntries.every(([, v]) => Number.isFinite(v));
    if (!allFinite) continue;
    const y: 0 | 1 = POSITIVE_KINDS.includes(e.kind) ? 1 : 0;
    const weight =
      e.weight == null || !Number.isFinite(e.weight) || e.weight < 0
        ? 1
        : e.weight;
    out.push({
      subjectId: e.subjectId,
      asOfIso: String(e.asOfIso),
      features: Object.fromEntries(featureEntries),
      y,
      weight,
    });
  }
  out.sort((a, b) => {
    const ta = new Date(a.asOfIso).getTime();
    const tb = new Date(b.asOfIso).getTime();
    if (ta !== tb) return ta - tb;
    return a.subjectId.localeCompare(b.subjectId);
  });
  return out;
}

// -----------------------------------------------------------------------------
// Logistic regression (L2-regularized) fit by batch gradient descent
// -----------------------------------------------------------------------------

export interface LogisticFitOptions {
  /** Feature names in the order weights should appear. */
  readonly featureNames: ReadonlyArray<string>;
  /** L2 penalty (λ). 0 = unregularized. */
  readonly l2?: number;
  /** Max iterations. */
  readonly maxIter?: number;
  /** Convergence tol on parameter delta ∞-norm. */
  readonly tol?: number;
  /** Initial learning rate; halved on non-descent step. */
  readonly learningRate?: number;
  /** Fit an intercept (default true). */
  readonly fitIntercept?: boolean;
}

export interface LogisticFit {
  readonly featureNames: ReadonlyArray<string>;
  readonly intercept: number;
  readonly coefficients: Record<string, number>;
  readonly iterations: number;
  readonly converged: boolean;
  readonly finalLoss: number;
}

function sigmoid(z: number): number {
  if (z >= 40) return 1;
  if (z <= -40) return 0;
  return 1 / (1 + Math.exp(-z));
}

function vectorize(
  rows: ReadonlyArray<LabeledRow>,
  featureNames: ReadonlyArray<string>,
): { X: number[][]; y: number[]; w: number[] } {
  const X: number[][] = [];
  const y: number[] = [];
  const w: number[] = [];
  for (const r of rows) {
    const vec: number[] = new Array(featureNames.length);
    for (let j = 0; j < featureNames.length; j++) {
      const v = r.features[featureNames[j]];
      vec[j] = Number.isFinite(v) ? v : 0;
    }
    X.push(vec);
    y.push(r.y);
    w.push(r.weight ?? 1);
  }
  return { X, y, w };
}

function logisticLoss(
  X: number[][],
  y: number[],
  w: number[],
  beta: number[],
  intercept: number,
  l2: number,
): number {
  const n = X.length;
  const d = beta.length;
  let loss = 0;
  let wSum = 0;
  for (let i = 0; i < n; i++) {
    let z = intercept;
    for (let j = 0; j < d; j++) z += beta[j] * X[i][j];
    const p = sigmoid(z);
    const eps = 1e-12;
    const pClip = Math.max(eps, Math.min(1 - eps, p));
    loss += w[i] * -(y[i] * Math.log(pClip) + (1 - y[i]) * Math.log(1 - pClip));
    wSum += w[i];
  }
  let reg = 0;
  for (let j = 0; j < d; j++) reg += beta[j] * beta[j];
  return loss / Math.max(1, wSum) + (l2 * reg) / 2;
}

export function fitLogisticWeights(
  rows: ReadonlyArray<LabeledRow>,
  opts: LogisticFitOptions,
): LogisticFit {
  if (rows.length === 0) throw new Error("fitLogisticWeights: no rows");
  const l2 = opts.l2 ?? 0.01;
  const maxIter = opts.maxIter ?? 500;
  const tol = opts.tol ?? 1e-6;
  let lr = opts.learningRate ?? 0.5;
  const fitIntercept = opts.fitIntercept ?? true;
  const { X, y, w } = vectorize(rows, opts.featureNames);
  const d = opts.featureNames.length;
  const beta = new Array<number>(d).fill(0);
  let intercept = 0;

  let loss = logisticLoss(X, y, w, beta, intercept, l2);
  let converged = false;
  let iter = 0;
  for (; iter < maxIter; iter++) {
    const gradBeta = new Array<number>(d).fill(0);
    let gradIntercept = 0;
    let wSum = 0;
    for (let i = 0; i < X.length; i++) {
      let z = intercept;
      for (let j = 0; j < d; j++) z += beta[j] * X[i][j];
      const p = sigmoid(z);
      const err = w[i] * (p - y[i]);
      if (fitIntercept) gradIntercept += err;
      for (let j = 0; j < d; j++) gradBeta[j] += err * X[i][j];
      wSum += w[i];
    }
    const denom = Math.max(1, wSum);
    for (let j = 0; j < d; j++) gradBeta[j] = gradBeta[j] / denom + l2 * beta[j];
    gradIntercept = gradIntercept / denom;

    // Line search: halve lr until loss decreases.
    let step = lr;
    let newBeta = beta.slice();
    let newIntercept = intercept;
    let newLoss = Number.POSITIVE_INFINITY;
    for (let ls = 0; ls < 20; ls++) {
      newBeta = beta.map((b, j) => b - step * gradBeta[j]);
      newIntercept = fitIntercept ? intercept - step * gradIntercept : intercept;
      newLoss = logisticLoss(X, y, w, newBeta, newIntercept, l2);
      if (newLoss < loss - 1e-12) break;
      step /= 2;
    }
    const maxDelta = Math.max(
      ...newBeta.map((b, j) => Math.abs(b - beta[j])),
      fitIntercept ? Math.abs(newIntercept - intercept) : 0,
    );
    for (let j = 0; j < d; j++) beta[j] = newBeta[j];
    intercept = newIntercept;
    loss = newLoss;
    if (maxDelta < tol) {
      converged = true;
      break;
    }
    // Grow LR slightly on a successful full-step.
    if (step === lr) lr = Math.min(lr * 1.1, 2);
  }

  const coefficients: Record<string, number> = {};
  opts.featureNames.forEach((name, j) => {
    coefficients[name] = beta[j];
  });
  return {
    featureNames: opts.featureNames,
    intercept,
    coefficients,
    iterations: iter,
    converged,
    finalLoss: loss,
  };
}

/**
 * Score a feature row against a fit. Unknown features contribute 0, unknown
 * fit weights are ignored — forward-compatible with schema additions.
 */
export function scoreLogistic(
  fit: LogisticFit,
  features: Record<string, number>,
): number {
  let z = fit.intercept;
  for (const name of fit.featureNames) {
    const v = features[name];
    if (Number.isFinite(v)) z += fit.coefficients[name] * v;
  }
  return sigmoid(z);
}

// -----------------------------------------------------------------------------
// Kernel bandwidth selection (leave-one-out CV on 1D Gaussian kernel)
// -----------------------------------------------------------------------------

export interface BandwidthSelection {
  readonly bandwidth: number;
  readonly looRmse: number;
  readonly candidates: ReadonlyArray<{ readonly bandwidth: number; readonly rmse: number }>;
}

/**
 * Gaussian kernel weight: K(u) = exp(-0.5 * (u)^2).
 */
function gaussianWeight(dx: number, h: number): number {
  const u = dx / h;
  return Math.exp(-0.5 * u * u);
}

/**
 * 1D leave-one-out Nadaraya-Watson cross-validation RMSE.
 * Returns (1/n) Σ (y_i - ŷ_{-i})^2 evaluated for each bandwidth.
 */
export function selectKernelBandwidth(
  x: ReadonlyArray<number>,
  y: ReadonlyArray<number>,
  bandwidths: ReadonlyArray<number>,
): BandwidthSelection {
  if (x.length !== y.length) {
    throw new Error("selectKernelBandwidth: x/y length mismatch");
  }
  if (x.length < 3) {
    throw new Error("selectKernelBandwidth: need at least 3 points");
  }
  if (bandwidths.length === 0) {
    throw new Error("selectKernelBandwidth: empty bandwidth grid");
  }

  const candidates: Array<{ bandwidth: number; rmse: number }> = [];
  for (const h of bandwidths) {
    if (!(h > 0)) throw new Error(`selectKernelBandwidth: h must be > 0 (got ${h})`);
    let sqErr = 0;
    let usable = 0;
    for (let i = 0; i < x.length; i++) {
      let num = 0;
      let den = 0;
      for (let j = 0; j < x.length; j++) {
        if (j === i) continue;
        const w = gaussianWeight(x[i] - x[j], h);
        num += w * y[j];
        den += w;
      }
      if (den > 0) {
        const pred = num / den;
        const err = y[i] - pred;
        sqErr += err * err;
        usable++;
      }
    }
    const rmse = usable === 0 ? Number.POSITIVE_INFINITY : Math.sqrt(sqErr / usable);
    candidates.push({ bandwidth: h, rmse });
  }
  candidates.sort((a, b) => a.rmse - b.rmse);
  return {
    bandwidth: candidates[0].bandwidth,
    looRmse: candidates[0].rmse,
    candidates: candidates.slice().sort((a, b) => a.bandwidth - b.bandwidth),
  };
}
