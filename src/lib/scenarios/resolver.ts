/**
 * Scenario state and profile resolver. Deterministic. Bounded queries only.
 */

import { getDb } from "@/lib/db/queries";
import type {
  UseModeKey,
  ScenarioProfile,
  ScenarioRules,
  ScenarioContextSource,
  ListPurposeKey,
} from "./types";
import type { PrimaryObjective, SecondaryObjective } from "@/lib/intelligence/objective-engine";

const ALLOWED_PRIMARY: PrimaryObjective[] = [
  "book", "qualify", "confirm", "collect", "recover", "close", "retain", "route", "escalate",
];
const ALLOWED_SECONDARY: SecondaryObjective[] = [
  "reduce_no_show", "extract_missing_info", "reactivate", "reinforce_commitment",
  "handle_objection", "protect_compliance", "increase_trust",
];

function toPrimary(s: string): PrimaryObjective {
  return ALLOWED_PRIMARY.includes(s as PrimaryObjective) ? (s as PrimaryObjective) : "route";
}

function toSecondaries(arr: unknown): SecondaryObjective[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((x): x is SecondaryObjective => typeof x === "string" && ALLOWED_SECONDARY.includes(x as SecondaryObjective));
}

/** Get current scenario state for workspace. Bounded: single row. */
export async function getScenarioState(workspaceId: string): Promise<{
  active_profile_id: string | null;
  active_mode_key: string;
}> {
  const db = getDb();
  const { data: row } = await db
    .from("workspace_scenario_state")
    .select("active_profile_id, active_mode_key")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const r = row as { active_profile_id?: string | null; active_mode_key?: string } | null;
  return {
    active_profile_id: r?.active_profile_id ?? null,
    active_mode_key: r?.active_mode_key ?? "triage",
  };
}

/** Resolve scenario profile: active if set, else derive from context. Deterministic. */
export async function resolveScenarioProfile(
  workspaceId: string,
  context: { source: ScenarioContextSource; list_purpose?: ListPurposeKey | null }
): Promise<{ profile: ScenarioProfile | null; use_mode_key: UseModeKey }> {
  const state = await getScenarioState(workspaceId);
  const db = getDb();

  if (state.active_profile_id) {
    const { data: row } = await db
      .from("scenario_profiles")
      .select("profile_id, mode_key, display_name, primary_objective, secondary_objectives_json, default_review_level, default_jurisdiction, rules_json")
      .eq("workspace_id", workspaceId)
      .eq("profile_id", state.active_profile_id)
      .maybeSingle();

    if (row) {
      const r = row as ScenarioProfileRowLike;
      return {
        profile: {
          profile_id: r.profile_id,
          mode_key: r.mode_key as UseModeKey,
          display_name: r.display_name,
          primary_objective: toPrimary(r.primary_objective),
          secondary_objectives: toSecondaries(r.secondary_objectives_json),
          default_review_level: r.default_review_level,
          default_jurisdiction: r.default_jurisdiction,
          rules: (r.rules_json as ScenarioRules) ?? {},
        },
        use_mode_key: r.mode_key as UseModeKey,
      };
    }
  }

  const defaultProfileId =
    context.source === "list_run"
      ? "list_execution"
      : "inbound_triage";

  const { data: row } = await db
    .from("scenario_profiles")
    .select("profile_id, mode_key, display_name, primary_objective, secondary_objectives_json, default_review_level, default_jurisdiction, rules_json")
    .eq("workspace_id", workspaceId)
    .eq("profile_id", defaultProfileId)
    .maybeSingle();

  if (row) {
    const r = row as ScenarioProfileRowLike;
    let primary = toPrimary(r.primary_objective);
    if (context.source === "list_run" && context.list_purpose && context.list_purpose !== "route") {
      const purposeToObjective: Record<ListPurposeKey, PrimaryObjective> = {
        qualify: "qualify",
        confirm: "confirm",
        collect: "collect",
        reactivate: "retain",
        route: "route",
        recover: "recover",
      };
      primary = purposeToObjective[context.list_purpose] ?? primary;
    }
    return {
      profile: {
        profile_id: r.profile_id,
        mode_key: r.mode_key as UseModeKey,
        display_name: r.display_name,
        primary_objective: primary,
        secondary_objectives: toSecondaries(r.secondary_objectives_json),
        default_review_level: r.default_review_level,
        default_jurisdiction: r.default_jurisdiction,
        rules: (r.rules_json as ScenarioRules) ?? {},
      },
      use_mode_key: r.mode_key as UseModeKey,
    };
  }

  return {
    profile: null,
    use_mode_key: context.source === "list_run" ? "list_execution" : "triage",
  };
}

interface ScenarioProfileRowLike {
  profile_id: string;
  mode_key: string;
  display_name: string;
  primary_objective: string;
  secondary_objectives_json: unknown;
  default_review_level: string;
  default_jurisdiction: string;
  rules_json: unknown;
}
