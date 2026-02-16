/**
 * Removal simulation: neutral conditional statements from recent history.
 * No threats, no sales language. Factual "would have" only.
 */

import { getDb } from "@/lib/db/queries";

const DAYS_LOOKBACK = 7;

const STATEMENTS = {
  no_reply: "Some interactions would have required manual tracking.",
  commitment: "Certain outcomes would not have been confirmed.",
  payment: "Pending payments would have relied on memory.",
  opportunity: "Some conversations would have required manual re-engagement.",
  shared_record: "Some agreements would not have had a shared record.",
} as const;

export async function getIfDisabledStatements(workspaceId: string): Promise<string[]> {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - DAYS_LOOKBACK);
  const sinceIso = since.toISOString();

  const lines: string[] = [];
  const seen = new Set<string>();

  const [
    noReplyEvents,
    commitmentResolved,
    paymentRecovered,
    opportunityRecovered,
    sharedAcknowledged,
  ] = await Promise.all([
    db
      .from("events")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("event_type", "no_reply_timeout")
      .gte("created_at", sinceIso)
      .limit(1)
      .maybeSingle(),
    db
      .from("commitments")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("state", "resolved")
      .gte("updated_at", sinceIso)
      .limit(1)
      .maybeSingle(),
    db
      .from("economic_events")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("event_type", "payment_recovered")
      .gte("created_at", sinceIso)
      .limit(1)
      .maybeSingle(),
    db
      .from("economic_events")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("event_type", "opportunity_recovered")
      .gte("created_at", sinceIso)
      .limit(1)
      .maybeSingle(),
    db
      .from("shared_transactions")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("state", "acknowledged")
      .gte("acknowledged_at", sinceIso)
      .limit(1)
      .maybeSingle(),
  ]);

  if (noReplyEvents?.data && !seen.has(STATEMENTS.no_reply)) {
    seen.add(STATEMENTS.no_reply);
    lines.push(STATEMENTS.no_reply);
  }
  if (commitmentResolved?.data && !seen.has(STATEMENTS.commitment)) {
    seen.add(STATEMENTS.commitment);
    lines.push(STATEMENTS.commitment);
  }
  if (paymentRecovered?.data && !seen.has(STATEMENTS.payment)) {
    seen.add(STATEMENTS.payment);
    lines.push(STATEMENTS.payment);
  }
  if (opportunityRecovered?.data && !seen.has(STATEMENTS.opportunity)) {
    seen.add(STATEMENTS.opportunity);
    lines.push(STATEMENTS.opportunity);
  }
  if (sharedAcknowledged?.data && !seen.has(STATEMENTS.shared_record)) {
    seen.add(STATEMENTS.shared_record);
    lines.push(STATEMENTS.shared_record);
  }

  const commitmentSaved = await db
    .from("economic_events")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("event_type", ["commitment_saved", "no_show_prevented"])
    .gte("created_at", sinceIso)
    .limit(1)
    .maybeSingle();
  if (commitmentSaved?.data && !seen.has(STATEMENTS.commitment)) {
    seen.add(STATEMENTS.commitment);
    lines.push(STATEMENTS.commitment);
  }

  return lines;
}
