/**
 * List conversations for workspace
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const db = getDb();
  const { data: leads } = await db
    .from("leads")
    .select("id, name, email, company, state, last_activity_at, opt_out")
    .eq("workspace_id", workspaceId)
    .order("last_activity_at", { ascending: false })
    .limit(100);

  const conversations: Array<{
    lead_id: string;
    lead_name: string | null;
    lead_email: string | null;
    company: string | null;
    state: string;
    last_activity_at: string;
    opt_out: boolean;
  }> = [];

  for (const lead of leads ?? []) {
    const l = lead as { id: string; name: string | null; email: string | null; company: string | null; state: string; last_activity_at: string; opt_out?: boolean };
    const { data: conv } = await db.from("conversations").select("id").eq("lead_id", l.id).limit(1).single();
    if (conv) {
      conversations.push({
        lead_id: l.id,
        lead_name: l.name,
        lead_email: l.email,
        company: l.company,
        state: l.state,
        last_activity_at: l.last_activity_at,
        opt_out: l.opt_out ?? false,
      });
    }
  }

  return NextResponse.json({ conversations });
}
