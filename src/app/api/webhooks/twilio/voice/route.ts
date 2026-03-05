/**
 * Twilio voice webhook: inbound call to a Recall Touch number.
 * When VAPI_API_KEY and VAPI_PHONE_NUMBER_ID are set, hands off to Vapi for voice AI; otherwise fallback to Say+Record.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { compileSystemPrompt } from "@/lib/business-brain";
import { createAssistant, createCallForTwilio } from "@/lib/vapi";

const FALLBACK_TWIML = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Thanks for calling. Please hold while we connect you.</Say><Pause length="2"/><Say voice="alice">If you need to speak to someone, please leave your name and number after the beep.</Say><Record maxLength="90" transcribe="true"/></Response>`;

export async function POST(req: NextRequest) {
  let form: Record<string, string>;
  try {
    const text = await req.text();
    form = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>;
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }
  const from = form.From ?? form.Caller;
  const to = form.To ?? form.Called;
  const callSid = form.CallSid;

  const db = getDb();
  const { data: phoneConfig } = await db
    .from("phone_configs")
    .select("workspace_id, proxy_number")
    .or(`proxy_number.eq.${to?.replace(/\s/g, "")},proxy_number.eq.${to}`)
    .eq("status", "active")
    .maybeSingle();

  const workspaceId = (phoneConfig as { workspace_id?: string } | null)?.workspace_id ?? null;
  let callSessionId: string | null = null;

  if (workspaceId && callSid) {
    try {
      const { data: existing } = await db.from("call_sessions").select("id").eq("workspace_id", workspaceId).eq("external_meeting_id", callSid).maybeSingle();
      if (!existing) {
        let leadId: string | null = null;
        const phone = (from ?? "").replace(/\D/g, "");
        if (phone.length >= 10) {
          const { data: lead } = await db.from("leads").select("id").eq("workspace_id", workspaceId).or(`phone.eq.${from},phone.eq.${phone}`).limit(1).maybeSingle();
          leadId = (lead as { id: string } | null)?.id ?? null;
          if (!leadId) {
            const { data: created } = await db.from("leads").insert({ workspace_id: workspaceId, name: "Inbound caller", phone: from ?? undefined, state: "NEW" }).select("id").single();
            leadId = (created as { id: string })?.id;
          }
        }
        const { data: inserted } = await db.from("call_sessions").insert({
          workspace_id: workspaceId,
          lead_id: leadId,
          external_meeting_id: callSid,
          provider: "twilio",
          call_started_at: new Date().toISOString(),
        }).select("id").single();
        if (inserted) callSessionId = (inserted as { id: string }).id;
      } else {
        callSessionId = (existing as { id: string }).id;
      }
    } catch {
      // continue to return TwiML
    }
  }

  if (
    process.env.VAPI_API_KEY &&
    process.env.VAPI_PHONE_NUMBER_ID &&
    workspaceId &&
    callSessionId &&
    from
  ) {
    try {
      const [ctxRes, agentRes, wsRes] = await Promise.all([
        db.from("workspace_business_context").select("business_name, offer_summary, business_hours, faq").eq("workspace_id", workspaceId).maybeSingle(),
        db.from("agents").select("id, name, greeting, knowledge_base, vapi_agent_id").eq("workspace_id", workspaceId).limit(1).maybeSingle(),
        db.from("workspaces").select("id, name, greeting, agent_name, vapi_assistant_id").eq("id", workspaceId).single(),
      ]);
      const ctx = ctxRes.data as { business_name?: string; offer_summary?: string; business_hours?: Record<string, unknown>; faq?: Array<{ q?: string; a?: string }> } | null;
      const agent = agentRes.data as { id: string; name?: string; greeting?: string; knowledge_base?: Record<string, unknown>; vapi_agent_id?: string | null } | null;
      const workspace = wsRes.data as { id: string; name?: string; greeting?: string; agent_name?: string; vapi_assistant_id?: string | null } | null;

      const business_name = ctx?.business_name ?? workspace?.name ?? "The business";
      const offer_summary = ctx?.offer_summary ?? "";
      const business_hours = (ctx?.business_hours ?? {}) as Record<string, { start: string; end: string } | null>;
      const faq = ctx?.faq ?? [];
      const agent_name = agent?.name ?? workspace?.agent_name ?? "Receptionist";
      const kb = (agent?.knowledge_base ?? {}) as Record<string, unknown>;
      const services = typeof kb.services === "string" ? kb.services : undefined;
      const emergencies_after_hours = typeof kb.emergencies_after_hours === "string" ? kb.emergencies_after_hours : undefined;
      const appointment_handling = typeof kb.appointment_handling === "string" ? kb.appointment_handling : undefined;
      const faq_extra = typeof kb.faq_extra === "string" ? kb.faq_extra : undefined;
      const greeting = (agent?.greeting ?? workspace?.greeting) ?? `Hello, thanks for calling. How can I help you today?`;

      if (!agent && !workspace) return new NextResponse(FALLBACK_TWIML, { headers: { "Content-Type": "text/xml" } });

      const systemPrompt = compileSystemPrompt({
        business_name,
        offer_summary,
        business_hours,
        faq,
        agent_name,
        greeting,
        services,
        emergencies_after_hours,
        appointment_handling,
        faq_extra,
      });
      const firstMessage = (greeting && String(greeting).trim()) || `Hello, this is ${agent_name}. How can I help you today?`;

      let assistantId: string | null = agent?.vapi_agent_id ?? workspace?.vapi_assistant_id ?? null;
      if (!assistantId) {
        const { id } = await createAssistant({
          name: `${agent_name} – ${workspaceId.slice(0, 8)}`,
          systemPrompt,
          firstMessage,
        });
        assistantId = id;
        if (agent) {
          await db.from("agents").update({ vapi_agent_id: assistantId, updated_at: new Date().toISOString() }).eq("id", agent.id);
        } else if (workspace) {
          await db.from("workspaces").update({ vapi_assistant_id: assistantId, updated_at: new Date().toISOString() }).eq("id", workspaceId);
        }
      }

      const { twiml } = await createCallForTwilio({
        assistantId,
        customerNumber: from,
        metadata: {
          workspace_id: workspaceId,
          call_session_id: callSessionId,
          twilio_call_sid: callSid,
        },
      });
      return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
    } catch {
      // fallback to Say+Record
    }
  }

  return new NextResponse(FALLBACK_TWIML, {
    headers: { "Content-Type": "text/xml" },
  });
}
