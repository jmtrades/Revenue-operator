/**
 * Escalation memory: if same category occurs 3 times in 7 days, create incident.
 * "This situation repeatedly required intervention."
 */

import { createIncidentStatement } from "@/lib/incidents";
import { countExposuresByCategoryInLast7Days } from "./index";
import { getDb } from "@/lib/db/queries";

export async function runEscalationMemory(): Promise<void> {
  const db = getDb();
  const { data: workspaces } = await db.from("workspaces").select("id");
  const ids = (workspaces ?? []).map((w: { id: string }) => w.id);

  for (const workspaceId of ids) {
    const counts = await countExposuresByCategoryInLast7Days(workspaceId);
    for (const [category, count] of Object.entries(counts)) {
      if (count >= 3) {
        await createIncidentStatement(workspaceId, "repeated_financial_exposure", category).catch(() => {});
      }
    }
  }
}
