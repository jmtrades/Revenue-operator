/**
 * Channel Orchestration - Type Definitions
 * Comprehensive types for the orchestration system.
 */

/**
 * Supported communication channels
 */
export type Channel = "call" | "sms" | "email";

/**
 * Communication goals for sequence generation
 */
export type SequenceGoal =
  | "book_appointment"
  | "reactivate"
  | "qualify"
  | "close_deal"
  | "review_request";

/**
 * Workspace communication preference
 */
export type CommunicationMode = "aggressive" | "balanced" | "conservative";

/**
 * Lead engagement outcome
 */
export type OutcomeType =
  | "success"
  | "no_answer"
  | "voicemail"
  | "declined"
  | "busy"
  | "invalid_number"
  | "do_not_call";

/**
 * SMS delivery status
 */
export type SmsStatus = "pending" | "sent" | "delivered" | "failed" | "responded";

/**
 * Email delivery status
 */
export type EmailStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "bounced"
  | "opened"
  | "clicked"
  | "unsubscribed";

/**
 * Condition for sequence step execution
 */
export type StepCondition =
  | "no_response"
  | "voicemail_left"
  | "no_response_to_call"
  | "no_response_to_sms"
  | "no_response_to_email"
  | "no_signature"
  | "immediate";

// ============ Main API Types ============

/**
 * Result of channel analysis and recommendation
 */
export interface ChannelRecommendation {
  /** Most suitable channel for this lead */
  recommended_channel: Channel;

  /** Confidence score (0.4-0.95) indicating recommendation strength */
  confidence: number;

  /** Human-readable explanation of recommendation */
  reasoning: string;

  /** Secondary channel if primary fails (or null) */
  fallback_channel: Channel | null;

  /** Optimal time window for contact (e.g., "09:00-17:00") */
  optimal_time: string | null;

  /** Channels to avoid (lead unsubscribed or very low response rate) */
  avoid_channels: Channel[];
}

/**
 * Single step in a multi-step sequence
 */
export interface SequenceStep {
  /** Communication channel for this step */
  channel: Channel;

  /** Hours to wait before executing this step (0 = immediate) */
  delay_hours: number;

  /** Description of message template/purpose */
  message_template: string;

  /** Optional condition for when to send this step */
  condition?: StepCondition;
}

/**
 * Request to get channel recommendation
 */
export interface RecommendRequest {
  /** Single lead ID */
  lead_id?: string;

  /** Multiple lead IDs (max 100) */
  lead_ids?: string[];
}

/**
 * Response from recommendation endpoint
 */
export interface RecommendResponse {
  workspace_id: string;
  recommendations: Array<{
    lead_id: string;
    recommendation: ChannelRecommendation | null;
    error: string | null;
  }>;
  timestamp: string;
  rate_limit: RateLimitInfo;
}

/**
 * Request for sequence generation
 */
export interface AutoSequenceRequest {
  /** Lead to generate sequence for */
  lead_id: string;

  /** Goal for the sequence */
  goal: SequenceGoal;

  /** Auto-enroll lead in sequence (optional) */
  enroll?: boolean;
}

/**
 * Response from auto-sequence endpoint
 */
export interface AutoSequenceResponse {
  workspace_id: string;
  lead_id: string;
  goal: SequenceGoal;
  sequence: SequenceStep[];
  enrollment: {
    status: "enrolled" | "pending" | "success";
    sequence_id?: string;
    error?: string;
  } | null;
  timestamp: string;
  rate_limit: RateLimitInfo;
}

/**
 * Single channel's performance metrics
 */
export interface ChannelMetrics {
  channel: Channel;
  total_attempts: number;
  successful_responses: number;
  response_rate: number;
  avg_response_time_hours: number;
  trend_change_percent: number;
}

/**
 * Hourly performance data for optimal time analysis
 */
export interface TimeSlot {
  hour: number;
  success_rate: number;
  attempt_count: number;
}

/**
 * Complete insights response
 */
export interface InsightsResponse {
  workspace_id: string;
  period_days: number;
  metrics: {
    channels: ChannelMetrics[];
    optimal_times: TimeSlot[];
    channel_preference_distribution: Record<Channel, number>;
    best_performing_channel: Channel;
    recommended_primary_channel: Channel;
    total_interactions: number;
  };
  trends: {
    period: string;
    channels_by_trend: Array<{
      channel: Channel;
      change_percent: number;
    }>;
  };
  timestamp: string;
}

/**
 * Rate limit information in response
 */
