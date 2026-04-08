/**
 * Scenario Intelligence Library — System's Sales Experience Memory
 * 50+ battle-tested sales scenarios with proven responses.
 * Pattern-matches situations to optimal proven strategies.
 */

import type { OutcomeType, NextRequiredAction } from "./outcome-taxonomy";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SalesSituation {
  lead_id: string;
  workspace_id: string;
  lifecycle_phase: string;
  days_since_last_contact: number;
  total_touchpoints: number;
  last_outcome: OutcomeType | null;
  last_message_sent: string | null;
  engagement_score: number;
  urgency_score: number;
  conversion_probability: number;
  last_objection?: string | null;
  demo_completed?: boolean;
  pricing_shown?: boolean;
  decision_maker_engaged?: boolean;
  competitor_mentioned?: string | null;
  internal_champion?: boolean;
  contract_sent?: boolean;
  contract_signed?: boolean;
  budget_confirmed?: boolean;
  timeline_shared?: boolean;
  email_opens?: number;
  website_visits?: number;
  is_returning_customer?: boolean;
  churn_reason?: string | null;
}

export interface ScenarioPlaybook {
  id: string;
  category: string;
  name: string;
  description: string;
  triggerConditions: TriggerCondition[];
  recommendedActions: Action[];
  messagingGuidance: MessagingGuidance;
  expectedOutcome: string;
  timelineExpectation: string;
  escalationCriteria: EscalationCriterion[];
  successMetrics: string[];
}

export interface TriggerCondition {
  signal: string;
  operator: "equals" | "greater_than" | "less_than" | "contains" | "exists";
  value: string | number | boolean;
  weight: number; // 0.1 to 1.0
}

export interface Action {
  sequence: number;
  type:
    | "send_message"
    | "schedule_call"
    | "send_email"
    | "offer_demo"
    | "share_resource"
    | "acknowledge_objection"
    | "provide_proof"
    | "facilitate_deal"
    | "escalate"
    | "nurture"
    | "pause";
  description: string;
  template?: string;
  timing: "immediate" | "same_day" | "within_3_days" | "within_week";
}

export interface MessagingGuidance {
  tone: "warm" | "curious" | "empathetic" | "assertive" | "humble";
  keyPhrases: string[];
  whatToAvoid: string[];
  coreValue: string;
}

export interface EscalationCriterion {
  signal: string;
  action: NextRequiredAction;
  timeToEscalate: number; // minutes
}

export interface ScenarioMatch {
  matchedScenario: ScenarioPlaybook;
  confidence: number; // 0-1
  recommendedActions: Action[];
  adaptations: string[]; // How to customize for this specific lead
  alternativeScenarios: ScenarioPlaybook[];
}

// ============================================================================
// SCENARIO LIBRARY (50+ scenarios across 5 categories)
// ============================================================================

const LEAD_REACTIVATION_SCENARIOS: ScenarioPlaybook[] = [
  {
    id: "reac-001",
    category: "Lead Reactivation",
    name: "Initial Call Cold Trail",
    description: "Lead went dark after first call — warm re-engagement with continuity",
    triggerConditions: [
      { signal: "days_since_last_contact", operator: "greater_than", value: 7, weight: 0.8 },
      { signal: "total_touchpoints", operator: "equals", value: 1, weight: 0.7 },
      { signal: "last_outcome", operator: "equals", value: "call_back_requested", weight: 0.9 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Reference the specific topic discussed in first call",
        template:
          "Hi [Name], I was thinking about our call last week when you mentioned [specific_pain]. I found this resource that directly addresses it.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "schedule_call",
        description: "Offer low-pressure reconnection",
        template: "Would a 15-min sync this week work to explore this further?",
        timing: "within_3_days",
      },
    ],
    messagingGuidance: {
      tone: "warm",
      keyPhrases: ["I was thinking about our conversation", "You mentioned", "I thought of you"],
      whatToAvoid: ["Demanding tone", "Pressure to commit", "Generic follow-up"],
      coreValue: "Show you listened and remembered specifics — differentiate from noise",
    },
    expectedOutcome: "Call reconnected, re-engage pipeline",
    timelineExpectation: "3-5 days to reconnection",
    escalationCriteria: [
      { signal: "no_response_after_2_attempts", action: "schedule_followup", timeToEscalate: 10080 },
    ],
    successMetrics: ["Reply rate >40%", "Call scheduled within 5 days"],
  },
  {
    id: "reac-002",
    category: "Lead Reactivation",
    name: "Post-Demo Silence",
    description: "Lead went dark after demo — assume they're comparing, lead with differentiation",
    triggerConditions: [
      { signal: "days_since_last_contact", operator: "greater_than", value: 3, weight: 0.8 },
      { signal: "demo_completed", operator: "equals", value: true, weight: 0.95 },
      { signal: "last_outcome", operator: "equals", value: "no_answer", weight: 0.6 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_email",
        description: "Share competitive positioning — specific to their use case",
        template:
          "Following up on the demo — here's a side-by-side comparison of how we differ from [common_competitor] on the exact workflow you showed me.",
        timing: "same_day",
      },
      {
        sequence: 2,
        type: "share_resource",
        description: "Provide customer story from similar company",
        template:
          "Thought you'd find this case study relevant — [Customer Name] had the same concern you raised and saw 40% efficiency gain.",
        timing: "within_3_days",
      },
      {
        sequence: 3,
        type: "send_message",
        description: "Soft curiosity ask — non-pushy",
        template:
          "Hey [Name], just checking — any other questions from the demo I can clarify? Happy to discuss how we stack up against alternatives.",
        timing: "within_week",
      },
    ],
    messagingGuidance: {
      tone: "assertive",
      keyPhrases: [
        "Here's how we're different",
        "Similar company achieved",
        "One thing we uniquely offer",
      ],
      whatToAvoid: ["Desperation", "Assumptions about competition", "Overpromising"],
      coreValue: "Make the choice easy by showing clear differentiation vs next best option",
    },
    expectedOutcome: "Re-engagement with buying comparison context",
    timelineExpectation: "5-7 days to decision signal",
    escalationCriteria: [
      {
        signal: "no_response_after_competitive_positioning",
        action: "schedule_followup",
        timeToEscalate: 7200,
      },
    ],
    successMetrics: ["Competitive email opens >50%", "Decision signal within 7 days"],
  },
  {
    id: "reac-003",
    category: "Lead Reactivation",
    name: "Price Shock Silent Treatment",
    description: "Lead went dark after pricing discussion — address objection softly",
    triggerConditions: [
      { signal: "pricing_shown", operator: "equals", value: true, weight: 0.95 },
      { signal: "days_since_last_contact", operator: "greater_than", value: 2, weight: 0.8 },
      { signal: "engagement_score", operator: "less_than", value: 40, weight: 0.7 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Acknowledge price is a factor, but reframe value",
        template:
          "I know the pricing might have been higher than expected. Most customers tell us ROI comes in 3-4 months. Can I share the math?",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "provide_proof",
        description: "Share ROI calculator or payback period breakdown",
        template: "Here's the actual breakdown of how customers typically see payback.",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "send_message",
        description: "Offer flexibility on terms",
        template:
          "Open to discussing implementation timeline and payment terms that work for your budget cycle.",
        timing: "within_3_days",
      },
    ],
    messagingGuidance: {
      tone: "empathetic",
      keyPhrases: [
        "I understand cost is a factor",
        "Most teams see ROI in",
        "Let's find terms that work",
      ],
      whatToAvoid: [
        "Cutting price immediately (makes you look desperate)",
        "Dismissing their concern",
        "Pushy follow-up",
      ],
      coreValue: "Validate the concern, then prove it's a non-issue through concrete economics",
    },
    expectedOutcome: "Reframe from cost to ROI, move to negotiation",
    timelineExpectation: "5-7 days to re-engagement",
    escalationCriteria: [
      { signal: "continued_no_response", action: "pause_execution", timeToEscalate: 604800 },
    ],
    successMetrics: [
      "ROI proof opens >60%",
      "Price objection addressed in conversation within 7 days",
    ],
  },
  {
    id: "reac-004",
    category: "Lead Reactivation",
    name: "Think-It-Over Decay",
    description:
      "Lead said 'let me think about it' and went dark — give space then value-driven nudge",
    triggerConditions: [
      { signal: "last_outcome", operator: "equals", value: "call_back_requested", weight: 0.9 },
      { signal: "days_since_last_contact", operator: "greater_than", value: 5, weight: 0.8 },
      { signal: "last_message_sent", operator: "contains", value: "think", weight: 0.7 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "pause",
        description: "Wait 5 days for natural reflection — don't interrupt thinking",
        timing: "within_week",
      },
      {
        sequence: 2,
        type: "send_email",
        description: "Value nudge — share something new they didn't see",
        template:
          "Haven't heard from you since our call — wanted to share something new that came up with another customer in your space.",
        timing: "within_week",
      },
      {
        sequence: 3,
        type: "send_message",
        description: "Low-pressure check-in",
        template:
          "Just checking in — any questions come up while you were thinking? Happy to jump on a quick call.",
        timing: "within_week",
      },
    ],
    messagingGuidance: {
      tone: "humble",
      keyPhrases: [
        "Wanted to share something new",
        "Any questions come up?",
        "No pressure — just checking",
      ],
      whatToAvoid: [
        "Aggressive follow-up during thinking period",
        "Pressure tactics",
        "Negativity about delay",
      ],
      coreValue: "Respect their process, add value during thinking, remove friction from decision",
    },
    expectedOutcome: "Provide new information, unlock decision",
    timelineExpectation: "10-14 days from initial 'think about it'",
    escalationCriteria: [{ signal: "no_response_x3", action: "pause_execution", timeToEscalate: 1209600 }],
    successMetrics: ["Value email opens >55%", "Response rate >35%"],
  },
  {
    id: "reac-005",
    category: "Lead Reactivation",
    name: "Unexpected Re-engagement",
    description: "Lead suddenly calls back after weeks of silence — be available, warm, curious",
    triggerConditions: [
      { signal: "days_since_last_contact", operator: "greater_than", value: 21, weight: 0.8 },
      { signal: "last_outcome", operator: "equals", value: "no_answer", weight: 0.7 },
      { signal: "total_touchpoints", operator: "greater_than", value: 3, weight: 0.6 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Immediate availability signal",
        template: "Great to hear from you! I'm free right now if you want to chat.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "schedule_call",
        description: "Lock in time to talk — they're ready",
        template: "Perfect. How's the next 15-20 minutes? Or later today works too.",
        timing: "immediate",
      },
    ],
    messagingGuidance: {
      tone: "warm",
      keyPhrases: ["Great to hear from you", "I'm available", "What changed?", "What can I help with?"],
      whatToAvoid: ["Acting surprised (they know they went dark)", "Grilling them on inactivity"],
      coreValue:
        "They came back — remove all friction, show genuine interest in what changed, move fast",
    },
    expectedOutcome: "Immediate connection and conversation",
    timelineExpectation: "Same day or next business day",
    escalationCriteria: [],
    successMetrics: ["Same-day connection rate >80%", "Call booked immediately"],
  },
  {
    id: "reac-006",
    category: "Lead Reactivation",
    name: "Email Open Curiosity",
    description: "Lead re-opens old emails after silence — they're reconsidering, soft touch",
    triggerConditions: [
      { signal: "days_since_last_contact", operator: "greater_than", value: 7, weight: 0.7 },
      { signal: "email_opens", operator: "greater_than", value: 1, weight: 0.9 },
      { signal: "engagement_score", operator: "less_than", value: 30, weight: 0.6 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Acknowledge the email open without being creepy",
        template: "Noticed you looked back at our last email — anything spark your interest?",
        timing: "within_3_days",
      },
      {
        sequence: 2,
        type: "send_email",
        description: "Share updated/refreshed version of old content",
        template:
          "Since you seemed interested in that approach, wanted to share an updated version with new case study.",
        timing: "within_3_days",
      },
    ],
    messagingGuidance: {
      tone: "curious",
      keyPhrases: ["Noticed you looked back", "Anything resonate?", "New perspective"],
      whatToAvoid: ["Being creepy about tracking", "Aggressive selling", "Repeating old message"],
      coreValue: "Show attentiveness to signals without being intrusive — prove you pay attention",
    },
    expectedOutcome: "Re-spark conversation from lower stakes angle",
    timelineExpectation: "3-5 days to response",
    escalationCriteria: [{ signal: "no_response_after_notification", action: "schedule_followup", timeToEscalate: 604800 }],
    successMetrics: ["Response rate >40%", "Call booked within 7 days"],
  },
  {
    id: "reac-007",
    category: "Lead Reactivation",
    name: "Website Re-visitor Pattern",
    description: "Lead visits website after long absence — acknowledge without creepiness",
    triggerConditions: [
      { signal: "days_since_last_contact", operator: "greater_than", value: 14, weight: 0.8 },
      { signal: "website_visits", operator: "greater_than", value: 0, weight: 0.95 },
      { signal: "engagement_score", operator: "less_than", value: 35, weight: 0.6 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Light mention of site visit + new feature",
        template:
          "Saw you stopped by the site — we've added [new feature] since we last talked. Thought you might find it useful.",
        timing: "same_day",
      },
      {
        sequence: 2,
        type: "share_resource",
        description: "Share what changed/improved since their last view",
        template: "Here's a quick breakdown of the main updates.",
        timing: "same_day",
      },
    ],
    messagingGuidance: {
      tone: "warm",
      keyPhrases: ["Noticed you checked us out", "We've updated", "Thought you'd find valuable"],
      whatToAvoid: [
        "Creepy tracking language",
        "Pressure",
        "Repeating old value prop",
      ],
      coreValue: "Show you noticed interest without being invasive, give them a reason to re-engage",
    },
    expectedOutcome: "Spark new conversation thread",
    timelineExpectation: "2-4 days to response",
    escalationCriteria: [],
    successMetrics: ["Message open rate >50%", "Re-engagement within 5 days"],
  },
  {
    id: "reac-008",
    category: "Lead Reactivation",
    name: "Handoff Breakdown Recovery",
    description: "Lead was handed off and went dark — rebuild relationship from scratch",
    triggerConditions: [
      { signal: "last_outcome", operator: "equals", value: "routed", weight: 0.9 },
      { signal: "days_since_last_contact", operator: "greater_than", value: 3, weight: 0.8 },
      { signal: "engagement_score", operator: "less_than", value: 25, weight: 0.7 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "New intro — don't assume they know about handoff",
        template:
          "Hi [Name], I'm [Your Name] and I'm taking over your account. I've read through everything and want to make sure nothing falls through.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "schedule_call",
        description: "Relationship restart — show you're invested",
        template:
          "Would love to jump on a quick call and make sure we're still aligned on [what they were working on].",
        timing: "within_3_days",
      },
    ],
    messagingGuidance: {
      tone: "warm",
      keyPhrases: ["Taking over your account", "Read through everything", "Want to make sure nothing falls through"],
      whatToAvoid: [
        "Blaming previous rep",
        "Acting like a fresh start if problems happened",
        "Pretending you don't know the context",
      ],
      coreValue: "Demonstrate continuity and care — show this isn't a restart, it's a recommitment",
    },
    expectedOutcome: "Rebuild relationship, unlock previous momentum",
    timelineExpectation: "5-7 days to call",
    escalationCriteria: [{ signal: "no_response_after_intro", action: "schedule_followup", timeToEscalate: 604800 }],
    successMetrics: ["Call booked within 7 days", "Acknowledge previous context >80%"],
  },
  {
    id: "reac-009",
    category: "Lead Reactivation",
    name: "Colleague Referral Leverage",
    description: "Lead's colleague reaches out — use internal champion to unlock decision",
    triggerConditions: [
      { signal: "days_since_last_contact", operator: "greater_than", value: 7, weight: 0.8 },
      { signal: "internal_champion", operator: "equals", value: true, weight: 0.95 },
      { signal: "total_touchpoints", operator: "greater_than", value: 2, weight: 0.6 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Thank internal champion, ask specific help",
        template:
          "[Champion], thanks for thinking of me. Would you be willing to briefly intro me to [Decision Maker]? I want to make sure we address their specific need.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "schedule_call",
        description: "Facilitated introduction call",
        template:
          "Perfect — let's do a 20-min call with [Champion] and [Decision Maker] so I can understand the full picture.",
        timing: "within_3_days",
      },
    ],
    messagingGuidance: {
      tone: "warm",
      keyPhrases: ["Thanks for the intro", "Appreciate you thinking of us", "What's the priority?"],
      whatToAvoid: [
        "Taking champion for granted",
        "Sidelining them in conversation",
        "Not following up with champion",
      ],
      coreValue: "Leverage internal trust to unlock blocked conversations — champion carries weight",
    },
    expectedOutcome: "Connect with decision maker with internal credibility",
    timelineExpectation: "3-5 days to facilitated meeting",
    escalationCriteria: [],
    successMetrics: ["Intro rate >90%", "Meeting scheduled within 5 days"],
  },
  {
    id: "reac-010",
    category: "Lead Reactivation",
    name: "Former Customer Return",
    description: "Lead churned previously but is returning — acknowledge history + show change",
    triggerConditions: [
      { signal: "is_returning_customer", operator: "equals", value: true, weight: 0.95 },
      { signal: "days_since_last_contact", operator: "greater_than", value: 1, weight: 0.7 },
      { signal: "churn_reason", operator: "exists", value: true, weight: 0.8 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Acknowledge history, own the churn reason",
        template:
          "Welcome back [Name]. I saw things didn't work out around [churn_reason]. We've actually made [specific improvement]. Can I show you what's changed?",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "schedule_call",
        description: "Deep dive on what's different now",
        template:
          "Let's talk through the specific changes we've made since you left. I think you'll see it differently now.",
        timing: "within_3_days",
      },
      {
        sequence: 3,
        type: "provide_proof",
        description: "Show concrete evidence of improvement",
        template: "Here's the performance data on that feature — looks completely different now.",
        timing: "same_day",
      },
    ],
    messagingGuidance: {
      tone: "humble",
      keyPhrases: [
        "We've made real improvements",
        "Here's what changed",
        "Understand why you left",
        "Different now",
      ],
      whatToAvoid: [
        "Dismissing their past bad experience",
        "Overselling changes without proof",
        "Taking the churn personally",
      ],
      coreValue: "Show accountability for why they left, provide proof things are genuinely different now",
    },
    expectedOutcome: "Re-win trust, move to new contract",
    timelineExpectation: "7-10 days to decision",
    escalationCriteria: [{ signal: "hesitant_after_proof", action: "schedule_followup", timeToEscalate: 604800 }],
    successMetrics: ["Call scheduled >95%", "Contract signed within 14 days"],
  },
];

