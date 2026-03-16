export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function POST(req: NextRequest) {
  let body: { workspace_id?: string; agent_name?: string; voice_id?: string; greeting?: string; capabilities?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { workspace_id, agent_name, voice_id, greeting, capabilities } = body;
  if (!workspace_id || !agent_name?.trim()) {
    return NextResponse.json({ error: "workspace_id and agent_name required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(req, workspace_id);
  if (authErr) return authErr;
  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("id, name").eq("id", workspace_id).maybeSingle();
  if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const w = ws as { name?: string };
  const greetingText = greeting?.trim() || `Thanks for calling ${w.name ?? "the business"}! This is ${agent_name.trim()}. How can I help?`;
  const caps = Array.isArray(capabilities) ? capabilities : [];
  const { data: agent, error } = await db
    .from("agents")
    .insert({
      workspace_id,
      name: agent_name.trim(),
      voice_id: voice_id || null,
      greeting: greetingText,
      purpose: "inbound",
      personality: "professional",
      knowledge_base: { capabilities: caps },
    })
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(agent);
}
