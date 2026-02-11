/**
 * Closer packet: pre-call brief artifact
 */

import { getDb } from "@/lib/db/queries";
import { predictDealOutcome } from "./deal-prediction";

export interface CloserPacket {
  lead_context: { name: string; email: string; company: string; state: string };
  pain_summary: string;
  urgency_signals: string[];
  authority_indicators: string[];
  likely_objections: string[];
  recommended_strategy: string;
  suggested_questions: string[];
}

export async function generateCloserPacket(leadId: string, dealId?: string): Promise<CloserPacket> {
  const db = getDb();
  const { data: lead } = await db.from("leads").select("name, email, company, state").eq("id", leadId).single();
  if (!lead) {
    return {
      lead_context: { name: "", email: "", company: "", state: "" },
      pain_summary: "No lead data.",
      urgency_signals: [],
      authority_indicators: [],
      likely_objections: [],
      recommended_strategy: "Gather context first.",
      suggested_questions: ["What prompted you to reach out?", "What does success look like for you?", "What's the main challenge you're facing?"],
    };
  }

  const l = lead as { name: string; email: string; company: string; state: string };

  const { data: convs } = await db.from("conversations").select("id").eq("lead_id", leadId);
  const convIds = (convs ?? []).map((c: { id: string }) => c.id);
  const { data: msgs } = convIds.length
    ? await db.from("messages").select("role, content").in("conversation_id", convIds).order("created_at", { ascending: false }).limit(10)
    : { data: [] };

  const messages = (msgs ?? []) as Array<{ role: string; content: string }>;
  const userMsgs = messages.filter((m) => m.role === "user").map((m) => m.content);
  const painSummary = userMsgs.length > 0 ? userMsgs.slice(0, 3).join(" ") : "No conversation history.";

  const urgencySignals: string[] = [];
  const urgencyWords = ["asap", "urgent", "soon", "quick", "immediately"];
  for (const m of userMsgs) {
    const lower = m.toLowerCase();
    for (const w of urgencyWords) {
      if (lower.includes(w)) urgencySignals.push(w);
    }
  }

  const authorityIndicators: string[] = [];
  if (l.company) authorityIndicators.push(`Company: ${l.company}`);

  let prediction = 0.5;
  if (dealId) {
    const pred = await predictDealOutcome(dealId);
    prediction = pred.probability;
  }

  const likelyObjections = prediction < 0.4 ? ["Timing", "Budget", "Need more info"] : ["Scheduling"];

  const recommendedStrategy =
    prediction >= 0.55
      ? "Direct close—high intent. Move to booking."
      : prediction >= 0.25
        ? "Qualify first—discover needs, then offer call."
        : "Nurture—build trust before asking for commitment.";

  const suggestedQuestions = [
    "What's the main challenge you're trying to solve?",
    "Who else is involved in this decision?",
    "What would need to happen for you to move forward this week?",
  ];

  return {
    lead_context: { name: l.name ?? "", email: l.email ?? "", company: l.company ?? "", state: l.state ?? "" },
    pain_summary: painSummary.slice(0, 500),
    urgency_signals: [...new Set(urgencySignals)],
    authority_indicators: authorityIndicators,
    likely_objections: likelyObjections,
    recommended_strategy: recommendedStrategy,
    suggested_questions: suggestedQuestions,
  };
}
