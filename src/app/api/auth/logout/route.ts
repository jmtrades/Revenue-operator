/**
 * Clear session cookie so user must enter email again (explicit logout).
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionCookieName } from "@/lib/auth/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set(
    "Set-Cookie",
    `${getSessionCookieName()}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
  return res;
}
