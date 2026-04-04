/**
 * GET /api/dashboard/summary?workspace_id=
 * Aggregates for unified dashboard: revenue signal, KPIs, needs attention, activity, campaigns.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { BILLING_PLANS, normalizeTier } from "@/lib/billing-plans";
import { log } from "@/lib/logger";

function startOfMonth(d: Date): Date {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function prevMonthStart(d: Date): Date {
  const x = startOfMonth(d);
  x.setMonth(x.getMonth() - 1);
  return x;
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const auth = await requireWorkspaceAccess(req, workspaceId);
  if (auth) return auth;

  const db = getDb();
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const prevStart = prevMonthStart(now).toISOString();
  const prevEnd = startOfMonth(now).toISOString();

  // Resolve plan minutes from workspace billing tier
  let minutesLimit = 1000;
  try {
    const { data: ws } = await db
      .from("workspaces")
      .select("billing_tier")
      .eq("id", workspaceId)
      .maybeSingle();
    const tier = normalizeTier((ws as { billing_tier?: string } | null)?.billing_tier);
    minutesLimit = BILLING_PLANS[tier]?.includedMinutes ?? 1000;

    // Add bonus minutes if purchased
    const { data: balance } = await db
      .from("workspace_minute_balance")
      .select("bonus_minutes")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    minutesLimit += (balance as { bonus_minutes?: number } | null)?.bonus_minutes ?? 0;
  } catch (error) {
    log("error", "dashboard.summary.workspace-billing", { workspaceId, error });
  }

  let callsAnswered = 0;
  let callsPrev = 0;
  let minutesUsed = 0;
  let appointmentsBooked = 0;
  let _appointmentsPrev = 0;
  let followUpsSent = 0;
  let revenueCents = 0;
  let missedCallsRecovered = 0;
  let outboundCalls = 0;
  let inboundCalls = 0;
  let qualifiedLeads = 0;
  let phoneConfigured = false;
  const needsAttention: { id: string; name: string; reason: string; phone?: string | null }[] = [];
  const activity: { id: string; at: string; line: string }[] = [];
  const campaigns: { id: string; name: string; status: string; enrolled: number; booked: number }[] = [];

  try {
    const { count: c1 } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", monthStart)
      .not("call_ended_at", "is", null);
    callsAnswered = c1 ?? 0;
  } catch (error) {
    log("error", "dashboard.summary.calls-answered", { workspaceId, error });
  }

  try {
    const { count: c0 } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", prevStart)
      .lt("call_started_at", prevEnd)
      .not("call_ended_at", "is", null);
    callsPrev = c0 ?? 0;
  } catch (error) {
    log("error", "dashboard.summary.calls-prev", { workspaceId, error });
  }

  try {
    const { data: sessions } = await db
      .from("call_sessions")
      .select("call_started_at, call_ended_at")
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", monthStart)
      .not("call_ended_at", "is", null)
      .limit(5000);
    if (sessions?.length) {
      for (const row of sessions) {
        const a = row.call_started_at ? new Date(row.call_started_at).getTime() : 0;
        const b = row.call_ended_at ? new Date(row.call_ended_at).getTime() : 0;
        if (b > a) minutesUsed += Math.ceil((b - a) / 60000);
      }
    }
  } catch (error) {
    log("error", "dashboard.summary.minutes-used", { workspaceId, error });
  }

  try {
    const { count: ap } = await db
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", monthStart)
      .in("status", ["confirmed", "completed"]);
    appointmentsBooked = ap ?? 0;
  } catch (error) {
    log("error", "dashboard.summary.appointments-booked", { workspaceId, error });
  }

  try {
    const { count: ap2 } = await db
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", prevStart)
      .lt("created_at", prevEnd)
      .in("status", ["confirmed", "completed"]);
    _appointmentsPrev = ap2 ?? 0;
  } catch (error) {
    log("error", "dashboard.summary.query", { workspaceId, error });
  }

  try {
    const { count: msg } = await db
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("direction", "outbound")
      .gte("sent_at", monthStart);
    followUpsSent = msg ?? 0;
  } catch (error) {
    log("error", "dashboard.summary.query", { workspaceId, error });
  }

  try {
    const { data: daily } = await db
      .from("daily_metrics")
      .select("total_revenue_cents, date")
      .eq("workspace_id", workspaceId)
      .gte("date", monthStart.slice(0, 10));
    if (daily?.length) {
      for (const row of daily) {
        const v = Number((row as { total_revenue_cents?: number }).total_revenue_cents);
        if (!Number.isNaN(v)) revenueCents += v;
      }
    }
  } catch (error) {
    log("error", "dashboard.summary.query", { workspaceId, error });
  }


  // --- Inbound vs Outbound breakdown ---
  try {
    const { count: ic } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", monthStart)
      .not("call_ended_at", "is", null)
      .eq("direction", "inbound");
    inboundCalls = ic ?? 0;
  } catch (error) {
    log("error", "dashboard.summary.query", { workspaceId, error });
  }

  try {
    const { count: oc } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", monthStart)
      .not("call_ended_at", "is", null)
      .eq("direction", "outbound");
    outboundCalls = oc ?? 0;
  } catch (error) {
    log("error", "dashboard.summary.query", { workspaceId, error });
  }

  // --- Unanswered calls recovered (outbound calls from speed-to-lead or no-show recovery) ---
  try {
    const { count: mr } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", monthStart)
      .eq("direction", "outbound")
      .in("outcome", ["booked", "qualified", "interested", "callback_scheduled"]);
    missedCallsRecovered = mr ?? 0;
  } catch (error) {
    log("error", "dashboard.summary.query", { workspaceId, error });
  }

  // --- Qualified leads ---
  try {
    const { count: ql } = await db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", monthStart)
      .in("status", ["qualified", "appointment_set", "won"]);
    qualifiedLeads = ql ?? 0;
  } catch (error) {
    log("error", "dashboard.summary.query", { workspaceId, error });
  }

  // --- Agent configured ---
  let agentConfigured = false;
  try {
    const { count: ac } = await db
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    agentConfigured = (ac ?? 0) > 0;
  } catch (error) {
    log("error", "dashboard.summary.query", { workspaceId, error });
  }

  // --- Phone number configured ---
  try {
    const { count: pn } = await db
      .from("phone_configs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "active");
    phoneConfigured = (pn ?? 0) > 0;
  } catch (error) {
    log("error", "dashboard.summary.query", { workspaceId, error });
  }

  try {
    const { data: leads } = await db
      .from("leads")
      .select("id, name, phone, state, created_at")
      .eq("workspace_id", workspaceId)
      .eq("state", "NEW")
      .order("created_at", { ascending: false })
      .limit(7);
    if (leads?.length) {
      for (const L of leads) {
        needsAttention.push({
          id: L.id as string,
          name: (L.name as string) || "Unknown",
          reason: "New lead — follow up",
          phone: L.phone as string | null,
        });
      }
    }
  } catch (error) {
    log("error", "dashboard.summary.query", { workspaceId, error });
  }

  try {
    const { data: calls } = await db
      .from("call_sessions")
      .select("id, call_started_at, outcome, direction")
      .eq("workspace_id", workspaceId)
      .order("call_started_at", { ascending: false })
      .limit(12);
    if (calls?.length) {
      for (const c of calls) {
        const dir = (c.direction as string) === "outbound" ? "Outbound" : "Inbound";
        const out = (c.outcome as string) || "handled";
        activity.push({
          id: c.id as string,
          at: (c.call_started_at as string) || new Date().toISOString(),
          line: `${dir} call · ${out}`,
        });
      }
    }
  } catch (error) {
    log("error", "dashboard.summary.query", { workspaceId, error });
  }

  try {
    const { data: camps } = await db
      .from("campaigns")
      .select("id, name, status, total_contacts, appointments_booked, called")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .limit(6);
    if (camps?.length) {
      for (const c of camps) {
        campaigns.push({
          id: c.id as string,
          name: (c.name as string) || "Campaign",
          status: c.status as string,
          enrolled: Number(c.total_contacts) || 0,
          booked: Number(c.appointments_booked) || 0,
        });
      }
    }
  } catch (error) {
    log("error", "dashboard.summary.query", { workspaceId, error });
  }

  // --- Revenue leakage signals ---
  let missedCallsToday = 0;
  let noShowsThisWeek = 0;
  let staleLeadsCount = 0;
  let pendingFollowUps = 0;

  // Missed calls today (unanswered)
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const { count: mc } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", todayStr)
      .is("call_ended_at", null)
      .in("outcome", ["missed", "no_answer", "voicemail"]);
    missedCallsToday = mc ?? 0;
  } catch (error) {
    log("error", "dashboard.summary.query", { workspaceId, error });
  }

  // No-shows this week
  try {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: ns } = await db
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "no_show")
      .gte("start_time", weekAgo);
    noShowsThisWeek = ns ?? 0;
  } catch (error) {
    log("error", "dashboard.summary.query", { workspaceId, error });
  }

  // Stale leads (no activity 7+ days, not won/lost)
  try {
    const staleDate = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: sl } = await db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .lte("last_activity_at", staleDate)
      .not("state", "in", '("won","lost","opted_out")');
    staleLeadsCount = sl ?? 0;
  } catch (error) {
    log("error", "dashboard.summary.query", { workspaceId, error });
  }

  // Pending follow-ups
  try {
    const { count: pf } = await db
      .from("follow_up_queue")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "pending");
    pendingFollowUps = pf ?? 0;
  } catch (error) {
    log("error", "dashboard.summary.query", { workspaceId, error });
  }

  const trendPct =
    callsPrev > 0 ? Math.round(((callsAnswered - callsPrev) / callsPrev) * 100) : callsAnswered > 0 ? 100 : 0;

  const conversionRate = callsAnswered > 0 ? Math.min(100, Math.round((appointmentsBooked / callsAnswered) * 100)) : null;

  return NextResponse.json({
    period: "month",
    revenue_recovered_cents: revenueCents,
    revenue_trend_pct: trendPct,
    calls_answered: callsAnswered,
    inbound_calls: inboundCalls,
    outbound_calls: outboundCalls,
    appointments_booked: appointmentsBooked,
    follow_ups_sent: followUpsSent,
    missed_calls_recovered: missedCallsRecovered,
    qualified_leads: qualifiedLeads,
    conversion_rate: conversionRate ?? 0,
    conversion_rate_has_data: conversionRate !== null,
    minutes_used: minutesUsed,
    minutes_limit: minutesLimit,
    agent_configured: agentConfigured,
    phone_number_configured: phoneConfigured,
    needs_attention: needsAttention,
    activity,
    campaigns,
    missed_calls_today: missedCallsToday,
    no_shows_this_week: noShowsThisWeek,
    stale_leads: staleLeadsCount,
    pending_follow_ups: pendingFollowUps,
  });
}
