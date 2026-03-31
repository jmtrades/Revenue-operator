/**
 * GET /api/org/sections?workspace_id=...
 * Org surface: four sections as factual sentences. Auth required.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getOrgSections } from "@/lib/surfaces/org-sections";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  try {
    const sections = await getOrgSections(workspaceId);
    return NextResponse.json(sections);
  } catch (err) {
    log("error", "[org-sections]", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load sections" }, { status: 500 });
  }
}
import { log } from "@/lib/logger";
