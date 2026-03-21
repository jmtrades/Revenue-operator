export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
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
  const { error: wsErr } = await db.from("workspaces").insert({
    id: workspaceId,
    name: business_name.trim(),
    owner_id: userId,
    autonomy_level: "assisted",
    kill_switch: false,
  });
  if (wsErr) {
    console.error("[onboarding/identity] workspace insert failed:", wsErr.message);
    return NextResponse.json({ error: "Failed to create workspace. Please try again." }, { status: 500 });
  }
  const { error: settingsErr } = await db.from("settings").insert({ workspace_id: workspaceId, risk_level: "balanced" });
  if (settingsErr) {
    console.error("[onboarding/identity] settings insert failed:", settingsErr.message);
    // Non-blocking — workspace was created, settings can be retried
  }
  try {
    await db.from("users").insert({ id: userId, email: `onboarding+${workspaceId.slice(0, 8)}@recall-touch.com`, full_name: your_name.trim() });
  } catch {
    // ignore — user row is optional for onboarding
  }
  return NextResponse.json({ workspace_id: workspaceId, user_id: userId, industry: industry || "other" });
}
