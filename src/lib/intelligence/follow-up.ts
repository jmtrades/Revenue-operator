/**
 * Follow-up Intelligence
 * Adjust timing and tone based on engagement signals and commitment_score.
 */

import { getDb } from "@/lib/db/queries";
import { isColdStart, COLD_START_FOLLOW_UP_HOURS } from "@/lib/cold-start";
import { getCommitmentScore, getAdjustedReminderHours } from "@/lib/commitment";

export interface FollowUpRecommendation {
  lead_id: string;
  suggested_delay_hours: number;
  tone: "warm" | "professional" | "light" | "value_add";
  reason: string;
  commitment_influence?: string;
}

export async function getFollowUpRecommendation(leadId: string): Promise<FollowUpRecommendation> {
  const db = getDb();
  const { data: lead } = await db.from("leads").select("workspace_id").eq("id", leadId).single();
  const workspaceId = (lead as { workspace_id?: string })?.workspace_id;
  const coldStart = workspaceId ? await isColdStart(workspaceId) : true;
  const commitmentScore = await getCommitmentScore(leadId);

  const { data: convs } = await db.from("conversations").select("id").eq("lead_id", leadId);
  const convIds = (convs ?? []).map((c: { id: string }) => c.id);
  if (convIds.length === 0) {
    const baseHours = coldStart ? COLD_START_FOLLOW_UP_HOURS : 4;
    const adjustedHours = getAdjustedReminderHours(baseHours, commitmentScore);
    return {
      lead_id: leadId,
      suggested_delay_hours: adjustedHours,
      tone: commitmentScore >= 0.7 ? "professional" : commitmentScore <= 0.3 ? "value_add" : "professional",
      reason: coldStart ? "Cold start: conservative timing." : "No conversation history.",
      commitment_influence: `commitment_score=${commitmentScore.toFixed(2)} adjusted delay`,
    };
  }
  const { data: msgs } = await db
    .from("messages")
    .select("role, content, created_at")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false })
    .limit(10);
  const messages = (msgs ?? []) as { role: string; content: string }[];
  const lastUser = messages.find((m) => m.role === "user");
  const lastUserContent = lastUser?.content?.toLowerCase() ?? "";
  const shortResponse = lastUserContent.length < 20;
  const questionMarks = (lastUserContent.match(/\?/g) ?? []).length;
  const urgentWords = ["asap", "urgent", "soon", "quick"].some((w) => lastUserContent.includes(w));

  let delayHours = coldStart ? COLD_START_FOLLOW_UP_HOURS : 4;
  let tone: "warm" | "professional" | "light" | "value_add" = "professional";
  let reason = coldStart ? "Cold start: conservative timing." : "Default follow-up timing.";

  if (commitmentScore >= 0.7) {
    delayHours = getAdjustedReminderHours(delayHours, commitmentScore);
    tone = "professional";
    reason = "High commitment: shorter reminders, direct approach.";
  } else if (commitmentScore <= 0.3) {
    delayHours = getAdjustedReminderHours(delayHours, commitmentScore);
    tone = "value_add";
    reason = "Low commitment: confirmation prompts, softer tone, pre-frame value.";
  } else if (urgentWords) {
    delayHours = 1;
    tone = "professional";
    reason = "Urgency signals detected.";
  } else if (questionMarks > 1) {
    delayHours = 2;
    tone = "warm";
    reason = "Multiple questions suggest high interest.";
  } else if (shortResponse) {
    delayHours = 6;
    tone = "light";
    reason = "Short response may indicate lower engagement.";
  } else {
    delayHours = getAdjustedReminderHours(delayHours, commitmentScore);
  }

  return {
    lead_id: leadId,
    suggested_delay_hours: delayHours,
    tone,
    reason,
    commitment_influence: `commitment_score=${commitmentScore.toFixed(2)}`,
  };
}
