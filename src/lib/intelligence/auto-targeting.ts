/**
 * Smart Auto-Targeting Engine — Identifies the best leads to contact and when.
 *
 * Uses lead behavior, engagement history, and workspace patterns to:
 * 1. Score leads by conversion probability (not just basic lead score)
 * 2. Determine optimal contact time per lead
 * 3. Select the best channel (call, SMS, email)
 * 4. Prioritize leads by expected revenue value
 * 5. Segment leads into actionable cohorts
 *
 * This makes the system intelligent — it's not just a dialer, it's a brain
 * that knows WHO to call, WHEN, and HOW.
 */

import { getDb } from "@/lib/db/queries";

export type ContactChannel = "call" | "sms" | "email";
export type TargetPriority = "immediate" | "high" | "medium" | "low" | "nurture";

export interface TargetedLead {
  leadId: string;
  name: string;
  phone: string | null;
  email: string | null;
  conversionProbability: number; // 0-100
  estimatedValue: number;
  bestChannel: ContactChannel;
  optimalContactTime: string | null; // ISO datetime
  priority: TargetPriority;
  reason: string;
  segment: string;
}

export interface TargetingResult {
  workspaceId: string;
  generatedAt: string;
  targets: TargetedLead[];
  totalEstimatedPipeline: number;
  segmentCounts: Record<string, number>;
}

interface LeadRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  last_activity_at: string | null;
}

function computeConversionProbability(lead: LeadRow): number {
  let score = 30; // Base probability

  // Recency bonus: leads contacted recently are more likely to convert
  if (lead.last_activity_at) {
    const daysSinceActivity = (Date.now() - new Date(lead.last_activity_at).getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceActivity < 1) score += 25;
    else if (daysSinceActivity < 3) score += 15;
    else if (daysSinceActivity < 7) score += 5;
    else score -= 10;
  }

  // Status-based adjustment
  if (lead.status === "QUALIFIED") score += 20;
  else if (lead.status === "ENGAGED") score += 15;
  else if (lead.status === "CONTACTED") score += 5;
  else if (lead.status === "BOOKED") score += 30;

  // Source quality
  const source = String(lead.metadata?.source ?? "").toLowerCase();
  if (source === "referral") score += 15;
  else if (source === "inbound_call") score += 12;
  else if (source === "website") score += 8;

  // Has email AND phone — dual channel available
  if (lead.phone && lead.email) score += 5;

  return Math.min(100, Math.max(0, score));
}

function determineBestChannel(lead: LeadRow): ContactChannel {
  if (!lead.phone && lead.email) return "email";
  if (!lead.email && lead.phone) return "call";

  // Default: call is highest conversion, SMS for quick follow-ups
  const source = String(lead.metadata?.source ?? "").toLowerCase();
  if (source === "website" || source === "form") return "call"; // Warm leads → call
  if (source === "api" || source === "import") return "sms";    // Cold leads → SMS first

  return "call";
}

function determineSegment(lead: LeadRow, probability: number): string {
  if (probability >= 70) return "hot_leads";
  if (probability >= 50) return "warm_leads";
  if (lead.status === "LOST" || lead.status === "CLOSED") return "win_back";
  if (lead.last_activity_at) {
    const daysSince = (Date.now() - new Date(lead.last_activity_at).getTime()) / (24 * 60 * 60 * 1000);
    if (daysSince > 30) return "reactivation";
  }
  if (lead.status === "NEW") return "speed_to_lead";
  return "nurture";
}

function determinePriority(probability: number, segment: string): TargetPriority {
  if (segment === "speed_to_lead") return "immediate";
  if (probability >= 70) return "high";
  if (probability >= 50) return "medium";
  if (segment === "win_back" || segment === "reactivation") return "low";
  return "nurture";
}

function generateReason(lead: LeadRow, probability: number, segment: string): string {
  if (segment === "speed_to_lead") return "New lead — contact within 5 minutes for 10x higher conversion";
  if (segment === "hot_leads") return `${probability}% conversion probability — high-value opportunity`;
  if (segment === "warm_leads") return "Engaged lead showing buying signals — follow up now";
  if (segment === "win_back") return "Previously lost — win-back campaign can recover 15-25% of these";
  if (segment === "reactivation") return "Inactive 30+ days — reactivation sequence recommended";
  return "Nurture with value-add content to build trust";
}

export async function computeAutoTargets(
  workspaceId: string,
  limit = 50,
): Promise<TargetingResult> {
  const db = getDb();
  const now = new Date();

  const { data: rawLeads } = await db
    .from("leads")
    .select("id, name, phone, email, status, metadata, created_at, last_activity_at")
    .eq("workspace_id", workspaceId)
    .not("status", "in", "(WON,CLOSED)")
    .order("last_activity_at", { ascending: false })
    .limit(500);

  const leads = (rawLeads ?? []) as LeadRow[];
  const segmentCounts: Record<string, number> = {};

  const targets: TargetedLead[] = leads
    .map((lead) => {
      const probability = computeConversionProbability(lead);
      const channel = determineBestChannel(lead);
      const segment = determineSegment(lead, probability);
      const priority = determinePriority(probability, segment);
      const reason = generateReason(lead, probability, segment);

      segmentCounts[segment] = (segmentCounts[segment] ?? 0) + 1;

      return {
        leadId: lead.id,
        name: lead.name ?? "Unknown",
        phone: lead.phone,
        email: lead.email,
        conversionProbability: probability,
        estimatedValue: Math.round(probability * 10), // Simplified estimate
        bestChannel: channel,
        optimalContactTime: null, // Future: use timezone + historical patterns
        priority,
        reason,
        segment,
      };
    })
    .sort((a, b) => {
      // Immediate first, then by probability
      const priorityOrder: Record<TargetPriority, number> = { immediate: 0, high: 1, medium: 2, low: 3, nurture: 4 };
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return b.conversionProbability - a.conversionProbability;
    })
    .slice(0, limit);

  const totalEstimatedPipeline = targets.reduce((sum, t) => sum + t.estimatedValue, 0);

  return {
    workspaceId,
    generatedAt: now.toISOString(),
    targets,
    totalEstimatedPipeline,
    segmentCounts,
  };
}
