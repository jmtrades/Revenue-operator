/**
 * Disconnect Zoom: remove tokens, stop ingestion. Call sessions remain.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const { id: workspaceId } = await params;
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;
  const db = getDb();
  const { data: account } = await db.from("zoom_accounts").select("id").eq("workspace_id", workspaceId).maybeSingle();
  if (!account) return NextResponse.json({ ok: true, message: "Not connected" });
  await db.from("zoom_accounts").delete().eq("workspace_id", workspaceId);
  return NextResponse.json({ ok: true });
}
