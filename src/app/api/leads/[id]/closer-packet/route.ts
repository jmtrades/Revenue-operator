export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { generateCloserPacket } from "@/lib/intelligence/closer-packet";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const dealId = _req.nextUrl.searchParams.get("deal_id") ?? undefined;
  try {
    const packet = await generateCloserPacket(leadId, dealId ?? undefined);
    return NextResponse.json(packet);
  } catch (e) {
    console.error("Closer packet error:", e);
    return NextResponse.json({ error: "Failed to generate closer packet" }, { status: 500 });
  }
}
