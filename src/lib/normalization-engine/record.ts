/**
 * Record operational normalizations. Daily dedupe by (workspace_id, type, reference_id, UTC day).
 */

import { getDb } from "@/lib/db/queries";
import type { NormalizationType } from "./doctrine";

export async function recordNormalization(
  workspaceId: string,
  normalizationType: NormalizationType,
  referenceId: string,
  priorVerificationObserved: boolean = true
): Promise<void> {
  const db = getDb();
  try {
    await db.from("operational_normalizations").insert({
      workspace_id: workspaceId,
      normalization_type: normalizationType,
      reference_id: referenceId,
      prior_verification_observed: priorVerificationObserved,
      recorded_at: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "23505") return;
    throw err;
  }
}
