/**
 * Voice Billing Engine for Recall Touch
 * Integrates voice usage tracking with existing billing tiers and overage calculations
 */

import { getDb } from "@/lib/db/queries";
import { resolveBillingTier } from "@/lib/feature-gate/resolver";
import type { BillingTier } from "@/lib/feature-gate/types";

/** Voice tier limits — included in base plan (aligned with billing-plans.ts) */
export const VOICE_TIER_LIMITS = {
  solo: {
    voice_minutes: 500, // 500 min included (Starter plan)
    voice_clones: 0, // No cloning on Starter
    ab_tests: 0, // No A/B testing
    concurrent_calls: 2, // 2 simultaneous
    voices_available: 8, // Standard voices only
    premium_voices: false,
    custom_emotions: false,
  },
  business: {
    voice_minutes: 2500, // 2,500 min included (Growth plan)
    voice_clones: 3, // 3 cloned voices
    ab_tests: 2, // 2 concurrent A/B tests
    concurrent_calls: 10, // 10 simultaneous
    voices_available: 16, // Growth library
    premium_voices: true,
    custom_emotions: true,
  },
  scale: {
    voice_minutes: 6000, // 6,000 min included (Business plan)
    voice_clones: 10, // 10 cloned voices
    ab_tests: 5, // 5 concurrent A/B tests
    concurrent_calls: 25, // 25 simultaneous
    voices_available: 30, // Full library + priority
    premium_voices: true,
    custom_emotions: true,
  },
  enterprise: {
    voice_minutes: 15000, // 15,000 min included (Agency plan)
    voice_clones: -1, // Unlimited
    ab_tests: -1, // Unlimited
    concurrent_calls: 100, // Custom
    voices_available: 41, // All voices including premium
    premium_voices: true,
    custom_emotions: true,
  },
};

export type VoiceTierLimits = (typeof VOICE_TIER_LIMITS)[BillingTier];

/**
 * Voice overage rates — tiered per billing-plans.ts:
 * Starter: $0.10/min, Growth: $0.10/min, Business: $0.08/min, Agency: $0.07/min
 */
export const VOICE_OVERAGE_RATES = {
  solo_per_minute_cents: 10, // $0.10/min (Starter)
  business_per_minute_cents: 10, // $0.10/min (Growth)
  scale_per_minute_cents: 8, // $0.08/min (Business)
  enterprise_per_minute_cents: 7, // $0.07/min (Agency)
  voice_clone_monthly: 1500, // $15/mo per extra clone slot
  ab_test_monthly: 500, // $5/mo per extra A/B test
};

export interface VoiceUsageMetrics {
  workspace_id: string;
  billing_period_start: string;
  billing_period_end: string;
  minutes_used: number;
  minutes_limit: number;
  minutes_pct: number;
  clones_used: number;
  clones_limit: number;
  ab_tests_used: number;
  ab_tests_limit: number;
  concurrent_calls_peak: number;
  concurrent_calls_limit: number;
  is_over_limit: boolean;
  overage_minutes: number;
  estimated_overage_cents: number;
}

export interface VoiceUsageRecord {
  workspace_id: string;
  voice_id: string;
  duration_seconds: number;
  is_premium_voice: boolean;
  is_cloned_voice: boolean;
  ab_test_id?: string;
  cost_cents: number;
  call_session_id?: string;
}

export interface VoiceOverageResult {
  subscription_id: string | null;
  overage_minutes: number;
  overage_amount_cents: number;
  clone_overages_monthly: number;
  ab_test_overages_monthly: number;
  total_overage_cents: number;
  rate_per_minute_cents: number;
}

