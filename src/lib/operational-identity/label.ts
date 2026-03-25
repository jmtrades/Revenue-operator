/**
 * Operational identity: single sentence for surface display.
 * Maps ladder (observing, dependent, embedded, institutional, detached, normalized) to factual text.
 * No badges, colors, or scores.
 */

import { getInstitutionalState } from "@/lib/institutional-state";
import { providerDetachmentEstablished } from "@/lib/detachment";
import { normalizationEstablished } from "@/lib/normalization-engine";

export type OperationalIdentityRung =
  | "observing"
  | "dependent"
  | "embedded"
  | "institutional"
  | "detached"
  | "normalized";

const IDENTITY_LABEL: Record<OperationalIdentityRung, string> = {
  observing: "Monitoring activity",
  dependent: "Supporting operation",
  embedded: "Operating within process",
  institutional: "Part of operation",
  detached: "Operating independently",
  normalized: "Treated as standard practice",
};

/**
 * Returns the operational identity rung and the single-sentence label.
 * Order: normalized > detached > institutional > reliant > embedded > observing.
 */
export async function getOperationalIdentityLabel(
  workspaceId: string
): Promise<{ rung: OperationalIdentityRung; label: string }> {
  const [institutionalState, detached, normalized] = await Promise.all([
    getInstitutionalState(workspaceId),
    providerDetachmentEstablished(workspaceId),
    normalizationEstablished(workspaceId),
  ]);

  let rung: OperationalIdentityRung = "observing";
  if (normalized) rung = "normalized";
  else if (detached) rung = "detached";
  else if (institutionalState === "institutional" || institutionalState === "assumed")
    rung = "institutional";
  else if (institutionalState === "reliant") rung = "dependent";
  else if (institutionalState === "embedded") rung = "embedded";

  return { rung, label: IDENTITY_LABEL[rung] };
}
