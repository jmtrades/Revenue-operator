export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspaceId = session.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { id } = await ctx.params;
  const db = getDb();
  const { data: agent, error } = await db
    .from("agents")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) {
    console.error("[DB Error] agents GET", error.message);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(agent);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDb();
  const { data: existing } = await db.from("agents").select("workspace_id").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const err = await requireWorkspaceAccess(req, (existing as { workspace_id: string }).workspace_id);
  if (err) return err;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const allowed = ["name", "voice_id", "personality", "purpose", "greeting", "knowledge_base", "rules", "is_active", "tested_at", "conversation_flow", "vapi_agent_id", "template"];
  const validPersonality = ["friendly", "professional", "casual", "empathetic"] as const;
  const validPurpose = ["inbound", "outbound", "both"] as const;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (body[k] === undefined) continue;
    if (k === "personality" && typeof body[k] === "string" && !validPersonality.includes(body[k] as (typeof validPersonality)[number])) continue;
    if (k === "purpose" && typeof body[k] === "string" && !validPurpose.includes(body[k] as (typeof validPurpose)[number])) continue;
    if (k === "name" && typeof body[k] === "string") {
      updates[k] = body[k].trim().slice(0, 500) || "Receptionist";
    } else if (k === "greeting" && typeof body[k] === "string") {
      updates[k] = body[k].trim().slice(0, 2000);
    } else if (k === "tested_at") {
      if (typeof body[k] === "string" && body[k]) {
        // Rely on Postgres to validate timestamp format; just trim.
        updates[k] = (body[k] as string).trim();
      }
    } else {
      updates[k] = body[k];
    }
  }
  const { data: agent, error } = await db.from("agents").update(updates).eq("id", id).select().maybeSingle();
  if (error) {
    console.error("[DB Error] agents PATCH", error.message);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
  return NextResponse.json(agent);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDb();
  const { data: existing } = await db.from("agents").select("workspace_id").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const err = await requireWorkspaceAccess(req, (existing as { workspace_id: string }).workspace_id);
  if (err) return err;
  const { error } = await db.from("agents").delete().eq("id", id);
  if (error) {
    console.error("[DB Error] agents DELETE", error.message);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
