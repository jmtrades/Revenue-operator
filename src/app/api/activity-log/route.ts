/**
 * GET /api/activity-log — Unified activity feed across workspace
 * Aggregates: call_sessions, appointments, leads, campaigns (last 7 days)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

interface ActivityLogEntry {
  id: string;
  type: "call" | "appointment" | "lead" | "campaign";
  description: string;
  timestamp: string;
  actor?: string;
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const activities: ActivityLogEntry[] = [];

  // Fetch call sessions
  const { data: calls } = await db
    .from("call_sessions")
    .select("id, outcome, started_at, call_direction")
    .eq("workspace_id", workspaceId)
    .gte("started_at", sevenDaysAgo)
    .order("started_at", { ascending: false });

  if (calls) {
    calls.forEach((call: { id: string; outcome?: string; started_at: string; call_direction?: string }) => {
      const direction = call.call_direction || "inbound";
      const outcome = call.outcome || "completed";
      activities.push({
        id: `call-${call.id}`,
        type: "call",
        description: `Call ${direction} - ${outcome}`,
        timestamp: call.started_at,
        actor: "System",
      });
    });
  }

  // Fetch appointments
  const { data: appointments } = await db
    .from("appointments")
    .select("id, title, status, start_time")
    .eq("workspace_id", workspaceId)
    .gte("start_time", sevenDaysAgo)
    .order("start_time", { ascending: false });

  if (appointments) {
    appointments.forEach((apt: { id: string; title?: string; status: string; start_time: string }) => {
      const status = apt.status || "scheduled";
      activities.push({
        id: `apt-${apt.id}`,
        type: "appointment",
        description: `Appointment ${status}: ${apt.title || "Untitled"}`,
        timestamp: apt.start_time,
        actor: "System",
      });
    });
  }

  // Fetch leads (newly created in last 7 days)
  const { data: leads } = await db
    .from("leads")
    .select("id, name, created_at")
    .eq("workspace_id", workspaceId)
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: false });

  if (leads) {
    leads.forEach((lead: { id: string; name?: string; created_at: string }) => {
      activities.push({
        id: `lead-${lead.id}`,
        type: "lead",
        description: `New lead: ${lead.name || "Untitled"}`,
        timestamp: lead.created_at,
        actor: "System",
      });
    });
  }

  // Fetch campaigns
  const { data: campaigns } = await db
    .from("campaigns")
    .select("id, name, status, created_at")
    .eq("workspace_id", workspaceId)
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: false });

  if (campaigns) {
    campaigns.forEach((campaign: { id: string; name?: string; status?: string; created_at: string }) => {
      const status = campaign.status || "active";
      activities.push({
        id: `campaign-${campaign.id}`,
        type: "campaign",
        description: `Campaign ${status}: ${campaign.name || "Untitled"}`,
        timestamp: campaign.created_at,
        actor: "System",
      });
    });
  }

  // Sort by timestamp descending and limit to 50
  const sorted = activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);

  return NextResponse.json(sorted);
}
