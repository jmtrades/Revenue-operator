/**
 * GET /api/integrations/google-calendar/auth — Redirect to Google OAuth (requires session).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";

export const dynamic = "force-dynamic";

const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const BASE = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim() ?? `${process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin}/api/integrations/google-calendar/callback`;
  if (!clientId) {
    return NextResponse.json({ error: "Google Calendar not configured" }, { status: 503 });
  }

  const state = session.workspaceId;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    state,
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(`${BASE}?${params.toString()}`);
}
