import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Founding members / early access waitlist.
 * Accepts POST { email } — persists to waitlist table when DB configured; always returns 200.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`waitlist:${ip}`, 5, 3600_000);
    if (!rl.allowed) {
      return NextResponse.json({ ok: false, error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim() : null;
    if (!email) {
      return NextResponse.json({ ok: true });
    }
    try {
      const db = getDb();
      await db.from("waitlist").insert({ email });
    } catch {
      // DB not configured or insert failed; continue
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
