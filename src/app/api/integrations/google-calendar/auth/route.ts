/**
 * GET /api/integrations/google-calendar/auth — Redirect to Google OAuth (requires session).
 *
 * Phase 78 / Phase 5 (D36): this route now uses PKCE (RFC 7636) + signed
 * state with a 5-minute exp. The `code_verifier` is stashed in an httpOnly
 * SameSite=Lax cookie scoped to the callback path; the `code_challenge`
 * (base64url(sha256(verifier))) is sent to Google. A stolen authorization
 * code is no longer sufficient to exchange — the attacker would also need
 * the verifier, which never leaves the user's cookie jar.
 *
 * Back-compat: `createOAuthState` used `SESSION_SECRET`/`ENCRYPTION_KEY` and
 * wrapped `{workspaceId, ts}`. The new `signState` uses `OAUTH_STATE_SECRET`
 * and `{workspace_id, ...}` with an explicit `exp` field. If you touch this,
 * keep the callback on the same primitive or the handshake breaks.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getGoogleCalendarClientId } from "@/lib/integrations/google-calendar-env";
import {
  generatePKCE,
  OAuthStateConfigError,
} from "@/lib/security/oauth-pkce";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

const SCOPE = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";
const BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const VERIFIER_COOKIE = "gcal_pkce_verifier";
const VERIFIER_COOKIE_MAX_AGE_SECONDS = 300; // matches state exp

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const clientId = getGoogleCalendarClientId();
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim() ?? `${process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin}/api/integrations/google-calendar/callback`;
  if (!clientId) {
    return NextResponse.json({ error: "Google Calendar not configured" }, { status: 503 });
  }

  let pkce;
  try {
    pkce = generatePKCE({ workspace_id: session.workspaceId });
  } catch (err) {
    if (err instanceof OAuthStateConfigError) {
      log("error", "gcal_auth.oauth_state_config_error", {
        message: err.message,
      });
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 },
      );
    }
    throw err;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    state: pkce.state,
    access_type: "offline",
    prompt: "consent",
    code_challenge: pkce.code_challenge,
    code_challenge_method: pkce.code_challenge_method,
  });

  const res = NextResponse.redirect(`${BASE}?${params.toString()}`);
  // Scope the cookie to the callback path so it can't leak to other routes.
  // `secure: true` is unconditional — modern browsers accept Secure cookies
  // from http://localhost, and anything else should be HTTPS. Matches the
  // existing Airtable PKCE pattern in `crm/[provider]/connect`.
  res.cookies.set(VERIFIER_COOKIE, pkce.code_verifier, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: VERIFIER_COOKIE_MAX_AGE_SECONDS,
    path: "/api/integrations/google-calendar/callback",
  });
  return res;
}