export interface RateLimitInfo {
  remaining: number;
  reset_at: number;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// ============ Database Types ============

/**
 * Lead with engagement metrics
 */
export interface Lead {
  id: string;
  workspace_id: string;
  name?: string;
  email?: string;
  phone_number?: string;
  company?: string;
  call_response_rate?: number;
  sms_response_rate?: number;
  email_response_rate?: number;
  call_preference?: boolean;
  sms_preference?: boolean;
  email_preference?: boolean;
  last_engaged_channel?: Channel;
  unsubscribed_channels?: Channel[];
  last_contact_at?: string;
  contact_count?: number;
}

/**
 * Call session record
 */
export interface CallSession {
  id: string;
  workspace_id: string;
  lead_id: string;
  outcome: OutcomeType;
  call_started_at?: string;
  call_ended_at?: string;
  created_at: string;
}

/**
 * SMS interaction log
 */
export interface SmsLog {
  id: string;
  workspace_id: string;
  lead_id: string;
  status: SmsStatus;
  message?: string;
  sent_at: string;
  delivered_at?: string;
  created_at: string;
}

/**
 * Email interaction log
 */
export interface EmailLog {
  id: string;
  workspace_id: string;
  lead_id: string;
  status: EmailStatus;
  subject?: string;
  sent_at: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  created_at: string;
}

/**
 * Workspace with communication settings
 */
export interface Workspace {
  id: string;
  owner_id: string;
  communication_mode?: CommunicationMode;
  industry?: string;
  business_type?: string;
}

/**
 * Stored sequence record
 */
export interface Sequence {
  id: string;
  workspace_id: string;
  lead_id: string;
  goal: SequenceGoal;
  steps: SequenceStep[];
  status: "active" | "paused" | "completed" | "failed";
  created_at: string;
  updated_at: string;
}

// ============ Internal Types ============

/**
 * Internal calculation for channel scoring
 */
export interface ChannelScore {
  channel: Channel;
  score: number;
  reasoning?: string;
}

/**
 * Lead engagement statistics (internal)
 */
export interface LeadChannelStats {
  call_response_rate?: number;
  sms_response_rate?: number;
  email_response_rate?: number;
  call_preference?: boolean;
  sms_preference?: boolean;
  email_preference?: boolean;
  last_engaged_channel?: Channel;
  unsubscribed_channels?: Channel[];
}

/**
 * Sequence generation context (internal)
 */
export interface SequenceContext {
  leadId: string;
  leadName?: string;
  company?: string;
  email?: string;
  phoneNumber?: string;
  lastContactAt?: string;
  contactCount: number;
}

/**
 * Error response format
 */
export interface ErrorResponse {
  error: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

// ============ Constants ============

export const CHANNEL_TYPES = Object.freeze<Channel[]>(["call", "sms", "email"]);

export const SEQUENCE_GOALS = Object.freeze<SequenceGoal[]>([
  "book_appointment",
  "reactivate",
  "qualify",
  "close_deal",
  "review_request",
]);

export const COMMUNICATION_MODES = Object.freeze<CommunicationMode[]>([
  "aggressive",
  "balanced",
  "conservative",
]);

export const CONFIDENCE_THRESHOLDS = Object.freeze({
  AUTO_SEND: 0.85,
  NEED_APPROVAL: 0.65,
  ESCALATE: 0.4,
});

export const RATE_LIMIT = Object.freeze({
  RECOMMEND: { limit: 50, windowMs: 60_000 },
  AUTO_SEQUENCE: { limit: 50, windowMs: 60_000 },
  MAX_BATCH_SIZE: 100,
});

export const DEFAULT_DELAYS = Object.freeze({
  IMMEDIATE: 0,
  NEXT_BUSINESS_DAY: 24,
  TWO_DAYS: 48,
  THREE_DAYS: 72,
  WEEK: 168,
});

export const OPTIMAL_HOURS = Object.freeze({
  MORNING: "08:00-12:00",
  AFTERNOON: "13:00-17:00",
  BUSINESS_HOURS: "09:00-17:00",
  ALL_HOURS: "00:00-23:59",
});

/**
 * Type guard for Channel
 */
export function isChannel(value: unknown): value is Channel {
  return typeof value === "string" && CHANNEL_TYPES.includes(value as Channel);
}

/**
 * Type guard for SequenceGoal
 */
export function isSequenceGoal(value: unknown): value is SequenceGoal {
  return typeof value === "string" && SEQUENCE_GOALS.includes(value as SequenceGoal);
}

/**
 * Type guard for CommunicationMode
 */
export function isCommunicationMode(value: unknown): value is CommunicationMode {
  return (
    typeof value === "string" && COMMUNICATION_MODES.includes(value as CommunicationMode)
  );
}
