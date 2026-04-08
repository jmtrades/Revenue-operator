// AI Auto-Sequence Generator
// Automatically generates optimal multi-step outreach sequences based on lead data and patterns

// ============ TYPE DEFINITIONS ============

export type LeadTemperature = 'hot' | 'warm' | 'cold';
export type ChannelType = 'email' | 'call' | 'sms';
export type WorkspaceGoal = 'appointments' | 'demos' | 'sales';
export type ConditionType = 'responded' | 'opened-not-replied' | 'bounced' | 'objection' | 'no-response';

export interface LeadProfile {
  industry: string;
  score: number; // 0-100
  source: string;
  behavior?: {
    emailOpened?: boolean;
    linkClicked?: boolean;
    replyReceived?: boolean;
    lastTouchDays?: number;
  };
}

export interface ChannelPreferences {
  primary: ChannelType;
  secondary: ChannelType;
  tertiary: ChannelType;
}

export interface SequenceGenerationParams {
  leadProfile: LeadProfile;
  workspaceGoal: WorkspaceGoal;
  channelPreferences: ChannelPreferences;
  urgency: LeadTemperature;
  industry?: string;
  companyName?: string;
  firstName?: string;
}

export interface SequenceStep {
  stepNumber: number;
  channel: ChannelType;
  delayHours: number;
  messageTemplate: string;
  purpose: string;
  successCriteria: string;
  timeWindow?: {
    startHour: number;
    endHour: number;
  };
}

export interface ConditionalBranch {
  condition: ConditionType;
  nextStepNumber: number | null;
  action: string;
  messageTemplate?: string;
}

export interface AutoSequence {
  id: string;
  name: string;
  temperature: LeadTemperature;
  totalSteps: number;
  totalDays: number;
  steps: SequenceStep[];
  goal: WorkspaceGoal;
  industry: string;
  conditionalBranches: Map<number, ConditionalBranch[]>;
  createdAt: Date;
  version: number;
}

export interface SequenceMetrics {
  stepMetrics: {
    stepNumber: number;
    openRate: number;
    clickRate: number;
    responseRate: number;
    conversionRate: number;
  }[];
  totalEngagementRate: number;
  conversionRate: number;
  avgResponseTime: number;
}

// ============ TEMPLATES BY INDUSTRY ============

const INDUSTRY_TEMPLATES: Record<string, Record<ChannelType, string>> = {
  'real-estate': {
    email: 'Hi {firstName},\n\nI noticed {company} might benefit from our property management solutions. We help teams like yours close deals 40% faster.\n\nWould you be open to a 15-min call?\n\nBest,\n[Your Name]',
    call: 'Hi {firstName}, this is [Your Name] from [Your Company]. I work with {industry} professionals in your area. Got 30 seconds?',
    sms: '{firstName}, we help {company} close deals 40% faster. Free strategy session? Reply YES'
  },
  'healthcare': {
    email: 'Hi {firstName},\n\nOur platform has helped {industry} practices like {company} reduce admin time by 50%.\n\nCurious to learn more?\n\nBest,\n[Your Name]',
    call: 'Hi {firstName}, I work with healthcare teams on streamlining operations. Do you have 15 minutes Thursday?',
    sms: '{firstName}, we save {industry} practices 10+ hours/week. Worth a quick chat?'
  },
  'legal': {
    email: 'Hi {firstName},\n\n{company} could be utilizing technology better. Our clients save 20+ hours/week.\n\nOpen to a brief conversation?\n\nBest,\n[Your Name]',
    call: 'Hi {firstName}, I partner with law firms on efficiency. Would Tuesday work for a quick call?',
    sms: '{firstName}, we help legal teams save 20+ hours/week. Available for a demo?'
  },
  'saas': {
    email: 'Hi {firstName},\n\nWe help SaaS companies like {company} improve user retention by 35%.\n\nWorth exploring together?\n\nBest,\n[Your Name]',
    call: 'Hi {firstName}, this is [Your Name]. We work with SaaS founders on growth. Got 15 minutes?',
    sms: '{firstName}, SaaS companies average 35% better retention with us. Interested?'
  },
  'home-services': {
    email: 'Hi {firstName},\n\n{company} could be booking 50% more jobs with our system.\n\nCan we chat briefly?\n\nBest,\n[Your Name]',
    call: 'Hi {firstName}, I work with {industry} companies like yours. Do you have time this week?',
    sms: '{firstName}, we help {industry} book 50% more jobs. Quick demo?'
  },
  'insurance': {
    email: 'Hi {firstName},\n\nOur platform has helped {industry} agencies like {company} increase policy sales by 45%.\n\nInterested in learning how?\n\nBest,\n[Your Name]',
    call: 'Hi {firstName}, this is [Your Name]. I work with insurance agencies. Tuesday good for a call?',
    sms: '{firstName}, insurance agencies increase sales 45% with us. Worth 15 minutes?'
  },
  'automotive': {
    email: 'Hi {firstName},\n\n{company} could increase inventory turnover with our system.\n\nWould you be open to discussing?\n\nBest,\n[Your Name]',
    call: 'Hi {firstName}, I partner with auto dealers on sales optimization. Quick call this week?',
    sms: '{firstName}, auto dealers increase sales 35% with us. Interested?'
  },
  'financial-services': {
    email: 'Hi {firstName},\n\nWe help {industry} firms like {company} improve client retention by 40%.\n\nWorth a brief conversation?\n\nBest,\n[Your Name]',
    call: 'Hi {firstName}, this is [Your Name]. I work with financial professionals. Got 15 minutes?',
    sms: '{firstName}, financial firms improve retention 40% with us. Available to chat?'
  }
};

