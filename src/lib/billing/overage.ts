import { getDb } from "@/lib/db/queries";
import { BILLING_PLANS, type PlanSlug } from "@/lib/billing-plans";
import { getStripe } from "@/lib/billing/stripe-client";

/** Plan minute and SMS limits by tier (source of truth: BILLING_PLANS) */
export const PLAN_LIMITS: Record<PlanSlug, {
  minutes: number;
  sms: number;
  voice_minutes?: number;
  overage_cents_per_minute: number;
  sms_overage_cents: number;
}> = {
  solo: {
    minutes: BILLING_PLANS.solo.includedMinutes,
    sms: BILLING_PLANS.solo.smsMonthlyCap,
    voice_minutes: BILLING_PLANS.solo.includedMinutes,
    overage_cents_per_minute: BILLING_PLANS.solo.overageRateCents,
    sms_overage_cents: BILLING_PLANS.solo.smsOverageRateCents,
  },
  business: {
    minutes: BILLING_PLANS.business.includedMinutes,
    sms: BILLING_PLANS.business.smsMonthlyCap,
    voice_minutes: BILLING_PLANS.business.includedMinutes,
    overage_cents_per_minute: BILLING_PLANS.business.overageRateCents,
    sms_overage_cents: BILLING_PLANS.business.smsOverageRateCents,
  },
  scale: {
    minutes: BILLING_PLANS.scale.includedMinutes,
    sms: BILLING_PLANS.scale.smsMonthlyCap,
    voice_minutes: BILLING_PLANS.scale.includedMinutes,
    overage_cents_per_minute: BILLING_PLANS.scale.overageRateCents,
    sms_overage_cents: BILLING_PLANS.scale.smsOverageRateCents,
  },
  enterprise: {
    minutes: BILLING_PLANS.enterprise.includedMinutes,
    sms: BILLING_PLANS.enterprise.smsMonthlyCap,
    voice_minutes: BILLING_PLANS.enterprise.includedMinutes,
    overage_cents_per_minute: BILLING_PLANS.enterprise.overageRateCents,
    sms_overage_cents: BILLING_PLANS.enterprise.smsOverageRateCents,
  },
};

/** Usage alert level */
export type AlertLevel = "normal" | "warning" | "critical" | "exceeded";

interface UsageMetrics {
  minutes_used: number;
  minutes_limit: number;
  voice_minutes_used: number;
  voice_minutes_limit: number;
  sms_used: number;
  sms_limit: number;
  minutes_pct: number;
  voice_minutes_pct: number;
  sms_pct: number;
  is_over_limit: boolean;
  overage_minutes: number;
  overage_voice_minutes: number;
  overage_sms: number;
  estimated_overage_cents: number;
}

interface DailyUsage {
  date: string;
  minutes: number;
  sms: number;
}

/** Get alert level based on usage percentage */
export function getUsageAlertLevel(pct: number): AlertLevel {
  if (pct > 100) return "exceeded";
  if (pct > 90) return "critical";
  if (pct > 75) return "warning";
  return "normal";
}

