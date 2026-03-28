import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";

/**
 * Contact form submission. Accepts POST { name, email, company?, message }.
 * Persists to contact_submissions when DB configured; always returns 200.
 */
export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;
  // Rate limiting: 10 requests per minute per IP
  const clientIp = getClientIp(req);
  const rl = await checkRateLimit(`contact:${clientIp}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : null;
    const email = typeof body?.email === "string" ? body.email.trim() : null;
    const message = typeof body?.message === "string" ? body.message.trim() : null;
    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields: name, email, message" }, { status: 400 });
    }
    const company = typeof body?.company === "string" ? body.company.trim() : null;
    try {
      const db = getDb();
      await db.from("contact_submissions").insert({ name, email, company: company ?? null, message });
    } catch {
      // DB not configured or insert failed; continue
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
