/**
 * Logout - clear session cookie
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/ops/auth";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
