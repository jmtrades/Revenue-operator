/**
 * POST /api/outbound/call — Start an outbound call to a lead via Vapi.
 * Creates call_session, gets or creates Vapi assistant, triggers outbound call.
 * End-of-call is handled by the same Vapi webhook (metadata includes call_session_id).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { compileSystemPrompt } from "@/lib/business-brain";
import { createAssistant, createOutboundCall } from "@/lib/vapi";

export async function POST(req: NextRequest) {
  const session = getSession(req);
  const workspaceId = session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  let body: { lead_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { lead_id } = body;
  if (!lead_id) return NextResponse.json({ error: "lead_id required" }, { status: 400 });

  const db = getDb();
  const { data: lead } = await db
    .from("leads")
    .select("id, phone, name")
    .eq("id", lead_id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const phone = (lead as { phone?: string | null }).phone;
  if (!phone || String(phone).replace(/\D/g, "").length < 10) {
    return NextResponse.json({ error: "Lead has no valid phone number" }, { status: 400 });
  }

  if (!process.env.VAPI_API_KEY || !process.env.VAPI_PHONE_NUMBER_ID) {
    return NextResponse.json({ error: "Outbound calling not configured" }, { status: 503 });
  }

  const [ctxRes, agentRes] = await Promise.all([
    db.from("workspace_business_context").select("business_name, offer_summary, business_hours, faq").eq("workspace_id", workspaceId).maybeSingle(),
    db.from("agents").select("id, name, greeting, knowledge_base, vapi_agent_id").eq("workspace_id", workspaceId).limit(1).maybeSingle(),
  ]);
  const ctx = ctxRes.data as { business_name?: string; offer_summary?: string; business_hours?: Record<string, unknown>; faq?: Array<{ q?: string; a?: string }> } | null;
  const agent = agentRes.data as { id: string; name?: string; greeting?: string; knowledge_base?: Record<string, unknown>; vapi_agent_id?: string | null } | null;
  if (!agent) return NextResponse.json({ error: "No agent configured for workspace" }, { status: 400 });

  const business_name = ctx?.business_name ?? "The business";
  const offer_summary = ctx?.offer_summary ?? "";
  const business_hours = (ctx?.business_hours ?? {}) as Record<string, { start: string; end: string } | null>;
  const faq = ctx?.faq ?? [];
  const agent_name = agent.name ?? "Sarah";
  const kb = agent.knowledge_base ?? {};
  const services = typeof kb.services === "string" ? kb.services : undefined;
  const emergencies_after_hours = typeof kb.emergencies_after_hours === "string" ? kb.emergencies_after_hours : undefined;
  const appointment_handling = typeof kb.appointment_handling === "string" ? kb.appointment_handling : undefined;
  const faq_extra = typeof kb.faq_extra === "string" ? kb.faq_extra : undefined;

  const systemPrompt = compileSystemPrompt({
    business_name,
    offer_summary,
    business_hours,
    faq,
    agent_name,
    greeting: agent.greeting,
    services,
    emergencies_after_hours,
    appointment_handling,
    faq_extra,
  });
  const firstMessage = (agent.greeting && String(agent.greeting).trim()) || `Hello, this is ${agent_name}. How can I help you today?`;

  let assistantId = agent.vapi_agent_id ?? null;
  if (!assistantId) {
    try {
      const { id } = await createAssistant({
        name: `${agent_name} – ${workspaceId.slice(0, 8)}`,
        systemPrompt,
        firstMessage,
      });
      assistantId = id;
      await db.from("agents").update({ vapi_agent_id: assistantId, updated_at: new Date().toISOString() }).eq("id", agent.id);
    } catch (e) {
      return NextResponse.json({ error: "Failed to create voice assistant" }, { status: 500 });
    }
  }

  const { data: sessionRow, error: insertErr } = await db
    .from("call_sessions")
    .insert({
      workspace_id: workspaceId,
      lead_id: lead_id,
      provider: "vapi",
      call_started_at: new Date().toISOString(),
      external_meeting_id: `outbound-${Date.now()}-${lead_id.slice(0, 8)}`,
    })
    .select("id")
    .single();
  if (insertErr || !sessionRow) {
    return NextResponse.json({ error: "Failed to create call session" }, { status: 500 });
  }
  const callSessionId = (sessionRow as { id: string }).id;

  const customerNumber = String(phone).trim();
  const e164 = /^\+?\d{10,15}$/.test(customerNumber) ? customerNumber : customerNumber.replace(/\D/g, "").length === 10 ? `+1${customerNumber.replace(/\D/g, "")}` : customerNumber.replace(/\D/g, "");

  try {
    await createOutboundCall({
      assistantId,
      customerNumber: e164 || customerNumber,
      metadata: {
        workspace_id: workspaceId,
        call_session_id: callSessionId,
        lead_id: lead_id,
      },
    });
  } catch (e) {
    await db.from("call_sessions").update({ call_ended_at: new Date().toISOString() }).eq("id", callSessionId);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Outbound call failed" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, call_session_id: callSessionId });
}
