/**
 * Customer Success Playbook
 * Post-close automation for retention, adoption, and expansion.
 * Triggers after customer's first 30 days (guarantee period).
 *
 * Checkpoints: Day 45, 50, 75, 85, 105, 165, Quarterly (90, 180, 270, 360)
 */

export interface SuccessCheckpoint {
  dayAfterClose: number;
  type: "health_check" | "feature_adoption" | "expansion" | "review_request" | "referral" | "business_review";
  channel: "email" | "sms" | "in_app";
  subject?: string;
  template: string;
  conditions?: {
    minMonthlyCallVolume?: number;
    maxMonthlyCallVolume?: number;
    planTier?: string;
    appointmentBookingRate?: number;
    minDaysInGuarantee?: number;
  };
}

export interface CustomerSuccessContext {
  businessName: string;
  industry?: string;
  planTier: "starter" | "professional" | "enterprise";
  monthlyCallVolume: number;
  closeDate: string;
  appointmentBookingRate?: number;
  hasOutboundCampaigns?: boolean;
  hasAnalyticsAccess?: boolean;
  hasAppointmentBooking?: boolean;
  industryAverageCallVolume?: number;
}

// Day 45: Health Check
const HEALTH_CHECK: SuccessCheckpoint = {
  dayAfterClose: 45,
  type: "health_check",
  channel: "email",
  subject: "How's everything going? Quick 2-question check-in",
  template: "success_health_check_day45"
};

// Day 50: Feature Adoption
const FEATURE_ADOPTION: SuccessCheckpoint = {
  dayAfterClose: 50,
  type: "feature_adoption",
  channel: "email",
  subject: "3 features your team might not be using yet",
  template: "success_feature_adoption_day50",
  conditions: { minDaysInGuarantee: 45 }
};

// Day 75: ROI Review
const ROI_REVIEW: SuccessCheckpoint = {
  dayAfterClose: 75,
  type: "expansion",
  channel: "email",
  subject: "Your 90-day ROI report is ready",
  template: "success_roi_review_day75",
  conditions: { minDaysInGuarantee: 45 }
};

// Day 85: Review Request
const REVIEW_REQUEST: SuccessCheckpoint = {
  dayAfterClose: 85,
  type: "review_request",
  channel: "email",
  subject: "We'd love to hear from you (1-minute review)",
  template: "success_review_request_day85",
  conditions: { minMonthlyCallVolume: 50, minDaysInGuarantee: 75 }
};

// Day 105: Expansion Opportunity
const EXPANSION_OPPORTUNITY: SuccessCheckpoint = {
  dayAfterClose: 105,
  type: "expansion",
  channel: "email",
  subject: "Your growth suggests a plan upgrade",
  template: "success_expansion_day105",
  conditions: { minDaysInGuarantee: 75 }
};

// Day 165: Referral Program
const REFERRAL_PROGRAM: SuccessCheckpoint = {
  dayAfterClose: 165,
  type: "referral",
  channel: "email",
  subject: "Know another business? Refer them for a free month",
  template: "success_referral_day165",
  conditions: { minMonthlyCallVolume: 30, minDaysInGuarantee: 150 }
};

// Quarterly: Business Review
const BUSINESS_REVIEW_Q: SuccessCheckpoint = {
  dayAfterClose: 90,
  type: "business_review",
  channel: "email",
  subject: "Quarterly Business Review + Benchmarks",
  template: "success_business_review_quarterly",
  conditions: { minDaysInGuarantee: 75 }
};

/**
 * Generate success playbook for a customer
 * Includes quarterly reviews at days 90, 180, 270, 360
 */
export function generateSuccessPlaybook(context: CustomerSuccessContext): SuccessCheckpoint[] {
  const checkpoints: SuccessCheckpoint[] = [
    HEALTH_CHECK,
    FEATURE_ADOPTION,
    ROI_REVIEW,
    EXPANSION_OPPORTUNITY
  ];

  if (context.monthlyCallVolume >= 50) checkpoints.push(REVIEW_REQUEST);
  if (context.monthlyCallVolume >= 30) checkpoints.push(REFERRAL_PROGRAM);

  // Add quarterly business reviews
  [90, 180, 270, 360].forEach((day) => {
    checkpoints.push({ ...BUSINESS_REVIEW_Q, dayAfterClose: day });
  });

  return checkpoints;
}

/**
 * Get active checkpoints by days since close
 */
export function getActiveCheckpoints(
  closeDate: string,
  currentDate: string = new Date().toISOString()
): SuccessCheckpoint[] {
  const daysSinceClose = Math.floor(
    (new Date(currentDate).getTime() - new Date(closeDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const defaultContext: CustomerSuccessContext = {
    businessName: "Customer",
    planTier: "professional",
    monthlyCallVolume: 50,
    closeDate
  };

  return generateSuccessPlaybook(defaultContext).filter(
    (cp) => cp.dayAfterClose <= daysSinceClose
  );
}

/**
 * Get next checkpoint to trigger
 */
export function getNextCheckpoint(
  closeDate: string,
  currentDate: string = new Date().toISOString()
): SuccessCheckpoint | null {
  const daysSinceClose = Math.floor(
    (new Date(currentDate).getTime() - new Date(closeDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const defaultContext: CustomerSuccessContext = {
    businessName: "Customer",
    planTier: "professional",
    monthlyCallVolume: 50,
    closeDate
  };

  const sorted = generateSuccessPlaybook(defaultContext).sort(
    (a, b) => a.dayAfterClose - b.dayAfterClose
  );

  return sorted.find((cp) => cp.dayAfterClose > daysSinceClose) || null;
}

/**
 * Days until next checkpoint
 */
export function daysUntilNextCheckpoint(
  closeDate: string,
  currentDate: string = new Date().toISOString()
): number | null {
  const daysSinceClose = Math.floor(
    (new Date(currentDate).getTime() - new Date(closeDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const next = getNextCheckpoint(closeDate, currentDate);
  return next ? next.dayAfterClose - daysSinceClose : null;
}

/**
 * Check if customer is in 30-day guarantee period
 */
export function isInGuaranteePeriod(
  closeDate: string,
  currentDate: string = new Date().toISOString()
): boolean {
  const daysSinceClose = Math.floor(
    (new Date(currentDate).getTime() - new Date(closeDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceClose <= 30;
}