const DEFAULT_TEMPLATES: Record<ChannelType, string> = {
  email: 'Hi {firstName},\n\nI work with companies in {industry} like {company}.\n\nWould you be open to a brief conversation?\n\nBest,\n[Your Name]',
  call: 'Hi {firstName}, this is [Your Name]. I work with {industry} professionals. Do you have 15 minutes?',
  sms: '{firstName}, we help {industry} companies grow. Worth a quick chat?'
};

// ============ CORE FUNCTIONS ============

/**
 * Generates an optimal multi-step outreach sequence based on lead data
 */
export function generateOptimalSequence(params: SequenceGenerationParams): AutoSequence {
  const { urgency, leadProfile, workspaceGoal, channelPreferences } = params;
  const industry = params.industry ?? leadProfile.industry;

  let steps: SequenceStep[] = [];
  let totalDays = 0;

  if (urgency === 'hot') {
    steps = generateHotSequence(params);
    totalDays = 3;
  } else if (urgency === 'warm') {
    steps = generateWarmSequence(params);
    totalDays = 14;
  } else {
    steps = generateColdSequence(params);
    totalDays = 30;
  }

  const conditionalBranches = new Map<number, ConditionalBranch[]>();
  steps.forEach(step => {
    conditionalBranches.set(step.stepNumber, generateConditionalBranches(step));
  });

  return {
    id: `seq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: `${urgency.charAt(0).toUpperCase() + urgency.slice(1)} Lead Sequence - ${industry}`,
    temperature: urgency,
    totalSteps: steps.length,
    totalDays,
    steps,
    goal: workspaceGoal,
    industry,
    conditionalBranches,
    createdAt: new Date(),
    version: 1
  };
}

/**
 * Adapts an existing sequence based on performance metrics
 */
export function adaptSequenceFromPerformance(sequence: AutoSequence, metrics: SequenceMetrics): AutoSequence {
  const adapted = { ...sequence, version: sequence.version + 1 };

  // Filter out underperforming steps (< 10% engagement)
  adapted.steps = sequence.steps.filter(step => {
    const stepMetric = metrics.stepMetrics.find(m => m.stepNumber === step.stepNumber);
    if (!stepMetric) return true;
    return stepMetric.openRate + stepMetric.clickRate >= 0.1;
  });

  // Adjust timing based on performance
  adapted.steps = adapted.steps.map(step => {
    const stepMetric = metrics.stepMetrics.find(m => m.stepNumber === step.stepNumber);
    if (!stepMetric) return step;

    // If response rate is high, reduce delay to follow up faster
    if (stepMetric.responseRate > 0.3) {
      return { ...step, delayHours: Math.max(4, step.delayHours - 12) };
    }
    // If response rate is low, increase delay to avoid fatigue
    if (stepMetric.responseRate < 0.05) {
      return { ...step, delayHours: step.delayHours + 24 };
    }
    return step;
  });

  // Swap underperforming channels
  adapted.steps = adapted.steps.map(step => {
    const stepMetric = metrics.stepMetrics.find(m => m.stepNumber === step.stepNumber);
    if (!stepMetric || stepMetric.openRate > 0.25) return step;

    // Switch to SMS for low-engagement email
    if (step.channel === 'email' && stepMetric.openRate < 0.15) {
      return { ...step, channel: 'sms' };
    }
    return step;
  });

  adapted.totalSteps = adapted.steps.length;
  return adapted;
}

/**
 * Generates conditional branches for a sequence step
 */
export function generateConditionalBranches(step: SequenceStep): ConditionalBranch[] {
  const branches: ConditionalBranch[] = [];

  // If responded - fast track to closing call
  branches.push({
    condition: 'responded',
    nextStepNumber: null,
    action: 'Route to sales team immediately',
    messageTemplate: 'Thank you for getting back to me! Let\'s schedule a call. [Calendar Link]'
  });

  // If opened but not replied - softer follow-up
  branches.push({
    condition: 'opened-not-replied',
    nextStepNumber: step.stepNumber + 1,
    action: 'Send softer follow-up via SMS or call',
    messageTemplate: 'Hi, checking in on my previous message. Are you interested?'
  });

  // If bounced - switch channel
  branches.push({
    condition: 'bounced',
    nextStepNumber: step.stepNumber + 1,
    action: 'Attempt call instead of email',
    messageTemplate: 'Hi, trying to reach you via phone...'
  });

  // If objection detected - route to handler
  branches.push({
    condition: 'objection',
    nextStepNumber: null,
    action: 'Route to objection handler with context',
    messageTemplate: 'I understand your concern about {objection}. Here\'s how we handle that...'
  });

  // If no response - continue sequence
  branches.push({
    condition: 'no-response',
    nextStepNumber: step.stepNumber + 1,
    action: 'Continue with next step in sequence',
    messageTemplate: undefined
  });

  return branches;
}

// ============ HELPER FUNCTIONS ============

function generateHotSequence(params: SequenceGenerationParams): SequenceStep[] {
  const { channelPreferences, leadProfile } = params;

  return [
    {
      stepNumber: 1,
      channel: 'call',
      delayHours: 0,
      messageTemplate: `Hi {firstName}, this is [Your Name]. I work with {industry} professionals. Got 30 seconds?`,
      purpose: 'Immediate outreach to hot lead',
      successCriteria: 'Answer call or leave voicemail',
      timeWindow: { startHour: 9, endHour: 11 }
    },
    {
      stepNumber: 2,
      channel: 'sms',
      delayHours: 2,
      messageTemplate: `{firstName}, quick follow-up from our call. Reply YES if you want more info`,
      purpose: 'Low-friction follow-up',
      successCriteria: 'SMS delivered',
      timeWindow: { startHour: 10, endHour: 14 }
    },
    {
      stepNumber: 3,
      channel: 'call',
      delayHours: 6,
      messageTemplate: `Hi {firstName}, checking in again. This could really help {company}`,
      purpose: 'Second call attempt',
      successCriteria: 'Connect or high-quality voicemail',
      timeWindow: { startHour: 14, endHour: 16 }
    },
    {
      stepNumber: 4,
      channel: 'email',
      delayHours: 24,
      messageTemplate: getIndustryTemplate(params.leadProfile.industry, 'email', params),
      purpose: 'Professional recap with proof',
      successCriteria: 'Email delivered',
      timeWindow: { startHour: 6, endHour: 9 }
    },
    {
      stepNumber: 5,
      channel: 'call',
      delayHours: 72,
      messageTemplate: `Hi {firstName}, last attempt to connect about the opportunity we discussed`,
      purpose: 'Final call for hot sequence',
      successCriteria: 'Connection or final voicemail',
      timeWindow: { startHour: 9, endHour: 11 }
    }
  ];
}

function generateWarmSequence(params: SequenceGenerationParams): SequenceStep[] {
  const { leadProfile } = params;

  return [
    {
      stepNumber: 1,
      channel: 'email',
      delayHours: 0,
      messageTemplate: getIndustryTemplate(leadProfile.industry, 'email', params),
      purpose: 'Initial value proposition',
      successCriteria: 'Email delivered and tracked',
      timeWindow: { startHour: 6, endHour: 9 }
    },
    {
      stepNumber: 2,
      channel: 'call',
      delayHours: 48,
      messageTemplate: `Hi {firstName}, this is [Your Name]. Following up on the email I sent. Got 15 minutes?`,
      purpose: 'Personal connection attempt',
      successCriteria: 'Call answered or professional voicemail',
      timeWindow: { startHour: 9, endHour: 11 }
    },
    {
      stepNumber: 3,
      channel: 'sms',
      delayHours: 72,
      messageTemplate: getIndustryTemplate(leadProfile.industry, 'sms', params),
      purpose: 'Mobile-first follow-up',
      successCriteria: 'SMS delivered',
      timeWindow: { startHour: 10, endHour: 14 }
    },
    {
      stepNumber: 4,
      channel: 'email',
      delayHours: 96,
      messageTemplate: `Hi {firstName},\n\nJust want to make sure you saw my previous message. [Brief value statement]\n\nLet me know if you're interested.\n\nBest,\n[Your Name]`,
      purpose: 'Soft email reminder',
      successCriteria: 'Email delivered',
      timeWindow: { startHour: 6, endHour: 9 }
    },
    {
      stepNumber: 5,
      channel: 'call',
      delayHours: 144,
      messageTemplate: `Hi {firstName}, trying once more. Are you open to a brief conversation about {company}?`,
      purpose: 'Second call push',
      successCriteria: 'Answer or voicemail',
      timeWindow: { startHour: 14, endHour: 16 }
    },
    {
      stepNumber: 6,
      channel: 'email',
      delayHours: 168,
      messageTemplate: `Hi {firstName},\n\nI understand you might be busy. Just one more quick message:\n\n[Social proof about similar {industry} clients]\n\nWorth a conversation?\n\nBest,\n[Your Name]`,
      purpose: 'Social proof email',
      successCriteria: 'Email delivered',
      timeWindow: { startHour: 6, endHour: 9 }
    },
    {
      stepNumber: 7,
      channel: 'call',
      delayHours: 216,
      messageTemplate: `Hi {firstName}, this is [Your Name]. Last touch. Are you interested in learning how we help {industry} professionals?`,
      purpose: 'Third call attempt',
      successCriteria: 'Connection or final voicemail',
      timeWindow: { startHour: 9, endHour: 11 }
    },
    {
      stepNumber: 8,
      channel: 'email',
      delayHours: 288,
      messageTemplate: `Hi {firstName},\n\nI'll stop reaching out after this. Just wanted to leave the door open if things change.\n\n[One-liner value prop]\n\nBest,\n[Your Name]`,
      purpose: 'Final email with soft exit',
      successCriteria: 'Email delivered',
      timeWindow: { startHour: 6, endHour: 9 }
    }
  ];
}

