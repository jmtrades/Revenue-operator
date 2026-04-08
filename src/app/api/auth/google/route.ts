import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getGoogleAuthClientId,
  getGoogleAuthRedirectUri,
  sanitizeNextPath,
} from "@/lib/auth/google-oauth";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "rt_google_oauth_state";
const NEXT_COOKIE = "rt_google_oauth_next";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  };
}

export async function GET(req: NextRequest) {
  try {
    const clientId = getGoogleAuthClientId();
    if (!clientId) {
      return NextResponse.redirect(new URL("/sign-in?error=google_config", req.nextUrl.origin));
    }

    const state = randomUUID();
    const next = sanitizeNextPath(req.nextUrl.searchParams.get("next"));
    const redirectUri = getGoogleAuthRedirectUri(req.nextUrl.origin);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });

    const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
    res.cookies.set(STATE_COOKIE, state, cookieOptions());
    res.cookies.set(NEXT_COOKIE, next, cookieOptions());
    return res;
  } catch (err) {
    console.error("google auth route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
