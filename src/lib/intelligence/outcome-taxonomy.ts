/**
 * Universal Outcome Taxonomy — strict allowlist. No dynamic strings. No GPT. Deterministic only.
 */

export type OutcomeType =
  | "connected"
  | "no_answer"
  | "wrong_number"
  | "call_back_requested"
  | "information_provided"
  | "information_missing"
  | "payment_promised"
  | "payment_made"
  | "payment_failed"
  | "opted_out"
  | "complaint"
  | "refund_request"
  | "dispute"
  | "legal_risk"
  | "hostile"
  | "technical_issue"
  | "routed"
  | "escalation_required"
  | "appointment_confirmed"
  | "appointment_cancelled"
  | "followup_scheduled"
  | "no_show"
  | "unknown";

export type OutcomeConfidence = "low" | "medium" | "high";

export type NextRequiredAction =
  | "schedule_followup"
  | "request_disclosure_confirmation"
  | "escalate_to_human"
  | "pause_execution"
  | "record_commitment"
  | "none";

export const OUTCOME_TYPES: readonly OutcomeType[] = [
  "connected", "no_answer", "wrong_number", "call_back_requested", "information_provided",
  "information_missing", "payment_promised", "payment_made", "payment_failed", "opted_out",
  "complaint", "refund_request", "dispute", "legal_risk", "hostile", "technical_issue",
  "routed", "escalation_required", "appointment_confirmed", "appointment_cancelled",
  "followup_scheduled", "no_show", "unknown",
] as const;

export const NEXT_REQUIRED_ACTIONS: readonly NextRequiredAction[] = [
  "schedule_followup", "request_disclosure_confirmation", "escalate_to_human",
  "pause_execution", "record_commitment", "none",
] as const;

export interface ResolveUniversalOutcomeInput {
  /** Voice: connected | no_answer | voicemail | busy | failed | completed */
  voiceOutcome?: string | null;
  /** Message result */
  messageResultStatus?: "succeeded" | "failed" | "skipped" | null;
  consentRecorded?: boolean | null;
  disclosuresRead?: boolean | null;
  triageReason?: string | null;
  riskScore?: number;
  emotionalCategory?: string | null;
  paymentMade?: boolean | null;
  paymentPromised?: boolean | null;
  optOut?: boolean | null;
  legalKeywordPresent?: boolean | null;
  objectionChainCount?: number;
  brokenCommitmentsCount?: number;
  attemptCount?: number;
  maxAttemptsPerLead?: number;
  appointmentConfirmed?: boolean | null;
  appointmentCancelled?: boolean | null;
  hostilityScore?: number;
  volatilityScore?: number;
  informationMissing?: boolean | null;
  complaint?: boolean | null;
  refundRequest?: boolean | null;
  dispute?: boolean | null;
  callBackRequested?: boolean | null;
  followupScheduled?: boolean | null;
  noShow?: boolean | null;
  escalationRequired?: boolean | null;
  paymentFailed?: boolean | null;
  routed?: boolean | null;
  /** Last N outcomes for repeated_unknown check */
  lastOutcomeTypes?: string[] | null;
  /** Repeated unknown threshold */
  repeatedUnknownThreshold?: number;
}

export interface ResolveUniversalOutcomeResult {
  outcome_type: OutcomeType;
  outcome_confidence: OutcomeConfidence;
  next_required_action: NextRequiredAction;
}

/**
 * Deterministic outcome resolver. Pure logic. No random. No inference.
 */
