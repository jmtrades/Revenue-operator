/**
 * Phase 27 — GDPR / CCPA / CPRA data-subject-request (DSR) handler.
 *
 * Models the state machine + deadlines for the four canonical DSR types:
 *   - access          (GDPR Art. 15, CCPA §1798.110, CPRA §1798.130)
 *   - deletion        (GDPR Art. 17, CCPA §1798.105)
 *   - correction      (GDPR Art. 16, CPRA §1798.106)
 *   - portability     (GDPR Art. 20, CCPA §1798.130)
 *   - opt_out_sale    (CCPA §1798.120, CPRA §1798.121)
 *
 * Plus supporting helpers for:
 *   - verifying the subject's identity (GDPR Art. 12(6); CPRA §1798.140(ag))
 *   - honoring deadlines (GDPR 1 month extendable to 3; CCPA 45 days
 *     extendable to 90)
 *   - exemptions (legal hold, fraud prevention, aggregated data, de-identified
 *     data under CCPA §1798.145(a)(1))
 *   - producing a portable JSON export package
 *
 * Pure — no DB. Callers persist the returned state + perform the actual
 * data fetch/delete via their adapter.
 */

export type DsrType = "access" | "deletion" | "correction" | "portability" | "opt_out_sale";
export type DsrRegime = "gdpr" | "ccpa" | "cpra" | "other";
export type DsrStatus =
  | "received"
  | "pending_verification"
  | "verified"
  | "in_progress"
  | "extended"
  | "completed"
  | "denied_exemption"
  | "denied_unverifiable"
  | "withdrawn";

export interface DsrSubject {
  /** "data subject" identifier — typically email or phone or account id. */
  subjectIdentifier: string;
  subjectEmail?: string | null;
  subjectPhone?: string | null;
  subjectCountry?: string | null;
  subjectState?: string | null;
  /** The regime the subject is invoking. */
  regime: DsrRegime;
}

export interface DsrRequest {
  id: string;
  type: DsrType;
  subject: DsrSubject;
  /** ISO timestamp of initial receipt. */
  receivedAt: string;
  /** Optional corrections payload (for type=correction). */
  correctionPayload?: Record<string, unknown>;
  /** Optional rationale used by the requester. */
  rationale?: string;
}

export interface DsrVerification {
  /** Method used to verify identity. */
  method: "email_challenge" | "sms_challenge" | "government_id" | "authenticated_session" | "none";
  /** ISO timestamp of verification completion, if any. */
  verifiedAt?: string;
  /** If verification failed, reason. */
  failureReason?: string;
}

export interface DsrExemption {
  code:
    | "legal_hold"
    | "fraud_investigation"
    | "active_contract_required"
    | "aggregated_or_deidentified"
    | "research_exemption"
    | "internal_use_only"
    | "security_exemption";
  explanation: string;
}

export interface DsrState {
  request: DsrRequest;
  status: DsrStatus;
  verification?: DsrVerification;
  /** ISO timestamp — when we must respond by. */
  responseDeadline: string;
  /** Extended deadline if applicable. */
  extendedDeadline?: string;
  /** Exemption applied, if any. */
  exemption?: DsrExemption;
  /** Audit trail. */
  auditLog: Array<{ at: string; event: string; detail?: string }>;
}

function addDays(iso: string, days: number): string {
  const t = Date.parse(iso);
  return new Date(t + days * 86_400_000).toISOString();
}

function responseWindowDays(regime: DsrRegime): number {
  if (regime === "gdpr") return 30; // ~1 month
  // CCPA and CPRA both 45 days
  if (regime === "ccpa" || regime === "cpra") return 45;
  return 30;
}

function extensionWindowDays(regime: DsrRegime): number {
  if (regime === "gdpr") return 60; // up to 3 months total
  if (regime === "ccpa" || regime === "cpra") return 45; // up to 90 total
  return 30;
}

export function openDsrRequest(request: DsrRequest): DsrState {
  const windowDays = responseWindowDays(request.subject.regime);
  return {
    request,
    status: "received",
    responseDeadline: addDays(request.receivedAt, windowDays),
    auditLog: [{ at: request.receivedAt, event: "received", detail: `type=${request.type}` }],
  };
}

