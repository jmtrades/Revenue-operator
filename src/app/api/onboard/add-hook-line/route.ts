/**
 * POST /api/onboard/add-hook-line
 * Add hook line after completion: "Future work referencing this will attach to this record."
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { recordOrientationStatement } from "@/lib/orientation/records";

export async function POST(request: NextRequest) {
  let body: { workspace_id?: string; external_ref?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { workspace_id, external_ref } = body;
  if (!workspace_id || !external_ref) {
    return NextResponse.json({ error: "workspace_id and external_ref required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspace_id);
  if (authErr) return authErr;

  const db = getDb();
  const { data: tx } = await db
    .from("shared_transactions")
    .select("state")
    .eq("workspace_id", workspace_id)
    .eq("external_ref", external_ref)
    .maybeSingle();

  if (!tx || (tx as { state: string }).state !== "acknowledged") {
    return NextResponse.json({ error: "Transaction not acknowledged" }, { status: 400 });
  }

  await recordOrientationStatement(workspace_id, "Future work referencing this will attach to this record.");

  return NextResponse.json({ ok: true });
}
