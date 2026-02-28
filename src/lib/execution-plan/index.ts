/**
 * Canonical execution plan: governed, compliant, auditable. No freeform AI.
 */

export type {
  ExecutionPlan,
  ExecutionPlanIdentifiers,
  ExecutionTrace,
  ExecutionDecision,
  ApprovalModeValue,
  ActionIntentToEmit,
} from "./types";

export { buildExecutionPlan } from "./build";
export type { NormalizedInboundEvent, ConversationContext, DomainHints } from "./build";

export { emitExecutionPlanIntent } from "./emit";
export type { EmitRecipient } from "./emit";

export { runGovernedExecution } from "./run";
export type { RunGovernedExecutionInput } from "./run";
