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
    voice_minutes: 100, // 100 min included (matches billing-plans.ts)
    voice_clones: 0, // No cloning on solo
    ab_tests: 0, // No A/B testing
    concurrent_calls: 2, // 2 simultaneous
    voices_available: 6, // Standard voices only
    premium_voices: false, // ElevenLabs premium = add-on
    custom_emotions: false,
  },
  business: {
    voice_minutes: 500, // 500 min included (matches billing-plans.ts)
    voice_clones: 3, // 3 cloned voices
    ab_tests: 2, // 2 concurrent A/B tests
    concurrent_calls: 10, // 10 simultaneous
    voices_available: 40, // Full library
    premium_voices: true,
    custom_emotions: true,
  },
  scale: {
    voice_minutes: 3000, // 3000 min included (matches billing-plans.ts)
    voice_clones: 10, // 10 cloned voices
    ab_tests: 5, // 5 concurrent A/B tests
    concurrent_calls: 25, // 25 simultaneous
    voices_available: 40, // Full library + priority
    premium_voices: true,
    custom_emotions: true,
  },
  enterprise: {
    voice_minutes: -1, // Unlimited
    voice_clones: -1, // Unlimited
    ab_tests: -1, // Unlimited
    concurrent_calls: 100, // Custom
    voices_available: 40,
    premium_voices: true,
    custom_emotions: true,
  },
};

export type VoiceTierLimits = (typeof VOICE_TIER_LIMITS)[BillingTier];

/**
 * Voice overage rates — tiered per billing-plans.ts:
 * Solo: $0.30/min, Business: $0.20/min, Scale: $0.12/min
 * At Phase 2 COGS of $0.058/min, margins are 5.2x / 3.4x / 2.1x respectively.
 */
export const VOICE_OVERAGE_RATES = {
  solo_per_minute_cents: 30, // $0.30/min (matches billing-plans.ts)
  business_per_minute_cents: 20, // $0.20/min
  scale_per_minute_cents: 12, // $0.12/min
  enterprise_per_minute_cents: 0, // Negotiated
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
    .eq("is_active", true);

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
  const overageRate = (VOICE_OVERAGE_RATES[overageRateKey] as number) || 20; // default to business rate
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
        .eq("is_active", true);
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
    rate_per_minute_cents: (VOICE_OVERAGE_RATES[`${tier}_per_minute_cents` as keyof typeof VOICE_OVERAGE_RATES] as number) || 20,
  };
}
