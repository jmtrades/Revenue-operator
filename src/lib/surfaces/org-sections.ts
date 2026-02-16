/**
 * Org surface sections: current operation, recent prevented, ongoing dependencies, if disabled.
 * Factual sentences only. No numbers or internal ids.
 */

import { getOrgOperationalOverview } from "@/lib/surfaces/org-overview";
import { getOrgStateFeedStatements } from "@/lib/surfaces/state-feed";
import { getRetentionInterceptPayload } from "@/lib/operational-perception/retention-intercept";
import { getDisableImpactStatements } from "@/lib/operational-perception/disable-impact";

const CAP = 8;
const MAX_CHARS = 90;

function trim(s: string): string {
  return s.length > MAX_CHARS ? s.slice(0, MAX_CHARS).trim() : s.trim();
}

export interface OrgSectionsPayload {
  current_operation: string[];
  recent_prevented_issues: string[];
  ongoing_dependencies: string[];
  if_disabled: string[];
}

export async function getOrgSections(workspaceId: string): Promise<OrgSectionsPayload> {
  const [overview, stateFeed, retention, disableImpact] = await Promise.all([
    getOrgOperationalOverview(workspaceId),
    getOrgStateFeedStatements(workspaceId),
    getRetentionInterceptPayload(workspaceId),
    getDisableImpactStatements(workspaceId),
  ]);

  const current_operation: string[] = [];
  if (overview.operation_stable) current_operation.push("Operation is stable.");
  if (overview.intervention_required) current_operation.push("Intervention is required.");
  if (overview.dependencies_externalized) current_operation.push("Dependencies are externalized.");
  if (overview.supervision_required) current_operation.push("Supervision is required.");
  if (overview.continuity_recent) current_operation.push("Continuity is recent.");
  if (current_operation.length === 0) current_operation.push("No active operation summary.");

  const recent_prevented_issues = stateFeed.slice(0, CAP).map(trim).filter(Boolean);
  const ongoing_dependencies = retention.current_dependency.slice(0, CAP).map(trim).filter(Boolean);
  const if_disabled = disableImpact.slice(0, CAP).map(trim).filter(Boolean);

  return {
    current_operation,
    recent_prevented_issues,
    ongoing_dependencies,
    if_disabled,
  };
}
