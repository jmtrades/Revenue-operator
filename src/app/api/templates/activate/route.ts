/**
 * POST /api/templates/activate — Apply an industry template to the workspace's agent.
 * Copies template greeting, knowledge base, call rules, and voice settings.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  let body: { templateId?: string; workspace_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { templateId, workspace_id: workspaceId } = body;
  if (!templateId || !workspaceId) {
    return NextResponse.json({ error: "templateId and workspace_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();

  /* ── Fetch the template ──────────────────────────────── */
  const { data: template } = await db
    .from("industry_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const tpl = template as {
    greeting?: string;
    knowledge_base?: string;
    system_prompt?: string;
    voice_id?: string;
    call_rules?: Record<string, unknown>;
    name?: string;
  };

  /* ── Find or create the workspace's primary agent ───── */
  let { data: agent } = await db
    .from("agents")
    .select("id")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!agent) {
    const { data: newAgent } = await db
      .from("agents")
      .insert({
        workspace_id: workspaceId,
        name: tpl.name ?? "AI Phone Agent",
        greeting: tpl.greeting ?? "Hello, how can I help you today?",
        knowledge_base: tpl.knowledge_base ?? "",
        system_prompt: tpl.system_prompt ?? "",
        voice_id: tpl.voice_id ?? null,
      })
      .select("id")
      .single();
    agent = newAgent;
  } else {
    /* ── Update existing agent with template settings ──── */
    const updates: Record<string, unknown> = {};
    if (tpl.greeting) updates.greeting = tpl.greeting;
    if (tpl.knowledge_base) updates.knowledge_base = tpl.knowledge_base;
    if (tpl.system_prompt) updates.system_prompt = tpl.system_prompt;
    if (tpl.voice_id) updates.voice_id = tpl.voice_id;

    if (Object.keys(updates).length > 0) {
      await db.from("agents").update(updates).eq("id", (agent as { id: string }).id);
    }
  }

  /* ── Apply call rules if template provides them ──────── */
  if (tpl.call_rules) {
    await db
      .from("workspaces")
      .update({ call_rules: tpl.call_rules })
      .eq("id", workspaceId);
  }

  /* ── Record activation ───────────────────────────────── */
  await db.from("template_activations").insert({
    workspace_id: workspaceId,
    template_id: templateId,
    activated_at: new Date().toISOString(),
  }).then(() => {});

  return NextResponse.json({
    ok: true,
    message: `Template "${tpl.name ?? templateId}" activated successfully.`,
    agent_id: agent ? (agent as { id: string }).id : null,
  });
}
