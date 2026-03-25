/**
 * Disable-impact: deterministic counterfactual statements from operational evidence.
 * What would require manual handling if the process stopped. No prediction, no analytics.
 * Evidence from existing tables only, last 7 days. Max 6 lines, ≤90 chars each.
 */

import { getDb } from "@/lib/db/queries";
import { providerDetachmentEstablished } from "@/lib/detachment";
import { normalizationEstablished } from "@/lib/normalization-engine";
import { workspaceHasDependencyPressure } from "@/lib/outcome-dependencies";
import { STATEMENT_DEPENDENT_WORK_UNCERTAIN } from "@/lib/operational-responsibilities";

const MAX_LINES = 6;
const MAX_CHARS = 90;

function trim(s: string): string {
  return s.length > MAX_CHARS ? s.slice(0, MAX_CHARS).trim() : s;
}

const FORBIDDEN = /\b(you|your|we|us|click|optimize|ROI|KPI|dashboard|assistant|metric|percentage)\b/gi;

function sanitize(s: string): string {
  return trim(s.replace(FORBIDDEN, "").replace(/\s+/g, " ").trim());
}

export async function getDisableImpactStatements(workspaceId: string): Promise<string[]> {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceIso = since.toISOString();

  const out: string[] = [];

  const [
    continuationResult,
    paymentResult,
    commitmentResult,
    displacementResult,
    providerDetached,
    protectionResult,
    expectationsResult,
    normalizationEst,
  ] = await Promise.all([
    db
      .from("continuation_exposures")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("intervention_stopped_it", true)
      .gte("recorded_at", sinceIso)
      .limit(1)
      .maybeSingle(),
    db
      .from("causal_chains")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("intervention_type", "payment_recovery")
      .gte("determined_at", sinceIso)
      .limit(1)
      .maybeSingle(),
    db
      .from("causal_chains")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("intervention_type", "commitment_recovery")
      .gte("determined_at", sinceIso)
      .limit(1)
      .maybeSingle(),
    db
      .from("coordination_displacement_events")
      .select("id")
      .eq("workspace_id", workspaceId)
      .gte("recorded_at", sinceIso)
      .limit(1)
      .maybeSingle(),
    providerDetachmentEstablished(workspaceId),
    db
      .from("operational_exposures")
      .select("id")
      .eq("workspace_id", workspaceId)
      .not("interruption_source", "is", null)
      .gte("last_observed_at", sinceIso)
      .limit(1)
      .maybeSingle(),
    db
      .from("operational_expectations")
      .select("workspace_id")
      .eq("workspace_id", workspaceId)
      .eq("expectation_established", true)
      .gte("last_updated_at", sinceIso)
      .limit(1)
      .maybeSingle(),
    normalizationEstablished(workspaceId),
  ]);

  const dependencyPressure = await workspaceHasDependencyPressure(workspaceId);
  if (dependencyPressure) out.push(sanitize(STATEMENT_DEPENDENT_WORK_UNCERTAIN));
  if (continuationResult?.data) out.push(sanitize("Progress would pause without intervention."));
  if (paymentResult?.data) out.push(sanitize("Payment completion would depend on active monitoring."));
  if (commitmentResult?.data) out.push(sanitize("Attendance outcomes would require confirmation checks."));
  if (displacementResult?.data) out.push(sanitize("Coordination would move outside the record."));
  if (providerDetached) out.push(sanitize("Operations would require active supervision."));
  if (protectionResult?.data) out.push(sanitize("Operational failures would persist until addressed."));
  if (expectationsResult?.data) out.push(sanitize("Current work would require manual tracking."));
  if (normalizationEst) out.push(sanitize("Verification would return to routine checks."));

  return out.slice(0, MAX_LINES).filter(Boolean);
}
