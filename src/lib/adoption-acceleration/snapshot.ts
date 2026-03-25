/**
 * Loss snapshot: natural language summary for activation_ready. No analytics, 1–3 sentences.
 */

import { getDb } from "@/lib/db/queries";

export async function generateInstallationSnapshot(workspaceId: string): Promise<string> {
  const db = getDb();
  const { count } = await db
    .from("observed_risk_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  const n = count ?? 0;
  if (n === 0) {
    return "Protection can now be activated.";
  }
  if (n === 1) {
    return "One interaction recently required manual attention to avoid being lost. Protection can now be activated.";
  }
  return "Several interactions recently required manual attention to avoid being lost. Protection can now be activated.";
}
