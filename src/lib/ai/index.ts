/**
 * Revenue Operator - AI Service
 * AI only used for: classification, extraction, summarisation, wording generation.
 * AI never: changes state, decides billing, performs irreversible actions.
 */

import OpenAI from "openai";
import { CONFIDENCE_THRESHOLDS } from "@/lib/types";
import type { LeadState } from "@/lib/types";

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is required for AI features");
  }
  return new OpenAI({ apiKey: key });
}

export interface ClassifyIntentResult {
  intent: string;
  confidence: number;
  mappedAction: string | null;
  extraction: Record<string, unknown>;
}

export interface GenerateResponseResult {
  content: string;
  confidence: number;
  actionUsed: string;
}

/**
 * Classify inbound message intent.
 * Maps to allowed action if possible.
 */
export async function classifyIntent(
  content: string,
  allowedActions: string[]
): Promise<ClassifyIntentResult> {
  if (allowedActions.length === 0) {
    return {
      intent: "unknown",
      confidence: 0,
      mappedAction: null,
      extraction: {},
    };
  }

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a classifier. Classify the user message intent and map to ONE of these allowed actions: ${allowedActions.join(", ")}. Respond with JSON: {"intent": "string", "confidence": 0-1, "mappedAction": "one of allowed or null", "extraction": {}}`,
      },
      { role: "user", content },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as ClassifyIntentResult;
  parsed.confidence = Math.min(1, Math.max(0, parsed.confidence ?? 0));
  return parsed;
}

/**
 * Generate response wording for an allowed action.
 * Returns content + confidence score.
 */
export async function generateResponse(
  action: string,
  context: {
    leadName?: string;
    company?: string;
    lastMessage?: string;
    state: LeadState;
  }
): Promise<GenerateResponseResult> {
  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You generate brief, professional sales messages. Action: ${action}. Be concise. Never promise anything you can't deliver. Never impersonate a human - you can disclose you're AI if asked.`,
      },
      {
        role: "user",
        content: `Generate a message for action "${action}". Context: ${JSON.stringify(context)}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  // Use a simple heuristic for confidence - in production, use a separate classifier
  const confidence = 0.78;

  return {
    content: content.trim(),
    confidence,
    actionUsed: action,
  };
}

/**
 * Confidence gate: determine if message can be sent automatically.
 * >0.85: auto send
 * 0.60-0.85: ask approval
 * <0.60: escalate human
 */
export function getConfidenceAction(
  confidence: number
): "auto_send" | "need_approval" | "escalate" {
  if (confidence >= CONFIDENCE_THRESHOLDS.AUTO_SEND) return "auto_send";
  if (confidence >= CONFIDENCE_THRESHOLDS.NEED_APPROVAL) return "need_approval";
  return "escalate";
}
