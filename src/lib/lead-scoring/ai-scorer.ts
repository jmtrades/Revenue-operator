/**
 * Lead Scoring Engine - AI-powered comprehensive lead scoring
 * Analyzes engagement patterns, sentiment, and buying intent using Claude API
 */

import OpenAI from "openai";
import { getDb } from "@/lib/db/queries";

export interface AILeadScoreSignal {
  factor: string;
  impact: number;
  description: string;
}

export interface AILeadScore {
  ai_score: number;
  confidence: number;
  signals: AILeadScoreSignal[];
  recommended_action: string;
  best_time_to_contact: string | null;
  preferred_channel: "call" | "sms" | "email" | null;
  buying_intent: "hot" | "warm" | "cold" | "dead";
  predicted_close_probability: number;
}

interface LeadData {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  state: string;
  last_activity_at: string | null;
  opt_out: boolean | null;
  metadata: Record<string, unknown> | null;
}

interface CallData {
  id: string;
  started_at: string | null;
  transcript_text: string | null;
  outcome: string | null;
}

interface MessageData {
  id: string;
  direction: string;
  sent_at: string | null;
  body: string | null;
}

interface AppointmentData {
  id: string;
  start_time: string | null;
  status: string;
}

interface CampaignData {
  id: string;
  name: string | null;
  enrolled_at: string | null;
}

interface DealData {
  id: string;
  value_cents: number | null;
  status: string;
  created_at: string | null;
}

interface AggregatedLeadData {
  lead: LeadData;
  calls: CallData[];
  messages: MessageData[];
  appointments: AppointmentData[];
  campaigns: CampaignData[];
  deals: DealData[];
  call_count: number;
  message_count: number;
  appointment_count: number;
  total_deal_value: number;
  days_since_creation: number;
  days_since_last_activity: number;
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for AI lead scoring");
  }
  return new OpenAI({ apiKey });
}

async function aggregateLeadData(
  workspaceId: string,
  leadId: string
): Promise<AggregatedLeadData> {
  const db = getDb();

  const { data: lead, error: leadError } = await db
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (leadError || !lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }

  const { data: calls } = await db
    .from("call_sessions")
    .select("id, started_at, transcript_text, outcome")
    .eq("lead_id", leadId)
    .eq("workspace_id", workspaceId)
    .order("started_at", { ascending: false })
    .limit(10);

  const { data: messages } = await db
    .from("messages")
    .select("id, direction, sent_at, body")
    .eq("lead_id", leadId)
    .eq("workspace_id", workspaceId)
    .order("sent_at", { ascending: false })
    .limit(20);

  const { data: appointments } = await db
    .from("appointments")
    .select("id, start_time, status")
    .eq("lead_id", leadId)
    .eq("workspace_id", workspaceId)
    .order("start_time", { ascending: false });

  const { data: campaigns } = await db
    .from("campaign_enrollments")
    .select("id, campaign_id, enrolled_at")
    .eq("lead_id", leadId)
    .eq("workspace_id", workspaceId)
    .order("enrolled_at", { ascending: false });

  const { data: campaignDetails } =
    campaigns && campaigns.length > 0
      ? await db
          .from("campaigns")
          .select("id, name")
          .in(
            "id",
            campaigns.map((c: { campaign_id: string }) => c.campaign_id)
          )
      : { data: [] };

  const campaignMap = (campaignDetails ?? []).reduce(
    (acc: Record<string, string>, c: { id: string; name: string | null }) => {
      acc[c.id] = c.name ?? "Unknown";
      return acc;
    },
    {}
  );

  const enrichedCampaigns = (campaigns ?? []).map(
    (c: {
      id: string;
      campaign_id: string;
      enrolled_at: string | null;
    }) => ({
      id: c.id,
      name: campaignMap[c.campaign_id],
      enrolled_at: c.enrolled_at,
    })
  );

  const { data: deals } = await db
    .from("deals")
    .select("id, value_cents, status, created_at")
    .eq("lead_id", leadId)
    .eq("workspace_id", workspaceId);

  const createdAt = (lead as { created_at?: string }).created_at
    ? new Date((lead as { created_at: string }).created_at).getTime()
    : Date.now();
  const lastActivityAt = (lead as { last_activity_at?: string | null })
    .last_activity_at
    ? new Date(
        (lead as { last_activity_at: string }).last_activity_at
      ).getTime()
    : createdAt;

  const now = Date.now();
  const daysActive = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
  const daysSinceLastActivity = Math.floor(
    (now - lastActivityAt) / (1000 * 60 * 60 * 24)
  );

  const totalDealValue = (deals ?? []).reduce(
    (sum: number, d: { value_cents?: number | null }) =>
      sum + ((d.value_cents ?? 0) as number),
    0
  );

  return {
    lead: lead as LeadData,
    calls: (calls ?? []) as CallData[],
    messages: (messages ?? []) as MessageData[],
    appointments: (appointments ?? []) as AppointmentData[],
    campaigns: enrichedCampaigns as CampaignData[],
    deals: (deals ?? []) as DealData[],
    call_count: calls?.length ?? 0,
    message_count: messages?.length ?? 0,
    appointment_count: appointments?.length ?? 0,
    total_deal_value: totalDealValue,
    days_since_creation: daysActive,
    days_since_last_activity: daysSinceLastActivity,
  };
}

