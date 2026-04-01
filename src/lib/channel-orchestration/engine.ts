/**
 * Channel Orchestration Engine
 * Intelligently recommends communication channels based on lead behavior and workspace settings.
 * Uses historical response rates, timing patterns, lead preferences, and AI for personalization.
 */

import { getDb } from "@/lib/db/queries";
import OpenAI from "openai";
import { log } from "@/lib/logger";

export interface ChannelRecommendation {
  recommended_channel: "call" | "sms" | "email";
  confidence: number;
  reasoning: string;
  fallback_channel: string | null;
  optimal_time: string | null;
  avoid_channels: string[];
}

export interface SequenceStep {
  channel: "call" | "sms" | "email";
  delay_hours: number;
  message_template: string;
  condition?: string;
}

interface LeadChannelStats {
  call_response_rate?: number;
  sms_response_rate?: number;
  email_response_rate?: number;
  call_preference?: boolean;
  sms_preference?: boolean;
  email_preference?: boolean;
  last_engaged_channel?: string;
  unsubscribed_channels?: string[];
}

interface WorkspaceCommsMode {
  communication_mode?: "aggressive" | "balanced" | "conservative";
}

/**
 * Determine the optimal communication channel for a lead.
 * Analyzes: past response rates, time of day patterns, lead preferences, workspace settings.
 * Returns: channel recommendation with confidence score and fallback strategy.
 */
