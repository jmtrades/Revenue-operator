/**
 * AI fills template slots. Strict JSON contract.
 * Reject invalid, retry once, then fallback.
 */

import OpenAI from "openai";
import { buildMessage, containsRestrictedTopic, type TemplateSlots } from "@/lib/templates";
import { parseAIContract } from "@/lib/ai/contract";

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY required");
  return new OpenAI({ apiKey: key });
}

export interface SlotFillResult {
  slots: TemplateSlots;
  confidence: number;
  message: string;
  intent?: string;
  sentiment?: string;
}

const FALLBACK_MESSAGE = "Thanks for reaching out. Could you tell me a bit more about what you're looking for?";

async function callAI(action: string, context: Record<string, unknown>): Promise<string> {
  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Return strict JSON only. Schema: {"intent":"string","entities":{},"sentiment":"positive|neutral|negative|mixed","confidence":0-1,"recommended_action":"string","slot_values":{"greeting":"","context_line":"","question_1":"","question_2":"","cta":""}}. Fill slot_values for action. No pricing/guarantees/legal/medical advice.`,
      },
      { role: "user", content: `Action: ${action}. Context: ${JSON.stringify(context)}` },
    ],
    response_format: { type: "json_object" },
  });
  return completion.choices[0]?.message?.content ?? "{}";
}

export async function fillSlots(
  action: string,
  context: { leadName?: string; company?: string; lastMessage?: string }
): Promise<SlotFillResult> {
  let raw = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    raw = await callAI(action, context);
    const parsed = parseAIContract(raw);
    if (parsed.success) {
      const { recommended_action, confidence, slot_values, intent, sentiment } = parsed.data;
      const slots = slot_values as TemplateSlots;
      const useAction = recommended_action && ["greeting", "question", "clarifying_question", "follow_up", "booking"].includes(recommended_action) ? recommended_action : action;
      let message = buildMessage(useAction, slots);
      if (containsRestrictedTopic(message)) message = FALLBACK_MESSAGE;
      return { slots, confidence, message, intent, sentiment };
    }
  }
  return { slots: {}, confidence: 0.5, message: FALLBACK_MESSAGE };
}
