/**
 * Call dialogue graph: intro -> situation -> impact -> qualification -> routing
 * AI never improvises outside nodes. If uncertain, route to booking.
 */

import type { CallNode } from "@/lib/types";

export const CALL_NODES: CallNode[] = ["intro", "situation", "impact", "qualification", "routing"];

export type NodeTransition = {
  from: CallNode;
  to: CallNode;
  condition?: "continue" | "escalate" | "book" | "end";
};

const TRANSITIONS: NodeTransition[] = [
  { from: "intro", to: "situation", condition: "continue" },
  { from: "situation", to: "impact", condition: "continue" },
  { from: "impact", to: "qualification", condition: "continue" },
  { from: "qualification", to: "routing", condition: "continue" },
  { from: "routing", to: "intro", condition: "book" },
];

export interface NodePrompt {
  node: CallNode;
  systemPrompt: string;
  userPromptTemplate: string;
}

export const CONSENT_PROMPT =
  "This call may be recorded or transcribed to help schedule you. Is that okay?";

export const NODE_PROMPTS: Record<CallNode, NodePrompt> = {
  intro: {
    node: "intro",
    systemPrompt: "First ask consent: 'This call may be recorded or transcribed to help schedule you — is that okay?' If no: end politely, do not store transcript. Be warm, concise. Do not discuss pricing or make promises.",
    userPromptTemplate: "Lead: {context}. First ask consent. Respond with 1-2 sentences. Extract: name, company if mentioned.",
  },
  situation: {
    node: "situation",
    systemPrompt: "Understand their situation. Ask one clarifying question. No pricing.",
    userPromptTemplate: "Transcript: {transcript}. What do they need? Ask one question.",
  },
  impact: {
    node: "impact",
    systemPrompt: "Explore impact of their problem. One question only.",
    userPromptTemplate: "Transcript: {transcript}. Ask about impact.",
  },
  qualification: {
    node: "qualification",
    systemPrompt: "Qualify readiness. Timeline, decision maker. One question.",
    userPromptTemplate: "Transcript: {transcript}. Qualify readiness.",
  },
  routing: {
    node: "routing",
    systemPrompt: "Route: book human call, or send SMS follow-up. Never close deal or quote price.",
    userPromptTemplate: "Transcript: {transcript}. Recommend: book_call | sms_followup. Reason:",
  },
};

export function getNextNode(current: CallNode, condition: string): CallNode | "end" {
  if (condition === "end") return "end";
  const t = TRANSITIONS.find((x) => x.from === current && x.condition === condition);
  return t?.to ?? "routing";
}

export interface CallSummary {
  readiness_score: number;
  recommended_next: "book_call" | "sms_followup";
  summary: string;
}

export const ESCALATION_TRIGGERS = [
  "anger",
  "confusion repeated",
  "unsupported question",
  "pricing negotiation request",
] as const;
