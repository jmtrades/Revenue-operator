/**
 * Channel Orchestration Library
 * Intelligent multi-channel orchestration for lead engagement.
 * Export public API.
 */

// Core functions
export {
  determineOptimalChannel,
  buildOptimalSequence,
} from "./engine";

// Types
export type {
  ChannelRecommendation,
  SequenceStep,
  RecommendRequest,
  RecommendResponse,
  AutoSequenceRequest,
  AutoSequenceResponse,
  ChannelMetrics,
  TimeSlot,
  InsightsResponse,
  RateLimitInfo,
  RateLimitResult,
} from "./types";

export type {
  Channel,
  SequenceGoal,
  CommunicationMode,
  OutcomeType,
  SmsStatus,
  EmailStatus,
  StepCondition,
  Lead,
  CallSession,
  SmsLog,
  EmailLog,
  Workspace,
  Sequence,
} from "./types";

// Constants
export {
  CHANNEL_TYPES,
  SEQUENCE_GOALS,
  COMMUNICATION_MODES,
  CONFIDENCE_THRESHOLDS,
  RATE_LIMIT,
  DEFAULT_DELAYS,
  OPTIMAL_HOURS,
  isChannel,
  isSequenceGoal,
  isCommunicationMode,
} from "./types";
