/**
 * POST /api/developer/webhooks/deliveries/[deliveryId]/retry — Retry a failed delivery (Task 21).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { createHmac } from "crypto";
import { assertSameOrigin } from "@/lib/http/csrf";
import { createWorkspaceNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ deliveryId: string }> }
) {
  const csrfErr = assertSameOrigin(req);
  if (csrfErr) return csrfErr;

  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const { deliveryId } = await ctx.params;
  const db = getDb();
  const { data: delivery } = await db
    .from("developer_webhook_deliveries")
    .select("id, endpoint_id, event, payload, retry_count")
    .eq("id", deliveryId)
    .maybeSingle();
  if (!delivery) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: endpoint } = await db
    .from("developer_webhook_endpoints")
    .select("id, workspace_id, url, secret")
    .eq("id", (delivery as { endpoint_id: string }).endpoint_id)
    .maybeSingle();
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

  const previousRetries = Number((delivery as { retry_count?: number | null }).retry_count ?? 0);
  const retryCount = previousRetries + 1;
  const shouldDeadLetter = !success && retryCount >= 3;
  const nextRetryAt = (() => {
    if (success || shouldDeadLetter) return null;
    const backoffSec = retryCount === 1 ? 30 : 120; // 30s, 2m, then dead-letter on 3rd failure
    return new Date(Date.now() + backoffSec * 1000).toISOString();
  })();

  await db
    .from("developer_webhook_deliveries")
    .update({
      response_status: responseStatus,
      response_time_ms: responseTimeMs,
      success,
      retry_count: retryCount,
      next_retry_at: nextRetryAt,
      last_error: shouldDeadLetter ? `dead_lettered_after_3_attempts: ${lastError ?? "unknown_error"}` : lastError,
    })
    .eq("id", deliveryId);

  if (shouldDeadLetter) {
    await createWorkspaceNotification((endpoint as { workspace_id: string }).workspace_id, {
      type: "system_update",
      title: "Webhook delivery failed after 3 attempts",
      body: `Endpoint ${ep.url} failed for event ${(delivery as { event: string }).event}.`,
      metadata: {
        endpoint_id: (endpoint as { id: string }).id,
        delivery_id: (delivery as { id: string }).id,
        event: (delivery as { event: string }).event,
        status_code: responseStatus,
      },
    });
  }

  return NextResponse.json({
    ok: success,
    response_status: responseStatus,
    response_time_ms: responseTimeMs,
    retry_count: retryCount,
    dead_lettered: shouldDeadLetter,
    next_retry_at: nextRetryAt ?? undefined,
    error: lastError ?? undefined,
  });
}
