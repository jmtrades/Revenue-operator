/**
 * Pre-activation conversion: if workspace in observing AND financial_exposure_records exist for 2 consecutive days,
 * create incident "Current operating conditions are producing avoidable loss." Do NOT activate.
 */

import { getInstallationState } from "@/lib/installation";
import { hadExposureOnTwoConsecutiveDays } from "./index";
import { createIncidentStatement } from "@/lib/incidents";

export async function runPreActivationConversion(): Promise<void> {
  const { getDb } = await import("@/lib/db/queries");
  const db = getDb();
  const { data: states } = await db
    .from("workspace_installation_state")
    .select("workspace_id")
    .eq("phase", "observing");
  const workspaceIds = (states ?? []).map((r: { workspace_id: string }) => r.workspace_id);

  for (const workspaceId of workspaceIds) {
    const state = await getInstallationState(workspaceId);
    if (state?.phase !== "observing") continue;
    const twoDays = await hadExposureOnTwoConsecutiveDays(workspaceId);
    if (!twoDays) continue;
    await createIncidentStatement(workspaceId, "avoidable_loss_observed").catch(() => {});
  }
}
