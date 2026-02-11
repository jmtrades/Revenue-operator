/**
 * Log restraint: when the system delays action and explains why.
 */

import { getDb } from "@/lib/db/queries";
import { narrativeForRestraint } from "./build-narrative";

export async function logRestraint(
  workspaceId: string,
  leadId: string,
  reason: string,
  details?: Record<string, unknown>
): Promise<void> {
  const narrative = narrativeForRestraint(reason, details);
  const db = getDb();
  await db.from("action_logs").insert({
    workspace_id: workspaceId,
    entity_type: "lead",
    entity_id: leadId,
    action: "restraint",
    actor: "Department",
    role: null,
    payload: {
      reason,
      noticed: narrative.noticed,
      decision: narrative.decision,
      expected: narrative.expected,
      ...details,
    },
  });
}
