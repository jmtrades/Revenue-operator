/**
 * Slot recommendation for deal (calendar optimization)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSlotRecommendation } from "@/lib/calendar-optimization";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rec = await getSlotRecommendation(id);
  if (!rec) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  return NextResponse.json(rec);
}
