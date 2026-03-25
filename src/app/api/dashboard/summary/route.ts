/**
 * GET /api/dashboard/summary?workspace_id=
 * Aggregates for unified dashboard: revenue signal, KPIs, needs attention, activity, campaigns.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

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
  } catch { /* table missing */ }

  try {
    const { count: c0 } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", prevStart)
      .lt("call_started_at", prevEnd)
      .not("call_ended_at", "is", null);
    callsPrev = c0 ?? 0;
  } catch { /* ignore */ }

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
  } catch { /* ignore */ }

  try {
    const { count: ap } = await db
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", monthStart)
      .in("status", ["confirmed", "completed"]);
    appointmentsBooked = ap ?? 0;
  } catch { /* ignore */ }

  try {
    const { count: ap2 } = await db
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", prevStart)
      .lt("created_at", prevEnd)
      .in("status", ["confirmed", "completed"]);
    _appointmentsPrev = ap2 ?? 0;
  } catch { /* ignore */ }

  try {
    const { count: msg } = await db
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("direction", "outbound")
      .gte("sent_at", monthStart);
    followUpsSent = msg ?? 0;
  } catch { /* ignore */ }

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
  } catch { /* ignore */ }


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
  } catch { /* ignore */ }

  try {
    const { count: oc } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", monthStart)
      .not("call_ended_at", "is", null)
      .eq("direction", "outbound");
    outboundCalls = oc ?? 0;
  } catch { /* ignore */ }

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
  } catch { /* ignore */ }

  // --- Qualified leads ---
  try {
    const { count: ql } = await db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", monthStart)
      .in("status", ["qualified", "appointment_set", "won"]);
    qualifiedLeads = ql ?? 0;
  } catch { /* ignore */ }

  // --- Phone number configured ---
  try {
    const { count: pn } = await db
      .from("phone_configs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "active");
    phoneConfigured = (pn ?? 0) > 0;
  } catch { /* ignore */ }

  try {
    const { data: leads } = await db
      .from("leads")
      .select("id, name, phone, status, created_at")
      .eq("workspace_id", workspaceId)
      .eq("status", "new")
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
  } catch { /* ignore */ }

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
  } catch { /* ignore */ }

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
  } catch { /* ignore */ }

  const trendPct =
    callsPrev > 0 ? Math.round(((callsAnswered - callsPrev) / callsPrev) * 100) : callsAnswered > 0 ? 100 : 0;

  const conversionRate = callsAnswered > 0 ? Math.round((appointmentsBooked / callsAnswered) * 100) : 0;

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
    conversion_rate: conversionRate,
    minutes_used: minutesUsed,
    minutes_limit: 500,
    phone_number_configured: phoneConfigured,
    needs_attention: needsAttention,
    activity,
    campaigns,
  });
}
