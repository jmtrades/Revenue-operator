/**
 * PATCH /api/call-intelligence/insights/[id] — Apply or dismiss an insight.
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
  if (!id) return NextResponse.json({ error: "Missing insight id" }, { status: 400 });

  let body: { applied?: boolean; dismissed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: { applied?: boolean; dismissed?: boolean } = {};
  if (typeof body.applied === "boolean") updates.applied = body.applied;
  if (typeof body.dismissed === "boolean") updates.dismissed = body.dismissed;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Provide applied or dismissed" }, { status: 400 });
  }

  const db = getDb();
  const { data, error } = await db
    .from("call_insights")
    .update(updates)
    .eq("id", id)
    .eq("workspace_id", session.workspaceId)
    .select("id, applied, dismissed")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Insight not found or update failed." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, insight: data });
}
