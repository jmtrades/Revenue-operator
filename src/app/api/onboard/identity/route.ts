/**
 * POST /api/onboard/identity
 * Create workspace immediately from business_name, operator_name, email.
 * No password required (magic link later).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
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

  const db = getDb();
  const userId = randomUUID();
  const workspaceId = randomUUID();

  try {
    await db.from("users").insert({
      id: userId,
      email: email.trim().toLowerCase(),
      full_name: operator_name.trim(),
    });
  } catch {
    const { data: existing } = await db.from("users").select("id").eq("email", email.trim().toLowerCase()).limit(1).maybeSingle();
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

  return NextResponse.json({ workspace_id: workspaceId });
}
