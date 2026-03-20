export type PlanSlug = "solo" | "business" | "scale" | "enterprise";

/** Display names for customer-facing UI (slugs remain for DB/Stripe compat) */
export const PLAN_DISPLAY_NAMES: Record<PlanSlug, string> = {
  solo: "Starter",
  business: "Growth",
  scale: "Business",
  enterprise: "Agency",
};

/** Usage-based rates (cents). Applied when plan limits exceeded. */
export const USAGE_RATES = {
  /** Per SMS segment overage */
  smsOverageCentsPerSegment: { solo: 5, business: 4, scale: 3, enterprise: 0 } as Record<PlanSlug, number>,
  /** Per phone number per month (our cost ~$1, we charge $5) */
  phoneNumberMonthlyCents: 500,
  /** One-time phone number setup fee */
  phoneNumberSetupCents: 200,
  /** Per extra AI agent beyond plan limit */
  extraAgentMonthlyCents: 1500,
  /** Per extra team seat beyond plan limit */
  extraSeatMonthlyCents: 1000,
  /** Per extra phone number beyond plan limit */
  extraNumberMonthlyCents: 500,
  /** Recording storage per minute beyond 30 days retention */
  recordingStorageCentsPerMin: 5,
  /** Knowledge base storage per 100MB per month */
  knowledgeStorageCentsPerBlock: 500,
} as const;

export interface BillingPlan {
  slug: PlanSlug;
  label: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  includedMinutes: number;
  overageRateCents: number;
  /** Overage rate per SMS segment (cents) */
  smsOverageRateCents: number;
  maxAgents: number;
  maxSeats: number;
  maxPhoneNumbers: number;
  outboundDailyLimit: number;
  smsMonthlyCap: number;
  /** Included phone numbers in the plan (billed at $0 for these) */
  includedPhoneNumbers: number;
  features: {
    appointmentBooking: boolean;
    missedCallRecovery: boolean;
    noShowRecovery: boolean;
    reactivationCampaigns: boolean;
    outboundCampaigns: boolean;
    outboundPowerDialer: boolean;
    industryTemplates: boolean;
    smsEmail: boolean;
    voiceFollowUp: boolean;
    revenueAnalytics: boolean;
    advancedAnalytics: boolean;
    crmWebhook: boolean;
    nativeCrmSync: boolean;
    apiAccess: boolean;
    premiumVoices: boolean;
    prioritySupport: boolean;
    whiteLabel: boolean;
    sso: boolean;
  };
}

export const BILLING_PLANS: Record<PlanSlug, BillingPlan> = {
  solo: {
    slug: "solo",
    label: "Starter",
    description: "One AI agent that answers and follows up",
    monthlyPrice: 9700,
    annualPrice: 7700,
    includedMinutes: 500,
    overageRateCents: 10,
    smsOverageRateCents: 5,
    maxAgents: 1,
    maxSeats: 1,
    maxPhoneNumbers: 1,
    outboundDailyLimit: 10,
    smsMonthlyCap: 500,
    includedPhoneNumbers: 1,
    features: {
      appointmentBooking: true,
      missedCallRecovery: true,
      noShowRecovery: false,
      reactivationCampaigns: false,
      outboundCampaigns: false,
      outboundPowerDialer: false,
      industryTemplates: false,
      smsEmail: true,
      voiceFollowUp: false,
      revenueAnalytics: false,
      advancedAnalytics: false,
      crmWebhook: false,
      nativeCrmSync: false,
      apiAccess: false,
      premiumVoices: false,
      prioritySupport: false,
      whiteLabel: false,
      sso: false,
    },
  },
  business: {
    slug: "business",
    label: "Growth",
    description: "Multi-agent revenue operations",
    monthlyPrice: 29700,
    annualPrice: 23700,
    includedMinutes: 2500,
    overageRateCents: 10,
    smsOverageRateCents: 4,
    maxAgents: 5,
    maxSeats: 5,
    maxPhoneNumbers: 5,
    outboundDailyLimit: 100,
    smsMonthlyCap: 2000,
    includedPhoneNumbers: 5,
    features: {
      appointmentBooking: true,
      missedCallRecovery: true,
      noShowRecovery: true,
      reactivationCampaigns: true,
      outboundCampaigns: false,
      outboundPowerDialer: false,
      industryTemplates: true,
      smsEmail: true,
      voiceFollowUp: true,
      revenueAnalytics: true,
      advancedAnalytics: false,
      crmWebhook: true,
      nativeCrmSync: false,
      apiAccess: false,
      premiumVoices: false,
      prioritySupport: true,
      whiteLabel: false,
      sso: false,
    },
  },
  scale: {
    slug: "scale",
    label: "Business",
    description: "Full-scale AI call center",
    monthlyPrice: 59700,
    annualPrice: 47700,
    includedMinutes: 6000,
    overageRateCents: 8,
    smsOverageRateCents: 3,
    maxAgents: 15,
    maxSeats: -1,
    maxPhoneNumbers: 15,
    outboundDailyLimit: 500,
    smsMonthlyCap: 10000,
    includedPhoneNumbers: 15,
    features: {
      appointmentBooking: true,
      missedCallRecovery: true,
      noShowRecovery: true,
      reactivationCampaigns: true,
      outboundCampaigns: true,
      outboundPowerDialer: true,
      industryTemplates: true,
      smsEmail: true,
      voiceFollowUp: true,
      revenueAnalytics: true,
      advancedAnalytics: true,
      crmWebhook: true,
      nativeCrmSync: true,
      apiAccess: true,
      premiumVoices: true,
      prioritySupport: true,
      whiteLabel: false,
      sso: false,
    },
  },
  enterprise: {
    slug: "enterprise",
    label: "Agency",
    description: "White-label AI for your clients",
    monthlyPrice: 0,
    annualPrice: 0,
    includedMinutes: 0,
    overageRateCents: 0,
    smsOverageRateCents: 0,
    maxAgents: -1,
    maxSeats: -1,
    maxPhoneNumbers: -1,
    outboundDailyLimit: -1,
    smsMonthlyCap: -1,
    includedPhoneNumbers: -1,
    features: {
      appointmentBooking: true,
      missedCallRecovery: true,
      noShowRecovery: true,
      reactivationCampaigns: true,
      outboundCampaigns: true,
      outboundPowerDialer: true,
      industryTemplates: true,
      smsEmail: true,
      voiceFollowUp: true,
      revenueAnalytics: true,
      advancedAnalytics: true,
      crmWebhook: true,
      nativeCrmSync: true,
      apiAccess: true,
      premiumVoices: true,
      prioritySupport: true,
      whiteLabel: true,
      sso: true,
    },
  },
};

export const DEFAULT_PLAN: PlanSlug = "business";

/** Paid tiers only (excludes enterprise custom) */
export const BILLING_PLAN_ORDER: PlanSlug[] = ["solo", "business", "scale"];
