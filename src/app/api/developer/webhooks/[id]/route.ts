/**
 * GET /api/developer/webhooks/[id] — Get endpoint + recent deliveries.
 * PATCH /api/developer/webhooks/[id] — Update endpoint.
 * DELETE /api/developer/webhooks/[id] — Delete endpoint (Task 21).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";

export const dynamic = "force-dynamic";

const ALLOWED_EVENTS = [
  "call.started",
  "call.completed",
  "call.failed",
  "lead.created",
  "lead.updated",
  "lead.converted",
  "appointment.booked",
  "appointment.completed",
  "campaign.completed",
  "payment.received",
] as const;

function isValidEvents(events: unknown): events is string[] {
  return Array.isArray(events) && events.every((e) => typeof e === "string" && ALLOWED_EVENTS.includes(e as (typeof ALLOWED_EVENTS)[number]));
}

async function ensureOwnership(
  req: NextRequest,
  endpointId: string
): Promise<{ workspaceId: string } | NextResponse> {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data } = await db
    .from("developer_webhook_endpoints")
    .select("workspace_id")
    .eq("id", endpointId)
    .maybeSingle();
  if (!data || (data as { workspace_id: string }).workspace_id !== session.workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return { workspaceId: session.workspaceId };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const ownership = await ensureOwnership(req, id);
  if (ownership instanceof NextResponse) return ownership;

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10) || 50, 100);
  const db = getDb();
  const { data: endpoint } = await db
    .from("developer_webhook_endpoints")
    .select("id, url, events, enabled, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!endpoint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: deliveries } = await db
    .from("developer_webhook_deliveries")
    .select("id, event, payload, response_status, response_time_ms, success, created_at")
    .eq("endpoint_id", id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return NextResponse.json({
    ...(endpoint as object),
    has_secret: true,
    deliveries: (deliveries ?? []).map((d: { id: string; event: string; payload: unknown; response_status: number | null; response_time_ms: number | null; success: boolean; created_at: string }) => ({
      id: d.id,
      event: d.event,
      payload: d.payload,
      response_status: d.response_status,
      response_time_ms: d.response_time_ms,
      success: d.success,
      created_at: d.created_at,
    })),
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const csrfErr = assertSameOrigin(req);
  if (csrfErr) return csrfErr;

  const { id } = await ctx.params;
  const ownership = await ensureOwnership(req, id);
  if (ownership instanceof NextResponse) return ownership;

  let body: { url?: string; secret?: string | null; events?: string[]; enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getDb();
  const updates: { url?: string; secret?: string | null; events?: string[]; enabled?: boolean; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body.url === "string") {
    const url = body.url.trim();
    try {
      new URL(url);
      updates.url = url;
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
  }
  if (body.secret !== undefined) updates.secret = body.secret === "" ? null : (body.secret as string);
  if (isValidEvents(body.events)) updates.events = body.events;
  if (typeof body.enabled === "boolean") updates.enabled = body.enabled;

  const { data, error } = await db
    .from("developer_webhook_endpoints")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  const row = data as { id: string; url: string; events: string[]; enabled: boolean; created_at: string };
  return NextResponse.json({
    id: row.id,
    url: row.url,
    events: row.events ?? [],
    enabled: row.enabled ?? true,
    has_secret: true,
    created_at: row.created_at,
  });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const csrfErr = assertSameOrigin(_req);
  if (csrfErr) return csrfErr;

  const { id } = await ctx.params;
  const ownership = await ensureOwnership(_req, id);
  if (ownership instanceof NextResponse) return ownership;

  const db = getDb();
  const { error } = await db.from("developer_webhook_endpoints").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