/** Get current voice usage for the billing period */
export async function getVoiceUsage(workspaceId: string): Promise<VoiceUsageMetrics> {
  const db = getDb();

  // Get workspace tier and subscription dates
  const { data: workspace } = await db
    .from("workspaces")
    .select("billing_tier, billing_period_start, billing_period_end")
    .eq("id", workspaceId)
    .maybeSingle();

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const tier = await resolveBillingTier(workspaceId);
  const limits = VOICE_TIER_LIMITS[tier];

  // Get billing period (default: this month)
  const now = new Date();
  const periodStart = workspace.billing_period_start
    ? new Date(workspace.billing_period_start)
    : new Date(now.getFullYear(), now.getMonth(), 1);

  const periodEnd = workspace.billing_period_end
    ? new Date(workspace.billing_period_end)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Calculate minutes used this period from voice_usage table
  const { data: voiceUsageRecords } = await db
    .from("voice_usage")
    .select("audio_duration_ms")
    .eq("workspace_id", workspaceId)
    .gte("created_at", periodStart.toISOString())
    .lte("created_at", periodEnd.toISOString());

  const minutesUsed = Math.ceil(
    ((voiceUsageRecords ?? []).reduce((sum: number, u: { audio_duration_ms: number }) => sum + u.audio_duration_ms, 0) / 1000 / 60)
  );

  // Get clones used
  const { data: clonesData } = await db
    .from("voice_models")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("is_cloned", true);

  const clonesUsed = clonesData?.length ?? 0;

  // Get concurrent A/B tests
  const { data: abTestsData } = await db
    .from("voice_ab_tests")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "running");

  const abTestsUsed = abTestsData?.length ?? 0;

  // Get concurrent calls peak
  const { data: callData } = await db
    .from("call_sessions")
    .select("call_started_at, call_ended_at")
    .eq("workspace_id", workspaceId)
    .gte("call_started_at", periodStart.toISOString())
    .lte("call_ended_at", periodEnd.toISOString());

  let concurrentCallsPeak = 0;
  if (callData && callData.length > 0) {
    const timeline: Array<{ time: Date; delta: number }> = [];
    for (const call of callData as { call_started_at: string; call_ended_at: string }[]) {
      timeline.push({ time: new Date(call.call_started_at), delta: 1 });
      if (call.call_ended_at) {
        timeline.push({ time: new Date(call.call_ended_at), delta: -1 });
      }
    }
    timeline.sort((a, b) => a.time.getTime() - b.time.getTime());

    let concurrent = 0;
    for (const event of timeline) {
      concurrent += event.delta;
      concurrentCallsPeak = Math.max(concurrentCallsPeak, concurrent);
    }
  }

  const overageMinutes = Math.max(0, minutesUsed - limits.voice_minutes);
  const overageRateKey = `${tier}_per_minute_cents` as keyof typeof VOICE_OVERAGE_RATES;
  const overageRate = (VOICE_OVERAGE_RATES[overageRateKey] as number) || 7; // default to lowest (enterprise) rate — never overcharge
  const estimatedOverageCents = overageMinutes * overageRate;

  return {
    workspace_id: workspaceId,
    billing_period_start: periodStart.toISOString(),
    billing_period_end: periodEnd.toISOString(),
    minutes_used: minutesUsed,
    minutes_limit: limits.voice_minutes,
    minutes_pct: limits.voice_minutes > 0 ? (minutesUsed / limits.voice_minutes) * 100 : 0,
    clones_used: clonesUsed,
    clones_limit: limits.voice_clones,
    ab_tests_used: abTestsUsed,
    ab_tests_limit: limits.ab_tests,
    concurrent_calls_peak: concurrentCallsPeak,
    concurrent_calls_limit: limits.concurrent_calls,
    is_over_limit: minutesUsed > limits.voice_minutes,
    overage_minutes: overageMinutes,
    estimated_overage_cents: estimatedOverageCents,
  };
}

