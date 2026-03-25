/**
 * GET /api/solo/sections?workspace_id=...
 * Solo surface: four sections as factual sentences. Auth required.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getSoloSections } from "@/lib/surfaces/solo-sections";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const sections = await getSoloSections(workspaceId);
  return NextResponse.json(sections);
}
