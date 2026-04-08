/**
 * Lead Lifecycle State Machine
 * Non-linear lead progression with dynamic bidirectional transitions
 * Based on real-world buying behavior, not linear funnels
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type LeadStage =
  | 'NEW'
  | 'CONTACTED'
  | 'ENGAGED'
  | 'QUALIFYING'
  | 'QUALIFIED'
  | 'DEMO_SCHEDULED'
  | 'DEMO_COMPLETED'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATING'
  | 'CLOSING'
  | 'WON'
  | 'NURTURE'
  | 'RE_ENGAGING'
  | 'AT_RISK'
  | 'LOST'
  | 'DISQUALIFIED'
  | 'CHURNED'
  | 'WINBACK';

export interface TransitionEvent {
  type: 'call' | 'email' | 'response' | 'demo' | 'proposal' | 'agreement' | 'silence' | 'objection' | 'signal' | 'disqualification';
  timestamp: Date;
  metadata: {
    duration?: number;
    sentiment?: 'positive' | 'neutral' | 'negative';
    channel?: 'phone' | 'email' | 'meeting' | 'website';
    content?: string;
    daysInStage?: number;
    engagementScore?: number;
    reason?: string;
  };
}

export interface TransitionResult {
  currentStage: LeadStage;
  newStage: LeadStage;
  transitioned: boolean;
  reason: string;
  confidence: number; // 0-1
  sideEffects: SideEffect[];
  nextCheckTime?: Date;
}

export interface SideEffect {
  type: 'notify' | 'score_update' | 'assign_task' | 'escalate' | 'trigger_sequence';
  action: string;
  priority: 'low' | 'medium' | 'high';
}

export interface StageRequirements {
  stage: LeadStage;
  mustHaveTrue: string[];
  mustBeFalse: string[];
  toProgressTo: { stage: LeadStage; conditions: string[] }[];
  regressionWarnings: string[];
  benchmarkDaysInStage: number;
}

export interface StageHealth {
  stage: LeadStage;
  healthStatus: 'healthy' | 'warning' | 'critical';
  score: number; // 0-100
  daysInStage: number;
  agePercentile: number; // 0-1
  activityRecency: number; // days since last activity
  signals: HealthSignal[];
  recommendation: string;
}

export interface HealthSignal {
  signal: string;
  severity: 'positive' | 'neutral' | 'negative';
  daysAgo: number;
}

export interface TransitionOption {
  nextStage: LeadStage;
  probability: number; // 0-1
  triggeringEvent: string;
  recommendedAction: string;
  timeframe: string;
}

export interface StageHistoryEntry {
  stage: LeadStage;
  enteredAt: Date;
  exitedAt?: Date;
  durationMs: number;
  exitReason?: string;
}

export interface StageAnalytics {
  totalStages: number;
  totalRegressions: number;
  regressionRate: number; // 0-1
  stallPoints: { stage: LeadStage; count: number; avgDuration: number }[];
  velocityPerStage: { stage: LeadStage; avgDays: number }[];
  pattern: 'typical' | 'fast-track' | 'stalled' | 'erratic' | 'regressive';
  patternScore: number; // 0-1
}

export interface StagePlaybook {
  stage: LeadStage;
  communicationFrequency: 'daily' | 'every2days' | 'weekly' | 'biweekly' | 'monthly' | 'asneeded';
  preferredChannels: ('email' | 'phone' | 'meeting' | 'sms')[];
  contentStrategy: 'educational' | 'discovery' | 'validation' | 'sales' | 'relationship' | 'urgency';
  keyQuestions: string[];
  exitCriteria: string[];
  redFlags: string[];
  expectedOutcome: string;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Evaluates if a lead should transition to a new stage based on an event
 * Not linear - any stage can transition to many others based on real behavior
 */
