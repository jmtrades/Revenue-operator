/**
 * POST /api/auth/signin — Sign in with email + password.
 * Uses Supabase Auth; on success sets revenue_session cookie (userId + workspaceId) for /app and /dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSessionCookie } from "@/lib/auth/session";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  let body: { email?: string; password?: string };
  try {
    body = (await req.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const userId = data.user?.id;
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
    return NextResponse.json({ error: "Session not configured (set SESSION_SECRET)" }, { status: 503 });
  }
  const res = NextResponse.json({ ok: true, userId, workspaceId });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
