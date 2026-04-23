/**
 * Revenue-core safety & HITL (human-in-the-loop) guardrails.
 *
 * Three concerns, one module:
 *
 *   1. Text guardrails — strip / flag prompt-injection signatures, profanity,
 *      leaked secrets, and PII before any generated text lands in a CFO
 *      report, customer email, or pricing rationale.
 *
 *   2. High-stakes detection — classify a decision as low/medium/high/critical
 *      risk based on discount size, annual value, approval chain depth, and
 *      whether a CFO block is implied. Ties directly into planActions so
 *      high-risk items get HITL approval instead of auto-advancing.
 *
 *   3. HITL approval ledger — opens approval requests with TTLs, records
 *      approvals/denials/overrides, tracks the reason, and computes
 *      escalation when a timer expires.
 */

import { deriveIdempotencyKey, stableHash } from "./audit";

// -----------------------------------------------------------------------------
// Text guardrails
// -----------------------------------------------------------------------------

export interface GuardrailHit {
  readonly kind:
    | "pii_email"
    | "pii_phone"
    | "pii_ssn"
    | "pii_credit_card"
    | "secret_api_key"
    | "prompt_injection"
    | "profanity"
    | "code_block_leak";
  readonly match: string;
  readonly start: number;
  readonly end: number;
}

export interface TextGuardResult {
  readonly hits: ReadonlyArray<GuardrailHit>;
  readonly cleaned: string;
  readonly safe: boolean;
}

const PATTERNS: Array<{ kind: GuardrailHit["kind"]; re: RegExp }> = [
  { kind: "pii_email", re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { kind: "pii_ssn", re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { kind: "pii_credit_card", re: /\b(?:\d[ -]*?){13,19}\b/g },
  { kind: "pii_phone", re: /\+?\d[\d\s().-]{8,14}\d/g },
  { kind: "secret_api_key", re: /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  {
    kind: "prompt_injection",
    re: /\b(ignore (?:previous|all) instructions|system prompt|developer mode|jailbreak)\b/gi,
  },
  { kind: "code_block_leak", re: /-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END[^\n]*-----/g },
];

/** Small, deliberate list — customers can extend per-locale. */
const PROFANITY = /\b(fuck(?:ing|ed|er|s)?|shit(?:ty|s)?|bitch(?:es|ing|y)?|asshole|bastard)\b/gi;

export function guardText(input: string, extraProfanity?: RegExp): TextGuardResult {
  const hits: GuardrailHit[] = [];
  let cleaned = input;
  for (const { kind, re } of PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(input)) !== null) {
      hits.push({ kind, match: m[0], start: m.index, end: m.index + m[0].length });
      if (m[0].length === 0) re.lastIndex++; // avoid infinite loop on zero-width
    }
    cleaned = cleaned.replace(re, "[REDACTED]");
  }
  const prof = extraProfanity ?? PROFANITY;
  prof.lastIndex = 0;
  let pm: RegExpExecArray | null;
  while ((pm = prof.exec(input)) !== null) {
    hits.push({
      kind: "profanity",
      match: pm[0],
      start: pm.index,
      end: pm.index + pm[0].length,
    });
  }
  cleaned = cleaned.replace(prof, "****");
  return {
    hits,
    cleaned,
    safe:
      hits.length === 0 ||
      hits.every((h) => h.kind === "profanity"), // cleanable cases
  };
}

// -----------------------------------------------------------------------------
// High-stakes decision classifier
// -----------------------------------------------------------------------------

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface DecisionRisk {
  readonly level: RiskLevel;
  readonly reasons: ReadonlyArray<string>;
  readonly requiresHITL: boolean;
  readonly requiredRole: "rep" | "manager" | "director" | "vp" | "cro" | "cfo";
  readonly ttlMinutes: number;
}

export interface DecisionInputs {
  readonly discountPct?: number;
  readonly annualValueUsd?: number;
  readonly isRenewal?: boolean;
  readonly touchesCfoBlock?: boolean;
  readonly unusualTerms?: boolean;
  readonly newMarket?: boolean;
  readonly arrAtRiskUsd?: number;
}

/**
 * Classification is rule-based by design — policies like "discounts > 30%
 * go to the VP" are business decisions, not ML outputs. The rules produce a
 * deterministic (level, reasons) pair with a default TTL and required role
 * so HITL workflows can use them as-is.
 */
export function classifyDecision(input: DecisionInputs): DecisionRisk {
  const reasons: string[] = [];
  let level: RiskLevel = "low";
  let role: DecisionRisk["requiredRole"] = "rep";
  let ttl = 24 * 60;

  if (input.discountPct != null) {
    if (input.discountPct > 0.4) {
      level = "critical";
      role = "cfo";
      ttl = 4 * 60;
      reasons.push(`discount ${(input.discountPct * 100).toFixed(0)}% > 40% threshold`);
    } else if (input.discountPct > 0.3) {
      level = "high";
      role = "cro";
      ttl = 8 * 60;
      reasons.push(`discount ${(input.discountPct * 100).toFixed(0)}% > 30% threshold`);
    } else if (input.discountPct > 0.2) {
      level = levelMax(level, "medium");
      role = hier(role, "vp");
      ttl = Math.min(ttl, 12 * 60);
      reasons.push(`discount ${(input.discountPct * 100).toFixed(0)}% > 20% threshold`);
    } else if (input.discountPct > 0.1) {
      level = levelMax(level, "medium");
      role = hier(role, "director");
      reasons.push(`discount ${(input.discountPct * 100).toFixed(0)}% > 10% threshold`);
    }
  }

  if (input.annualValueUsd != null) {
    if (input.annualValueUsd >= 1_000_000) {
      level = levelMax(level, "high");
      role = hier(role, "cro");
      ttl = Math.min(ttl, 8 * 60);
      reasons.push("ACV ≥ $1M");
    } else if (input.annualValueUsd >= 250_000) {
      level = levelMax(level, "medium");
      role = hier(role, "vp");
      reasons.push("ACV ≥ $250k");
    }
  }

  if (input.arrAtRiskUsd != null && input.arrAtRiskUsd >= 500_000) {
    level = levelMax(level, "high");
    role = hier(role, "cro");
    ttl = Math.min(ttl, 8 * 60);
    reasons.push("ARR at risk ≥ $500k");
  }

  if (input.touchesCfoBlock) {
    level = "critical";
    role = "cfo";
    ttl = Math.min(ttl, 4 * 60);
    reasons.push("touches CFO-block policy");
  }

  if (input.unusualTerms) {
    level = levelMax(level, "high");
    role = hier(role, "cro");
    reasons.push("non-standard contract terms");
  }

  if (input.newMarket) {
    level = levelMax(level, "medium");
    role = hier(role, "director");
    reasons.push("first deal in a new market");
  }

  return {
    level,
    reasons,
    requiresHITL: level !== "low",
    requiredRole: role,
    ttlMinutes: ttl,
  };
}

const LEVEL_RANK: Record<RiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};
function levelMax(a: RiskLevel, b: RiskLevel): RiskLevel {
  return LEVEL_RANK[b] > LEVEL_RANK[a] ? b : a;
}

