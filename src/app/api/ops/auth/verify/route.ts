/**
 * Verify magic link token, create session, set cookie, redirect to /ops
 * GET ?token=xxx
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLinkAndCreateSession, setSessionCookie } from "@/lib/ops/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/ops/login?error=missing_token", req.url));
  }

  const result = await verifyMagicLinkAndCreateSession(token);
  if ("error" in result) {
    return NextResponse.redirect(new URL(`/ops/login?error=${encodeURIComponent(result.error)}`, req.url));
  }

  if (result.sessionToken) {
    await setSessionCookie(result.sessionToken);
  }

  return NextResponse.redirect(new URL("/ops", req.url));
}
