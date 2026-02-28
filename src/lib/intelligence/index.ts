/**
 * Universal Commercial Operating Intelligence — structured, deterministic layers only.
 * No freeform. No provider calls. No DELETE.
 */

export {
  resolveObjectives,
  type PrimaryObjective,
  type SecondaryObjective,
  type ResolveObjectivesInput,
  type ResolveObjectivesResult,
  type LeadState,
  type ConversationContext,
} from "./objective-engine";

export {
  computeNextCommitmentState,
  getLatestCommitmentState,
  appendCommitmentScore,
  updateCommitmentFromVoiceOutcome,
  updateCommitmentFromMessageOutcome,
  DEFAULT_COMMITMENT_STATE,
  type CommitmentState,
  type VoiceOutcomeInput,
  type MessageOutcomeInput,
} from "./commitment-score";

export {
  categorizeFromVoiceOutcome,
  categorizeFromResponseMetadata,
  type EmotionalCategory,
  type VoiceOutcomeStructured,
  type ResponseMetadata,
} from "./emotional-normalizer";

export {
  evaluateRisk,
  type RiskEngineInput,
  type RiskEngineOutput,
} from "./risk-engine";

export {
  selectBatchWave,
  type BatchControllerInput,
  type BatchControllerOutput,
  type LeadSegmentItem,
} from "./batch-controller";

export {
  coordinateChannel,
  shouldFreezeAfterEscalation,
  type LastContactState,
  type ChannelCoordinatorInput,
  type ChannelCoordinatorOutput,
} from "./channel-coordinator";

export {
  evaluateSelfHealing,
  type SelfHealingInput,
  type SelfHealingAction,
} from "./self-healing";

export {
  buildEscalationSummary,
  type EscalationSummary,
  type BuildEscalationSummaryInput,
} from "./escalation-summary";

export {
  evaluateCadence,
  type CadenceResult,
  type EvaluateCadenceInput,
} from "./cadence-governor";

export {
  recordCommitment,
  markCommitmentFulfilled,
  markCommitmentBroken,
  getOpenCommitments,
  getBrokenCommitmentsCount,
  type CommitmentType,
  type CommitmentStatus,
  type RecordCommitmentInput,
  type CommitmentRow,
} from "./commitment-registry";

export {
  getLastNIntentActions,
  getEscalationContext,
  type EscalationContext,
  type LastActionRow,
} from "./escalation-memory";

export {
  resolveUniversalOutcome,
  insertUniversalOutcome,
  OUTCOME_TYPES,
  NEXT_REQUIRED_ACTIONS,
  type OutcomeType,
  type OutcomeConfidence,
  type NextRequiredAction,
  type ResolveUniversalOutcomeInput,
  type ResolveUniversalOutcomeResult,
  type InsertUniversalOutcomeInput,
  type UniversalOutcomeChannel,
} from "./outcome-taxonomy";

export {
  resolveConversationStage,
  CONVERSATION_STAGES,
  type ConversationStage,
  type ResolveConversationStageInput,
} from "./conversation-stage";

export {
  evaluateDrift,
  type DriftDetectorInput,
  type DriftDetectorResult,
} from "./drift-detector";

export {
  computeGoodwill,
  goodwillRequiresRiskBoost,
  goodwillRequiresForceReview,
  type GoodwillInput,
} from "./goodwill-engine";

export {
  buildConversationSnapshot,
  getPreviousSnapshot,
  type BuildConversationSnapshotInput,
} from "./conversation-snapshot";

export {
  QUESTION_TYPES,
  RESOLUTION_TYPES,
  type QuestionType,
  type ResolutionType,
  type QuestionSourceChannel,
} from "./question-taxonomy";

export {
  extractQuestionsFromVoiceOutcome,
  extractQuestionsFromMessageMetadata,
  recordUnresolvedQuestions,
  resolveQuestions,
  getOpenQuestions,
  type ExtractedQuestion,
} from "./unresolved-questions";

export {
  resolveObjectionLifecycle,
  OBJECTION_LIFECYCLE_STAGES,
  type ObjectionLifecycleStage,
  type ResolveObjectionLifecycleInput,
} from "./objection-lifecycle";

export {
  computeAttemptEnvelope,
  type AttemptEnvelopeInput,
  type AttemptEnvelopeResult,
} from "./attempt-envelope";

export {
  enforceOutcomeClosure,
  type EnforceOutcomeClosureResult,
  type ClosedOutcomeType,
} from "./outcome-closure";

export {
  getStrategicPattern,
  updateStrategicPattern,
  evaluateStrategicGuard,
  VARIANT_TO_COLUMN,
  type StrategicPatternRow,
  type StrategicGuardResult,
} from "./strategic-pattern";

export {
  evaluateWorkspacePatternGuard,
  type WorkspacePatternGuardResult,
} from "./workspace-pattern-guard";

export { selectDeterministicVariant } from "./deterministic-variant";

export {
  recordStrategyEffectiveness,
  evaluateVariantEffectiveness,
  getWorkspaceStrategyMatrix,
  SUPPRESS_THRESHOLD,
  type RecordStrategyEffectivenessInput,
  type VariantScore,
} from "./strategy-effectiveness";

export {
  applyCommitmentDecay,
  type ApplyCommitmentDecayInput,
  type CommitmentDecayResult,
} from "./commitment-decay";

export {
  buildStrategicHorizon,
  type BuildStrategicHorizonInput,
  type HorizonStep,
} from "./strategic-horizon";
