import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

/**
 * Founding members / early access waitlist.
 * Accepts POST { email } — persists to waitlist table when DB configured; always returns 200.
 */
export async function POST(req: NextRequest) {
  try {
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
