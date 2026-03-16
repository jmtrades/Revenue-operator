/**
 * POST /api/signup — form submission from /activate.
 * Stores in signups table; sends magic link when Supabase Auth is configured.
 * Public, no auth.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getDb } from "@/lib/db/queries";
import { getBaseUrl } from "@/lib/runtime/base-url";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const business_name = typeof body.businessName === "string" ? body.businessName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : null;
    const industry =
      (typeof body.industry === "string" ? body.industry.trim() : null) ||
      (typeof body.businessType === "string" ? body.businessType.trim() : null) ||
      null;
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnon) {
      const redirectTo = `${getBaseUrl(req.nextUrl?.origin ?? null)}/auth/callback?next=/dashboard/onboarding`;
      const supabase = createClient(supabaseUrl, supabaseAnon);
      await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM ?? "Recall Touch <noreply@recall-touch.com>";
    if (resendKey && email) {
      const baseUrl = getBaseUrl(req.nextUrl?.origin ?? null);
      const welcomeHtml = `
        <p>Hi${name ? ` ${name.split(" ")[0]}` : ""},</p>
        <p>Welcome to Recall Touch. Set up your AI phone system in 5 minutes.</p>
        <p><a href="${baseUrl}/dashboard/onboarding">Go to onboarding →</a></p>
        <p>If you didn't request this, you can ignore this email.</p>
      `;
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: email, subject: "Welcome to Recall Touch — set up in 5 minutes", html: welcomeHtml }),
      }).catch((err) => { console.error("[signup] error:", err instanceof Error ? err.message : err); });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Signup storage unavailable" }, { status: 500 });
  }
}
