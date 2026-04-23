/**
 * Internal activation report - shows per-workspace activation metrics
 * No graphs, table only
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireStaffSession } from "@/lib/ops/auth";

// Internal ops auth: Bearer OPS_TOKEN (cron/scripts) or staff session only.
// Do not allow regular app session — this route returns all workspaces' activation data.
function isOpsAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const opsToken = process.env.OPS_TOKEN;
  if (!opsToken) return false;
  return authHeader === `Bearer ${opsToken}`;
}

export async function GET(req: NextRequest) {
  if (isOpsAuthorized(req)) {
    // proceed
  } else {
    const staff = await requireStaffSession().catch((r) => r as Response);
    if (staff instanceof Response) return staff;
  }

  const db = getDb();

  // Get all workspaces with activation events
  const { data: workspaces } = await db
    .from("workspaces")
    .select(`
      id,
      created_at,
      owner_id,
      users!workspaces_owner_id_fkey (
        email
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  // Filter workspaces with valid emails and collect IDs
  const validWorkspaces: Array<{ id: string; created_at: string; email: string }> = [];
  for (const ws of workspaces || []) {
    const workspaceId = (ws as { id: string }).id;
    const createdAt = (ws as { created_at: string }).created_at;
    const user = (ws as { users?: { email?: string } | null })?.users;
    const email = user && typeof user === "object" && "email" in user ? user.email : null;
    if (email) {
      validWorkspaces.push({ id: workspaceId, created_at: createdAt, email });
    }
  }

  const workspaceIds = validWorkspaces.map((ws) => ws.id);

  // Batch query: all activation events for all workspaces in one call
  const { data: allEvents } = workspaceIds.length > 0
    ? await db
        .from("activation_events")
        .select("workspace_id, step, created_at")
        .in("workspace_id", workspaceIds)
    : { data: [] };

  // Group events by workspace_id
  const eventsByWorkspace = new Map<string, Array<{ step: string; created_at: string }>>();
  for (const e of allEvents || []) {
    const evt = e as { workspace_id: string; step: string; created_at: string };
    const list = eventsByWorkspace.get(evt.workspace_id) ?? [];
    list.push(evt);
    eventsByWorkspace.set(evt.workspace_id, list);
  }

  const results: Array<{
    workspace_id: string;
    email: string;
    signed_up: string;
    connected_number: boolean;
    inbound_received: boolean;
    reply_sent: boolean;
    dashboard_viewed_next_day: boolean;
  }> = [];

  for (const ws of validWorkspaces) {
    const events = eventsByWorkspace.get(ws.id) ?? [];
    const steps = new Set(events.map((e) => e.step));
    const signedUp = new Date(ws.created_at);
    const nextDay = new Date(signedUp.getTime() + 24 * 60 * 60 * 1000);

    // Check if dashboard_viewed_next_day happened within 48 hours of signup
    const dashboardEvent = events.find(
      (e) => e.step === "dashboard_viewed_next_day" && new Date(e.created_at) <= new Date(nextDay.getTime() + 24 * 60 * 60 * 1000)
    );

    results.push({
      workspace_id: ws.id,
      email: ws.email,
      signed_up: signedUp.toISOString(),
      connected_number: steps.has("connected_number"),
      inbound_received: steps.has("inbound_received"),
      reply_sent: steps.has("reply_sent"),
      dashboard_viewed_next_day: !!dashboardEvent,
    });
  }

  return NextResponse.json({
    total: results.length,
    workspaces: results,
  });
}
