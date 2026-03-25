/**
 * Domain stabilization: promote domains when local evidence exists.
 * Only when all domains autonomous, set workspace phase autonomous.
 */

import { getDb } from "@/lib/db/queries";
import { getConfidencePhase, setConfidencePhase, appendNarrative, isStabilityEstablished } from "./index";
import { getDomainPhase, setDomainPhase, getDomainPhases } from "./domain";

const MS_7D = 7 * 24 * 60 * 60 * 1000;

export async function runDomainStabilization(): Promise<void> {
  const db = getDb();
  const { data: workspaces } = await db.from("workspace_installation_state").select("workspace_id");
  const ids = (workspaces ?? []).map((r: { workspace_id: string }) => r.workspace_id);

  for (const workspaceId of ids) {
    const workspacePhase = await getConfidencePhase(workspaceId);
    if (workspacePhase === "autonomous") continue;
    if (await isStabilityEstablished(workspaceId)) continue;

    const since7d = new Date(Date.now() - MS_7D).toISOString();

    const [simulatedRes, revived, approvalIn7d, commitmentsResolved, orientationConfirmed, paymentRecovered, sharedAck] = await Promise.all([
      db.from("simulated_actions").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
      db.from("opportunity_states").select("id").eq("workspace_id", workspaceId).or("momentum_state.eq.revived,revive_attempts.gte.1").limit(1).maybeSingle(),
      db.from("incident_statements").select("id").eq("workspace_id", workspaceId).eq("category", "approval_required").gte("created_at", since7d).limit(1).maybeSingle(),
      db.from("commitments").select("id").eq("workspace_id", workspaceId).eq("state", "resolved").limit(2),
      db.from("orientation_records").select("id").eq("workspace_id", workspaceId).ilike("text", "%confirmed%").limit(1).maybeSingle(),
      db.from("economic_events").select("id").eq("workspace_id", workspaceId).eq("event_type", "payment_recovered").limit(1).maybeSingle(),
      db.from("shared_transactions").select("id").eq("workspace_id", workspaceId).eq("state", "acknowledged").limit(1).maybeSingle(),
    ]);

    const simCount = (simulatedRes as { count?: number })?.count ?? 0;
    const commPhase = await getDomainPhase(workspaceId, "communication");
    if (commPhase !== "autonomous" && simCount >= 2 && !!revived?.data && !approvalIn7d?.data) {
      await setDomainPhase(workspaceId, "communication", "autonomous");
    }

    const schedPhase = await getDomainPhase(workspaceId, "scheduling");
    const commitmentRows = (commitmentsResolved as { data?: unknown[] })?.data ?? [];
    if (schedPhase !== "autonomous" && commitmentRows.length >= 2 && !!orientationConfirmed?.data) {
      await setDomainPhase(workspaceId, "scheduling", "autonomous");
    }

    const payPhase = await getDomainPhase(workspaceId, "payments");
    if (payPhase !== "autonomous" && !!paymentRecovered?.data) {
      await setDomainPhase(workspaceId, "payments", "autonomous");
    }

    const coordPhase = await getDomainPhase(workspaceId, "coordination");
    if (coordPhase !== "autonomous" && !!sharedAck?.data) {
      await setDomainPhase(workspaceId, "coordination", "autonomous");
    }

    const phases = await getDomainPhases(workspaceId);
    const allAutonomous =
      phases.communication === "autonomous" &&
      phases.scheduling === "autonomous" &&
      phases.payments === "autonomous" &&
      phases.coordination === "autonomous";
    if (allAutonomous) {
      await setConfidencePhase(workspaceId, "autonomous");
      await appendNarrative(workspaceId, "stability_established", "Operational stability established.").catch(() => {});
    }
  }
}
