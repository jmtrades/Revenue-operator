/**
 * Causality engine: determines whether observed outcomes depended on system intervention.
 * No metrics, no ROI, no probabilities. Sequence, intervention, outcome only.
 */

export type { CausalChainInput, InterventionType, BaselineOutcome, ObservedOutcome } from "./types";
export { recordCausalChain, countCausalChainsInLastDays } from "./record";
