/**
 * Phase 12c.9 — Champion tracker + buying-committee risk.
 *
 * Research gap (Phase 12a): conversation intelligence tools score individual
 * reps but almost none track the buying committee. When your champion leaves
 * the company, you find out 6 weeks later — or never. When your deal is
 * "single-threaded" (only one stakeholder engaged), win rates drop by
 * ~40% but most platforms don't surface it.
 *
 * This module:
 *   1. Defines a structured BuyingCommittee shape (champion, economic buyer,
 *      technical evaluator, end-user, blocker, influencer).
 *   2. Scores multi-threading risk for a deal.
 *   3. Emits champion-leave / single-thread signals + suggested plays.
 *
 * Pure function. Consumes stakeholder metadata supplied by the caller
 * (typically sourced from CRM + email/calendar activity).
 */

export type StakeholderRole =
  | "champion"
  | "economic_buyer"
  | "technical_evaluator"
  | "end_user"
  | "influencer"
  | "blocker"
  | "unknown";

export type EngagementTrend = "rising" | "steady" | "cooling" | "silent";

export interface Stakeholder {
  id: string;
  fullName: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  role: StakeholderRole;
  /** 0..1 — how strongly they've engaged recently (opens, calls, replies). */
  engagementScore: number;
  /** Trend over last ~30 days. */
  engagementTrend: EngagementTrend;
  /** Last meaningful activity ISO. */
  lastActivityAt: string | null;
  /** Signals we detected. */
  signals?: StakeholderSignal[];
}

export type StakeholderSignal =
  | "email_bounced"
  | "ooo_auto_response"
  | "linkedin_job_change"
  | "no_show_meeting"
  | "re_engaged"
  | "introduced_colleague";

export interface Deal {
  id: string;
  name: string;
  amountUsd: number | null;
  closeDateIso: string | null;
  /** Days since deal created. */
  ageDays: number;
  stage: string;
}

export interface CommitteeAssessment {
  dealId: string;
  totalStakeholders: number;
  byRole: Record<StakeholderRole, number>;
  activeStakeholders: number;
  /** 0 (catastrophically single-thread) ... 1 (fully multi-threaded). */
  multiThreadingScore: number;
  risks: CommitteeRisk[];
  recommendedPlays: CommitteePlay[];
}

export type CommitteeRiskType =
  | "single_threaded"
  | "champion_silent"
  | "champion_left"
  | "no_economic_buyer"
  | "no_technical_buyer"
  | "blocker_dominant"
  | "champion_over_dependent";

export interface CommitteeRisk {
  type: CommitteeRiskType;
  severity: "critical" | "warning" | "info";
  explanation: string;
  /** IDs of stakeholders implicated. */
  stakeholderIds: string[];
}

export type CommitteePlayType =
  | "multi_thread_champion_intro"
  | "re_engage_champion"
  | "champion_replace"
  | "surface_economic_buyer"
  | "bring_in_technical_evaluator"
  | "disarm_blocker"
  | "executive_sponsor";

export interface CommitteePlay {
  type: CommitteePlayType;
  priority: "high" | "medium" | "low";
  suggestedAction: string;
  /** One-line talk-track the rep can use. */
  talkTrack: string;
}

// ---------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------

const STALE_DAYS = 21;

