/**
 * Conversation Forensics
 * After loss, generate explanation of why deal failed.
 */

import { getDb } from "@/lib/db/queries";
import OpenAI from "openai";

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY required");
  return new OpenAI({ apiKey: key });
}

export interface ForensicsResult {
  lead_id: string;
  deal_id: string;
  summary: string;
  likely_causes: string[];
  recommendations: string[];
  generated_at: string;
}

export async function generateForensics(leadId: string, dealId: string): Promise<ForensicsResult> {
  const db = getDb();
  const { data: convs } = await db.from("conversations").select("id").eq("lead_id", leadId);
  const convIds = (convs ?? []).map((c: { id: string }) => c.id);
  if (convIds.length === 0) {
    return {
      lead_id: leadId,
      deal_id: dealId,
      summary: "No conversation data available.",
      likely_causes: [],
      recommendations: [],
      generated_at: new Date().toISOString(),
    };
  }
  const { data: messages } = await db
    .from("messages")
    .select("role, content, created_at, metadata")
    .in("conversation_id", convIds);
  const conv = (messages ?? []).map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join("\n");

  const { data: lead } = await db.from("leads").select("state, company").eq("id", leadId).maybeSingle();
  const state = (lead as { state?: string })?.state ?? "LOST";

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Return JSON only: {summary:string, likely_causes:string[], recommendations:string[]}. Be concise. No pricing/guarantees.",
      },
      {
        role: "user",
        content: `Deal lost. Lead state: ${state}. Conversation:\n${conv.slice(0, 3000)}\n\nWhy did this deal likely fail? Provide summary, causes, recommendations.`,
      },
    ],
    response_format: { type: "json_object" },
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: { summary?: string; likely_causes?: string[]; recommendations?: string[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { summary: "Unable to generate forensics.", likely_causes: [], recommendations: [] };
  }
  return {
    lead_id: leadId,
    deal_id: dealId,
    summary: parsed.summary ?? "No summary available.",
    likely_causes: parsed.likely_causes ?? [],
    recommendations: parsed.recommendations ?? [],
    generated_at: new Date().toISOString(),
  };
}
