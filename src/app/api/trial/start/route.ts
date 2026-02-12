/**
 * Trial start: create user + workspace from email.
 * Sets session cookie so user never has to enter email again.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { createSessionCookie } from "@/lib/auth/session";
import { randomUUID } from "crypto";

function jsonWithSession(body: { workspace_id: string }, userId: string, workspaceId: string) {
  const res = NextResponse.json(body);
  const cookie = createSessionCookie({ userId, workspaceId });
  if (cookie) res.headers.set("Set-Cookie", cookie);
  return res;
}

export async function POST(req: NextRequest) {
  let body: { email: string; hired_roles?: string[]; business_type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim();
  const hiredRoles = Array.isArray(body.hired_roles) && body.hired_roles.length
    ? body.hired_roles
    : ["full_autopilot"];
  const businessType = typeof body.business_type === "string" && body.business_type.trim()
    ? body.business_type.trim()
    : null;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const db = getDb();
  const userId = randomUUID();

  const { error: userErr } = await db.from("users").insert({
    id: userId,
    email,
    full_name: null,
  });

  if (userErr) {
    const { data: existing } = await db.from("users").select("id").eq("email", email).limit(1).single();
    const uid = (existing as { id: string } | null)?.id;
    if (uid) {
      const { data: ws } = await db.from("workspaces").select("id").eq("owner_id", uid).order("created_at", { ascending: false }).limit(1).single();
      if (ws) {
        const wid = (ws as { id: string }).id;
        return jsonWithSession({ workspace_id: wid }, uid, wid);
      }
      const wsId = randomUUID();
      const hiredRoles = Array.isArray(body.hired_roles) && body.hired_roles.length ? body.hired_roles : ["full_autopilot"];
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      await db.from("workspaces").insert({
        id: wsId,
        name: "My workspace",
        owner_id: uid,
        autonomy_level: "assisted",
        kill_switch: false,
        billing_status: "trial",
        protection_renewal_at: trialEnd.toISOString(),
      });
      await db.from("settings").insert({
        workspace_id: wsId,
        risk_level: "balanced",
        hired_roles: hiredRoles,
        business_type: businessType,
      });
      return jsonWithSession({ workspace_id: wsId }, uid, wsId);
    }
    return NextResponse.json({ error: "Failed to create trial" }, { status: 500 });
  }

  const workspaceId = randomUUID();
  const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const { error: wsErr } = await db.from("workspaces").insert({
    id: workspaceId,
    name: "My workspace",
    owner_id: userId,
    autonomy_level: "assisted",
    kill_switch: false,
    billing_status: "trial",
    protection_renewal_at: trialEnd.toISOString(),
  });

  if (wsErr) {
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }

  await db.from("settings").insert({
    workspace_id: workspaceId,
    risk_level: "balanced",
    hired_roles: hiredRoles,
    business_type: businessType,
  });

  await db.from("activation_states").upsert(
    { workspace_id: workspaceId, step: "scan", updated_at: new Date().toISOString() },
    { onConflict: "workspace_id" }
  );

  const { runSyntheticProtectionBootstrap } = await import("@/lib/bootstrap/synthetic-protection");
  await runSyntheticProtectionBootstrap(workspaceId);

  return jsonWithSession({ workspace_id: workspaceId }, userId, workspaceId);
}