/** Check if a specific voice feature is allowed for the workspace */
export async function checkVoiceLimit(workspaceId: string, feature: string): Promise<{ allowed: boolean; reason?: string }> {
  const tier = await resolveBillingTier(workspaceId);
  const limits = VOICE_TIER_LIMITS[tier];

  switch (feature) {
    case "voice_cloning": {
      const db = getDb();
      const { data: clonesData } = await db
        .from("voice_models")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("is_cloned", true);
      const clonesUsed = clonesData?.length ?? 0;
      const allowed = limits.voice_clones === -1 || clonesUsed < limits.voice_clones;
      return {
        allowed,
        reason: allowed ? undefined : `Voice cloning limit reached (${clonesUsed}/${limits.voice_clones})`,
      };
    }

    case "ab_testing": {
      const db = getDb();
      const { data: abTestsData } = await db
        .from("voice_ab_tests")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "running");
      const abTestsUsed = abTestsData?.length ?? 0;
      const allowed = limits.ab_tests === -1 || abTestsUsed < limits.ab_tests;
      return {
        allowed,
        reason: allowed ? undefined : `A/B test limit reached (${abTestsUsed}/${limits.ab_tests})`,
      };
    }

    case "premium_voices": {
      const allowed = limits.premium_voices;
      return {
        allowed,
        reason: allowed ? undefined : "Premium voices not available on this tier",
      };
    }

    case "custom_emotions": {
      const allowed = limits.custom_emotions;
      return {
        allowed,
        reason: allowed ? undefined : "Custom emotions not available on this tier",
      };
    }

    default:
      return { allowed: false, reason: `Unknown feature: ${feature}` };
  }
}

/** Record voice usage event (called by voice server) */
export async function recordVoiceUsage(workspaceId: string, data: VoiceUsageRecord): Promise<void> {
  const db = getDb();

  // Record in voice_usage table (already exists in migration)
  const { error } = await db.from("voice_usage").insert([
    {
      workspace_id: workspaceId,
      voice_id: data.voice_id,
      audio_duration_ms: data.duration_seconds * 1000,
      cost_cents: data.cost_cents,
      call_session_id: data.call_session_id || null,
      tts_model: "call-voice",
      input_chars: 0,
      emotion_used: null,
      industry: null,
      sample_rate: 24000,
      was_streaming: true,
    },
  ]);

  if (error) {
    console.error("[voice/billing] Failed to record usage:", error);
    throw new Error(`Failed to record voice usage: ${error.message}`);
  }
}

/** Calculate voice overage charges for the billing period */
export async function calculateVoiceOverage(workspaceId: string): Promise<VoiceOverageResult> {
  const db = getDb();
  const usage = await getVoiceUsage(workspaceId);
  const tier = await resolveBillingTier(workspaceId);

  // Get workspace subscription
  const { data: workspace } = await db
    .from("workspaces")
    .select("stripe_subscription_id")
    .eq("id", workspaceId)
    .maybeSingle();

  const subscriptionId = workspace?.stripe_subscription_id || null;

  // Calculate clone overages
  const cloneOverages = Math.max(0, usage.clones_used - usage.clones_limit);
  const cloneOveragesCents = cloneOverages * VOICE_OVERAGE_RATES.voice_clone_monthly;

  // Calculate A/B test overages
  const testOverages = Math.max(0, usage.ab_tests_used - usage.ab_tests_limit);
  const testOveragesCents = testOverages * VOICE_OVERAGE_RATES.ab_test_monthly;

  // Total: minutes + clones + tests
  const totalOverageCents =
    usage.estimated_overage_cents + cloneOveragesCents + testOveragesCents;

  return {
    subscription_id: subscriptionId,
    overage_minutes: usage.overage_minutes,
    overage_amount_cents: usage.estimated_overage_cents,
    clone_overages_monthly: cloneOveragesCents,
    ab_test_overages_monthly: testOveragesCents,
    total_overage_cents: totalOverageCents,
    rate_per_minute_cents: (VOICE_OVERAGE_RATES[`${tier}_per_minute_cents` as keyof typeof VOICE_OVERAGE_RATES] as number) || 7,
  };
}

// ─── PROFITABILITY ENGINE ─────────────────────────────────────────────
// Smart usage alerts + upsell triggers that maximize MRR while keeping users happy.

export type UsageAlertLevel = "healthy" | "approaching" | "warning" | "critical" | "overage";

export interface UsageAlert {
  level: UsageAlertLevel;
  pctUsed: number;
  minutesRemaining: number;
  daysRemaining: number;
  projectedOverageMinutes: number;
  projectedOverageCost: number;
  upsellRecommendation: UpsellRecommendation | null;
}

export interface UpsellRecommendation {
  currentTier: string;
  recommendedTier: string;
  currentPrice: number;
  recommendedPrice: number;
  savings: number; // How much they'd save vs overage if they upgrade
  reason: string;
}

