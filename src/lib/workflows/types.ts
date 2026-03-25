/**
 * Workflow automation types for the Revenue Operator follow-up engine
 */

// ============================================================================
// WORKFLOW TYPES
// ============================================================================

/**
 * Supported workflow trigger events
 */
export type WorkflowTrigger =
  | 'missed_call'
  | 'appointment_booked'
  | 'no_show'
  | 'quote_sent'
  | 'manual'
  | 'contact_created'
  | 'days_inactive';

/**
 * Workflow status enumeration
 */
export type WorkflowStatus = 'active' | 'completed' | 'paused' | 'stopped';

/**
 * Reason for stopping a workflow enrollment
 */
export type StopReason = 'replied' | 'booked' | 'opted_out' | 'manual' | 'completed';

/**
 * Communication channel type
 */
export type Channel = 'sms' | 'call' | 'email';

/**
 * Delay condition type
 */
export type DelayCondition = 'after_trigger' | 'after_previous' | 'if_no_reply';

/**
 * Event type for usage tracking
 */
export type EventType = 'voice_minute' | 'sms_sent' | 'sms_received' | 'email_sent';

// ============================================================================
// WORKFLOW CONFIGURATION
// ============================================================================

/**
 * Trigger configuration options stored as JSONB
 */
export interface TriggerConfig {
  daysInactive?: number;
  maxRetries?: number;
  [key: string]: unknown;
}

/**
 * Represents a single workflow step with message/call content and delivery settings
 */
export interface WorkflowStep {
  id: string;
  workflowId: string;
  stepOrder: number;
  channel: Channel;
  delaySeconds: number;
  delayCondition: DelayCondition;
  messageTemplate?: string;
  callScript?: string;
  emailSubject?: string;
  emailBody?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a workflow automation template
 */
export interface Workflow {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  triggerConfig: TriggerConfig;
  isActive: boolean;
  isTemplate: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ============================================================================
// WORKFLOW ENROLLMENT
// ============================================================================

/**
 * Represents an active workflow enrollment for a contact
 */
export interface WorkflowEnrollment {
  id: string;
  workflowId: string;
  contactId: string;
  workspaceId: string;
  currentStep: number;
  status: WorkflowStatus;
  stopReason?: StopReason;
  enrolledAt: Date;
  lastStepAt?: Date;
  nextStepAt?: Date;
  stoppedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// CONTACT AND WORKSPACE TYPES
// ============================================================================

/**
 * Minimal contact information needed for workflow execution
 */
export interface WorkflowContact {
  id: string;
  workspaceId: string;
  name: string;
  phone?: string;
  email?: string;
  businessName?: string;
  lastReplyAt?: Date;
  bookingLink?: string;
  [key: string]: unknown;
}

/**
 * Workspace configuration for workflow execution
 */
export interface WorkflowWorkspace {
  id: string;
  name: string;
  businessName?: string;
  [key: string]: unknown;
}

/**
 * Appointment/booking information for template rendering
 */
export interface WorkflowAppointment {
  id: string;
  startTime: Date;
  endTime?: Date;
  title?: string;
  [key: string]: unknown;
}

// ============================================================================
// USAGE AND ANALYTICS
// ============================================================================

/**
 * Individual usage event for tracking API/communication costs
 */
export interface UsageEvent {
  id: string;
  workspaceId: string;
  eventType: EventType;
  quantity: number;
  costCents: number;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  recordedAt: Date;
  createdAt: Date;
}

/**
 * Daily analytics summary for a workspace
 */
export interface AnalyticsDaily {
  id: string;
  workspaceId: string;
  date: Date;
  callsAnswered: number;
  callsMissed: number;
  leadsCaptured: number;
  appointmentsBooked: number;
  estimatedRevenue: number;
  minutesUsed: number;
  followUpsSent: number;
  noShowsRecovered: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// WORKFLOW EXECUTION
// ============================================================================

/**
 * Result of executing a workflow step
 */
export interface StepExecutionResult {
  success: boolean;
  error?: string;
  eventId?: string;
  cost?: number;
  timestamp: Date;
}

/**
 * Template rendering context with contact and workspace info
 */
export interface TemplateContext {
  contact: WorkflowContact;
  workspace: WorkflowWorkspace;
  appointment?: WorkflowAppointment;
  enrollmentId: string;
  [key: string]: unknown;
}

/**
 * Enrollment processing result
 */
export interface EnrollmentProcessResult {
  enrollmentId: string;
  workflowId: string;
  contactId: string;
  stepExecuted: boolean;
  status: WorkflowStatus;
  nextStepAt?: Date;
  error?: string;
}
