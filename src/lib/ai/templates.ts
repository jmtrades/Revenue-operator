/**
 * AI fills template slots. Strict JSON contract.
 * Reject invalid, retry once, then fallback.
 */

import OpenAI from "openai";
import { buildMessage, containsRestrictedTopic, type TemplateSlots } from "@/lib/templates";
import { parseAIContract } from "@/lib/ai/contract";
import { checkDrift, logDriftAlert } from "@/lib/message-drift";
import { getMemoryContextForReasoning } from "@/lib/business-memory";
import { getLeadMemoryContextForReasoning } from "@/lib/lead-memory";

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
  risk_flags?: string[];
  explanation?: string;
}


const STYLE_INSTRUCTIONS: Record<string, string> = {
  direct: "Tone: short, clear, neutral. No hedging. No persuasion. Minimal filler.",
  consultative: "Tone: neutral, professional. Ask one question. No emotional inference.",
  high_urgency: "Tone: neutral, clear. Emphasise next steps only. No urgency pressure.",
};

async function callAI(action: string, context: Record<string, unknown>): Promise<string> {
  const openai = getOpenAI();
  let memoryContext = "";
  if (context.workspaceId && typeof context.workspaceId === "string") {
    memoryContext = await getMemoryContextForReasoning(context.workspaceId);
  }
  if (context.leadId && typeof context.leadId === "string") {
    const leadMemory = await getLeadMemoryContextForReasoning(context.leadId);
    if (leadMemory) memoryContext = memoryContext ? `${memoryContext}. ${leadMemory}` : leadMemory;
  }
  const style = (context.communication_style as string) ?? "consultative";
  const styleInstruction = STYLE_INSTRUCTIONS[style] ?? STYLE_INSTRUCTIONS.consultative;
  const systemContent = `Return strict JSON only. Schema: {"intent":"string","entities":{},"sentiment":"positive|neutral|negative|mixed","confidence":0-1,"risk_flags":[],"recommended_action":"string","explanation":"brief reason","slot_values":{"greeting":"","context_line":"","question_1":"","question_2":"","cta":""}}. Fill slot_values for action. ${styleInstruction}. risk_flags: anger, confusion_repeated, unsupported_question, pricing_negotiation, opt_out_signal. No pricing/guarantees/legal/medical advice.${memoryContext ? ` ${memoryContext}` : ""}`;
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: `Action: ${action}. Context: ${JSON.stringify(context)}` },
    ],
    response_format: { type: "json_object" },
  });
  return completion.choices[0]?.message?.content ?? "{}";
}

export async function fillSlots(
  action: string,
  context: {
    leadName?: string;
    company?: string;
    lastMessage?: string;
    workspaceId?: string;
    leadId?: string;
    communication_style?: "direct" | "consultative" | "high_urgency";
  }
): Promise<SlotFillResult> {
  let raw = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    raw = await callAI(action, context);
    const parsed = parseAIContract(raw);
    if (parsed.success) {
      const { recommended_action, confidence, slot_values, intent, sentiment, risk_flags, explanation } = parsed.data;
      const slots = slot_values as TemplateSlots;
      const useAction = recommended_action && ["greeting", "question", "clarifying_question", "follow_up", "booking", "call_invite"].includes(recommended_action) ? recommended_action : action;
      let message = buildMessage(useAction, slots);
      if (containsRestrictedTopic(message)) message = buildMessage("clarifying_question", { greeting: "Thanks for reaching out.", question_1: "Could you tell me a bit more about what you're looking for?" });
      const { driftScore, useSafeMode } = checkDrift(message, useAction);
      if (useSafeMode) {
        if (context.workspaceId) {
          await logDriftAlert(context.workspaceId, context.leadId ?? null, driftScore, message);
        }
        message = buildMessage("clarifying_question", { greeting: "Thanks for reaching out.", question_1: "Could you tell me a bit more about what you're looking for?" });
      }
      return { slots, confidence, message, intent, sentiment, risk_flags: risk_flags ?? [], explanation };
    }
  }
  return { slots: {}, confidence: 0.5, message: buildMessage("clarifying_question", { greeting: "Thanks for reaching out.", question_1: "Could you tell me a bit more about what you're looking for?" }) };
}
