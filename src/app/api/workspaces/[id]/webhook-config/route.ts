/**
 * Webhook config: endpoint URL for outbound events
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const { data, error } = await db
    .from("webhook_configs")
    .select("endpoint_url, enabled")
    .eq("workspace_id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
  return NextResponse.json(data ?? { endpoint_url: "", enabled: false });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { endpoint_url?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const endpointUrl = body.endpoint_url ?? "";
  const db = getDb();

  if (!endpointUrl) {
    await db.from("webhook_configs").delete().eq("workspace_id", id);
    return NextResponse.json({ endpoint_url: "", enabled: false });
  }

  const { data, error } = await db
    .from("webhook_configs")
    .upsert(
      {
        workspace_id: id,
        endpoint_url: endpointUrl,
        enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
  return NextResponse.json(data);
}
