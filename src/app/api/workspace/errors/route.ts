/**
 * GET /api/workspace/errors — List recent error reports for the workspace (admin).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 50));
  const db = getDb();

  // error_reports table may not be provisioned yet — return empty gracefully
  let rows: unknown[] = [];
  try {
    const { data, error } = await db
      .from("error_reports")
      .select("id, message, error_type, metadata, created_at")
      .eq("workspace_id", session.workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      // Table likely doesn't exist yet — return empty
      return NextResponse.json({ entries: [], grouped: {} });
    }
    rows = data ?? [];
  } catch {
    return NextResponse.json({ entries: [], grouped: {} });
  }

  const byType: Record<string, number> = {};
  for (const r of rows) {
    const t = ((r as { error_type?: string | null }).error_type ?? "unknown");
    byType[t] = (byType[t] ?? 0) + 1;
  }

  return NextResponse.json({
    entries: rows ?? [],
    grouped: byType,
  });
}
