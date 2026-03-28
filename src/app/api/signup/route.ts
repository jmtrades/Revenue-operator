/**
 * POST /api/signup — form submission from /activate.
 * Stores in signups table; sends magic link when Supabase Auth is configured.
 * Public, no auth.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { getDb } from "@/lib/db/queries";
import { getBaseUrl } from "@/lib/runtime/base-url";
import { parseBody, emailSchema } from "@/lib/api/validate";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

const signupSchema = z.object({
  email: emailSchema,
  name: z.string().max(255).optional(),
  businessName: z.string().max(255).optional(),
  phone: z.string().max(20).optional(),
  industry: z.string().max(100).optional(),
  businessType: z.string().max(100).optional(),
  website: z.string().url("Invalid website URL").optional(),
});

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`signup:${ip}`, 5, 3600_000);
    if (!rl.allowed) {
      return NextResponse.json({ ok: false, error: "Too many signup attempts. Please try again later." }, { status: 429 });
    }

    const parsed = await parseBody(req, signupSchema);
    if ('error' in parsed) return parsed.error;
    const body = parsed.data;

    const name = (body.name ?? "").trim();
    const business_name = (body.businessName ?? "").trim();
    const email = body.email.trim();
    const phone = (body.phone ?? "").trim() || null;
    const industry =
      ((body.industry ?? "").trim()) ||
      ((body.businessType ?? "").trim()) ||
      null;
    const website = (body.website ?? "").trim() || null;

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
      const redirectTo = `${getBaseUrl(req.nextUrl?.origin ?? null)}/auth/callback?next=/activate`;
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
        <p><a href="${baseUrl}/activate">Go to onboarding →</a></p>
        <p>If you didn't request this, you can ignore this email.</p>
      `;
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: email, subject: "Welcome to Recall Touch — set up in 5 minutes", html: welcomeHtml }),
      }).catch((err) => { log("error", "signup.email_send_error", { error: err instanceof Error ? err.message : String(err) }); });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    log("error", "signup.storage_error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: false, error: "Signup storage unavailable" }, { status: 500 });
  }
}
