/**
 * First impact: factual statements from current state only.
 * No counts, time ranges, or improvement claims. Used immediately after installation.
 */

import { getDb } from "@/lib/db/queries";
import { getCommitmentsRequiringAuthority } from "@/lib/commitment-recovery";
import { getStalledOpportunitiesRequiringAuthority } from "@/lib/opportunity-recovery";
import { getPaymentObligationsRequiringAuthority } from "@/lib/payment-completion";
import { getSharedTransactionsRequiringAuthority } from "@/lib/shared-transaction-assurance";

const MAX_STATEMENT_LEN = 90;

export async function getFirstImpactStatements(workspaceId: string): Promise<string[]> {
  const db = getDb();
  const lines: string[] = [];
  const seen = new Set<string>();

  const [authorityCommitments, authorityOpportunities, authorityPayments, authorityShared, sharedAck, commitmentsAny] =
    await Promise.all([
      getCommitmentsRequiringAuthority(workspaceId),
      getStalledOpportunitiesRequiringAuthority(workspaceId),
      getPaymentObligationsRequiringAuthority(workspaceId),
      getSharedTransactionsRequiringAuthority(workspaceId),
      db
        .from("shared_transactions")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("state", "acknowledged")
        .limit(1)
        .maybeSingle(),
      db.from("commitments").select("id").eq("workspace_id", workspaceId).limit(1).maybeSingle(),
    ]);

  if (authorityCommitments.length > 0 && !seen.has("pending_interaction")) {
    seen.add("pending_interaction");
    addLine(lines, "A pending interaction was identified.", MAX_STATEMENT_LEN);
  }
  if (authorityOpportunities.length > 0 && !seen.has("pending_interaction")) {
    seen.add("pending_interaction");
    addLine(lines, "A pending interaction was identified.", MAX_STATEMENT_LEN);
  }
  if (authorityPayments.length > 0 && !seen.has("payment_pending")) {
    seen.add("payment_pending");
    addLine(lines, "A follow-up condition was detected.", MAX_STATEMENT_LEN);
  }
  if (authorityShared.length > 0 && !seen.has("responsibility_clarified")) {
    seen.add("responsibility_clarified");
    addLine(lines, "Responsibility was clarified.", MAX_STATEMENT_LEN);
  }

  const { data: reliefRow } = await db
    .from("recent_relief_events")
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle();
  if (reliefRow && !seen.has("stabilization")) {
    seen.add("stabilization");
    addLine(lines, "Stabilization was recorded.", MAX_STATEMENT_LEN);
  }

  if (sharedAck.data && !seen.has("coordination")) {
    seen.add("coordination");
    addLine(lines, "Coordination clarity was established.", MAX_STATEMENT_LEN);
  }
  if (commitmentsAny.data && !seen.has("outcome_tracking")) {
    seen.add("outcome_tracking");
    addLine(lines, "Outcome tracking is active.", MAX_STATEMENT_LEN);
  }

  return lines;
}

function addLine(lines: string[], text: string, maxLen: number): void {
  const s = text.length > maxLen ? text.slice(0, maxLen).trim() : text;
  if (s) lines.push(s);
}
