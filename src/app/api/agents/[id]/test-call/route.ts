/**
 * POST /api/agents/[id]/test-call — Request a test call (stub: returns ok; real impl would trigger Vapi/Twilio).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDb();
  const { data: agent } = await db.from("agents").select("id, workspace_id").eq("id", id).maybeSingle();
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const err = await requireWorkspaceAccess(req, (agent as { workspace_id: string }).workspace_id);
  if (err) return err;
  return NextResponse.json({ ok: true, message: "Test call requested. Connect Vapi/Twilio for live test." });
}
