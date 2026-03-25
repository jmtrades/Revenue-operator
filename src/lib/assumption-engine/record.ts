/**
 * Record operational assumptions. Daily dedupe by (workspace_id, type, reference_id, UTC day).
 * No logs with PII.
 */

import { getDb } from "@/lib/db/queries";
import type { AssumptionType } from "./doctrine";

export async function recordOperationalAssumption(
  workspaceId: string,
  type: AssumptionType,
  referenceId: string
): Promise<void> {
  const db = getDb();
  try {
    await db.from("operational_assumptions").insert({
      workspace_id: workspaceId,
      assumption_type: type,
      reference_id: referenceId,
      recorded_at: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "23505") return;
    throw err;
  }
}
