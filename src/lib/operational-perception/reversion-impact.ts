/**
 * Reversion impact: factual conditional statements from dependence, memory role, if_removed, continuity.
 * No fear or persuasion. Under 90 characters each.
 */

import { getDependenceBooleans } from "@/lib/operational-dependency-memory";
import { getMemoryRoleStatements } from "@/lib/memory-replacement";
import { getIfRemovedStatements } from "./if-removed";
import { getContinuityDuration } from "@/lib/operational-timeline-memory";

const MAX_LEN = 90;

const LINES = {
  tracking: "If operations returned to manual handling, tracking would resume.",
  supervision: "Certain outcomes would require direct supervision.",
  coordination: "Shared coordination would require confirmation messages.",
  continuity: "Operational continuity would be interrupted.",
} as const;

function trim(s: string): string {
  return s.length > MAX_LEN ? s.slice(0, MAX_LEN).trim() : s;
}

export async function getReversionImpactStatements(workspaceId: string): Promise<string[]> {
  const [dependence, memoryRole, ifRemoved, continuity] = await Promise.all([
    getDependenceBooleans(workspaceId),
    getMemoryRoleStatements(workspaceId),
    getIfRemovedStatements(workspaceId),
    getContinuityDuration(workspaceId),
  ]);

  const lines: string[] = [];
  const seen = new Set<string>();

  const hasTrackingEvidence =
    dependence.manual_followup_replaced ||
    dependence.payments_not_tracked_manually ||
    memoryRole.length > 0 ||
    ifRemoved.length > 0;
  if (hasTrackingEvidence && !seen.has(LINES.tracking)) {
    seen.add(LINES.tracking);
    lines.push(trim(LINES.tracking));
  }

  const hasOutcomeEvidence = dependence.outcomes_verified || memoryRole.some((s) => s.includes("outcome"));
  if (hasOutcomeEvidence && !seen.has(LINES.supervision)) {
    seen.add(LINES.supervision);
    lines.push(trim(LINES.supervision));
  }

  const hasCoordinationEvidence = dependence.agreements_shared || memoryRole.some((s) => s.includes("conversation") || s.includes("interaction"));
  if (hasCoordinationEvidence && !seen.has(LINES.coordination)) {
    seen.add(LINES.coordination);
    lines.push(trim(LINES.coordination));
  }

  if (continuity.operations_have_been_continuous && !seen.has(LINES.continuity)) {
    seen.add(LINES.continuity);
    lines.push(trim(LINES.continuity));
  }

  return lines;
}