/** Check usage thresholds for a workspace */
export async function checkUsageThresholds(workspaceId: string): Promise<UsageMetrics> {
  const db = getDb();

  // Get workspace tier
  const { data: ws } = await db
    .from("workspaces")
    .select("billing_tier")
    .eq("id", workspaceId)
    .maybeSingle();

  if (!ws) {
    throw new Error("Workspace not found");
  }

  const billingTier = ((ws as { billing_tier?: PlanSlug }).billing_tier ?? "solo") as PlanSlug;
  const limits = PLAN_LIMITS[billingTier];

  // Calculate minutes used this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: sessions } = await db
    .from("call_sessions")
    .select("call_started_at, call_ended_at")
    .eq("workspace_id", workspaceId)
    .gte("call_started_at", startOfMonth.toISOString());

  const minutesUsed = Math.ceil(
    (sessions ?? []).reduce((sum: number, s: { call_started_at: string; call_ended_at?: string | null }) => {
      const start = new Date(s.call_started_at).getTime();
      const end = s.call_ended_at ? new Date(s.call_ended_at).getTime() : start;
      return sum + (end - start) / 60000;
    }, 0)
  );

  // SMS usage (count from sms_logs if table exists)
  let smsUsed = 0;
  try {
    const { count: smsCount } = await db
      .from("sms_logs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", startOfMonth.toISOString());
    smsUsed = smsCount ?? 0;
  } catch {
    // SMS table may not exist yet
    smsUsed = 0;
  }

  // Voice usage (from voice_usage table if available)
  let voiceMinutesUsed = 0;
  try {
    const { data: voiceUsage } = await db
      .from("voice_usage")
      .select("audio_duration_ms")
      .eq("workspace_id", workspaceId)
      .gte("created_at", startOfMonth.toISOString());
    voiceMinutesUsed = Math.ceil(
      ((voiceUsage ?? []).reduce((sum: number, u: { audio_duration_ms: number }) => sum + u.audio_duration_ms, 0) / 1000 / 60)
    );
  } catch {
    // Voice table may not exist yet
    voiceMinutesUsed = 0;
  }

  const voiceMinutesLimit = limits.voice_minutes ?? limits.minutes;
  const overageMinutes = Math.max(0, minutesUsed - limits.minutes);
  const overageSms = Math.max(0, smsUsed - limits.sms);
  const overageVoiceMinutes = Math.max(0, voiceMinutesUsed - voiceMinutesLimit);
  const estimatedOverageCents =
    overageMinutes * limits.overage_cents_per_minute +
    overageSms * limits.sms_overage_cents;

  return {
    minutes_used: minutesUsed,
    minutes_limit: limits.minutes,
    voice_minutes_used: voiceMinutesUsed,
    voice_minutes_limit: voiceMinutesLimit,
    sms_used: smsUsed,
    sms_limit: limits.sms,
    minutes_pct: limits.minutes > 0 ? (minutesUsed / limits.minutes) * 100 : 0,
    voice_minutes_pct: voiceMinutesLimit > 0 ? (voiceMinutesUsed / voiceMinutesLimit) * 100 : 0,
    sms_pct: limits.sms > 0 ? (smsUsed / limits.sms) * 100 : 0,
    is_over_limit: minutesUsed > limits.minutes || smsUsed > limits.sms || voiceMinutesUsed > voiceMinutesLimit,
    overage_minutes: overageMinutes,
    overage_voice_minutes: overageVoiceMinutes,
    overage_sms: overageSms,
    estimated_overage_cents: estimatedOverageCents,
  };
}

/** Calculate daily usage breakdown for the month */
export async function getDailyUsageBreakdown(workspaceId: string): Promise<DailyUsage[]> {
  const db = getDb();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: sessions } = await db
    .from("call_sessions")
    .select("call_started_at, call_ended_at")
    .eq("workspace_id", workspaceId)
    .gte("call_started_at", startOfMonth.toISOString());

  // Group by date
  const byDate: Record<string, number> = {};
  (sessions ?? []).forEach((s: { call_started_at: string; call_ended_at?: string | null }) => {
    const start = new Date(s.call_started_at);
    const dateStr = start.toISOString().split("T")[0];
    const end = s.call_ended_at ? new Date(s.call_ended_at).getTime() : start.getTime();
    const minutes = (end - start.getTime()) / 60000;
    byDate[dateStr] = (byDate[dateStr] ?? 0) + minutes;
  });

  // Get SMS by date (if table exists)
  const smsByDate: Record<string, number> = {};
  try {
    const { data: smsLogs } = await db
      .from("sms_logs")
      .select("created_at")
      .eq("workspace_id", workspaceId)
      .gte("created_at", startOfMonth.toISOString());

    (smsLogs ?? []).forEach((s: { created_at: string }) => {
      const dateStr = new Date(s.created_at).toISOString().split("T")[0];
      smsByDate[dateStr] = (smsByDate[dateStr] ?? 0) + 1;
    });
  } catch {
    // SMS table may not exist
  }

  // Combine
  const allDates = new Set([...Object.keys(byDate), ...Object.keys(smsByDate)]);
  return Array.from(allDates)
    .sort()
    .map((date) => ({
      date,
      minutes: Math.ceil(byDate[date] ?? 0),
      sms: smsByDate[date] ?? 0,
    }));
}