export function resolveUniversalOutcome(input: ResolveUniversalOutcomeInput): ResolveUniversalOutcomeResult {
  const {
    optOut,
    legalKeywordPresent,
    paymentMade,
    paymentPromised,
    appointmentConfirmed,
    appointmentCancelled,
    emotionalCategory,
    volatilityScore = 0,
    brokenCommitmentsCount = 0,
    voiceOutcome,
    attemptCount = 0,
    maxAttemptsPerLead = 10,
    informationMissing,
    complaint,
    refundRequest,
    dispute,
    callBackRequested,
    followupScheduled,
    noShow,
    escalationRequired,
    paymentFailed,
    routed,
    lastOutcomeTypes,
    repeatedUnknownThreshold = 3,
    consentRecorded,
    disclosuresRead,
  } = input;

  if (optOut === true) {
    return { outcome_type: "opted_out", outcome_confidence: "high", next_required_action: "pause_execution" };
  }
  if (legalKeywordPresent === true) {
    return { outcome_type: "legal_risk", outcome_confidence: "high", next_required_action: "escalate_to_human" };
  }
  if (brokenCommitmentsCount >= 2) {
    return { outcome_type: "escalation_required", outcome_confidence: "high", next_required_action: "escalate_to_human" };
  }
  if (emotionalCategory === "hostile" && volatilityScore > 70) {
    return { outcome_type: "hostile", outcome_confidence: "high", next_required_action: "escalate_to_human" };
  }
  if (paymentMade === true) {
    return { outcome_type: "payment_made", outcome_confidence: "high", next_required_action: "none" };
  }
  if (paymentPromised === true) {
    return { outcome_type: "payment_promised", outcome_confidence: "high", next_required_action: "record_commitment" };
  }
  if (appointmentConfirmed === true) {
    return { outcome_type: "appointment_confirmed", outcome_confidence: "high", next_required_action: "none" };
  }
  if (appointmentCancelled === true) {
    return { outcome_type: "appointment_cancelled", outcome_confidence: "high", next_required_action: "none" };
  }
  if (complaint === true) {
    return { outcome_type: "complaint", outcome_confidence: "medium", next_required_action: "escalate_to_human" };
  }
  if (refundRequest === true) {
    return { outcome_type: "refund_request", outcome_confidence: "medium", next_required_action: "escalate_to_human" };
  }
  if (dispute === true) {
    return { outcome_type: "dispute", outcome_confidence: "high", next_required_action: "escalate_to_human" };
  }
  if (callBackRequested === true) {
    return { outcome_type: "call_back_requested", outcome_confidence: "high", next_required_action: "record_commitment" };
  }
  if (followupScheduled === true) {
    return { outcome_type: "followup_scheduled", outcome_confidence: "high", next_required_action: "none" };
  }
  if (noShow === true) {
    return { outcome_type: "no_show", outcome_confidence: "high", next_required_action: "none" };
  }
  if (escalationRequired === true) {
    return { outcome_type: "escalation_required", outcome_confidence: "high", next_required_action: "escalate_to_human" };
  }
  if (paymentFailed === true) {
    return { outcome_type: "payment_failed", outcome_confidence: "high", next_required_action: "schedule_followup" };
  }
  if (routed === true) {
    return { outcome_type: "routed", outcome_confidence: "high", next_required_action: "none" };
  }
  if (informationMissing === true) {
    return { outcome_type: "information_missing", outcome_confidence: "medium", next_required_action: "request_disclosure_confirmation" };
  }

  if (voiceOutcome === "wrong_number") {
    return { outcome_type: "wrong_number", outcome_confidence: "high", next_required_action: "pause_execution" };
  }

  const noAnswer = voiceOutcome === "no_answer" || voiceOutcome === "voicemail" || voiceOutcome === "busy";
  if (noAnswer) {
    if (attemptCount >= maxAttemptsPerLead) {
      return { outcome_type: "unknown", outcome_confidence: "low", next_required_action: "escalate_to_human" };
    }
    return { outcome_type: "no_answer", outcome_confidence: "high", next_required_action: "schedule_followup" };
  }

  if (voiceOutcome === "connected" || voiceOutcome === "completed") {
    const confidence: OutcomeConfidence = consentRecorded === true && disclosuresRead === true ? "high" : "medium";
    return { outcome_type: "connected", outcome_confidence: confidence, next_required_action: "none" };
  }

  if (voiceOutcome === "failed") {
    return { outcome_type: "unknown", outcome_confidence: "low", next_required_action: "schedule_followup" };
  }
  if (voiceOutcome === "technical_issue") {
    return { outcome_type: "technical_issue", outcome_confidence: "medium", next_required_action: "none" };
  }

  if (input.messageResultStatus === "succeeded" && !voiceOutcome) {
    return { outcome_type: "information_provided", outcome_confidence: "medium", next_required_action: "none" };
  }
  if (input.messageResultStatus === "failed" && !voiceOutcome) {
    return { outcome_type: "unknown", outcome_confidence: "low", next_required_action: "schedule_followup" };
  }

  const unknownCount = Array.isArray(lastOutcomeTypes) ? lastOutcomeTypes.filter((o) => o === "unknown").length : 0;
  if (unknownCount >= repeatedUnknownThreshold) {
    return { outcome_type: "unknown", outcome_confidence: "low", next_required_action: "escalate_to_human" };
  }

  return { outcome_type: "unknown", outcome_confidence: "low", next_required_action: "request_disclosure_confirmation" };
}

export type UniversalOutcomeChannel = "voice" | "message" | "system";

export interface InsertUniversalOutcomeInput {
  workspaceId: string;
  threadId?: string | null;
  workUnitId?: string | null;
  actionIntentId?: string | null;
  channel: UniversalOutcomeChannel;
  outcome_type: OutcomeType;
  outcome_confidence: OutcomeConfidence;
  next_required_action: NextRequiredAction | null;
  structured_payload_json?: Record<string, unknown>;
}

/**
 * Insert one row into universal_outcomes and append ledger. Append-only. No DELETE.
 */
export async function insertUniversalOutcome(input: InsertUniversalOutcomeInput): Promise<{ ok: boolean; id?: string }> {
  const { appendLedgerEvent } = await import("@/lib/ops/ledger");
  const { getDb } = await import("@/lib/db/queries");
  const db = getDb();
  try {
    const { data } = await db
      .from("universal_outcomes")
      .insert({
        workspace_id: input.workspaceId,
        thread_id: input.threadId ?? null,
        work_unit_id: input.workUnitId ?? null,
        action_intent_id: input.actionIntentId ?? null,
        channel: input.channel,
        outcome_type: input.outcome_type,
        outcome_confidence: input.outcome_confidence,
        next_required_action: input.next_required_action,
        structured_payload_json: input.structured_payload_json ?? {},
      })
      .select("id")
      .maybeSingle();
    const id = (data as { id?: string } | null)?.id;
    if (id) {
      await appendLedgerEvent({
        workspaceId: input.workspaceId,
        eventType: "universal_outcome_recorded",
        severity: "info",
        subjectType: "thread",
        subjectRef: (input.threadId ?? input.workspaceId).slice(0, 160),
        details: { outcome_type: input.outcome_type, next_required_action: input.next_required_action },
      }).catch(() => {});
    }
    return { ok: true, id };
  } catch {
    return { ok: false };
  }
}
