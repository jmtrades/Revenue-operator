import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { url?: string } = {};
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = body.url?.trim() ?? "";
  if (!url || !url.startsWith("http")) {
    return NextResponse.json(
      { error: "Enter a valid URL starting with http" },
      { status: 400 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI service not configured" },
      { status: 503 },
    );
  }

  try {
    const pageRes = await fetch(url);
    if (!pageRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL (HTTP ${pageRes.status})` },
        { status: 502 },
      );
    }
    const html = await pageRes.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 12000);

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content:
              'You are helping configure a business phone agent. From the following website text, extract a concise summary of the business in this JSON shape:\n{"businessName":"...", "industry":"...", "services":["..."], "location":"...", "targetAudience":"...", "faq":[{"question":"...","answer":"..."}]}\n\nOnly respond with valid JSON, no backticks or commentary. Website text:\n\n' +
              text,
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const bodyText = await claudeRes.text().catch(() => "");
      return NextResponse.json(
        {
          error: `AI request failed (HTTP ${claudeRes.status})`,
          details: bodyText.slice(0, 300),
        },
        { status: 502 },
      );
    }

    const ai: { content?: Array<{ type: string; text?: string }> } =
      await claudeRes.json();
    const raw = ai.content?.[0]?.text ?? "{}";
    const cleaned = String(raw).replace(/```json|```/g, "").trim();

    let parsed: {
      businessName?: unknown;
      industry?: unknown;
      services?: unknown;
      location?: unknown;
      targetAudience?: unknown;
      faq?: unknown;
    } = {};

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON format" },
        { status: 500 },
      );
    }

    const businessName = String(parsed.businessName ?? "").trim();
    const industry = String(parsed.industry ?? "").trim();
    const location = String(parsed.location ?? "").trim();
    const targetAudience = String(parsed.targetAudience ?? "").trim();

    const servicesArrayRaw = Array.isArray(parsed.services)
      ? parsed.services
      : typeof parsed.services === "string"
        ? parsed.services.split(/[,/]/g)
        : [];
    const services = servicesArrayRaw
      .map((s) => String(s ?? "").trim())
      .filter(Boolean);

    const faqRaw: Array<{ question?: unknown; answer?: unknown }> = Array.isArray(
      parsed.faq,
    )
      ? parsed.faq
      : [];
    const faq = faqRaw
      .map((entry) => {
        const question = String(entry?.question ?? "").trim();
        const answer = String(entry?.answer ?? "").trim();
        if (!question || !answer) return null;
        return { question, answer };
      })
      .filter((e): e is { question: string; answer: string } => !!e);

    if (!businessName && !industry && services.length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not extract clear business details from that page. Try your main homepage URL.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      businessName,
      industry,
      services,
      location,
      targetAudience,
      faq,
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
    return NextResponse.json(
      { error: `Failed to extract business details: ${message}` },
      { status: 500 },
    );
  }
}

