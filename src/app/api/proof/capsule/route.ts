/**
 * GET /api/proof/capsule — boolean attestations only. No counts, amounts, dates, ids.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getProofCapsule } from "@/lib/proof/capsule";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const capsule = await getProofCapsule(workspaceId);
  return NextResponse.json(capsule);
}
