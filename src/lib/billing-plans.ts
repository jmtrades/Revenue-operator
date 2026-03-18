export type PlanSlug = "solo" | "business" | "scale" | "enterprise";

export interface BillingPlan {
  slug: PlanSlug;
  label: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  includedMinutes: number;
  overageRateCents: number;
  maxAgents: number;
  maxSeats: number;
  maxPhoneNumbers: number;
  outboundDailyLimit: number;
  smsMonthlyCap: number;
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
    label: "Solo",
    description: "For solo operators",
    monthlyPrice: 4900,
    annualPrice: 3900,
    includedMinutes: 100,
    overageRateCents: 30,
    maxAgents: 1,
    maxSeats: 1,
    maxPhoneNumbers: 1,
    outboundDailyLimit: 10,
    smsMonthlyCap: 500,
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
    label: "Business",
    description: "The complete revenue recovery system",
    monthlyPrice: 29700,
    annualPrice: 24700,
    includedMinutes: 500,
    overageRateCents: 20,
    maxAgents: 3,
    maxSeats: 5,
    maxPhoneNumbers: 3,
    outboundDailyLimit: 100,
    smsMonthlyCap: 2000,
    features: {
      appointmentBooking: true,
      missedCallRecovery: true,
      noShowRecovery: true,
      reactivationCampaigns: true,
      outboundCampaigns: true,
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
      prioritySupport: false,
      whiteLabel: false,
      sso: false,
    },
  },
  scale: {
    slug: "scale",
    label: "Scale",
    description: "For teams and high volume",
    monthlyPrice: 99700,
    annualPrice: 84700,
    includedMinutes: 3000,
    overageRateCents: 12,
    maxAgents: 10,
    maxSeats: -1,
    maxPhoneNumbers: 10,
    outboundDailyLimit: 500,
    smsMonthlyCap: 10000,
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
    label: "Enterprise",
    description: "Custom",
    monthlyPrice: 0,
    annualPrice: 0,
    includedMinutes: 0,
    overageRateCents: 0,
    maxAgents: -1,
    maxSeats: -1,
    maxPhoneNumbers: -1,
    outboundDailyLimit: -1,
    smsMonthlyCap: -1,
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
