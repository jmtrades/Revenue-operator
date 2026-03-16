/**
 * GET /api/developer/webhooks — List webhook endpoints for current workspace.
 * POST /api/developer/webhooks — Create webhook endpoint (Task 21).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

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

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErrGet = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErrGet) return authErrGet;

  const db = getDb();
  const { data: rows } = await db
    .from("developer_webhook_endpoints")
    .select("id, workspace_id, url, events, enabled, created_at, updated_at, secret")
    .eq("workspace_id", session.workspaceId)
    .order("created_at", { ascending: false });

  const list = (rows ?? []).map((r: { id: string; url: string; events: string[]; enabled: boolean; created_at: string; updated_at: string; secret?: string | null }) => ({
    id: r.id,
    url: r.url,
    events: r.events ?? [],
    enabled: r.enabled ?? true,
    has_secret: Boolean(r.secret),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
  return NextResponse.json({ endpoints: list });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErrPost = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErrPost) return authErrPost;

  let body: { url?: string; secret?: string; events?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const events = isValidEvents(body.events) ? body.events : [];
  const secret = typeof body.secret === "string" ? body.secret.trim() || null : null;

  const db = getDb();
  const { data, error } = await db
    .from("developer_webhook_endpoints")
    .insert({
      workspace_id: session.workspaceId,
      url,
      secret,
      events,
      enabled: true,
      updated_at: new Date().toISOString(),
    })
    .select("id, url, events, enabled, created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  return NextResponse.json({
    id: (data as { id: string }).id,
    url: (data as { url: string }).url,
    events: (data as { events: string[] }).events ?? [],
    enabled: (data as { enabled: boolean }).enabled ?? true,
    has_secret: Boolean(secret),
    created_at: (data as { created_at: string }).created_at,
  });
}
