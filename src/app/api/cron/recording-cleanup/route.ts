import { NextResponse } from "next/server";
import { cleanupExpiredRecordings } from "@/lib/voice/call-recording-engine";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const cleaned = await cleanupExpiredRecordings();
    log("info", "cron.recording_cleanup", { cleaned });
    return NextResponse.json({ ok: true, cleaned });
  } catch (err) {
    log("error", "cron.recording_cleanup.failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
