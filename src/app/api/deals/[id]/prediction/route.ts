export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { predictDealOutcome } from "@/lib/intelligence/deal-prediction";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const prediction = await predictDealOutcome(id);
    return NextResponse.json(prediction);
  } catch (e) {
    console.error("Deal prediction error:", e);
    return NextResponse.json(
      { error: "Failed to compute prediction" },
      { status: 500 }
    );
  }
}
