export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { withWorkspace, withAuth, type WorkspaceContext, type AuthContext } from "@/lib/api/with-workspace";
import { apiOk, apiBadRequest, apiNotFound, apiConflict, apiInternalError, apiValidationError } from "@/lib/api/errors";

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

export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const workspaceId = ctx.session.workspaceId;
  if (!workspaceId) return apiNotFound("Agent");
  const { id } = ctx.params;
  const db = getDb();
  const { data: agent, error } = await db
    .from("agents")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) {
    log("error", "agents.get_by_id_failed", { error: error.message });
    return apiInternalError();
  }
  if (!agent) return apiNotFound("Agent");
  return apiOk(agent);
});

export const PATCH = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { id } = ctx.params;
  const db = getDb();
  const { data: existing } = await db.from("agents").select("workspace_id, updated_at").eq("id", id).maybeSingle();
  if (!existing) return apiNotFound("Agent");

  const wsId = (existing as { workspace_id: string }).workspace_id;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return apiBadRequest("Invalid JSON");
  }
  const parsed = updateAgentSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return apiValidationError(firstError?.message ?? "Invalid input");
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v === undefined) continue;
    if (k === "voice_id" && typeof v === "string") {
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

  // Optimistic locking: reject stale writes
  const clientUpdatedAt = (parsed.data as Record<string, unknown>)._updatedAt as string | undefined;
  const existingUpdatedAt = (existing as { updated_at?: string }).updated_at;
  if (clientUpdatedAt && existingUpdatedAt && clientUpdatedAt !== existingUpdatedAt) {
    return apiConflict("This agent was modified by another user. Please refresh and try again.");
  }

  const { data: agent, error } = await db.from("agents").update(updates).eq("id", id).eq("workspace_id", wsId).select().maybeSingle();
  if (error) {
    log("error", "agents.patch_failed", { error: error.message });
    return apiInternalError();
  }
  return apiOk(agent);
});

export const DELETE = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const { id } = ctx.params;
  const db = getDb();
  const { data: existing } = await db.from("agents").select("workspace_id").eq("id", id).maybeSingle();
  if (!existing) return apiNotFound("Agent");
  const wsId = (existing as { workspace_id: string }).workspace_id;

  // Cascade: clean up agent-related records
  await Promise.allSettled([
    db.from("conversation_flows").delete().eq("agent_id", id),
    db.from("agent_objections").delete().eq("agent_id", id),
  ]);

  const { error } = await db.from("agents").delete().eq("id", id).eq("workspace_id", wsId);
  if (error) {
    log("error", "agents.delete_failed", { error: error.message });
    return apiInternalError();
  }
  return apiOk({ deleted: true });
}, { rateLimit: { key: "agents_delete:{workspaceId}", max: 10, windowMs: 60_000 } });
