/**
 * GET /api/previews
 * Pending action previews for workspace. Visibility only.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPreviews } from "@/lib/adoption-acceleration/previews";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const previews = await getPreviews(workspaceId);
  return NextResponse.json({ previews });
}
