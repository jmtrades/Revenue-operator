/**
 * GET /api/integrations/google-calendar/callback — OAuth callback; exchange code for tokens, save, redirect.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import {
  getGoogleCalendarClientId,
  getGoogleCalendarClientSecret,
} from "@/lib/integrations/google-calendar-env";
import { encrypt } from "@/lib/encryption";
import { verifyOAuthState } from "@/lib/integrations/oauth-state";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const rawState = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const returnUrl = `${origin}/app/settings/integrations`;

  if (error || !code) {
    return NextResponse.redirect(`${returnUrl}?calendar=error`);
  }
  if (!rawState) {
    return NextResponse.redirect(returnUrl);
  }

  // Verify HMAC-signed state to prevent CSRF
  const workspaceId = verifyOAuthState(rawState);
  if (!workspaceId) {
    return NextResponse.redirect(`${returnUrl}?calendar=error&reason=invalid_state`);
  }

  const clientId = getGoogleCalendarClientId();
  const clientSecret = getGoogleCalendarClientSecret();
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim() ?? `${origin}/api/integrations/google-calendar/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${returnUrl}?calendar=config`);
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${returnUrl}?calendar=error`);
  }

  const tokens = (await tokenRes.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  try {
    const accessEnc = tokens.access_token ? await encrypt(tokens.access_token) : null;
    const refreshEnc = tokens.refresh_token ? await encrypt(tokens.refresh_token) : null;

    const db = getDb();
    const { error: upsertErr } = await db.from("google_calendar_tokens").upsert(
      {
        workspace_id: workspaceId,
        access_token: accessEnc,
        refresh_token: refreshEnc,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    );
    if (upsertErr) throw upsertErr;
  } catch {
    return NextResponse.redirect(`${returnUrl}?calendar=error`);
  }

  return NextResponse.redirect(`${returnUrl}?calendar=connected`);
}
