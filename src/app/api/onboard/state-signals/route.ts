/**
 * GET /api/onboard/state-signals
 * Get non-response state signals for waiting page.
 * Deterministic: derives from existing timestamps and state.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  const externalRef = request.nextUrl.searchParams.get("external_ref");

  if (!workspaceId || !externalRef) {
    return NextResponse.json({ error: "workspace_id and external_ref required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data: tx } = await db
    .from("shared_transactions")
    .select("state, created_at")
    .eq("workspace_id", workspaceId)
    .eq("external_ref", externalRef)
    .maybeSingle();

  if (!tx) {
    return NextResponse.json({ signals: [] });
  }

  const state = (tx as { state: string }).state;
  const createdAt = (tx as { created_at: string }).created_at;
  const signals: string[] = [];

  if (state === "disputed") {
    signals.push("The outcome requires alignment.");
    return NextResponse.json({ signals });
  }

  const now = new Date();
  const created = new Date(createdAt);
  const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000);

  const { data: refRow } = await db
    .from("record_reference_events")
    .select("recorded_at")
    .eq("workspace_id", workspaceId)
    .eq("reference_type", "public_record")
    .eq("external_ref", externalRef)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!refRow && created < threeMinutesAgo) {
    signals.push("The other side has not viewed the record yet.");
  } else if (refRow && state === "pending_acknowledgement") {
    signals.push("The record was seen but not confirmed.");
  }

  return NextResponse.json({ signals });
}
