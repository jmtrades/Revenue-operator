/**
 * GET /api/assurance/proof-capsule?workspace_id=...
 * Returns { lines: string[] } only. From most recent stored capsule.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { log } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const { data: row } = await db
      .from("proof_capsules")
      .select("lines")
      .eq("workspace_id", workspaceId)
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lines = (row as { lines?: string[] } | null)?.lines ?? [];
    return NextResponse.json({ lines: Array.isArray(lines) ? lines : [] });
  } catch (err) {
    log("error", "[proof-capsule]", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ lines: [] }, { status: 500 });
  }
}
