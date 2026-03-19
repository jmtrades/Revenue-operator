/**
 * POST /api/vapi/create-agent — DEPRECATED. Redirect to new agent creation flow.
 * DEPRECATED: This Vapi-specific endpoint is no longer maintained.
 * Use the Recall voice system (/api/agents) for agent creation instead.
 * This endpoint will return 410 Gone in a future release.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error: "This endpoint is deprecated",
      message: "Vapi integration is no longer supported. Use /api/agents to create and manage voice agents with the Recall voice system.",
      status: 410,
    },
    { status: 410 }
  );
}
