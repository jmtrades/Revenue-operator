/**
 * Phase 78 / Task 7.4 — Cron endpoint: sync FTC National DNC Registry.
 *
 * Invoked by Vercel Cron (or external scheduler) once per day. Bearer-gated
 * on `CRON_SECRET` via the shared `assertCronAuthorized` helper — no CallSid
 * or UUID-as-auth shortcut; a missing or mismatched Bearer token gets 401
 * (or 501 if CRON_SECRET itself isn't configured).
 *
 * The route itself is a thin shell around `syncFtcDnc()` — all the
 * federal-feed logic lives in `@/lib/voice/ftc-dnc` so it can be unit-tested
 * without a real HTTP request.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { syncFtcDnc } from "@/lib/voice/ftc-dnc";
import { log } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  try {
    const result = await syncFtcDnc();
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", "ftc_dnc.cron.unhandled", { error: message });
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
