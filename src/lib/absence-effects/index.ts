/**
 * Absence effects: conditional statements from real recorded behaviors only.
 * No fear language. <=90 chars, past or conditional.
 */

import { getDb } from "@/lib/db/queries";

const MAX_LEN = 90;

const LINES = {
  outcome_confirmation: "Participants would request confirmation of outcomes.",
  staff_responsibility: "Staff would ask who is responsible.",
  customer_clarification: "Customers would wait for clarification.",
  direct_messaging: "Coordination would require direct messaging.",
} as const;

function trim(s: string): string {
  return s.length > MAX_LEN ? s.slice(0, MAX_LEN).trim() : s;
}

export async function getAbsenceEffectsStatements(workspaceId: string): Promise<string[]> {
  const db = getDb();
  const lines: string[] = [];
  const seen = new Set<string>();

  const [sharedAck, handoffAck, conversationsOrCommitments] = await Promise.all([
    db
      .from("shared_transactions")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("state", "acknowledged")
      .limit(1)
      .maybeSingle(),
    (async () => {
      const { data: escRows } = await db.from("escalation_logs").select("id").eq("workspace_id", workspaceId).limit(200);
      if (!escRows?.length) return false;
      const escIds = escRows.map((e: { id: string }) => e.id);
      const { data: ackRows } = await db.from("handoff_acknowledgements").select("escalation_id").in("escalation_id", escIds).limit(1);
      return (ackRows?.length ?? 0) > 0;
    })(),
    db
      .from("conversations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .limit(1)
      .maybeSingle(),
  ]);

  if (sharedAck.data && !seen.has(LINES.outcome_confirmation)) {
    seen.add(LINES.outcome_confirmation);
    lines.push(trim(LINES.outcome_confirmation));
  }
  if (handoffAck && !seen.has(LINES.staff_responsibility)) {
    seen.add(LINES.staff_responsibility);
    lines.push(trim(LINES.staff_responsibility));
  }
  if (handoffAck && !seen.has(LINES.direct_messaging)) {
    seen.add(LINES.direct_messaging);
    lines.push(trim(LINES.direct_messaging));
  }
  if (conversationsOrCommitments.data && !seen.has(LINES.customer_clarification)) {
    seen.add(LINES.customer_clarification);
    lines.push(trim(LINES.customer_clarification));
  }

  return lines;
}
