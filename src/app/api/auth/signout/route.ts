/**
 * POST /api/auth/signout — Clear session and optionally Supabase session.
 */

import { NextResponse } from "next/server";
import { getSessionCookieName } from "@/lib/auth/session-edge";

export const dynamic = "force-dynamic";

const COOKIE_NAME = getSessionCookieName();

export async function POST() {

  const res = NextResponse.json({ ok: true });
  res.headers.set(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
  return res;
}
