export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { assembleLeadContext, type InteractionType } from "@/lib/ai/context-assembler";
import { log } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;

    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 }
      );
    }

    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    const interactionType = (req.nextUrl.searchParams.get("interaction_type") ||
      "call") as InteractionType;

    if (!workspaceId || typeof workspaceId !== "string") {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 }
      );
    }

    // Validate interaction type
    const validTypes: InteractionType[] = ["call", "sms", "email"];
    if (!validTypes.includes(interactionType)) {
      return NextResponse.json(
        { error: `Invalid interaction_type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    // Rate limit: 100 per minute per workspace
    const rl = await checkRateLimit(
      `lead_context:${workspaceId}:${leadId}`,
      100,
      60000
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many context requests. Please try again shortly." },
        { status: 429 }
      );
    }

    // Assemble the context
    const context = await assembleLeadContext(
      workspaceId,
      leadId,
      interactionType
    );

    return NextResponse.json(
      {
        success: true,
        context,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log("error", "Lead context error:", { error: message, err });

    return NextResponse.json(
      {
        error: "Failed to assemble lead context. Please try again.",
      },
      { status: 500 }
    );
  }
}