const OBJECTION_SCENARIOS: ScenarioPlaybook[] = [
  {
    id: "obj-001",
    category: "Objection Scenarios",
    name: "Price Too High",
    description: "Lead says price is too high — value justification + flexible payment",
    triggerConditions: [
      { signal: "pricing_shown", operator: "equals", value: true, weight: 0.95 },
      { signal: "last_objection", operator: "contains", value: "price", weight: 0.9 },
      { signal: "engagement_score", operator: "less_than", value: 50, weight: 0.7 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Validate concern, reframe as investment",
        template:
          "I hear you. Price is always a factor. But let's talk ROI — most of our customers break even in [3-4 months]. Want to see the math?",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "provide_proof",
        description: "Share ROI calculator and payback breakdown",
        template: "Here's the exact payback analysis for a company your size.",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "facilitate_deal",
        description: "Offer flexible terms",
        template:
          "Open to discussing payment terms that fit your budget cycle. And we can start with [tier] and expand once you see ROI.",
        timing: "within_3_days",
      },
    ],
    messagingGuidance: {
      tone: "assertive",
      keyPhrases: ["Let's talk about ROI", "Cost is only half the equation", "Most break even in", "Flexible terms"],
      whatToAvoid: ["Cutting price immediately", "Dismissing their budget reality", "Long justifications"],
      coreValue: "Reframe from cost to value — prove ROI mathematically, offer flexibility to reduce risk",
    },
    expectedOutcome: "Price objection becomes investment question",
    timelineExpectation: "3-5 days to contract or pipeline pause",
    escalationCriteria: [{ signal: "still_too_expensive", action: "pause_execution", timeToEscalate: 604800 }],
    successMetrics: ["ROI doc engagement >70%", "Price objection resolved >60%"],
  },
  {
    id: "obj-002",
    category: "Objection Scenarios",
    name: "Need to Talk to Boss",
    description: "Lead wants to get approval — equip them to sell internally",
    triggerConditions: [
      { signal: "decision_maker_engaged", operator: "equals", value: false, weight: 0.9 },
      { signal: "last_objection", operator: "contains", value: "boss", weight: 0.9 },
      { signal: "engagement_score", operator: "greater_than", value: 50, weight: 0.6 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_email",
        description: "One-pager for them to share with boss",
        template: "Here's a one-pager you can share with your manager — covers ROI, timeline, and risk.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "send_message",
        description: "Offer to join call with decision maker",
        template:
          "Happy to jump on a call with you and your manager to answer any questions directly. Would that help?",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "share_resource",
        description: "Sales-friendly approval docs",
        template: "Here's what we typically share in executive reviews — ROI calculator, competitive analysis, timeline.",
        timing: "same_day",
      },
    ],
    messagingGuidance: {
      tone: "supportive",
      keyPhrases: ["Happy to help you sell this internally", "Here's what works with executives", "I'll handle the tough questions"],
      whatToAvoid: [
        "Making their job harder",
        "Over-complicating the ask",
        "Sidelining the champion",
      ],
      coreValue: "Equip your champion to win internally — their credibility matters more than yours",
    },
    expectedOutcome: "Champion can sell internally with confidence",
    timelineExpectation: "5-7 days to executive call or decision",
    escalationCriteria: [{ signal: "blocked_by_budget", action: "pause_execution", timeToEscalate: 2592000 }],
    successMetrics: [
      "One-pager downloaded + shared >80%",
      "Executive call booked >70%",
      "Deal moves within 14 days >60%",
    ],
  },
  {
    id: "obj-003",
    category: "Objection Scenarios",
    name: "Using Competitor",
    description: "Lead uses competitor — specific competitive advantage + migration support",
    triggerConditions: [
      { signal: "competitor_mentioned", operator: "exists", value: true, weight: 0.95 },
      { signal: "engagement_score", operator: "greater_than", value: 40, weight: 0.7 },
      { signal: "demo_completed", operator: "equals", value: true, weight: 0.6 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Validate choice, don't bash competitor",
        template:
          "[Competitor] is solid. Here's where we're specifically different on [pain they mentioned].",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "provide_proof",
        description: "Share competitive comparison + switching story",
        template:
          "Here's a side-by-side. And [Customer X] switched from [Competitor] specifically for [unique feature]. Happy to connect if helpful.",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "facilitate_deal",
        description: "Offer migration support",
        template:
          "We handle the entire migration from [Competitor]. No data loss, no downtime. Our migration team owns the whole process.",
        timing: "within_3_days",
      },
    ],
    messagingGuidance: {
      tone: "assertive",
      keyPhrases: [
        "Here's where we're different",
        "We've helped teams migrate from them",
        "We handle the heavy lifting",
      ],
      whatToAvoid: ["Bashing competitor", "Overstating superiority", "Making migration sound hard"],
      coreValue: "Acknowledge their choice, show specific differentiation, remove migration risk",
    },
    expectedOutcome: "Competitive win, migration initiated",
    timelineExpectation: "7-10 days to contract",
    escalationCriteria: [{ signal: "too_invested_in_competitor", action: "pause_execution", timeToEscalate: 1209600 }],
    successMetrics: ["Competitive positioning resonates >70%", "Migration initiated >50%"],
  },
  {
    id: "obj-004",
    category: "Objection Scenarios",
    name: "Bad Timing",
    description: "Lead says 'now is not the right time' — schedule future, stay visible",
    triggerConditions: [
      { signal: "last_objection", operator: "contains", value: "timing", weight: 0.85 },
      { signal: "engagement_score", operator: "greater_than", value: 50, weight: 0.7 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Validate timing concern, get specific timing",
        template: "Totally understand. When would be a better time? [Q2]? [After project X]?",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "schedule_call",
        description: "Lock in future follow-up",
        template: "Let's schedule a call for [specific date]. I'll send a calendar invite.",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "nurture",
        description: "Stay top of mind with value emails",
        template:
          "In the meantime, I'll send over some resources on [relevant topic]. No pressure — just staying in touch.",
        timing: "within_week",
      },
    ],
    messagingGuidance: {
      tone: "patient",
      keyPhrases: ["When would work better?", "Let's lock in a date", "Stay on your radar"],
      whatToAvoid: [
        "Pressuring them to go faster",
        "Disappearing after they say no",
        "Assuming they'll forget",
      ],
      coreValue: "Respect their timeline, stay visible without being pushy, lock in future date",
    },
    expectedOutcome: "Move to pipeline with clear re-engagement date",
    timelineExpectation: "Follow-up on locked date",
    escalationCriteria: [{ signal: "date_passes_no_response", action: "schedule_followup", timeToEscalate: 0 }],
    successMetrics: ["Future call scheduled >95%", "Nurture emails opened >50%"],
  },
  {
    id: "obj-005",
    category: "Objection Scenarios",
    name: "Had Bad Experience With Similar Product",
    description: "Lead had negative past experience — empathy + clear differentiation + low-risk trial",
    triggerConditions: [
      { signal: "last_objection", operator: "contains", value: "bad experience", weight: 0.95 },
      { signal: "engagement_score", operator: "greater_than", value: 35, weight: 0.7 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Deep empathy — own the category problem",
        template:
          "I totally get it. A lot of teams had the same issue with [product type]. Here's specifically how we're different.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "provide_proof",
        description: "Share how other recovered teams see difference",
        template:
          "[Company Y] had a terrible experience with [competitor] but came back around after seeing our approach.",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "facilitate_deal",
        description: "Offer low-risk trial",
        template:
          "How about we start with a 2-week trial, zero commitment. You'll see the difference immediately.",
        timing: "within_3_days",
      },
    ],
    messagingGuidance: {
      tone: "empathetic",
      keyPhrases: [
        "I understand the skepticism",
        "You're not alone",
        "Here's what's different",
        "Zero risk trial",
      ],
      whatToAvoid: [
        "Dismissing past bad experience",
        "Overpromising perfection",
        "Downplaying their concerns",
      ],
      coreValue: "Show deep understanding of why they're skeptical, prove it's different, remove risk",
    },
    expectedOutcome: "Convert skeptic to trial through empathy + proof",
    timelineExpectation: "3-7 days to trial start",
    escalationCriteria: [{ signal: "still_skeptical_after_trial_offer", action: "pause_execution", timeToEscalate: 1209600 }],
    successMetrics: ["Trial acceptance >65%", "Trial conversion >50%"],
  },
  {
    id: "obj-006",
    category: "Objection Scenarios",
    name: "Don't See the Need",
    description: "Lead doesn't see problem — educate on hidden costs of current approach",
    triggerConditions: [
      { signal: "last_objection", operator: "contains", value: "don't need", weight: 0.9 },
      { signal: "engagement_score", operator: "less_than", value: 45, weight: 0.8 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_email",
        description: "Education email on hidden costs",
        template:
          "Most teams don't think they need this until they calculate the true cost of [current approach]. Here's what we typically find.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "share_resource",
        description: "Hidden cost calculator or ROI research",
        template:
          "Take 5 min to run through this calculator with your team's numbers. Most are shocked by the hidden costs.",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "schedule_call",
        description: "Consultative deep dive",
        template:
          "Would love to walk through your current process and show you where the inefficiencies are hiding.",
        timing: "within_3_days",
      },
    ],
    messagingGuidance: {
      tone: "curious",
      keyPhrases: [
        "Most teams don't realize",
        "Hidden costs of",
        "Let me show you what we typically find",
      ],
      whatToAvoid: ["Calling them naive", "Over-complicating explanation", "High-pressure close"],
      coreValue: "Educate them on problem they don't see yet — let data do the talking",
    },
    expectedOutcome: "Create awareness of hidden problem",
    timelineExpectation: "5-7 days to awareness shift",
    escalationCriteria: [{ signal: "still_dont_see_it", action: "pause_execution", timeToEscalate: 1209600 }],
    successMetrics: [
      "Education email opens >55%",
      "Calculator engagement >50%",
      "Awareness shift within 7 days >40%",
    ],
  },
  {
    id: "obj-007",
    category: "Objection Scenarios",
    name: "Too Complex to Switch",
    description: "Lead worried about switching complexity — clear implementation roadmap + support",
    triggerConditions: [
      { signal: "last_objection", operator: "contains", value: "complex", weight: 0.85 },
      { signal: "engagement_score", operator: "greater_than", value: 50, weight: 0.7 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Validate concern, show clear roadmap",
        template:
          "Implementation can feel overwhelming. Here's exactly how we handle the switch — 3 phases, 30 days total, and our team owns it.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "provide_proof",
        description: "Share implementation timeline + case studies",
        template:
          "Here's our standard implementation plan. And see how [Company X] moved from [old system] in 3 weeks with zero downtime.",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "facilitate_deal",
        description: "Assign dedicated implementation lead",
        template:
          "I'll assign [Implementation Lead] as your dedicated point person. They own the entire process.",
        timing: "within_3_days",
      },
    ],
    messagingGuidance: {
      tone: "confident",
      keyPhrases: [
        "We own the entire implementation",
        "Zero downtime guarantee",
        "Dedicated implementation lead",
        "Standard 30-day timeline",
      ],
      whatToAvoid: [
        "Overstating simplicity",
        "Downplaying complexity",
        "Vague implementation timeline",
      ],
      coreValue: "Remove implementation risk through clear process, dedicated support, proven track record",
    },
    expectedOutcome: "Implementation confidence increases, objection resolved",
    timelineExpectation: "3-5 days to commitment",
    escalationCriteria: [{ signal: "implementation_concerns_remain", action: "schedule_followup", timeToEscalate: 604800 }],
    successMetrics: [
      "Implementation timeline accepted >80%",
      "Dedicated support resonates >90%",
    ],
  },
  {
    id: "obj-008",
    category: "Objection Scenarios",
    name: "Already Have Internal Solution",
    description: "Lead uses DIY solution — ROI of specialized vs DIY",
    triggerConditions: [
      { signal: "last_objection", operator: "contains", value: "internal", weight: 0.9 },
      { signal: "engagement_score", operator: "greater_than", value: 40, weight: 0.7 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Validate building internally, show cost of DIY",
        template:
          "Totally get it — DIY feels cheaper upfront. But when you factor in developer time, maintenance, and opportunity cost, most teams find we're faster and cheaper.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "provide_proof",
        description: "ROI comparison of DIY vs solution",
        template:
          "Here's the actual TCO breakdown. Most teams spend [X hours/month] maintaining their solution. At your engineering cost, that's [$ amount].",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "facilitate_deal",
        description: "Offer hybrid approach if needed",
        template: "Or we can work with your existing system if you want — we integrate cleanly.",
        timing: "within_3_days",
      },
    ],
    messagingGuidance: {
      tone: "analytical",
      keyPhrases: [
        "True cost of maintaining",
        "Hidden engineering time",
        "Opportunity cost",
        "Focus on core business",
      ],
      whatToAvoid: [
        "Dismissing engineering capability",
        "Overselling solution",
        "Getting into feature parity debates",
      ],
      coreValue: "Show ROI of outsourcing internal work — quantify the cost of DIY in engineering time",
    },
    expectedOutcome: "Shift from feature parity to cost-benefit",
    timelineExpectation: "5-7 days to decision",
    escalationCriteria: [{ signal: "married_to_internal_solution", action: "pause_execution", timeToEscalate: 1209600 }],
    successMetrics: ["TCO comparison resonates >70%", "Consideration increase >50%"],
  },
  {
    id: "obj-009",
    category: "Objection Scenarios",
    name: "Need More Features",
    description: "Lead wants features not on roadmap — roadmap preview + custom solutions",
    triggerConditions: [
      { signal: "last_objection", operator: "contains", value: "features", weight: 0.9 },
      { signal: "engagement_score", operator: "greater_than", value: 60, weight: 0.7 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Validate ask, share roadmap + timing",
        template:
          "That's a great request. We're actually building something similar in [Q3]. Want to see the roadmap? And we have custom options if you need it sooner.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "share_resource",
        description: "Show product roadmap + custom solution options",
        template: "Here's our roadmap for the next 6 months. And here's how we've done custom work for similar requests.",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "schedule_call",
        description: "Discuss custom solution or timeline alignment",
        template:
          "Let's jump on a call and map out exactly when you need this feature and what custom options might look like.",
        timing: "within_3_days",
      },
    ],
    messagingGuidance: {
      tone: "collaborative",
      keyPhrases: [
        "We're building that",
        "Custom options available",
        "You'd influence our roadmap",
        "Let's find the right timing",
      ],
      whatToAvoid: [
        "Promising features that aren't coming",
        "Overcommitting to custom work",
        "Making them feel like an outlier",
      ],
      coreValue: "Show clear roadmap + flexibility — make them feel heard and prioritized",
    },
    expectedOutcome: "Feature discussion becomes partnership conversation",
    timelineExpectation: "5-7 days to alignment",
    escalationCriteria: [{ signal: "feature_blocker", action: "schedule_followup", timeToEscalate: 604800 }],
    successMetrics: ["Roadmap resonates >75%", "Custom option considered >60%"],
  },
  {
    id: "obj-010",
    category: "Objection Scenarios",
    name: "Competitor Locked Contract",
    description: "Lead locked into competitor contract — plant seeds, prepare for renewal",
    triggerConditions: [
      { signal: "competitor_mentioned", operator: "exists", value: true, weight: 0.95 },
      { signal: "contract_signed", operator: "equals", value: true, weight: 0.9 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Validate contract, get renewal date",
        template:
          "Got it — you're locked in with [Competitor]. When's your renewal? We should be top of mind when you're ready to re-evaluate.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "nurture",
        description: "Quarterly value touchpoints",
        template: "I'll send over some relevant resources every quarter. Just staying in touch.",
        timing: "within_week",
      },
      {
        sequence: 3,
        type: "schedule_call",
        description: "Renewal planning call 60 days before contract end",
        template: "Let's lock in a call [60 days before renewal]. No pressure — just want to make sure you've got options.",
        timing: "within_week",
      },
    ],
    messagingGuidance: {
      tone: "patient",
      keyPhrases: [
        "When's your renewal?",
        "Just staying in touch",
        "Want to make sure you've got options",
      ],
      whatToAvoid: [
        "Trying to break contract",
        "Aggressive poaching",
        "Disappearing until renewal",
      ],
      coreValue: "Plant seeds now, nurture the relationship, position for renewal conversation",
    },
    expectedOutcome: "Top-of-mind for renewal, smooth transition at contract end",
    timelineExpectation: "Quarterly touchpoints, decision at renewal",
    escalationCriteria: [],
    successMetrics: [
      "Renewal date locked >90%",
      "Quarterly touchpoints completed >80%",
      "Win rate at renewal >40%",
    ],
  },
];

