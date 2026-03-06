/**
 * Webhook config: endpoint URL for outbound events
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const err = await requireWorkspaceAccess(req, id);
  if (err) return err;
  const db = getDb();
  const { data, error } = await db
    .from("webhook_configs")
    .select("endpoint_url, enabled, secret, max_attempts, event_lead_qualified, event_call_booked, event_deal_at_risk, event_deal_won, event_lead_reactivated")
    .eq("workspace_id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
  const row = data as ({
    endpoint_url?: string;
    enabled?: boolean;
    secret?: string | null;
    max_attempts?: number;
    event_lead_qualified?: boolean;
    event_call_booked?: boolean;
    event_deal_at_risk?: boolean;
    event_deal_won?: boolean;
    event_lead_reactivated?: boolean;
  } | null);

  return NextResponse.json(
    row
      ? {
          endpoint_url: row.endpoint_url ?? "",
          enabled: row.enabled ?? false,
          has_secret: Boolean(row.secret),
          max_attempts: row.max_attempts ?? 3,
          event_lead_qualified: row.event_lead_qualified ?? true,
          event_call_booked: row.event_call_booked ?? true,
          event_deal_at_risk: row.event_deal_at_risk ?? true,
          event_deal_won: row.event_deal_won ?? true,
          event_lead_reactivated: row.event_lead_reactivated ?? true,
        }
      : {
      endpoint_url: "",
      enabled: false,
      has_secret: false,
      max_attempts: 3,
      event_lead_qualified: true,
      event_call_booked: true,
      event_deal_at_risk: true,
      event_deal_won: true,
      event_lead_reactivated: true,
    },
  );
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const err = await requireWorkspaceAccess(req, id);
  if (err) return err;
  let body: {
    endpoint_url?: string;
    enabled?: boolean;
    secret?: string | null;
    max_attempts?: number;
    event_lead_qualified?: boolean;
    event_call_booked?: boolean;
    event_deal_at_risk?: boolean;
    event_deal_won?: boolean;
    event_lead_reactivated?: boolean;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const endpointUrl = body.endpoint_url ?? "";
  const db = getDb();

  if (!endpointUrl && body.enabled !== false) {
    await db.from("webhook_configs").delete().eq("workspace_id", id);
    return NextResponse.json({ endpoint_url: "", enabled: false, max_attempts: 3 });
  }

  const { data, error } = await db
    .from("webhook_configs")
    .upsert(
      {
        workspace_id: id,
        endpoint_url: endpointUrl,
        enabled: body.enabled ?? true,
        secret: body.secret === "" ? null : body.secret,
        max_attempts:
          typeof body.max_attempts === "number" && body.max_attempts > 0
            ? body.max_attempts
            : 3,
        event_lead_qualified: body.event_lead_qualified ?? true,
        event_call_booked: body.event_call_booked ?? true,
        event_deal_at_risk: body.event_deal_at_risk ?? false,
        event_deal_won: body.event_deal_won ?? false,
        event_lead_reactivated: body.event_lead_reactivated ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
  return NextResponse.json(data);
}
