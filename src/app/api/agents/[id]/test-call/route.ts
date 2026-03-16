/**
 * POST /api/agents/[id]/test-call — Trigger a test outbound call to the given phone number.
 * Body: { phone_number?: string }. If phone_number and Vapi are configured, places the call.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { compileSystemPrompt } from "@/lib/business-brain";
import { getVoiceProvider } from "@/lib/voice";
import { DEFAULT_VOICE_ID } from "@/lib/constants/curated-voices";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDb();
  const { data: agent } = await db.from("agents").select("id, workspace_id, name, greeting, knowledge_base, vapi_agent_id").eq("id", id).maybeSingle();
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const workspaceId = (agent as { workspace_id: string }).workspace_id;
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  let body: { phone_number?: string };
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }
  const phone = body.phone_number?.trim();
  if (!phone || phone.replace(/\D/g, "").length < 10) {
    return NextResponse.json({ ok: true, message: "Add a phone number to receive a test call, or call from the Activity feed." });
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ ok: true, message: "Voice is not configured yet. Set ELEVENLABS_API_KEY to enable test calls." });
  }

  const [ctxRes, agentRes] = await Promise.all([
    db.from("workspace_business_context").select("business_name, offer_summary, business_hours, faq").eq("workspace_id", workspaceId).maybeSingle(),
    db.from("agents").select("id, name, greeting, knowledge_base, vapi_agent_id, voice_id").eq("id", id).maybeSingle(),
  ]);
  const a = agentRes.data as { id: string; name?: string; greeting?: string; knowledge_base?: Record<string, unknown>; vapi_agent_id?: string | null; voice_id?: string | null } | null;
  if (!a) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const ctxData = ctxRes.data as { business_name?: string; offer_summary?: string; business_hours?: Record<string, unknown>; faq?: Array<{ q?: string; a?: string }> } | null;
  const business_name = ctxData?.business_name ?? "The business";
  const offer_summary = ctxData?.offer_summary ?? "";
  const business_hours = (ctxData?.business_hours ?? {}) as Record<string, { start: string; end: string } | null>;
  const faq = ctxData?.faq ?? [];
  const agent_name = a.name ?? "Sarah";
  const kb = a.knowledge_base ?? {};
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
    greeting: a.greeting,
    services,
    emergencies_after_hours,
    appointment_handling,
    faq_extra,
  });
  const _firstMessage = (a.greeting && String(a.greeting).trim()) || `Hello, this is ${agent_name}. How can I help you today?`;

  const voice = getVoiceProvider();

  let assistantId = a.vapi_agent_id ?? null;
  if (!assistantId) {
    try {
      const { assistantId: aid } = await voice.createAssistant({
        name: `${agent_name} – ${workspaceId.slice(0, 8)}`,
        systemPrompt,
        voiceId: a.voice_id || DEFAULT_VOICE_ID,
        voiceProvider: "elevenlabs",
        language: "en",
        tools: [],
        maxDuration: undefined,
        silenceTimeout: undefined,
        backgroundDenoising: true,
        metadata: { workspace_id: workspaceId, greeting: a.greeting || "Hello, how can I help you?" },
      });
      assistantId = aid;
      await db.from("agents").update({ vapi_agent_id: assistantId, updated_at: new Date().toISOString() }).eq("id", a.id);
    } catch {
      return NextResponse.json({ error: "Failed to create voice assistant" }, { status: 500 });
    }
  }

  const { data: testLead } = await db
    .from("leads")
    .insert({
      workspace_id: workspaceId,
      name: "Test contact",
      phone: phone.replace(/\D/g, "").length === 10 ? `+1${phone.replace(/\D/g, "")}` : phone,
      state: "NEW",
      external_id: `test-${Date.now()}`,
    })
    .select("id")
    .maybeSingle();
  const leadId = (testLead as { id: string } | null)?.id;
  if (!leadId) return NextResponse.json({ error: "Failed to create test contact" }, { status: 500 });

  const { data: sessionRow, error: sessErr } = await db
    .from("call_sessions")
    .insert({
      workspace_id: workspaceId,
      lead_id: leadId,
      provider: "elevenlabs",
      call_started_at: new Date().toISOString(),
      external_meeting_id: `test-${Date.now()}`,
    })
    .select("id")
    .maybeSingle();
  if (sessErr || !sessionRow) return NextResponse.json({ error: "Failed to create call session" }, { status: 500 });
  const callSessionId = (sessionRow as { id: string }).id;

  const e164 = /^\+?\d{10,15}$/.test(phone) ? phone : phone.replace(/\D/g, "").length === 10 ? `+1${phone.replace(/\D/g, "")}` : phone.replace(/\D/g, "");
  try {
    await voice.createOutboundCall({
      assistantId,
      phoneNumber: e164 || phone,
      metadata: { workspace_id: workspaceId, call_session_id: callSessionId, lead_id: leadId },
    });
  } catch (e) {
    await db.from("call_sessions").update({ call_ended_at: new Date().toISOString() }).eq("id", callSessionId);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Test call failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, reason: "test_call_started" });
}
