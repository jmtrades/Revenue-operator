/**
 * GET /api/analytics/outbound-metrics?workspace_id=&start=&end=
 * Outbound SMS count in range + campaign rollups for analytics Outbound tab.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
  const start = req.nextUrl.searchParams.get("start")?.trim();
  const end = req.nextUrl.searchParams.get("end")?.trim();
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const auth = await requireWorkspaceAccess(req, workspaceId);
  if (auth) return auth;

  const startIso = start ? `${start}T00:00:00.000Z` : new Date(Date.now() - 30 * 864e5).toISOString();
  const endIso = end ? `${end}T23:59:59.999Z` : new Date().toISOString();

  let outboundMessages = 0;
  let inboundReplies = 0;
  const byDay = new Map<string, number>();

  try {
    const db = getDb();
    const { data: msgs, error } = await db
      .from("messages")
      .select("direction, sent_at")
      .eq("workspace_id", workspaceId)
      .gte("sent_at", startIso)
      .lte("sent_at", endIso)
      .limit(5000);
    if (!error && msgs?.length) {
      for (const m of msgs as { direction: string; sent_at: string }[]) {
        if (m.direction === "outbound") {
          outboundMessages += 1;
          const d = m.sent_at?.slice(0, 10) ?? "";
          if (d) byDay.set(d, (byDay.get(d) ?? 0) + 1);
        } else if (m.direction === "inbound") {
          inboundReplies += 1;
        }
      }
    }
  } catch {
    /* ignore */
  }

  let campaigns: Array<{
    id: string;
    name: string;
    status: string;
    called: number;
    answered: number;
    appointments_booked: number;
    total_contacts: number;
  }> = [];
  let totalDialed = 0;
  let totalAnswered = 0;
  let totalBooked = 0;
  let activeCampaigns = 0;

  try {
    const db = getDb();
    const { data } = await db
      .from("campaigns")
      .select("id, name, status, called, answered, appointments_booked, total_contacts, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(40);
    if (data?.length) {
      campaigns = (data as typeof campaigns).map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        called: Number(c.called) || 0,
        answered: Number(c.answered) || 0,
        appointments_booked: Number(c.appointments_booked) || 0,
        total_contacts: Number(c.total_contacts) || 0,
      }));
      for (const c of campaigns) {
        totalDialed += c.called;
        totalAnswered += c.answered;
        totalBooked += c.appointments_booked;
        if (c.status === "active" || c.status === "running") activeCampaigns += 1;
      }
    }
  } catch {
    /* ignore */
  }

  const volumeByDay = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ day, count }));

  return NextResponse.json({
    outbound_messages: outboundMessages,
    inbound_replies: inboundReplies,
    volume_by_day: volumeByDay,
    campaigns,
    totals: {
      dialed: totalDialed,
      answered: totalAnswered,
      appointments_booked: totalBooked,
      active_campaigns: activeCampaigns,
    },
  });
}
