import { getDb } from "@/lib/db/queries";

export type LedgerSeverity = "info" | "notice" | "warning";

export type LedgerSubjectType =
  | "workspace"
  | "thread"
  | "work_unit"
  | "approval"
  | "intent"
  | "public_record"
  | "connector"
  | "billing"
  | "executor";

export type LedgerEventType =
  | "trial_started"
  | "checkout_created"
  | "billing_active"
  | "activation_recorded"
  | "first_external_source_recorded"
  | "first_connector_event"
  | "first_action_intent_emitted"
  | "first_public_record_created"
  | "first_public_record_viewed"
  | "first_approval_created"
  | "first_approval_decided"
  | "first_voice_outcome"
  | "connector_event_ingested"
  | "connector_dead_lettered"
  | "intent_emitted"
  | "intent_claimed"
  | "intent_completed"
  | "approval_created"
  | "approval_decided"
  | "approval_expired"
  | "voice_outcome_ingested"
  | "voice_compliance_violation"
  | "public_record_viewed"
  | "public_record_created"
  | "executor_heartbeat_recorded"
  | "executor_report_recorded"
  | "cron_cycle_completed"
  | "rate_ceiling_triggered"
  | "execution_cycle_completed"
  | "scenario_selected"
  | "list_purpose_recorded"
  | "stop_condition_triggered"
  | "commitment_recorded"
  | "commitment_fulfilled"
  | "commitment_broken"
  | "cadence_governor_triggered"
  | "scenario_auto_override"
  | "batch_wave_selected"
  | "batch_wave_paused"
  | "universal_outcome_recorded"
  | "conversation_snapshot_recorded"
  | "unresolved_question_recorded"
  | "unresolved_question_resolved"
  | "outcome_closure_enforced"
  | "strategic_pattern_updated"
  | "strategic_guard_triggered"
  | "workspace_pattern_pause"
  | "workspace_pattern_escalation"
  | "strategy_effectiveness_recorded"
  | "commitment_decay_applied"
  | "strategic_guard_block";

export interface AppendLedgerEventArgs {
  workspaceId: string;
  eventType: LedgerEventType | string;
  severity?: LedgerSeverity;
  subjectType?: LedgerSubjectType;
  subjectRef?: string;
  details?: Record<string, unknown>;
}

export async function appendLedgerEvent(args: AppendLedgerEventArgs): Promise<{ ok: boolean }> {
  const {
    workspaceId,
    eventType,
    severity = "info",
    subjectType = "workspace",
    subjectRef = workspaceId,
    details = {},
  } = args;

  try {
    const safeSubjectRef = String(subjectRef).slice(0, 160);
    const safeEventType = String(eventType).slice(0, 80);
    const payload = typeof details === "object" && details !== null ? details : {};

    const db = getDb();
    await db.from("operational_ledger").insert({
      workspace_id: workspaceId,
      event_type: safeEventType,
      severity,
      subject_type: subjectType,
      subject_ref: safeSubjectRef,
      details_json: payload,
    });

    return { ok: true };
  } catch {
    // Ledger writes must never break execution.
    return { ok: false };
  }
}

