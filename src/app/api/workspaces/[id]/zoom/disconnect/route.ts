/**
 * Disconnect Zoom: remove tokens, stop ingestion. Call sessions remain.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params;
  const db = getDb();
  const { data: account } = await db.from("zoom_accounts").select("id").eq("workspace_id", workspaceId).single();
  if (!account) return NextResponse.json({ ok: true, message: "Not connected" });
  await db.from("zoom_accounts").delete().eq("workspace_id", workspaceId);
  return NextResponse.json({ ok: true });
}
