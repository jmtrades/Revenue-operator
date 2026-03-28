/**
 * POST /api/agents/[id]/test-call — Trigger a test outbound call to the given phone number.
 * Body: { phone_number?: string }. Uses the Recall voice provider for test calls.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { compileSystemPrompt } from "@/lib/business-brain";
import { getVoiceProvider } from "@/lib/voice";
import { DEFAULT_RECALL_VOICE_ID, RECALL_VOICES } from "@/lib/constants/recall-voices";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

/** Validate voice_id against known voices; fall back to default if invalid */
function resolveVoiceId(rawVoiceId: string | null | undefined): string {
  const vid = (rawVoiceId ?? "").trim();
  if (!vid) return DEFAULT_RECALL_VOICE_ID;
  // Check if it matches a known voice ID
  if (RECALL_VOICES.some((v) => v.id === vid)) return vid;
  // Try matching by name (case-insensitive) — handles "sarah" → "us-female-warm-receptionist"
  const byName = RECALL_VOICES.find((v) => v.name.toLowerCase() === vid.toLowerCase());
  if (byName) return byName.id;
  // Unknown voice ID — fall back to default rather than failing
  log("warn", "test_call.unknown_voice_id", { rawVoiceId: vid, fallback: DEFAULT_RECALL_VOICE_ID });
  return DEFAULT_RECALL_VOICE_ID;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const { id } = await ctx.params;
  const db = getDb();
  const { data: agent } = await db.from("agents").select("id, workspace_id, name, greeting, knowledge_base").eq("id", id).maybeSingle();
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const workspaceId = (agent as { workspace_id: string }).workspace_id;
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`test-call:${workspaceId}`, 3, 60_000);
  if (!rl.allowed) {
    const retryAfterSeconds = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.max(0, retryAfterSeconds)) } }
    );
  }

  let body: { phone_number?: string };
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }
  const rawPhone = body.phone_number?.trim() ?? "";
  const digits = rawPhone.replace(/\D/g, "");
  if (!rawPhone || digits.length < 10 || digits.length > 15) {
    return NextResponse.json({ ok: true, message: "Add a phone number to receive a test call, or call from the Activity feed." });
  }
  // Normalize to E.164: if already has +, trust it; if 10 digits, assume US (+1); otherwise prefix +
  const phone = rawPhone.startsWith("+") ? rawPhone : digits.length === 10 ? `+1${digits}` : `+${digits}`;

  // ── Pre-flight checks: catch configuration issues before attempting the call ──
  if (!process.env.VOICE_SERVER_URL && !process.env.TWILIO_ACCOUNT_SID) {
    return NextResponse.json({
      error: "Voice calling is not configured yet. Please contact support to enable test calls.",
      code: "voice_not_configured",
      preflight: { voice_server: false, telephony: false },
    }, { status: 503 });
  }

  if (!process.env.TELNYX_API_KEY && !process.env.TWILIO_ACCOUNT_SID) {
    return NextResponse.json({
      error: "No telephony provider credentials found. Please contact support to connect Telnyx or Twilio.",
      code: "telephony_not_configured",
      preflight: { voice_server: true, telephony: false },
    }, { status: 503 });
  }

  if (process.env.TELNYX_API_KEY && !process.env.TELNYX_CONNECTION_ID) {
    return NextResponse.json({
      error: "Telnyx connection ID is missing. Please contact support to complete telephony setup.",
      code: "telnyx_connection_missing",
      preflight: { voice_server: true, telephony: false },
    }, { status: 503 });
  }

  const [ctxRes, agentRes] = await Promise.all([
    db.from("workspace_business_context").select("business_name, offer_summary, business_hours, faq").eq("workspace_id", workspaceId).maybeSingle(),
    db.from("agents").select("id, name, greeting, knowledge_base, voice_id").eq("id", id).maybeSingle(),
  ]);
  const a = agentRes.data as { id: string; name?: string; greeting?: string; knowledge_base?: Record<string, unknown>; voice_id?: string | null } | null;
  if (!a) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const ctxData = ctxRes.data as { business_name?: string; offer_summary?: string; business_hours?: Record<string, unknown>; faq?: Array<{ q?: string; a?: string }> } | null;
  const business_name = ctxData?.business_name ?? "The business";
  const offer_summary = ctxData?.offer_summary ?? "";
  const business_hours = (ctxData?.business_hours ?? {}) as Record<string, { start: string; end: string } | null>;
  // Merge FAQ: use workspace_business_context FAQ first, fall back to agent knowledge_base FAQ
  const ctxFaq = Array.isArray(ctxData?.faq) ? ctxData.faq : [];
  const kb = a.knowledge_base ?? {};
  const agentFaq = Array.isArray((kb as { faq?: unknown }).faq) ? ((kb as { faq: Array<{ q?: string; a?: string }> }).faq) : [];
  const faq = ctxFaq.length > 0 ? ctxFaq : agentFaq;
  const agent_name = a.name ?? "Sarah";
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

  // Create a temporary assistant for the test call
  // NOTE: We don't store test assistant IDs in the agents table anymore
  let assistantId: string | null = null;
  try {
    const { assistantId: aid } = await voice.createAssistant({
      name: `${agent_name} – Test – ${workspaceId.slice(0, 8)}`,
      systemPrompt,
      voiceId: resolveVoiceId(a.voice_id),
      voiceProvider: "deepgram-aura",
      language: "en",
      tools: [],
      maxDuration: undefined,
      silenceTimeout: 30,
      backgroundDenoising: true,
      metadata: { workspace_id: workspaceId, greeting: a.greeting || "Hello, how can I help you?" },
    });
    assistantId = aid;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create voice assistant";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (!assistantId) {
    return NextResponse.json({ error: "Failed to create voice assistant" }, { status: 500 });
  }

  const { data: testLead } = await db
    .from("leads")
    .insert({
      workspace_id: workspaceId,
      name: "Test contact",
      phone,
      status: "NEW",
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
      provider: "recall",
      call_started_at: new Date().toISOString(),
      external_meeting_id: `test-${Date.now()}`,
      // Used by voice webhook to flip agents.tested_at once the test finishes.
      metadata: { test_call: true, agent_id: id },
    })
    .select("id")
    .maybeSingle();
  if (sessErr || !sessionRow) return NextResponse.json({ error: "Failed to create call session" }, { status: 500 });
  const callSessionId = (sessionRow as { id: string }).id;

  try {
    await voice.createOutboundCall({
      assistantId,
      phoneNumber: phone,
      metadata: { workspace_id: workspaceId, call_session_id: callSessionId, lead_id: leadId },
    });
  } catch (e) {
    await db.from("call_sessions").update({ call_ended_at: new Date().toISOString() }).eq("id", callSessionId);
    const rawMsg = e instanceof Error ? e.message : "Test call failed";
    // Return user-friendly error with diagnostic hint
    return NextResponse.json({
      error: "We couldn't connect your test call. This can happen if the phone number format is incorrect or the voice provider is temporarily unavailable. Please try again in a moment.",
      code: "call_initiation_failed",
      detail: rawMsg,
    }, { status: 502 });
  }
  return NextResponse.json({ ok: true, reason: "test_call_started", message: "Test call initiated — your phone should ring within 10 seconds." });
}