export async function determineOptimalChannel(
  workspaceId: string,
  leadId: string
): Promise<ChannelRecommendation> {
  const db = getDb();

  // Fetch lead's channel history and preferences
  const { data: lead } = await db
    .from("leads")
    .select(
      `id, phone_number, email,
       call_response_rate, sms_response_rate, email_response_rate,
       call_preference, sms_preference, email_preference,
       last_engaged_channel, unsubscribed_channels`
    )
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!lead) {
    return {
      recommended_channel: "call",
      confidence: 0.5,
      reasoning: "Lead not found; defaulting to call as fallback",
      fallback_channel: "sms",
      optimal_time: null,
      avoid_channels: [],
    };
  }

  const leadStats = lead as LeadChannelStats;

  // Fetch workspace communication preference
  const { data: workspace } = await db
    .from("workspaces")
    .select("communication_mode")
    .eq("id", workspaceId)
    .maybeSingle();

  const workspaceMode = (workspace as WorkspaceCommsMode | null)?.communication_mode ?? "balanced";

  // Build channel viability scores based on lead history
  const channelScores = calculateChannelScores(leadStats, workspaceMode);

  // Determine which channels are available (not unsubscribed)
  const unsubscribed = (leadStats.unsubscribed_channels ?? []) as string[];
  const availableChannels = (["call", "sms", "email"] as const).filter(
    (ch) => !unsubscribed.includes(ch)
  );

  if (availableChannels.length === 0) {
    return {
      recommended_channel: "call",
      confidence: 0.3,
      reasoning: "No available channels; all unsubscribed",
      fallback_channel: null,
      optimal_time: null,
      avoid_channels: ["sms", "email"],
    };
  }

  // Rank available channels by score
  const rankedChannels = availableChannels
    .map((ch) => ({ channel: ch, score: channelScores[ch] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const recommended = rankedChannels[0]!.channel;
  const confidence = Math.min(0.95, Math.max(0.4, rankedChannels[0]!.score));
  const fallback = rankedChannels[1]?.channel ?? null;
  const avoidChannels = rankedChannels.slice(2).map((rc) => rc.channel);

  // Determine optimal time based on historical engagement
  const optimalTime = await getOptimalContactTime(workspaceId, leadId);

  // Build reasoning string
  const reasoning = buildChannelReasoning(leadStats, recommended, channelScores);

  return {
    recommended_channel: recommended,
    confidence,
    reasoning,
    fallback_channel: fallback,
    optimal_time: optimalTime,
    avoid_channels: avoidChannels,
  };
}

/**
 * Build an optimal multi-step follow-up sequence for a lead.
 * Uses AI to generate personalized sequences based on the goal and lead behavior.
 */
export async function buildOptimalSequence(
  workspaceId: string,
  leadId: string,
  goal: "book_appointment" | "reactivate" | "qualify" | "close_deal" | "review_request"
): Promise<SequenceStep[]> {
  const db = getDb();

  // Fetch lead info and history
  const { data: lead } = await db
    .from("leads")
    .select("id, name, email, phone_number, company, last_contact_at, contact_count")
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!lead) {
    return getDefaultSequence(goal);
  }

  // Fetch recent interactions to understand context
  const { data: interactions } = await db
    .from("call_sessions")
    .select("id, outcome, created_at, transcript_text")
    .eq("lead_id", leadId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(3);

  // Fetch workspace settings for tone
  const { data: workspace } = await db
    .from("workspaces")
    .select("communication_mode, industry, business_type")
    .eq("id", workspaceId)
    .maybeSingle();

  // Use AI to generate sequence
  const sequence = await generateAISequence(
    {
      leadId,
      leadName: (lead as { name?: string }).name,
      company: (lead as { company?: string }).company,
      email: (lead as { email?: string }).email,
      phoneNumber: (lead as { phone_number?: string }).phone_number,
      lastContactAt: (lead as { last_contact_at?: string }).last_contact_at,
      contactCount: (lead as { contact_count?: number }).contact_count ?? 0,
    },
    goal,
    (interactions ?? []) as Array<{ outcome?: string; created_at?: string }>,
    (workspace as { communication_mode?: string }).communication_mode ?? "balanced"
  );

  return sequence;
}

// ============ Helper Functions ============

function calculateChannelScores(
  leadStats: LeadChannelStats,
  workspaceMode: string
): Record<string, number> {
  let scores: Record<string, number> = {
    call: 0.5,
    sms: 0.5,
    email: 0.5,
  };

  // Apply historical response rates
  if (leadStats.call_response_rate !== undefined) {
    scores.call = leadStats.call_response_rate;
  }
  if (leadStats.sms_response_rate !== undefined) {
    scores.sms = leadStats.sms_response_rate;
  }
  if (leadStats.email_response_rate !== undefined) {
    scores.email = leadStats.email_response_rate;
  }

  // Apply lead preferences
  if (leadStats.call_preference) scores.call += 0.15;
  if (leadStats.sms_preference) scores.sms += 0.15;
  if (leadStats.email_preference) scores.email += 0.15;

  // Apply last engaged channel boost
  if (leadStats.last_engaged_channel === "call") scores.call += 0.1;
  if (leadStats.last_engaged_channel === "sms") scores.sms += 0.1;
  if (leadStats.last_engaged_channel === "email") scores.email += 0.1;

  // Apply workspace communication mode
  if (workspaceMode === "aggressive") {
    scores.call += 0.2;
    scores.sms += 0.1;
  } else if (workspaceMode === "conservative") {
    scores.email += 0.2;
    scores.sms -= 0.05;
  }
  // balanced mode: no adjustment

  // Normalize scores to 0-1
  Object.keys(scores).forEach((ch) => {
    scores[ch] = Math.min(1, Math.max(0, scores[ch]));
  });

  return scores;
}

async function getOptimalContactTime(workspaceId: string, leadId: string): Promise<string | null> {
  const db = getDb();

  // Query for most common successful contact time
  const { data: successfulContacts } = await db
    .from("call_sessions")
    .select("call_started_at, outcome")
    .eq("lead_id", leadId)
    .eq("workspace_id", workspaceId)
    .eq("outcome", "success")
    .order("call_started_at", { ascending: false })
    .limit(10);

  if (!successfulContacts || successfulContacts.length === 0) {
    // Return default business hours
    return "09:00-17:00";
  }

  // Extract hours from successful calls
  const hours = (successfulContacts as Array<{ call_started_at?: string }>)
    .map((c) => {
      const date = c.call_started_at ? new Date(c.call_started_at) : null;
      return date ? date.getHours() : null;
    })
    .filter((h): h is number => h !== null);

  if (hours.length === 0) {
    return "09:00-17:00";
  }

  // Find most common hour
  const hourCounts = new Map<number, number>();
  hours.forEach((h) => {
    hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
  });

  const mostCommonHour = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 10;
  const startHour = Math.max(8, mostCommonHour - 1);
  const endHour = Math.min(18, mostCommonHour + 3);

  return `${String(startHour).padStart(2, "0")}:00-${String(endHour).padStart(2, "0")}:00`;
}

function buildChannelReasoning(
  leadStats: LeadChannelStats,
  recommended: string,
  scores: Record<string, number>
): string {
  const reasons: string[] = [];

  // Check response rate
  const respRate = leadStats[`${recommended}_response_rate` as keyof LeadChannelStats];
  if (respRate && (respRate as number) > 0.6) {
    reasons.push(`${recommended} has high historical response rate (${Math.round((respRate as number) * 100)}%)`);
  }

  // Check preference
  const preference = leadStats[`${recommended}_preference` as keyof LeadChannelStats];
  if (preference) {
    reasons.push(`Lead has indicated preference for ${recommended}`);
  }

  // Check recency
  if (leadStats.last_engaged_channel === recommended) {
    reasons.push(`Lead most recently engaged via ${recommended}`);
  }

  if (reasons.length === 0) {
    reasons.push(`${recommended} is the best available channel based on analysis`);
  }

  return reasons.join(". ");
}

function getDefaultSequence(
  goal: "book_appointment" | "reactivate" | "qualify" | "close_deal" | "review_request"
): SequenceStep[] {
  const sequences: Record<string, SequenceStep[]> = {
    book_appointment: [
      {
        channel: "call",
        delay_hours: 0,
        message_template: "Initial outreach to book appointment",
      },
      {
        channel: "sms",
        delay_hours: 24,
        message_template: "SMS reminder about availability",
        condition: "no_response_to_call",
      },
      {
        channel: "email",
        delay_hours: 48,
        message_template: "Email with calendar link",
        condition: "no_response_to_sms",
      },
    ],
    reactivate: [
      {
        channel: "email",
        delay_hours: 0,
        message_template: "Win-back email highlighting new value",
      },
      {
        channel: "call",
        delay_hours: 72,
        message_template: "Check-in call after email",
        condition: "no_response_to_email",
      },
      {
        channel: "sms",
        delay_hours: 96,
        message_template: "Final SMS re-engagement attempt",
        condition: "no_response_to_call",
      },
    ],
    qualify: [
      {
        channel: "call",
        delay_hours: 0,
        message_template: "Discovery call to qualify",
      },
      {
        channel: "email",
        delay_hours: 24,
        message_template: "Email with qualification questionnaire",
        condition: "voicemail_left",
      },
      {
        channel: "sms",
        delay_hours: 48,
        message_template: "Brief SMS with next steps",
        condition: "no_response",
      },
    ],
    close_deal: [
      {
        channel: "call",
        delay_hours: 0,
        message_template: "Closing conversation",
      },
      {
        channel: "email",
        delay_hours: 2,
        message_template: "Contract and proposal via email",
      },
      {
        channel: "sms",
        delay_hours: 24,
        message_template: "SMS with signature request",
        condition: "no_signature",
      },
    ],
    review_request: [
      {
        channel: "email",
        delay_hours: 0,
        message_template: "Email with review request and link",
      },
      {
        channel: "sms",
        delay_hours: 24,
        message_template: "SMS reminder to leave review",
        condition: "no_response",
      },
      {
        channel: "call",
        delay_hours: 72,
        message_template: "Personal follow-up for review",
        condition: "no_sms_response",
      },
    ],
  };

  return sequences[goal] ?? sequences.book_appointment!;
}

async function generateAISequence(
  leadInfo: {
    leadId: string;
    leadName?: string;
    company?: string;
    email?: string;
    phoneNumber?: string;
    lastContactAt?: string;
    contactCount: number;
  },
  goal: string,
  interactions: Array<{ outcome?: string; created_at?: string }>,
  communicationMode: string
): Promise<SequenceStep[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Fallback to default sequence if API key not available
    const goalKey = goal as "book_appointment" | "reactivate" | "qualify" | "close_deal" | "review_request";
    return getDefaultSequence(goalKey);
  }

  try {
    const openai = new OpenAI({ apiKey });

    const prompt = `Generate a multi-step communication sequence for a sales lead.

Lead Information:
- Name: ${leadInfo.leadName || "Unknown"}
- Company: ${leadInfo.company || "Unknown"}
- Contact History: ${leadInfo.contactCount} previous contacts
- Last Contact: ${leadInfo.lastContactAt ? new Date(leadInfo.lastContactAt).toLocaleDateString() : "Never"}

Goal: ${goal}
Communication Preference: ${communicationMode}

Recent Interaction Outcomes: ${interactions.length > 0 ? interactions.map((i) => i.outcome).join(", ") : "No interactions"}

Generate a JSON array with 3-4 sequence steps. Each step should have:
- channel: "call", "sms", or "email"
- delay_hours: hours to wait before this step (0, 24, 48, 72, etc.)
- message_template: brief description of the message purpose
- condition: optional condition for when to send (e.g., "no_response", "voicemail_left")

Format: [{"channel":"call","delay_hours":0,"message_template":"...","condition":"..."}]

Rules:
- Vary channels to increase engagement
- Start with highest-probability channel for the goal
- Space steps 24+ hours apart
- Match tone to communication_mode (aggressive: call-first; conservative: email-first)
- Conditions should reflect previous step outcomes`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content ?? "[]";

    // Extract JSON from response (it might be wrapped in markdown code blocks)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      const goalKey = goal as "book_appointment" | "reactivate" | "qualify" | "close_deal" | "review_request";
      return getDefaultSequence(goalKey);
    }

    const parsed = JSON.parse(jsonMatch[0]) as SequenceStep[];
    return parsed.filter((s) => s.channel && s.delay_hours !== undefined);
  } catch (error) {
    log("error", "Error generating AI sequence", { error: error instanceof Error ? error.message : String(error) });
    const goalKey = goal as "book_appointment" | "reactivate" | "qualify" | "close_deal" | "review_request";
    return getDefaultSequence(goalKey);
  }
}