const TIER_PRICES_MONTHLY: Record<string, number> = {
  solo: 9700,      // $97
  business: 29700, // $297
  scale: 59700,    // $597
  enterprise: 99700, // $997
};

const TIER_UPGRADE_PATH: Record<string, string> = {
  solo: "business",
  business: "scale",
  scale: "enterprise",
};

/**
 * Evaluate usage and return alert level + smart upsell recommendation.
 * Called by dashboard, billing page, and notification system.
 */
export function evaluateUsageAlert(usage: VoiceUsageMetrics, tier: string): UsageAlert {
  const pctUsed = usage.minutes_pct;
  const daysInPeriod = Math.max(1, Math.ceil(
    (new Date(usage.billing_period_end).getTime() - new Date(usage.billing_period_start).getTime()) / 86400000
  ));
  const daysElapsed = Math.max(1, Math.ceil(
    (Date.now() - new Date(usage.billing_period_start).getTime()) / 86400000
  ));
  const daysRemaining = Math.max(0, daysInPeriod - daysElapsed);

  // Project total usage at current burn rate
  const dailyRate = usage.minutes_used / daysElapsed;
  const projectedTotal = dailyRate * daysInPeriod;
  const projectedOverage = Math.max(0, projectedTotal - usage.minutes_limit);
  const overageRateKey = `${tier}_per_minute_cents` as keyof typeof VOICE_OVERAGE_RATES;
  const overageRate = (VOICE_OVERAGE_RATES[overageRateKey] as number) || 7;
  const projectedOverageCost = Math.round(projectedOverage * overageRate);

  // Determine alert level
  let level: UsageAlertLevel;
  if (pctUsed > 100) level = "overage";
  else if (pctUsed >= 90) level = "critical";
  else if (pctUsed >= 75) level = "warning";
  else if (pctUsed >= 60) level = "approaching";
  else level = "healthy";

  // Calculate upsell recommendation if projected overage > half the upgrade price difference
  let upsellRecommendation: UpsellRecommendation | null = null;
  const nextTier = TIER_UPGRADE_PATH[tier];
  if (nextTier && projectedOverageCost > 0) {
    const currentPrice = TIER_PRICES_MONTHLY[tier] ?? 0;
    const nextPrice = TIER_PRICES_MONTHLY[nextTier] ?? 0;
    const upgradeDelta = nextPrice - currentPrice;
    const savings = projectedOverageCost - upgradeDelta;

    // Recommend upgrade if overage cost exceeds 50% of the tier price difference
    if (projectedOverageCost > upgradeDelta * 0.5) {
      const displayNames: Record<string, string> = {
        solo: "Starter", business: "Growth", scale: "Business", enterprise: "Agency",
      };
      upsellRecommendation = {
        currentTier: displayNames[tier] ?? tier,
        recommendedTier: displayNames[nextTier] ?? nextTier,
        currentPrice: currentPrice / 100,
        recommendedPrice: nextPrice / 100,
        savings: Math.max(0, savings) / 100,
        reason: savings > 0
          ? `You'd save $${(savings / 100).toFixed(0)}/mo vs overage charges`
          : `Upgrading costs only $${(upgradeDelta / 100).toFixed(0)}/mo more and includes ${VOICE_TIER_LIMITS[nextTier as keyof typeof VOICE_TIER_LIMITS]?.voice_minutes ?? 0} minutes`,
      };
    }
  }

  return {
    level,
    pctUsed: Math.round(pctUsed * 10) / 10,
    minutesRemaining: Math.max(0, usage.minutes_limit - usage.minutes_used),
    daysRemaining,
    projectedOverageMinutes: Math.round(projectedOverage),
    projectedOverageCost,
    upsellRecommendation,
  };
}

/**
 * Check if workspace should receive a usage notification.
 * Returns the notification type to send, or null if none needed.
 */
