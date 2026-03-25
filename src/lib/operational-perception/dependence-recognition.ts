/**
 * Dependence recognition: outcomes depend on process; process prevents continuation; coordination externalized.
 * No metrics. Boolean only. Derived from real tables.
 */

import { countCausalChainsInLastDays } from "@/lib/causality-engine";
import { countStoppedInLastDays } from "@/lib/continuation-engine";
import { countDisplacementInLastDays } from "@/lib/coordination-displacement";

const DAYS = 7;
const MIN_CHAINS = 3;
const MIN_STOPPED = 3;
const MIN_DISPLACEMENT = 3;

/**
 * True when ≥3 causal_chains (dependency_established) in last 7 days.
 */
export async function outcomesDependOnProcess(workspaceId: string): Promise<boolean> {
  const count = await countCausalChainsInLastDays(workspaceId, DAYS);
  return count >= MIN_CHAINS;
}

/**
 * True when ≥3 continuation_exposures stopped in last 7 days.
 */
export async function processPreventsContinuation(workspaceId: string): Promise<boolean> {
  const count = await countStoppedInLastDays(workspaceId, DAYS);
  return count >= MIN_STOPPED;
}

/**
 * True when ≥3 coordination_displacement_events in last 7 days.
 */
export async function coordinationExternalized(workspaceId: string): Promise<boolean> {
  const count = await countDisplacementInLastDays(workspaceId, DAYS);
  return count >= MIN_DISPLACEMENT;
}