export function evaluateTransition(
  currentStage: LeadStage,
  event: TransitionEvent
): TransitionResult {
  const timestamp = event.timestamp;
  const metadata = event.metadata;

  // Default: no transition
  let newStage = currentStage;
  let transitioned = false;
  let reason = 'No transition criteria met';
  let confidence = 0;
  const sideEffects: SideEffect[] = [];

  const daysInStage = metadata.daysInStage || 0;
  const engagementScore = metadata.engagementScore || 0;

  // ========== FROM NEW
  if (currentStage === 'NEW') {
    if (event.type === 'call' || event.type === 'email') {
      newStage = 'CONTACTED';
      reason = 'Initial outreach made';
      confidence = 0.95;
      transitioned = true;
    }
  }

  // ========== FROM CONTACTED
  else if (currentStage === 'CONTACTED') {
    if (event.type === 'response' && metadata.sentiment === 'positive') {
      newStage = 'ENGAGED';
      reason = 'Lead responded positively';
      confidence = 0.9;
      transitioned = true;
      sideEffects.push({
        type: 'notify',
        action: 'Schedule discovery call',
        priority: 'high',
      });
    } else if (event.type === 'silence' && daysInStage >= 10) {
      newStage = 'NURTURE';
      reason = 'No response after 10 days, move to nurture';
      confidence = 0.85;
      transitioned = true;
      sideEffects.push({
        type: 'trigger_sequence',
        action: 'Initiate nurture email sequence',
        priority: 'medium',
      });
    }
  }

  // ========== FROM ENGAGED
  else if (currentStage === 'ENGAGED') {
    if (event.type === 'response' && daysInStage >= 3) {
      newStage = 'QUALIFYING';
      reason = 'Active conversation, moving to discovery';
      confidence = 0.88;
      transitioned = true;
      sideEffects.push({
        type: 'assign_task',
        action: 'Conduct BANT qualification',
        priority: 'high',
      });
    } else if (event.type === 'silence' && daysInStage >= 7) {
      newStage = 'AT_RISK';
      reason = 'Engagement dropped after positive start';
      confidence = 0.8;
      transitioned = true;
      sideEffects.push({
        type: 'notify',
        action: 'Re-engagement attempt needed',
        priority: 'high',
      });
    }
  }

  // ========== FROM QUALIFYING
  else if (currentStage === 'QUALIFYING') {
    if (event.type === 'response' && engagementScore >= 70) {
      newStage = 'QUALIFIED';
      reason = 'All BANT criteria met, qualified to sell';
      confidence = 0.92;
      transitioned = true;
      sideEffects.push({
        type: 'assign_task',
        action: 'Schedule product demo',
        priority: 'high',
      });
    } else if (event.type === 'objection' && metadata.sentiment === 'negative') {
      newStage = 'NURTURE';
      reason = 'Objections raised, not yet ready';
      confidence = 0.75;
      transitioned = true;
      sideEffects.push({
        type: 'trigger_sequence',
        action: 'Educational content sequence',
        priority: 'medium',
      });
    } else if (event.type === 'silence' && daysInStage >= 14) {
      newStage = 'AT_RISK';
      reason = 'Stalled qualification, showing risk',
      confidence = 0.78;
      transitioned = true;
    }
  }

  // ========== FROM QUALIFIED
  else if (currentStage === 'QUALIFIED') {
    if (event.type === 'demo') {
      newStage = 'DEMO_SCHEDULED';
      reason = 'Demo scheduled with qualified lead';
      confidence = 0.95;
      transitioned = true;
      sideEffects.push({
        type: 'notify',
        action: 'Prepare demo materials for this prospect',
        priority: 'high',
      });
    } else if (event.type === 'silence' && daysInStage >= 7) {
      newStage = 'AT_RISK';
      reason = 'Qualified lead going dark';
      confidence = 0.85;
      transitioned = true;
      sideEffects.push({
        type: 'escalate',
        action: 'Manager outreach to re-engage',
        priority: 'high',
      });
    } else if (event.type === 'disqualification') {
      newStage = 'DISQUALIFIED';
      reason = 'Bad fit discovered: ' + (metadata.reason || 'unknown');
      confidence = 0.95;
      transitioned = true;
    }
  }

  // ========== FROM DEMO_SCHEDULED
  else if (currentStage === 'DEMO_SCHEDULED') {
    if (event.type === 'demo') {
      newStage = 'DEMO_COMPLETED';
      reason = 'Demo delivered';
      confidence = 0.95;
      transitioned = true;
    } else if (event.type === 'silence' && daysInStage >= 3) {
      newStage = 'AT_RISK';
      reason = 'Demo scheduled but not completed, lead quiet';
      confidence = 0.7;
      transitioned = true;
    }
  }

  // ========== FROM DEMO_COMPLETED
  else if (currentStage === 'DEMO_COMPLETED') {
    if (event.type === 'response' && metadata.sentiment === 'positive') {
      newStage = 'PROPOSAL_SENT';
      reason = 'Positive demo response, sending proposal';
      confidence = 0.9;
      transitioned = true;
      sideEffects.push({
        type: 'assign_task',
        action: 'Prepare and send customized proposal',
        priority: 'high',
      });
    } else if (event.type === 'response' && metadata.sentiment === 'negative') {
      newStage = 'NURTURE';
      reason = 'Demo completed but not convinced, nurture for future';
      confidence = 0.8;
      transitioned = true;
      sideEffects.push({
        type: 'trigger_sequence',
        action: 'Case study and testimonial sequence',
        priority: 'medium',
      });
    } else if (event.type === 'silence' && daysInStage >= 5) {
      newStage = 'AT_RISK';
      reason = 'No followup after demo';
      confidence = 0.78;
      transitioned = true;
    }
  }

  // ========== FROM PROPOSAL_SENT
  else if (currentStage === 'PROPOSAL_SENT') {
    if (event.type === 'response' && metadata.sentiment === 'positive') {
      newStage = 'NEGOTIATING';
      reason = 'Proposal accepted, negotiation phase begins';
      confidence = 0.88;
      transitioned = true;
      sideEffects.push({
        type: 'notify',
        action: 'Negotiate contract terms',
        priority: 'high',
      });
    } else if (event.type === 'silence' && daysInStage >= 5) {
      newStage = 'AT_RISK';
      reason = 'No response to proposal in 5 days';
      confidence = 0.82;
      transitioned = true;
      sideEffects.push({
        type: 'notify',
        action: 'Send proposal follow-up',
        priority: 'high',
      });
    } else if (event.type === 'objection') {
      newStage = 'NEGOTIATING';
      reason = 'Objections raised in proposal phase, negotiation';
      confidence = 0.75;
      transitioned = true;
    }
  }

  // ========== FROM NEGOTIATING
  else if (currentStage === 'NEGOTIATING') {
    if (event.type === 'agreement') {
      newStage = 'CLOSING';
      reason = 'Terms agreed, closing phase';
      confidence = 0.95;
      transitioned = true;
      sideEffects.push({
        type: 'assign_task',
        action: 'Prepare final paperwork',
        priority: 'high',
      });
    } else if (event.type === 'silence' && daysInStage >= 10) {
      newStage = 'AT_RISK';
      reason = 'Negotiation stalled';
      confidence = 0.8;
      transitioned = true;
    } else if (event.type === 'objection' && metadata.sentiment === 'negative') {
      newStage = 'NURTURE';
      reason = 'Negotiations broke down, return to nurture';
      confidence = 0.7;
      transitioned = true;
    }
  }

  // ========== FROM CLOSING
  else if (currentStage === 'CLOSING') {
    if (event.type === 'agreement') {
      newStage = 'WON';
      reason = 'Deal closed, contract signed';
      confidence = 0.98;
      transitioned = true;
      sideEffects.push({
        type: 'notify',
        action: 'Hand off to onboarding/customer success',
        priority: 'high',
      });
    } else if (event.type === 'silence' && daysInStage >= 5) {
      newStage = 'AT_RISK';
      reason = 'No movement on final paperwork';
      confidence = 0.8;
      transitioned = true;
    }
  }

  // ========== FROM NURTURE
  else if (currentStage === 'NURTURE') {
    if (event.type === 'response' && metadata.sentiment === 'positive') {
      newStage = 'RE_ENGAGING';
      reason = 'Response to nurture content, re-engaging';
      confidence = 0.85;
      transitioned = true;
      sideEffects.push({
        type: 'notify',
        action: 'Strike while hot - schedule call',
        priority: 'high',
      });
    } else if (event.type === 'signal') {
      newStage = 'RE_ENGAGING';
      reason = 'Buying signal detected in nurture phase';
      confidence = 0.8;
      transitioned = true;
    }
  }

  // ========== FROM RE_ENGAGING
  else if (currentStage === 'RE_ENGAGING') {
    if (event.type === 'response') {
      newStage = 'QUALIFYING';
      reason = 'Lead re-engaged, moving to qualification';
      confidence = 0.82;
      transitioned = true;
      sideEffects.push({
        type: 'assign_task',
        action: 'Re-qualify for current situation',
        priority: 'high',
      });
    } else if (event.type === 'silence' && daysInStage >= 7) {
      newStage = 'NURTURE';
      reason = 'Re-engagement attempt unsuccessful';
      confidence = 0.75;
      transitioned = true;
    }
  }

  // ========== FROM AT_RISK
  else if (currentStage === 'AT_RISK') {
    if (event.type === 'response' && metadata.sentiment === 'positive') {
      newStage = 'RE_ENGAGING';
      reason = 'At-risk lead showing signs of life';
      confidence = 0.85;
      transitioned = true;
    } else if (event.type === 'signal') {
      newStage = 'RE_ENGAGING';
      reason = 'Buying signal from at-risk prospect';
      confidence = 0.8;
      transitioned = true;
    } else if (event.type === 'silence' && daysInStage >= 21) {
      newStage = 'LOST';
      reason = 'At-risk lead lost after 3+ weeks silence';
      confidence = 0.9;
      transitioned = true;
      sideEffects.push({
        type: 'notify',
        action: 'Mark as lost and conduct post-mortem',
        priority: 'medium',
      });
    } else if (event.type === 'disqualification') {
      newStage = 'DISQUALIFIED';
      reason = 'Discovered not a fit while at-risk';
      confidence = 0.95;
      transitioned = true;
    }
  }

  // ========== FROM LOST
  else if (currentStage === 'LOST') {
    if (event.type === 'signal' && metadata.reason === 'competitor_failure') {
      newStage = 'WINBACK';
      reason = 'Lost deal, competitor failed them, opportunity to win back';
      confidence = 0.7;
      transitioned = true;
      sideEffects.push({
        type: 'notify',
        action: 'Executive outreach for winback',
        priority: 'high',
      });
    } else if (event.type === 'response' && metadata.sentiment === 'positive') {
      newStage = 'WINBACK';
      reason = 'Lost deal showing interest again';
      confidence = 0.75;
      transitioned = true;
    }
  }

  // ========== FROM DISQUALIFIED
  else if (currentStage === 'DISQUALIFIED') {
    if (event.type === 'signal' && metadata.reason === 'situation_changed') {
      newStage = 'RE_ENGAGING';
      reason = 'Previously disqualified, but situation changed';
      confidence = 0.7;
      transitioned = true;
    }
  }

  // ========== FROM WINBACK
  else if (currentStage === 'WINBACK') {
    if (event.type === 'response' && metadata.sentiment === 'positive') {
      newStage = 'QUALIFYING';
      reason = 'Winback lead re-engaging, qualify fresh';
      confidence = 0.8;
      transitioned = true;
    } else if (event.type === 'silence' && daysInStage >= 10) {
      newStage = 'LOST';
      reason = 'Winback attempt unsuccessful';
      confidence = 0.8;
      transitioned = true;
    }
  }

  // ========== FROM CHURNED
  else if (currentStage === 'CHURNED') {
    if (event.type === 'response' && metadata.sentiment === 'positive') {
      newStage = 'WINBACK';
      reason = 'Churned customer showing interest in coming back';
      confidence = 0.85;
      transitioned = true;
      sideEffects.push({
        type: 'notify',
        action: 'Churn recovery specialist outreach',
        priority: 'high',
      });
    }
  }

  // ANY STAGE: Disqualification can happen at any point
  if (event.type === 'disqualification' && newStage !== 'DISQUALIFIED') {
    newStage = 'DISQUALIFIED';
    reason = 'Disqualified: ' + (metadata.reason || 'bad fit');
    confidence = 0.95;
    transitioned = true;
  }

  const nextCheckTime = new Date(timestamp);
  nextCheckTime.setDate(nextCheckTime.getDate() + 2);

  return {
    currentStage,
    newStage,
    transitioned,
    reason,
    confidence,
    sideEffects,
    nextCheckTime,
  };
}

