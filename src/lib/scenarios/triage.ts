/**
 * Deterministic triage classifier. Structured input only. No GPT. No freeform.
 */

export type TriageReason =
  | "scheduling"
  | "pricing"
  | "complaint"
  | "cancellation"
  | "info_request"
  | "unknown"
  | "compliance_risk"
  | "hostile"
  | "payment"
  | "routing"
  | "refund_request"
  | "legal_threat"
  | "data_request"
  | "opt_out"
  | "dispute"
  | "technical_issue";

export interface TriageInput {
  /** Pre-classified intent or raw hint */
  intent_type?: string | null;
  risk_flags?: string[] | null;
  /** Last channel used */
  last_channel?: string | null;
  /** Structured outcome metadata if any */
  outcome_metadata?: Record<string, unknown> | null;
}

const SCHEDULING_KEYWORDS = ["schedule", "appointment", "book", "calendar", "availability", "slot", "reschedule"];
const PRICING_KEYWORDS = ["price", "cost", "quote", "rate", "fee", "how much"];
const COMPLAINT_KEYWORDS = ["complaint", "unhappy", "disappointed", "issue", "problem", "wrong"];
const CANCELLATION_KEYWORDS = ["cancel", "cancellation", "refund", "stop"];
const PAYMENT_KEYWORDS = ["payment", "pay", "invoice", "bill", "outstanding"];
const REFUND_KEYWORDS = ["refund", "money back", "reimburse"];
const LEGAL_THREAT_KEYWORDS = ["lawyer", "sue", "legal", "court", "solicitor"];
const DATA_REQUEST_KEYWORDS = ["gdpr", "data request", "my data", "delete my data", "personal data"];
const OPT_OUT_KEYWORDS = ["unsubscribe", "opt out", "stop contacting", "remove me"];
const DISPUTE_KEYWORDS = ["dispute", "chargeback", "disagree", "incorrect charge"];
const TECHNICAL_KEYWORDS = ["not working", "bug", "error", "technical issue", "can't access"];
const HOSTILE_FLAGS = ["anger", "aggressive", "hostile", "abusive"];
const COMPLIANCE_FLAGS = ["legal_sensitivity", "opt_out_signal", "compliance"];

/**
 * Classify triage reason from structured input only. Deterministic.
 * Unknown → routing (safe); never improvise.
 */
export function resolveTriageReason(input: TriageInput): { triage_reason: TriageReason; recommended_primary: "qualify" | "route" | "escalate" } {
  const intent = (input.intent_type ?? "").toLowerCase();
  const flags = input.risk_flags ?? [];
  const meta = input.outcome_metadata ?? {};
  const metaStr = JSON.stringify(meta).toLowerCase();

  for (const f of flags) {
    if (HOSTILE_FLAGS.some((h) => f.toLowerCase().includes(h))) {
      return { triage_reason: "hostile", recommended_primary: "escalate" };
    }
    if (COMPLIANCE_FLAGS.some((c) => f.toLowerCase().includes(c))) {
      return { triage_reason: "compliance_risk", recommended_primary: "escalate" };
    }
  }

  const combined = `${intent} ${metaStr}`;
  for (const k of REFUND_KEYWORDS) {
    if (combined.includes(k)) return { triage_reason: "refund_request", recommended_primary: "route" };
  }
  for (const k of LEGAL_THREAT_KEYWORDS) {
    if (combined.includes(k)) return { triage_reason: "legal_threat", recommended_primary: "escalate" };
  }
  for (const k of DATA_REQUEST_KEYWORDS) {
    if (combined.includes(k)) return { triage_reason: "data_request", recommended_primary: "escalate" };
  }
  for (const k of OPT_OUT_KEYWORDS) {
    if (combined.includes(k)) return { triage_reason: "opt_out", recommended_primary: "route" };
  }
  for (const k of DISPUTE_KEYWORDS) {
    if (combined.includes(k)) return { triage_reason: "dispute", recommended_primary: "route" };
  }
  for (const k of TECHNICAL_KEYWORDS) {
    if (combined.includes(k)) return { triage_reason: "technical_issue", recommended_primary: "qualify" };
  }
  for (const k of SCHEDULING_KEYWORDS) {
    if (combined.includes(k)) return { triage_reason: "scheduling", recommended_primary: "qualify" };
  }
  for (const k of PRICING_KEYWORDS) {
    if (combined.includes(k)) return { triage_reason: "pricing", recommended_primary: "qualify" };
  }
  for (const k of COMPLAINT_KEYWORDS) {
    if (combined.includes(k)) return { triage_reason: "complaint", recommended_primary: "escalate" };
  }
  for (const k of CANCELLATION_KEYWORDS) {
    if (combined.includes(k)) return { triage_reason: "cancellation", recommended_primary: "route" };
  }
  for (const k of PAYMENT_KEYWORDS) {
    if (combined.includes(k)) return { triage_reason: "payment", recommended_primary: "qualify" };
  }

  if (intent === "info_request" || intent === "question" || intent === "clarifying_question") {
    return { triage_reason: "info_request", recommended_primary: "qualify" };
  }

  return { triage_reason: "unknown", recommended_primary: "route" };
}
