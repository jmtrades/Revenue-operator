/**
 * Cron authentication: require Bearer CRON_SECRET. No cron may execute without auth.
 * Runs environment validation on first call (once per cold start).
 */

import { NextResponse } from "next/server";
import { validateEnvironment } from "./validate-environment";

export function assertCronAuthorized(req: { headers: { get: (name: string) => string | null } }): NextResponse | null {
  validateEnvironment();
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron not configured" }, { status: 501 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
