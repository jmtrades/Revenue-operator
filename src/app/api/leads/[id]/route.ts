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
  const db = getDb();
  const { data: lead, error } = await db.from("leads").select("*").eq("id", id).maybeSingle();
  if (error || !lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const workspaceId = (lead as { workspace_id?: string }).workspace_id;
  if (workspaceId) {
    const session = await getSession(req);
    if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;
  }
  const { data: deals } = await db.from("deals").select("id, value_cents, status").eq("lead_id", id);
  let responsibility_state: string | undefined;
  try {
    const { resolveResponsibility } = await import("@/lib/closure/resolver");
    responsibility_state = await resolveResponsibility(id);
  } catch {
    // closure may throw if no signals; leave undefined
  }
  return NextResponse.json({
    ...lead,
    deals: deals ?? [],
    ...(responsibility_state != null && { responsibility_state }),
  });
}

const STATUS_TO_STATE: Record<string, string> = {
  new: "new",
  contacted: "contacted",
  qualified: "qualified",
  appointment_set: "appointment_set",
  won: "won",
  lost: "lost",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { paused_for_followup?: boolean; state?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const db = getDb();
  const { data: existing } = await db.from("leads").select("metadata, workspace_id").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const workspaceId = (existing as { workspace_id?: string }).workspace_id;
  if (workspaceId) {
    const session = await getSession(req);
    if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;
  }
  const meta = (existing as { metadata?: Record<string, unknown> })?.metadata ?? {};
  const nextMeta =
    body.paused_for_followup !== undefined
      ? { ...meta, paused_for_followup: body.paused_for_followup }
      : meta;
  const stateInput = body.state != null ? String(body.state).toLowerCase().replace(/\s+/g, "_") : undefined;
  const dbState = stateInput != null ? STATUS_TO_STATE[stateInput] ?? stateInput : undefined;
  const updatePayload: { metadata: Record<string, unknown>; updated_at: string; status?: string } = {
    metadata: nextMeta,
    updated_at: new Date().toISOString(),
  };
  if (dbState != null) updatePayload.status = dbState;
  const { data: updated, error } = await db
    .from("leads")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  const leadWorkspaceId = (updated as { workspace_id?: string })?.workspace_id;
  if (leadWorkspaceId) {
    const { recordProviderInteraction } = await import("@/lib/detachment");
    recordProviderInteraction(leadWorkspaceId, `lead:${id}`).catch((err) => { console.error("[leads/[id]] error:", err instanceof Error ? err.message : err); });
    // Enqueue outbound CRM sync for connected providers (Task 19)
    try {
      const { getConnectedCrmProviders, enqueueSync } = await import("@/lib/integrations/sync-engine");
      const providers = await getConnectedCrmProviders(leadWorkspaceId);
      for (const provider of providers) {
        await enqueueSync({
          workspaceId: leadWorkspaceId,
          provider,
          direction: "outbound",
          entityType: "lead",
          entityId: id,
        });
      }
    } catch {
      // Do not block lead update on sync enqueue
    }
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

  // Verify the lead belongs to this workspace
  const { data: existing } = await db
    .from("leads")
    .select("id, workspace_id")
    .eq("id", id)
    .eq("workspace_id", session.workspaceId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const { error } = await db
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("workspace_id", session.workspaceId);

  if (error) {
    console.error("[leads/delete]", error.message);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
