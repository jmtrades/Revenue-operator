export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

const DEFAULT_FAQ = [
  { q: "What are your hours?", a: "We are open Monday through Friday, 9 AM to 5 PM." },
  { q: "Where are you located?", a: "I can have someone share our address with you. What is the best way to reach you?" },
  { q: "How do I book an appointment?", a: "I can help you with that right now. What day works best for you?" },
  { q: "What services do you offer?", a: "We offer a full range of services. What specifically are you looking for help with?" },
  { q: "What is your pricing?", a: "Pricing depends on your specific needs. I can have our team send you a detailed quote. Can I get your name and email?" },
];

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId || !session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { agent_id?: string };
  try {
    body = (await req.json()) as { agent_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const agentId = body.agent_id?.trim();
  if (!agentId) {
    return NextResponse.json({ error: "agent_id is required" }, { status: 400 });
  }

  const db = getDb();
  const { data: row, error: fetchErr } = await db
    .from("agents")
    .select("id, workspace_id, knowledge_base")
    .eq("id", agentId)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  if ((row as { workspace_id: string }).workspace_id !== session.workspaceId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const kb = (row as { knowledge_base?: { faq?: Array<{ q?: string; a?: string }> } }).knowledge_base ?? {};
  const existingFaq = Array.isArray(kb.faq) ? kb.faq : [];
  const merged = [...existingFaq];
  for (const entry of DEFAULT_FAQ) {
    if (!merged.some((e) => (e.q ?? "").trim() === (entry.q ?? "").trim())) {
      merged.push(entry);
    }
  }
  const newKb = { ...kb, faq: merged };

  const { data: updated, error: updateErr } = await db
    .from("agents")
    .update({
      knowledge_base: newKb,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentId)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json(updated);
}