function buildScoringPrompt(data: AggregatedLeadData): string {
  const { lead, calls, messages, appointments, campaigns, deals } = data;

  const recentCalls = calls.slice(0, 3);
  const callTranscripts = recentCalls
    .filter((c) => c.transcript_text)
    .map(
      (c) =>
        `Call on ${c.started_at}: ${c.transcript_text?.substring(0, 500)}`
    )
    .join("\n\n");

  const recentMessages = messages.slice(0, 5);
  const messageHistory = recentMessages
    .map(
      (m) =>
        `${m.direction} (${m.sent_at}): ${m.body?.substring(0, 200)}`
    )
    .join("\n");

  const dealInfo =
    deals.length > 0
      ? `Active Deals: ${deals.map((d) => `${d.status}: $${((d.value_cents ?? 0) / 100).toFixed(2)}`).join(", ")}`
      : "No active deals";

  const campaignInfo =
    campaigns.length > 0
      ? `Enrolled Campaigns: ${campaigns.map((c) => c.name).join(", ")}`
      : "Not enrolled in any campaigns";

  return `
You are an expert B2B sales lead scoring AI. Analyze the following lead data and provide a comprehensive scoring and recommendations.

LEAD PROFILE:
- Name: ${lead.name ?? "Unknown"}
- Company: ${lead.company ?? "Unknown"}
- Email: ${lead.email ?? "Not provided"}
- Phone: ${lead.phone ?? "Not provided"}
- Current State: ${lead.state}
- Days Since Creation: ${data.days_since_creation}
- Days Since Last Activity: ${data.days_since_last_activity}
- Opted Out: ${lead.opt_out ? "Yes" : "No"}

ENGAGEMENT METRICS:
- Total Calls: ${data.call_count}
- Total Messages: ${data.message_count}
- Appointments Scheduled: ${data.appointment_count}
- Total Deal Value: $${(data.total_deal_value / 100).toFixed(2)}

CALL TRANSCRIPTS (Most Recent):
${callTranscripts || "No call transcripts available"}

MESSAGE HISTORY (Recent):
${messageHistory || "No messages found"}

APPOINTMENT HISTORY:
${appointments.map((a) => `- Scheduled: ${a.start_time}, Status: ${a.status}`).join("\n") || "No appointments"}

${campaignInfo}

${dealInfo}

Based on this data, provide your analysis in the following JSON format:
{
  "ai_score": <number 0-100>,
  "confidence": <number 0-1>,
  "signals": [
    {
      "factor": "<engagement/sentiment/intent/recency/deal_value/etc>",
      "impact": <number -1 to 1>,
      "description": "<brief explanation>"
    }
  ],
  "recommended_action": "<next recommended sales action>",
  "best_time_to_contact": "<specific time/day or null>",
  "preferred_channel": "<'call' | 'sms' | 'email' | null>",
  "buying_intent": "<'hot' | 'warm' | 'cold' | 'dead'>",
  "predicted_close_probability": <number 0-1>
}

Focus on:
1. Engagement patterns (call frequency, message responsiveness)
2. Sentiment from transcripts (positive/negative indicators)
3. Response speed and consistency
4. Channel preferences (which channel gets best response)
5. Deal progression and value
6. Recent activity levels
7. Campaign performance
8. Risk factors (long silence, opt-out status)

Be conservative with scores - this is for B2B sales where most leads are "warm" initially.
`;
}

function fallbackScore(): AILeadScore {
  return {
    ai_score: 50,
    confidence: 0.4,
    signals: [
      {
        factor: "fallback",
        impact: 0,
        description:
          "Unable to calculate AI score due to service unavailability. Using default scoring.",
      },
    ],
    recommended_action: "Manual review required",
    best_time_to_contact: null,
    preferred_channel: null,
    buying_intent: "cold",
    predicted_close_probability: 0.3,
  };
}

export async function scoreLeadWithAI(
  workspaceId: string,
  leadId: string
): Promise<AILeadScore> {
  const client = getOpenAIClient();

  const data = await aggregateLeadData(workspaceId, leadId);
  const prompt = buildScoringPrompt(data);

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
  });

  const responseText = completion.choices[0]?.message?.content ?? "";

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn(
      `[AI Scorer] Failed to parse response for lead ${leadId}, using fallback`
    );
    return fallbackScore();
  }

  const parsed = JSON.parse(jsonMatch[0]) as Partial<AILeadScore>;

  const score: AILeadScore = {
    ai_score: Math.min(100, Math.max(0, parsed.ai_score ?? 50)),
    confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.5)),
    signals: (parsed.signals ?? []).slice(0, 10),
    recommended_action:
      parsed.recommended_action ?? "Review lead status manually",
    best_time_to_contact: parsed.best_time_to_contact ?? null,
    preferred_channel: parsed.preferred_channel ?? null,
    buying_intent: (
      ["hot", "warm", "cold", "dead"] as const
    ).includes(parsed.buying_intent as any)
      ? (parsed.buying_intent as any)
      : "cold",
    predicted_close_probability: Math.min(
      1,
      Math.max(0, parsed.predicted_close_probability ?? 0.3)
    ),
  };

  return score;
}

export async function saveLeadScore(
  workspaceId: string,
  leadId: string,
  score: AILeadScore
): Promise<void> {
  const db = getDb();

  await db
    .from("leads")
    .update({
      ai_score: score.ai_score,
      ai_score_updated_at: new Date().toISOString(),
      metadata: {
        ai_score_data: {
          confidence: score.confidence,
          signals: score.signals,
          recommended_action: score.recommended_action,
          best_time_to_contact: score.best_time_to_contact,
          preferred_channel: score.preferred_channel,
          buying_intent: score.buying_intent,
          predicted_close_probability: score.predicted_close_probability,
          updated_at: new Date().toISOString(),
        },
      },
    })
    .eq("id", leadId)
    .eq("workspace_id", workspaceId);
}
