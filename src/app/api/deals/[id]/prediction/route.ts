export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { predictDealOutcome } from "@/lib/intelligence/deal-prediction";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const { data: dealRow } = await db
    .from("deals")
    .select("workspace_id")
    .eq("id", id)
    .maybeSingle();
  const workspaceId = (dealRow as { workspace_id?: string } | null)?.workspace_id;
  if (workspaceId) {
    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;
  }
  try {
    const prediction = await predictDealOutcome(id);
    return NextResponse.json(prediction);
  } catch (e) {
    // Error response below
    return NextResponse.json(
      { error: "Failed to compute prediction" },
      { status: 500 }
    );
  }
}
