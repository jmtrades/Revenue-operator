export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

const AGENTS: Record<string, { name: string; style: string; greeting: string }> = {
  sarah: {
    name: "Sarah",
    style: "warm and friendly — like a helpful neighbor. Uses \"hi there\", \"no worries\", \"absolutely\"",
    greeting: "Hi there! Thanks for calling Riverside Plumbing. This is Sarah — what can I help you with?",
  },
  alex: {
    name: "Alex",
    style: "calm and professional — efficient but not cold. Uses \"certainly\", \"of course\", \"happy to help\"",
    greeting: "Good afternoon, Riverside Plumbing. This is Alex speaking. How can I help you today?",
  },
  emma: {
    name: "Emma",
    style: "upbeat and energetic — enthusiastic without being annoying. Uses \"hey!\", \"awesome\", \"sounds great\"",
    greeting: "Hey! Thanks for calling Riverside Plumbing! I'm Emma — what's going on?",
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
    const biz = body?.business ?? {
      name: "Riverside Plumbing",
      services: "plumbing repair, drain cleaning, water heater, emergency, remodels",
      hours: "Mon-Fri 8-6, Sat 9-2, emergency 24/7",
      area: "Portland metro, 30mi radius",
      pricing: "Free estimates",
    };

    const name = (biz.name ?? "Riverside Plumbing").trim() || "Riverside Plumbing";
    const services = (biz.services ?? "plumbing repair, drain cleaning, water heater, emergency, remodels").trim();
    const hours = (biz.hours ?? "Mon-Fri 8-6, Sat 9-2, emergency 24/7").trim();
    const area = (biz.area ?? "Portland metro, 30mi radius").trim();
    const pricing = (biz.pricing ?? "Free estimates").trim();

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
        system: `You are ${a.name}, AI phone receptionist for ${name}. Style: ${a.style}.

THIS IS A PHONE CALL. Rules:
- 1-2 sentences max. Talk like a human on the phone. Use contractions.
- Ask ONE question at a time. Never list multiple questions.
- No bullet points, no lists, no markdown, no emojis.
- Collect: name, what they need, when they're available. Then confirm booking.
- For emergencies (flooding, burst pipe, gas): "That sounds urgent — what's your address? I'll get someone out right away."
- If asked about pricing: "We do free estimates. Want me to get one scheduled?"
- Only if directly asked if you're AI: "I'm an AI assistant for ${name}, but I handle everything a receptionist would."
- Business: ${name}. Services: ${services}. Hours: ${hours}. Area: ${area}.`,
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
