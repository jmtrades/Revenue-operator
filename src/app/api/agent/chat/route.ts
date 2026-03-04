export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; content: string };

type AgentId = "sarah" | "alex" | "emma";

const AGENTS: Record<AgentId, { name: string; style: string; gender: "female" | "male" }> = {
  sarah: {
    name: "Sarah",
    style: "warm, friendly, reassuring — like a helpful neighbor",
    gender: "female",
  },
  alex: {
    name: "Alex",
    style: "professional, polished, confident — crisp and efficient",
    gender: "male",
  },
  emma: {
    name: "Emma",
    style: "upbeat, energetic, enthusiastic — makes callers smile",
    gender: "female",
  },
};

function safeString(x: unknown, max = 1200): string {
  if (typeof x !== "string") return "";
  const s = x.trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

function buildSystemPrompt(input: {
  agentId: AgentId;
  businessName?: string;
  greeting?: string;
  personality?: number;
  callStyle?: "thorough" | "conversational" | "quick";
}) {
  const cfg = AGENTS[input.agentId];
  const businessName = safeString(input.businessName) || "Riverside Plumbing";
  const greeting = safeString(input.greeting) || `Thanks for calling ${businessName}! This is ${cfg.name}. How can I help you today?`;
  const personality = typeof input.personality === "number" ? Math.max(0, Math.min(100, input.personality)) : 60;
  const callStyle = input.callStyle ?? "conversational";

  const personalityHint =
    personality <= 10
      ? "very professional, minimal warmth"
      : personality <= 35
        ? "professional, calm, efficient"
        : personality <= 65
          ? "balanced: friendly but concise"
          : personality <= 90
            ? "friendly, upbeat, reassuring"
            : "very friendly, high warmth, still efficient";

  const styleHint =
    callStyle === "thorough"
      ? "ask 1–2 clarifying questions before offering next steps"
      : callStyle === "quick"
        ? "get to the point and move toward booking quickly"
        : "keep a natural back-and-forth with brief confirmations";

  return `You are ${cfg.name}, a phone receptionist for ${businessName}. Your personality is ${cfg.style}. Also: ${personalityHint}. Call style: ${styleHint}.

Start with this greeting if the conversation is empty: "${greeting}"

You answer calls, book appointments, capture lead information, handle emergencies, and answer questions about the business.

RULES:
- You are having a PHONE CONVERSATION. Keep responses SHORT — 1-3 sentences max, like real speech.
- Be natural. Use contractions. Say "gonna" not "going to." Say "yeah" not "yes."
- Ask ONE question at a time. Never dump multiple questions.
- No bullet points. No lists.
- If someone asks about services, pricing, or hours — give helpful answers and try to book an appointment.
- Collect: name, phone number, what they need, when they're available.
- When you have enough info, confirm the appointment with a clear time.
- If it's an emergency (burst pipe, flooding, gas leak), express urgency and say you'll alert the owner immediately.
- NEVER say you're an AI unless directly asked. If asked, say: "I'm an AI assistant for ${businessName}."

Business context:
- Services: General plumbing, drain cleaning, water heater repair, emergency service, kitchen/bath remodels.
- Hours: Mon–Fri 8AM–6PM, Sat 9AM–2PM, closed Sunday.
- Emergency: Available 24/7 for burst pipes, flooding, gas leaks.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      messages?: ChatMessage[];
      agent?: string;
      businessName?: string;
      greeting?: string;
      personality?: number;
      callStyle?: "thorough" | "conversational" | "quick";
    };

    const agentId: AgentId = (body?.agent === "alex" || body?.agent === "emma" ? body.agent : "sarah") as AgentId;
    const cfg = AGENTS[agentId];
    const incoming = Array.isArray(body?.messages) ? body.messages : [];
    const messages = incoming
      .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
      .slice(-24)
      .map((m) => ({ role: m.role, content: safeString(m.content, 2000) }))
      .filter((m) => m.content.length > 0);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { text: "Voice agent is not configured yet. Please set ANTHROPIC_API_KEY.", agent: cfg.name },
        { status: 200 }
      );
    }

    const system = buildSystemPrompt({
      agentId,
      businessName: body?.businessName,
      greeting: body?.greeting,
      personality: body?.personality,
      callStyle: body?.callStyle,
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 150,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    const data = (await response.json().catch(() => null)) as
      | { content?: Array<{ type?: string; text?: string }>; error?: { message?: string } }
      | null;

    const text = safeString(data?.content?.[0]?.text, 600) || "Sorry — I didn’t catch that. Could you say that again?";
    return NextResponse.json({ text, agent: cfg.name, agentId });
  } catch {
    return NextResponse.json(
      { text: "Sorry — something went wrong. Could you try that again?", agent: "Sarah", agentId: "sarah" },
      { status: 200 }
    );
  }
}

