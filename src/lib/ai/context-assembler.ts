/**
 * Smart Context Assembler - Builds perfect context for each interaction
 * Gathers all relevant information about a lead and assembles it into actionable guidance
 */

import { getDb } from "@/lib/db/queries";
import { getAccumulatedLearnings } from "./auto-learn";

export type InteractionType = "call" | "sms" | "email";

export interface AgentContext {
  leadSummary: string;
  relationshipStage:
    | "new"
    | "warming"
    | "hot"
    | "stale"
    | "at_risk"
    | "closed";
  recommendedApproach: string;
  keyTalkingPoints: string[];
  thingsToAvoid: string[];
  openingLine: string;
  goal: string;
  escalationTriggers: string[];
  contextNotes: string;
  leadProfile: {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    source: string | null;
  };
  interactionHistory: {
    lastInteraction: {
      type: string;
      date: Date;
      summary: string;
    } | null;
    totalInteractions: number;
    sentimentTrend: "improving" | "declining" | "stable";
  };
  pendingItems: {
    appointments: Array<{ date: Date; type: string }>;
    pendingDeals: number;
  };
}

interface LeadRecord {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  qualification_score?: number;
  stage?: string;
}

interface InteractionRecord {
  id: string;
  type: string;
  created_at: string;
  summary: string;
  sentiment?: string;
}

interface DealRecord {
  id: string;
  stage: string;
}

async function getLeadProfile(
  leadId: string,
  workspaceId: string
): Promise<LeadRecord | null> {
  const db = getDb();
  const { data } = await db
    .from("leads")
    .select("id, name, company, email, phone, source, qualification_score, state")
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return (data as LeadRecord | null) || null;
}

async function getInteractionHistory(
  leadId: string,
  workspaceId: string
): Promise<{
  lastInteraction: {
    type: string;
    date: Date;
    summary: string;
  } | null;
  totalInteractions: number;
  sentimentTrend: "improving" | "declining" | "stable";
}> {
  const db = getDb();

  // Get recent interactions (calls, sms, emails)
  const { data: interactions } = await db
    .from("interactions")
    .select("id, type, created_at, summary, sentiment")
    .eq("lead_id", leadId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!interactions || interactions.length === 0) {
    return {
      lastInteraction: null,
      totalInteractions: 0,
      sentimentTrend: "stable",
    };
  }

  const lastRecord = interactions[0] as InteractionRecord;
  const lastInteraction = {
    type: lastRecord.type,
    date: new Date(lastRecord.created_at),
    summary: lastRecord.summary || "Previous interaction",
  };

  // Calculate sentiment trend from last 5 interactions
  let sentimentTrend: "improving" | "declining" | "stable" = "stable";
  if (interactions.length >= 5) {
    const recentSentiments = interactions
      .slice(0, 5)
      .map((i) => (i as InteractionRecord).sentiment || "neutral");
    const sentimentScore = recentSentiments.reduce((acc, s) => {
      if (s === "positive") return acc + 1;
      if (s === "negative") return acc - 1;
      return acc;
    }, 0);

    if (sentimentScore > 1) {
      sentimentTrend = "improving";
    } else if (sentimentScore < -1) {
      sentimentTrend = "declining";
    }
  }

  return {
    lastInteraction,
    totalInteractions: interactions.length,
    sentimentTrend,
  };
}

