/**
 * System Integrity Layer — Pure validation checks. No database writes.
 * Each check returns IntegrityViolation or null.
 */

export interface IntegrityViolation {
  check: string;
  message: string;
  details?: Record<string, unknown>;
  entityIds?: string[];
}

/** Snapshot of workspace data for integrity checks. Built by the audit runner from DB reads. */
export interface WorkspaceIntegritySnapshot {
  workspaceId: string;
  /** Active = closure_dormant_at is null */
  activeLeadIds: string[];
  /** Last resolved responsibility state per lead (from history or resolver). */
  lastResponsibilityByLead: Record<string, string | null>;
  /** Commitment start time (event time) for COMMITMENT_SCHEDULED leads. */
  commitmentEndTimeByLead: Record<string, string | null>;
  /** For each lead with commitment in the past, whether a completion signal exists after it. */
  hasCompletionSignalAfterCommitment: Record<string, boolean>;
  /** Action command ids in workspace (recent window). */
  actionCommandIds: Set<string>;
  /** Action attempts: action_command_id, status, updated_at. */
  attempts: Array<{ action_command_id: string; status: string; updated_at: string }>;
  /** Action commands: id, processed_at. */
  commands: Array<{ id: string; processed_at: string | null }>;
  /** Escalation logs: id, lead_id, created_at. */
  escalations: Array<{ id: string; lead_id: string; created_at: string }>;
  /** Escalation ids that have been acknowledged. */
  acknowledgedEscalationIds: Set<string>;
  /** Last time reconciliation ran for this workspace (iso string or null). */
  reconciliationLastRunAt: string | null;
  /** Canonical signals for workspace: id, lead_id, occurred_at, processed_at. */
  signals: Array<{ id: string; lead_id: string; occurred_at: string; processed_at: string | null }>;
}

const RESPONSIBILITY_COVERAGE = "responsibility_coverage";
const ATTEMPT_CONSISTENCY = "attempt_consistency";
const DELIVERY_FINALITY = "delivery_finality";
const BOOKING_RESOLUTION = "booking_resolution";
const ESCALATION_ACKNOWLEDGEMENT = "escalation_acknowledgement";
const RECONCILIATION_FRESHNESS = "reconciliation_freshness";
const SIGNAL_CONTINUITY = "signal_continuity";

const DELIVERY_STALE_HOURS = 24;
const ESCALATION_ACK_THRESHOLD_HOURS = 48;
const RECONCILIATION_FRESHNESS_HOURS = 36;

/**
 * Every active lead must have exactly one responsibility state.
 */
export function checkResponsibilityCoverage(snapshot: WorkspaceIntegritySnapshot): IntegrityViolation | null {
  const missing = snapshot.activeLeadIds.filter((id) => snapshot.lastResponsibilityByLead[id] == null || snapshot.lastResponsibilityByLead[id] === "");
  if (missing.length === 0) return null;
  return {
    check: RESPONSIBILITY_COVERAGE,
    message: "Active lead(s) without a responsibility state",
    details: { count: missing.length },
    entityIds: missing,
  };
}

/**
 * Every attempt must reference an existing action command; unprocessed commands must have at least one attempt.
 */
export function checkAttemptConsistency(snapshot: WorkspaceIntegritySnapshot): IntegrityViolation | null {
  const orphanAttempts = snapshot.attempts.filter((a) => !snapshot.actionCommandIds.has(a.action_command_id));
  if (orphanAttempts.length > 0) {
    return {
      check: ATTEMPT_CONSISTENCY,
      message: "Attempt(s) reference missing action command",
      details: { count: orphanAttempts.length },
      entityIds: orphanAttempts.map((a) => a.action_command_id),
    };
  }
  const unprocessed = snapshot.commands.filter((c) => c.processed_at == null);
  const commandIdsWithAttempts = new Set(snapshot.attempts.map((a) => a.action_command_id));
  const stuck = unprocessed.filter((c) => !commandIdsWithAttempts.has(c.id));
  if (stuck.length > 0) {
    return {
      check: ATTEMPT_CONSISTENCY,
      message: "Unprocessed action command(s) with no attempts",
      details: { count: stuck.length },
      entityIds: stuck.map((c) => c.id),
    };
  }
  return null;
}

/**
 * No delivery attempt may remain in non-final state (pending/sending) beyond the stale threshold.
 */
export function checkDeliveryFinality(snapshot: WorkspaceIntegritySnapshot): IntegrityViolation | null {
  const now = Date.now();
  const staleThresholdMs = DELIVERY_STALE_HOURS * 60 * 60 * 1000;
  const nonFinal = ["pending", "sending"];
  const stale = snapshot.attempts.filter(
    (a) => nonFinal.includes(a.status) && now - new Date(a.updated_at).getTime() > staleThresholdMs
  );
  if (stale.length === 0) return null;
  return {
    check: DELIVERY_FINALITY,
    message: `Delivery attempt(s) stuck in ${nonFinal.join("/")} beyond ${DELIVERY_STALE_HOURS}h`,
    details: { count: stale.length },
    entityIds: stale.map((a) => a.action_command_id),
  };
}

