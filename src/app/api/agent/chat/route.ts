export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

const DEMO_SYSTEM =
  `You are a Recall Touch demo AI agent. You demonstrate how Recall Touch handles calls for any type of business or person. Adapt naturally to whatever the caller describes. If they mention plumbing, be a plumbing receptionist. If they mention a law firm, do legal intake. If they want to schedule a meeting, handle scheduling. If they just want to chat, be helpful. Show versatility. Be warm, professional, efficient. Keep responses short and natural like a real phone call. Always try to capture the caller's name, need, and next step.`;

const AGENTS: Record<string, { name: string; style: string; greeting: string }> = {
  sarah: {
    name: "Recall Touch",
    style: "professional, formal tone",
    greeting: "Hello. Thanks for calling. How can I help you today?",
  },
  alex: {
    name: "Recall Touch",
    style: "friendly, casual tone",
    greeting: "Hi there! Thanks for reaching out. What can I do for you?",
  },
  emma: {
    name: "Recall Touch",
    style: "concise, brief and efficient",
    greeting: "Hi. How can I help?",
  },
};

type Message = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
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
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        system: useDemoPrompt
          ? DEMO_SYSTEM
          : `You are ${a.name}, AI phone agent for ${name}. Style: ${a.style}. THIS IS A PHONE CALL. 1-2 sentences max. Talk like a human on the phone. Ask ONE question at a time. No bullet points, no lists, no markdown. Business: ${name}. Services: ${services}. Hours: ${hours}. Area: ${area}. Pricing: ${pricing}.`,
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
