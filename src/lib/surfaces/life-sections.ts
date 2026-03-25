/**
 * Life surface sections: what is being tracked, what was handled, what required no action.
 * Factual sentences only.
 */

import { getDb } from "@/lib/db/queries";
import { getLifeAssurance } from "@/lib/surfaces/life-assurance";
import { getRecentOrientationStatements } from "@/lib/orientation/records";

const CAP = 8;

export interface LifeSectionsPayload {
  what_is_being_tracked: string[];
  what_was_handled: string[];
  what_required_no_action: string[];
}

export async function getLifeSections(workspaceId: string): Promise<LifeSectionsPayload> {
  const [assurance, orientation, refRows] = await Promise.all([
    getLifeAssurance(workspaceId),
    getRecentOrientationStatements(workspaceId, 15),
    getDb()
      .from("personal_references")
      .select("label")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const what_is_being_tracked: string[] = [];
  const refs = (refRows?.data ?? []) as { label: string }[];
  for (const r of refs.slice(0, CAP)) {
    if (r.label) what_is_being_tracked.push(r.label);
  }
  if (assurance.pending_real_world_matters) what_is_being_tracked.push("Real-world matters are pending.");
  if (what_is_being_tracked.length === 0) what_is_being_tracked.push("Nothing is being tracked.");

  const what_was_handled = orientation.slice(0, CAP);
  if (what_was_handled.length === 0) what_was_handled.push("Nothing recorded yet.");

  const what_required_no_action: string[] = [];
  if (assurance.safely_progressing) what_required_no_action.push("Progress did not require action.");
  if (!assurance.requires_attention) what_required_no_action.push("No attention was required.");
  if (what_required_no_action.length === 0) what_required_no_action.push("—");

  return {
    what_is_being_tracked,
    what_was_handled,
    what_required_no_action,
  };
}
