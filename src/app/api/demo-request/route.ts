import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";

export const dynamic = "force-dynamic";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  // Rate limit: 5 demo requests per hour per IP
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`demo-request:${ip}`, 5, 3600_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  let body: { name?: string; email?: string; company?: string | null; lookingFor?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const company = (body.company ?? "").trim() || null;
  const lookingFor = (body.lookingFor ?? "").trim() || null;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const db = getDb();

  try {
    // Persist request if table exists; ignore failure if not
    await db
      .from("demo_requests")
      .insert({
        name,
        email,
        company,
        looking_for: lookingFor,
        created_at: new Date().toISOString(),
      });
  } catch {
    // Non-fatal: we still acknowledge the request
  }

  // Optionally trigger notification via existing email infra in the future.
  return NextResponse.json({ ok: true });
}
