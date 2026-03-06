/**
 * POST /api/auth/signin — Sign in with email + password.
 * Uses Supabase Auth (SSR client so auth session is stored in Supabase cookies); on success also sets revenue_session cookie (userId + workspaceId) for /app and /dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSessionCookie } from "@/lib/auth/session";
import { getDb } from "@/lib/db/queries";
import { validateEmail, validatePasswordForSignin, toFriendlySigninError } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Auth not configured", code: "auth_config" }, { status: 503 });
  }

  let body: { email?: string; password?: string };
  try {
    body = (await req.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const emailResult = validateEmail(body?.email ?? "");
  if (!emailResult.ok) return NextResponse.json({ error: emailResult.error }, { status: 400 });
  const email = emailResult.value;

  const passwordResult = validatePasswordForSignin(body?.password ?? "");
  if (!passwordResult.ok) return NextResponse.json({ error: passwordResult.error }, { status: 400 });
  const password = passwordResult.value;

  const supabase = await createClient();
  let data: { user?: { id: string } | null } | undefined;
  let error: { message?: string } | null = null;
  try {
    const res = await supabase.auth.signInWithPassword({ email, password });
    data = res.data as { user?: { id: string } | null };
    error = res.error;
  } catch {
    return NextResponse.json(
      { error: "Auth service unavailable. Please try again.", code: "auth_unavailable" },
      { status: 503 }
    );
  }
  if (error) {
    return NextResponse.json({ error: toFriendlySigninError(error.message ?? "") }, { status: 401 });
  }

  const userId = data?.user?.id ?? undefined;
  if (!userId) {
    return NextResponse.json({ error: "No user" }, { status: 401 });
  }

  let workspaceId: string | undefined;
  try {
    const db = getDb();
    const { data: ws } = await db.from("workspaces").select("id").eq("owner_id", userId).limit(1).maybeSingle();
    if (ws) {
      workspaceId = (ws as { id: string }).id;
    } else {
      const { data: created, error: createErr } = await db
        .from("workspaces")
        .insert({ name: "My Workspace", owner_id: userId, autonomy_level: "assisted", kill_switch: false })
        .select("id")
        .single();
      if (!createErr && created) {
        workspaceId = (created as { id: string }).id;
        await db.from("settings").insert({ workspace_id: workspaceId, risk_level: "balanced" });
      }
    }
  } catch {
    // DB unavailable; still return success with userId only
  }

  const cookie = createSessionCookie({ userId, workspaceId });
  if (!cookie) {
    // SESSION_SECRET/ENCRYPTION_KEY not configured. Degrade gracefully:
    // - Do NOT block sign-in (return ok so the app remains usable in demo/preview envs)
    // - Session guard in proxy.ts is already disabled when secret is missing (isSessionEnabled() === false)
    // This means /app routes behave like public demo until SESSION_SECRET is set correctly.
    console.warn(
      "[auth] Sign-in succeeded but SESSION_SECRET/ENCRYPTION_KEY is not set. " +
        "App sessions are running without revenue_session cookie."
    );
    return NextResponse.json({ ok: true, userId, workspaceId, session: "missing", redirectTo: "/app/activity" });
  }
  const res = NextResponse.json({ ok: true, userId, workspaceId, redirectTo: "/app/activity" });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