/**
 * Every commitment (booking) past its event time must have a resolution signal (AppointmentCompleted/Missed/BookingCancelled).
 */
export function checkBookingResolution(snapshot: WorkspaceIntegritySnapshot): IntegrityViolation | null {
  const now = new Date().toISOString();
  const unresolved: string[] = [];
  for (const leadId of snapshot.activeLeadIds) {
    const state = snapshot.lastResponsibilityByLead[leadId];
    if (state !== "COMMITMENT_SCHEDULED") continue;
    const endAt = snapshot.commitmentEndTimeByLead[leadId];
    if (!endAt || endAt > now) continue;
    if (!snapshot.hasCompletionSignalAfterCommitment[leadId]) {
      unresolved.push(leadId);
    }
  }
  if (unresolved.length === 0) return null;
  return {
    check: BOOKING_RESOLUTION,
    message: "Commitment past event time without resolution signal",
    details: { count: unresolved.length },
    entityIds: unresolved,
  };
}

/**
 * Every escalation older than the threshold must be acknowledged.
 */
export function checkEscalationAcknowledgement(snapshot: WorkspaceIntegritySnapshot): IntegrityViolation | null {
  const thresholdMs = ESCALATION_ACK_THRESHOLD_HOURS * 60 * 60 * 1000;
  const now = Date.now();
  const unacked = snapshot.escalations.filter(
    (e) => !snapshot.acknowledgedEscalationIds.has(e.id) && now - new Date(e.created_at).getTime() > thresholdMs
  );
  if (unacked.length === 0) return null;
  return {
    check: ESCALATION_ACKNOWLEDGEMENT,
    message: `Escalation(s) older than ${ESCALATION_ACK_THRESHOLD_HOURS}h not acknowledged`,
    details: { count: unacked.length },
    entityIds: unacked.map((e) => e.id),
  };
}

/**
 * Reconciliation must have run within the freshness window (if workspace has active leads).
 */
export function checkReconciliationFreshness(snapshot: WorkspaceIntegritySnapshot): IntegrityViolation | null {
  if (snapshot.activeLeadIds.length === 0) return null;
  if (!snapshot.reconciliationLastRunAt) {
    return {
      check: RECONCILIATION_FRESHNESS,
      message: "No reconciliation run recorded",
      details: { workspaceId: snapshot.workspaceId },
    };
  }
  const elapsedMs = Date.now() - new Date(snapshot.reconciliationLastRunAt).getTime();
  if (elapsedMs > RECONCILIATION_FRESHNESS_HOURS * 60 * 60 * 1000) {
    return {
      check: RECONCILIATION_FRESHNESS,
      message: `Reconciliation last run older than ${RECONCILIATION_FRESHNESS_HOURS}h`,
      details: { lastRunAt: snapshot.reconciliationLastRunAt, elapsedHours: elapsedMs / (60 * 60 * 1000) },
    };
  }
  return null;
}

/**
 * No gap in signal processing: if an older signal is unprocessed, no newer signal may be processed.
 */
export function checkSignalContinuity(snapshot: WorkspaceIntegritySnapshot): IntegrityViolation | null {
  const byLead = new Map<string, Array<{ id: string; occurred_at: string; processed_at: string | null }>>();
  for (const s of snapshot.signals) {
    const list = byLead.get(s.lead_id) ?? [];
    list.push({ id: s.id, occurred_at: s.occurred_at, processed_at: s.processed_at });
    byLead.set(s.lead_id, list);
  }
  const gapLeadIds: string[] = [];
  for (const [leadId, list] of byLead) {
    const sorted = [...list].sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
    let seenUnprocessed = false;
    for (const s of sorted) {
      if (s.processed_at == null) {
        seenUnprocessed = true;
      } else if (seenUnprocessed) {
        gapLeadIds.push(leadId);
        break;
      }
    }
  }
  if (gapLeadIds.length === 0) return null;
  return {
    check: SIGNAL_CONTINUITY,
    message: "Processed signal exists after an unprocessed signal (ordering gap)",
    details: { leadCount: gapLeadIds.length },
    entityIds: gapLeadIds,
  };
}

/** Run all integrity checks. Returns array of violations (no DB writes). */
export function runAllIntegrityChecks(snapshot: WorkspaceIntegritySnapshot): IntegrityViolation[] {
  const out: IntegrityViolation[] = [];
  const checks = [
    checkResponsibilityCoverage,
    checkAttemptConsistency,
    checkDeliveryFinality,
    checkBookingResolution,
    checkEscalationAcknowledgement,
    checkReconciliationFreshness,
    checkSignalContinuity,
  ];
  for (const fn of checks) {
    const v = fn(snapshot);
    if (v) out.push(v);
  }
  return out;
}
