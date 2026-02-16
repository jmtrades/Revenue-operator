/**
 * GET /api/operational/operator-capsule?workspace_id=...
 * Single operator-facing capsule: today, proof, reversion, position.
 * Booleans and short factual lines only (≤90 chars). No ids, timestamps, counts.
 * Requires session auth + workspace access.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { generateOperationalStatements } from "@/lib/operational-perception/statements";
import { getReversionImpactStatements } from "@/lib/operational-perception/reversion-impact";
import { getInstitutionalState } from "@/lib/institutional-state";
import { providerDetachmentEstablished } from "@/lib/detachment";
import { processMaintainsOperation } from "@/lib/operability-anchor";
import { assumptionEstablished } from "@/lib/assumption-engine";
import { normalizationEstablished } from "@/lib/normalization-engine";
import { hasInterruptedExposureLast24h } from "@/lib/exposure-engine";
import { workspaceHasUnresolvedResponsibility, getPresenceStatement, STATEMENT_WORK_RELIES_OUTSIDE, STATEMENT_COORDINATION_OCCURRED, crossPartyRelianceEstablished } from "@/lib/operational-responsibilities";
import { workspaceHasDependencyPressure } from "@/lib/outcome-dependencies";
import { workspaceHasMultiDayReferences, STATEMENT_RECORD_CONTINUED_ACROSS_OCCASIONS } from "@/lib/thread-reference-memory";
import { workspaceHasReliedThreadWithAmendment, STATEMENT_PAST_ACTIVITY_POST_RELIANCE_UPDATES } from "@/lib/institutional-auditability";
import { workspaceHasTemporalStability, STATEMENT_PRESENCE_STABILITY } from "@/lib/temporal-stability";
import { getDb } from "@/lib/db/queries";

const MAX_CHARS = 90;
const CAP_TODAY = 6;
const CAP_PROOF = 8;
const CAP_REVERSION = 6;

const FORBIDDEN = /\b(you|your|we|us|click|optimize|ROI|KPI|dashboard|assistant|metric|percentage)\b/gi;

function trim(s: string): string {
  let t = s.replace(FORBIDDEN, "").replace(/\s+/g, " ").trim();
  if (t.length > MAX_CHARS) t = t.slice(0, MAX_CHARS).trim();
  return t;
}

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const [todayRaw, reversionRaw, instState, provider_detached, operation_currently_anchored, assumed_operation, normalized_operation, protection_active, hasUnresolved, hasDependencyPressure, crossPartyReliance, hasMultiDayRefs, hasReliedWithAmendment, hasTemporalStability, hasSilencePressure, hasThirdPartyReliance, hasCascadeUncertainty, hasMultiThreadOrgHint] =
    await Promise.all([
      generateOperationalStatements(workspaceId),
      getReversionImpactStatements(workspaceId),
      getInstitutionalState(workspaceId),
      providerDetachmentEstablished(workspaceId),
      processMaintainsOperation(workspaceId),
      assumptionEstablished(workspaceId),
      normalizationEstablished(workspaceId),
      hasInterruptedExposureLast24h(workspaceId),
      workspaceHasUnresolvedResponsibility(workspaceId),
      workspaceHasDependencyPressure(workspaceId),
      crossPartyRelianceEstablished(workspaceId),
      workspaceHasMultiDayReferences(workspaceId),
      workspaceHasReliedThreadWithAmendment(workspaceId),
      workspaceHasTemporalStability(workspaceId),
      (async () => {
        const { hasSilencePressure } = await import("@/lib/reality-signals/silence-pressure");
        return hasSilencePressure(workspaceId);
      })(),
      (async () => {
        const { hasThirdPartyReliance } = await import("@/lib/third-party-reliance/presence-state");
        return hasThirdPartyReliance(workspaceId);
      })(),
      (async () => {
        const { hasCascadeUncertainty } = await import("@/lib/operational-ambiguity/cascade-uncertainty");
        return hasCascadeUncertainty(workspaceId);
      })(),
      (async () => {
        const { hasMultiThreadOrgHint } = await import("@/lib/public-corridor/org-hints");
        return hasMultiThreadOrgHint(workspaceId);
      })(),
    ]);

  const today = todayRaw.slice(0, CAP_TODAY).map(trim).filter(Boolean);
  const reversion = reversionRaw.slice(0, CAP_REVERSION).map(trim).filter(Boolean);

  let proof: string[] = [];
  try {
    const db = getDb();
    const { data: row } = await db
      .from("proof_capsules")
      .select("lines")
      .eq("workspace_id", workspaceId)
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lines = (row as { lines?: string[] } | null)?.lines;
    if (Array.isArray(lines)) {
      proof = lines.slice(0, CAP_PROOF).map(trim).filter(Boolean);
    }
  } catch {
    // leave empty
  }

  const institutional_state = instState ?? "none";
  const position = {
    institutional_state:
      institutional_state === "embedded" ||
      institutional_state === "reliant" ||
      institutional_state === "assumed" ||
      institutional_state === "institutional"
        ? institutional_state
        : "none",
    provider_detached: provider_detached ?? false,
    operation_currently_anchored: operation_currently_anchored ?? false,
    assumed_operation: assumed_operation ?? false,
    normalized_operation: normalized_operation ?? false,
    protection_active: protection_active ?? false,
  };

  const presence_lines: string[] = [
    ...(hasUnresolved ? [trim(getPresenceStatement())] : []),
    ...(hasDependencyPressure ? [trim(STATEMENT_WORK_RELIES_OUTSIDE)] : []),
    ...(crossPartyReliance ? [trim(STATEMENT_COORDINATION_OCCURRED)] : []),
    ...(hasMultiDayRefs ? [trim(STATEMENT_RECORD_CONTINUED_ACROSS_OCCASIONS)] : []),
    ...(hasReliedWithAmendment ? [trim(STATEMENT_PAST_ACTIVITY_POST_RELIANCE_UPDATES)] : []),
    ...(hasTemporalStability ? [trim(STATEMENT_PRESENCE_STABILITY)] : []),
    ...(hasSilencePressure ? [trim("Dependent activity remains unresolved.")] : []),
    ...(hasThirdPartyReliance ? [trim("Work now depends on this record beyond its origin.")] : []),
    ...(hasCascadeUncertainty ? [trim("Unresolved work affects other recorded activity.")] : []),
    ...(hasMultiThreadOrgHint ? [trim("The same counterparty context appeared across multiple records.")] : []),
  ].filter(Boolean);
  
  const db = getDb();
  const { data: unresolvedDeps } = await db
    .from("outcome_dependencies")
    .select("id")
    .eq("workspace_id", workspaceId)
    .is("resolved_at", null)
    .limit(1)
    .maybeSingle();
  
  if (unresolvedDeps) {
    presence_lines.push(trim("Recorded work is awaiting external resolution."));
  }

  return NextResponse.json({
    today,
    proof,
    reversion,
    position,
    presence_lines,
  });
}
