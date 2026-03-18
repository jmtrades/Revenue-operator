/**
 * List conversations for workspace
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

async function getConversations(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const channel = req.nextUrl.searchParams.get("channel") ?? "sms";
  const { data: workspaceLeads } = await db.from("leads").select("id").eq("workspace_id", workspaceId);
  const leadIds = [...new Set((workspaceLeads ?? []).map((l: { id: string }) => l.id))];
  if (leadIds.length === 0) return NextResponse.json({ conversations: [] });

  const { data: convRows } = await db
    .from("conversations")
    .select("id, lead_id, updated_at")
    .eq("channel", channel)
    .in("lead_id", leadIds)
    .order("updated_at", { ascending: false })
    .limit(100);

  const { data: leads } = await db
    .from("leads")
    .select("id, name, email, company, state, last_activity_at, opt_out")
    .eq("workspace_id", workspaceId)
    .in("id", [...new Set((convRows ?? []).map((r: { lead_id: string }) => r.lead_id))]);

  const leadMap = ((leads ?? []) as Array<{ id: string; name: string | null; email: string | null; company: string | null; state: string; last_activity_at: string | null; opt_out?: boolean }>).reduce(
    (acc, l) => {
      acc[l.id] = l;
      return acc;
    },
    {} as Record<string, { id: string; name: string | null; email: string | null; company: string | null; state: string; last_activity_at: string | null; opt_out?: boolean }>
  );

  const conversations = (convRows ?? [])
    .map((r: { lead_id: string; updated_at: string }) => {
      const l = leadMap[r.lead_id];
      if (!l || l.id !== r.lead_id) return null;
      return {
        lead_id: l.id,
        lead_name: l.name,
        lead_email: l.email,
        company: l.company,
        state: l.state,
        last_activity_at: l.last_activity_at ?? new Date(0).toISOString(),
        opt_out: l.opt_out ?? false,
      };
    })
    .filter(Boolean) as Array<{
    lead_id: string;
    lead_name: string | null;
    lead_email: string | null;
    company: string | null;
    state: string;
    last_activity_at: string;
    opt_out: boolean;
  }>;

  return NextResponse.json({ conversations });
}

export async function GET(req: NextRequest) {
  try {
    return await getConversations(req);
  } catch (err) {
    console.error(`[API Error] GET ${req.url}:`, err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
