/**
 * POST /api/auth/signin — Sign in with email + password.
 * Uses Supabase Auth (SSR client so auth session is stored in Supabase cookies); on success also sets revenue_session cookie (userId + workspaceId) for /app and /dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSessionCookie } from "@/lib/auth/session";
import { getDb } from "@/lib/db/queries";
import { validateEmail, validatePasswordForSignin, toFriendlySigninError } from "@/lib/auth/validate";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { log } from "@/lib/logger";
import { ROUTES } from "@/lib/constants";
import { assertSameOrigin } from "@/lib/http/csrf";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`signin:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

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

  const sessionSecret = (process.env.SESSION_SECRET ?? "").trim();
  if (!sessionSecret) {
    log("error", "[signin] SESSION_SECRET is not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

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
  let workspaceCreated = true;
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
        .maybeSingle();
      if (!createErr && created) {
        workspaceId = (created as { id: string }).id;
        await Promise.all([
          db.from("settings").insert({ workspace_id: workspaceId, risk_level: "balanced" }),
          db.from("workspace_members").insert({ workspace_id: workspaceId, user_id: userId, role: "owner" }),
        ]);
      } else {
        workspaceCreated = false;
        log("error", "[signin] workspace creation failed", { userId, error: createErr?.message ?? "unknown error" });
      }
    }
  } catch (err) {
    workspaceCreated = false;
    log("error", "[signin] workspace creation exception", { userId, error: err instanceof Error ? err.message : String(err) });
  }

  const cookie = createSessionCookie({ userId, workspaceId });
  if (!cookie) {
    // SESSION_SECRET/ENCRYPTION_KEY not configured. This is a critical security issue.
    // Authentication must fail closed, not open.
    log("error", "[signin] SESSION_SECRET or ENCRYPTION_KEY is not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  const res = NextResponse.json({ ok: true, userId, workspaceId, workspace_created: workspaceCreated, redirectTo: ROUTES.APP_HOME });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
