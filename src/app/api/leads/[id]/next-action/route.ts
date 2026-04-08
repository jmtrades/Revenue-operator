export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getNextBestAction } from "@/lib/intelligence/next-best-action";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Auth check BEFORE lead lookup
  const db = getDb();
  const { id: leadId } = await params;

  const { data: lead } = await db.from("leads").select("state, workspace_id").eq("id", leadId).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const accessErr = await requireWorkspaceAccess(req, (lead as { workspace_id: string }).workspace_id);
  if (accessErr) return accessErr;
  const { data: deal } = await db.from("deals").select("id").eq("lead_id", leadId).neq("status", "lost").limit(1).maybeSingle();

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
