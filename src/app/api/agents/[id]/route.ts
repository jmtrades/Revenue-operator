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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
  const allowed = ["name", "voice_id", "personality", "purpose", "greeting", "knowledge_base", "rules", "is_active", "tested_at", "test_call_completed", "conversation_flow", "template"];
  const validPersonality = ["friendly", "professional", "casual", "empathetic"] as const;
  const validPurpose = ["inbound", "outbound", "both"] as const;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (body[k] === undefined) continue;
    if (k === "personality" && typeof body[k] === "string" && !validPersonality.includes(body[k] as (typeof validPersonality)[number])) continue;
    if (k === "purpose" && typeof body[k] === "string" && !validPurpose.includes(body[k] as (typeof validPurpose)[number])) continue;
    if (k === "voice_id" && typeof body[k] === "string") {
      // Validate voice_id against known voices
      try {
        const { RECALL_VOICES } = await import("@/lib/constants/recall-voices");
        const validVoiceIds = RECALL_VOICES.map((v: { id: string }) => v.id);
        if (!validVoiceIds.includes(body[k] as string)) continue; // Skip invalid voice_id silently
      } catch { /* allow if list can't be loaded */ }
      updates[k] = body[k];
    } else if (k === "name" && typeof body[k] === "string") {
      updates[k] = (body[k] as string).trim().slice(0, 100) || "Primary Agent";
    } else if (k === "greeting" && typeof body[k] === "string") {
      updates[k] = body[k].trim().slice(0, 2000);
    } else if (k === "tested_at") {
      if (typeof body[k] === "string" && body[k]) {
        updates[k] = (body[k] as string).trim();
      }
    } else if (k === "test_call_completed") {
      if (typeof body[k] === "boolean") {
        updates[k] = body[k];
      }
    } else {
      updates[k] = body[k];
    }
  }
  const { data: agent, error } = await db.from("agents").update(updates).eq("id", id).select().maybeSingle();
  if (error) {
    console.error("[DB Error] agents PATCH", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
