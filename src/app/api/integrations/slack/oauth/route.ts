/**
 * GET /api/integrations/slack/oauth — Start Slack OAuth; redirect to Slack with state=workspace_id.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { createOAuthState } from "@/lib/integrations/oauth-state";

export const dynamic = "force-dynamic";

const SLACK_SCOPES = "chat:write,channels:read,groups:read";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const clientId = process.env.SLACK_CLIENT_ID?.trim();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const redirectUri = `${origin.replace(/\/$/, "")}/api/integrations/slack/callback`;
  if (!clientId) return NextResponse.json({ error: "Slack not configured" }, { status: 503 });

  const state = createOAuthState(session.workspaceId);
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", SLACK_SCOPES);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
