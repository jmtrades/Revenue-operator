/**
 * Stabilization detection: when all conditions met, transition confidence_phase → autonomous.
 * Conditions: ≥3 prevented failures, ≥1 economic event, ≥1 resolved commitment, ≥1 resolved opportunity.
 */

import { getDb } from "@/lib/db/queries";
import { getConfidencePhase, setConfidencePhase, appendNarrative, isStabilityEstablished } from "./index";

const PREVENTED_CATEGORIES = [
  "commitment_saved",
  "payment_recovered",
  "opportunity_revived",
  "dispute_prevented",
  "no_show_prevented",
  "long_gap_followup",
  "returning_customer_drop",
  "high_value_inquiry_delay",
  "completed_work_unpaid",
  "silence_risk_urgent_intent",
  "promise_followthrough_gap",
  "deposit_gap_after_booking",
];

export async function runStabilizationDetection(): Promise<void> {
  const db = getDb();
  const { data: workspaces } = await db.from("workspace_installation_state").select("workspace_id");
  const ids = (workspaces ?? []).map((r: { workspace_id: string }) => r.workspace_id);

  for (const workspaceId of ids) {
    const phase = await getConfidencePhase(workspaceId);
    if (phase === "autonomous") continue;
    if (await isStabilityEstablished(workspaceId)) continue;

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [
      incidentRes,
      economicRes,
      commitmentRes,
      opportunityRes,
    ] = await Promise.all([
      db.from("incident_statements").select("id").eq("workspace_id", workspaceId).in("category", PREVENTED_CATEGORIES).gte("created_at", since),
      db.from("economic_events").select("id").eq("workspace_id", workspaceId).limit(1),
      db.from("commitments").select("id").eq("workspace_id", workspaceId).eq("state", "resolved").limit(1),
      db.from("opportunity_states").select("id").eq("workspace_id", workspaceId).or("momentum_state.eq.revived,revive_attempts.gte.1").limit(1),
    ]);

    const preventedCount = (incidentRes.data ?? []).length;
    const hasEconomic = (economicRes.data ?? []).length > 0;
    const hasResolvedCommitment = (commitmentRes.data ?? []).length > 0;
    const hasResolvedOpportunity = (opportunityRes.data ?? []).length > 0;

    if (preventedCount >= 3 && hasEconomic && hasResolvedCommitment && hasResolvedOpportunity) {
      await setConfidencePhase(workspaceId, "autonomous");
      await appendNarrative(workspaceId, "stability_established", "Operational stability established.").catch(() => {});
    }
  }
}
