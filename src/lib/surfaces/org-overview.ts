/**
 * Organization surface: operational overview booleans from existing engine outputs.
 * No numbers. Derived from protection_active, structural dependence, provider_detached,
 * processMaintainsOperation, outcomesDependOnProcess.
 */

import { hasInterruptedExposureLast24h } from "@/lib/exposure-engine";
import { getStructuralDependence } from "@/lib/structural-dependence";
import { providerDetachmentEstablished } from "@/lib/detachment";
import { processMaintainsOperation } from "@/lib/operability-anchor";
import { outcomesDependOnProcess } from "@/lib/operational-perception/dependence-recognition";

export interface OrgOperationalOverview {
  operation_stable: boolean;
  intervention_required: boolean;
  dependencies_externalized: boolean;
  supervision_required: boolean;
  continuity_recent: boolean;
}

export async function getOrgOperationalOverview(workspaceId: string): Promise<OrgOperationalOverview> {
  const [protectionActive, structural, providerDetached, processAnchored, outcomesDepend] = await Promise.all([
    hasInterruptedExposureLast24h(workspaceId),
    getStructuralDependence(workspaceId),
    providerDetachmentEstablished(workspaceId),
    processMaintainsOperation(workspaceId),
    outcomesDependOnProcess(workspaceId),
  ]);

  const structurally_dependent = structural.organization_operates_inside_environment;

  return {
    operation_stable: processAnchored && !protectionActive,
    intervention_required: protectionActive,
    dependencies_externalized: outcomesDepend && structurally_dependent,
    supervision_required: providerDetached,
    continuity_recent: processAnchored || outcomesDepend,
  };
}