export function getUsageNotificationType(
  alert: UsageAlert,
  lastNotifiedLevel: UsageAlertLevel | null,
): "approaching_limit" | "at_limit" | "over_limit" | "upgrade_recommended" | null {
  // Don't re-notify for the same level
  const levelPriority: Record<UsageAlertLevel, number> = {
    healthy: 0, approaching: 1, warning: 2, critical: 3, overage: 4,
  };
  const currentPriority = levelPriority[alert.level];
  const lastPriority = lastNotifiedLevel ? levelPriority[lastNotifiedLevel] : -1;
  if (currentPriority <= lastPriority) return null;

  switch (alert.level) {
    case "approaching": return "approaching_limit";
    case "warning": return "approaching_limit";
    case "critical": return alert.upsellRecommendation ? "upgrade_recommended" : "at_limit";
    case "overage": return "over_limit";
    default: return null;
  }
}

/**
 * Revenue per minute by tier — used for ROI calculations in dashboard.
 *
 * With smart model routing (see cost-optimizer.ts):
 *   Blended cost drops from ~3.5¢/min → ~1.2¢/min
 *   Economy model for greetings/routing/closings (0.9¢/min)
 *   Standard model for scheduling/qualification (1.8¢/min)
 *   Premium model only for objections/negotiations (3.2¢/min)
 *   + 30% TTS cache hit rate on common phrases
 */
export const REVENUE_PER_MINUTE = {
  // Overage revenue (per extra minute beyond plan)
  solo:       { cost_cents: 1.2, revenue_cents: 10, margin_pct: 88 },
  business:   { cost_cents: 1.2, revenue_cents: 10, margin_pct: 88 },
  scale:      { cost_cents: 1.2, revenue_cents: 8,  margin_pct: 85 },
  enterprise: { cost_cents: 1.2, revenue_cents: 7,  margin_pct: 83 },
  // Base plan revenue (subscription ÷ included minutes)
  solo_included:       { cost_cents: 1.2, revenue_per_minute_from_sub_cents: 19.4,  margin_pct: 94 },
  business_included:   { cost_cents: 1.2, revenue_per_minute_from_sub_cents: 11.88, margin_pct: 90 },
  scale_included:      { cost_cents: 1.2, revenue_per_minute_from_sub_cents: 9.95,  margin_pct: 88 },
  enterprise_included: { cost_cents: 1.2, revenue_per_minute_from_sub_cents: 6.65,  margin_pct: 82 },
} as const;

/**
 * Premium add-ons — high-margin revenue multipliers.
 * Most are pure software with zero marginal cost.
 */
export const PREMIUM_ADDONS = {
  voice_clone:          { name: "Voice Clone Slot",              price_cents: 1500, cost_cents: 50,  margin_pct: 97 },
  ab_test_slot:         { name: "A/B Test Slot",                 price_cents: 500,  cost_cents: 0,   margin_pct: 100 },
  priority_support:     { name: "Priority Support",              price_cents: 4900, cost_cents: 500, margin_pct: 90 },
  analytics_pro:        { name: "Advanced Analytics",            price_cents: 2900, cost_cents: 0,   margin_pct: 100 },
  dedicated_number:     { name: "Dedicated Phone Number",        price_cents: 1500, cost_cents: 100, margin_pct: 93 },
  white_label:          { name: "White Label / Agency Branding", price_cents: 9900, cost_cents: 0,   margin_pct: 100 },
  multi_language:       { name: "Multi-Language Pack",           price_cents: 1900, cost_cents: 0,   margin_pct: 100 },
  compliance_recording: { name: "Compliance Recording & Audit",  price_cents: 2900, cost_cents: 200, margin_pct: 93 },
} as const;

/**
 * Annual pricing — 2 months free (16.7% off).
 * 100% prepaid = zero churn risk = higher LTV than monthly.
 */
export const ANNUAL_PRICING = {
  solo:       { monthly: 9700,  annual: 97000,  effective_monthly: 8083,  discount_pct: 17, ltv_boost_pct: 120 },
  business:   { monthly: 29700, annual: 297000, effective_monthly: 24750, discount_pct: 17, ltv_boost_pct: 125 },
  scale:      { monthly: 59700, annual: 597000, effective_monthly: 49750, discount_pct: 17, ltv_boost_pct: 130 },
  enterprise: { monthly: 99700, annual: 997000, effective_monthly: 83083, discount_pct: 17, ltv_boost_pct: 135 },
} as const;

// ─── MINUTE PACKS (ONE-TIME PURCHASES) ────────────────────────────────
// High-margin minute packs users can buy when they run out or want to stock up.
// Larger packs = better per-minute price (volume incentive) but still 85-94% margins.

