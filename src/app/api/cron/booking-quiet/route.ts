/**
 * Cron: 1h before business close, bookings today and no booking-shortly sent → "All upcoming attendance remains arranged."
 * Run every 30 min (cron: 30 * * * *).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runBookingQuietGuarantee } from "@/lib/negative-signal-semantics";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const results = await runBookingQuietGuarantee();
  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.sent).length,
    results,
  });
}
