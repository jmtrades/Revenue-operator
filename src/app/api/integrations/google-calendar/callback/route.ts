/**
 * GET /api/integrations/google-calendar/callback — OAuth callback; exchange
 * code for tokens, save, redirect.
 *
 * Phase 78 / Phase 5 (D36):
 *   - State is verified against `OAUTH_STATE_SECRET` via `verifyState` (HMAC-
 *     SHA256, 5-minute exp, constant-time compare). A forged state parameter
 *     aimed at writing tokens into another workspace will throw here.
 *   - The PKCE `code_verifier` cookie set by `/auth` is required. If it's
 *     missing (expired, stripped, or the redirect came from outside our own
 *     `/auth` handshake), we bail before touching Google. The verifier is
 *     forwarded to Google's `/token` endpoint, which will reject the
 *     exchange unless it matches the `code_challenge` presented at `/auth`.
 *   - The verifier cookie is cleared on every response path — success and
 *     every error — so a stale verifier can't be replayed.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import {
  getGoogleCalendarClientId,
  getGoogleCalendarClientSecret,
} from "@/lib/integrations/google-calendar-env";
import {
  verifyState,
  OAuthStateConfigError,
  OAuthStateVerificationError,
} from "@/lib/security/oauth-pkce";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

const VERIFIER_COOKIE = "gcal_pkce_verifier";

function redirectClearing(
  targetUrl: string,
): NextResponse {
  const res = NextResponse.redirect(targetUrl);
  // Scope must match the `set` call in /auth or the browser won't delete it.
  res.cookies.set(VERIFIER_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/api/integrations/google-calendar/callback",
  });
  return res;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const rawState = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const returnUrl = `${origin}/app/settings/integrations`;

  if (error || !code) {
    return redirectClearing(`${returnUrl}?calendar=error`);
  }
  if (!rawState) {
    return redirectClearing(returnUrl);
  }

  // Phase 78/Phase 5: signed state — throws on tamper/expiry/missing-secret.
  let workspaceId: string;
  try {
    const parsed = verifyState(rawState);
    const ws = parsed.workspace_id;
    if (typeof ws !== "string" || !ws) {
      throw new OAuthStateVerificationError("state: workspace_id missing");
    }
    workspaceId = ws;
  } catch (err) {
    if (err instanceof OAuthStateConfigError) {
      log("error", "gcal_callback.oauth_state_config_error", {
        message: err.message,
      });
      return redirectClearing(`${returnUrl}?calendar=config`);
    }
    if (err instanceof OAuthStateVerificationError) {
      log("warn", "gcal_callback.oauth_state_invalid", {
        message: err.message,
      });
      return redirectClearing(
        `${returnUrl}?calendar=error&reason=invalid_state`,
      );
    }
    throw err;
  }

  // Phase 78/Phase 5: PKCE code_verifier is MANDATORY. If the cookie is
  // missing the handshake didn't originate here — reject.
  const codeVerifier = req.cookies.get(VERIFIER_COOKIE)?.value;
  if (!codeVerifier) {
    log("warn", "gcal_callback.pkce_verifier_missing", { workspaceId });
    return redirectClearing(
      `${returnUrl}?calendar=error&reason=pkce_missing`,
    );
  }

  const clientId = getGoogleCalendarClientId();
  const clientSecret = getGoogleCalendarClientSecret();
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim() ?? `${origin}/api/integrations/google-calendar/callback`;

  if (!clientId || !clientSecret) {
    return redirectClearing(`${returnUrl}?calendar=config`);
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    // Phase 78/Phase 5: proof-of-possession tying this exchange to the same
    // browser that initiated /auth. Google verifies this matches the
    // `code_challenge` we sent earlier.
    code_verifier: codeVerifier,
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!tokenRes.ok) {
    return redirectClearing(`${returnUrl}?calendar=error`);
  }

  const tokens = (await tokenRes.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  try {
    const db = getDb();
    const { error: upsertErr } = await db.from("google_calendar_tokens").upsert(
      {
        workspace_id: workspaceId,
        access_token: tokens.access_token ?? null,
        refresh_token: tokens.refresh_token ?? null,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    );
    if (upsertErr) throw upsertErr;
  } catch {
    return redirectClearing(`${returnUrl}?calendar=error`);
  }

  return redirectClearing(`${returnUrl}?calendar=connected`);
}