export function requestVerification(state: DsrState, nowIso: string): DsrState {
  return {
    ...state,
    status: "pending_verification",
    auditLog: [
      ...state.auditLog,
      { at: nowIso, event: "verification_requested" },
    ],
  };
}

export function completeVerification(
  state: DsrState,
  verification: DsrVerification,
  nowIso: string,
): DsrState {
  if (verification.method === "none" || !verification.verifiedAt) {
    return {
      ...state,
      status: "denied_unverifiable",
      verification,
      auditLog: [
        ...state.auditLog,
        { at: nowIso, event: "verification_failed", detail: verification.failureReason },
      ],
    };
  }
  return {
    ...state,
    status: "verified",
    verification,
    auditLog: [
      ...state.auditLog,
      { at: nowIso, event: "verification_completed", detail: verification.method },
    ],
  };
}

export function beginProcessing(state: DsrState, nowIso: string): DsrState {
  if (state.status !== "verified") {
    return {
      ...state,
      auditLog: [
        ...state.auditLog,
        { at: nowIso, event: "begin_processing_attempt_rejected", detail: state.status },
      ],
    };
  }
  return {
    ...state,
    status: "in_progress",
    auditLog: [...state.auditLog, { at: nowIso, event: "processing_started" }],
  };
}

export function applyExtension(
  state: DsrState,
  exemptionIfAny: DsrExemption | null,
  nowIso: string,
): DsrState {
  const regime = state.request.subject.regime;
  const extensionDays = extensionWindowDays(regime);
  const extendedDeadline = addDays(state.responseDeadline, extensionDays);
  return {
    ...state,
    status: "extended",
    extendedDeadline,
    exemption: exemptionIfAny ?? state.exemption,
    auditLog: [
      ...state.auditLog,
      { at: nowIso, event: "extension_applied", detail: `+${extensionDays}d` },
    ],
  };
}

export function denyForExemption(
  state: DsrState,
  exemption: DsrExemption,
  nowIso: string,
): DsrState {
  return {
    ...state,
    status: "denied_exemption",
    exemption,
    auditLog: [
      ...state.auditLog,
      { at: nowIso, event: "denied_exemption", detail: exemption.code },
    ],
  };
}

export function completeDsr(state: DsrState, nowIso: string, detail?: string): DsrState {
  return {
    ...state,
    status: "completed",
    auditLog: [
      ...state.auditLog,
      { at: nowIso, event: "completed", detail },
    ],
  };
}

export function withdrawDsr(state: DsrState, nowIso: string): DsrState {
  return {
    ...state,
    status: "withdrawn",
    auditLog: [
      ...state.auditLog,
      { at: nowIso, event: "withdrawn" },
    ],
  };
}

/**
 * Is this request overdue based on the current time? Returns ms past deadline
 * (negative = still in window).
 */
export function overdueMilliseconds(state: DsrState, nowIso: string): number {
  const now = Date.parse(nowIso);
  const deadline = Date.parse(state.extendedDeadline ?? state.responseDeadline);
  return now - deadline;
}

/**
 * Produce a portable JSON export package per GDPR Art. 20 "machine-readable".
 */
export interface PortableExportOptions {
  includePersonalData: Record<string, unknown>;
  includeAuditTrail?: Array<{ at: string; event: string }>;
}

export function buildPortableExport(
  state: DsrState,
  options: PortableExportOptions,
): {
  exportId: string;
  subjectIdentifier: string;
  generatedAt: string;
  regime: DsrRegime;
  dataCategories: string[];
  data: Record<string, unknown>;
  auditTrail?: Array<{ at: string; event: string }>;
} {
  return {
    exportId: `export_${state.request.id}_${Date.now()}`,
    subjectIdentifier: state.request.subject.subjectIdentifier,
    generatedAt: new Date().toISOString(),
    regime: state.request.subject.regime,
    dataCategories: Object.keys(options.includePersonalData),
    data: options.includePersonalData,
    auditTrail: options.includeAuditTrail,
  };
}
