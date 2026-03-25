/**
 * Voice Billing API
 * GET: Returns current voice usage, limits, overage estimate, and tier features
 * POST: Records voice usage (called by voice server webhook after each call)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import {
  getVoiceUsage,
  recordVoiceUsage,
  calculateVoiceOverage,
  VOICE_TIER_LIMITS,
  type VoiceUsageRecord,
} from "@/lib/voice/billing";
import { resolveBillingTier } from "@/lib/feature-gate/resolver";
import { canUseVoice } from "@/lib/voice/feature-gate";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    // Get usage and tier
    const usage = await getVoiceUsage(workspaceId);
    const tier = await resolveBillingTier(workspaceId);
    const _limits = VOICE_TIER_LIMITS[tier];
    const overage = await calculateVoiceOverage(workspaceId);

    // Build response with usage, limits, overage, and features
    return NextResponse.json({
      workspace_id: workspaceId,
      tier,
      billing_period: {
        start: usage.billing_period_start,
        end: usage.billing_period_end,
      },
      usage: {
        voice_minutes: {
          used: usage.minutes_used,
          limit: usage.minutes_limit,
          percentage: Math.round(usage.minutes_pct),
          overage: usage.overage_minutes,
        },
        voice_clones: {
          used: usage.clones_used,
          limit: usage.clones_limit,
          overage: Math.max(0, usage.clones_used - usage.clones_limit),
        },
        ab_tests: {
          used: usage.ab_tests_used,
          limit: usage.ab_tests_limit,
          overage: Math.max(0, usage.ab_tests_used - usage.ab_tests_limit),
        },
        concurrent_calls: {
          peak: usage.concurrent_calls_peak,
          limit: usage.concurrent_calls_limit,
          available: Math.max(0, usage.concurrent_calls_limit - usage.concurrent_calls_peak),
        },
      },
      overage_charges: {
        minutes_overage_cents: overage.overage_amount_cents,
        clones_overage_cents: overage.clone_overages_monthly,
        ab_tests_overage_cents: overage.ab_test_overages_monthly,
        total_overage_cents: overage.total_overage_cents,
        rate_per_minute_cents: overage.rate_per_minute_cents,
      },
      features: {
        voice_cloning: canUseVoice(tier, "voice_cloning"),
        ab_testing: canUseVoice(tier, "ab_testing"),
        premium_voices: canUseVoice(tier, "premium_voices"),
        custom_emotions: canUseVoice(tier, "custom_emotions"),
      },
      warnings: {
        is_over_limit: usage.is_over_limit,
        approaching_limit: usage.minutes_pct >= 75 && usage.minutes_pct < 100,
      },
    });
  } catch (error) {
    console.error("[API] voice billing GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const body = await req.json();
    const { voice_id, duration_seconds, is_premium_voice, is_cloned_voice, ab_test_id, cost_cents, call_session_id } = body;

    // Validate required fields
    if (!voice_id || !duration_seconds) {
      return NextResponse.json(
        { error: "voice_id and duration_seconds are required" },
        { status: 400 }
      );
    }

    // Validate duration is a positive number within reasonable bounds (max 2 hours)
    const safeDuration = Number(duration_seconds);
    if (isNaN(safeDuration) || safeDuration <= 0 || safeDuration > 7200) {
      return NextResponse.json(
        { error: "duration_seconds must be a positive number (max 7200)" },
        { status: 400 }
      );
    }

    // Record the usage
    const usageRecord: VoiceUsageRecord = {
      workspace_id: workspaceId,
      voice_id,
      duration_seconds,
      is_premium_voice: is_premium_voice ?? false,
      is_cloned_voice: is_cloned_voice ?? false,
      ab_test_id: ab_test_id ?? undefined,
      cost_cents: cost_cents ?? 0,
      call_session_id: call_session_id ?? undefined,
    };

    await recordVoiceUsage(workspaceId, usageRecord);

    // Get updated usage and check if over limit
    const usage = await getVoiceUsage(workspaceId);

    return NextResponse.json(
      {
        recorded: true,
        minutes_used: usage.minutes_used,
        minutes_limit: usage.minutes_limit,
        is_over_limit: usage.is_over_limit,
        overage_minutes: usage.overage_minutes,
        estimated_overage_cents: usage.estimated_overage_cents,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] voice billing POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
