/**
 * GET /api/team — List team members for workspace (v7 team_members table).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;
  const db = getDb();
  try {
    const { data, error } = await db.from("team_members").select("id, name, email, role, is_on_call").eq("workspace_id", workspaceId).order("created_at");
    if (error) return NextResponse.json({ team: [] });
    return NextResponse.json({ team: data ?? [] });
  } catch {
    return NextResponse.json({ team: [] });
  }
}
