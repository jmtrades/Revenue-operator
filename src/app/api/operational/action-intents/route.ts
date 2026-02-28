/**
 * GET /api/operational/action-intents?workspace_id=...
 * Returns unclaimed intents for the workspace, bounded to 50. No secrets. Requires workspace access.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

const MAX = 50;

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ intents: [] }, { status: 200 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data } = await db
    .from("action_intents")
    .select("id, intent_type, payload_json, created_at, thread_id, work_unit_id")
    .eq("workspace_id", workspaceId)
    .is("claimed_at", null)
    .order("created_at", { ascending: true })
    .limit(MAX);

  const intents = (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id,
    intent_type: r.intent_type,
    payload_json: r.payload_json ?? {},
    created_at: r.created_at,
    thread_id: r.thread_id ?? null,
    work_unit_id: r.work_unit_id ?? null,
  }));

  return NextResponse.json({ intents });
}
