/**
 * Revenue-core observability, reproducibility, and model versioning.
 *
 * All composers should tag their output with a `ModelVersion` so downstream
 * consumers can tell the difference between output from v1.3 of the churn
 * model and v1.4. This module provides:
 *
 *   - Frozen weight snapshots keyed by content hash (reproducibility).
 *   - A versioned model registry (no mutable global state — callers own it).
 *   - Latency histograms with P50/P95/P99 (HDR-style fixed buckets).
 *   - A cost meter that aggregates per-operation token / compute usage.
 *   - Deterministic seeded RNG helpers for any composer that was previously
 *     non-deterministic.
 */

import { stableHash } from "./audit";

// -----------------------------------------------------------------------------
// Model versioning & frozen-weight snapshots
// -----------------------------------------------------------------------------

export interface ModelVersion {
  readonly name: string;
  readonly semver: string;
  readonly weightHash: string;
  readonly frozenAtIso: string;
}

export interface ModelSnapshot<W> {
  readonly version: ModelVersion;
  readonly weights: Readonly<W>;
}

export class ModelRegistry<W> {
  private readonly snapshots = new Map<string, ModelSnapshot<W>>();
  private defaultKey: string | null = null;

  register(params: {
    name: string;
    semver: string;
    weights: W;
    frozenAtIso: string;
    setAsDefault?: boolean;
  }): ModelSnapshot<W> {
    const weightHash = stableHash(params.weights);
    const version: ModelVersion = Object.freeze({
      name: params.name,
      semver: params.semver,
      weightHash,
      frozenAtIso: params.frozenAtIso,
    });
    const snapshot: ModelSnapshot<W> = Object.freeze({
      version,
      weights: Object.freeze({ ...(params.weights as object) }) as Readonly<W>,
    });
    const key = `${params.name}@${params.semver}`;
    if (this.snapshots.has(key)) {
      const existing = this.snapshots.get(key)!;
      if (existing.version.weightHash !== weightHash) {
        throw new Error(
          `ModelRegistry: ${key} already registered with different weights (${existing.version.weightHash} vs ${weightHash})`,
        );
      }
      return existing;
    }
    this.snapshots.set(key, snapshot);
    if (params.setAsDefault || this.defaultKey === null) this.defaultKey = key;
    return snapshot;
  }

  get(key: string): ModelSnapshot<W> {
    const s = this.snapshots.get(key);
    if (!s) throw new Error(`ModelRegistry: unknown key ${key}`);
    return s;
  }

  getDefault(): ModelSnapshot<W> {
    if (!this.defaultKey) throw new Error(`ModelRegistry: no default set`);
    return this.get(this.defaultKey);
  }

  list(): ReadonlyArray<ModelSnapshot<W>> {
    return Array.from(this.snapshots.values());
  }
}

// -----------------------------------------------------------------------------
// Latency histogram
// -----------------------------------------------------------------------------

/**
 * Fixed exponential buckets (ms): 1, 2, 4, 8, ..., 32768.
 * Cheap to update, O(1) record, and P-percentiles are exact to bucket granularity.
 */
const LATENCY_BUCKETS_MS: ReadonlyArray<number> = [
  1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768,
];

export class LatencyHistogram {
  private readonly counts = new Array<number>(LATENCY_BUCKETS_MS.length + 1).fill(0);
  private _total = 0;
  private _sumMs = 0;
  private _maxMs = 0;

  record(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) return;
    this._total++;
    this._sumMs += ms;
    if (ms > this._maxMs) this._maxMs = ms;
    let idx = LATENCY_BUCKETS_MS.findIndex((b) => ms <= b);
    if (idx === -1) idx = LATENCY_BUCKETS_MS.length;
    this.counts[idx]++;
  }

  snapshot(): {
    count: number;
    meanMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    maxMs: number;
  } {
    if (this._total === 0) {
      return { count: 0, meanMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0, maxMs: 0 };
    }
    const target50 = this._total * 0.5;
    const target95 = this._total * 0.95;
    const target99 = this._total * 0.99;
    let cum = 0;
    let p50 = 0,
      p95 = 0,
      p99 = 0;
    for (let i = 0; i < this.counts.length; i++) {
      cum += this.counts[i];
      const upper =
        i < LATENCY_BUCKETS_MS.length ? LATENCY_BUCKETS_MS[i] : this._maxMs;
      if (p50 === 0 && cum >= target50) p50 = upper;
      if (p95 === 0 && cum >= target95) p95 = upper;
      if (p99 === 0 && cum >= target99) p99 = upper;
    }
    return {
      count: this._total,
      meanMs: this._sumMs / this._total,
      p50Ms: p50,
      p95Ms: p95,
      p99Ms: p99,
      maxMs: this._maxMs,
    };
  }
}

// -----------------------------------------------------------------------------
// Cost meter
// -----------------------------------------------------------------------------

export interface CostLine {
  readonly op: string;
  readonly unit: string;
  readonly quantity: number;
  readonly unitCostUsd: number;
}

export class CostMeter {
  private readonly lines: CostLine[] = [];

  record(line: CostLine): void {
    if (!Number.isFinite(line.quantity) || line.quantity < 0) return;
    if (!Number.isFinite(line.unitCostUsd) || line.unitCostUsd < 0) return;
    this.lines.push(line);
  }

  totalUsd(): number {
    return this.lines.reduce((s, l) => s + l.quantity * l.unitCostUsd, 0);
  }

  byOp(): ReadonlyArray<{
    op: string;
    quantity: number;
    usd: number;
  }> {
    const m = new Map<string, { quantity: number; usd: number }>();
    for (const l of this.lines) {
      const rec = m.get(l.op) ?? { quantity: 0, usd: 0 };
      rec.quantity += l.quantity;
      rec.usd += l.quantity * l.unitCostUsd;
      m.set(l.op, rec);
    }
    return Array.from(m.entries())
      .map(([op, v]) => ({ op, ...v }))
      .sort((a, b) => b.usd - a.usd);
  }

  lineCount(): number {
    return this.lines.length;
  }
}

// -----------------------------------------------------------------------------
// Deterministic RNG — for any composer that needs shuffling / sampling
// -----------------------------------------------------------------------------

export function seededRng(seed: number | string): () => number {
  let s: number;
  if (typeof seed === "string") {
    // FNV-1a 32-bit — keeps RNG state as a 32-bit int.
    let h = 0x811c9dc5;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    s = h | 0;
  } else {
    s = (seed | 0) || 0x12345678;
  }
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// -----------------------------------------------------------------------------
// Tagged output wrapper
// -----------------------------------------------------------------------------

/**
 * Wrap any composer output with (modelVersion, producedAtIso, latencyMs).
 * Consumers can filter metrics by version; ops can slice a latency histogram
 * by the tag.
 */
export function tagged<T>(params: {
  value: T;
  modelVersion: ModelVersion;
  producedAtIso: string;
  latencyMs?: number;
  seed?: number | string;
}): {
  readonly value: T;
  readonly modelVersion: ModelVersion;
  readonly producedAtIso: string;
  readonly latencyMs: number | null;
  readonly seed: string | null;
} {
  return Object.freeze({
    value: params.value,
    modelVersion: params.modelVersion,
    producedAtIso: params.producedAtIso,
    latencyMs: params.latencyMs ?? null,
    seed: params.seed === undefined ? null : String(params.seed),
  });
}
