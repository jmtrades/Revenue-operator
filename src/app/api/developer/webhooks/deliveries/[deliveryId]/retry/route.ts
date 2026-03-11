/**
 * POST /api/developer/webhooks/deliveries/[deliveryId]/retry — Retry a failed delivery (Task 21).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { createHmac } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ deliveryId: string }> }
) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { deliveryId } = await ctx.params;
  const db = getDb();
  const { data: delivery } = await db
    .from("developer_webhook_deliveries")
    .select("id, endpoint_id, event, payload")
    .eq("id", deliveryId)
    .single();
  if (!delivery) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: endpoint } = await db
    .from("developer_webhook_endpoints")
    .select("id, workspace_id, url, secret")
    .eq("id", (delivery as { endpoint_id: string }).endpoint_id)
    .single();
  if (!endpoint || (endpoint as { workspace_id: string }).workspace_id !== session.workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ep = endpoint as { url: string; secret: string | null };
  const payload = (delivery as { payload: unknown }).payload ?? {};
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "RecallTouch-Webhook/1.0",
    "X-Webhook-Event": (delivery as { event: string }).event,
  };
  if (ep.secret) {
    const sig = createHmac("sha256", ep.secret).update(body).digest("hex");
    headers["X-Webhook-Signature"] = `sha256=${sig}`;
  }

  const start = Date.now();
  let responseStatus: number;
  let responseTimeMs: number;
  let success: boolean;
  let lastError: string | null = null;
  try {
    const res = await fetch(ep.url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(15000),
    });
    responseTimeMs = Date.now() - start;
    responseStatus = res.status;
    success = res.ok;
    if (!res.ok) lastError = await res.text().catch(() => String(res.status));
  } catch (e) {
    responseTimeMs = Date.now() - start;
    responseStatus = 0;
    success = false;
    lastError = e instanceof Error ? e.message : String(e);
  }

  await db.from("developer_webhook_deliveries").insert({
    endpoint_id: (delivery as { endpoint_id: string }).endpoint_id,
    event: (delivery as { event: string }).event,
    payload: typeof payload === "object" ? payload : {},
    response_status: responseStatus,
    response_time_ms: responseTimeMs,
    success,
    retry_count: 1,
    last_error: lastError,
  });

  return NextResponse.json({
    ok: success,
    response_status: responseStatus,
    response_time_ms: responseTimeMs,
    error: lastError ?? undefined,
  });
}
