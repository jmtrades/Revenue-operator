/**
 * GET /api/integrations/slack/callback — Slack OAuth callback; exchange code, store token, redirect.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { encrypt } from "@/lib/encryption";
import { verifyOAuthState } from "@/lib/integrations/oauth-state";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const rawState = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const returnUrl = `${origin.replace(/\/$/, "")}/app/settings/integrations`;

  if (error || !code) {
    return NextResponse.redirect(`${returnUrl}?slack=error`);
  }
  if (!rawState) {
    return NextResponse.redirect(returnUrl);
  }

  // Verify HMAC-signed state to prevent CSRF
  const verifiedWorkspaceId = verifyOAuthState(rawState);
  if (!verifiedWorkspaceId) {
    return NextResponse.redirect(`${returnUrl}?slack=error&reason=invalid_state`);
  }

  const clientId = process.env.SLACK_CLIENT_ID?.trim();
  const clientSecret = process.env.SLACK_CLIENT_SECRET?.trim();
  const redirectUri = `${origin.replace(/\/$/, "")}/api/integrations/slack/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${returnUrl}?slack=config`);
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${returnUrl}?slack=error`);
  }

  const data = (await tokenRes.json()) as {
    ok?: boolean;
    access_token?: string;
    team?: { id?: string; name?: string };
    error?: string;
  };
  if (!data.ok || !data.access_token) {
    return NextResponse.redirect(`${returnUrl}?slack=error`);
  }

  const workspaceId = verifiedWorkspaceId;
  const tokenEnc = await encrypt(data.access_token);
  const teamId = data.team?.id ?? null;
  const teamName = data.team?.name ?? null;
  const now = new Date().toISOString();

  const db = getDb();
  await db
    .from("workspace_slack_config")
    .upsert(
      {
        workspace_id: workspaceId,
        access_token_encrypted: tokenEnc,
        team_id: teamId,
        team_name: teamName,
        updated_at: now,
      },
      { onConflict: "workspace_id" }
    );

  return NextResponse.redirect(`${returnUrl}?slack=connected`);
}