const MOMENTUM_SCENARIOS: ScenarioPlaybook[] = [
  {
    id: "mom-001",
    category: "Momentum Scenarios",
    name: "Pricing Inquiry (Buying Signal)",
    description: "Lead asks about pricing — don't just send details, get on a call",
    triggerConditions: [
      { signal: "last_message_sent", operator: "contains", value: "pricing", weight: 0.95 },
      { signal: "engagement_score", operator: "greater_than", value: 65, weight: 0.8 },
      { signal: "demo_completed", operator: "equals", value: true, weight: 0.8 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Show enthusiasm, move to conversation",
        template:
          "Great question! Pricing varies based on your use case. Happy to walk through it — got 15 minutes today?",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "schedule_call",
        description: "Lock in call ASAP",
        template: "Perfect. Let's do 2pm or 3pm today if either works?",
        timing: "immediate",
      },
    ],
    messagingGuidance: {
      tone: "assertive",
      keyPhrases: ["Great question", "Let's talk through it", "Got a few minutes?"],
      whatToAvoid: ["Sending long pricing page", "Delaying the conversation", "Treating as info request"],
      coreValue:
        "Recognize buying signal, move fast, get on call to customize pricing and surface questions",
    },
    expectedOutcome: "Same-day pricing conversation, unblock buying",
    timelineExpectation: "Same day to call",
    escalationCriteria: [],
    successMetrics: ["Call booked same day >85%", "Conversion after pricing call >70%"],
  },
  {
    id: "mom-002",
    category: "Momentum Scenarios",
    name: "Decision Maker Introduction",
    description: "Lead introduces decision maker — expand conversation, tailor to stakeholder",
    triggerConditions: [
      { signal: "decision_maker_engaged", operator: "equals", value: true, weight: 0.95 },
      { signal: "engagement_score", operator: "greater_than", value: 70, weight: 0.8 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Warm thank you, tailor to decision maker",
        template:
          "[Champion], thanks for looping in [Decision Maker]. [Decision Maker], I know budget and strategic fit are big priorities. Let me address those directly.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "schedule_call",
        description: "Dedicated call with decision maker",
        template:
          "Let's set up 30 min with you and [Champion] so I can walk through ROI, timeline, and how this maps to your strategy.",
        timing: "immediate",
      },
    ],
    messagingGuidance: {
      tone: "warm",
      keyPhrases: ["Thanks for the intro", "Tailor to your priorities", "Executive perspective"],
      whatToAvoid: [
        "Sidelining original champion",
        "Overselling to new person",
        "Starting from scratch",
      ],
      coreValue: "Expand group with new stakeholder perspective, maintain momentum, address new concerns",
    },
    expectedOutcome: "Decision maker engaged, buying process accelerates",
    timelineExpectation: "2-3 days to decision maker call",
    escalationCriteria: [],
    successMetrics: ["Call scheduled >95%", "Timeline to close <21 days"],
  },
  {
    id: "mom-003",
    category: "Momentum Scenarios",
    name: "Implementation Question",
    description: "Lead asks about implementation — they're mentally buying, confirm timeline",
    triggerConditions: [
      { signal: "last_message_sent", operator: "contains", value: "implement", weight: 0.9 },
      { signal: "engagement_score", operator: "greater_than", value: 70, weight: 0.8 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Show excitement, provide clear timeline",
        template:
          "Excellent question — implementation is straightforward. Standard timeline is 30 days. Want me to walk through the phases?",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "send_email",
        description: "Detailed implementation plan",
        template: "Here's our exact implementation roadmap. Phase 1 [X], Phase 2 [Y], Phase 3 [Z].",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "schedule_call",
        description: "Confirm timeline and next steps",
        template: "Let's confirm your target start date and lock in our implementation team.",
        timing: "within_3_days",
      },
    ],
    messagingGuidance: {
      tone: "confident",
      keyPhrases: ["Straightforward process", "30-day timeline", "Lock in your start date"],
      whatToAvoid: ["Vague timelines", "Under-scoping implementation", "Delaying next steps"],
      coreValue: "They're ready to move — remove all friction, provide clarity, lock in timeline",
    },
    expectedOutcome: "Move from consideration to implementation planning",
    timelineExpectation: "5-7 days to implementation kickoff",
    escalationCriteria: [],
    successMetrics: [
      "Implementation plan accepted >90%",
      "Timeline confirmed >95%",
      "Contract signed within 7 days >80%",
    ],
  },
  {
    id: "mom-004",
    category: "Momentum Scenarios",
    name: "Negative Competitor Mention",
    description: "Lead mentions competitor negatively — validate frustration, position alternative",
    triggerConditions: [
      { signal: "competitor_mentioned", operator: "exists", value: true, weight: 0.95 },
      { signal: "last_message_sent", operator: "contains", value: "bad", weight: 0.8 },
      { signal: "engagement_score", operator: "greater_than", value: 60, weight: 0.7 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Validate frustration with competitor",
        template:
          "Yeah, I hear that from teams all the time about [Competitor]. The [specific pain] is a common complaint. Here's how we approach it differently.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "provide_proof",
        description: "Share how we solve their specific pain",
        template:
          "Here's exactly how we handle [their frustration]. And look at [Customer X] — they had the same issue and switched.",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "schedule_call",
        description: "Deep dive on alternative approach",
        template:
          "Want to spend 20 minutes showing you our approach? I think you'll see why teams are moving.",
        timing: "within_3_days",
      },
    ],
    messagingGuidance: {
      tone: "validating",
      keyPhrases: [
        "I hear that complaint",
        "Here's how we're different",
        "Common frustration",
        "We've helped teams move from them",
      ],
      whatToAvoid: [
        "Trash-talking competitor",
        "Overstating superiority",
        "Being dismissive of their current tool",
      ],
      coreValue: "Validate frustration, position as alternative, use it as momentum toward switching",
    },
    expectedOutcome: "Convert frustration into switching urgency",
    timelineExpectation: "3-5 days to comparison call",
    escalationCriteria: [],
    successMetrics: ["Competitive positioning resonates >75%", "Switch consideration >70%"],
  },
  {
    id: "mom-005",
    category: "Momentum Scenarios",
    name: "Urgent Need Expression",
    description:
      "Lead says 'we need this yesterday' — fast-track everything, remove all friction",
    triggerConditions: [
      { signal: "last_message_sent", operator: "contains", value: "urgent", weight: 0.95 },
      { signal: "engagement_score", operator: "greater_than", value: 75, weight: 0.8 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Show you can move fast",
        template:
          "Urgency is music to my ears. What if we could be live in [shorter timeline]? Let me show you how.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "schedule_call",
        description: "Emergency acceleration call",
        template: "Let's jump on a call in the next hour and map out an expedited rollout.",
        timing: "immediate",
      },
      {
        sequence: 3,
        type: "facilitate_deal",
        description: "Expedited implementation",
        template:
          "If we start today, we can have you live by [accelerated date]. I'll personally oversee the rollout.",
        timing: "immediate",
      },
    ],
    messagingGuidance: {
      tone: "assertive",
      keyPhrases: ["We can move fast", "Start today", "Live by [date]", "Zero delays"],
      whatToAvoid: ["Telling them it's not possible", "Standard timelines", "Showing hesitation"],
      coreValue: "Match their urgency, compress timelines, show you can execute at speed",
    },
    expectedOutcome: "Expedited contract, accelerated implementation",
    timelineExpectation: "Same day to contract, days to implementation",
    escalationCriteria: [],
    successMetrics: ["Same-day contract >80%", "Implementation starts within 2 days >90%"],
  },
  {
    id: "mom-006",
    category: "Momentum Scenarios",
    name: "Reference Request",
    description: "Lead asks for references — provide relevant ones, facilitate quickly",
    triggerConditions: [
      { signal: "last_message_sent", operator: "contains", value: "reference", weight: 0.95 },
      { signal: "engagement_score", operator: "greater_than", value: 70, weight: 0.8 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Provide relevant references immediately",
        template:
          "Absolutely! I'm sending over [3-4] references with similar use cases. [Reference 1] is probably most relevant to your situation.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "send_email",
        description: "Reference details with context",
        template:
          "Here are our references. I've included why each is relevant to you. Happy to facilitate intros.",
        timing: "immediate",
      },
      {
        sequence: 3,
        type: "schedule_call",
        description: "Offer to facilitate reference calls",
        template:
          "Want me to connect you directly with [Reference]? I can set up a call and let you two talk directly.",
        timing: "immediate",
      },
    ],
    messagingGuidance: {
      tone: "helpful",
      keyPhrases: [
        "Here are our best references",
        "Most relevant to your situation",
        "Happy to facilitate",
      ],
      whatToAvoid: [
        "Weak references",
        "Delayed response",
        "Not offering to facilitate",
      ],
      coreValue: "Move fast with social proof — remove friction from due diligence",
    },
    expectedOutcome: "Reference calls completed, objections resolved",
    timelineExpectation: "2-3 days to reference call",
    escalationCriteria: [],
    successMetrics: ["Reference call scheduled >90%", "Reference conversion >75%"],
  },
  {
    id: "mom-007",
    category: "Momentum Scenarios",
    name: "Internal Timeline Shared",
    description: "Lead shares internal timeline/urgency — align your process to their dates",
    triggerConditions: [
      { signal: "timeline_shared", operator: "equals", value: true, weight: 0.95 },
      { signal: "engagement_score", operator: "greater_than", value: 70, weight: 0.8 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Confirm and map your timeline to theirs",
        template:
          "Perfect, so you need this live by [their date]. Here's exactly how we'll sequence to hit that deadline.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "send_email",
        description: "Detailed reverse-engineered timeline",
        template:
          "Reverse-planning from your go-live date: Contract by [X], implementation starts [Y], live by [their date].",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "schedule_call",
        description: "Lock in dates and dependencies",
        template: "Let's confirm the exact dates and make sure we have everything lined up.",
        timing: "within_3_days",
      },
    ],
    messagingGuidance: {
      tone: "organized",
      keyPhrases: [
        "Here's our timeline to hit your date",
        "Reverse-planning to",
        "We own that deadline",
      ],
      whatToAvoid: ["Generic timelines", "Saying their deadline is tight", "Vague sequencing"],
      coreValue: "Show you understand their constraints and can execute to their timeline",
    },
    expectedOutcome: "Clear path to their deadline, all parties aligned",
    timelineExpectation: "3-5 days to timeline lock",
    escalationCriteria: [],
    successMetrics: ["Timeline accepted >95%", "Contract signed by agreed date >90%"],
  },
  {
    id: "mom-008",
    category: "Momentum Scenarios",
    name: "Contract Term Negotiations",
    description: "Lead asks about contract terms — close is near, be flexible",
    triggerConditions: [
      { signal: "last_message_sent", operator: "contains", value: "contract", weight: 0.9 },
      { signal: "engagement_score", operator: "greater_than", value: 75, weight: 0.8 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Show flexibility, move to contract",
        template:
          "Great — we're almost there. Let's talk contract terms. We're flexible on [term length, payment schedule, etc].",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "send_email",
        description: "Contract options",
        template:
          "Here are our standard contract options. We're also happy to customize based on your needs.",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "facilitate_deal",
        description: "Offer creative solutions",
        template:
          "If [standard term] doesn't work, we can do [alternative]. Just want to get you across the finish line.",
        timing: "same_day",
      },
    ],
    messagingGuidance: {
      tone: "flexible",
      keyPhrases: [
        "We're close",
        "We're flexible on",
        "Let's find terms that work",
        "Almost there",
      ],
      whatToAvoid: [
        "Being rigid on terms",
        "Making them feel nickeled and dimed",
        "Delaying contract",
      ],
      coreValue: "They're ready to buy — be flexible on non-core terms, seal the deal",
    },
    expectedOutcome: "Contract negotiated, deal closed",
    timelineExpectation: "3-5 days to signed contract",
    escalationCriteria: [],
    successMetrics: ["Contract signed within 5 days >85%"],
  },
  {
    id: "mom-009",
    category: "Momentum Scenarios",
    name: "Repeated Content Downloads",
    description: "Lead downloads content repeatedly — nurture interest, offer personalized walkthrough",
    triggerConditions: [
      { signal: "total_touchpoints", operator: "greater_than", value: 3, weight: 0.8 },
      { signal: "engagement_score", operator: "greater_than", value: 65, weight: 0.8 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Notice pattern, offer deeper conversation",
        template:
          "I notice you've been digging into our resources. What questions can I answer? Happy to do a personalized walkthrough.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "schedule_call",
        description: "Personalized walkthrough call",
        template:
          "Let me show you how this works with your specific use case. 20 minutes, and I think you'll see the value immediately.",
        timing: "within_3_days",
      },
    ],
    messagingGuidance: {
      tone: "observant",
      keyPhrases: [
        "I notice you've been",
        "What questions can I answer?",
        "Personalized walkthrough",
      ],
      whatToAvoid: ["Being creepy about tracking", "Pushy follow-up", "Generic pitch"],
      coreValue: "Show you're paying attention, offer deeper engagement without pressure",
    },
    expectedOutcome: "Move from self-serve exploration to personalized conversation",
    timelineExpectation: "3-5 days to call",
    escalationCriteria: [],
    successMetrics: ["Walkthrough offered >80%", "Call booked >60%"],
  },
  {
    id: "mom-010",
    category: "Momentum Scenarios",
    name: "Multi-Stakeholder Alignment",
    description: "Multiple stakeholders engaged — ensure all needs are addressed",
    triggerConditions: [
      { signal: "total_touchpoints", operator: "greater_than", value: 5, weight: 0.7 },
      { signal: "engagement_score", operator: "greater_than", value: 70, weight: 0.8 },
      { signal: "decision_maker_engaged", operator: "equals", value: true, weight: 0.8 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Acknowledge multiple stakeholders, tailor messaging",
        template:
          "I want to make sure I'm addressing [Executive's] priorities as well as [Operator's]. Let's spend time on each.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "schedule_call",
        description: "Multi-stakeholder meeting",
        template:
          "Let's get everyone together — I'll address ROI for [Executive], implementation ease for [Operator], etc.",
        timing: "within_3_days",
      },
    ],
    messagingGuidance: {
      tone: "organized",
      keyPhrases: [
        "Address each stakeholder's priorities",
        "Make sure everyone's needs are met",
        "Let's align all parties",
      ],
      whatToAvoid: [
        "Treating stakeholders the same",
        "Missing someone's priorities",
        "One-size-fits-all pitch",
      ],
      coreValue:
        "Show you understand multiple stakeholder needs, customize approach, move all parties toward yes",
    },
    expectedOutcome: "All stakeholders aligned, unified yes",
    timelineExpectation: "5-7 days to alignment",
    escalationCriteria: [],
    successMetrics: [
      "All stakeholder needs identified >95%",
      "Alignment meeting >90%",
      "Contract signed <14 days >80%",
    ],
  },
];

