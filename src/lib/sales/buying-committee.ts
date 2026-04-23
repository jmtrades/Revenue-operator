/**
 * Phase 43 — Buying committee + stakeholder map.
 *
 * Turns a list of stakeholders (with role, power, interest, disposition,
 * engagement) into a committee map that identifies:
 *
 *   - Champion strength
 *   - Economic buyer coverage
 *   - Blockers
 *   - Coverage gaps (missing archetypes)
 *   - Power/interest matrix placement
 *   - Coaching next-best-action per stakeholder
 *
 * Pure. Deterministic. Caller injects the people list from the CRM.
 */

export type StakeholderRole =
  | "economic_buyer"
  | "technical_buyer"
  | "user_buyer"
  | "champion"
  | "coach"
  | "influencer"
  | "blocker"
  | "procurement"
  | "legal"
  | "finance"
  | "security"
  | "it";

export type SeniorityLevel = "ic" | "manager" | "director" | "vp" | "cxo";

export type Disposition = "advocate" | "supporter" | "neutral" | "skeptic" | "opponent";

export interface Stakeholder {
  id: string;
  name: string;
  title: string;
  role: StakeholderRole;
  level: SeniorityLevel;
  disposition: Disposition;
  /** Influence on the decision: 0..1. */
  power: number;
  /** Personal interest in our solution: 0..1. */
  interest: number;
  /** Days since last substantive touch. */
  lastTouchDaysAgo: number | null;
  /** Multi-threading: have we met 1:1 with this person? */
  meetingsHeld: number;
  /** Optional explicit champion flag. */
  isChampion?: boolean;
}

export type QuadrantName = "power_players" | "key_influencers" | "latent" | "watchers";

