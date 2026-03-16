/**
 * GET/PATCH /api/workspace/call-rules — Read/update call-handling rules for a workspace.
 * Stores after_hours_behavior, emergency_keywords, transfer_phone in the settings table.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data } = await db
    .from("settings")
    .select("after_hours_behavior, emergency_keywords, transfer_phone")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const row = data as { after_hours_behavior?: string; emergency_keywords?: string; transfer_phone?: string } | null;

  return NextResponse.json({
    after_hours_behavior: row?.after_hours_behavior ?? "messages",
    emergency_keywords: row?.emergency_keywords ?? "emergency, urgent",
    transfer_phone: row?.transfer_phone ?? "",
  });
}

export async function PATCH(req: NextRequest) {
  let body: { workspace_id?: string; after_hours_behavior?: string; emergency_keywords?: string; transfer_phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workspaceId = typeof body.workspace_id === "string" ? body.workspace_id.trim() : "";
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.after_hours_behavior) updates.after_hours_behavior = body.after_hours_behavior;
  if (typeof body.emergency_keywords === "string") updates.emergency_keywords = body.emergency_keywords;
  if (typeof body.transfer_phone === "string") updates.transfer_phone = body.transfer_phone;

  const db = getDb();
  const { error } = await db
    .from("settings")
    .update(updates)
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("[call-rules] Update failed:", error.message);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
