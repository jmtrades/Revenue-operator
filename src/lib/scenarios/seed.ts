/**
 * Seed baseline scenario profiles and workspace_scenario_state for a workspace.
 * Called on activation if none exist. Upsert only. No deletes.
 */

import { getDb } from "@/lib/db/queries";

const PRIMARY_OBJECTIVES = [
  "book",
  "qualify",
  "confirm",
  "collect",
  "recover",
  "close",
  "retain",
  "route",
  "escalate",
] as const;

function _isPrimaryObjective(s: string): s is (typeof PRIMARY_OBJECTIVES)[number] {
  return (PRIMARY_OBJECTIVES as readonly string[]).includes(s);
}

/** Ensure workspace has baseline scenario profiles and scenario_state. */
export async function ensureWorkspaceScenarioBaseline(workspaceId: string): Promise<void> {
  const db = getDb();

  const { data: existing } = await db
    .from("scenario_profiles")
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle();

  if (!existing) {
    const now = new Date().toISOString();
    await db.from("scenario_profiles").upsert(
      [
        {
          workspace_id: workspaceId,
          profile_id: "inbound_triage",
          mode_key: "triage",
          display_name: "Inbound triage",
          primary_objective: "route",
          secondary_objectives_json: ["protect_compliance"],
          default_review_level: "preview_required",
          default_jurisdiction: "UNSPECIFIED",
          rules_json: { max_objection_chain: 3 },
          created_at: now,
          updated_at: now,
        },
        {
          workspace_id: workspaceId,
          profile_id: "list_execution",
          mode_key: "list_execution",
          display_name: "List execution",
          primary_objective: "qualify",
          secondary_objectives_json: [],
          default_review_level: "preview_required",
          default_jurisdiction: "UNSPECIFIED",
          rules_json: { max_attempts_per_lead: 5, max_objection_chain: 3 },
          created_at: now,
          updated_at: now,
        },
      ],
      { onConflict: "workspace_id,profile_id" }
    );
  }

  await db
    .from("workspace_scenario_state")
    .upsert(
      {
        workspace_id: workspaceId,
        active_profile_id: null,
        active_mode_key: "triage",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    );
}