async function getPendingItems(
  leadId: string,
  workspaceId: string
): Promise<{
  appointments: Array<{ date: Date; type: string }>;
  pendingDeals: number;
}> {
  const db = getDb();

  // Get upcoming appointments
  const { data: appointments } = await db
    .from("appointments")
    .select("start_time, title")
    .eq("lead_id", leadId)
    .eq("workspace_id", workspaceId)
    .gt("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(5);

  const appointmentList = (appointments || []).map((a) => ({
    date: new Date((a as { start_time: string }).start_time),
    type: (a as { title: string }).title || "meeting",
  }));

  // Get pending deals
  const { data: deals } = await db
    .from("deals")
    .select("id, stage")
    .eq("lead_id", leadId)
    .eq("workspace_id", workspaceId)
    .not("stage", "eq", "closed_won")
    .not("stage", "eq", "closed_lost");

  const pendingDealsCount = (deals || []).filter(
    (d) => (d as DealRecord).stage !== "closed_won"
  ).length;

  return {
    appointments: appointmentList,
    pendingDeals: pendingDealsCount,
  };
}

function determineRelationshipStage(
  leadProfile: LeadRecord | null,
  interactionCount: number,
  sentimentTrend: string,
  lastInteractionDate: Date | null
): "new" | "warming" | "hot" | "stale" | "at_risk" | "closed" {
  if (!leadProfile) {
    return "new";
  }

  const stage = (leadProfile.stage as string) || "new";
  if (stage === "closed_won" || stage === "closed_lost") {
    return "closed" as const;
  }

  if (interactionCount === 0) {
    return "new" as const;
  }

  if (lastInteractionDate) {
    const daysSinceLastInteraction =
      (Date.now() - lastInteractionDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastInteraction > 14) {
      return "stale" as const;
    }
    if (daysSinceLastInteraction > 7) {
      return "at_risk" as const;
    }
  }

  if (sentimentTrend === "improving") {
    return "hot" as const;
  }

  if (sentimentTrend === "declining") {
    return "at_risk" as const;
  }

  return "warming" as const;
}

export async function assembleLeadContext(
  workspaceId: string,
  leadId: string,
  interactionType: InteractionType
): Promise<AgentContext> {
  const leadProfile = await getLeadProfile(leadId, workspaceId);
  const interactionHistory = await getInteractionHistory(leadId, workspaceId);
  const pendingItems = await getPendingItems(leadId, workspaceId);

  const relationshipStage = determineRelationshipStage(
    leadProfile,
    interactionHistory.totalInteractions,
    interactionHistory.sentimentTrend,
    interactionHistory.lastInteraction?.date || null
  );

  // Get accumulated learnings for this workspace
  const learnings = await getAccumulatedLearnings(workspaceId);

  // Build context based on relationship stage and interaction type
  const leadSummary = buildLeadSummary(leadProfile, relationshipStage);
  const recommendedApproach = buildRecommendedApproach(
    relationshipStage,
    interactionType,
    interactionHistory.sentimentTrend
  );
  const keyTalkingPoints = buildTalkingPoints(
    relationshipStage,
    interactionHistory
  );
  const thingsToAvoid = buildThingsToAvoid(relationshipStage);
  const openingLine = buildOpeningLine(
    leadProfile,
    relationshipStage,
    interactionType
  );
  const goal = buildGoal(relationshipStage, interactionType);
  const escalationTriggers = buildEscalationTriggers();
  const contextNotes = buildContextNotes(
    leadProfile,
    interactionHistory,
    learnings
  );

  return {
    leadSummary,
    relationshipStage,
    recommendedApproach,
    keyTalkingPoints,
    thingsToAvoid,
    openingLine,
    goal,
    escalationTriggers,
    contextNotes,
    leadProfile: {
      id: leadProfile?.id || leadId,
      name: leadProfile?.name || "Unknown",
      company: leadProfile?.company || null,
      email: leadProfile?.email || null,
      phone: leadProfile?.phone || null,
      source: leadProfile?.source || null,
    },
    interactionHistory,
    pendingItems,
  };
}

function buildLeadSummary(
  lead: LeadRecord | null,
  stage: string
): string {
  if (!lead) {
    return "New lead. No prior interaction history.";
  }

  const company = lead.company ? ` at ${lead.company}` : "";
  const stageContext: Record<string, string> = {
    new: "Just entered our system",
    warming: "Shows growing interest",
    hot: "Very engaged and ready to move forward",
    stale: "Has gone quiet after initial interest",
    at_risk: "Engagement is declining",
    closed: "Deal is closed",
  };

  return `${lead.name}${company}. ${stageContext[stage] || ""}`;
}

function buildRecommendedApproach(
  stage: string,
  interactionType: InteractionType,
  sentimentTrend: string
): string {
  const approaches: Record<string, string> = {
    new_call:
      "Lead is new. Focus on discovery and understanding their needs. Be consultative, not pushy.",
    new_sms:
      "Short, friendly introduction. Ask for permission to follow up.",
    new_email:
      "Professional introduction with clear value proposition. Include CTA.",
    warming_call:
      "They have shown interest. Build on previous conversations. Move toward commitment.",
    warming_sms:
      "Reinforce key points from previous conversation. Keep momentum.",
    warming_email: "Provide additional resources or demo. Ask for next step.",
    hot_call:
      "Close mentality. Address final objections. Facilitate booking or next concrete step.",
    hot_sms:
      "Confirm details and excitement. Make booking very easy.",
    hot_email: "Send contract or booking confirmation. Be concise.",
    stale_call:
      "Re-engage with fresh angle. Reference what they were interested in. Ask what has changed.",
    stale_sms:
      "Light check-in. Show something new. Ask if still interested.",
    stale_email:
      "Relevant case study or update. Ask if timing is better now.",
    at_risk_call:
      "Empathetic approach. Uncover concerns. Show you care about their success, not just the sale.",
    at_risk_sms:
      "Personal touch. Ask how you can help. Offer specific solution.",
    at_risk_email:
      "Address anticipated objections. Offer special concession or alternative.",
  };

  const key = `${stage}_${interactionType}`;
  return approaches[key] || "Be professional and consultative.";
}

function buildTalkingPoints(
  stage: string,
  history: {
    lastInteraction: { summary: string } | null;
  }
): string[] {
  const basePoints: Record<string, string[]> = {
    new: [
      "Why they should care about your solution",
      "Common problems you solve",
      "Social proof / success stories",
    ],
    warming: [
      "Previous discussion points they raised",
      "How your solution addresses their specific needs",
      "Timeline and next steps",
    ],
    hot: [
      "Final details and pricing",
      "Implementation and support",
      "Urgency drivers if applicable",
    ],
    stale: [
      "What has changed since last talk",
      "New features or benefits",
      "Successful cases since you last spoke",
    ],
    at_risk: [
      "Listen to their concerns first",
      "Reassure on pain points",
      "Alternative solutions or pricing",
    ],
  };

  return basePoints[stage] || [];
}

function buildThingsToAvoid(stage: string): string[] {
  const avoidList: Record<string, string[]> = {
    new: [
      "Assuming you know their needs",
      "Talking too much without listening",
      "Immediate hard sell",
    ],
    warming: ["Contradicting previous statements", "Being too casual"],
    hot: ["Introducing new objections", "Appearing uncertain"],
    stale: [
      "Acting like they're a new lead again",
      "Sounding desperate",
    ],
    at_risk: [
      "Making excuses",
      "Being dismissive of their concerns",
      "Pressuring them",
    ],
  };

  return avoidList[stage] || [];
}

function buildOpeningLine(
  lead: LeadRecord | null,
  stage: string,
  interactionType: InteractionType
): string {
  if (!lead) {
    return "Hi there! I hope I am reaching you at a good time.";
  }

  const openers: Record<string, string> = {
    new_call: `Hi ${lead.name}, I hope I am catching you at a good time.`,
    new_sms: `Hi ${lead.name}, quick question for you...`,
    new_email: `${lead.name}, quick value add for you`,
    warming_call: `Hi ${lead.name}, following up on our conversation from before.`,
    warming_sms: `${lead.name}, thought of you when I saw this...`,
    warming_email: `${lead.name}, I found something relevant to what we discussed.`,
    hot_call: `${lead.name}, great news on the implementation.`,
    hot_sms: `${lead.name}, let's lock this in!`,
    hot_email: `${lead.name}, here's the next step.`,
    stale_call: `${lead.name}, I was just thinking about you and wanted to check in.`,
    stale_sms: `${lead.name}, missed you! Quick update...`,
    stale_email: `${lead.name}, thought you'd find this interesting.`,
    at_risk_call: `${lead.name}, I wanted to reach out personally.`,
    at_risk_sms: `${lead.name}, wanted to make sure everything is okay.`,
    at_risk_email: `${lead.name}, I have an idea that might help.`,
  };

  const key = `${stage}_${interactionType}`;
  return openers[key] || `Hi ${lead.name}, thanks for your time.`;
}

function buildGoal(stage: string, interactionType: InteractionType): string {
  const goals: Record<string, string> = {
    new_call: "Understand their situation and schedule a follow-up meeting",
    new_sms: "Get permission to send more information",
    new_email: "Generate interest and drive a call booking",
    warming_call:
      "Move deal forward. Overcome any lingering objections. Secure commitment.",
    warming_sms: "Confirm their interest and suggest next step",
    warming_email:
      "Provide proof. Encourage decision-making. Send call booking link.",
    hot_call: "Close the deal or get a firm commitment for next step",
    hot_sms: "Confirm meeting details and get final confirmation",
    hot_email: "Send contract or finalize booking details",
    stale_call:
      "Understand what changed and rekindle interest with fresh angle",
    stale_sms: "Test if they're still interested. Show something new.",
    stale_email: "Remind them of value. Offer fresh perspective.",
    at_risk_call:
      "Understand objections. Provide solution. Rebuild confidence.",
    at_risk_sms: "Show you care. Offer specific help. Ask for feedback.",
    at_risk_email:
      "Address concerns head-on. Offer alternative solution or pricing.",
  };

  const key = `${stage}_${interactionType}`;
  return goals[key] || "Move the relationship forward";
}

function buildEscalationTriggers(): string[] {
  return [
    "Lead is angry or very frustrated",
    "Lead has technical questions you cannot answer",
    "Lead requires pricing negotiation beyond your authority",
    "Lead asks about legal or compliance requirements",
    "Lead explicitly requests human representative",
    "Lead is a current customer with service complaint",
  ];
}

function buildContextNotes(
  lead: LeadRecord | null,
  history: {
    lastInteraction: { summary: string; date: Date } | null;
    totalInteractions: number;
  },
  learnings: {
    topPhrasesthatWork: Array<{ phrase: string; frequency: number }>;
    commonObjections: Array<{ objection: string; count: number }>;
  }
): string {
  let notes = "";

  if (lead?.source) {
    notes += `Source: ${lead.source}. `;
  }

  if (history.lastInteraction) {
    const daysSince = Math.floor(
      (Date.now() - history.lastInteraction.date.getTime()) / (1000 * 60 * 60 * 24)
    );
    notes += `Last contact ${daysSince} days ago: ${history.lastInteraction.summary}. `;
  }

  if (history.totalInteractions > 5) {
    notes += `Warm lead with significant history (${history.totalInteractions} interactions). `;
  }

  if (learnings.topPhrasesthatWork.length > 0) {
    notes += `Top performing phrases in similar calls: "${learnings.topPhrasesthatWork[0]?.phrase}". `;
  }

  if (learnings.commonObjections.length > 0) {
    notes += `Common objections to be prepared for: ${learnings.commonObjections.slice(0, 2).map((o) => `"${o.objection}"`).join(", ")}. `;
  }

  return notes.trim();
}
