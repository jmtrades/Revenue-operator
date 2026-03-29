/**
 * GET /api/voice/resolve?workspaceId=xxx — Resolve the voice for a call
 *
 * Returns the voice_id to use for an outbound or inbound call, considering:
 * 1. Active A/B tests (random assignment with traffic_split)
 * 2. Workspace active_voice_id setting
 * 3. Default voice ID
 *
 * Response: { voiceId: string, abTestId?: string, variant?: "a" | "b" }
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { resolveVoiceForCall } from "@/lib/voice/resolve-voice";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const resolved = await resolveVoiceForCall(workspaceId);

    return NextResponse.json({
      voiceId: resolved.voiceId,
      ...(resolved.abTestId && { abTestId: resolved.abTestId }),
      ...(resolved.variant && { variant: resolved.variant }),
    });
  } catch (error) {
    log("error", "voice.resolve.GET", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to resolve voice" },
      { status: 500 }
    );
  }
}
