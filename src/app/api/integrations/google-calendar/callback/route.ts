/**
 * GET /api/integrations/google-calendar/callback — OAuth callback; exchange code for tokens, save, redirect.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import {
  getGoogleCalendarClientId,
  getGoogleCalendarClientSecret,
} from "@/lib/integrations/google-calendar-env";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state"); // workspace_id
  const error = req.nextUrl.searchParams.get("error");

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const returnUrl = `${origin}/app/settings/integrations`;

  if (error || !code) {
    return NextResponse.redirect(`${returnUrl}?calendar=error`);
  }
  if (!state) {
    return NextResponse.redirect(returnUrl);
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
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${returnUrl}?calendar=error`);
  }

  const tokens = (await tokenRes.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  try {
    const db = getDb();
    const { error: upsertErr } = await db.from("google_calendar_tokens").upsert(
      {
        workspace_id: state,
        access_token: tokens.access_token ?? null,
        refresh_token: tokens.refresh_token ?? null,
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
