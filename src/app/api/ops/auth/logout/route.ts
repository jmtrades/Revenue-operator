/**
 * Logout - clear session cookie
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/ops/auth";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