/** Calculate overage charges to be added to Stripe invoice */
export async function calculateOverageCharges(
  workspaceId: string,
  billingPeriodStart: Date,
  billingPeriodEnd: Date
) {
  const db = getDb();

  // Get workspace tier and subscription
  const { data: ws } = await db
    .from("workspaces")
    .select("billing_tier, stripe_subscription_id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (!ws) {
    throw new Error("Workspace not found");
  }

  const wsData = ws as { billing_tier?: string; stripe_subscription_id?: string | null };
  const rawTier = (wsData.billing_tier ?? "solo").toLowerCase();
  const tier: PlanSlug = (["solo", "business", "scale", "enterprise"] as const).includes(
    rawTier as PlanSlug,
  )
    ? (rawTier as PlanSlug)
    : "solo";
  const limits = PLAN_LIMITS[tier];

  // Calculate minutes used in billing period
  const { data: sessions } = await db
    .from("call_sessions")
    .select("call_started_at, call_ended_at")
    .eq("workspace_id", workspaceId)
    .gte("call_started_at", billingPeriodStart.toISOString())
    .lte("call_started_at", billingPeriodEnd.toISOString());

  const minutesUsed = Math.ceil(
    (sessions ?? []).reduce((sum: number, s: { call_started_at: string; call_ended_at?: string | null }) => {
      const start = new Date(s.call_started_at).getTime();
      const end = s.call_ended_at ? new Date(s.call_ended_at).getTime() : start;
      return sum + (end - start) / 60000;
    }, 0)
  );

  // Calculate voice minutes used in billing period
  let voiceMinutesUsed = 0;
  try {
    const { data: voiceUsage } = await db
      .from("voice_usage")
      .select("audio_duration_ms")
      .eq("workspace_id", workspaceId)
      .gte("created_at", billingPeriodStart.toISOString())
      .lte("created_at", billingPeriodEnd.toISOString());
    voiceMinutesUsed = Math.ceil(
      ((voiceUsage ?? []).reduce((sum: number, u: { audio_duration_ms: number }) => sum + u.audio_duration_ms, 0) / 1000 / 60)
    );
  } catch {
    voiceMinutesUsed = 0;
  }

  // SMS usage in billing period
  let smsUsed = 0;
  try {
    const { count: smsCount } = await db
      .from("sms_logs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", billingPeriodStart.toISOString())
      .lte("created_at", billingPeriodEnd.toISOString());
    smsUsed = smsCount ?? 0;
  } catch {
    smsUsed = 0;
  }

  // Get bonus minutes from minute pack purchases (consumed before overage)
  let bonusMinutes = 0;
  try {
    const { data: balance } = await db
      .from("workspace_minute_balance")
      .select("bonus_minutes")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    bonusMinutes = (balance as { bonus_minutes?: number } | null)?.bonus_minutes ?? 0;
  } catch {
    // Table may not exist yet
  }

  const voiceMinutesLimit = (limits as { voice_minutes?: number }).voice_minutes ?? 0;

  // Effective limits include purchased bonus minutes
  const effectiveMinutesLimit = limits.minutes + bonusMinutes;
  const effectiveVoiceLimit = voiceMinutesLimit + bonusMinutes;

  const overageMinutes = Math.max(0, minutesUsed - effectiveMinutesLimit);
  const overageVoiceMinutes = Math.max(0, voiceMinutesUsed - effectiveVoiceLimit);
  const overageSms = Math.max(0, smsUsed - limits.sms);

  // Deduct consumed bonus minutes from balance
  const bonusMinutesConsumed = Math.min(bonusMinutes, Math.max(0, minutesUsed - limits.minutes) + Math.max(0, voiceMinutesUsed - voiceMinutesLimit));
  if (bonusMinutesConsumed > 0) {
    try {
      await db
        .from("workspace_minute_balance")
        .update({
          bonus_minutes: Math.max(0, bonusMinutes - bonusMinutesConsumed),
          updated_at: new Date().toISOString(),
        })
        .eq("workspace_id", workspaceId);
    } catch {
      // Non-fatal: balance deduction will be retried next billing cycle
    }
  }

  if (overageMinutes <= 0 && overageVoiceMinutes <= 0 && overageSms <= 0) {
    return null;
  }

  const overageAmountCents =
    overageMinutes * limits.overage_cents_per_minute +
    overageVoiceMinutes * limits.overage_cents_per_minute +
    overageSms * limits.sms_overage_cents;

  return {
    subscription_id: wsData.stripe_subscription_id,
    overage_minutes: overageMinutes,
    overage_voice_minutes: overageVoiceMinutes,
    overage_sms: overageSms,
    overage_amount_cents: overageAmountCents,
    rate_per_minute_cents: limits.overage_cents_per_minute,
    rate_per_voice_minute_cents: limits.overage_cents_per_minute,
    rate_per_sms_cents: limits.sms_overage_cents,
    bonus_minutes_consumed: bonusMinutesConsumed,
    bonus_minutes_remaining: Math.max(0, bonusMinutes - bonusMinutesConsumed),
  };
}

