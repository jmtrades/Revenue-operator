export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { randomUUID } from "crypto";
import { assertSameOrigin } from "@/lib/http/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  // Rate limit: 5 workspace creations per minute per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await checkRateLimit(`onboarding_identity:${ip}`, 5, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  let body: { your_name?: string; business_name?: string; industry?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { your_name, business_name, industry } = body;
  if (!business_name?.trim() || !your_name?.trim()) {
    return NextResponse.json({ error: "your_name and business_name required" }, { status: 400 });
  }
  const db = getDb();
  const userId = randomUUID();
  const workspaceId = randomUUID();
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);
  const { error: wsErr } = await db.from("workspaces").insert({
    id: workspaceId,
    name: business_name.trim(),
    owner_id: userId,
    autonomy_level: "assisted",
    kill_switch: false,
    status: "active",
    billing_status: "trial",
    billing_tier: "solo",
    trial_ends_at: trialEnd.toISOString(),
    industry: industry?.trim() || null,
    business_name: business_name.trim(),
  });
  if (wsErr) {
    log("error", "onboarding.identity_workspace_insert_failed", { error: wsErr.message });
    return NextResponse.json({ error: "Failed to create workspace. Please try again." }, { status: 500 });
  }
  // Create workspace member record for the owner
  try {
    await db.from("workspace_members").insert({ workspace_id: workspaceId, user_id: userId, role: "owner" });
  } catch {
    // Non-blocking — membership can be retried
  }
  try {
    await db.from("workspace_billing").insert({ workspace_id: workspaceId, plan: "pending", status: "pending" });
  } catch {
    // Non-blocking — billing can be retried
  }
  const { error: settingsErr } = await db.from("settings").insert({ workspace_id: workspaceId, risk_level: "balanced" });
  if (settingsErr) {
    log("warn", "onboarding.identity_settings_insert_failed", { error: settingsErr.message });
    // Non-blocking — workspace was created, settings can be retried
  }
  try {
    await db.from("users").insert({ id: userId, email: `onboarding+${workspaceId.slice(0, 8)}@recall-touch.com`, full_name: your_name.trim() });
  } catch {
    // ignore — user row is optional for onboarding
  }
  return NextResponse.json({ workspace_id: workspaceId, user_id: userId, industry: industry || "other" });
}
