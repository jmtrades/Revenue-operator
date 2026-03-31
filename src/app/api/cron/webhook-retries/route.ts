import { NextRequest, NextResponse } from "next/server";
import { processWebhookRetries } from "@/lib/integrations/webhook-events";
import { log } from "@/lib/logger";
import { assertCronAuthorized } from "@/lib/runtime";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  try {
    const processed = await processWebhookRetries();
    log("info", "cron.webhook_retries", { processed });
    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    log("error", "cron.webhook_retries.failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