export interface CommitteeGap {
  code:
    | "no_champion"
    | "no_economic_buyer"
    | "no_user_buyer"
    | "no_technical_buyer"
    | "no_procurement"
    | "no_legal"
    | "single_thread"
    | "low_exec_coverage"
    | "blocker_unmanaged"
    | "champion_disengaged"
    | "no_multi_thread";
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface StakeholderAssessment {
  id: string;
  name: string;
  role: StakeholderRole;
  quadrant: QuadrantName;
  score: number; // 0..100 relative importance to the deal
  recommendedAction: string;
}

export interface BuyingCommittee {
  total: number;
  quadrants: Record<QuadrantName, StakeholderAssessment[]>;
  championStrength: number; // 0..1
  economicBuyerEngaged: boolean;
  blockerCount: number;
  blockerRiskScore: number; // 0..1
  coverageScore: number; // 0..1 (archetype coverage)
  multiThreadScore: number; // 0..1 (>=3 distinct 1:1s)
  gaps: CommitteeGap[];
  assessments: StakeholderAssessment[];
  nextBestActions: string[];
}

const DISPOSITION_WEIGHT: Record<Disposition, number> = {
  advocate: 1.0,
  supporter: 0.7,
  neutral: 0.4,
  skeptic: 0.15,
  opponent: 0,
};

const LEVEL_WEIGHT: Record<SeniorityLevel, number> = {
  ic: 0.2,
  manager: 0.4,
  director: 0.6,
  vp: 0.85,
  cxo: 1.0,
};

function quadrant(s: Stakeholder): QuadrantName {
  const highPower = s.power >= 0.5;
  const highInterest = s.interest >= 0.5;
  if (highPower && highInterest) return "power_players";
  if (highPower && !highInterest) return "latent";
  if (!highPower && highInterest) return "key_influencers";
  return "watchers";
}

function stakeholderScore(s: Stakeholder): number {
  const base = (s.power * 0.5 + s.interest * 0.3 + LEVEL_WEIGHT[s.level] * 0.2) * 100;
  const dispoAdj = (DISPOSITION_WEIGHT[s.disposition] - 0.4) * 25; // -10..+15
  const meetingsBonus = Math.min(10, s.meetingsHeld * 2);
  const staleness = s.lastTouchDaysAgo === null ? -10 : Math.max(-15, -s.lastTouchDaysAgo * 0.2);
  return Math.max(0, Math.min(100, base + dispoAdj + meetingsBonus + staleness));
}

function recommendAction(s: Stakeholder): string {
  if (s.role === "blocker" || s.disposition === "opponent") {
    return `Neutralize via ${s.level === "cxo" ? "exec-to-exec" : "peer"} conversation; reframe their concern.`;
  }
  if (s.isChampion || s.disposition === "advocate") {
    if ((s.lastTouchDaysAgo ?? 0) > 21) return "Re-engage champion — they've gone quiet.";
    return "Enable champion with ROI deck + internal pitch kit.";
  }
  if (s.role === "economic_buyer" && (s.lastTouchDaysAgo ?? 99) > 30) {
    return "Request exec-sponsor meeting; EB has gone dark.";
  }
  if (s.meetingsHeld === 0 && s.power >= 0.6) {
    return "Book intro meeting — high-power stakeholder without a 1:1.";
  }
  if (s.disposition === "skeptic") {
    return "Schedule proof session addressing their specific concerns.";
  }
  if (s.disposition === "neutral") {
    return "Warm up with case study of a peer company.";
  }
  return "Maintain cadence.";
}

function detectGaps(stakeholders: Stakeholder[]): CommitteeGap[] {
  const gaps: CommitteeGap[] = [];
  const roles = new Set(stakeholders.map((s) => s.role));
  const hasChampion = stakeholders.some((s) => s.isChampion || s.role === "champion" || s.disposition === "advocate");
  if (!hasChampion) {
    gaps.push({ code: "no_champion", severity: "critical", message: "No champion identified" });
  }
  if (!roles.has("economic_buyer")) {
    gaps.push({ code: "no_economic_buyer", severity: "critical", message: "No economic buyer on committee" });
  }
  if (!roles.has("user_buyer")) {
    gaps.push({ code: "no_user_buyer", severity: "warning", message: "No user buyer identified" });
  }
  if (!roles.has("technical_buyer") && !roles.has("it") && !roles.has("security")) {
    gaps.push({ code: "no_technical_buyer", severity: "warning", message: "No technical buyer / IT / security contact" });
  }
  if (!roles.has("procurement")) {
    gaps.push({ code: "no_procurement", severity: "info", message: "Procurement not yet engaged" });
  }
  if (!roles.has("legal")) {
    gaps.push({ code: "no_legal", severity: "info", message: "Legal not yet engaged" });
  }
  if (stakeholders.length <= 1) {
    gaps.push({ code: "single_thread", severity: "critical", message: "Single-threaded — only 1 stakeholder" });
  }
  const oneOnOnes = stakeholders.filter((s) => s.meetingsHeld >= 1).length;
  if (stakeholders.length >= 3 && oneOnOnes < 3) {
    gaps.push({ code: "no_multi_thread", severity: "warning", message: `${oneOnOnes} stakeholders with 1:1s — target >= 3` });
  }
  const execs = stakeholders.filter((s) => s.level === "vp" || s.level === "cxo").length;
  if (execs === 0) {
    gaps.push({ code: "low_exec_coverage", severity: "warning", message: "No VP/CXO level contact" });
  }
  const champions = stakeholders.filter((s) => s.isChampion || s.role === "champion" || s.disposition === "advocate");
  if (champions.length > 0 && champions.every((c) => (c.lastTouchDaysAgo ?? 0) > 21)) {
    gaps.push({ code: "champion_disengaged", severity: "warning", message: "Champion hasn't been engaged in 21+ days" });
  }
  const unmanagedBlockers = stakeholders.filter(
    (s) => (s.role === "blocker" || s.disposition === "opponent") && s.meetingsHeld === 0,
  );
  if (unmanagedBlockers.length > 0) {
    gaps.push({
      code: "blocker_unmanaged",
      severity: "critical",
      message: `${unmanagedBlockers.length} unmanaged blocker(s)`,
    });
  }
  return gaps;
}

function championStrength(stakeholders: Stakeholder[]): number {
  const champs = stakeholders.filter((s) => s.isChampion || s.role === "champion" || s.disposition === "advocate");
  if (champs.length === 0) return 0;
  const best = champs.reduce((max, c) => {
    const score =
      c.power * 0.4 +
      LEVEL_WEIGHT[c.level] * 0.3 +
      (DISPOSITION_WEIGHT[c.disposition]) * 0.2 +
      Math.min(1, c.meetingsHeld / 4) * 0.1;
    return Math.max(max, score);
  }, 0);
  // penalty for staleness
  const staleness = champs.reduce((min, c) => Math.min(min, c.lastTouchDaysAgo ?? 999), 999);
  const stalenessPenalty = staleness > 30 ? 0.3 : staleness > 14 ? 0.1 : 0;
  return Math.max(0, Math.min(1, best - stalenessPenalty));
}

function blockerRisk(stakeholders: Stakeholder[]): number {
  const blockers = stakeholders.filter((s) => s.role === "blocker" || s.disposition === "opponent");
  if (blockers.length === 0) return 0;
  let total = 0;
  for (const b of blockers) {
    const sev = b.power * 0.6 + LEVEL_WEIGHT[b.level] * 0.3 + (1 - DISPOSITION_WEIGHT[b.disposition]) * 0.1;
    const managed = b.meetingsHeld > 0 ? 0.6 : 1; // management halves risk
    total += sev * managed;
  }
  return Math.min(1, total / Math.max(1, blockers.length));
}

function coverageScore(stakeholders: Stakeholder[]): number {
  const archetypes: StakeholderRole[] = [
    "economic_buyer",
    "technical_buyer",
    "user_buyer",
    "procurement",
    "legal",
  ];
  const present = new Set(stakeholders.map((s) => s.role));
  const matched = archetypes.filter((a) => present.has(a)).length;
  return matched / archetypes.length;
}

export function mapBuyingCommittee(stakeholders: Stakeholder[]): BuyingCommittee {
  const assessments: StakeholderAssessment[] = stakeholders.map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
    quadrant: quadrant(s),
    score: stakeholderScore(s),
    recommendedAction: recommendAction(s),
  }));
  const quadrants: Record<QuadrantName, StakeholderAssessment[]> = {
    power_players: [],
    key_influencers: [],
    latent: [],
    watchers: [],
  };
  for (const a of assessments) quadrants[a.quadrant].push(a);
  for (const k of Object.keys(quadrants) as QuadrantName[]) {
    quadrants[k].sort((a, b) => b.score - a.score);
  }

  const gaps = detectGaps(stakeholders);
  const champion = championStrength(stakeholders);
  const blockerRiskScore = blockerRisk(stakeholders);
  const coverage = coverageScore(stakeholders);
  const ebEngaged = stakeholders.some(
    (s) => s.role === "economic_buyer" && (s.lastTouchDaysAgo ?? 999) <= 45,
  );
  const uniqueWithMeetings = stakeholders.filter((s) => s.meetingsHeld >= 1).length;
  const multiThread = Math.min(1, uniqueWithMeetings / 4); // 4+ = full marks

  const nextBestActions = assessments
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((a) => `${a.name} (${a.role}): ${a.recommendedAction}`);

  return {
    total: stakeholders.length,
    quadrants,
    championStrength: Math.round(champion * 100) / 100,
    economicBuyerEngaged: ebEngaged,
    blockerCount: stakeholders.filter((s) => s.role === "blocker" || s.disposition === "opponent").length,
    blockerRiskScore: Math.round(blockerRiskScore * 100) / 100,
    coverageScore: Math.round(coverage * 100) / 100,
    multiThreadScore: Math.round(multiThread * 100) / 100,
    gaps,
    assessments,
    nextBestActions,
  };
}

/**
 * Deal-level readiness metric: weighted combination of committee signals.
 */
export function committeeReadiness(committee: BuyingCommittee): {
  score: number; // 0..100
  verdict: "ready" | "progressing" | "at_risk" | "unready";
  reasons: string[];
} {
  const reasons: string[] = [];
  const score =
    committee.championStrength * 30 +
    (committee.economicBuyerEngaged ? 1 : 0) * 20 +
    committee.coverageScore * 20 +
    committee.multiThreadScore * 15 +
    (1 - committee.blockerRiskScore) * 15;
  const critGaps = committee.gaps.filter((g) => g.severity === "critical");
  if (critGaps.length > 0) {
    reasons.push(...critGaps.map((g) => g.message));
  }
  let verdict: "ready" | "progressing" | "at_risk" | "unready";
  if (critGaps.length > 0 || score < 30) verdict = "unready";
  else if (score >= 75) verdict = "ready";
  else if (score >= 55) verdict = "progressing";
  else verdict = "at_risk";
  return { score: Math.round(score * 10) / 10, verdict, reasons };
}
