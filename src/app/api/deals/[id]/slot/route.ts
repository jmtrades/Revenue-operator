/**
 * Slot recommendation for deal (calendar optimization)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSlotRecommendation } from "@/lib/calendar-optimization";
import { getSession } from "@/lib/auth/request-session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const rec = await getSlotRecommendation(id);
  if (!rec) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  return NextResponse.json(rec);
}
