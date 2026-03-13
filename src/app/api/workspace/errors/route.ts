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

  const { data: rows, error } = await db
    .from("error_reports")
    .select("id, error_message, error_type, page_url, created_at")
    .eq("workspace_id", session.workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byType = (rows ?? []).reduce(
    (acc, r: { error_type?: string | null }) => {
      const t = (r.error_type ?? "unknown") as string;
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return NextResponse.json({
    entries: rows ?? [],
    grouped: byType,
  });
}
