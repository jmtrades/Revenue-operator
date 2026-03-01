/**
 * Conversational engine: RecallAgent, Brain, ResiliencyLayer, Shadow-Prompt.
 * Doctrine-aligned: no persuasion, no dynamic discounts; scheduling and clarity only.
 */

export { RecallAgent } from "./RecallAgent";
export { getShadowPrompt, SHADOW_PROMPT } from "./shadow-prompt";
export { cleanTranscript, isLikelyNoise } from "./ResiliencyLayer";
export type { ResiliencyOptions } from "./ResiliencyLayer";
export {
  getBrainToolDefinitions,
  createDefaultBrain,
  type BrainFunctions,
  type BrainConfig,
  type CheckAvailabilityResult,
  type GetBookingLinkResult,
  type RecordCommitmentIntentResult,
  type AvailabilitySlot,
} from "./Brain";
export { loadContextBuffer } from "./context-buffer";
export type { ContextBufferInput, ContextBufferResult } from "./context-buffer";
export type { RecallAgentConfig, RecallAgentBuildResult } from "./RecallAgent";
