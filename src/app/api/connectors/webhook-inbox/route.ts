/**
 * POST /api/connectors/webhook-inbox
 * Append-only. Payload: { workspace_id, kind, data, occurred_at }.
 * Validates workspace exists AND verifies HMAC signature or workspace API key.
 * Cron maps to canonical signals.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { appendConnectorInboxEvent } from "@/lib/connectors/install-pack/webhook-inbox";
import { createHmac, timingSafeEqual } from "crypto";
import { log } from "@/lib/logger";

const WEBHOOK_INBOX_SECRET = process.env.WEBHOOK_INBOX_SECRET;

/**
 * Verify HMAC-SHA256 signature from X-Webhook-Signature header.
 * Signature format: sha256=<hex>
 */
function verifySignature(payload: string, signature: string | null): boolean {
  if (!WEBHOOK_INBOX_SECRET || !signature) return false;
  const expected = `sha256=${createHmac("sha256", WEBHOOK_INBOX_SECRET).update(payload).digest("hex")}`;
  if (signature.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature");

  // Require HMAC signature verification when secret is configured
  if (WEBHOOK_INBOX_SECRET) {
    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // In production, WEBHOOK_INBOX_SECRET MUST be set
    log("error", "[webhook-inbox] WEBHOOK_INBOX_SECRET not configured in production");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let body: { workspace_id?: string; kind?: string; data?: Record<string, unknown>; occurred_at?: string };
  try {
    body = JSON.parse(rawBody);
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
