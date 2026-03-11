export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const { data: lead, error } = await db.from("leads").select("*").eq("id", id).single();
  if (error || !lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
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
  const { data: existing } = await db.from("leads").select("metadata").eq("id", id).single();
  const meta = (existing as { metadata?: Record<string, unknown> })?.metadata ?? {};
  const nextMeta =
    body.paused_for_followup !== undefined
      ? { ...meta, paused_for_followup: body.paused_for_followup }
      : meta;
  const stateInput = body.state != null ? String(body.state).toLowerCase().replace(/\s+/g, "_") : undefined;
  const dbState = stateInput != null ? STATUS_TO_STATE[stateInput] ?? stateInput : undefined;
  const updatePayload: { metadata: Record<string, unknown>; updated_at: string; state?: string } = {
    metadata: nextMeta,
    updated_at: new Date().toISOString(),
  };
  if (dbState != null) updatePayload.state = dbState;
  const { data: updated, error } = await db
    .from("leads")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
  const workspaceId = (updated as { workspace_id?: string })?.workspace_id;
  if (workspaceId) {
    const { recordProviderInteraction } = await import("@/lib/detachment");
    recordProviderInteraction(workspaceId, `lead:${id}`).catch(() => {});
    // Enqueue outbound CRM sync for connected providers (Task 19)
    try {
      const { getConnectedCrmProviders, enqueueSync } = await import("@/lib/integrations/sync-engine");
      const providers = await getConnectedCrmProviders(workspaceId);
      for (const provider of providers) {
        await enqueueSync({
          workspaceId,
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
