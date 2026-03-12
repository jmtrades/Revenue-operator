export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getFollowUpRecommendation } from "@/lib/intelligence/follow-up";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  try {
    const rec = await getFollowUpRecommendation(leadId);
    return NextResponse.json(rec);
  } catch (e) {
    // Error response below
    return NextResponse.json(
      { error: "Failed to get follow-up recommendation" },
      { status: 500 }
    );
  }
}
