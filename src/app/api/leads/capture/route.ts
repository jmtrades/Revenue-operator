/**
 * POST /api/leads/capture — Lightweight email capture for marketing forms.
 * Stores emails before signup redirect so leads aren't lost if user bounces.
 * Rate-limited to 5 captures per IP per 10 minutes.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`lead-capture:${ip}`, 5, 600_000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: { email?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const db = (await import("@/lib/db/queries")).getDb();
    const DEMO_WORKSPACE =
      process.env.DEMO_WORKSPACE_ID ||
      "027ac617-5ab8-4e26-bcb3-1a2f5ad6bef9";

    await db.from("leads").upsert(
      {
        workspace_id: DEMO_WORKSPACE,
        email,
        state: "NEW",
        channel: "website",
        metadata: {
          source: body.source || "email_capture",
          captured_at: new Date().toISOString(),
        },
      },
      { onConflict: "workspace_id,email", ignoreDuplicates: true }
    );
  } catch (err) {
    console.error("[leads/capture] Failed to store lead:", err);
    // Still return ok — we don't want capture failures to block the user
  }

  return NextResponse.json({ ok: true });
}
