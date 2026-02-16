/**
 * Removal consequence: statements from actual recorded behavior only.
 * No threats, predictions, or persuasion.
 */

import { getDb } from "@/lib/db/queries";

const MAX_LEN = 90;

const LINES = {
  payment_recovered: "Payment follow-through would require manual tracking.",
  commitment_saved: "Outcome confirmation would depend on memory.",
  opportunity_recovered: "Customer conversations would require manual re-engagement.",
  shared_acknowledgement: "Agreement records would not be shared between parties.",
} as const;

function trim(s: string): string {
  return s.length > MAX_LEN ? s.slice(0, MAX_LEN).trim() : s;
}

export async function getIfRemovedStatements(workspaceId: string): Promise<string[]> {
  const db = getDb();
  const lines: string[] = [];
  const seen = new Set<string>();

  const [paymentRecovered, commitmentSaved, opportunityRecovered, sharedAck] = await Promise.all([
    db
      .from("economic_events")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("event_type", "payment_recovered")
      .limit(1)
      .maybeSingle(),
    db
      .from("economic_events")
      .select("id")
      .eq("workspace_id", workspaceId)
      .in("event_type", ["commitment_saved", "no_show_prevented"])
      .limit(1)
      .maybeSingle(),
    db
      .from("economic_events")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("event_type", "opportunity_recovered")
      .limit(1)
      .maybeSingle(),
    db
      .from("shared_transactions")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("state", "acknowledged")
      .limit(1)
      .maybeSingle(),
  ]);

  if (paymentRecovered.data && !seen.has(LINES.payment_recovered)) {
    seen.add(LINES.payment_recovered);
    lines.push(trim(LINES.payment_recovered));
  }
  if (commitmentSaved.data && !seen.has(LINES.commitment_saved)) {
    seen.add(LINES.commitment_saved);
    lines.push(trim(LINES.commitment_saved));
  }
  if (opportunityRecovered.data && !seen.has(LINES.opportunity_recovered)) {
    seen.add(LINES.opportunity_recovered);
    lines.push(trim(LINES.opportunity_recovered));
  }
  if (sharedAck.data && !seen.has(LINES.shared_acknowledgement)) {
    seen.add(LINES.shared_acknowledgement);
    lines.push(trim(LINES.shared_acknowledgement));
  }

  return lines;
}
