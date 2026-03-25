/**
 * Operational engines — registry and tier resolution.
 * See OPERATIONAL_INFRASTRUCTURE.md. No state mutation; gates behaviour by workspace tier.
 */

export type {
  OperationalRisk,
  OperationalEngineId,
  OperationalTier,
} from "./types";
export {
  OPERATIONAL_ENGINE_IDS,
  OPERATIONAL_TIERS,
  TIER_NAMES,
} from "./types";
export {
  getEnginesForTier,
  isEngineAllowedForTier,
  ENGINES_BY_TIER,
  ENGINE_RISKS,
} from "./registry";
export type { WorkspaceOperationalScope } from "./resolve-tier";
export {
  resolveWorkspaceOperationalScope,
  isEngineAllowedForWorkspace,
} from "./resolve-tier";