const DIFFICULT_SITUATIONS: ScenarioPlaybook[] = [
  {
    id: "diff-001",
    category: "Difficult Situations",
    name: "Frustrated/Angry Lead",
    description: "Lead is frustrated or angry — listen first, empathize, solve don't sell",
    triggerConditions: [
      { signal: "last_outcome", operator: "equals", value: "complaint", weight: 0.95 },
      { signal: "engagement_score", operator: "less_than", value: 20, weight: 0.8 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Listen and empathize fully",
        template:
          "I hear your frustration. Talk me through what happened — I want to understand your side completely.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "send_message",
        description: "Own the problem, commit to solution",
        template: "That's not acceptable. Here's what I'm doing to fix this.",
        timing: "immediate",
      },
      {
        sequence: 3,
        type: "schedule_call",
        description: "Personal resolution call",
        template: "Let's talk through the solution. I'm personally overseeing this.",
        timing: "immediate",
      },
    ],
    messagingGuidance: {
      tone: "empathetic",
      keyPhrases: [
        "I understand your frustration",
        "That's not acceptable",
        "Here's what I'm doing to fix it",
        "Personally overseeing this",
      ],
      whatToAvoid: ["Defending the company", "Making excuses", "Not acknowledging the problem"],
      coreValue: "Lead with empathy and ownership — they need to know someone cares and will fix it",
    },
    expectedOutcome: "Frustration redirected into problem-solving",
    timelineExpectation: "Same day to resolution plan",
    escalationCriteria: [{ signal: "continued_hostility", action: "escalate_to_human", timeToEscalate: 3600 }],
    successMetrics: [
      "Problem acknowledged same day >95%",
      "Solution plan within 24 hours >90%",
    ],
  },
  {
    id: "diff-002",
    category: "Difficult Situations",
    name: "Broken Promise Recovery",
    description:
      "We promised something we can't deliver — honest correction, alternative solution",
    triggerConditions: [
      { signal: "last_outcome", operator: "equals", value: "complaint", weight: 0.95 },
      { signal: "engagement_score", operator: "less_than", value: 15, weight: 0.8 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Own the mistake completely",
        template:
          "I need to be honest with you — we promised [X] and we can't deliver it in the timeline we said. That's on us.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "send_message",
        description: "Offer alternative + compensation",
        template:
          "Here's what we can do instead [alternative]. And we're [compensating] for missing on our original promise.",
        timing: "immediate",
      },
      {
        sequence: 3,
        type: "facilitate_deal",
        description: "Make it right with actions, not words",
        template: "What would actually make this right for you? Let me make it happen.",
        timing: "same_day",
      },
    ],
    messagingGuidance: {
      tone: "humble",
      keyPhrases: [
        "We dropped the ball",
        "That's on us",
        "Here's how we're making it right",
        "What would help?",
      ],
      whatToAvoid: [
        "Making excuses",
        "Shifting blame",
        "Over-promising again",
        "Half measures",
      ],
      coreValue: "Honest accountability with action — restore trust through tangible fixes, not words",
    },
    expectedOutcome: "Breach converted to retention through honest fixes",
    timelineExpectation: "24 hours to concrete solution",
    escalationCriteria: [{ signal: "still_unresolved", action: "escalate_to_human", timeToEscalate: 86400 }],
    successMetrics: [
      "Honest acknowledgment same day >95%",
      "Alternative solution accepted >70%",
      "Retention after broken promise >60%",
    ],
  },
  {
    id: "diff-003",
    category: "Difficult Situations",
    name: "Bug/Issue During Trial",
    description:
      "Lead experienced bug/issue during trial — immediate fix, escalation, apology, wow recovery",
    triggerConditions: [
      { signal: "last_outcome", operator: "equals", value: "technical_issue", weight: 0.95 },
      { signal: "engagement_score", operator: "less_than", value: 25, weight: 0.8 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "escalate",
        description: "Immediately escalate to engineering + support",
        template:
          "I've escalated this to our engineering team as priority one. [Engineer] will be reaching out in the next hour.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "send_message",
        description: "Personal accountability statement",
        template: "I'm personally overseeing the fix. We'll have this resolved by [specific time].",
        timing: "immediate",
      },
      {
        sequence: 3,
        type: "send_message",
        description: "Over-deliver on recovery (wow them back)",
        template:
          "We fixed it [faster than expected]. Plus, I'm adding [bonus feature] to your account as an apology.",
        timing: "within_6_hours",
      },
    ],
    messagingGuidance: {
      tone: "urgent",
      keyPhrases: [
        "Priority one",
        "Personally overseeing",
        "Fixed faster than expected",
        "Bonus added",
      ],
      whatToAvoid: [
        "Downplaying the bug",
        "Slow response",
        "Generic apology",
        "No follow-up",
      ],
      coreValue: "Fast response + over-delivery on recovery = transform negative into loyalty moment",
    },
    expectedOutcome: "Bug fixed, trust restored, lead impressed by response",
    timelineExpectation: "6 hours to resolution + wow recovery",
    escalationCriteria: [{ signal: "bug_still_not_fixed", action: "escalate_to_human", timeToEscalate: 3600 }],
    successMetrics: [
      "Acknowledged within 1 hour >95%",
      "Fixed within 6 hours >90%",
      "Retention after bug >80%",
    ],
  },
  {
    id: "diff-004",
    category: "Difficult Situations",
    name: "Unfavorable Comparison",
    description: "Lead comparing us unfavorably — acknowledge honestly, highlight unique strengths",
    triggerConditions: [
      { signal: "competitor_mentioned", operator: "exists", value: true, weight: 0.9 },
      { signal: "engagement_score", operator: "less_than", value: 50, weight: 0.7 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Don't argue — validate their observation",
        template:
          "[Competitor] is strong in [area]. We're not trying to beat them on that. Here's where we uniquely win.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "provide_proof",
        description: "Show unique strengths with evidence",
        template: "Our unique advantage is [X]. Look at how [Customer Y] leveraged this.",
        timing: "same_day",
      },
    ],
    messagingGuidance: {
      tone: "honest",
      keyPhrases: [
        "We're not trying to beat them on",
        "Here's where we uniquely win",
        "Our unfair advantage is",
      ],
      whatToAvoid: [
        "Trash-talking competitor",
        "Overselling against comparison",
        "Being defensive",
      ],
      coreValue: "Acknowledge competitor strengths, position your unique value, win on differentiation",
    },
    expectedOutcome: "Shift from comparison to differentiation",
    timelineExpectation: "3-5 days to decision",
    escalationCriteria: [],
    successMetrics: ["Unique value resonates >70%", "Reconsideration >50%"],
  },
  {
    id: "diff-005",
    category: "Difficult Situations",
    name: "Unrealistic Expectations Management",
    description: "Lead has unrealistic expectations — manage gently, underpromise/overdeliver",
    triggerConditions: [
      { signal: "last_message_sent", operator: "contains", value: "expect", weight: 0.8 },
      { signal: "engagement_score", operator: "greater_than", value: 60, weight: 0.7 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Validate aspiration, be honest about limits",
        template:
          "I love your ambition here. Let me be honest about what's realistic in [timeframe] vs what would take longer.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "send_email",
        description: "Detailed reality check with phases",
        template:
          "Here's phase 1 [realistic], phase 2 [follow-up], phase 3 [longer-term vision]. This sets you up for success.",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "schedule_call",
        description: "Confirm realistic path",
        template:
          "Let's agree on this phased approach. This way you win early and scale from success.",
        timing: "within_3_days",
      },
    ],
    messagingGuidance: {
      tone: "honest",
      keyPhrases: [
        "Let me be realistic",
        "Here's phase 1",
        "Then we scale",
        "Set you up for success",
      ],
      whatToAvoid: [
        "Crushing their vision",
        "Over-promising and under-delivering",
        "Being patronizing",
      ],
      coreValue:
        "Manage expectations gently with phased approach — win early and expand from success",
    },
    expectedOutcome: "Realistic expectations + phased path to vision",
    timelineExpectation: "5-7 days to phased plan agreement",
    escalationCriteria: [{ signal: "unrealistic_demand_persists", action: "schedule_followup", timeToEscalate: 604800 }],
    successMetrics: ["Realistic plan accepted >75%", "Phase 1 success >80%"],
  },
  {
    id: "diff-006",
    category: "Difficult Situations",
    name: "Non-Responsive Across Channels",
    description: "Lead non-responsive to all channels — creative touch to break through",
    triggerConditions: [
      { signal: "days_since_last_contact", operator: "greater_than", value: 14, weight: 0.8 },
      { signal: "total_touchpoints", operator: "greater_than", value: 5, weight: 0.7 },
      { signal: "engagement_score", operator: "less_than", value: 20, weight: 0.8 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Acknowledge silence, ask directly",
        template:
          "Hey [Name], I know I've been reaching out a lot. Are you still interested? Honest feedback helps me.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "pause",
        description: "Wait for response, then try creative touch",
        template: "Give 3 days for response",
        timing: "within_3_days",
      },
      {
        sequence: 3,
        type: "send_message",
        description: "Creative re-engagement (video, handwritten note, LinkedIn)",
        template: "Sending you a quick video message instead.",
        timing: "within_week",
      },
    ],
    messagingGuidance: {
      tone: "honest",
      keyPhrases: [
        "Know I've been reaching out a lot",
        "Still interested?",
        "Honest feedback",
        "Trying something different",
      ],
      whatToAvoid: [
        "Aggressive persistence",
        "Guilt-tripping",
        "Giving up",
        "Generic follow-ups",
      ],
      coreValue:
        "Acknowledge the pattern, ask directly, try creative approach — break through noise with humanity",
    },
    expectedOutcome: "Break silence through directness or creativity",
    timelineExpectation: "7-10 days to response or decision to move on",
    escalationCriteria: [{ signal: "no_response_after_creative_touch", action: "pause_execution", timeToEscalate: 1209600 }],
    successMetrics: [
      "Direct ask response rate >35%",
      "Creative touch engagement >40%",
    ],
  },
  {
    id: "diff-007",
    category: "Difficult Situations",
    name: "Fake Contact Info Recovery",
    description: "Lead gave fake info — clean record, try alternate means respectfully",
    triggerConditions: [
      { signal: "last_outcome", operator: "equals", value: "wrong_number", weight: 0.9 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Acknowledge without accusation",
        template:
          "Hey [Name], the contact info we have isn't connecting. Can you send me your current number/email?",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "schedule_call",
        description: "Try LinkedIn or alternative channels",
        template: "I'll try reaching out through LinkedIn — easier sometimes.",
        timing: "within_3_days",
      },
      {
        sequence: 3,
        type: "pause",
        description: "If still no response, mark as invalid",
        template: "Clean record, move to invalid",
        timing: "within_7_days",
      },
    ],
    messagingGuidance: {
      tone: "diplomatic",
      keyPhrases: [
        "Contact info isn't connecting",
        "Can you send me your current",
        "Trying alternate channels",
      ],
      whatToAvoid: [
        "Accusing them of lying",
        "Aggressive follow-up",
        "Public calling out",
      ],
      coreValue:
        "Handle gracefully without accusation — preserve dignity, try alternatives, know when to move on",
    },
    expectedOutcome: "Either get correct info or move to invalid list",
    timelineExpectation: "7-10 days to resolution",
    escalationCriteria: [],
    successMetrics: [
      "Correct info obtained >30%",
      "Invalid leads marked >95%",
    ],
  },
  {
    id: "diff-008",
    category: "Difficult Situations",
    name: "Previous Churn Re-engagement",
    description: "Lead churned previously — understand why, show what's changed, extra care",
    triggerConditions: [
      { signal: "is_returning_customer", operator: "equals", value: true, weight: 0.95 },
      { signal: "churn_reason", operator: "exists", value: true, weight: 0.9 },
      { signal: "engagement_score", operator: "less_than", value: 40, weight: 0.7 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Own previous issue, ask what changed",
        template:
          "I know things didn't work out before because of [churn reason]. What's different now that you're reaching back out?",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "send_message",
        description: "Show concrete improvements",
        template:
          "Since you left, we've [specific improvements to address their churn reason]. Want to see the difference?",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "schedule_call",
        description: "Relationship rebuilding call",
        template:
          "Let's spend time understanding what we need to do differently this time. I want to make sure we get it right.",
        timing: "within_3_days",
      },
    ],
    messagingGuidance: {
      tone: "humble",
      keyPhrases: [
        "I know things didn't work out",
        "We've specifically improved",
        "Get it right this time",
        "What would make a difference?",
      ],
      whatToAvoid: [
        "Dismissing their churn",
        "Acting like nothing was wrong",
        "Over-selling improvements without proof",
      ],
      coreValue: "Show accountability for why they left, provide proof of change, earn back trust",
    },
    expectedOutcome: "Rebuild trust, move to new contract with right expectations",
    timelineExpectation: "7-10 days to decision",
    escalationCriteria: [{ signal: "still_burned", action: "pause_execution", timeToEscalate: 1209600 }],
    successMetrics: [
      "Churn reason understood >95%",
      "Improvement shown >80%",
      "Re-contract >50%",
    ],
  },
  {
    id: "diff-009",
    category: "Difficult Situations",
    name: "Competitor Sales War Simultaneously",
    description:
      "Lead talking to competitor's sales team at same time — speed + differentiation to win",
    triggerConditions: [
      { signal: "competitor_mentioned", operator: "exists", value: true, weight: 0.95 },
      { signal: "engagement_score", operator: "greater_than", value: 65, weight: 0.7 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Acknowledge they're evaluating, own the competition",
        template:
          "I know you're probably talking to [Competitor] too. That's smart. Here's why I think we're the better choice.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "send_email",
        description: "Compressed competitive comparison",
        template:
          "Here's a direct comparison on the criteria that matter most. [Our advantages] vs [their limitations].",
        timing: "immediate",
      },
      {
        sequence: 3,
        type: "schedule_call",
        description: "Acceleration call to lock in timeline",
        template:
          "Let's move faster than the process with [Competitor]. I can have a contract to you by tomorrow. What does fast look like to you?",
        timing: "immediate",
      },
    ],
    messagingGuidance: {
      tone: "assertive",
      keyPhrases: [
        "I know you're evaluating them",
        "Here's why we're better",
        "Move faster than their process",
        "Lock this in today",
      ],
      whatToAvoid: [
        "Being nervous about competition",
        "Bad-mouthing competitor",
        "Slow follow-up",
      ],
      coreValue: "Speed to contract + clear differentiation = win competitive deals by moving fast",
    },
    expectedOutcome: "Win competitive deal through speed + differentiation",
    timelineExpectation: "2-3 days to contract",
    escalationCriteria: [],
    successMetrics: [
      "Competitive comparison resonates >80%",
      "Contract signed before competitor >70%",
    ],
  },
  {
    id: "diff-010",
    category: "Difficult Situations",
    name: "Payment or Financial Dispute",
    description: "Lead has billing/payment issue — resolve quickly, preserve relationship",
    triggerConditions: [
      { signal: "last_outcome", operator: "equals", value: "payment_failed", weight: 0.9 },
      { signal: "engagement_score", operator: "less_than", value: 30, weight: 0.7 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Apologize for friction, take ownership",
        template:
          "I apologize for the billing confusion. Let me clear this up immediately. What's the issue on your end?",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "send_message",
        description: "Quick resolution",
        template:
          "Here's what I'm doing: [specific fix]. It should be resolved by [specific time].",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "send_email",
        description: "Goodwill gesture",
        template:
          "I've credited your account [amount] for the inconvenience. We appreciate your patience.",
        timing: "within_24_hours",
      },
    ],
    messagingGuidance: {
      tone: "apologetic",
      keyPhrases: [
        "Apologize for friction",
        "Let me resolve this",
        "What's the issue?",
        "Credited your account",
      ],
      whatToAvoid: [
        "Being defensive",
        "Blaming systems",
        "Delaying resolution",
        "Minimal gestures",
      ],
      coreValue: "Quick ownership + concrete resolution + goodwill = preserve relationship through friction",
    },
    expectedOutcome: "Billing issue resolved, relationship preserved",
    timelineExpectation: "24 hours to resolution",
    escalationCriteria: [{ signal: "customer_wants_refund", action: "escalate_to_human", timeToEscalate: 3600 }],
    successMetrics: [
      "Same-day acknowledgment >95%",
      "Resolved within 24 hours >90%",
      "Retention after dispute >75%",
    ],
  },
];

