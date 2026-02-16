/**
 * Domain-level confidence. Autonomy by domain without UI.
 * Gate uses domain phase if present, else workspace phase.
 */

import { getDb } from "@/lib/db/queries";
import { getConfidencePhase } from "./index";
import type { ConfidencePhase } from "./index";

export type ConfidenceDomain = "communication" | "scheduling" | "payments" | "coordination";

const ACTION_TO_DOMAIN: Record<string, ConfidenceDomain> = {
  commitment_recovery: "scheduling",
  opportunity_revival: "communication",
  payment_recovery: "payments",
  shared_transaction_reminder: "coordination",
  reminder: "scheduling",
  recovery: "communication",
  win_back: "communication",
  message: "communication",
  payment_reminder: "payments",
};

export function resolveDomainForActionType(actionType: string): ConfidenceDomain | null {
  return ACTION_TO_DOMAIN[actionType] ?? null;
}

export async function getDomainPhase(
  workspaceId: string,
  domain: ConfidenceDomain
): Promise<ConfidencePhase | null> {
  const db = getDb();
  const { data } = await db
    .from("confidence_domain_state")
    .select("phase")
    .eq("workspace_id", workspaceId)
    .eq("domain", domain)
    .maybeSingle();
  const phase = (data as { phase?: string } | null)?.phase ?? null;
  if (phase && ["observing", "simulating", "assisted", "autonomous"].includes(phase)) {
    return phase as ConfidencePhase;
  }
  return null;
}

/** Effective phase for gate: domain phase if set, else workspace phase. */
export async function getEffectivePhaseForAction(
  workspaceId: string,
  actionType: string
): Promise<ConfidencePhase> {
  const domain = resolveDomainForActionType(actionType);
  if (domain) {
    const domainPhase = await getDomainPhase(workspaceId, domain);
    if (domainPhase) return domainPhase;
  }
  return getConfidencePhase(workspaceId);
}

export async function setDomainPhase(
  workspaceId: string,
  domain: ConfidenceDomain,
  phase: ConfidencePhase
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db
    .from("confidence_domain_state")
    .upsert(
      { workspace_id: workspaceId, domain, phase, updated_at: now },
      { onConflict: "workspace_id,domain" }
    );
}

export async function getDomainPhases(workspaceId: string): Promise<Record<ConfidenceDomain, ConfidencePhase>> {
  const db = getDb();
  const { data } = await db
    .from("confidence_domain_state")
    .select("domain, phase")
    .eq("workspace_id", workspaceId);
  const rows = (data ?? []) as { domain: string; phase: string }[];
  const out: Record<ConfidenceDomain, ConfidencePhase> = {
    communication: "observing",
    scheduling: "observing",
    payments: "observing",
    coordination: "observing",
  };
  for (const r of rows) {
    if (["communication", "scheduling", "payments", "coordination"].includes(r.domain) && ["observing", "simulating", "assisted", "autonomous"].includes(r.phase)) {
      out[r.domain as ConfidenceDomain] = r.phase as ConfidencePhase;
    }
  }
  return out;
}

/** Booleans only: communication_autonomous, scheduling_autonomous, payments_autonomous, coordination_autonomous. */
export async function getDomainPhasesAsBooleans(workspaceId: string): Promise<{
  communication_autonomous: boolean;
  scheduling_autonomous: boolean;
  payments_autonomous: boolean;
  coordination_autonomous: boolean;
}> {
  const phases = await getDomainPhases(workspaceId);
  return {
    communication_autonomous: phases.communication === "autonomous",
    scheduling_autonomous: phases.scheduling === "autonomous",
    payments_autonomous: phases.payments === "autonomous",
    coordination_autonomous: phases.coordination === "autonomous",
  };
}
