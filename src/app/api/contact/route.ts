import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/queries";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";

const contactSchema = z.object({
  name: z.string().min(1).max(200).transform((s) => s.trim()),
  email: z.string().email().max(320).transform((s) => s.trim()),
  message: z.string().min(1).max(5000).transform((s) => s.trim()),
  company: z.string().max(200).transform((s) => s.trim()).optional().nullable(),
});

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
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Missing or invalid fields: name, email, message" }, { status: 400 });
    }
    const { name, email, message, company } = parsed.data;
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