/**
 * Returns detailed requirements for a specific stage
 */
export function getStageRequirements(stage: LeadStage): StageRequirements {
  const requirements: Record<LeadStage, StageRequirements> = {
    NEW: {
      stage: 'NEW',
      mustHaveTrue: ['lead_created', 'contact_info_valid'],
      mustBeFalse: ['contacted'],
      toProgressTo: [
        {
          stage: 'CONTACTED',
          conditions: ['outreach_attempted'],
        },
      ],
      regressionWarnings: [],
      benchmarkDaysInStage: 1,
    },
    CONTACTED: {
      stage: 'CONTACTED',
      mustHaveTrue: ['outreach_attempted', 'contact_info_valid'],
      mustBeFalse: ['positive_response'],
      toProgressTo: [
        {
          stage: 'ENGAGED',
          conditions: ['response_received', 'sentiment_positive'],
        },
        {
          stage: 'NURTURE',
          conditions: ['no_response_10days'],
        },
      ],
      regressionWarnings: ['no_response_after_5_days'],
      benchmarkDaysInStage: 3,
    },
    ENGAGED: {
      stage: 'ENGAGED',
      mustHaveTrue: ['conversation_started', 'response_received'],
      mustBeFalse: [],
      toProgressTo: [
        {
          stage: 'QUALIFYING',
          conditions: ['meaningful_conversation', 'time_in_stage_3days'],
        },
        {
          stage: 'AT_RISK',
          conditions: ['silence_7days'],
        },
      ],
      regressionWarnings: ['no_response_5days', 'negative_sentiment'],
      benchmarkDaysInStage: 5,
    },
    QUALIFYING: {
      stage: 'QUALIFYING',
      mustHaveTrue: ['discovery_conducted', 'bant_initiated'],
      mustBeFalse: [],
      toProgressTo: [
        {
          stage: 'QUALIFIED',
          conditions: ['bant_complete', 'engagement_score_70plus'],
        },
        {
          stage: 'NURTURE',
          conditions: ['objections_raised', 'needs_education'],
        },
        {
          stage: 'AT_RISK',
          conditions: ['silence_14days'],
        },
      ],
      regressionWarnings: ['stalled_7days', 'no_budget_answer', 'unclear_authority'],
      benchmarkDaysInStage: 7,
    },
    QUALIFIED: {
      stage: 'QUALIFIED',
      mustHaveTrue: ['budget_confirmed', 'authority_identified', 'need_validated', 'timeline_set'],
      mustBeFalse: [],
      toProgressTo: [
        {
          stage: 'DEMO_SCHEDULED',
          conditions: ['demo_confirmed'],
        },
        {
          stage: 'AT_RISK',
          conditions: ['silence_7days'],
        },
        {
          stage: 'DISQUALIFIED',
          conditions: ['bad_fit_discovered'],
        },
      ],
      regressionWarnings: ['no_movement_5days', 'budget_questioned', 'decision_delayed'],
      benchmarkDaysInStage: 3,
    },
    DEMO_SCHEDULED: {
      stage: 'DEMO_SCHEDULED',
      mustHaveTrue: ['demo_confirmed', 'demo_date_set'],
      mustBeFalse: ['demo_completed'],
      toProgressTo: [
        {
          stage: 'DEMO_COMPLETED',
          conditions: ['demo_delivered'],
        },
        {
          stage: 'AT_RISK',
          conditions: ['silence_3days', 'demo_not_completed'],
        },
      ],
      regressionWarnings: ['demo_rescheduled', 'attendee_changed', 'no_prep_signal'],
      benchmarkDaysInStage: 2,
    },
    DEMO_COMPLETED: {
      stage: 'DEMO_COMPLETED',
      mustHaveTrue: ['demo_delivered', 'feedback_received'],
      mustBeFalse: [],
      toProgressTo: [
        {
          stage: 'PROPOSAL_SENT',
          conditions: ['positive_response', 'ready_to_buy_signal'],
        },
        {
          stage: 'NURTURE',
          conditions: ['neutral_or_negative_feedback', 'needs_more_time'],
        },
        {
          stage: 'AT_RISK',
          conditions: ['silence_5days'],
        },
      ],
      regressionWarnings: ['concerns_raised', 'feature_questions', 'competitor_inquiry'],
      benchmarkDaysInStage: 2,
    },
    PROPOSAL_SENT: {
      stage: 'PROPOSAL_SENT',
      mustHaveTrue: ['proposal_delivered', 'proposal_date_tracked'],
      mustBeFalse: ['deal_closed'],
      toProgressTo: [
        {
          stage: 'NEGOTIATING',
          conditions: ['proposal_reviewed', 'response_received'],
        },
        {
          stage: 'AT_RISK',
          conditions: ['silence_5days'],
        },
      ],
      regressionWarnings: ['price_objection', 'feature_gap_found', 'budget_approval_needed'],
      benchmarkDaysInStage: 3,
    },
    NEGOTIATING: {
      stage: 'NEGOTIATING',
      mustHaveTrue: ['proposal_reviewed', 'negotiation_ongoing'],
      mustBeFalse: ['deal_closed'],
      toProgressTo: [
        {
          stage: 'CLOSING',
          conditions: ['terms_agreed', 'ready_to_sign'],
        },
        {
          stage: 'AT_RISK',
          conditions: ['silence_10days'],
        },
        {
          stage: 'NURTURE',
          conditions: ['deal_on_hold', 'buyer_uncertainty'],
        },
      ],
      regressionWarnings: ['price_renegotiation', 'new_objection', 'budget_approval_blocked'],
      benchmarkDaysInStage: 5,
    },
    CLOSING: {
      stage: 'CLOSING',
      mustHaveTrue: ['terms_finalized', 'paperwork_prepared', 'ready_to_sign'],
      mustBeFalse: ['contract_signed'],
      toProgressTo: [
        {
          stage: 'WON',
          conditions: ['contract_signed', 'payment_received_or_scheduled'],
        },
        {
          stage: 'AT_RISK',
          conditions: ['silence_5days', 'paperwork_not_returned'],
        },
      ],
      regressionWarnings: ['last_minute_objection', 'stakeholder_concern', 'approval_needed'],
      benchmarkDaysInStage: 3,
    },
    WON: {
      stage: 'WON',
      mustHaveTrue: ['contract_signed', 'deal_closed', 'customer_created'],
      mustBeFalse: [],
      toProgressTo: [],
      regressionWarnings: [],
      benchmarkDaysInStage: 0,
    },
    NURTURE: {
      stage: 'NURTURE',
      mustHaveTrue: ['not_ready_to_buy'],
      mustBeFalse: [],
      toProgressTo: [
        {
          stage: 'RE_ENGAGING',
          conditions: ['response_to_content', 'positive_sentiment'],
        },
        {
          stage: 'ENGAGED',
          conditions: ['initiated_conversation'],
        },
      ],
      regressionWarnings: [],
      benchmarkDaysInStage: 60,
    },
    RE_ENGAGING: {
      stage: 'RE_ENGAGING',
      mustHaveTrue: ['showing_renewed_interest'],
      mustBeFalse: [],
      toProgressTo: [
        {
          stage: 'QUALIFYING',
          conditions: ['conversation_restarted', 'interest_confirmed'],
        },
        {
          stage: 'NURTURE',
          conditions: ['interest_fades'],
        },
      ],
      regressionWarnings: ['silence_7days'],
      benchmarkDaysInStage: 3,
    },
    AT_RISK: {
      stage: 'AT_RISK',
      mustHaveTrue: ['was_engaged', 'now_silent_or_negative'],
      mustBeFalse: [],
      toProgressTo: [
        {
          stage: 'RE_ENGAGING',
          conditions: ['response_received', 'positive_signal'],
        },
        {
          stage: 'LOST',
          conditions: ['silence_21days'],
        },
        {
          stage: 'DISQUALIFIED',
          conditions: ['bad_fit_discovered'],
        },
      ],
      regressionWarnings: [],
      benchmarkDaysInStage: 10,
    },
    LOST: {
      stage: 'LOST',
      mustHaveTrue: ['deal_lost', 'loss_reason_documented'],
      mustBeFalse: [],
      toProgressTo: [
        {
          stage: 'WINBACK',
          conditions: ['competitor_failure_signal', 'renewed_interest'],
        },
      ],
      regressionWarnings: [],
      benchmarkDaysInStage: 0,
    },
    DISQUALIFIED: {
      stage: 'DISQUALIFIED',
      mustHaveTrue: ['disqualification_reason_documented'],
      mustBeFalse: [],
      toProgressTo: [
        {
          stage: 'RE_ENGAGING',
          conditions: ['situation_changed', 'no_longer_disqualified'],
        },
      ],
      regressionWarnings: [],
      benchmarkDaysInStage: 0,
    },
    CHURNED: {
      stage: 'CHURNED',
      mustHaveTrue: ['was_customer', 'cancelled_service'],
      mustBeFalse: [],
      toProgressTo: [
        {
          stage: 'WINBACK',
          conditions: ['showing_interest_to_return'],
        },
      ],
      regressionWarnings: [],
      benchmarkDaysInStage: 0,
    },
    WINBACK: {
      stage: 'WINBACK',
      mustHaveTrue: ['lost_or_churned_lead', 'now_interested'],
      mustBeFalse: [],
      toProgressTo: [
        {
          stage: 'QUALIFYING',
          conditions: ['conversation_engaged', 'interest_confirmed'],
        },
        {
          stage: 'LOST',
          conditions: ['interest_fades'],
        },
      ],
      regressionWarnings: ['silence_10days'],
      benchmarkDaysInStage: 5,
    },
  };

  return requirements[stage];
}

