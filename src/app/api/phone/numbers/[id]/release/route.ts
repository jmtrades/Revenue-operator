/**
 * POST /api/phone/numbers/[id]/release — Release (deactivate) a number from the workspace.
 * Fails if the number is assigned to an active agent (unassign in Agents first).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { getTelephonyService } from "@/lib/telephony";

export const dynamic = "force-dynamic";

export async function POST(
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
  const db = getDb();

  const { data: row } = await db
    .from("phone_numbers")
    .select("id, workspace_id, phone_number, assigned_agent_id, status, provider_sid")
    .eq("id", numberId)
    .eq("workspace_id", session.workspaceId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Number not found" }, { status: 404 });
  }

  const number = row as { assigned_agent_id: string | null; provider_sid: string | null };
  const assignedAgentId = number.assigned_agent_id;
  if (assignedAgentId) {
    const { data: agent } = await db
      .from("agents")
      .select("id, is_active")
      .eq("id", assignedAgentId)
      .eq("workspace_id", session.workspaceId)
      .maybeSingle();
    const isActive = (agent as { is_active?: boolean } | null)?.is_active ?? false;
    if (isActive) {
      return NextResponse.json(
        { error: "Unassign this number from the agent in Agents settings before releasing." },
        { status: 400 }
      );
    }
  }

  const { error } = await db
    .from("phone_numbers")
    .update({
      status: "released",
      assigned_agent_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", numberId)
    .eq("workspace_id", session.workspaceId);

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  // If this was the primary number in phone_configs, clear or switch to another active number
  const releasedPhone = (row as { phone_number?: string }).phone_number;
  if (releasedPhone) {
    const { data: configRow } = await db
      .from("phone_configs")
      .select("proxy_number")
      .eq("workspace_id", session.workspaceId)
      .maybeSingle();
    const currentProxy = (configRow as { proxy_number?: string } | null)?.proxy_number;
    const normalizedReleased = releasedPhone.replace(/\s/g, "");
    const normalizedProxy = (currentProxy ?? "").replace(/\s/g, "");
    if (normalizedProxy && normalizedReleased && normalizedProxy === normalizedReleased) {
      const { data: otherNumber } = await db
        .from("phone_numbers")
        .select("phone_number")
        .eq("workspace_id", session.workspaceId)
        .eq("status", "active")
        .neq("id", numberId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextNumber = (otherNumber as { phone_number?: string } | null)?.phone_number ?? null;
      await db
        .from("phone_configs")
        .update({
          proxy_number: nextNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("workspace_id", session.workspaceId);
    }
  }

  const providerSid = number.provider_sid;
  if (providerSid) {
    const telephony = getTelephonyService();
    try {
      await telephony.releaseNumber(providerSid);
    } catch (e) {
      console.error("Failed to release number:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