const ROLE_RANK = {
  rep: 0,
  manager: 1,
  director: 2,
  vp: 3,
  cro: 4,
  cfo: 5,
} as const;
function hier(
  a: DecisionRisk["requiredRole"],
  b: DecisionRisk["requiredRole"],
): DecisionRisk["requiredRole"] {
  return ROLE_RANK[b] > ROLE_RANK[a] ? b : a;
}

// -----------------------------------------------------------------------------
// HITL approval ledger
// -----------------------------------------------------------------------------

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "denied"
  | "expired"
  | "overridden";

export interface ApprovalRequest {
  readonly requestId: string;
  readonly idempotencyKey: string;
  readonly subjectId: string;
  readonly risk: DecisionRisk;
  readonly openedAtIso: string;
  readonly deadlineIso: string;
  status: ApprovalStatus;
  readonly actions: Array<{
    readonly atIso: string;
    readonly actor: string;
    readonly transition: ApprovalStatus;
    readonly reason?: string;
  }>;
}

export class ApprovalLedger {
  private readonly requests: ApprovalRequest[] = [];
  private readonly byIdem = new Map<string, ApprovalRequest>();

  open(params: {
    subjectId: string;
    risk: DecisionRisk;
    openedAtIso: string;
    payload?: unknown;
  }): ApprovalRequest {
    const key = String(
      deriveIdempotencyKey({
        subjectId: params.subjectId,
        risk: { level: params.risk.level, role: params.risk.requiredRole },
        day: params.openedAtIso.slice(0, 10),
        payloadHash: params.payload ? stableHash(params.payload) : undefined,
      }),
    );
    const existing = this.byIdem.get(key);
    if (existing) return existing;
    const deadline = new Date(
      new Date(params.openedAtIso).getTime() + params.risk.ttlMinutes * 60_000,
    ).toISOString();
    const req: ApprovalRequest = {
      requestId: `req_${stableHash({ key, t: params.openedAtIso }).slice(0, 12)}`,
      idempotencyKey: key,
      subjectId: params.subjectId,
      risk: params.risk,
      openedAtIso: params.openedAtIso,
      deadlineIso: deadline,
      status: "pending",
      actions: [],
    };
    this.requests.push(req);
    this.byIdem.set(key, req);
    return req;
  }

  transition(
    requestId: string,
    to: Exclude<ApprovalStatus, "pending">,
    actor: string,
    atIso: string,
    reason?: string,
  ): ApprovalRequest {
    const req = this.requests.find((r) => r.requestId === requestId);
    if (!req) throw new Error(`ApprovalLedger: unknown requestId ${requestId}`);
    if (req.status !== "pending" && req.status !== "expired") {
      throw new Error(
        `ApprovalLedger: cannot transition ${requestId} from ${req.status} to ${to}`,
      );
    }
    req.status = to;
    req.actions.push({ atIso, actor, transition: to, reason });
    return req;
  }

  /**
   * Returns all requests that have expired as of `nowIso`. Caller decides
   * what to do (escalate, auto-deny, notify). Mutates status to "expired"
   * the first time each is observed.
   */
  reapExpired(nowIso: string): ReadonlyArray<ApprovalRequest> {
    const now = new Date(nowIso).getTime();
    const expired: ApprovalRequest[] = [];
    for (const r of this.requests) {
      if (r.status !== "pending") continue;
      if (new Date(r.deadlineIso).getTime() <= now) {
        r.status = "expired";
        r.actions.push({ atIso: nowIso, actor: "_system", transition: "expired" });
        expired.push(r);
      }
    }
    return expired;
  }

  list(status?: ApprovalStatus): ReadonlyArray<ApprovalRequest> {
    return status ? this.requests.filter((r) => r.status === status) : this.requests;
  }
}