const CLOSING_SCENARIOS: ScenarioPlaybook[] = [
  {
    id: "close-001",
    category: "Closing Scenarios",
    name: "Contract Requested - Move Fast",
    description: "Decision maker says 'send me the contract' — don't delay, prepare everything",
    triggerConditions: [
      { signal: "last_message_sent", operator: "contains", value: "contract", weight: 0.95 },
      { signal: "engagement_score", operator: "greater_than", value: 80, weight: 0.9 },
      { signal: "decision_maker_engaged", operator: "equals", value: true, weight: 0.9 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_email",
        description: "Send contract same day with pre-filled details",
        template:
          "Here's the contract with your details pre-filled. Everything's ready for signature. Any questions before you sign?",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "send_message",
        description: "Confirm receipt and next steps",
        template:
          "Just sent it. Can you confirm you received it? And let me know if there's anything blocking signature.",
        timing: "immediate",
      },
      {
        sequence: 3,
        type: "schedule_call",
        description: "Follow-up call to unblock signature",
        template:
          "Got 15 minutes today to jump on a call and answer any last questions?",
        timing: "same_day",
      },
    ],
    messagingGuidance: {
      tone: "assertive",
      keyPhrases: [
        "Here's your contract",
        "Ready to sign",
        "Let me unblock this",
        "Questions before signature",
      ],
      whatToAvoid: [
        "Delays in sending",
        "Missing information",
        "Not being available to unblock",
      ],
      coreValue:
        "When they say contract, move at light speed — momentum kills deals, so respond immediately",
    },
    expectedOutcome: "Contract signed same day or next business day",
    timelineExpectation: "Same day to signed",
    escalationCriteria: [],
    successMetrics: ["Signed within 24 hours >80%"],
  },
  {
    id: "close-002",
    category: "Closing Scenarios",
    name: "Verbal Yes But Won't Sign",
    description: "They say yes verbally but signature stalls — identify blocker, make signing easy",
    triggerConditions: [
      { signal: "engagement_score", operator: "greater_than", value: 85, weight: 0.9 },
      { signal: "contract_sent", operator: "equals", value: true, weight: 0.95 },
      { signal: "contract_signed", operator: "equals", value: false, weight: 0.8 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Ask directly what's blocking signature",
        template:
          "You mentioned yes, but I notice the contract isn't signed yet. What's in the way? Legal review? Budget approval?",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "facilitate_deal",
        description: "Remove the specific blocker",
        template:
          "If it's [legal concern], I can get our legal team to address that. What's the actual question?",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "send_message",
        description: "Make signing dead easy",
        template:
          "I can send you a link where you just click and sign in 30 seconds. Want me to do that?",
        timing: "same_day",
      },
    ],
    messagingGuidance: {
      tone: "curious",
      keyPhrases: [
        "What's in the way?",
        "What's the real blocker?",
        "Make this easy",
        "One click to sign",
      ],
      whatToAvoid: [
        "Being pushy",
        "Assuming you know the blocker",
        "Making signature complicated",
      ],
      coreValue: "Verbal yes means they want to buy — find the real blocker and remove it",
    },
    expectedOutcome: "Identify blocker, clear it, get signature",
    timelineExpectation: "2-3 days from verbal yes to signed",
    escalationCriteria: [{ signal: "blocker_unresolvable", action: "escalate_to_human", timeToEscalate: 604800 }],
    successMetrics: [
      "Blocker identified same day >90%",
      "Blocker removed within 2 days >80%",
    ],
  },
  {
    id: "close-003",
    category: "Closing Scenarios",
    name: "Discount Negotiation",
    description: "Lead asks for discount — value-based negotiation, bundle value, don't just cut",
    triggerConditions: [
      { signal: "last_message_sent", operator: "contains", value: "discount", weight: 0.9 },
      { signal: "engagement_score", operator: "greater_than", value: 75, weight: 0.8 },
      { signal: "contract_sent", operator: "equals", value: true, weight: 0.8 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Don't just cut price — understand what they need",
        template:
          "I get it — budget is tight. Before I talk discount, what would it take for you to feel like this investment is right?",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "provide_proof",
        description: "Show alternative value bundles",
        template:
          "Rather than cut price, what if we bundled in [service]? That's the same value at full price. Sound better?",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "facilitate_deal",
        description: "Offer value-based discount if needed",
        template:
          "If we move to an annual contract instead of monthly, we can do [X% discount]. That works for both of us.",
        timing: "same_day",
      },
    ],
    messagingGuidance: {
      tone: "collaborative",
      keyPhrases: [
        "What would make this right?",
        "Bundle value instead",
        "Annual discount",
        "Both of us win",
      ],
      whatToAvoid: [
        "Instant price cuts",
        "Lowballing yourself",
        "Making them feel like you're losing money",
      ],
      coreValue:
        "Never negotiate on price alone — negotiate on value, terms, or bundled services",
    },
    expectedOutcome: "Deal at better terms than raw discount",
    timelineExpectation: "2-3 days to negotiated deal",
    escalationCriteria: [],
    successMetrics: [
      "Value bundle accepted >70%",
      "Annual contract closed >60%",
      "Signed within 5 days >75%",
    ],
  },
  {
    id: "close-004",
    category: "Closing Scenarios",
    name: "Extended Trial to Paid Conversion",
    description: "Lead wants extended trial — set success criteria, convert with guarantee",
    triggerConditions: [
      { signal: "engagement_score", operator: "greater_than", value: 70, weight: 0.8 },
      { signal: "demo_completed", operator: "equals", value: true, weight: 0.9 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Agree to trial with clear success metrics",
        template:
          "Happy to extend the trial. Let's define success together — if you see [metric X], you commit to paid?",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "send_email",
        description: "Clear trial success metrics",
        template:
          "Here's what success looks like in your trial. If we hit these, you move to paid. Fair?",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "facilitate_deal",
        description: "Offer guarantee on extended trial",
        template:
          "Let's do 4 weeks extended. If you don't see the impact, you walk away free. No risk.",
        timing: "same_day",
      },
    ],
    messagingGuidance: {
      tone: "confident",
      keyPhrases: [
        "Let's define success",
        "If you see this, you commit to paid",
        "No-risk guarantee",
        "You're going to love it",
      ],
      whatToAvoid: [
        "Open-ended trials",
        "No commitment to paid",
        "Sounding unsure about value",
      ],
      coreValue:
        "Trials convert when metrics are clear and both sides know the conversion trigger",
    },
    expectedOutcome: "Extended trial with commitment trigger, conversion",
    timelineExpectation: "30 days to paid conversion",
    escalationCriteria: [{ signal: "trial_flops", action: "schedule_followup", timeToEscalate: 2592000 }],
    successMetrics: [
      "Success metrics agreed >90%",
      "Extended trial started >95%",
      "Trial to paid conversion >70%",
    ],
  },
  {
    id: "close-005",
    category: "Closing Scenarios",
    name: "Multiple Decision Makers Alignment",
    description: "Multiple decision makers disagree — facilitate alignment, find common ground",
    triggerConditions: [
      { signal: "engagement_score", operator: "greater_than", value: 75, weight: 0.8 },
      { signal: "decision_maker_engaged", operator: "equals", value: true, weight: 0.9 },
      { signal: "total_touchpoints", operator: "greater_than", value: 6, weight: 0.7 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Acknowledge different needs, offer unified call",
        template:
          "I know [Executive] cares about ROI and [Operator] cares about ease of use. Let me address both on a call.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "schedule_call",
        description: "Multi-stakeholder alignment call",
        template:
          "Let's spend 30 min and I'll make sure we address both priorities. Happy to split time if helpful.",
        timing: "within_3_days",
      },
      {
        sequence: 3,
        type: "send_email",
        description: "Tailored materials for each stakeholder",
        template:
          "Here's the ROI brief for [Executive] and the user guide for [Operator]. Both on one page.",
        timing: "same_day",
      },
    ],
    messagingGuidance: {
      tone: "organized",
      keyPhrases: [
        "Address both priorities",
        "Common ground",
        "Tailored to your concern",
        "We can do all three things",
      ],
      whatToAvoid: [
        "Taking sides",
        "Making trade-offs sound negative",
        "Giving in to one stakeholder to appease another",
      ],
      coreValue: "Show you understand all needs, prove solution addresses all concerns, build consensus",
    },
    expectedOutcome: "All stakeholders aligned on yes, contract signed",
    timelineExpectation: "5-7 days from alignment call to signature",
    escalationCriteria: [],
    successMetrics: [
      "All needs identified >95%",
      "Alignment call scheduled >90%",
      "Signed within 7 days >80%",
    ],
  },
  {
    id: "close-006",
    category: "Closing Scenarios",
    name: "Procurement Process Support",
    description:
      "Lead ready to buy but procurement process blocking — support through, provide docs",
    triggerConditions: [
      { signal: "engagement_score", operator: "greater_than", value: 80, weight: 0.8 },
      { signal: "contract_sent", operator: "equals", value: true, weight: 0.8 },
      { signal: "last_message_sent", operator: "contains", value: "procurement", weight: 0.9 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Ask what procurement needs",
        template:
          "What does your procurement team need from us? Security review? References? Insurance cert? Let me get everything.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "send_email",
        description: "Prepare all standard docs",
        template:
          "Here's everything your procurement team typically needs: SOC 2 cert, insurance, references, standard terms.",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "facilitate_deal",
        description: "Be available to talk to procurement",
        template:
          "If they have questions, I'm happy to jump on a call with them. I can address any concerns directly.",
        timing: "same_day",
      },
    ],
    messagingGuidance: {
      tone: "supportive",
      keyPhrases: [
        "What does procurement need?",
        "I'll get everything ready",
        "Available for their questions",
      ],
      whatToAvoid: [
        "Making procurement feel slow",
        "Incomplete documentation",
        "Not being available to answer questions",
      ],
      coreValue:
        "Remove procurement friction by providing everything upfront and being available for questions",
    },
    expectedOutcome: "Procurement approved, deal moves to signature",
    timelineExpectation: "5-10 days through procurement",
    escalationCriteria: [{ signal: "procurement_blocking_indefinitely", action: "escalate_to_human", timeToEscalate: 604800 }],
    successMetrics: [
      "Docs provided same day >95%",
      "Procurement approval within 10 days >80%",
    ],
  },
  {
    id: "close-007",
    category: "Closing Scenarios",
    name: "Seasonal Budget Timing",
    description: "Lead ready but waiting for fiscal calendar — align with their budget cycle",
    triggerConditions: [
      { signal: "engagement_score", operator: "greater_than", value: 75, weight: 0.8 },
      { signal: "budget_confirmed", operator: "equals", value: false, weight: 0.8 },
      { signal: "timeline_shared", operator: "equals", value: true, weight: 0.8 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Acknowledge budget timing, align your process",
        template:
          "I understand you need this approved in your [Q2] budget cycle. Let's make sure we time everything to fit that.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "send_email",
        description: "Budget planning document",
        template:
          "Here's how we'd sequence the deal to fit your [Q2] budgeting process: proposal by [X date], approval by [Y date].",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "schedule_call",
        description: "Lock in budget timeline",
        template:
          "Let's confirm the exact dates and make sure we hit your budget window.",
        timing: "within_3_days",
      },
    ],
    messagingGuidance: {
      tone: "organized",
      keyPhrases: [
        "Fit your budget cycle",
        "Reverse-plan from your date",
        "Hit your deadline",
        "Work within your process",
      ],
      whatToAvoid: [
        "Pressure on budget timing",
        "Vague timeline",
        "Making them feel rushed",
      ],
      coreValue:
        "Show you understand their fiscal calendar, reverse-plan to hit their approval window, remove timing risk",
    },
    expectedOutcome: "Deal closes within budget cycle",
    timelineExpectation: "Next budget cycle, signed before allocation runs out",
    escalationCriteria: [],
    successMetrics: [
      "Budget timeline locked >90%",
      "Signature within budget cycle >85%",
    ],
  },
  {
    id: "close-008",
    category: "Closing Scenarios",
    name: "Start Small Expansion Path",
    description: "Lead wants to start small — agree, but map clear expansion path",
    triggerConditions: [
      { signal: "engagement_score", operator: "greater_than", value: 70, weight: 0.8 },
      { signal: "contract_sent", operator: "equals", value: true, weight: 0.8 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Validate cautious approach, map expansion",
        template:
          "Smart — start small and prove value. Here's how we'll expand: pilot [scope], then move to [scope 2], then [scope 3].",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "send_email",
        description: "Expansion roadmap",
        template:
          "Here's the exact expansion path: Month 1 [pilot], Month 3 [expand], Month 6 [full scale]. Each step unlocks value.",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "send_message",
        description: "Lock in pilot terms",
        template:
          "Let's do the pilot, prove value, then expand. Fair deal? And the expansion pricing is locked in upfront.",
        timing: "same_day",
      },
    ],
    messagingGuidance: {
      tone: "collaborative",
      keyPhrases: [
        "Start small, prove value, expand",
        "Clear expansion path",
        "Locked-in pricing for expansions",
        "Low risk to start",
      ],
      whatToAvoid: [
        "Pressuring them to buy full scope",
        "Vague expansion plan",
        "Changing pricing at expansion",
      ],
      coreValue:
        "Respect their caution, remove pilot risk, lock in expansion — use pilot success to expand",
    },
    expectedOutcome: "Pilot contract, clear expansion path, full scope within 12 months",
    timelineExpectation: "Pilot 30 days, expand monthly",
    escalationCriteria: [],
    successMetrics: [
      "Pilot contract signed >95%",
      "Expansion within 3 months >80%",
      "Full scope within 12 months >70%",
    ],
  },
  {
    id: "close-009",
    category: "Closing Scenarios",
    name: "Competitor Lower Price Pushback",
    description: "Competitor offered lower price — compete on value not price, TCO focus",
    triggerConditions: [
      { signal: "competitor_mentioned", operator: "exists", value: true, weight: 0.95 },
      { signal: "last_message_sent", operator: "contains", value: "price", weight: 0.8 },
      { signal: "engagement_score", operator: "greater_than", value: 70, weight: 0.7 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "acknowledge_objection",
        description: "Acknowledge price difference, focus on TCO",
        template:
          "[Competitor] might be cheaper upfront. But let's talk total cost of ownership. Here's what you're actually paying with them vs us.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "provide_proof",
        description: "Share TCO analysis",
        template:
          "Here's the real cost breakdown: their base price is lower, but when you factor in [support, implementation, customization], you're paying more. See the breakdown.",
        timing: "same_day",
      },
      {
        sequence: 3,
        type: "facilitate_deal",
        description: "Show alternative value approach",
        template:
          "I won't cut our price. But here's what we can do [value add]. This is a better use of your budget.",
        timing: "same_day",
      },
    ],
    messagingGuidance: {
      tone: "analytical",
      keyPhrases: [
        "Total cost of ownership",
        "Cheaper upfront, more expensive total",
        "Hidden costs with competitor",
        "Better investment with us",
      ],
      whatToAvoid: [
        "Cutting price to match",
        "Bad-mouthing competitor",
        "Not addressing the price question",
      ],
      coreValue:
        "Never compete on price — compete on TCO and total value delivered",
    },
    expectedOutcome: "Decision shifts from price to value",
    timelineExpectation: "3-5 days to decision",
    escalationCriteria: [],
    successMetrics: [
      "TCO analysis resonates >75%",
      "Wins value-based deals >60%",
    ],
  },
  {
    id: "close-010",
    category: "Closing Scenarios",
    name: "Final Negotiation Stall",
    description: "Deal stalls in final negotiation — creative concessions, urgency levers",
    triggerConditions: [
      { signal: "engagement_score", operator: "greater_than", value: 80, weight: 0.8 },
      { signal: "contract_sent", operator: "equals", value: true, weight: 0.95 },
      { signal: "contract_signed", operator: "equals", value: false, weight: 0.9 },
      { signal: "days_since_last_contact", operator: "greater_than", value: 3, weight: 0.7 },
    ],
    recommendedActions: [
      {
        sequence: 1,
        type: "send_message",
        description: "Ask what's blocking, show urgency",
        template:
          "We're so close. What's blocking signature? Let's solve it today. And to incentivize moving fast, I'm adding [bonus] if we sign by EOD.",
        timing: "immediate",
      },
      {
        sequence: 2,
        type: "facilitate_deal",
        description: "Creative concessions",
        template:
          "If budget is the issue, we can spread payments. If it's terms, we can customize. What would unlock this?",
        timing: "immediate",
      },
      {
        sequence: 3,
        type: "schedule_call",
        description: "Escalation call to close",
        template:
          "Let me jump on a call with [Decision Maker] right now. I want to close this today.",
        timing: "immediate",
      },
    ],
    messagingGuidance: {
      tone: "assertive",
      keyPhrases: [
        "What's blocking?",
        "Let's solve it today",
        "Sign by EOD bonus",
        "Creative solutions available",
      ],
      whatToAvoid: [
        "Accepting endless delays",
        "Not escalating personally",
        "Giving away value without concession",
      ],
      coreValue:
        "Sales close in the final moments — use urgency, creative terms, and personal energy to unlock final yes",
    },
    expectedOutcome: "Signature today or within 24 hours",
    timelineExpectation: "Same day or next business day",
    escalationCriteria: [],
    successMetrics: [
      "Blocker identified and removed same day >85%",
      "Signed within 24 hours >80%",
    ],
  },
];

