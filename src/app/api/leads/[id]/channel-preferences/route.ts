/**
 * GET /api/leads/[id]/channel-preferences — Get channel preferences for a specific lead.
 * PATCH /api/leads/[id]/channel-preferences — Update channel preferences (call, sms, email).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { data: lead, error } = await db
    .from("leads")
    .select("workspace_id, channel_preferences")
    .eq("id", id)
    .maybeSingle();

  if (error || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const workspaceId = (lead as { workspace_id?: string }).workspace_id;
  if (workspaceId) {
    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;
  }

  const preferences = (lead as { channel_preferences?: Record<string, unknown> | null }).channel_preferences ?? {
    call: true,
    sms: true,
    email: true,
  };

  return NextResponse.json(preferences);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { call?: boolean; sms?: boolean; email?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getDb();
  const { data: lead } = await db
    .from("leads")
    .select("workspace_id, channel_preferences")
    .eq("id", id)
    .maybeSingle();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const workspaceId = (lead as { workspace_id?: string }).workspace_id;
  if (workspaceId) {
    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;
  }

  const existing = (lead as { channel_preferences?: Record<string, unknown> | null }).channel_preferences ?? {
    call: true,
    sms: true,
    email: true,
  };

  const updated = {
    call: typeof body.call === "boolean" ? body.call : existing.call,
    sms: typeof body.sms === "boolean" ? body.sms : existing.sms,
    email: typeof body.email === "boolean" ? body.email : existing.email,
  };

  const { error } = await db
    .from("leads")
    .update({
      channel_preferences: updated,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to update channel preferences" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, channel_preferences: updated });
}
