/**
 * GET /api/onboard/check-ack
 * Check if shared_transaction is acknowledged.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  const externalRef = request.nextUrl.searchParams.get("external_ref");

  if (!workspaceId || !externalRef) {
    return NextResponse.json({ error: "workspace_id and external_ref required" }, { status: 400 });
  }

  const db = getDb();
  const { data: tx } = await db
    .from("shared_transactions")
    .select("state")
    .eq("workspace_id", workspaceId)
    .eq("external_ref", externalRef)
    .maybeSingle();

  if (!tx) {
    return NextResponse.json({ acknowledged: false });
  }

  return NextResponse.json({
    acknowledged: (tx as { state: string }).state === "acknowledged",
  });
}
