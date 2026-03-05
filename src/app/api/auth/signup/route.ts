/**
 * POST /api/auth/signup — Sign up with email + password.
 * Creates Supabase user, then workspace + session cookie.
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

  let body: { email?: string; password?: string; businessName?: string };
  try {
    body = (await req.json()) as { email?: string; password?: string; businessName?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const businessName = typeof body?.businessName === "string" ? body.businessName.trim() || "My Workspace" : "My Workspace";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase.auth.signUp({ email, password });

  // Supabase may return an error when confirmation email fails (e.g. SMTP not configured).
  // Treat as success so we don't show "Error sending confirmation email"; user may need to confirm later.
  const isConfirmationEmailError =
    error &&
    (error.message?.toLowerCase().includes("confirmation") ||
      error.message?.toLowerCase().includes("email") ||
      error.message?.toLowerCase().includes("send"));
  if (error && !isConfirmationEmailError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const userId = data?.user?.id;
  if (!userId) {
    if (isConfirmationEmailError) {
      return NextResponse.json({ ok: true, confirmEmail: true });
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

  // If confirmation is required and email failed, don't set session; tell client to show "check your email".
  if (isConfirmationEmailError) {
    return NextResponse.json({ ok: true, confirmEmail: true });
  }

  const cookie = createSessionCookie({ userId, workspaceId });
  if (!cookie) {
    return NextResponse.json({ error: "Session not configured (set SESSION_SECRET)" }, { status: 503 });
  }
  const res = NextResponse.json({ ok: true, userId, workspaceId });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
