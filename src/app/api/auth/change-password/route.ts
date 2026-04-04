/**
 * POST /api/auth/change-password — Change password for authenticated user.
 * Requires current password verification before updating.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth/request-session";
import { assertSameOrigin } from "@/lib/http/csrf";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { validatePasswordForSignup } from "@/lib/auth/validate";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`change-pw:${session.userId}`, 5, 3600_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = (await req.json()) as { currentPassword?: string; newPassword?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword) {
    return NextResponse.json({ error: "Current password is required" }, { status: 400 });
  }

  const pwResult = validatePasswordForSignup(newPassword);
  if (!pwResult.ok) {
    return NextResponse.json({ error: pwResult.error }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  if (!/\d/.test(newPassword)) {
    return NextResponse.json({ error: "Password must contain at least one number" }, { status: 400 });
  }

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  // Step 1: Verify current password by attempting sign-in
  const supabase = createSupabaseJsClient(url, anonKey);

  // Get user email from DB
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!serviceKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  const admin = createSupabaseJsClient(url, serviceKey);
  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(session.userId);
  if (userErr || !userData?.user?.email) {
    log("error", "[change-password] Failed to fetch user", { userId: session.userId });
    return NextResponse.json({ error: "Failed to verify identity" }, { status: 500 });
  }

  const email = userData.user.email;

  // Verify current password
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (signInErr) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
  }

  // Step 2: Update password via admin API
  const { error: updateErr } = await admin.auth.admin.updateUserById(session.userId, {
    password: newPassword,
  });
  if (updateErr) {
    log("error", "[change-password] Update failed", { userId: session.userId, error: updateErr.message });
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }

  log("info", "[change-password] Password updated", { userId: session.userId });
  return NextResponse.json({ ok: true });
}