function generateColdSequence(params: SequenceGenerationParams): SequenceStep[] {
  const { leadProfile } = params;

  return [
    {
      stepNumber: 1,
      channel: 'email',
      delayHours: 0,
      messageTemplate: getIndustryTemplate(leadProfile.industry, 'email', params),
      purpose: 'Initial brand awareness',
      successCriteria: 'Email delivered',
      timeWindow: { startHour: 6, endHour: 9 }
    },
    {
      stepNumber: 2,
      channel: 'email',
      delayHours: 72,
      messageTemplate: `Hi {firstName},\n\nQuick thought on {company} and {industry}.\n\nWould this be valuable to you?\n\n[Link]\n\nBest`,
      purpose: 'Build interest gradually',
      successCriteria: 'Email delivered',
      timeWindow: { startHour: 6, endHour: 9 }
    },
    {
      stepNumber: 3,
      channel: 'call',
      delayHours: 144,
      messageTemplate: `Hi {firstName}, this is [Your Name] from [Company]. I focus on {industry}. Got a quick second?`,
      purpose: 'First call touch',
      successCriteria: 'Voicemail or brief connection',
      timeWindow: { startHour: 9, endHour: 11 }
    },
    {
      stepNumber: 4,
      channel: 'sms',
      delayHours: 168,
      messageTemplate: `{firstName}, following up on my call earlier. Worth 15 minutes to chat?`,
      purpose: 'Multi-channel persistence',
      successCriteria: 'SMS delivered',
      timeWindow: { startHour: 10, endHour: 14 }
    },
    {
      stepNumber: 5,
      channel: 'email',
      delayHours: 216,
      messageTemplate: getIndustryTemplate(leadProfile.industry, 'email', params),
      purpose: 'Value reinforcement',
      successCriteria: 'Email delivered',
      timeWindow: { startHour: 6, endHour: 9 }
    },
    {
      stepNumber: 6,
      channel: 'call',
      delayHours: 288,
      messageTemplate: `Hi {firstName}, I won't keep bothering you, but I wanted to mention this {industry} opportunity`,
      purpose: 'Second call attempt',
      successCriteria: 'Voicemail or brief response',
      timeWindow: { startHour: 14, endHour: 16 }
    },
    {
      stepNumber: 7,
      channel: 'email',
      delayHours: 336,
      messageTemplate: `Hi {firstName},\n\nOne more thought about how {company} could benefit.\n\n[Case study]\n\nBest`,
      purpose: 'Social proof email',
      successCriteria: 'Email delivered',
      timeWindow: { startHour: 6, endHour: 9 }
    },
    {
      stepNumber: 8,
      channel: 'sms',
      delayHours: 408,
      messageTemplate: `{firstName}, we work with {industry} leaders. Free 10-min strategy session?`,
      purpose: 'Low-touch SMS',
      successCriteria: 'SMS delivered',
      timeWindow: { startHour: 10, endHour: 14 }
    },
    {
      stepNumber: 9,
      channel: 'call',
      delayHours: 480,
      messageTemplate: `Hi {firstName}, last attempt to connect on this {industry} solution for {company}`,
      purpose: 'Third call touch',
      successCriteria: 'Voicemail',
      timeWindow: { startHour: 9, endHour: 11 }
    },
    {
      stepNumber: 10,
      channel: 'email',
      delayHours: 528,
      messageTemplate: `Hi {firstName},\n\nFinal message: we help {industry} teams like {company} achieve [outcome].\n\nReply if interested.\n\nBest`,
      purpose: 'Final value email',
      successCriteria: 'Email delivered',
      timeWindow: { startHour: 6, endHour: 9 }
    },
    {
      stepNumber: 11,
      channel: 'call',
      delayHours: 600,
      messageTemplate: `Hi {firstName}, truly last call. Open to connecting?`,
      purpose: 'Final call attempt',
      successCriteria: 'Voicemail',
      timeWindow: { startHour: 14, endHour: 16 }
    },
    {
      stepNumber: 12,
      channel: 'email',
      delayHours: 672,
      messageTemplate: `Hi {firstName},\n\nI'll stop reaching out. But if {industry} market changes, we're here.\n\nBest,\n[Your Name]`,
      purpose: 'Graceful exit',
      successCriteria: 'Email delivered',
      timeWindow: { startHour: 6, endHour: 9 }
    }
  ];
}

function getIndustryTemplate(industry: string, channel: ChannelType, params: SequenceGenerationParams): string {
  const normalizedIndustry = industry.toLowerCase().replace(/\s+/g, '-');
  const templates = INDUSTRY_TEMPLATES[normalizedIndustry] || INDUSTRY_TEMPLATES['saas'];
  let template = templates[channel];

  // Replace placeholders
  template = template.replace(/{firstName}/g, params.firstName || 'there');
  template = template.replace(/{company}/g, params.companyName || 'your company');
  template = template.replace(/{industry}/g, industry);

  return template;
}
