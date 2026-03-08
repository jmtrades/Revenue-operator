/**
 * GET /api/analytics/suggestions — Optimization suggestions for the workspace.
 * Returns non-dismissed suggestions; can be populated by post-call analysis.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { data: rows } = await db
    .from("optimization_suggestions")
    .select("id, title, description, action_label, action_href, created_at")
    .eq("workspace_id", session.workspaceId)
    .eq("dismissed", false)
    .order("created_at", { ascending: false })
    .limit(20);

  const suggestions = (rows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? null,
    actionLabel: r.action_label ?? null,
    actionHref: r.action_href ?? null,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ suggestions });
}
