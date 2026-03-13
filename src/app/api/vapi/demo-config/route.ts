/**
 * GET /api/vapi/demo-config — Public config for homepage/demo voice (public key + assistant id).
 * Uses VAPI_DEMO_ASSISTANT_ID when set; otherwise for signed-in users uses the workspace's assistant so the homepage widget can test their agent.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { hasVapiServerKey } from "@/lib/vapi/env";
import { syncVapiAgent } from "@/lib/agents/sync-vapi-agent";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY?.trim() ?? null;
  let assistantId = process.env.VAPI_DEMO_ASSISTANT_ID?.trim() ?? null;

  if (!assistantId && publicKey) {
    const session = await getSession(req).catch(() => null);
    if (session?.workspaceId) {
      const authErr = await requireWorkspaceAccess(req, session.workspaceId);
      if (authErr) return authErr;
      try {
        const db = getDb();
        const { data } = await db
          .from("workspaces")
          .select("vapi_assistant_id")
          .eq("id", session.workspaceId)
          .maybeSingle();
        const id =
          (data as { vapi_assistant_id?: string | null } | null)?.vapi_assistant_id?.trim() ??
          null;
        if (id) {
          assistantId = id;
        } else if (hasVapiServerKey()) {
          // Try to reuse or provision a workspace assistant from existing agents
          const { data: agents } = await db
            .from("agents")
            .select("id, vapi_agent_id, is_active")
            .eq("workspace_id", session.workspaceId)
            .order("created_at", { ascending: true });
          const list =
            (agents as Array<{
              id: string;
              vapi_agent_id?: string | null;
              is_active?: boolean | null;
            }>) ?? [];

          // Prefer an already-synced voice agent
          const existing = list.find(
            (a) => (a.vapi_agent_id ?? "").toString().trim().length > 0,
          );
          if (existing) {
            assistantId = existing.vapi_agent_id!.toString().trim();
            // Keep workspace in sync for future fast lookups
            await db
              .from("workspaces")
              .update({
                vapi_assistant_id: assistantId,
                updated_at: new Date().toISOString(),
              })
              .eq("id", session.workspaceId);
          } else if (list[0]) {
            // No assistant yet — provision one from the first agent
            try {
              const result = await syncVapiAgent(db, list[0].id);
              assistantId = result.assistantId;
            } catch {
              // Demo widget will gracefully fall back if this fails
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return NextResponse.json({
    publicKey: publicKey || null,
    assistantId: assistantId || null,
  });
}
