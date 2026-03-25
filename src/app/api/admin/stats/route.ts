/**
 * Admin dashboard stats. Comprehensive overview of users, workspaces, and system health.
 * Allowed only when session user email === ADMIN_EMAIL.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdmin, forbidden } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return forbidden();
  }

  const db = getDb();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayIso = todayStart.toISOString();
  const weekAgoIso = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgoIso = new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, todayStart.getDate()).toISOString();

  const result: Record<string, any> = {};

  // Users stats
  try {
    const { count: totalUsers } = await db.from("users").select("id", { count: "exact", head: true });
    const { count: usersToday } = await db.from("users").select("id", { count: "exact", head: true }).gte("created_at", todayIso);
    const { count: usersWeek } = await db.from("users").select("id", { count: "exact", head: true }).gte("created_at", weekAgoIso);
    const { count: usersMonth } = await db.from("users").select("id", { count: "exact", head: true }).gte("created_at", monthAgoIso);
    const { data: recentUsers } = await db
      .from("users")
      .select("id, email, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    result.users = {
      total: totalUsers ?? 0,
      today: usersToday ?? 0,
      this_week: usersWeek ?? 0,
      this_month: usersMonth ?? 0,
      recent: (recentUsers ?? []).map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.full_name,
        created_at: u.created_at,
      })),
    };
  } catch (err) {
    result.users = { error: "Failed to fetch users" };
  }

  // Workspaces stats
  try {
    const { count: totalWorkspaces } = await db.from("workspaces").select("id", { count: "exact", head: true });
    const { count: activeWorkspaces } = await db
      .from("workspaces")
      .select("id", { count: "exact", head: true })
      .or("status.neq.paused,kill_switch.eq.false");

    // Count workspaces by billing_tier (no RPC available)
    const { data: allWs } = await db.from("workspaces").select("billing_tier");
    const billingDist: Record<string, number> = {};
    (allWs ?? []).forEach((w: any) => {
      const tier = w.billing_tier || "none";
      billingDist[tier] = (billingDist[tier] || 0) + 1;
    });

    const { count: monthlyBilling } = await db.from("workspaces").select("id", { count: "exact", head: true }).eq("billing_interval", "monthly");
    const { count: annualBilling } = await db.from("workspaces").select("id", { count: "exact", head: true }).eq("billing_interval", "annual");
    const { data: recentWorkspaces } = await db
      .from("workspaces")
      .select("id, name, billing_tier, created_at, billing_status")
      .order("created_at", { ascending: false })
      .limit(20);

    result.workspaces = {
      total: totalWorkspaces ?? 0,
      active: activeWorkspaces ?? 0,
      billing_distribution: billingDist,
      billing_intervals: {
        monthly: monthlyBilling ?? 0,
        annual: annualBilling ?? 0,
      },
      recent: (recentWorkspaces ?? []).map((w: any) => ({
        id: w.id,
        name: w.name,
        billing_tier: w.billing_tier,
        billing_status: w.billing_status,
        created_at: w.created_at,
      })),
    };
  } catch (err) {
    result.workspaces = { error: "Failed to fetch workspaces" };
  }

  // Agents stats
  try {
    const { count: totalAgents } = await db.from("agents").select("id", { count: "exact", head: true });
    result.agents = { total: totalAgents ?? 0 };
  } catch (err) {
    result.agents = { error: "Failed to fetch agents" };
  }

  // Call sessions stats
  try {
    const { count: totalCallSessions } = await db.from("call_sessions").select("id", { count: "exact", head: true });
    const { count: callSessionsToday } = await db.from("call_sessions").select("id", { count: "exact", head: true }).gte("started_at", todayIso);
    result.calls = {
      total: totalCallSessions ?? 0,
      today: callSessionsToday ?? 0,
    };
  } catch (err) {
    result.calls = { error: "Failed to fetch call sessions" };
  }

  // Leads stats
  try {
    const { count: totalLeads } = await db.from("leads").select("id", { count: "exact", head: true });
    result.leads = { total: totalLeads ?? 0 };
  } catch (err) {
    result.leads = { error: "Failed to fetch leads" };
  }

  // Conversations stats
  try {
    const { count: totalConversations } = await db.from("conversations").select("id", { count: "exact", head: true });
    result.conversations = { total: totalConversations ?? 0 };
  } catch (err) {
    result.conversations = { error: "Failed to fetch conversations" };
  }

  // Activation events stats
  try {
    const { count: totalActivations } = await db.from("activation_events").select("id", { count: "exact", head: true });
    result.activation_events = { total: totalActivations ?? 0 };
  } catch (err) {
    result.activation_events = { error: "Failed to fetch activation events" };
  }

  // Growth: users per day for last 30 days
  try {
    const { data: growth } = await db
      .from("users")
      .select("created_at")
      .gte("created_at", new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const growthByDay: Record<string, number> = {};
    (growth ?? []).forEach((u: any) => {
      const dateStr = u.created_at.split("T")[0];
      growthByDay[dateStr] = (growthByDay[dateStr] || 0) + 1;
    });

    result.growth_30d = Object.entries(growthByDay)
      .sort()
      .map(([date, count]) => ({ date, count }));
  } catch (err) {
    result.growth_30d = [];
  }

  // Voice server health check
  let voiceServerOk = false;
  let voiceServerLatencyMs: number | null = null;
  let voiceServerHealth: Record<string, unknown> | null = null;
  let voiceServerStatus: Record<string, unknown> | null = null;

  try {
    const voiceUrl = process.env.VOICE_SERVER_URL;
    if (voiceUrl) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const start = Date.now();
      const resp = await fetch(`${voiceUrl}/health`, {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
      }).catch(() => null);
      clearTimeout(timeout);

      if (resp?.ok) {
        voiceServerOk = true;
        voiceServerLatencyMs = Date.now() - start;
        voiceServerHealth = (await resp.json().catch(() => null)) as Record<string, unknown> | null;

        const statusResp = await fetch(`${voiceUrl}/status`, { method: "GET", cache: "no-store" }).catch(() => null);
        if (statusResp?.ok) voiceServerStatus = (await statusResp.json().catch(() => null)) as Record<string, unknown> | null;
      }
    }
  } catch {
    voiceServerOk = false;
  }

  result.health = {
    voice_server: voiceServerOk ? "Online" : "Offline",
    voice_server_details: {
      ok: voiceServerOk,
      latency_ms: voiceServerLatencyMs,
      active_sessions: (voiceServerStatus?.active_conversations as number | undefined) ?? null,
      voices_available: (voiceServerStatus?.voices_available as number | undefined) ?? null,
      max_concurrent: (voiceServerStatus?.max_concurrent as number | undefined) ?? null,
      tts_engine: (voiceServerHealth?.tts_engine as string | undefined) ?? null,
      stt_engine: (voiceServerHealth?.stt_engine as string | undefined) ?? null,
    },
  };

  return NextResponse.json(result);
}