// ============================================================================
// EXPORTS: Core matching functions
// ============================================================================

const FULL_SCENARIO_LIBRARY: ScenarioPlaybook[] = [
  ...LEAD_REACTIVATION_SCENARIOS,
  ...OBJECTION_SCENARIOS,
  ...MOMENTUM_SCENARIOS,
  ...DIFFICULT_SITUATIONS,
  ...CLOSING_SCENARIOS,
];

export function matchScenario(situation: SalesSituation): ScenarioMatch {
  const matches = FULL_SCENARIO_LIBRARY.map((scenario) => ({
    scenario,
    confidence: calculateConfidence(situation, scenario),
  }))
    .filter((m) => m.confidence > 0.3)
    .sort((a, b) => b.confidence - a.confidence);

  const topMatch = matches[0] || matches[0];

  return {
    matchedScenario: topMatch.scenario,
    confidence: topMatch.confidence,
    recommendedActions: topMatch.scenario.recommendedActions,
    adaptations: generateAdaptations(situation, topMatch.scenario),
    alternativeScenarios: matches.slice(1, 4).map((m) => m.scenario),
  };
}

export function getScenarioResponse(scenarioId: string): ScenarioPlaybook | null {
  return FULL_SCENARIO_LIBRARY.find((s) => s.id === scenarioId) || null;
}

