/**
 * GET /api/integrations/slack/oauth — Start Slack OAuth; redirect to Slack with state=workspace_id.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";

export const dynamic = "force-dynamic";

const SLACK_SCOPES = "chat:write,channels:read,groups:read";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = process.env.SLACK_CLIENT_ID?.trim();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const redirectUri = `${origin.replace(/\/$/, "")}/api/integrations/slack/callback`;
  if (!clientId) return NextResponse.json({ error: "Slack not configured" }, { status: 503 });

  const state = session.workspaceId;
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", SLACK_SCOPES);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
