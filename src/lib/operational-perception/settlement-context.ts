/**
 * Settlement context: administrative activation only when structural dependence and institutional state reached.
 * Ladder: confidence not observing + operationally_embedded + outcomes_depend + process_prevents + coordination_externalized.
 * Administrative activation requires institutional_state = "institutional" only.
 */

import { getConfidencePhase } from "@/lib/confidence-engine";
import {
  outcomesDependOnProcess,
  processPreventsContinuation,
  coordinationExternalized,
} from "./dependence-recognition";
import { getContinuityDuration } from "@/lib/operational-timeline-memory";
import { getMemoryRoleStatements } from "@/lib/memory-replacement";
import { getExternalRecognition } from "@/lib/environment-recognition";
import { getInstitutionalState } from "@/lib/institutional-state";
import { providerDetachmentEstablished } from "@/lib/detachment";
import { processMaintainsOperation } from "@/lib/operability-anchor";
import { hasAnchoredAcrossDays } from "@/lib/operability-anchor/anchor-days";
import { assumptionEstablished } from "@/lib/assumption-engine";
import { normalizationEstablished } from "@/lib/normalization-engine";
import { crossPartyRelianceEstablished } from "@/lib/operational-responsibilities";
import { workspaceHasDependencyPressure } from "@/lib/outcome-dependencies";
import { workspaceHasAmendmentInLast24h } from "@/lib/institutional-auditability";
import { workspaceHasMultiDayStability } from "@/lib/temporal-stability";

export async function isAdministrativeActivationAvailable(workspaceId: string): Promise<boolean> {
  const [confidencePhase, outcomesDepend, continuationPrevented, coordinationExt, continuityDuration, memoryRoleStatements, externalRecognition, institutionalState, providerDetached, operationAnchored, anchoredAcrossDays, assumed, normalized, crossPartyReliance, dependencyPressure, amendmentInLast24h, multiDayStability] =
    await Promise.all([
      getConfidencePhase(workspaceId),
      outcomesDependOnProcess(workspaceId),
      processPreventsContinuation(workspaceId),
      coordinationExternalized(workspaceId),
      getContinuityDuration(workspaceId),
      getMemoryRoleStatements(workspaceId),
      getExternalRecognition(workspaceId),
      getInstitutionalState(workspaceId),
      providerDetachmentEstablished(workspaceId),
      processMaintainsOperation(workspaceId),
      hasAnchoredAcrossDays(workspaceId, 2, 7),
      assumptionEstablished(workspaceId),
      normalizationEstablished(workspaceId),
      crossPartyRelianceEstablished(workspaceId),
      workspaceHasDependencyPressure(workspaceId),
      workspaceHasAmendmentInLast24h(workspaceId),
      workspaceHasMultiDayStability(workspaceId),
    ]);
  if (confidencePhase === "observing") return false;
  if (amendmentInLast24h) return false;
  if (!multiDayStability) return false;
  const operationally_embedded =
    continuityDuration.operations_have_been_continuous &&
    memoryRoleStatements.length > 0 &&
    externalRecognition.recognized_as_shared_process;
  const ladderMet =
    operationally_embedded &&
    outcomesDepend &&
    continuationPrevented &&
    coordinationExt;
  const institutionalReady = institutionalState === "institutional";
  return (
    ladderMet &&
    institutionalReady &&
    providerDetached &&
    operationAnchored &&
    anchoredAcrossDays &&
    assumed &&
    normalized &&
    crossPartyReliance &&
    dependencyPressure
  );
}

export async function getSettlementContext(workspaceId: string): Promise<{
  administrative_activation_available: boolean;
}> {
  const available = await isAdministrativeActivationAvailable(workspaceId);
  return { administrative_activation_available: available };
}