export interface MinutePackDef {
  id: string;
  minutes: number;
  price_cents: number;
  price_display: string;
  per_minute_cents: number;
  savings_pct: number; // vs overage rate at $0.10/min
  margin_pct: number;
  popular?: boolean;
  best_value?: boolean;
}

export const MINUTE_PACKS: MinutePackDef[] = [
  {
    id: "pack_100",
    minutes: 100,
    price_cents: 1500,
    price_display: "$15",
    per_minute_cents: 15,
    savings_pct: 0,        // Baseline — same as overage for small buyers
    margin_pct: 92,        // Cost: 1.2¢/min × 100 = $1.20, revenue $15 → 92%
  },
  {
    id: "pack_250",
    minutes: 250,
    price_cents: 2900,
    price_display: "$29",
    per_minute_cents: 11.6,
    savings_pct: 23,       // 23% cheaper than overage at $0.10/min
    margin_pct: 90,        // Cost: 1.2¢ × 250 = $3, revenue $29 → 90%
  },
  {
    id: "pack_500",
    minutes: 500,
    price_cents: 4900,
    price_display: "$49",
    per_minute_cents: 9.8,
    savings_pct: 35,
    margin_pct: 88,        // Cost: 1.2¢ × 500 = $6, revenue $49 → 88%
    popular: true,
  },
  {
    id: "pack_1000",
    minutes: 1000,
    price_cents: 8900,
    price_display: "$89",
    per_minute_cents: 8.9,
    savings_pct: 41,
    margin_pct: 87,        // Cost: 1.2¢ × 1000 = $12, revenue $89 → 87%
  },
  {
    id: "pack_2500",
    minutes: 2500,
    price_cents: 17900,
    price_display: "$179",
    per_minute_cents: 7.16,
    savings_pct: 52,
    margin_pct: 83,        // Cost: 1.2¢ × 2500 = $30, revenue $179 → 83%
    best_value: true,
  },
  {
    id: "pack_5000",
    minutes: 5000,
    price_cents: 29900,
    price_display: "$299",
    per_minute_cents: 5.98,
    savings_pct: 60,
    margin_pct: 80,        // Cost: 1.2¢ × 5000 = $60, revenue $299 → 80%
  },
];

/** Find a minute pack by ID */
export function getMinutePack(packId: string): MinutePackDef | undefined {
  return MINUTE_PACKS.find((p) => p.id === packId);
}

/** Credit purchased minutes to workspace balance */
export async function creditMinutePack(
  workspaceId: string,
  packId: string,
  stripePaymentIntentId: string,
): Promise<{ credited: boolean; minutes: number }> {
  const pack = getMinutePack(packId);
  if (!pack) return { credited: false, minutes: 0 };

  const db = getDb();

  // Idempotency: check if this payment was already credited
  const { data: existing } = await db
    .from("minute_pack_purchases")
    .select("id")
    .eq("stripe_payment_intent_id", stripePaymentIntentId)
    .maybeSingle();

  if (existing) {
    return { credited: false, minutes: 0 }; // Already processed
  }

  // Record the purchase
  await db.from("minute_pack_purchases").insert({
    workspace_id: workspaceId,
    pack_id: packId,
    minutes: pack.minutes,
    price_cents: pack.price_cents,
    stripe_payment_intent_id: stripePaymentIntentId,
    credited_at: new Date().toISOString(),
  });

  // Add bonus minutes to workspace balance
  // Uses upsert on workspace_minute_balance (workspace_id is primary key)
  const { data: currentBalance } = await db
    .from("workspace_minute_balance")
    .select("bonus_minutes")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const currentBonus = (currentBalance as { bonus_minutes?: number } | null)?.bonus_minutes ?? 0;
  const newBonus = currentBonus + pack.minutes;

  if (currentBalance) {
    await db
      .from("workspace_minute_balance")
      .update({ bonus_minutes: newBonus, updated_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId);
  } else {
    await db
      .from("workspace_minute_balance")
      .insert({ workspace_id: workspaceId, bonus_minutes: newBonus });
  }

  return { credited: true, minutes: pack.minutes };
}
