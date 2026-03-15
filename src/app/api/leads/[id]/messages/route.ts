export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = getDb();
  const { data: lead } = await db.from("leads").select("workspace_id").eq("id", id).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const accessErr = await requireWorkspaceAccess(req, (lead as { workspace_id: string }).workspace_id);
  if (accessErr) return accessErr;
  const { data: conv } = await db.from("conversations").select("id").eq("lead_id", id).limit(1).single();
  if (!conv) return NextResponse.json({ messages: [] });
  const { data: msgs } = await db
    .from("messages")
    .select("role, content, created_at, metadata")
    .eq("conversation_id", (conv as { id: string }).id)
    .order("created_at", { ascending: true });
  return NextResponse.json({ messages: msgs ?? [] });
}
