export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";
import { buildVapiSystemPrompt } from "@/lib/agents/build-vapi-system-prompt";
import { buildAfterHoursInstructions } from "@/lib/voice/after-hours";
import { log } from "@/lib/logger";

/**
 * POST /api/agent/respond
 *
 * Voice-server LLM endpoint. The conversation engine on Fly.io sends the
 * accumulated transcript + latest user utterance and expects a short,
 * phone-natural AI reply.
 *
 * Request body (from voice server):
 *   { messages: [{role, content}], conversation_id?: string }
 *
 * Response:
 *   { text: string }
 */

type Message = { role: string; content: string };

// Default system prompt for demo / fallback when no workspace context found
const DEFAULT_SYSTEM = `You are a professional AI revenue operator for Revenue Operator. You answer phone calls for businesses.

CRITICAL RULES:
- You are ON A LIVE PHONE CALL. Speak naturally like a human on the phone.
- Keep responses to 1-3 SHORT sentences. Never more.
- No bullet points, lists, markdown, or special formatting. Just natural speech.
- Ask ONE question at a time. Wait for the answer.
- Be warm but efficient. Guide the conversation toward: name, need, next step.
- If you don't know something, say "Let me check on that" or "I'll have someone get back to you."
- Never say "as an AI" or "I'm a language model." You represent the business professionally.
- Use filler words naturally: "Sure thing", "Absolutely", "Of course", "Let me see..."
- If the caller asks about pricing, give general info or offer to have someone follow up.
- Always try to book an appointment or capture their contact info.`;

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const start = Date.now();

  // Auth: voice server must provide a valid internal secret OR a valid call_session_id
  const VOICE_SERVER_SECRET = process.env.VOICE_SERVER_SECRET;
  const authHeader = req.headers.get("x-voice-server-key") ?? "";
  const hasValidSecret = VOICE_SERVER_SECRET && authHeader === VOICE_SERVER_SECRET;

  // Rate limit: 60 requests per minute per IP (voice server makes rapid calls during conversations)
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`agent-respond:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { text: "I'm sorry, could you hold on just a moment?" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  let body: {
    messages?: Message[];
    conversation_id?: string;
    workspace_id?: string;
    call_session_id?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // Voice server sent malformed JSON (e.g. empty body, partial stream)
    return NextResponse.json({ text: "Sorry, could you say that again?" });
  }

  try {

    const rawMessages = body?.messages ?? [];
    if (rawMessages.length === 0) {
      return NextResponse.json({ text: "Hi there! How can I help you today?" });
    }

    // Try to load workspace-specific context if we have a conversation/call ID
    let systemPrompt = DEFAULT_SYSTEM;
    const wsId = body?.workspace_id;

    if (wsId) {
      // Validate: if workspace_id is provided, require either voice server secret OR valid call session
      if (!hasValidSecret && body?.call_session_id) {
        const db = getDb();
        const { data: sessionCheck } = await db
          .from("call_sessions")
          .select("id")
          .eq("id", body.call_session_id)
          .eq("workspace_id", wsId)
          .maybeSingle();
        if (!sessionCheck) {
          return NextResponse.json({ text: "I'm sorry, something went wrong. Please try calling again." }, { status: 403 });
        }
      } else if (!hasValidSecret) {
        // No secret and no call_session_id — can't verify workspace access
        // Fall through to default system prompt (no workspace data loaded)
      }
    }

    if (wsId) {
      try {
        const db = getDb();
        // Load full agent configuration for this workspace
        const [wsRes, settingsRes] = await Promise.all([
          db
            .from("workspaces")
            .select("agent_name, greeting, voice_id, industry, services, special_instructions, personality, call_style, assertiveness, primary_goal, business_context, target_audience, business_hours, address, qualification_criteria, qualification_questions, timezone, max_call_duration")
            .eq("id", wsId)
            .maybeSingle(),
          db
            .from("settings")
            .select("after_hours_behavior, emergency_keywords, transfer_phone")
            .eq("workspace_id", wsId)
            .maybeSingle(),
        ]);

        const wsRow = wsRes.data;
        const settingsRow = settingsRes.data as {
          after_hours_behavior?: string;
          emergency_keywords?: string;
          transfer_phone?: string;
        } | null;

        const ws = wsRow as Record<string, unknown> | null;
        if (ws?.agent_name) {
          // Load FAQ from knowledge base
          const { data: kbItems } = await db
            .from("knowledge_base")
            .select("content, category, metadata")
            .eq("workspace_id", wsId)
            .eq("source", "faq")
            .limit(30);

          const faq = (kbItems ?? []).map((item: Record<string, unknown>) => {
            const meta = (item.metadata ?? {}) as Record<string, string>;
            return { question: meta.question ?? "", answer: String(item.content ?? "") };
          }).filter((f: { question: string; answer: string }) => f.question && f.answer);

          // Load business context
          const { data: ctx } = await db
            .from("workspace_business_context")
            .select("business_name, industry, services, business_hours, address, pricing_range, tone_guidelines")
            .eq("workspace_id", wsId)
            .maybeSingle();

          const bizCtx = ctx as Record<string, unknown> | null;
          const businessName = String(bizCtx?.business_name ?? ws.agent_name ?? "the business");

          // Load objection handling config
          const { data: objRows } = await db
            .from("agent_objections")
            .select("trigger, response")
            .eq("workspace_id", wsId)
            .limit(20);

          const objections = (objRows ?? []).map((o: Record<string, unknown>) => ({
            trigger: String(o.trigger ?? ""),
            response: String(o.response ?? ""),
          })).filter((o: { trigger: string; response: string }) => o.trigger && o.response);

          // Load rules
          const { data: rulesRow } = await db
            .from("agent_rules")
            .select("never_say, always_transfer, escalation_triggers, transfer_phone, transfer_rules")
            .eq("workspace_id", wsId)
            .maybeSingle();

          const rulesData = rulesRow as Record<string, unknown> | null;

          // Get after-hours behavior from settings and determine if we're currently after-hours
          const afterHoursBehavior = (settingsRow?.after_hours_behavior || "messages") as "messages" | "emergency" | "forward";
          const emergencyKeywords = settingsRow?.emergency_keywords || "";
          const settingsTransferPhone = settingsRow?.transfer_phone || "";
          const businessHours = (ws.business_hours as Record<string, { start: string; end: string } | null> | null) ?? null;
          const timezone = String(ws.timezone ?? "America/New_York");

          // Build after-hours instructions if currently outside business hours
          const afterHoursInstructions = buildAfterHoursInstructions(
            businessHours,
            afterHoursBehavior,
            emergencyKeywords,
            settingsTransferPhone,
            timezone
          );

          // Load learned behaviors from Call Intelligence
          const { data: learnedRows } = await db
            .from("call_intelligence_insights")
            .select("recommendation")
            .eq("workspace_id", wsId)
            .eq("applied", true)
            .limit(10);

          const learnedBehaviors = (learnedRows ?? [])
            .map((r: Record<string, unknown>) => String(r.recommendation ?? ""))
            .filter(Boolean);

          // Build the full system prompt
          systemPrompt = buildVapiSystemPrompt({
            businessName,
            industry: String(ws.industry ?? bizCtx?.industry ?? ""),
            agentName: String(ws.agent_name),
            greeting: String(ws.greeting ?? `Hi, thanks for calling ${businessName}! How can I help you today?`),
            services: Array.isArray(bizCtx?.services) ? (bizCtx.services as string[]) : String(bizCtx?.services ?? "").split(",").map((s: string) => s.trim()).filter(Boolean),
            faq,
            specialInstructions: String(ws.special_instructions ?? ""),
            rules: {
              neverSay: Array.isArray(rulesData?.never_say) ? (rulesData.never_say as string[]) : [],
              alwaysTransfer: Array.isArray(rulesData?.always_transfer) ? (rulesData.always_transfer as string[]) : [],
              escalationTriggers: Array.isArray(rulesData?.escalation_triggers) ? (rulesData.escalation_triggers as string[]) : [],
              transferPhone: rulesData?.transfer_phone ? String(rulesData.transfer_phone) : null,
              transferRules: Array.isArray(rulesData?.transfer_rules) ? (rulesData.transfer_rules as Array<{ phrase?: string; phone?: string }>) : [],
            },
            personality: String(ws.personality ?? bizCtx?.tone_guidelines ?? "professional"),
            callStyle: String(ws.call_style ?? "conversational"),
            assertiveness: typeof ws.assertiveness === "number" ? ws.assertiveness : 50,
            primaryGoal: String(ws.primary_goal ?? "answer_route"),
            businessContext: String(ws.business_context ?? bizCtx?.business_name ?? ""),
            targetAudience: String(ws.target_audience ?? ""),
            businessHours: String(ws.business_hours ?? bizCtx?.business_hours ?? ""),
            address: String(ws.address ?? bizCtx?.address ?? ""),
            afterHoursInstructions: afterHoursInstructions ?? "",
            qualificationCriteria: Array.isArray(ws.qualification_criteria) ? (ws.qualification_criteria as string[]) : [],
            qualificationQuestions: Array.isArray(ws.qualification_questions) ? (ws.qualification_questions as string[]) : [],
            objections,
            learnedBehaviors,
            maxCallDuration: typeof ws.max_call_duration === "number" ? ws.max_call_duration : 15,
            timezone,
          });
        }
      } catch {
        // Fall through to default prompt — don't break the call
      }
    }

    // Sanitize and prepare messages for Claude
    const messages = rawMessages
      .filter(
        (m): m is Message =>
          typeof m?.role === "string" &&
          typeof m?.content === "string" &&
          (m.role === "user" || m.role === "assistant" || m.role === "system")
      )
      .slice(-30) // Keep last 30 turns for context
      .map((m) => {
        // If the voice server sent a system message, merge it into our system prompt
        if (m.role === "system") {
          systemPrompt = m.content;
          return null;
        }
        return {
          role: m.role as "user" | "assistant",
          content: String(m.content).trim().slice(0, 3000),
        };
      })
      .filter((m): m is { role: "user" | "assistant"; content: string } =>
        m !== null && m.content.length > 0
      );

    if (messages.length === 0) {
      return NextResponse.json({ text: "Hi! How can I help you?" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        text: "I'm having a small technical issue. Can I get your number and call you right back?",
      });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 250,
        system: systemPrompt,
        messages,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      log("error", `Anthropic API error ${res.status}: ${errText.slice(0, 200)}`);
      return NextResponse.json({
        text: "I'm sorry, could you repeat that? I missed what you said.",
      });
    }

    const data = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text =
      data?.content?.[0]?.text?.trim() || "Sorry, could you say that again?";

    const latency = Date.now() - start;
    if (latency > 3000) {
      log("warn", "[agent/respond] Slow response", { latencyMs: latency });
    }

    return NextResponse.json({ text });
  } catch (err) {
    log("error", "[agent/respond] Error:", { error: err });
    return NextResponse.json({
      text: "I'm having trouble hearing you. Let me get your number so someone can call you back.",
    });
  }
}
