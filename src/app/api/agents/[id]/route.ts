export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  voice_id: z.string().max(100).optional(),
  personality: z.enum(["friendly", "professional", "casual", "empathetic"]).optional(),
  purpose: z.enum(["inbound", "outbound", "both"]).optional(),
  greeting: z.string().max(2000).optional(),
  knowledge_base: z.unknown().optional(),
  rules: z.unknown().optional(),
  is_active: z.boolean().optional(),
  tested_at: z.string().datetime().optional(),
  test_call_completed: z.boolean().optional(),
  conversation_flow: z.unknown().optional(),
  template: z.string().max(100).optional(),
}).strict();

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
    log("error", "[DB Error] agents GET", { error: error.message });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(agent);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const { id } = await ctx.params;
  const db = getDb();
  const { data: existing } = await db.from("agents").select("workspace_id, updated_at").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const err = await requireWorkspaceAccess(req, (existing as { workspace_id: string }).workspace_id);
  if (err) return err;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = updateAgentSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v === undefined) continue;
    if (k === "voice_id" && typeof v === "string") {
      // Validate voice_id against known voices
      try {
        const { RECALL_VOICES } = await import("@/lib/constants/recall-voices");
        const validVoiceIds = RECALL_VOICES.map((voice: { id: string }) => voice.id);
        if (!validVoiceIds.includes(v)) continue;
      } catch { /* allow if list can't be loaded */ }
    }
    if (k === "name" && typeof v === "string") {
      updates[k] = v.trim() || "Primary Agent";
    } else if (k === "greeting" && typeof v === "string") {
      updates[k] = v.trim();
    } else {
      updates[k] = v;
    }
  }
  // Optimistic locking: if client sends _updatedAt, reject stale writes
  const clientUpdatedAt = (parsed.data as Record<string, unknown>)._updatedAt as string | undefined;
  const existingUpdatedAt = (existing as { updated_at?: string }).updated_at;
  if (clientUpdatedAt && existingUpdatedAt && clientUpdatedAt !== existingUpdatedAt) {
    return NextResponse.json(
      { error: "This agent was modified by another user. Please refresh and try again.", code: "conflict" },
      { status: 409 }
    );
  }

  const { data: agent, error } = await db.from("agents").update(updates).eq("id", id).select().maybeSingle();
  if (error) {
    log("error", "[DB Error] agents PATCH", { error: error.message });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(agent);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const { id } = await ctx.params;
  const db = getDb();
  const { data: existing } = await db.from("agents").select("workspace_id").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const wsId = (existing as { workspace_id: string }).workspace_id;
  const err = await requireWorkspaceAccess(req, wsId);
  if (err) return err;

  // Rate limit: 10 agent deletes per minute per workspace
  const rl = await checkRateLimit(`agents_delete:${wsId}`, 10, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many delete requests. Please slow down." }, { status: 429 });
  }

  // Cascade: clean up agent-related records
  await Promise.allSettled([
    db.from("conversation_flows").delete().eq("agent_id", id),
    db.from("agent_objections").delete().eq("agent_id", id),
  ]);

  const { error } = await db.from("agents").delete().eq("id", id);
  if (error) {
    log("error", "[DB Error] agents DELETE", { error: error.message });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
