import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { url?: string } = {};
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = body.url?.trim() ?? "";
  if (!url || !url.startsWith("http")) {
    return Response.json(
      { error: "Enter a valid URL starting with http" },
      { status: 400 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { error: "AI service not configured" },
      { status: 503 },
    );
  }

  try {
    const pageRes = await fetch(url);
    if (!pageRes.ok) {
      return Response.json(
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
              'You are helping configure a business phone agent. From the following website text, extract 5-10 clear FAQ-style pairs that would help the agent answer callers. Respond ONLY with a valid JSON array of objects like [{"question": "...", "answer": "..."}]. Do not include any extra text.\n\n' +
              text,
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const bodyText = await claudeRes.text().catch(() => "");
      return Response.json(
        {
          error: `AI request failed (HTTP ${claudeRes.status})`,
          details: bodyText.slice(0, 300),
        },
        { status: 502 },
      );
    }

    const ai: { content?: Array<{ type: string; text?: string }> } =
      await claudeRes.json();
    const raw = ai.content?.[0]?.text ?? "[]";
    const cleaned = String(raw).replace(/```json|```/g, "").trim();
    let entries: Array<{ question: string; answer: string }> = [];
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        entries = parsed
          .map((e: { question?: unknown; answer?: unknown }) => ({
            question: String(e.question ?? "").trim(),
            answer: String(e.answer ?? "").trim(),
          }))
          .filter((e) => e.question && e.answer);
      }
    } catch {
      return Response.json(
        { error: "AI returned invalid JSON format" },
        { status: 500 },
      );
    }

    return Response.json({ entries });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
    return Response.json(
      { error: `Failed to import URL: ${message}` },
      { status: 500 },
    );
  }
}