// ============================================================================
// HELPERS
// ============================================================================

function calculateConfidence(situation: SalesSituation, scenario: ScenarioPlaybook): number {
  let confidence = 0;
  let weightsUsed = 0;

  for (const trigger of scenario.triggerConditions) {
    const weight = trigger.weight;
    const matches = evaluateTrigger(situation, trigger);

    if (matches) {
      confidence += weight;
      weightsUsed += weight;
    } else {
      weightsUsed += weight;
    }
  }

  return weightsUsed > 0 ? confidence / weightsUsed : 0;
}

function evaluateTrigger(situation: SalesSituation, trigger: TriggerCondition): boolean {
  const value = (situation as Record<string, unknown>)[trigger.signal];

  switch (trigger.operator) {
    case "equals":
      return value === trigger.value;
    case "greater_than":
      return typeof value === "number" && value > (trigger.value as number);
    case "less_than":
      return typeof value === "number" && value < (trigger.value as number);
    case "contains":
      return typeof value === "string" && value.includes(trigger.value as string);
    case "exists":
      return value !== null && value !== undefined;
    default:
      return false;
  }
}

function generateAdaptations(situation: SalesSituation, scenario: ScenarioPlaybook): string[] {
  const adaptations: string[] = [];

  if (situation.last_outcome === "no_answer") {
    adaptations.push("Lead unresponsive — shorten messages, use video, try different channels");
  }

  if (situation.engagement_score < 30) {
    adaptations.push("Low engagement — lead with value, not sales pitch");
  }

  if (situation.competitor_mentioned) {
    adaptations.push(`Competitor [${situation.competitor_mentioned}] mentioned — emphasize unique advantage`);
  }

  if (!situation.decision_maker_engaged) {
    adaptations.push("Decision maker not yet engaged — prioritize expansion to stakeholder");
  }

  if (situation.last_objection) {
    adaptations.push(`Previous objection [${situation.last_objection}] — address proactively`);
  }

  return adaptations;
}
