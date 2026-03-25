export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

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
const DEFAULT_SYSTEM = `You are a friendly, professional AI phone receptionist for Recall Touch. You answer phone calls for businesses.

CRITICAL RULES:
- You are ON A LIVE PHONE CALL. Speak naturally like a human on the phone.
- Keep responses to 1-3 SHORT sentences. Never more.
- No bullet points, lists, markdown, or special formatting. Just natural speech.
- Ask ONE question at a time. Wait for the answer.
- Be warm but efficient. Guide the conversation toward: name, need, next step.
- If you don't know something, say "Let me check on that" or "I'll have someone get back to you."
- Never say "as an AI" or "I'm a language model." You are the business receptionist.
- Use filler words naturally: "Sure thing", "Absolutely", "Of course", "Let me see..."
- If the caller asks about pricing, give general info or offer to have someone follow up.
- Always try to book an appointment or capture their contact info.`;

export async function POST(req: NextRequest) {
  const start = Date.now();

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
      try {
        const db = getDb();
        // Load business context for this workspace
        const { data: ctx } = await db
          .from("workspace_business_context")
          .select("business_name, industry, services, business_hours, address, pricing_range, tone_guidelines")
          .eq("workspace_id", wsId)
          .maybeSingle();

        // Also load agent name + greeting from workspaces table
        const { data: wsRow } = await db
          .from("workspaces")
          .select("agent_name, greeting, voice_id")
          .eq("id", wsId)
          .maybeSingle();

        if (ctx?.business_name) {
          const agentName = (wsRow as { agent_name?: string } | null)?.agent_name || "the receptionist";
          const greeting = (wsRow as { greeting?: string } | null)?.greeting;
          const style = (ctx as { tone_guidelines?: string }).tone_guidelines || "warm and professional";
          systemPrompt = `You are ${agentName} answering the phone for ${ctx.business_name}.
Style: ${style}.

CRITICAL RULES:
- You are ON A LIVE PHONE CALL. Speak naturally like a human.
- Keep responses to 1-3 SHORT sentences. Never more.
- No bullet points, lists, markdown. Just natural speech.
- Ask ONE question at a time.
- Be warm but efficient: get name, need, next step.
- Never reveal you are AI. You are the business receptionist.

Business info:
- Name: ${ctx.business_name}
- Industry: ${(ctx as { industry?: string }).industry || "general"}
- Services: ${(ctx as { services?: string }).services || "various services"}
- Hours: ${(ctx as { business_hours?: string }).business_hours || "regular business hours"}
- Area: ${(ctx as { address?: string }).address || "local area"}
- Pricing: ${(ctx as { pricing_range?: string }).pricing_range || "varies by service — offer to have someone follow up with details"}
${greeting ? `- Opening greeting: "${greeting}"` : ""}`;
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
        max_tokens: 150,
        system: systemPrompt,
        messages,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`Anthropic API error ${res.status}: ${errText.slice(0, 200)}`);
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
      console.warn(`[agent/respond] Slow response: ${latency}ms`);
    }

    return NextResponse.json({ text });
  } catch (err) {
    console.error("[agent/respond] Error:", err);
    return NextResponse.json({
      text: "I'm having trouble hearing you. Let me get your number so someone can call you back.",
    });
  }
}
