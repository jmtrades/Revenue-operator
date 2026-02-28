/**
 * Domain pack validation gate. Before activation, pack must be complete.
 * Returns domain_pack_incomplete if validation fails.
 */

import { getDb } from "@/lib/db/queries";
import type { DomainPackConfig } from "./schema";

const MIN_STRATEGY_STATES = 15;

export type ValidateActivationResult = { ok: true } | { ok: false; reason: "domain_pack_incomplete" };

export async function validateDomainPackForActivation(workspaceId: string): Promise<ValidateActivationResult> {
  const db = getDb();
  const { data: row } = await db
    .from("domain_packs")
    .select("config_json")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!row?.config_json || typeof row.config_json !== "object") {
    return { ok: false, reason: "domain_pack_incomplete" };
  }

  const config = row.config_json as DomainPackConfig;
  const states = config.strategy_graph?.states;
  const stateCount = states && typeof states === "object" ? Object.keys(states).length : 0;
  if (stateCount < MIN_STRATEGY_STATES) {
    return { ok: false, reason: "domain_pack_incomplete" };
  }

  if (!config.objection_tree_library || typeof config.objection_tree_library !== "object") {
    return { ok: false, reason: "domain_pack_incomplete" };
  }

  if (!config.regulatory_matrix || typeof config.regulatory_matrix !== "object") {
    return { ok: false, reason: "domain_pack_incomplete" };
  }

  return { ok: true };
}
