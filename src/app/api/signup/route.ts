/**
 * POST /api/signup — form submission from /activate.
 * Stores in signups table when Supabase is configured. Public, no auth.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const business_name = typeof body.businessName === "string" ? body.businessName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : null;
    const industry = typeof body.industry === "string" ? body.industry.trim() || null : null;
    const website = typeof body.website === "string" ? body.website.trim() || null : null;

    if (!email) {
      return NextResponse.json({ ok: false, error: "Email required" }, { status: 400 });
    }

    const db = getDb();
    await db.from("signups").insert({
      name: name || "—",
      business_name: business_name || "—",
      email,
      phone,
      industry,
      website,
      status: "pending",
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Signup storage unavailable" }, { status: 500 });
  }
}
