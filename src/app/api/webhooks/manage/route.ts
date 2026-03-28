import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";
import { createWebhookEndpoint, sendTestEvent } from "@/lib/integrations/webhook-events";

export const dynamic = "force-dynamic";

/** List webhook endpoints for a workspace */
export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "Missing workspace_id" }, { status: 400 });

  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const { data: endpoints } = await db
      .from("webhook_endpoints")
      .select("id, url, events, enabled, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (!endpoints || endpoints.length === 0) {
      return NextResponse.json({ endpoints: [] });
    }

    // Get delivery stats for all endpoints
    const { data: deliveryStats } = await db
      .from("webhook_deliveries")
      .select("endpoint_id, status, created_at")
      .in(
        "endpoint_id",
        endpoints.map((e: { id: string }) => e.id)
      );

    // Build stats map
    const statsMap = new Map<
      string,
      { total: number; success: number; failed: number; last_delivery_at: string | null }
    >();

    if (deliveryStats && deliveryStats.length > 0) {
      for (const endpoint of endpoints) {
        const endpointDeliveries = (deliveryStats as Array<{ endpoint_id: string; status: string; created_at: string }>).filter(
          (d) => d.endpoint_id === endpoint.id
        );
        const success = endpointDeliveries.filter((d) => d.status === "success").length;
        const failed = endpointDeliveries.filter((d) => d.status === "failed").length;
        const lastDelivery = endpointDeliveries.length > 0
          ? endpointDeliveries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
          : null;

        statsMap.set(endpoint.id, {
          total: endpointDeliveries.length,
          success,
          failed,
          last_delivery_at: lastDelivery,
        });
      }
    }

    // Transform response: map enabled -> active and add delivery stats
    const transformedEndpoints = endpoints.map((e: { id: string; url: string; events: string[]; enabled: boolean; created_at: string }) => {
      const stats = statsMap.get(e.id) || { total: 0, success: 0, failed: 0, last_delivery_at: null };
      return {
        id: e.id,
        url: e.url,
        events: e.events,
        active: e.enabled,
        created_at: e.created_at,
        deliveries_total: stats.total,
        deliveries_success: stats.success,
        deliveries_failed: stats.failed,
        last_delivery_at: stats.last_delivery_at,
      };
    });

    return NextResponse.json({ endpoints: transformedEndpoints });
  } catch (err) {
    log("error", "api.webhooks.list_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to list endpoints" }, { status: 500 });
  }
}

/** Create a new webhook endpoint or send test event */
export async function POST(request: NextRequest) {
  const csrfBlock = assertSameOrigin(request);
  if (csrfBlock) return csrfBlock;

  try {
    const body = await request.json() as {
      workspace_id?: string;
      endpoint_id?: string;
      url?: string;
      events?: string[];
      description?: string;
      action?: string;
    };

    // Handle test action
    if (body.action === "test" && body.endpoint_id) {
      const result = await sendTestEvent(body.endpoint_id);
      return NextResponse.json({ test_result: result });
    }

    // Handle endpoint creation
    if (!body.workspace_id || !body.url) {
      return NextResponse.json({ error: "Missing workspace_id or url" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(request, body.workspace_id);
    if (authErr) return authErr;

    // Validate URL
    try { new URL(body.url); } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const endpoint = await createWebhookEndpoint(
      body.workspace_id,
      body.url,
      (body.events ?? ["*"]) as ["*"],
      body.description,
    );

    if (!endpoint) {
      return NextResponse.json({ error: "Failed to create endpoint" }, { status: 500 });
    }

    return NextResponse.json({ endpoint }, { status: 201 });
  } catch (err) {
    log("error", "api.webhooks.create_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to create endpoint" }, { status: 500 });
  }
}

/** Update a webhook endpoint */
export async function PATCH(request: NextRequest) {
  const csrfBlock = assertSameOrigin(request);
  if (csrfBlock) return csrfBlock;

  try {
    const body = await request.json() as {
      endpoint_id: string;
      enabled?: boolean;
      active?: boolean;
      url?: string;
      events?: string[];
      description?: string;
      workspace_id?: string;
    };
    if (!body.endpoint_id) return NextResponse.json({ error: "Missing endpoint_id" }, { status: 400 });

    const db = getDb();
    const endpoint = await db.from("webhook_endpoints").select("workspace_id").eq("id", body.endpoint_id).maybeSingle();
    const workspaceId = body.workspace_id || (endpoint?.data as { workspace_id?: string } | null)?.workspace_id;
    if (!workspaceId) return NextResponse.json({ error: "Cannot determine workspace" }, { status: 400 });

    const authErr = await requireWorkspaceAccess(request, workspaceId);
    if (authErr) return authErr;

    // Update fields
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    // Accept both 'enabled' and 'active' as aliases
    if (body.active !== undefined) updates.enabled = body.active;
    else if (body.enabled !== undefined) updates.enabled = body.enabled;

    if (body.url) updates.url = body.url;
    if (body.events) updates.events = body.events;
    if (body.description !== undefined) updates.description = body.description;

    await db.from("webhook_endpoints").update(updates).eq("id", body.endpoint_id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    log("error", "api.webhooks.update_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

/** Delete a webhook endpoint */
export async function DELETE(request: NextRequest) {
  const csrfBlock = assertSameOrigin(request);
  if (csrfBlock) return csrfBlock;

  const endpointId = request.nextUrl.searchParams.get("endpoint_id");
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!endpointId) return NextResponse.json({ error: "Missing endpoint_id" }, { status: 400 });

  try {
    const db = getDb();
    const endpoint = await db.from("webhook_endpoints").select("workspace_id").eq("id", endpointId).maybeSingle();
    const resolvedWorkspaceId = workspaceId || (endpoint?.data as { workspace_id?: string } | null)?.workspace_id;
    if (!resolvedWorkspaceId) return NextResponse.json({ error: "Cannot determine workspace" }, { status: 400 });

    const authErr = await requireWorkspaceAccess(request, resolvedWorkspaceId);
    if (authErr) return authErr;

    await db.from("webhook_endpoints").delete().eq("id", endpointId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    log("error", "api.webhooks.delete_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
