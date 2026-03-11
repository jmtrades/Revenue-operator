/**
 * GET /api/integrations/slack/channels — List Slack channels for workspace (channel picker).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getSlackChannelsList } from "@/lib/integrations/slack";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getSlackChannelsList(session.workspaceId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ channels: result });
}
