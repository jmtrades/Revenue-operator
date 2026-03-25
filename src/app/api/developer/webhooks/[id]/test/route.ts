/**
 * POST /api/developer/webhooks/[id]/test — Send sample payload to webhook (Task 21).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { createHmac } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const { id } = await ctx.params;
  const db = getDb();
  const { data: endpoint } = await db
    .from("developer_webhook_endpoints")
    .select("id, workspace_id, url, secret")
    .eq("id", id)
    .maybeSingle();
  if (!endpoint || (endpoint as { workspace_id: string }).workspace_id !== session.workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = endpoint as { url: string; secret: string | null };
  const payload = {
    event: "lead.created",
    timestamp: new Date().toISOString(),
    data: {
      lead_id: "sample_lead_id",
      name: "Sample Contact",
      phone: "+15550000000",
      email: "sample@example.com",
    },
  };

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "RecallTouch-Webhook/1.0",
    "X-Webhook-Event": "lead.created",
  };
  if (row.secret) {
    const sig = createHmac("sha256", row.secret).update(body).digest("hex");
    headers["X-Webhook-Signature"] = `sha256=${sig}`;
  }

  const start = Date.now();
  let responseStatus: number;
  let responseTimeMs: number;
  let success: boolean;
  let lastError: string | null = null;
  try {
    const res = await fetch(row.url, {
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
    endpoint_id: id,
    event: "lead.created",
    payload,
    response_status: responseStatus,
    response_time_ms: responseTimeMs,
    success,
    last_error: lastError,
  });

  return NextResponse.json({
    ok: success,
    response_status: responseStatus,
    response_time_ms: responseTimeMs,
    error: lastError ?? undefined,
  });
}
