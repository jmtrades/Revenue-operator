/**
 * Domain pack engine: strategy graph, objection tree, regulatory matrix.
 * All definitions in domain_packs.config_json. No AI-invented states.
 */

export { resolveDomainContext, resolvePackPolicy, resolveDomainPackConfig } from "./resolve";
export type { DomainContext } from "./resolve";

export {
  domainPackConfigSchema,
  strategyGraphSchema,
  objectionTreeLibrarySchema,
  regulatoryMatrixSchema,
  STRATEGY_STATES,
} from "./schema";
export type {
  DomainPackConfig,
  StrategyState,
  StrategyGraph,
  StrategyStateDefinition,
  ObjectionNode,
  ObjectionTreeLibrary,
  RegulatoryMatrix,
} from "./schema";

export {
  runStrategyEngine,
  selectNextState,
  getRequiredDisclosures,
  resolveObjectionBranch,
} from "./strategy-engine";
export type { StrategyEngineInput, StrategyEngineOutput } from "./strategy-engine";

export {
  REAL_ESTATE_PACK,
  INSURANCE_PACK,
  SOLAR_PACK,
  LEGAL_INTAKE_PACK,
  INDUSTRY_PACKS,
  getIndustryPackPreset,
} from "./presets/industry-packs";
