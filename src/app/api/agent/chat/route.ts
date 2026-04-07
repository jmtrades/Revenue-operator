export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";

const DEMO_SYSTEM =
  `You answer phone calls for Revenue Operator. Adapt to the caller's business context, stay calm and natural, and guide the conversation toward the next clear step. Keep replies short, human, and focused on the caller's name, need, and next step.`;

const AGENTS: Record<string, { name: string; style: string; greeting: string }> = {
  sarah: {
    name: "Revenue Operator",
    style: "professional, formal tone",
    greeting: "Hello. Thanks for calling. How can I help you today?",
  },
  alex: {
    name: "Revenue Operator",
    style: "friendly, casual tone",
    greeting: "Hi there! Thanks for reaching out. What can I do for you?",
  },
  emma: {
    name: "Revenue Operator",
    style: "direct, calm tone",
    greeting: "Hi. How can I help?",
  },
};

type Message = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  // Rate limit: 20 requests per minute per IP (demo endpoint)
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`agent-chat:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const body = (await req.json()) as {
      messages?: Message[];
      agentId?: string;
      agent?: string;
      business?: {
        name?: string;
        services?: string;
        hours?: string;
        area?: string;
        pricing?: string;
      };
    };

    const rawMessages = body?.messages ?? [];
    if (rawMessages.length > 40) {
      return NextResponse.json({
        text: "Thanks for chatting! Want to try this for your business? It takes about 5 minutes to set up.",
      });
    }

    const agentId = body?.agentId ?? body?.agent ?? "sarah";
    const a = AGENTS[agentId] ?? AGENTS.sarah;
    const biz = body?.business ?? {};

    const name = (biz.name ?? "").trim() || "the business";
    const services = (biz.services ?? "").trim();
    const hours = (biz.hours ?? "").trim();
    const area = (biz.area ?? "").trim();
    const pricing = (biz.pricing ?? "").trim();
    const useDemoPrompt = !body?.business?.name?.trim();

    const messages = rawMessages
      .filter((m): m is Message => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
      .slice(-24)
      .map((m) => ({ role: m.role, content: String(m.content).trim().slice(0, 2000) }))
      .filter((m) => m.content.length > 0);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        text: "I'm having trouble hearing you. Can I get your number and call you right back?",
      });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        system: useDemoPrompt
          ? DEMO_SYSTEM
          : `You are ${a.name} for ${name}. Style: ${a.style}. This is a phone call. Keep replies to 1-2 sentences. Talk like a human on the phone. Ask one question at a time. No bullet points, no lists, no markdown. Business: ${name}. Services: ${services}. Hours: ${hours}. Area: ${area}. Pricing: ${pricing}.`,
        messages,
      }),
    });

    if (!res.ok) throw new Error("Anthropic API error");
    const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
    const text = data?.content?.[0]?.text?.trim() || "Sorry, could you repeat that?";
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({
      text: "I'm having trouble hearing you. Can I get your number and call you right back?",
    });
  }
}
