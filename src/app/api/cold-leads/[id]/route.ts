/**
 * PATCH /api/cold-leads/[id] — Update cold lead queue item (status, next_attempt_at, strategy).
 * DELETE /api/cold-leads/[id] — Remove from cold lead queue.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  let body: { status?: string; next_attempt_at?: string; strategy?: string; attempt_count?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getDb();

  // Verify the cold lead item belongs to the workspace
  const { data: existing } = await db
    .from("cold_lead_queue")
    .select("id, workspace_id")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Cold lead queue item not found" }, { status: 404 });
  }

  if ((existing as { workspace_id?: string }).workspace_id !== session.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.status === "string") {
    const status = body.status.trim().toLowerCase();
    const validStatuses = ["pending", "in_progress", "completed", "skipped"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed values: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }
    updates.status = status;
  }

  if (typeof body.next_attempt_at === "string") {
    const dateStr = body.next_attempt_at.trim();
    if (dateStr && !isValidISODate(dateStr)) {
      return NextResponse.json({ error: "Invalid ISO date format for next_attempt_at" }, { status: 400 });
    }
    updates.next_attempt_at = dateStr || null;
  }

  if (typeof body.strategy === "string") {
    updates.strategy = body.strategy.trim() || null;
  }

  if (typeof body.attempt_count === "number" && body.attempt_count >= 0) {
    updates.attempt_count = body.attempt_count;
    updates.last_attempted_at = new Date().toISOString();
  }

  const { data: updated, error } = await db
    .from("cold_lead_queue")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to update cold lead queue item" }, { status: 500 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const db = getDb();

  // Verify the cold lead item belongs to the workspace
  const { data: existing } = await db
    .from("cold_lead_queue")
    .select("id, workspace_id")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Cold lead queue item not found" }, { status: 404 });
  }

  if ((existing as { workspace_id?: string }).workspace_id !== session.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { error } = await db.from("cold_lead_queue").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete cold lead queue item" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function isValidISODate(dateStr: string): boolean {
  try {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}