/**
 * Evaluates health of a lead in their current stage
 */
export function calculateStageHealth(
  stage: LeadStage,
  timeInStage: number,
  lastActivity: Date,
  engagementScore: number
): StageHealth {
  const benchmark = getStageRequirements(stage).benchmarkDaysInStage;
  const daysToday = new Date();
  const activityRecency = (daysToday.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

  const signals: HealthSignal[] = [];
  let scoreValue = 75;

  // Age percentile
  const agePercentile = benchmark > 0 ? Math.min(timeInStage / benchmark, 1.0) : 0;

  // Engagement score impact
  if (engagementScore >= 80) {
    signals.push({ signal: 'High engagement', severity: 'positive', daysAgo: 0 });
    scoreValue += 10;
  } else if (engagementScore < 30) {
    signals.push({ signal: 'Low engagement', severity: 'negative', daysAgo: 0 });
    scoreValue -= 15;
  }

  // Activity recency impact
  if (activityRecency <= 1) {
    signals.push({ signal: 'Recent activity', severity: 'positive', daysAgo: Math.round(activityRecency) });
    scoreValue += 10;
  } else if (activityRecency >= 7) {
    signals.push({ signal: 'Stale activity', severity: 'negative', daysAgo: Math.round(activityRecency) });
    scoreValue -= 20;
  }

  // Time in stage warnings
  if (benchmark > 0 && timeInStage > benchmark * 2) {
    signals.push({ signal: 'Overdue for stage progression', severity: 'negative', daysAgo: 0 });
    scoreValue -= 15;
  }

  scoreValue = Math.max(0, Math.min(100, scoreValue));

  let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (scoreValue < 40) {
    healthStatus = 'critical';
  } else if (scoreValue < 60) {
    healthStatus = 'warning';
  }

  let recommendation = 'Monitor regularly';
  if (healthStatus === 'critical') {
    recommendation = 'Immediate action required - assess for loss or nurture path';
  } else if (healthStatus === 'warning') {
    recommendation = 'Increase engagement frequency, check for hidden objections';
  } else {
    recommendation = 'Continue current strategy, ensure regular touchpoints';
  }

  return {
    stage,
    healthStatus,
    score: scoreValue,
    daysInStage: timeInStage,
    agePercentile,
    activityRecency,
    signals,
    recommendation,
  };
}

/**
 * Returns possible next stages from current position
 */
export function generateTransitionMap(currentStage: LeadStage): TransitionOption[] {
  const maps: Record<LeadStage, TransitionOption[]> = {
    NEW: [
      {
        nextStage: 'CONTACTED',
        probability: 0.95,
        triggeringEvent: 'First outreach (call or email)',
        recommendedAction: 'Make first contact within 24 hours',
        timeframe: 'Same day or next day',
      },
    ],
    CONTACTED: [
      {
        nextStage: 'ENGAGED',
        probability: 0.4,
        triggeringEvent: 'Lead responds positively',
        recommendedAction: 'Qualify their interest, schedule call',
        timeframe: 'Within 24 hours of response',
      },
      {
        nextStage: 'NURTURE',
        probability: 0.5,
        triggeringEvent: 'No response after multiple touches',
        recommendedAction: 'Switch to nurture sequence',
        timeframe: 'After 10 days no response',
      },
      {
        nextStage: 'DISQUALIFIED',
        probability: 0.1,
        triggeringEvent: 'Bad fit discovered in initial research',
        recommendedAction: 'Log disqualification reason',
        timeframe: 'Immediately upon discovery',
      },
    ],
    ENGAGED: [
      {
        nextStage: 'QUALIFYING',
        probability: 0.6,
        triggeringEvent: 'Meaningful conversation after 3+ days',
        recommendedAction: 'Schedule discovery/qualification call',
        timeframe: 'Within 3-5 days',
      },
      {
        nextStage: 'AT_RISK',
        probability: 0.3,
        triggeringEvent: 'Silence after initial engagement',
        recommendedAction: 'Multi-channel re-engagement campaign',
        timeframe: 'After 7 days silence',
      },
      {
        nextStage: 'NURTURE',
        probability: 0.1,
        triggeringEvent: 'Shift to education-needed track',
        recommendedAction: 'Send educational content',
        timeframe: 'If objections indicate unpreparedness',
      },
    ],
    QUALIFYING: [
      {
        nextStage: 'QUALIFIED',
        probability: 0.5,
        triggeringEvent: 'All BANT criteria met with high engagement',
        recommendedAction: 'Schedule product demo',
        timeframe: 'Immediately upon qualification',
      },
      {
        nextStage: 'NURTURE',
        probability: 0.3,
        triggeringEvent: 'Not yet ready or missing criteria',
        recommendedAction: 'Education/relationship building sequence',
        timeframe: 'When objections indicate need',
      },
      {
        nextStage: 'AT_RISK',
        probability: 0.2,
        triggeringEvent: 'Stalled qualification after 14 days',
        recommendedAction: 'Manager outreach or pivot approach',
        timeframe: 'After 2+ weeks stalled',
      },
    ],
    QUALIFIED: [
      {
        nextStage: 'DEMO_SCHEDULED',
        probability: 0.85,
        triggeringEvent: 'Demo confirmed with qualified prospect',
        recommendedAction: 'Prepare personalized demo materials',
        timeframe: 'Within 2-3 days of qualification',
      },
      {
        nextStage: 'AT_RISK',
        probability: 0.1,
        triggeringEvent: 'No movement toward demo after 7 days',
        recommendedAction: 'Executive touchpoint',
        timeframe: 'After 1 week stalled',
      },
      {
        nextStage: 'DISQUALIFIED',
        probability: 0.05,
        triggeringEvent: 'Bad fit discovered in deeper discovery',
        recommendedAction: 'Honest conversation, archive lead',
        timeframe: 'Immediately upon discovery',
      },
    ],
    DEMO_SCHEDULED: [
      {
        nextStage: 'DEMO_COMPLETED',
        probability: 0.9,
        triggeringEvent: 'Demo delivered as scheduled',
        recommendedAction: 'Capture feedback and next steps',
        timeframe: 'On demo date',
      },
      {
        nextStage: 'AT_RISK',
        probability: 0.1,
        triggeringEvent: 'Demo postponed/quiet after scheduling',
        recommendedAction: 'Confirm commitment, offer alternate times',
        timeframe: 'After 3 days with no movement',
      },
    ],
    DEMO_COMPLETED: [
      {
        nextStage: 'PROPOSAL_SENT',
        probability: 0.55,
        triggeringEvent: 'Positive response to demo',
        recommendedAction: 'Send tailored proposal within 24 hours',
        timeframe: '1-2 days after demo',
      },
      {
        nextStage: 'NURTURE',
        probability: 0.3,
        triggeringEvent: 'Demo liked but not ready to buy',
        recommendedAction: 'Case studies, customer testimonials',
        timeframe: 'If neutral/negative feedback',
      },
      {
        nextStage: 'AT_RISK',
        probability: 0.15,
        triggeringEvent: 'No followup from prospect',
        recommendedAction: 'Immediate proposal sending + call',
        timeframe: 'After 5 days silence',
      },
    ],
    PROPOSAL_SENT: [
      {
        nextStage: 'NEGOTIATING',
        probability: 0.6,
        triggeringEvent: 'Proposal reviewed and response received',
        recommendedAction: 'Address concerns, negotiate terms',
        timeframe: '2-5 days after sending',
      },
      {
        nextStage: 'AT_RISK',
        probability: 0.3,
        triggeringEvent: 'No response in 5 days',
        recommendedAction: 'Call prospect, send follow-up proposal',
        timeframe: '5+ days with no response',
      },
      {
        nextStage: 'NURTURE',
        probability: 0.1,
        triggeringEvent: 'Objections indicate not ready',
        recommendedAction: 'Address in follow-up, re-educate if needed',
        timeframe: 'If price or timing objections',
      },
    ],
    NEGOTIATING: [
      {
        nextStage: 'CLOSING',
        probability: 0.7,
        triggeringEvent: 'Terms agreed and contract prepared',
        recommendedAction: 'Send final contract, prepare for signature',
        timeframe: '3-7 days of negotiations',
      },
      {
        nextStage: 'AT_RISK',
        probability: 0.2,
        triggeringEvent: 'Negotiation stalled after 10 days',
        recommendedAction: 'Executive involvement, clear final terms',
        timeframe: '10+ days with no progress',
      },
      {
        nextStage: 'NURTURE',
        probability: 0.1,
        triggeringEvent: 'Deal on indefinite hold',
        recommendedAction: 'Park lead, continue relationship',
        timeframe: 'If buyer uncertainty emerges',
      },
    ],
    CLOSING: [
      {
        nextStage: 'WON',
        probability: 0.85,
        triggeringEvent: 'Contract signed and payment confirmed',
        recommendedAction: 'Hand off to onboarding/CS, celebrate',
        timeframe: '3-5 days for final signature',
      },
      {
        nextStage: 'AT_RISK',
        probability: 0.15,
        triggeringEvent: 'No response to final contract',
        recommendedAction: 'Call CxO, expedite signature',
        timeframe: '5+ days without signature',
      },
    ],
    WON: [],
    NURTURE: [
      {
        nextStage: 'RE_ENGAGING',
        probability: 0.3,
        triggeringEvent: 'Response to nurture content or buying signal',
        recommendedAction: 'Immediate sales call to re-qualify',
        timeframe: 'Within hours of engagement',
      },
      {
        nextStage: 'ENGAGED',
        probability: 0.2,
        triggeringEvent: 'Lead initiates conversation',
        recommendedAction: 'Jump on opportunity immediately',
        timeframe: 'Within 1 hour of lead reaching out',
      },
    ],
    RE_ENGAGING: [
      {
        nextStage: 'QUALIFYING',
        probability: 0.7,
        triggeringEvent: 'Re-engaged with confirmed interest',
        recommendedAction: 'Re-qualify for current situation',
        timeframe: '2-3 days of re-engagement conversation',
      },
      {
        nextStage: 'NURTURE',
        probability: 0.3,
        triggeringEvent: 'Interest fades again',
        recommendedAction: 'Back to nurture if soft signal',
        timeframe: 'If interest doesn\'t convert to action',
      },
    ],
    AT_RISK: [
      {
        nextStage: 'RE_ENGAGING',
        probability: 0.4,
        triggeringEvent: 'Positive response to re-engagement',
        recommendedAction: 'Sales call to understand status',
        timeframe: 'Within 24 hours of response',
      },
      {
        nextStage: 'LOST',
        probability: 0.5,
        triggeringEvent: 'Silence continues beyond 3 weeks',
        recommendedAction: 'Close loop with final outreach',
        timeframe: '21+ days of at-risk status',
      },
      {
        nextStage: 'DISQUALIFIED',
        probability: 0.1,
        triggeringEvent: 'Bad fit discovered in at-risk review',
        recommendedAction: 'Document and archive',
        timeframe: 'Upon discovery',
      },
    ],
    LOST: [
      {
        nextStage: 'WINBACK',
        probability: 0.2,
        triggeringEvent: 'Competitor failure or renewed interest',
        recommendedAction: 'Executive outreach for winback',
        timeframe: '3-6 months after loss',
      },
    ],
    DISQUALIFIED: [
      {
        nextStage: 'RE_ENGAGING',
        probability: 0.15,
        triggeringEvent: 'Situation changed, no longer disqualified',
        recommendedAction: 'Requalify from scratch',
        timeframe: '6+ months after disqualification',
      },
    ],
    CHURNED: [
      {
        nextStage: 'WINBACK',
        probability: 0.6,
        triggeringEvent: 'Churned customer shows interest',
        recommendedAction: 'Churn recovery specialist outreach',
        timeframe: 'Within 48 hours of signal',
      },
    ],
    WINBACK: [
      {
        nextStage: 'QUALIFYING',
        probability: 0.65,
        triggeringEvent: 'Winback lead confirmed interested',
        recommendedAction: 'Fast-track re-qualification',
        timeframe: '3-5 days of winback conversation',
      },
      {
        nextStage: 'LOST',
        probability: 0.35,
        triggeringEvent: 'Winback interest fades',
        recommendedAction: 'Archive with winback attempt noted',
        timeframe: 'If no progress after 10 days',
      },
    ],
  };

  return maps[currentStage] || [];
}

/**
 * Analyzes lead's full stage history for patterns
 */
export function trackStageHistory(history: StageHistoryEntry[]): StageAnalytics {
  const totalStages = history.length;
  let totalRegressions = 0;

  // Count regressions (moves to earlier stages)
  const stageOrder: Record<LeadStage, number> = {
    NEW: 0,
    CONTACTED: 1,
    ENGAGED: 2,
    QUALIFYING: 3,
    QUALIFIED: 4,
    DEMO_SCHEDULED: 5,
    DEMO_COMPLETED: 6,
    PROPOSAL_SENT: 7,
    NEGOTIATING: 8,
    CLOSING: 9,
    WON: 10,
    NURTURE: 2.5,
    RE_ENGAGING: 3.5,
    AT_RISK: -1,
    LOST: -2,
    DISQUALIFIED: -3,
    CHURNED: 11,
    WINBACK: 5,
  };

  for (let i = 1; i < history.length; i++) {
    const prevOrder = stageOrder[history[i - 1].stage];
    const currOrder = stageOrder[history[i].stage];
    if (currOrder < prevOrder && !['AT_RISK', 'LOST', 'DISQUALIFIED', 'WINBACK'].includes(history[i].stage)) {
      totalRegressions++;
    }
  }

  // Find stall points
  const stallPoints: { stage: LeadStage; count: number; avgDuration: number }[] = [];
  const stageDurations: Record<string, number[]> = {};

  history.forEach((entry) => {
    if (!stageDurations[entry.stage]) {
      stageDurations[entry.stage] = [];
    }
    const days = entry.durationMs / (1000 * 60 * 60 * 24);
    stageDurations[entry.stage].push(days);
  });

  Object.entries(stageDurations).forEach(([stage, durations]) => {
    if (durations.length >= 2) {
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      stallPoints.push({
        stage: stage as LeadStage,
        count: durations.length,
        avgDuration,
      });
    }
  });

  // Calculate velocity per stage
  const velocityPerStage: { stage: LeadStage; avgDays: number }[] = Object.entries(stageDurations)
    .map(([stage, durations]) => ({
      stage: stage as LeadStage,
      avgDays: durations.reduce((a, b) => a + b, 0) / durations.length,
    }))
    .sort((a, b) => a.avgDays - b.avgDays);

  // Determine pattern
  const regressionRate = totalRegressions / Math.max(totalStages - 1, 1);
  let pattern: 'typical' | 'fast-track' | 'stalled' | 'erratic' | 'regressive' = 'typical';
  let patternScore = 0.7;

  if (regressionRate > 0.3) {
    pattern = 'regressive';
    patternScore = 0.3;
  } else if (stallPoints.some((s) => s.avgDuration > 30)) {
    pattern = 'stalled';
    patternScore = 0.4;
  } else if (
    velocityPerStage.some((v) => v.avgDays < 2) &&
    history[history.length - 1].stage === 'WON'
  ) {
    pattern = 'fast-track';
    patternScore = 0.95;
  } else if (totalRegressions > 2) {
    pattern = 'erratic';
    patternScore = 0.5;
  }

  return {
    totalStages,
    totalRegressions,
    regressionRate,
    stallPoints,
    velocityPerStage,
    pattern,
    patternScore,
  };
}

/**
 * Returns engagement playbook for a specific stage
 */
export function defineStagePlaybook(stage: LeadStage): StagePlaybook {
  const playbooks: Record<LeadStage, StagePlaybook> = {
    NEW: {
      stage: 'NEW',
      communicationFrequency: 'asneeded',
      preferredChannels: ['email', 'phone'],
      contentStrategy: 'relationship',
      keyQuestions: [
        'Is this company a good fit for our solution?',
        'Who is the economic buyer?',
        'What is their current pain point?',
      ],
      exitCriteria: ['First contact made', 'Response received'],
      redFlags: ['Invalid contact info', 'Company no longer exists', 'Wholesale refusal'],
      expectedOutcome: 'Initial contact made, basic interest confirmed',
    },
    CONTACTED: {
      stage: 'CONTACTED',
      communicationFrequency: 'every2days',
      preferredChannels: ['phone', 'email'],
      contentStrategy: 'relationship',
      keyQuestions: [
        'Are they open to a conversation?',
        'What is their current situation?',
        'Is this the right person?',
      ],
      exitCriteria: ['Lead responds', 'Conversation scheduled', 'Clear refusal (DISQUALIFIED)'],
      redFlags: ['Multiple bounces', 'Out of office > 2 weeks', 'Clear "not interested"'],
      expectedOutcome: 'Establish dialogue, confirm relevance',
    },
    ENGAGED: {
      stage: 'ENGAGED',
      communicationFrequency: 'every2days',
      preferredChannels: ['phone', 'meeting', 'email'],
      contentStrategy: 'discovery',
      keyQuestions: [
        'What is their current solution?',
        'What problems are they facing?',
        'What is their timeline?',
      ],
      exitCriteria: ['All BANT questions answered', 'Discovery call scheduled', 'Move to nurture if unqualified'],
      redFlags: ['Vague answers', 'Indefinite timeline', 'Already in contract with competitor'],
      expectedOutcome: 'Initial discovery complete, qualification path clear',
    },
    QUALIFYING: {
      stage: 'QUALIFYING',
      communicationFrequency: 'every2days',
      preferredChannels: ['meeting', 'phone'],
      contentStrategy: 'discovery',
      keyQuestions: [
        'Budget: Do they have it? What is the range?',
        'Authority: Who makes the decision?',
        'Need: How critical is the problem?',
        'Timeline: When do they need to solve it?',
      ],
      exitCriteria: ['BANT fully qualified', 'Demo scheduled', 'Needs assessment documented'],
      redFlags: ['Budget not approved', 'No clear authority', 'Vague timeline', 'Competing priorities'],
      expectedOutcome: 'Full qualification complete, demo scheduled',
    },
    QUALIFIED: {
      stage: 'QUALIFIED',
      communicationFrequency: 'every2days',
      preferredChannels: ['meeting', 'phone'],
      contentStrategy: 'validation',
      keyQuestions: [
        'Does our solution solve their problem?',
        'How does our pricing compare to their budget?',
        'What is the implementation timeline?',
      ],
      exitCriteria: ['Demo scheduled and confirmed', 'Executive sponsor identified'],
      redFlags: ['Hesitation to commit to demo', 'Unclear about success metrics'],
      expectedOutcome: 'Demo booked and confirmed, clear next steps',
    },
    DEMO_SCHEDULED: {
      stage: 'DEMO_SCHEDULED',
      communicationFrequency: 'every2days',
      preferredChannels: ['email', 'meeting'],
      contentStrategy: 'validation',
      keyQuestions: ['Confirm attendees', 'Confirm technical requirements', 'Share agenda'],
      exitCriteria: ['Demo delivered', 'Feedback captured'],
      redFlags: ['Demo rescheduled > 1 time', 'Key stakeholder removed from attendee list'],
      expectedOutcome: 'Demo completed with full engagement team',
    },
    DEMO_COMPLETED: {
      stage: 'DEMO_COMPLETED',
      communicationFrequency: 'daily',
      preferredChannels: ['phone', 'meeting'],
      contentStrategy: 'validation',
      keyQuestions: [
        'Did the demo meet their expectations?',
        'What questions do they have?',
        'What is the next step?',
      ],
      exitCriteria: ['Proposal sent or nurture path confirmed', 'Objections addressed'],
      redFlags: ['Lukewarm response', 'Competitor inquiry', 'Asks to "think about it"'],
      expectedOutcome: 'Clear buying signal or educational path identified',
    },
    PROPOSAL_SENT: {
      stage: 'PROPOSAL_SENT',
      communicationFrequency: 'every2days',
      preferredChannels: ['phone', 'email', 'meeting'],
      contentStrategy: 'sales',
      keyQuestions: [
        'Do they understand the proposal?',
        'What are their objections?',
        'Who needs to approve?',
        'When will they decide?',
      ],
      exitCriteria: ['Proposal reviewed', 'Negotiation started or deal closed'],
      redFlags: ['No response after 5 days', 'Price objection', 'Asking about "alternatives"'],
      expectedOutcome: 'Proposal reviewed, negotiation path clear',
    },
    NEGOTIATING: {
      stage: 'NEGOTIATING',
      communicationFrequency: 'daily',
      preferredChannels: ['meeting', 'phone'],
      contentStrategy: 'sales',
      keyQuestions: [
        'What are the key negotiation points?',
        'What is their approval process?',
        'When do they want to close?',
      ],
      exitCriteria: ['Terms agreed', 'Contract prepared'],
      redFlags: ['Negotiation extending > 3 weeks', 'New decision makers appearing', 'Price being renegotiated down'],
      expectedOutcome: 'Final terms agreed, contract ready',
    },
    CLOSING: {
      stage: 'CLOSING',
      communicationFrequency: 'daily',
      preferredChannels: ['phone', 'email', 'meeting'],
      contentStrategy: 'urgency',
      keyQuestions: ['Have they reviewed the contract?', 'Any final concerns?', 'Timeline to signature?'],
      exitCriteria: ['Contract signed', 'Payment received or payment plan confirmed'],
      redFlags: ['Silence after contract sent', 'Last-minute objections', 'Budget approval issue'],
      expectedOutcome: 'Contract signed, deal closed, customer onboarded',
    },
    WON: {
      stage: 'WON',
      communicationFrequency: 'asneeded',
      preferredChannels: ['email', 'meeting', 'phone'],
      contentStrategy: 'relationship',
      keyQuestions: [],
      exitCriteria: [],
      redFlags: [],
      expectedOutcome: 'Customer successfully onboarded and activated',
    },
    NURTURE: {
      stage: 'NURTURE',
      communicationFrequency: 'weekly',
      preferredChannels: ['email'],
      contentStrategy: 'educational',
      keyQuestions: [
        'What educational content interests them?',
        'When might they be ready to buy?',
        'What are they currently using?',
      ],
      exitCriteria: ['Response to nurture content', 'Buying signal detected', 'Re-engagement conversation started'],
      redFlags: ['Email bounces', 'Multiple unsubscribes', 'No opens in 6 months'],
      expectedOutcome: 'Regular engagement through educational content, future buying signal',
    },
    RE_ENGAGING: {
      stage: 'RE_ENGAGING',
      communicationFrequency: 'every2days',
      preferredChannels: ['phone', 'meeting'],
      contentStrategy: 'relationship',
      keyQuestions: [
        'What has changed since last conversation?',
        'Are they still interested?',
        'What is their current situation?',
      ],
      exitCriteria: ['Conversation completed', 'Interest level confirmed', 'Move to QUALIFYING or back to NURTURE'],
      redFlags: ['Hesitant responses', 'Budget unavailable', 'Still working with competitor'],
      expectedOutcome: 'Re-engaged and either moving forward or back to nurture',
    },
    AT_RISK: {
      stage: 'AT_RISK',
      communicationFrequency: 'daily',
      preferredChannels: ['phone'],
      contentStrategy: 'urgency',
      keyQuestions: [
        'What happened?',
        'Are they still interested?',
        'What is holding them back?',
        'Can we address their concerns?',
      ],
      exitCriteria: ['Interest confirmed and plan to move forward', 'Honest conversation about deal status'],
      redFlags: ['Buyer went dark', 'Competitor advances', 'Budget no longer available'],
      expectedOutcome: 'Status clarified, either renewed commitment or honest close',
    },
    LOST: {
      stage: 'LOST',
      communicationFrequency: 'monthly',
      preferredChannels: ['email'],
      contentStrategy: 'relationship',
      keyQuestions: ['Why did we lose?', 'What is the competitor doing?', 'Could we win them back?'],
      exitCriteria: [],
      redFlags: [],
      expectedOutcome: 'Post-mortem completed, learnings documented, stay in contact',
    },
    DISQUALIFIED: {
      stage: 'DISQUALIFIED',
      communicationFrequency: 'asneeded',
      preferredChannels: [],
      contentStrategy: 'relationship',
      keyQuestions: [],
      exitCriteria: ['Situation changes and re-qualify', 'Archive for future'],
      redFlags: [],
      expectedOutcome: 'Lead archived with disqualification reason documented',
    },
    CHURNED: {
      stage: 'CHURNED',
      communicationFrequency: 'monthly',
      preferredChannels: ['email', 'phone'],
      contentStrategy: 'relationship',
      keyQuestions: [
        'Why did they churn?',
        'Are they considering return?',
        'What would bring them back?',
      ],
      exitCriteria: ['Winback conversation', 'Relationship maintained'],
      redFlags: [],
      expectedOutcome: 'Regular soft touches, monitor for winback signals',
    },
    WINBACK: {
      stage: 'WINBACK',
      communicationFrequency: 'daily',
      preferredChannels: ['phone', 'meeting'],
      contentStrategy: 'sales',
      keyQuestions: [
        'What has changed?',
        'Can we address previous concerns?',
        'What is their timeline?',
        'What would the deal look like?',
      ],
      exitCriteria: ['Winback deal closed', 'Move back to sales pipeline or park'],
      redFlags: ['Previous issues not resolved', 'Still unhappy with product', 'Budget unavailable'],
      expectedOutcome: 'Winback deal closed or interest fades, honest conversation about prospects',
    },
  };

  return playbooks[stage];
}
