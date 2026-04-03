/**
 * POST /api/onboard/identity
 * Create workspace immediately from business_name, operator_name, email.
 * No password required (magic link later).
 * Rate limited to prevent abuse.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { randomUUID } from "crypto";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";

/** Basic email format validation */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export async function POST(request: NextRequest) {
  const csrfBlock = assertSameOrigin(request);
  if (csrfBlock) return csrfBlock;

  // Rate limit: 5 signups per IP per 10 minutes
  const ip = getClientIp(request);
  const rl = await checkRateLimit(`onboard:${ip}`, 5, 600_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  let body: { business_name?: string; operator_name?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { business_name, operator_name, email } = body;
  if (!business_name || !operator_name || !email) {
    return NextResponse.json(
      { error: "business_name, operator_name, and email required" },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  // Also rate limit per email: 3 attempts per 10 minutes
  const emailRl = await checkRateLimit(`onboard-email:${normalizedEmail}`, 3, 600_000);
  if (!emailRl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts for this email. Please try again later." },
      { status: 429 }
    );
  }

  const db = getDb();
  const userId = randomUUID();
  const workspaceId = randomUUID();

  try {
    await db.from("users").insert({
      id: userId,
      email: normalizedEmail,
      full_name: operator_name.trim(),
    });
  } catch {
    const { data: existing } = await db.from("users").select("id").eq("email", normalizedEmail).limit(1).maybeSingle();
    if (existing) {
      const uid = (existing as { id: string }).id;
      const { data: ws } = await db
        .from("workspaces")
        .select("id")
        .eq("owner_id", uid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ws) {
        return NextResponse.json({ workspace_id: (ws as { id: string }).id });
      }
      const wsId = randomUUID();
      await db.from("workspaces").insert({
        id: wsId,
        name: business_name.trim(),
        owner_id: uid,
        autonomy_level: "assisted",
        kill_switch: false,
      });
      await db.from("settings").insert({
        workspace_id: wsId,
        risk_level: "balanced",
      });
      await db.from("workspace_members").insert({ workspace_id: wsId, user_id: uid, role: "owner" });
      await db.from("workspace_billing").insert({ workspace_id: wsId, plan: "pending", status: "pending" });
      return NextResponse.json({ workspace_id: wsId });
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }

  await db.from("workspaces").insert({
    id: workspaceId,
    name: business_name.trim(),
    owner_id: userId,
    autonomy_level: "assisted",
    kill_switch: false,
  });

  await db.from("settings").insert({
    workspace_id: workspaceId,
    risk_level: "balanced",
  });
  await db.from("workspace_members").insert({ workspace_id: workspaceId, user_id: userId, role: "owner" });
  await db.from("workspace_billing").insert({ workspace_id: workspaceId, plan: "pending", status: "pending" });

  return NextResponse.json({ workspace_id: workspaceId });
}
