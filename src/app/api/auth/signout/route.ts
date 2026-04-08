/**
 * POST /api/auth/signout — Clear session and optionally Supabase session.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName } from "@/lib/auth/session-edge";
import { assertSameOrigin } from "@/lib/http/csrf";

export const dynamic = "force-dynamic";

const COOKIE_NAME = getSessionCookieName();

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const res = NextResponse.json({ ok: true });
  res.headers.set(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
  return res;
}
