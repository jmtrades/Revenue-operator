/**
 * Canonical Execution Plan — governed, compliant, auditable. No freeform AI message text.
 */

export type ApprovalModeValue =
  | "autopilot"
  | "preview_required"
  | "approval_required"
  | "locked_script"
  | "jurisdiction_locked";

export type ExecutionDecision = "send" | "emit_approval" | "emit_preview" | "blocked";

export type ActionIntentToEmit =
  | "send_message"
  | "place_outbound_call"
  | "schedule_followup"
  | "request_document"
  | "collect_payment"
  | "escalate_to_human"
  | "request_disclosure_confirmation";

export interface ExecutionPlanIdentifiers {
  workspace_id: string;
  conversation_id: string;
  thread_id?: string | null;
  work_unit_id?: string | null;
}

export interface ExecutionPlan {
  identifiers: ExecutionPlanIdentifiers;
  domain_type: string;
  industry_type?: string | null;
  jurisdiction?: string | null;
  channel_chosen: string;
  intent_type: string;
  strategy_state_before: string;
  strategy_state_after: string;
  template_id: string | null;
  render_vars: Record<string, string | number | boolean>;
  disclaimer_lines: string[];
  policy_id: string | null;
  approval_mode: ApprovalModeValue;
  decision: ExecutionDecision;
  action_intent_to_emit: ActionIntentToEmit | null;
  approval_id?: string | null;
  /** Template-rendered text when decision is send (no freeform). */
  rendered_text?: string | null;
  trace: ExecutionTrace;
  /** Resolved by objective engine (deterministic). */
  primary_objective?: string | null;
  secondary_objective?: string | null;
  /** From risk engine (0–100). */
  risk_score?: number | null;
  /** Queue type for universal scenario coverage. */
  queue_type?: string | null;
  /** Use mode key (triage, list_execution, etc.). */
  use_mode_key?: string | null;
  /** Active scenario profile id when set. */
  scenario_profile_id?: string | null;
  /** When set, plan uses this mode without updating workspace state (safety override). */
  temporary_mode_override?: string | null;
  /** For escalation summary: regulatory snapshot and forbidden phrases. */
  regulatory_constraints_snapshot?: string[];
  what_not_to_say?: string[];
  /** Cross-channel memory: last 3 channel types (voice | message) for path/context. */
  last_3_channel_types?: string[];
  /** When set by strategic guard: variant to block (e.g. persuasion). */
  strategic_block_variant?: string | null;
  /** Deterministic 3-step forward strategy (max length 3). */
  strategic_horizon?: string[];
}

export interface ExecutionTrace {
  policy_checks: { check: string; passed: boolean; reason?: string }[];
  templates_used: { key: string; version: number }[];
  clause_plan?: unknown;
  blocked_reason?: string;
}
