export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getFollowUpRecommendation } from "@/lib/intelligence/follow-up";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: leadId } = await params;
  const db = getDb();
  const { data: lead } = await db.from("leads").select("workspace_id").eq("id", leadId).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const accessErr = await requireWorkspaceAccess(req, (lead as { workspace_id: string }).workspace_id);
  if (accessErr) return accessErr;
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
