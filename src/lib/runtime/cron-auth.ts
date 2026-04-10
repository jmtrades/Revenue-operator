/**
 * Cron authentication: require Bearer CRON_SECRET on every invocation.
 * Runs environment validation on first call (once per cold start).
 *
 * Security: We do NOT trust cron scheduler headers alone because they can
 * be spoofed by any external caller. Configure cron routes to
 * include an Authorization header, or set CRON_SECRET as a query param
 * that the cron URL includes.
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { validateEnvironment } from "./validate-environment";

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export function assertCronAuthorized(req: { headers: { get: (name: string) => string | null }; url?: string }): NextResponse | null {
  validateEnvironment();
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron not configured" }, { status: 501 });
  }

  // Check Authorization header (required)
  const auth = req.headers.get("authorization");
  if (auth && safeCompare(auth, `Bearer ${secret}`)) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
