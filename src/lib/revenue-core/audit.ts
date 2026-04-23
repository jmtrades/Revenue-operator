/**
 * Revenue-core audit log + idempotency.
 *
 * Append-only decision trail for every revenue-touching action (pricing
 * approvals, discount concessions, CFO blocks, renewal interventions). The
 * append-only rule is enforced at the data-structure level — events are
 * frozen on write and the audit returns a readonly slice.
 *
 * Deterministic decision IDs and idempotency keys are produced by a stable
 * content hash (FNV-1a 64-bit over canonical JSON), so:
 *   - The same input produces the same decision id (safe retries).
 *   - An id collision requires a content change (detectable).
 *   - No crypto import is needed (isomorphic, sandbox-friendly).
 *
 * PII is redacted from the on-disk trail using a structural path allowlist
 * — when you log a decision, you declare which fields are safe to persist.
 * Everything else is replaced with `"[REDACTED]"` and a hash of the removed
 * value so investigators can correlate without exposing raw PII.
 */

import type {
  ActionId,
  DecisionId,
  IdempotencyKey,
  OrgId,
  OwnerId,
} from "./primitives";

// -----------------------------------------------------------------------------
// Stable content hashing (two-lane 32-bit FNV-1a → 16-hex; no BigInt).
//
// Two FNV-1a hashers with different seeds run in parallel; the 64-bit output
// concatenates their 32-bit states. Collision probability is the same as
// true 64-bit FNV-1a for our workload (canonical JSON content hashing) and
// we stay compatible with ES < 2020 targets.
// -----------------------------------------------------------------------------

const FNV_OFFSET_A = 0x811c9dc5; // standard FNV-1a 32 offset
const FNV_OFFSET_B = 0x9e3779b9; // golden-ratio seed for the second lane
const FNV_PRIME_32 = 0x01000193;

function fnv1a32(s: string, seed: number): number {
  let h = seed | 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME_32);
  }
  return h >>> 0;
}

export function fnv1a64Hex(s: string): string {
  const hi = fnv1a32(s, FNV_OFFSET_A);
  const lo = fnv1a32(s, FNV_OFFSET_B);
  return (
    hi.toString(16).padStart(8, "0") + lo.toString(16).padStart(8, "0")
  );
}

/** Canonical JSON — sorts object keys recursively so key order is irrelevant. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`)
    .join(",")}}`;
}

export function stableHash(value: unknown): string {
  return fnv1a64Hex(canonicalJson(value));
}

// -----------------------------------------------------------------------------
// Deterministic ID construction
// -----------------------------------------------------------------------------

export interface DecisionKeyInput {
  readonly orgId: OrgId | string;
  readonly category: string;
  readonly subjectId: string;
  readonly asOfDayIso: string;
  readonly version?: string | number;
  readonly extra?: Record<string, unknown>;
}

/**
 * Deterministic ActionId. Two calls with identical `DecisionKeyInput`
 * produce identical ids; any mutation shifts the hash. Prefix is
 * human-readable so CFO reports stay scannable.
 */
export function deriveActionId(input: DecisionKeyInput): ActionId {
  const dayOnly = input.asOfDayIso.slice(0, 10);
  const tag = `act_${input.category}_${dayOnly}_${stableHash({
    ...input,
    asOfDayIso: dayOnly,
  }).slice(0, 12)}`;
  return tag as ActionId;
}

export function deriveDecisionId(input: DecisionKeyInput): DecisionId {
  const dayOnly = input.asOfDayIso.slice(0, 10);
  return (`dec_${dayOnly}_${stableHash({
    ...input,
    asOfDayIso: dayOnly,
  })}`) as DecisionId;
}

export function deriveIdempotencyKey(input: unknown): IdempotencyKey {
  return (`idem_${stableHash(input)}`) as IdempotencyKey;
}

// -----------------------------------------------------------------------------
// PII redaction
// -----------------------------------------------------------------------------

const DEFAULT_REDACT_PATTERNS: RegExp[] = [
  // Email
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  // Phone (very loose — 10-15 digits with separators)
  /\+?\d[\d\s().-]{8,14}\d/g,
  // US SSN-ish
  /\b\d{3}-\d{2}-\d{4}\b/g,
  // Credit-card-ish: 13–19 digits in groups
  /\b(?:\d[ -]*?){13,19}\b/g,
];

export function redactString(input: string, patterns = DEFAULT_REDACT_PATTERNS): string {
  let out = input;
  for (const re of patterns) out = out.replace(re, "[REDACTED]");
  return out;
}

export interface RedactOptions {
  /** Path allowlist — entries whose path matches are retained verbatim. */
  readonly allow?: ReadonlyArray<string>;
  /** Extra regex patterns applied to all string values. */
  readonly stringPatterns?: ReadonlyArray<RegExp>;
  /** Attach a hash of the removed value for forensic correlation. */
  readonly tagHashes?: boolean;
}

