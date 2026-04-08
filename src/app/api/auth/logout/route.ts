/**
 * Clear session cookie so user must enter email again (explicit logout).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const res = NextResponse.json({ ok: true });
  res.headers.set(
    "Set-Cookie",
    `${getSessionCookieName()}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
  return res;
}
