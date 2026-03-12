export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { generateForensics } from "@/lib/intelligence/forensics";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const dealId = _req.nextUrl.searchParams.get("deal_id") ?? "";
  try {
    const forensics = await generateForensics(leadId, dealId);
    return NextResponse.json(forensics);
  } catch (e) {
    // Error response below
    return NextResponse.json(
      { error: "Failed to generate forensics" },
      { status: 500 }
    );
  }
}
