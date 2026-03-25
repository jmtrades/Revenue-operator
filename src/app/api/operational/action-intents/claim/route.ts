/**
 * POST /api/operational/action-intents/claim
 * Body: { workspace_id, worker_id }. Returns one claimed intent or null. Requires workspace access.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { claimNextActionIntent } from "@/lib/action-intents";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(request: NextRequest) {
  const csrfErr = assertSameOrigin(request);
  if (csrfErr) return csrfErr;

  let body: { workspace_id?: string; worker_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const workspaceId = body.workspace_id;
  const workerId = body.worker_id;
  if (!workspaceId || !workerId) {
    return NextResponse.json({ error: "workspace_id and worker_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const claimed = await claimNextActionIntent(workspaceId, workerId);
  if (!claimed) {
    return NextResponse.json({ intent: null }, { status: 200 });
  }
  return NextResponse.json({
    intent: {
      id: claimed.id,
      workspace_id: claimed.workspace_id,
      thread_id: claimed.thread_id,
      work_unit_id: claimed.work_unit_id,
      intent_type: claimed.intent_type,
      payload_json: claimed.payload_json,
      dedupe_key: claimed.dedupe_key,
      created_at: claimed.created_at,
      claimed_at: claimed.claimed_at,
      claimed_by: claimed.claimed_by,
    },
  });
}
