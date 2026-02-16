/**
 * Record observed risks during observation phase (detection only, no automation).
 * Delegates to installation lib for idempotent insert (dedupe by day).
 */

import { recordObservedRiskEvent } from "@/lib/installation";
import type { ObservedRiskType } from "@/lib/installation";

export type { ObservedRiskType };

export async function recordObservedRisk(
  workspaceId: string,
  riskType: ObservedRiskType,
  subjectType: string,
  subjectId: string,
  _preventedIfActive: boolean = true,
  relatedExternalRef?: string | null
): Promise<void> {
  await recordObservedRiskEvent(workspaceId, riskType, subjectType, subjectId, relatedExternalRef);
}
