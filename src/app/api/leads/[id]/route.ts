export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify workspace access before fetching lead
    const authErr = await requireWorkspaceAccess(req, session.workspaceId);
    if (authErr) return authErr;

    const db = getDb();
    const { data: lead, error } = await db
      .from("leads")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", session.workspaceId)
      .maybeSingle();
    if (error) {
      log("error", "leads.get_by_id_error", { error: error.message });
      return NextResponse.json({ error: "Could not process lead data" }, { status: 500 });
    }
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
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
  } catch (err) {
    log("error", "leads.get_by_id_route_error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DB enum is UPPERCASE: NEW, CONTACTED, ENGAGED, QUALIFIED, BOOKED, SHOWED, WON, LOST, RETAIN, REACTIVATE, CLOSED
const STATUS_TO_STATE: Record<string, string> = {
  new: "NEW",
  contacted: "CONTACTED",
  engaged: "ENGAGED",
  qualified: "QUALIFIED",
  appointment_set: "BOOKED",
  booked: "BOOKED",
  showed: "SHOWED",
  won: "WON",
  lost: "LOST",
  retain: "RETAIN",
  reactivate: "REACTIVATE",
  closed: "CLOSED",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  try {
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
    const dbState = stateInput != null ? STATUS_TO_STATE[stateInput] ?? stateInput.toUpperCase() : undefined;
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
    if (error) {
      log("error", "leads.patch_error", { error: error.message });
      return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
    }
    const leadWorkspaceId = (updated as { workspace_id?: string })?.workspace_id;
    if (leadWorkspaceId) {
      const { recordProviderInteraction } = await import("@/lib/detachment");
      recordProviderInteraction(leadWorkspaceId, `lead:${id}`).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
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

      // Autonomous Brain: recompute intelligence after lead update
      void (async () => {
        try {
          const { computeLeadIntelligence, persistLeadIntelligence } = await import("@/lib/intelligence/lead-brain");
          const intelligence = await computeLeadIntelligence(leadWorkspaceId, id);
          await persistLeadIntelligence(intelligence);
        } catch { /* Non-blocking */ }
      })();
    }
    return NextResponse.json(updated);
  } catch (err) {
    log("error", "leads.patch_route_error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const { id } = await params;
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  // Rate limit: 20 deletes per minute per workspace
  const rl = await checkRateLimit(`leads_delete:${session.workspaceId}`, 20, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many delete requests. Please slow down." }, { status: 429 });
  }

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
    log("error", "leads.delete_error", { error: error.message });
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
