/**
 * PATCH /api/analytics/suggestions/[id] — Dismiss a suggestion.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = getDb();
  const { data, error } = await db
    .from("optimization_suggestions")
    .update({ dismissed: true })
    .eq("id", id)
    .eq("workspace_id", session.workspaceId)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
