/**
 * POST /api/auth/signup — Sign up with email + password.
 * Creates Supabase user (Auth + DB), then sets Supabase auth cookies and revenue_session cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { createSessionCookie } from "@/lib/auth/session";
import { getDb } from "@/lib/db/queries";
import {
  validateEmail,
  validatePasswordForSignup,
  normalizeBusinessName,
  toFriendlySignupError,
} from "@/lib/auth/validate";
import { sendWelcomeEmail } from "@/lib/email/welcome";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Auth not configured", code: "auth_config" }, { status: 503 });
  }

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

  const businessName = normalizeBusinessName(body?.businessName);
  const sendWelcome = () => {
    void sendWelcomeEmail(email, businessName).catch(() => {});
  };
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  // Prefer admin.createUser when service role is set — bypasses "Error sending confirmation email"
  if (serviceRoleKey) {
    try {
      const admin = createSupabaseJsClient(url, serviceRoleKey);
      const { data: adminData, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
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
        const { data: created, error: insertErr } = await db
          .from("workspaces")
          .insert({ name: businessName, owner_id: userId, autonomy_level: "assisted", kill_switch: false })
          .select("id")
          .single();
        if (!insertErr && created) {
          workspaceId = (created as { id: string }).id;
          await db.from("settings").insert({ workspace_id: workspaceId, risk_level: "balanced" });
        }
      } catch {
        // continue
      }
      const cookie = createSessionCookie({ userId, workspaceId });
      if (cookie) {
        sendWelcome();
        const res = NextResponse.json({ ok: true, userId, workspaceId, redirectTo: "/app/onboarding" });
        res.headers.set("Set-Cookie", cookie);
        return res;
      }
      sendWelcome();
      return NextResponse.json({ ok: true, userId, workspaceId, redirectTo: "/app/onboarding", session: "missing" });
    } catch (err) {
      console.error("[signup] admin.createUser path failed:", err);
      // fall through to signUp path
    }
  }

  const supabase = createSupabaseJsClient(url, anonKey);
  let data: { user?: { id: string } | null } | undefined;
  let error: { message?: string } | null = null;
  try {
    const result = await supabase.auth.signUp({ email, password, options: { data: { business_name: businessName } } });
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
        const { data: created, error: createErr } = await db
          .from("workspaces")
          .insert({ name: businessName, owner_id: userId, autonomy_level: "assisted", kill_switch: false })
          .select("id")
          .single();
        if (!createErr && created) {
          workspaceId = (created as { id: string }).id;
          await db.from("settings").insert({ workspace_id: workspaceId, risk_level: "balanced" });
        }
      } catch {
        // continue
      }
      const cookie = createSessionCookie({ userId, workspaceId });
      if (cookie) {
        sendWelcome();
        const res = NextResponse.json({ ok: true, userId, workspaceId, redirectTo: "/app/onboarding" });
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
    const { data: created, error: createErr } = await db
      .from("workspaces")
      .insert({ name: businessName, owner_id: userId, autonomy_level: "assisted", kill_switch: false })
      .select("id")
      .single();
    if (!createErr && created) {
      workspaceId = (created as { id: string }).id;
      await db.from("settings").insert({ workspace_id: workspaceId, risk_level: "balanced" });
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
        const res = NextResponse.json({ ok: true, userId, workspaceId, redirectTo: "/app/onboarding" });
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
    console.warn(
      "[auth] Signup succeeded but SESSION_SECRET/ENCRYPTION_KEY is not set. " +
        "App sessions are running without revenue_session cookie."
    );
    sendWelcome();
    return NextResponse.json({ ok: true, userId, workspaceId, session: "missing", redirectTo: "/app/onboarding" });
  }
  sendWelcome();
  const res = NextResponse.json({ ok: true, userId, workspaceId, redirectTo: "/app/onboarding" });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