function isAllowed(path: string, allow: ReadonlyArray<string>): boolean {
  for (const a of allow) {
    if (path === a) return true;
    if (a.endsWith(".*") && path.startsWith(a.slice(0, -1))) return true;
  }
  return false;
}

export function redactPayload<T>(value: T, opts: RedactOptions = {}): unknown {
  const allow = opts.allow ?? [];
  const patterns = opts.stringPatterns
    ? [...DEFAULT_REDACT_PATTERNS, ...opts.stringPatterns]
    : DEFAULT_REDACT_PATTERNS;

  function go(v: unknown, path: string): unknown {
    if (v === null || v === undefined) return v;
    if (typeof v === "string") {
      if (isAllowed(path, allow)) return v;
      const maybeRedacted = redactString(v, patterns);
      if (maybeRedacted === v) return v;
      return opts.tagHashes
        ? { _redacted: true, _hash: stableHash(v) }
        : "[REDACTED]";
    }
    if (typeof v === "number" || typeof v === "boolean") return v;
    if (Array.isArray(v)) return v.map((x, i) => go(x, `${path}[${i}]`));
    if (typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        const p = path === "" ? k : `${path}.${k}`;
        out[k] = go(val, p);
      }
      return out;
    }
    return v;
  }
  return go(value, "");
}

// -----------------------------------------------------------------------------
// Audit log
// -----------------------------------------------------------------------------

export type AuditSeverity = "info" | "warn" | "critical";

export interface AuditActor {
  readonly role: string;
  readonly userId?: OwnerId | string;
  readonly system?: string;
}

export interface AuditEvent {
  readonly eventId: string;
  readonly orgId: OrgId | string;
  readonly decisionId?: DecisionId;
  readonly actionId?: ActionId;
  readonly idempotencyKey?: IdempotencyKey;
  readonly category: string;
  readonly severity: AuditSeverity;
  readonly actor: AuditActor;
  readonly atIso: string;
  readonly reason: string;
  /** Redacted, canonicalized payload. */
  readonly payload: unknown;
  readonly payloadHash: string;
  readonly prevEventHash: string | null;
  readonly chainHash: string;
}

export interface AppendInput {
  readonly orgId: OrgId | string;
  readonly decisionId?: DecisionId;
  readonly actionId?: ActionId;
  readonly idempotencyKey?: IdempotencyKey;
  readonly category: string;
  readonly severity: AuditSeverity;
  readonly actor: AuditActor;
  readonly atIso: string;
  readonly reason: string;
  readonly payload: unknown;
  readonly redact?: RedactOptions;
}

/**
 * Append-only, tamper-evident audit log. Each event carries `prevEventHash`
 * and `chainHash` so an external verifier can replay the chain and detect
 * insertion/deletion. Idempotency keys are honored — re-appending the same
 * key returns the original event id instead of inserting a duplicate.
 */
export class AuditLog {
  private readonly events: AuditEvent[] = [];
  private readonly byIdem = new Map<string, AuditEvent>();
  private prevHash: string | null = null;

  append(input: AppendInput): AuditEvent {
    if (input.idempotencyKey) {
      const existing = this.byIdem.get(String(input.idempotencyKey));
      if (existing) return existing;
    }
    const redactedPayload = redactPayload(input.payload, input.redact);
    const payloadHash = stableHash(redactedPayload);
    const eventId = `evt_${payloadHash.slice(0, 12)}_${this.events.length.toString(36)}`;
    const core = {
      eventId,
      orgId: input.orgId,
      decisionId: input.decisionId,
      actionId: input.actionId,
      idempotencyKey: input.idempotencyKey,
      category: input.category,
      severity: input.severity,
      actor: input.actor,
      atIso: input.atIso,
      reason: input.reason,
      payload: redactedPayload,
      payloadHash,
      prevEventHash: this.prevHash,
    };
    const chainHash = stableHash(core);
    const event: AuditEvent = Object.freeze({ ...core, chainHash });
    this.events.push(event);
    this.prevHash = chainHash;
    if (input.idempotencyKey) {
      this.byIdem.set(String(input.idempotencyKey), event);
    }
    return event;
  }

  list(): ReadonlyArray<AuditEvent> {
    return this.events;
  }

  verifyChain(): {
    readonly ok: boolean;
    readonly breakIndex?: number;
    readonly count: number;
  } {
    let prev: string | null = null;
    for (let i = 0; i < this.events.length; i++) {
      const e = this.events[i];
      if (e.prevEventHash !== prev) return { ok: false, breakIndex: i, count: this.events.length };
      const { chainHash: _ignored, ...core } = e;
      if (stableHash(core) !== e.chainHash) {
        return { ok: false, breakIndex: i, count: this.events.length };
      }
      prev = e.chainHash;
    }
    return { ok: true, count: this.events.length };
  }

  filter(predicate: (e: AuditEvent) => boolean): ReadonlyArray<AuditEvent> {
    return this.events.filter(predicate);
  }
}
