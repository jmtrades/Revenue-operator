/**
 * Post-call transcript analysis for call_analytics and optimization suggestions.
 * Uses Claude to extract outcome, transfer reason, topics, and unanswered questions.
 */

export type PostCallInsight = {
  call_outcome: string;
  transfer_reason: string | null;
  topics_discussed: string[];
  unanswered_questions: string[];
};

const PROMPT = `Analyze this phone call transcript and extract structured insights for analytics.

Return a JSON object only (no markdown):
{
  "call_outcome": "one of: appointment_booked, lead_captured, info_provided, transferred, message_taken, no_answer, other",
  "transfer_reason": "if the call was transferred, why? e.g. pricing question, specific person requested, complaint. Otherwise null",
  "topics_discussed": ["topic1", "topic2"],
  "unanswered_questions": ["question the caller asked that was not fully answered"]
}

Keep arrays short (max 5 items each). Use null for transfer_reason when no transfer.`;

export async function analyzeTranscriptForAnalytics(transcript: string): Promise<PostCallInsight | null> {
  const text = transcript?.trim() ?? "";
  if (text.length < 80) return null;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: "You output only valid JSON objects. No markdown, no explanation.",
        messages: [
          {
            role: "user",
            content: `${PROMPT}\n\n---\nTranscript:\n${text.slice(0, 15000)}`,
          },
        ],
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
    const raw = data?.content?.[0]?.text?.trim() ?? "{}";
    const parsed = JSON.parse(raw.replace(/^[\s\S]*?\{/, "{").replace(/\}[\s\S]*$/, "}")) as Record<string, unknown>;
    const call_outcome = typeof parsed.call_outcome === "string" ? parsed.call_outcome : "other";
    const transfer_reason =
      parsed.transfer_reason != null && typeof parsed.transfer_reason === "string"
        ? parsed.transfer_reason
        : null;
    const topics_discussed = Array.isArray(parsed.topics_discussed)
      ? (parsed.topics_discussed as string[]).slice(0, 10).filter((t) => typeof t === "string")
      : [];
    const unanswered_questions = Array.isArray(parsed.unanswered_questions)
      ? (parsed.unanswered_questions as string[]).slice(0, 10).filter((q) => typeof q === "string")
      : [];
    return { call_outcome, transfer_reason, topics_discussed, unanswered_questions };
  } catch {
    return null;
  }
}
