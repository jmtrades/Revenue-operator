/**
 * POST /api/connectors/webhook-inbox
 * Append-only. Payload: { workspace_id, kind, data, occurred_at }.
 * Validates workspace exists. Cron maps to canonical signals.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { appendConnectorInboxEvent } from "@/lib/connectors/install-pack/webhook-inbox";

export async function POST(request: NextRequest) {
  let body: { workspace_id?: string; kind?: string; data?: Record<string, unknown>; occurred_at?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const workspaceId = body.workspace_id;
  const kind = body.kind;
  const data = body.data ?? {};
  if (!workspaceId || !kind) {
    return NextResponse.json({ error: "workspace_id and kind required" }, { status: 400 });
  }

  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("id").eq("id", workspaceId).maybeSingle();
  if (!ws) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const occurredAt =
    typeof body.occurred_at === "string" && body.occurred_at
      ? new Date(body.occurred_at).toISOString()
      : new Date().toISOString();

  const id = await appendConnectorInboxEvent(workspaceId, kind, data, occurredAt);
  return NextResponse.json({ ok: true, id });
}
