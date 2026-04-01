/**
 * Counterfactual proof: when risk existed during observing and does not reoccur for 48h after active.
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import { createIncidentStatement } from "@/lib/incidents";
import { getRiskCategoriesDuringObserving, clearRiskCategoryDuringObserving } from "./index";

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export async function runContinuationPreventedCheck(): Promise<void> {
  const db = getDb();
  const now = new Date();
  const cutoff = new Date(now.getTime() - FORTY_EIGHT_HOURS_MS).toISOString();

  const { data: activeWorkspaces } = await db
    .from("workspace_installation_state")
    .select("workspace_id, activated_at")
    .eq("phase", "active")
    .not("activated_at", "is", null)
    .lt("activated_at", cutoff);

  const rows = (activeWorkspaces ?? []) as { workspace_id: string; activated_at: string }[];
  for (const row of rows) {
    const activatedAt = new Date(row.activated_at).getTime();
    const windowEnd = new Date(activatedAt + FORTY_EIGHT_HOURS_MS).toISOString();

    const categories = await getRiskCategoriesDuringObserving(row.workspace_id);
    for (const category of categories) {
      const { count } = await db
        .from("immediate_risk_events")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", row.workspace_id)
        .eq("category", category)
        .gte("detected_at", row.activated_at)
        .lt("detected_at", windowEnd);

      if ((count ?? 0) === 0) {
        await createIncidentStatement(row.workspace_id, "continuation_prevented", null).catch((e: unknown) => {
          log("error", "createIncidentStatement failed", { error: e instanceof Error ? e.message : String(e) });
        });
        await clearRiskCategoryDuringObserving(row.workspace_id, category).catch((e: unknown) => {
          log("error", "clearRiskCategoryDuringObserving failed", { error: e instanceof Error ? e.message : String(e) });
        });
      }
    }
  }
}
