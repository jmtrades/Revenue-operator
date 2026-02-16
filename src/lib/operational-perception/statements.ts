/**
 * Loss recognition: convert detected authority items into plain operational statements.
 * No amounts, percentages, analytics, or optimization language. Present-tense reality only.
 */

import { getCommitmentsRequiringAuthority } from "@/lib/commitment-recovery";
import { getStalledOpportunitiesRequiringAuthority } from "@/lib/opportunity-recovery";
import { getPaymentObligationsRequiringAuthority } from "@/lib/payment-completion";
import {
  getSharedTransactionsRequiringAuthority,
  getIncomingEntriesRequiringAttention,
  getNetworkEntriesRequiringAttention,
} from "@/lib/shared-transaction-assurance";

export async function generateOperationalStatements(workspaceId: string): Promise<string[]> {
  return generateOperationalStatementsSync(workspaceId);
}

async function generateOperationalStatementsSync(workspaceId: string): Promise<string[]> {
  const [
    commitments,
    stalledOpportunities,
    paymentObligations,
    sharedTransactions,
    incomingEntries,
    networkEntries,
  ] = await Promise.all([
    getCommitmentsRequiringAuthority(workspaceId),
    getStalledOpportunitiesRequiringAuthority(workspaceId),
    getPaymentObligationsRequiringAuthority(workspaceId),
    getSharedTransactionsRequiringAuthority(workspaceId),
    getIncomingEntriesRequiringAttention(workspaceId),
    getNetworkEntriesRequiringAttention(workspaceId),
  ]);

  const lines: string[] = [];

  for (const _ of commitments) {
    lines.push("A scheduled interaction did not reach confirmation.");
  }
  for (const _ of stalledOpportunities) {
    lines.push("A customer expected a response and did not receive one.");
  }
  for (const _ of paymentObligations) {
    lines.push("Payment remained incomplete after work progressed.");
  }
  for (const _ of sharedTransactions) {
    lines.push("Responsibility became unclear between parties.");
  }
  for (const _ of incomingEntries) {
    lines.push("An external expectation was not yet aligned.");
  }
  for (const _ of networkEntries) {
    lines.push("A shared obligation with another party was not yet resolved.");
  }

  const { getDb } = await import("@/lib/db/queries");
  const db = getDb();
  const { data: parallelReality } = await db
    .from("orientation_records")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("text", "Related activity occurred without reference to this record.")
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(1)
    .maybeSingle();
  
  if (parallelReality) {
    lines.push("Related activity occurred without reference to this record.");
  }

  const { data: unresolvedDeps } = await db
    .from("outcome_dependencies")
    .select("id")
    .eq("workspace_id", workspaceId)
    .is("resolved_at", null)
    .limit(1)
    .maybeSingle();
  
  if (unresolvedDeps) {
    lines.push("A dependent outcome remains unresolved.");
  }

  return lines;
}
