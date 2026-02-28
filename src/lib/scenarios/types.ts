/**
 * Scenario and use mode types. Internal keys: mode_key, profile_id.
 * UI language: "Purpose" / "Operating posture" only.
 */

import type { PrimaryObjective, SecondaryObjective } from "@/lib/intelligence/objective-engine";

export type UseModeKey =
  | "triage"
  | "list_execution"
  | "recovery"
  | "front_desk"
  | "reactivation"
  | "compliance_shield"
  | "concierge";

export interface UseModeRow {
  mode_key: string;
  display_name: string;
  description_line: string;
}

export interface ScenarioProfileRow {
  id: string;
  workspace_id: string;
  profile_id: string;
  mode_key: string;
  display_name: string;
  primary_objective: string;
  secondary_objectives_json: unknown;
  default_review_level: string;
  default_jurisdiction: string;
  rules_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ScenarioProfile {
  profile_id: string;
  mode_key: UseModeKey;
  display_name: string;
  primary_objective: PrimaryObjective;
  secondary_objectives: SecondaryObjective[];
  default_review_level: string;
  default_jurisdiction: string;
  rules: ScenarioRules;
}

export interface ScenarioRules {
  max_attempts_per_lead?: number;
  max_objection_chain?: number;
  stop_conditions?: string[];
  escalation_thresholds?: Record<string, number>;
  quiet_hours_override?: unknown;
}

export interface WorkspaceScenarioStateRow {
  workspace_id: string;
  active_profile_id: string | null;
  active_mode_key: string;
  updated_at: string;
}

export type ListPurposeKey =
  | "qualify"
  | "confirm"
  | "collect"
  | "reactivate"
  | "route"
  | "recover";

/** Context for resolving scenario profile (inbound vs list run). */
export type ScenarioContextSource = "inbound" | "list_run";
