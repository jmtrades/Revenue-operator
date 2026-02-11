export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const { data: lead, error } = await db.from("leads").select("*").eq("id", id).single();
  if (error || !lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: deals } = await db.from("deals").select("id, value_cents, status").eq("lead_id", id);
  return NextResponse.json({ ...lead, deals: deals ?? [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { paused_for_followup?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const db = getDb();
  const { data: existing } = await db.from("leads").select("metadata").eq("id", id).single();
  const meta = (existing as { metadata?: Record<string, unknown> })?.metadata ?? {};
  const nextMeta = { ...meta, paused_for_followup: body.paused_for_followup ?? false };
  const { data: updated, error } = await db
    .from("leads")
    .update({ metadata: nextMeta, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
  return NextResponse.json(updated);
}
