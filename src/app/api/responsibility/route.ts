/**
 * GET /api/responsibility
 * Responsibility surface: what requires human authority right now.
 * Returns only unresolved authority items; no dashboards, analytics, or configuration.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getCommitmentsRequiringAuthority } from "@/lib/commitment-recovery";
import { getStalledOpportunitiesRequiringAuthority } from "@/lib/opportunity-recovery";
import { getPaymentObligationsRequiringAuthority } from "@/lib/payment-completion";
import {
  getSharedTransactionsRequiringAuthority,
  getIncomingEntriesRequiringAttention,
  getNetworkEntriesRequiringAttention,
} from "@/lib/shared-transaction-assurance";
import { hasEconomicEventsInLast7Days } from "@/lib/economic-events";
import { hasExternalDependenciesForWorkspace } from "@/lib/counterparty-participation";
import { hasEconomicActivation } from "@/lib/economic-participation";
import { getSettlementState } from "@/lib/settlement";
import { getWorkspaceReadiness } from "@/lib/runtime/workspace-readiness";
import { ensureInstallationState, advanceObservationPhaseIfDue } from "@/lib/adoption-acceleration/installation-state";
import { getInstallationState } from "@/lib/installation";
import { listPendingPreviews } from "@/lib/previews";
import { getConfidenceState } from "@/lib/confidence-engine";
import { getDomainPhasesAsBooleans } from "@/lib/confidence-engine/domain";
import { isOperationalMemoryActive } from "@/lib/operational-memory";
import { isBehavioralAssumptionActive } from "@/lib/decision-assumption";
import { hasRelationshipDependence } from "@/lib/relationship-continuity";
import { hasStructuralRulesEnforced } from "@/lib/economic-gravity";
import { isRitualCycleActive } from "@/lib/ritual-cycles";
import { getDependenceBooleans } from "@/lib/operational-dependency-memory";
import { getEnvironmentPresence } from "@/lib/shared-environment-density";
import { getSettlementContext } from "@/lib/operational-perception/settlement-context";
import {
  outcomesDependOnProcess,
  processPreventsContinuation,
  coordinationExternalized,
} from "@/lib/operational-perception/dependence-recognition";
import { getContinuityDuration } from "@/lib/operational-timeline-memory";
import { getMemoryRoleStatements } from "@/lib/memory-replacement";
import { getExternalRecognition } from "@/lib/environment-recognition";
import { getDb } from "@/lib/db/queries";
import { getInstitutionalState } from "@/lib/institutional-state";
import { authorityExternalized } from "@/lib/responsibility-moments";
import { providerDetachmentEstablished } from "@/lib/detachment";
import { processMaintainsOperation } from "@/lib/operability-anchor";
import { assumptionEstablished, recordAssumptionOrientationOnce } from "@/lib/assumption-engine";
import { hasInterruptedExposureLast24h } from "@/lib/exposure-engine";
import { normalizationEstablished } from "@/lib/normalization-engine";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const [
    commitments,
    stalledOpportunities,
    paymentObligations,
    sharedTransactions,
    incomingEntries,
    networkEntries,
    lastPeriodValueGenerated,
    externalDependenciesPresent,
    environmentEconomicallyActive,
    settlementState,
    readiness,
  ] = await Promise.all([
    getCommitmentsRequiringAuthority(workspaceId),
    getStalledOpportunitiesRequiringAuthority(workspaceId),
    getPaymentObligationsRequiringAuthority(workspaceId),
    getSharedTransactionsRequiringAuthority(workspaceId),
    getIncomingEntriesRequiringAttention(workspaceId),
    getNetworkEntriesRequiringAttention(workspaceId),
    hasEconomicEventsInLast7Days(workspaceId),
    hasExternalDependenciesForWorkspace(workspaceId),
    hasEconomicActivation(workspaceId),
    getSettlementState(workspaceId),
    getWorkspaceReadiness(workspaceId),
  ]);
  await ensureInstallationState(workspaceId, {
    messagingConnected: readiness.messaging_connected,
    paymentsConnected: readiness.payments_connected,
  }).catch(() => {});
  await advanceObservationPhaseIfDue(workspaceId).catch(() => {});

  for (const e of incomingEntries) {
    import("@/lib/record-reference").then(({ recordRecordReference }) =>
      recordRecordReference(workspaceId, "staff", "dashboard_record", e.external_ref).catch(() => {})
    );
  }

  const instState = await getInstallationState(workspaceId);
  const previewsList = await listPendingPreviews(workspaceId).catch(() => []);
  const [confidence_state, domain_phases] = await Promise.all([
    getConfidenceState(workspaceId),
    getDomainPhasesAsBooleans(workspaceId),
  ]);
  const [
    operational_memory_active,
    behavioral_assumption_active,
    relationship_dependence_present,
    structural_rules_enforced,
    ritual_cycle_active,
    dependence,
    environmentPresence,
    settlementContext,
    continuityDuration,
    memoryRoleStatements,
    externalRecognition,
    outcomes_attributable,
    continuation_prevented,
    coordination_externalized,
    institutional_state,
    authority_externalized,
    provider_detached,
    operation_currently_anchored,
    assumed_operation,
    protection_active,
    normalized_operation,
  ] = await Promise.all([
    isOperationalMemoryActive(workspaceId),
    isBehavioralAssumptionActive(workspaceId),
    hasRelationshipDependence(workspaceId),
    hasStructuralRulesEnforced(workspaceId),
    isRitualCycleActive(workspaceId),
    getDependenceBooleans(workspaceId),
    getEnvironmentPresence(workspaceId),
    getSettlementContext(workspaceId),
    getContinuityDuration(workspaceId),
    getMemoryRoleStatements(workspaceId),
    getExternalRecognition(workspaceId),
    outcomesDependOnProcess(workspaceId),
    processPreventsContinuation(workspaceId),
    coordinationExternalized(workspaceId),
    getInstitutionalState(workspaceId),
    authorityExternalized(workspaceId),
    providerDetachmentEstablished(workspaceId),
    processMaintainsOperation(workspaceId),
    assumptionEstablished(workspaceId),
    hasInterruptedExposureLast24h(workspaceId),
    normalizationEstablished(workspaceId),
  ]);
  recordAssumptionOrientationOnce(workspaceId).catch(() => {});

  const operationally_embedded =
    continuityDuration.operations_have_been_continuous &&
    memoryRoleStatements.length > 0 &&
    externalRecognition.recognized_as_shared_process;

  const structurally_dependent =
    operationally_embedded &&
    outcomes_attributable &&
    continuation_prevented &&
    coordination_externalized;

  const operational_position = {
    stabilized:
      dependence.manual_followup_replaced &&
      dependence.outcomes_verified &&
      dependence.payments_not_tracked_manually &&
      dependence.agreements_shared,
    externally_coordinated: environmentPresence.coordination_outside_environment_unlikely,
    administrative_ready: settlementContext.administrative_activation_available,
    operationally_embedded,
    continuation_prevented,
    outcomes_attributable,
    coordination_externalized,
    structurally_dependent,
    institutional_state: institutional_state ?? "none",
    authority_externalized: authority_externalized ?? false,
    provider_detached: provider_detached ?? false,
    operation_currently_anchored: operation_currently_anchored ?? false,
    assumed_operation: assumed_operation ?? false,
    protection_active: protection_active ?? false,
    normalized_operation: normalized_operation ?? false,
  };

  if (provider_detached) {
    const db = getDb();
    const { data: orientRow } = await db
      .from("workspace_orientation_state")
      .select("provider_detached_orientation_recorded_at")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    const alreadyRecorded = (orientRow as { provider_detached_orientation_recorded_at?: string | null } | null)?.provider_detached_orientation_recorded_at;
    if (!alreadyRecorded) {
      const { recordOrientationStatement } = await import("@/lib/orientation/records");
      await recordOrientationStatement(workspaceId, "The provider was no longer required for operation.").catch(() => {});
      const now = new Date().toISOString();
      try {
        const { data: row } = await db.from("workspace_orientation_state").select("workspace_id").eq("workspace_id", workspaceId).maybeSingle();
        if (row) {
          await db.from("workspace_orientation_state").update({ provider_detached_orientation_recorded_at: now }).eq("workspace_id", workspaceId);
        } else {
          await db.from("workspace_orientation_state").insert({ workspace_id: workspaceId, provider_detached_orientation_recorded_at: now });
        }
      } catch {
        // ignore
      }
    }
  }

  if (operation_currently_anchored) {
    const db = getDb();
    const { data: orientRow } = await db
      .from("workspace_orientation_state")
      .select("operation_anchored_orientation_recorded_at")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    const alreadyRecorded = (orientRow as { operation_anchored_orientation_recorded_at?: string | null } | null)?.operation_anchored_orientation_recorded_at;
    if (!alreadyRecorded) {
      const { recordOrientationStatement } = await import("@/lib/orientation/records");
      await recordOrientationStatement(workspaceId, "The operation became sustained through the process.").catch(() => {});
      const now = new Date().toISOString();
      try {
        const { data: row } = await db.from("workspace_orientation_state").select("workspace_id").eq("workspace_id", workspaceId).maybeSingle();
        if (row) {
          await db.from("workspace_orientation_state").update({ operation_anchored_orientation_recorded_at: now }).eq("workspace_id", workspaceId);
        } else {
          await db.from("workspace_orientation_state").insert({ workspace_id: workspaceId, operation_anchored_orientation_recorded_at: now });
        }
      } catch {
        // ignore
      }
    }
  }

  if (structurally_dependent) {
    const db = getDb();
    const { data: orientRow } = await db
      .from("workspace_orientation_state")
      .select("structural_orientation_recorded_at")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    const alreadyRecorded = (orientRow as { structural_orientation_recorded_at?: string | null } | null)?.structural_orientation_recorded_at;
    if (!alreadyRecorded) {
      const { recordOrientationStatement } = await import("@/lib/orientation/records");
      await recordOrientationStatement(workspaceId, "The organization operated through the environment.").catch(() => {});
      const now = new Date().toISOString();
      try {
        if (orientRow) {
          await db
            .from("workspace_orientation_state")
            .update({ structural_orientation_recorded_at: now })
            .eq("workspace_id", workspaceId);
        } else {
          await db
            .from("workspace_orientation_state")
            .insert({ workspace_id: workspaceId, structural_orientation_recorded_at: now });
        }
      } catch {
        // ignore
      }
    }
  }

  if (operationally_embedded) {
    const db = getDb();
    const { data: orientRow } = await db
      .from("workspace_orientation_state")
      .select("operational_process_established_at")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    const alreadyRecorded = (orientRow as { operational_process_established_at?: string | null } | null)?.operational_process_established_at;
    if (!alreadyRecorded) {
      const { recordOrientationStatement } = await import("@/lib/orientation/records");
      await recordOrientationStatement(workspaceId, "The operating process became established.").catch(() => {});
      const now = new Date().toISOString();
      try {
        if (orientRow) {
          await db
            .from("workspace_orientation_state")
            .update({ operational_process_established_at: now })
            .eq("workspace_id", workspaceId);
        } else {
          await db
            .from("workspace_orientation_state")
            .insert({ workspace_id: workspaceId, operational_process_established_at: now });
        }
      } catch {
        // ignore
      }
    }
  }

  const phaseDisplay: Record<string, string> = {
    observing: "Observation",
    activation_ready: "Simulation",
    active: "Autonomous",
    simulating: "Simulation",
    assisted: "Assisted",
    autonomous: "Autonomous",
  };
  const instPhase = instState?.phase ?? "observing";
  const confidencePhase = confidence_state.phase;

  return NextResponse.json({
    authority_required: {
      commitments: commitments.length,
      stalled_opportunities: stalledOpportunities.length,
      payment_obligations: paymentObligations.length,
      shared_transactions: sharedTransactions.length,
      incoming_entries: incomingEntries.length,
      network_entries: networkEntries.length,
      total:
        commitments.length +
        stalledOpportunities.length +
        paymentObligations.length +
        sharedTransactions.length +
        incomingEntries.length +
        networkEntries.length,
    },
    installation_phase: phaseDisplay[instPhase] ?? instPhase,
    confidence_phase: phaseDisplay[confidencePhase] ?? confidencePhase,
    commitments: commitments.map((c) => ({
      id: c.id,
      subject_type: c.subject_type,
      subject_id: c.subject_id,
      expected_at: c.expected_at,
      state: c.state,
    })),
    stalled_opportunities: stalledOpportunities.map((o) => ({
      id: o.id,
      conversation_id: o.conversation_id,
      momentum_state: o.momentum_state,
      last_customer_message_at: o.last_customer_message_at,
      revive_attempts: o.revive_attempts,
    })),
    payment_obligations: paymentObligations.map((p) => ({
      id: p.id,
      subject_type: p.subject_type,
      subject_id: p.subject_id,
      amount: p.amount,
      currency: p.currency,
      due_at: p.due_at,
      state: p.state,
      recovery_attempts: p.recovery_attempts,
    })),
    shared_transactions: sharedTransactions.map((t) => ({
      id: t.id,
      subject_type: t.subject_type,
      subject_id: t.subject_id,
      state: t.state,
      dispute_reason: t.dispute_reason,
      acknowledgement_deadline: t.acknowledgement_deadline,
      counterparty_identifier: t.counterparty_identifier,
    })),
    incoming_entries: incomingEntries.map((e) => ({
      external_ref: e.external_ref,
      state: e.state,
      last_event_at: e.last_event_at,
    })),
    network_entries: networkEntries.map((e) => ({
      external_ref: e.external_ref,
      state: e.state,
      last_event_at: e.last_event_at,
    })),
    economic_state: {
      last_period_value_generated: lastPeriodValueGenerated,
      environment_economically_active: environmentEconomicallyActive,
    },
    environment_state: {
      external_dependencies_present: externalDependenciesPresent,
    },
    settlement_state: {
      active: settlementState.active,
      pending_authorization: settlementState.pending_authorization,
      suspended: settlementState.suspended,
    },
    installation_state: instState
      ? {
          phase: instState.phase,
          phase_display: phaseDisplay[instState.phase] ?? instState.phase,
          activation_ready: instState.phase === "activation_ready",
          active: instState.phase === "active",
        }
      : { phase: "observing", phase_display: "Observation", activation_ready: false, active: false },
    previews_present: previewsList.length > 0,
    confidence_state: {
      phase: confidence_state.phase,
      simulations_present: confidence_state.simulations_present,
      approvals_required: confidence_state.approvals_required,
      stability_established: confidence_state.stability_established,
      domain_phases,
    },
    operational_memory_active,
    behavioral_assumption_active,
    relationship_dependence_present,
    structural_rules_enforced,
    ritual_cycle_active,
    operational_position,
  });
}
