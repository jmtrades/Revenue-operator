export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  analyzeCallAndLearn,
  getAccumulatedLearnings,
  type CallOutcome,
} from "@/lib/ai/auto-learn";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  try {
    const body = await req.json();
    const { call_id, transcript, outcome, workspace_id } = body as {
      call_id?: string;
      transcript?: string;
      outcome?: string;
      workspace_id?: string;
    };

    if (!workspace_id || typeof workspace_id !== "string") {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 }
      );
    }

    const authErr = await requireWorkspaceAccess(req, workspace_id);
    if (authErr) return authErr;

    // Rate limit: 100 per hour per workspace
    const rl = await checkRateLimit(
      `auto_learn:${workspace_id}`,
      100,
      3600000
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many learning requests. Limit: 100 per hour" },
        { status: 429 }
      );
    }

    if (!call_id || typeof call_id !== "string") {
      return NextResponse.json(
        { error: "call_id is required" },
        { status: 400 }
      );
    }

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "transcript is required" },
        { status: 400 }
      );
    }

    if (!outcome || typeof outcome !== "string") {
      return NextResponse.json(
        { error: "outcome is required" },
        { status: 400 }
      );
    }

    // Validate outcome
    const validOutcomes: CallOutcome[] = [
      "booked",
      "no_show",
      "hung_up",
      "voicemail",
      "transferred",
      "declined",
      "interested_followup",
      "not_interested",
      "technical_issue",
    ];

    if (!validOutcomes.includes(outcome as CallOutcome)) {
      return NextResponse.json(
        {
          error: `Invalid outcome. Must be one of: ${validOutcomes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Analyze and learn from call
    const learning = await analyzeCallAndLearn(
      workspace_id,
      call_id,
      transcript,
      outcome as CallOutcome
    );

    return NextResponse.json(
      {
        success: true,
        learning,
        message: "Call analyzed and learning recorded.",
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log("error", "Auto-learn POST error:", { error: message, err });

    return NextResponse.json(
      {
        error: "Failed to analyze call for learning. Please try again.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");

    if (!workspaceId || typeof workspaceId !== "string") {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 }
      );
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    // Rate limit: 30 per hour
    const rl = await checkRateLimit(
      `auto_learn_get:${workspaceId}`,
      30,
      3600000
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Limit: 30 per hour" },
        { status: 429 }
      );
    }

    const learnings = await getAccumulatedLearnings(workspaceId);

    return NextResponse.json(
      {
        success: true,
        learnings,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log("error", "Auto-learn GET error:", { error: message, err });

    return NextResponse.json(
      {
        error: "Failed to retrieve accumulated learnings.",
      },
      { status: 500 }
    );
  }
}
import { log } from "@/lib/logger";
