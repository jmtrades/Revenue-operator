/**
 * POST /api/auth/signup — Sign up with email + password.
 * Creates Supabase user (Auth + DB), then sets Supabase auth cookies and revenue_session cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { createSessionCookie } from "@/lib/auth/session";
import { getDb } from "@/lib/db/queries";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  validateEmail,
  validatePasswordForSignup,
  normalizeBusinessName,
  toFriendlySignupError,
} from "@/lib/auth/validate";
import { sendWelcomeEmail } from "@/lib/email/welcome";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Auth not configured", code: "auth_config" }, { status: 503 });
  }

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`signup:${ip}`, 5, 3600_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const origin = req.nextUrl.origin.includes("localhost")
    ? (process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin)
    : req.nextUrl.origin;
  const emailRedirectTo = `${origin}/activate`;

  let body: { email?: string; password?: string; businessName?: string };
  try {
    body = (await req.json()) as { email?: string; password?: string; businessName?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const emailResult = validateEmail(body?.email ?? "");
  if (!emailResult.ok) return NextResponse.json({ error: emailResult.error }, { status: 400 });
  const email = emailResult.value;

  const passwordResult = validatePasswordForSignup(body?.password ?? "");
  if (!passwordResult.ok) return NextResponse.json({ error: passwordResult.error }, { status: 400 });
  const password = passwordResult.value;

  const sessionSecret = (process.env.SESSION_SECRET ?? "").trim();
  if (!sessionSecret) {
    log("error", "[signup] SESSION_SECRET is not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // Additional password strength validation: minimum 8 chars, at least 1 number
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  if (!/\d/.test(password)) {
    return NextResponse.json({ error: "Password must contain at least one number" }, { status: 400 });
  }

  const businessName = normalizeBusinessName(body?.businessName);
  const sendWelcome = () => {
    void sendWelcomeEmail(email, businessName).catch((err) => { log("error", "[auth/signup] error:", { error: err instanceof Error ? err.message : err }); });
  };
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  // Prefer admin.createUser when service role is set — bypasses "Error sending confirmation email"
  if (serviceRoleKey) {
    try {
      const admin = createSupabaseJsClient(url, serviceRoleKey);
      const { data: adminData, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: { business_name: businessName },
      });
      if (createErr) {
        if (createErr.message?.toLowerCase().includes("already") || createErr.message?.toLowerCase().includes("duplicate")) {
          return NextResponse.json({ error: "Account already exists — try signing in" }, { status: 409 });
        }
        return NextResponse.json({ error: toFriendlySignupError(createErr.message ?? "") }, { status: 400 });
      }
      const userId = adminData?.user?.id;
      if (!userId) {
        return NextResponse.json({ error: "Sign up failed" }, { status: 400 });
      }
      let workspaceId: string | undefined;
      try {
        const db = getDb();
        await db.from("users").upsert({ id: userId, email }, { onConflict: "id" });
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14);
        const { data: created, error: insertErr } = await db
          .from("workspaces")
          .insert({ name: businessName, owner_id: userId, autonomy_level: "assisted", kill_switch: false, billing_status: "trial", trial_ends_at: trialEnd.toISOString() })
          .select("id")
          .maybeSingle();
        if (!insertErr && created) {
          workspaceId = (created as { id: string }).id;
          await db.from("settings").insert({ workspace_id: workspaceId, risk_level: "balanced" });
          await db.from("workspace_members").insert({ workspace_id: workspaceId, user_id: userId, role: "owner" });
          await db.from("workspace_billing").insert({ workspace_id: workspaceId, plan: "trial", status: "trialing", trial_ends_at: trialEnd.toISOString() });
        }
      } catch {
        // continue
      }
      const cookie = createSessionCookie({ userId, workspaceId });
      if (cookie) {
        sendWelcome();
        const res = NextResponse.json({ ok: true, userId, workspaceId, redirectTo: "/activate" });
        res.headers.set("Set-Cookie", cookie);
        return res;
      }
      sendWelcome();
      return NextResponse.json({ ok: true, userId, workspaceId, redirectTo: "/activate", session: "missing" });
    } catch (err) {
      log("error", "[signup] admin.createUser path failed", { err: String(err) });
      // fall through to signUp path
    }
  }

  const supabase = createSupabaseJsClient(url, anonKey);
  let data: { user?: { id: string } | null } | undefined;
  let error: { message?: string } | null = null;
  try {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: { data: { business_name: businessName }, emailRedirectTo },
    });
    data = result.data as { user?: { id: string } | null };
    error = result.error;
  } catch {
    return NextResponse.json(
      { error: "Auth service unavailable. Please try again.", code: "auth_unavailable" },
      { status: 503 }
    );
  }

  // Supabase may return an error when confirmation email fails (e.g. SMTP not configured).
  const isConfirmationEmailError =
    error &&
    (error.message?.toLowerCase().includes("confirmation") ||
      error.message?.toLowerCase().includes("email") ||
      error.message?.toLowerCase().includes("send"));
  if (error && !isConfirmationEmailError) {
    return NextResponse.json({ error: toFriendlySignupError(error.message ?? "") }, { status: 400 });
  }

  let userId: string | undefined = data?.user?.id;

  // If signUp failed with confirmation-email error but user was still created, try to sign in and set session.
  if (isConfirmationEmailError && !userId) {
    const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
    userId = signInData?.user?.id;
    if (userId && signInData?.session) {
      let workspaceId: string | undefined;
      try {
        const db = getDb();
        await db.from("users").upsert({ id: userId, email }, { onConflict: "id" });
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14);
        const { data: created, error: createErr } = await db
          .from("workspaces")
          .insert({ name: businessName, owner_id: userId, autonomy_level: "assisted", kill_switch: false, billing_status: "trial", trial_ends_at: trialEnd.toISOString() })
          .select("id")
          .maybeSingle();
        if (!createErr && created) {
          workspaceId = (created as { id: string }).id;
          await db.from("settings").insert({ workspace_id: workspaceId, risk_level: "balanced" });
          await db.from("workspace_members").insert({ workspace_id: workspaceId, user_id: userId, role: "owner" });
          await db.from("workspace_billing").insert({ workspace_id: workspaceId, plan: "trial", status: "trialing", trial_ends_at: trialEnd.toISOString() });
        }
      } catch {
        // continue
      }
      const cookie = createSessionCookie({ userId, workspaceId });
      if (cookie) {
        sendWelcome();
        const res = NextResponse.json({ ok: true, userId, workspaceId, redirectTo: "/activate" });
        res.headers.set("Set-Cookie", cookie);
        return res;
      }
    }
    sendWelcome();
    return NextResponse.json({ ok: true, confirmEmail: true, redirectTo: "/sign-in" });
  }

  if (!userId) {
    if (isConfirmationEmailError) {
      sendWelcome();
      return NextResponse.json({ ok: true, confirmEmail: true, redirectTo: "/sign-in" });
    }
    return NextResponse.json({ error: "Sign up failed" }, { status: 400 });
  }

  let workspaceId: string | undefined;
  try {
    const db = getDb();
    await db.from("users").upsert({ id: userId, email }, { onConflict: "id" });
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    const { data: created, error: createErr } = await db
      .from("workspaces")
      .insert({ name: businessName, owner_id: userId, autonomy_level: "assisted", kill_switch: false, billing_status: "trial", trial_ends_at: trialEnd.toISOString() })
      .select("id")
      .maybeSingle();
    if (!createErr && created) {
      workspaceId = (created as { id: string }).id;
      await db.from("settings").insert({ workspace_id: workspaceId, risk_level: "balanced" });
      await db.from("workspace_members").insert({ workspace_id: workspaceId, user_id: userId, role: "owner" });
      await db.from("workspace_billing").insert({ workspace_id: workspaceId, plan: "trial", status: "trialing", trial_ends_at: trialEnd.toISOString() });
    }
  } catch {
    // continue without workspace
  }

  if (isConfirmationEmailError) {
    const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
    if (signInData?.session) {
      const cookie = createSessionCookie({ userId, workspaceId });
      if (cookie) {
        sendWelcome();
        const res = NextResponse.json({ ok: true, userId, workspaceId, redirectTo: "/activate" });
        res.headers.set("Set-Cookie", cookie);
        return res;
      }
    }
    sendWelcome();
    return NextResponse.json({ ok: true, confirmEmail: true, redirectTo: "/sign-in" });
  }

  const cookie = createSessionCookie({ userId, workspaceId });
  if (!cookie) {
    // SESSION_SECRET/ENCRYPTION_KEY not configured. Degrade gracefully:
    log("warn", "[auth] Signup succeeded but SESSION_SECRET/ENCRYPTION_KEY is not set. App sessions running without revenue_session cookie.");
    sendWelcome();
    return NextResponse.json({ ok: true, userId, workspaceId, session: "missing", redirectTo: "/activate" });
  }
  sendWelcome();
  const res = NextResponse.json({ ok: true, userId, workspaceId, redirectTo: "/activate" });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