export async function reportUsageOverage(
  workspaceId: string,
  subscriptionId: string,
  tier: string,
  minutesUsed: number,
  minutesIncluded: number,
  voiceMinutesUsed?: number,
  voiceMinutesIncluded?: number,
  smsUsed?: number,
  smsIncluded?: number
) {
  let stripe;
  try {
    stripe = getStripe();
  } catch {
    // STRIPE_SECRET_KEY not configured
    return;
  }
  const overageMinutes = Math.max(0, minutesUsed - minutesIncluded);
  const overageVoiceMinutes = Math.max(0, (voiceMinutesUsed ?? 0) - (voiceMinutesIncluded ?? 0));
  const overageSms = Math.max(0, (smsUsed ?? 0) - (smsIncluded ?? 0));

  if (overageMinutes <= 0 && overageVoiceMinutes <= 0 && overageSms <= 0) return;

  const rawTier = (tier || "solo").toLowerCase();
  const tierSlug: PlanSlug = (["solo", "business", "scale", "enterprise"] as const).includes(
    rawTier as PlanSlug,
  )
    ? (rawTier as PlanSlug)
    : "solo";
  const ratePerMin = PLAN_LIMITS[tierSlug].overage_cents_per_minute;
  const ratePerVoiceMin = PLAN_LIMITS[tierSlug].overage_cents_per_minute;
  const ratePerSms = PLAN_LIMITS[tierSlug].sms_overage_cents;
  const overageAmountCents =
    overageMinutes * ratePerMin +
    overageVoiceMinutes * ratePerVoiceMin +
    overageSms * ratePerSms;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = subscription.customer as string;

  const descriptions: string[] = [];
  if (overageMinutes > 0) {
    descriptions.push(`Call overage: ${overageMinutes} min × $${(ratePerMin / 100).toFixed(2)}/min`);
  }
  if (overageVoiceMinutes > 0) {
    descriptions.push(`Voice overage: ${overageVoiceMinutes} min × $${(ratePerVoiceMin / 100).toFixed(2)}/min`);
  }
  if (overageSms > 0) {
    descriptions.push(`SMS overage: ${overageSms} messages × $${(ratePerSms / 100).toFixed(2)}/msg`);
  }

  await stripe.invoiceItems.create({
    customer: customerId,
    amount: overageAmountCents,
    currency: "usd",
    description: descriptions.join("; "),
    metadata: {
      workspace_id: workspaceId,
      overage_minutes: String(overageMinutes),
      overage_voice_minutes: String(overageVoiceMinutes),
      overage_sms: String(overageSms),
    },
  });
}

