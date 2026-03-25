/**
 * Call understanding engine: structured JSON output only
 */

import OpenAI from "openai";

const OUTCOMES = [
  "hot_delay",
  "info_gap",
  "authority_gap",
  "trust_gap",
  "ghost_risk",
  "payment_hesitation",
  "not_ready",
  "lost_politely",
  "ready_to_buy",
] as const;

const NEXT_ACTIONS = [
  "send_recap",
  "send_proof",
  "book_joint_call",
  "clarify_timeline",
  "remove_payment_friction",
  "nurture",
  "reactivation_schedule",
] as const;

export interface CallAnalysis {
  outcome: (typeof OUTCOMES)[number];
  buyer_signals: {
    pain_points: string[];
    urgency: string;
    authority: string;
    budget_signals: string;
    trust_level: string;
  };
  objections: Array<{ type: string; quote: string; severity: string }>;
  commitments: Array<{ type: string; quote: string }>;
  risks: Array<{ type: string; severity: string; explanation: string }>;
  next_best_action: (typeof NEXT_ACTIONS)[number];
  followup_plan: Array<{ when_hours_from_now: number; action_type: string; template_key: string }>;
  summary: string;
  confidence: number;
}

const FALLBACK_ANALYSIS: CallAnalysis = {
  outcome: "info_gap",
  buyer_signals: { pain_points: [], urgency: "unknown", authority: "unknown", budget_signals: "unknown", trust_level: "unknown" },
  objections: [],
  commitments: [],
  risks: [],
  next_best_action: "send_recap",
  followup_plan: [{ when_hours_from_now: 2, action_type: "send_recap", template_key: "recap" }, { when_hours_from_now: 24, action_type: "book_joint_call", template_key: "follow_up" }],
  summary: "Transcript missing or low quality. Default: send recap and book follow-up.",
  confidence: 0.3,
};

export async function analyzeClosingCall(
  transcript: string,
  context?: { leadName?: string; company?: string }
): Promise<CallAnalysis> {
  const text = transcript?.trim() ?? "";
  if (text.length < 50) return FALLBACK_ANALYSIS;

  const key = process.env.OPENAI_API_KEY;
  if (!key) return FALLBACK_ANALYSIS;

  const openai = new OpenAI({ apiKey: key });
  const schema = `{
    "outcome": "one of: ${OUTCOMES.join(", ")}",
    "buyer_signals": {"pain_points": [], "urgency": "string", "authority": "string", "budget_signals": "string", "trust_level": "string"},
    "objections": [{"type": "string", "quote": "string", "severity": "low|medium|high"}],
    "commitments": [{"type": "string", "quote": "string"}],
    "risks": [{"type": "string", "severity": "low|medium|high", "explanation": "string"}],
    "next_best_action": "one of: ${NEXT_ACTIONS.join(", ")}",
    "followup_plan": [{"when_hours_from_now": number, "action_type": "string", "template_key": "string"}],
    "summary": "short string",
    "confidence": 0-1
  }`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Return STRICT JSON only. Schema: ${schema}. Never invent details. If unknown, mark unknown.`,
        },
        {
          role: "user",
          content: `Transcript:\n${text.slice(0, 12000)}\n\nContext: ${JSON.stringify(context ?? {})}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<CallAnalysis>;
    const outcome = OUTCOMES.includes(parsed.outcome as (typeof OUTCOMES)[number]) ? parsed.outcome : "info_gap";
    const nextAction = NEXT_ACTIONS.includes(parsed.next_best_action as (typeof NEXT_ACTIONS)[number]) ? parsed.next_best_action : "send_recap";
    return {
      outcome: outcome as CallAnalysis["outcome"],
      buyer_signals: parsed.buyer_signals ?? FALLBACK_ANALYSIS.buyer_signals,
      objections: Array.isArray(parsed.objections) ? parsed.objections : [],
      commitments: Array.isArray(parsed.commitments) ? parsed.commitments : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      next_best_action: nextAction as CallAnalysis["next_best_action"],
      followup_plan: Array.isArray(parsed.followup_plan) && parsed.followup_plan.length > 0 ? parsed.followup_plan : FALLBACK_ANALYSIS.followup_plan,
      summary: typeof parsed.summary === "string" ? parsed.summary : FALLBACK_ANALYSIS.summary,
      confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
    };
  } catch {
    return FALLBACK_ANALYSIS;
  }
}
