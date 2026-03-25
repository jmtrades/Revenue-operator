/**
 * GET /api/operational/public-work-ref?workspace_id=...
 * Returns public work path if workspace has a shared transaction with external_ref. No internal ids.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data: row } = await db
    .from("shared_transactions")
    .select("external_ref")
    .eq("workspace_id", workspaceId)
    .not("external_ref", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const externalRef = (row as { external_ref?: string } | null)?.external_ref ?? null;
  const path = externalRef ? `/public/work/${encodeURIComponent(externalRef)}` : null;

  return NextResponse.json({ path, external_ref: externalRef ?? undefined });
}
