/**
 * PATCH /api/phone/numbers/[id]/assign — Set or clear assigned_agent_id for a workspace number.
 * Body: { assigned_agent_id: string | null }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { z } from "zod";

export const dynamic = "force-dynamic";

const BODY = z.object({
  assigned_agent_id: z.string().uuid().nullable(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const { id: numberId } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = BODY.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const db = getDb();
  const { data: row } = await db
    .from("phone_numbers")
    .select("id, workspace_id, assigned_agent_id")
    .eq("id", numberId)
    .eq("workspace_id", session.workspaceId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Number not found" }, { status: 404 });
  }

  const agentId = parsed.data.assigned_agent_id;
  if (agentId) {
    const { data: agent } = await db
      .from("agents")
      .select("id")
      .eq("id", agentId)
      .eq("workspace_id", session.workspaceId)
      .maybeSingle();
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
  }

  // Unassign from any other number currently assigned to this agent (if we're assigning)
  if (agentId) {
    await db
      .from("phone_numbers")
      .update({ assigned_agent_id: null, updated_at: new Date().toISOString() })
      .eq("workspace_id", session.workspaceId)
      .eq("assigned_agent_id", agentId);
  }

  const { error } = await db
    .from("phone_numbers")
    .update({
      assigned_agent_id: agentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", numberId)
    .eq("workspace_id", session.workspaceId);

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    assigned_agent_id: agentId,
  });
}
