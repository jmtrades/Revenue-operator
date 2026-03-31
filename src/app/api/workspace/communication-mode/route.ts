/**
 * GET /api/workspace/communication-mode — Get current communication_mode and agent_mode for workspace.
 * PATCH /api/workspace/communication-mode — Update communication_mode and/or agent_mode.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";

const ALLOWED_COMMUNICATION_MODES = ["calls_only", "texts_only", "calls_and_texts", "all"] as const;
const ALLOWED_AGENT_MODES = ["inbound_only", "outbound_only", "both", "passive"] as const;

type CommunicationMode = (typeof ALLOWED_COMMUNICATION_MODES)[number];
type AgentMode = (typeof ALLOWED_AGENT_MODES)[number];

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data, error } = await db
    .from("workspaces")
    .select("communication_mode, agent_mode")
    .eq("id", session.workspaceId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const row = data as { communication_mode?: string | null; agent_mode?: string | null };

  return NextResponse.json({
    communication_mode: row.communication_mode ?? "all",
    agent_mode: row.agent_mode ?? "both",
  });
}

export async function PATCH(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  let body: { communication_mode?: string; agent_mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: { communication_mode?: CommunicationMode; agent_mode?: AgentMode; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.communication_mode === "string") {
    const mode = body.communication_mode.trim().toLowerCase() as CommunicationMode;
    if (!ALLOWED_COMMUNICATION_MODES.includes(mode)) {
      return NextResponse.json({ error: `Invalid communication_mode. Allowed values: ${ALLOWED_COMMUNICATION_MODES.join(", ")}` }, { status: 400 });
    }
    updates.communication_mode = mode;
  }

  if (typeof body.agent_mode === "string") {
    const mode = body.agent_mode.trim().toLowerCase() as AgentMode;
    if (!ALLOWED_AGENT_MODES.includes(mode)) {
      return NextResponse.json({ error: `Invalid agent_mode. Allowed values: ${ALLOWED_AGENT_MODES.join(", ")}` }, { status: 400 });
    }
    updates.agent_mode = mode;
  }

  const db = getDb();
  const { error } = await db.from("workspaces").update(updates).eq("id", session.workspaceId);

  if (error) {
    return NextResponse.json({ error: "Could not update workspace settings. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, communication_mode: updates.communication_mode, agent_mode: updates.agent_mode });
}
