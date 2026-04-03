/**
 * Slot recommendation for deal (calendar optimization)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSlotRecommendation } from "@/lib/calendar-optimization";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const { id } = await params;

  // Verify the deal belongs to this workspace
  const db = getDb();
  const { data: deal } = await db
    .from("deals")
    .select("id")
    .eq("id", id)
    .eq("workspace_id", session.workspaceId)
    .maybeSingle();
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  const rec = await getSlotRecommendation(id);
  if (!rec) return NextResponse.json({ error: "No recommendation available" }, { status: 404 });
  return NextResponse.json(rec);
}
