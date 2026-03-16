/**
 * Activation events API - tracks user activation steps
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { step: string; workspace_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const step = body.step;
  const validSteps = ["signup", "connected_number", "inbound_received", "reply_sent", "dashboard_viewed_next_day"];
  if (!validSteps.includes(step)) {
    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  }

  const workspaceId = body.workspace_id || session.workspaceId;
  const authErrPost = await requireWorkspaceAccess(req, workspaceId);
  if (authErrPost) return authErrPost;

  const db = getDb();

  // Check if this step already logged for this workspace (idempotent)
  const { data: existing } = await db
    .from("activation_events")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("step", step)
    .limit(1)
    .maybeSingle();

  if (!existing) {
    const { data: workspace } = await db
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .maybeSingle();

    await db.from("activation_events").insert({
      workspace_id: workspaceId,
      user_id: (workspace as { owner_id?: string })?.owner_id || null,
      step,
      metadata: {},
    });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  const searchParams = req.nextUrl.searchParams;
  const workspaceId = searchParams.get("workspace_id") || session?.workspaceId;
  const step = searchParams.get("step");

  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  let query = db
    .from("activation_events")
    .select("id")
    .eq("workspace_id", workspaceId);

  if (step) {
    query = query.eq("step", step);
  }

  const { data } = await query.limit(1).maybeSingle();

  return NextResponse.json({ exists: !!data });
}
