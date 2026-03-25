/**
 * GET /api/operator/deal-justification?workspace_id=...
 * Internal only. Returns JSON booleans for operator use. Not in public or responsibility surfaces.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import { countUnresolvedImmediateRisks } from "@/lib/immediate-risk";
import { hasEconomicEventsInLast7Days } from "@/lib/economic-events";
import { hasEconomicActivation } from "@/lib/economic-participation";
import { getCommitmentsRequiringAuthority } from "@/lib/commitment-recovery";
import { getStalledOpportunitiesRequiringAuthority } from "@/lib/opportunity-recovery";
import { getPaymentObligationsRequiringAuthority } from "@/lib/payment-completion";
import { getSharedTransactionsRequiringAuthority, getIncomingEntriesRequiringAttention } from "@/lib/shared-transaction-assurance";
import { hasUnresolvedFinancialExposure } from "@/lib/financial-exposure";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const db = getDb();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    incidentRes,
    observedRes,
    immediateRiskCount,
    economicEvents,
    economicActivation,
    commitments,
    opportunities,
    payments,
    sharedTx,
    incomingEntries,
    financialRiskPresent,
    repeatedIncidentRes,
    preventedIncidentRes,
  ] = await Promise.all([
    db.from("incident_statements").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("created_at", since7d),
    db.from("observed_risk_events").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("detected_at", since7d),
    countUnresolvedImmediateRisks(workspaceId),
    hasEconomicEventsInLast7Days(workspaceId),
    hasEconomicActivation(workspaceId),
    getCommitmentsRequiringAuthority(workspaceId),
    getStalledOpportunitiesRequiringAuthority(workspaceId),
    getPaymentObligationsRequiringAuthority(workspaceId),
    getSharedTransactionsRequiringAuthority(workspaceId),
    getIncomingEntriesRequiringAttention(workspaceId),
    hasUnresolvedFinancialExposure(workspaceId),
    db.from("incident_statements").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("category", "repeated_financial_exposure").gte("created_at", since7d),
    db.from("incident_statements").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("category", "continuation_prevented").gte("created_at", since7d),
  ]);

  const instability_detected = ((incidentRes as { count?: number })?.count ?? 0) > 0 || ((observedRes as { count?: number })?.count ?? 0) > 0;
  const immediate_risk_present = immediateRiskCount > 0;
  const manual_supervision_required =
    commitments.length > 0 || opportunities.length > 0 || payments.length > 0 || sharedTx.length > 0;
  const economic_events_present = economicEvents || economicActivation;
  const network_dependency_present = incomingEntries.length > 0;
  const financial_risk_present = financialRiskPresent;
  const repeated_instability = ((repeatedIncidentRes as { count?: number })?.count ?? 0) > 0;
  const prevented_instability = ((preventedIncidentRes as { count?: number })?.count ?? 0) > 0;

  return NextResponse.json({
    instability_detected,
    immediate_risk_present,
    manual_supervision_required,
    economic_events_present,
    network_dependency_present,
    financial_risk_present,
    repeated_instability,
    prevented_instability,
  });
}
