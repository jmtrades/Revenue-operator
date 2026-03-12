export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getNextBestAction } from "@/lib/intelligence/next-best-action";
import { getDb } from "@/lib/db/queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const db = getDb();
  const { data: lead } = await db.from("leads").select("state").eq("id", leadId).single();
  const { data: deal } = await db.from("deals").select("id").eq("lead_id", leadId).neq("status", "lost").limit(1).single();

  try {
    const result = await getNextBestAction({
      leadId,
      state: (lead as { state?: string })?.state ?? "NEW",
      dealId: (deal as { id?: string })?.id,
    });
    return NextResponse.json(result);
  } catch (_e) {
    // Error response below
    return NextResponse.json({ error: "Failed to get next action" }, { status: 500 });
  }
}