export function assessBuyingCommittee(
  deal: Deal,
  stakeholders: Stakeholder[],
  nowIso: string = new Date().toISOString(),
): CommitteeAssessment {
  const now = new Date(nowIso).getTime();
  const byRole: Record<StakeholderRole, number> = {
    champion: 0, economic_buyer: 0, technical_evaluator: 0,
    end_user: 0, influencer: 0, blocker: 0, unknown: 0,
  };
  for (const s of stakeholders) byRole[s.role] = (byRole[s.role] ?? 0) + 1;

  const active = stakeholders.filter((s) => {
    if (s.engagementTrend === "silent") return false;
    if (!s.lastActivityAt) return false;
    const ageDays = (now - new Date(s.lastActivityAt).getTime()) / 86_400_000;
    return ageDays <= STALE_DAYS;
  });

  // Multi-threading: weight champion + econ buyer highest
  const roleWeight: Record<StakeholderRole, number> = {
    economic_buyer: 0.3,
    champion: 0.25,
    technical_evaluator: 0.2,
    end_user: 0.1,
    influencer: 0.1,
    blocker: 0.0, // blockers don't help multi-threading
    unknown: 0.05,
  };
  let score = 0;
  for (const s of active) score += roleWeight[s.role] ?? 0.05;
  score = Math.min(1, score);

  const risks: CommitteeRisk[] = [];

  // Single-threaded
  if (active.length <= 1) {
    risks.push({
      type: "single_threaded",
      severity: active.length === 0 ? "critical" : "warning",
      explanation: active.length === 0
        ? "No active stakeholders in the last 3 weeks. Deal is flatlining."
        : "Only one active stakeholder. Win-rate is ~40% lower single-threaded.",
      stakeholderIds: active.map((s) => s.id),
    });
  }

  // Champion silent / left
  const champions = stakeholders.filter((s) => s.role === "champion");
  const activeChampion = champions.find((s) => active.includes(s));
  if (champions.length > 0 && !activeChampion) {
    const anyLeft = champions.some((s) => (s.signals ?? []).includes("linkedin_job_change") || (s.signals ?? []).includes("email_bounced"));
    risks.push({
      type: anyLeft ? "champion_left" : "champion_silent",
      severity: anyLeft ? "critical" : "warning",
      explanation: anyLeft
        ? "Your champion has left the company. Deal is at severe risk."
        : "Champion hasn't engaged in 3+ weeks. Re-engage or replace.",
      stakeholderIds: champions.map((s) => s.id),
    });
  }

  // Champion over-dependency
  if (activeChampion && active.length === 1) {
    risks.push({
      type: "champion_over_dependent",
      severity: "warning",
      explanation: "Only your champion is engaged. Get them to introduce at least one other stakeholder.",
      stakeholderIds: [activeChampion.id],
    });
  }

  // Missing economic buyer
  if (byRole.economic_buyer === 0 && deal.ageDays > 14) {
    risks.push({
      type: "no_economic_buyer",
      severity: "warning",
      explanation: "No economic buyer identified after 2 weeks. Who signs the check?",
      stakeholderIds: [],
    });
  }

  // Missing technical buyer on technical deal (best-effort heuristic)
  if (byRole.technical_evaluator === 0 && (deal.amountUsd ?? 0) > 10_000) {
    risks.push({
      type: "no_technical_buyer",
      severity: "info",
      explanation: "No technical evaluator engaged on a >$10k deal.",
      stakeholderIds: [],
    });
  }

  // Blocker dominant
  const blockers = stakeholders.filter((s) => s.role === "blocker");
  if (blockers.length >= 1 && blockers.length >= (champions.length || 0)) {
    risks.push({
      type: "blocker_dominant",
      severity: "warning",
      explanation: "Blockers outnumber champions. Neutralise before proceeding.",
      stakeholderIds: blockers.map((b) => b.id),
    });
  }

  // Play library keyed by risk
  const plays: CommitteePlay[] = [];
  for (const r of risks) {
    plays.push(...playsFor(r, stakeholders));
  }

  return {
    dealId: deal.id,
    totalStakeholders: stakeholders.length,
    byRole,
    activeStakeholders: active.length,
    multiThreadingScore: Number(score.toFixed(2)),
    risks,
    recommendedPlays: plays,
  };
}

function playsFor(risk: CommitteeRisk, stakeholders: Stakeholder[]): CommitteePlay[] {
  switch (risk.type) {
    case "single_threaded":
      return [{
        type: "multi_thread_champion_intro",
        priority: "high",
        suggestedAction: "Ask the one active stakeholder to introduce you to one additional decision-maker this week.",
        talkTrack: "Who else on your side needs to weigh in? I'd love 10 minutes with them so we don't slow you down later.",
      }];
    case "champion_silent":
      return [{
        type: "re_engage_champion",
        priority: "high",
        suggestedAction: "Send a value-add (not a check-in) email to your champion: 1-line update + 1 useful resource.",
        talkTrack: "I noticed three things since we last spoke that might matter for you — want me to summarise in 5 lines?",
      }];
    case "champion_left": {
      const leftList = stakeholders.filter((s) => risk.stakeholderIds.includes(s.id)).map((s) => s.fullName).join(", ");
      return [{
        type: "champion_replace",
        priority: "high",
        suggestedAction: `Identify and recruit a replacement champion in the account (was: ${leftList || "unknown"}).`,
        talkTrack: "I wanted to reach out — I know there have been some changes. Who's picking up the evaluation internally?",
      }];
    }
    case "no_economic_buyer":
      return [{
        type: "surface_economic_buyer",
        priority: "medium",
        suggestedAction: "Ask champion who holds the budget and would sign off.",
        talkTrack: "When this goes to final approval, who's the person who signs off? I want to make sure we're building the business case in a way that's easy for them.",
      }];
    case "no_technical_buyer":
      return [{
        type: "bring_in_technical_evaluator",
        priority: "medium",
        suggestedAction: "Offer a technical deep-dive with engineering/IT.",
        talkTrack: "On bigger implementations, we usually loop in someone on your tech side — happy to do a no-pressure working session if that's useful.",
      }];
    case "blocker_dominant":
      return [{
        type: "disarm_blocker",
        priority: "high",
        suggestedAction: "Address the blocker's specific concern directly. Don't route around them.",
        talkTrack: "I want to take your concerns seriously — can we spend 10 minutes just on what you'd need to see to feel confident?",
      }];
    case "champion_over_dependent":
      return [{
        type: "executive_sponsor",
        priority: "medium",
        suggestedAction: "Propose an exec-to-exec sync so your champion isn't the sole advocate internally.",
        talkTrack: "Would it be useful for our CEO to spend 15 minutes with your leadership? No pitch — just context.",
      }];
    default:
      return [];
  }
}

/**
 * Emit a one-line summary fit for a dashboard row.
 */
export function summariseCommittee(assessment: CommitteeAssessment): string {
  const bits: string[] = [];
  bits.push(`${assessment.activeStakeholders}/${assessment.totalStakeholders} active`);
  bits.push(`multi-thread ${(assessment.multiThreadingScore * 100).toFixed(0)}%`);
  if (assessment.risks.length) {
    bits.push(`${assessment.risks.length} risk${assessment.risks.length === 1 ? "" : "s"}`);
  }
  return bits.join(" · ");
}
