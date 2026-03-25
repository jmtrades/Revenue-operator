/**
 * Orientation absence signal: no orientation record for 6h during business hours → one line. Once per day.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { runOrientationAbsenceSignal } from "@/lib/orientation/absence-signal";

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const results = await runOrientationAbsenceSignal();
  return NextResponse.json({ ok: true, sent: results.filter((r) => r.sent).length, results });
}
