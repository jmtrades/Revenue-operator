/**
 * Phase 41 — Customer health + expansion detector.
 *
 * Composite customer health score (0..100) plus expansion and churn-risk
 * classifiers for post-sale account management. Also computes cohort NRR /
 * GRR over a window.
 *
 * Health model = weighted average of five pillars:
 *   - Product usage (DAU/MAU ratio, feature breadth, key events)
 *   - Engagement (response latency, QBR attendance, support sentiment)
 *   - Support (ticket count, severity, time-to-close)
 *   - Commercial (invoice health, usage vs. contracted)
 *   - Relationship (exec sponsor, champion still in role, NPS)
 *
 * Pure. Inputs are plain snapshots.
 */

export interface ProductUsageSnapshot {
  dau: number;
  mau: number;
  licensesEnabled: number; // provisioned seats
  licensesActive: number; // actually used in 30d
  keyEventsLast30d: number;
  featureBreadthPct: number; // 0..1 — fraction of "core" features adopted
  trendLast30vsPrior30: number; // signed pct change
}

export interface SupportSnapshot {
  openTickets: number;
  criticalOpenTickets: number;
  p1TicketsLast90d: number;
  avgResolutionHoursLast90d: number;
  sentimentScore?: number; // -1..1
}

export interface CommercialSnapshot {
  contractedMrr: number;
  actualUsageRatio: number; // actual/contracted; > 1 = overage
  invoicesOverdueCount: number;
  renewalInDays: number;
  discountPctOnLatestRenewal?: number;
}

export interface RelationshipSnapshot {
  hasExecSponsor: boolean;
  championStillInRole: boolean;
  lastQbrDaysAgo: number | null;
  npsLast90d?: number; // -100..100
  stakeholderCount: number;
  lastSubstantiveTouchDaysAgo: number | null;
}

export interface EngagementSnapshot {
  avgResponseHours: number; // avg time to reply to CSM
  attendedLastQbr: boolean;
  trainingSessionsLast90d: number;
  communityPostsLast90d: number;
}

export interface AccountHealthSnapshot {
  accountId: string;
  asOf: string; // ISO
  usage: ProductUsageSnapshot;
  engagement: EngagementSnapshot;
  support: SupportSnapshot;
  commercial: CommercialSnapshot;
  relationship: RelationshipSnapshot;
}

export interface PillarScore {
  score: number; // 0..100
  drivers: string[]; // human-readable positives
  risks: string[]; // human-readable negatives
}

export interface HealthScore {
  accountId: string;
  score: number; // 0..100
  status: "healthy" | "monitoring" | "at_risk" | "critical";
  pillars: {
    usage: PillarScore;
    engagement: PillarScore;
    support: PillarScore;
    commercial: PillarScore;
    relationship: PillarScore;
  };
  churnRisk: number; // 0..1
  expansionSignal: number; // 0..1
  renewalConfidence: number; // 0..1
  playbook: "advocate" | "renew_steady" | "expansion_play" | "save_play" | "exit_intervention";
  topDrivers: string[];
  topRisks: string[];
}

const WEIGHTS = {
  usage: 0.3,
  engagement: 0.15,
  support: 0.15,
  commercial: 0.2,
  relationship: 0.2,
};

function clamp(x: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, x));
}

function scoreUsage(u: ProductUsageSnapshot): PillarScore {
  const drivers: string[] = [];
  const risks: string[] = [];
  let score = 0;
  // DAU/MAU stickiness — target >= 0.5
  const stickiness = u.mau === 0 ? 0 : u.dau / u.mau;
  score += Math.min(30, stickiness * 60);
  if (stickiness >= 0.5) drivers.push(`DAU/MAU ${(stickiness * 100).toFixed(0)}% — strong stickiness`);
  else if (stickiness < 0.2) risks.push(`DAU/MAU ${(stickiness * 100).toFixed(0)}% — low stickiness`);

  // License utilization
  const util = u.licensesEnabled === 0 ? 0 : u.licensesActive / u.licensesEnabled;
  score += Math.min(25, util * 35);
  if (util < 0.5) risks.push(`${(util * 100).toFixed(0)}% license utilization`);
  else if (util >= 0.8) drivers.push(`${(util * 100).toFixed(0)}% license utilization`);

  // Key events — ceiling at 500
  const eventScore = Math.min(20, (u.keyEventsLast30d / 500) * 20);
  score += eventScore;
  if (u.keyEventsLast30d >= 300) drivers.push(`${u.keyEventsLast30d} key events in 30d`);
  if (u.keyEventsLast30d < 50) risks.push(`Only ${u.keyEventsLast30d} key events in 30d`);

  // Feature breadth
  score += Math.min(15, u.featureBreadthPct * 20);
  if (u.featureBreadthPct >= 0.7) drivers.push(`${(u.featureBreadthPct * 100).toFixed(0)}% feature adoption`);

  // Trend bonus/malus
  score += Math.max(-10, Math.min(10, u.trendLast30vsPrior30 * 20));
  if (u.trendLast30vsPrior30 <= -0.2) risks.push(`Usage down ${Math.abs(u.trendLast30vsPrior30 * 100).toFixed(0)}%`);
  else if (u.trendLast30vsPrior30 >= 0.15) drivers.push(`Usage up ${(u.trendLast30vsPrior30 * 100).toFixed(0)}%`);

  return { score: clamp(score), drivers, risks };
}

function scoreEngagement(e: EngagementSnapshot): PillarScore {
  const drivers: string[] = [];
  const risks: string[] = [];
  let score = 50;
  if (e.avgResponseHours <= 12) {
    score += 15;
    drivers.push(`Fast CSM response ${e.avgResponseHours.toFixed(1)}h`);
  } else if (e.avgResponseHours > 48) {
    score -= 15;
    risks.push(`Slow CSM response ${e.avgResponseHours.toFixed(1)}h`);
  }
  if (e.attendedLastQbr) {
    score += 15;
    drivers.push("Attended last QBR");
  } else {
    score -= 10;
    risks.push("Missed last QBR");
  }
  if (e.trainingSessionsLast90d > 0) {
    score += Math.min(10, e.trainingSessionsLast90d * 5);
    drivers.push(`${e.trainingSessionsLast90d} training sessions in 90d`);
  }
  if (e.communityPostsLast90d > 0) {
    score += Math.min(10, e.communityPostsLast90d * 2);
  }
  return { score: clamp(score), drivers, risks };
}

function scoreSupport(s: SupportSnapshot): PillarScore {
  const drivers: string[] = [];
  const risks: string[] = [];
  let score = 70;
  if (s.criticalOpenTickets > 0) {
    score -= s.criticalOpenTickets * 15;
    risks.push(`${s.criticalOpenTickets} P1 tickets currently open`);
  }
  if (s.openTickets > 10) {
    score -= 10;
    risks.push(`${s.openTickets} open tickets`);
  }
  if (s.p1TicketsLast90d >= 3) {
    score -= 10;
    risks.push(`${s.p1TicketsLast90d} P1 tickets in 90d`);
  }
  if (s.avgResolutionHoursLast90d <= 24) {
    score += 10;
    drivers.push(`Avg resolution ${s.avgResolutionHoursLast90d.toFixed(0)}h`);
  } else if (s.avgResolutionHoursLast90d >= 72) {
    score -= 10;
    risks.push(`Slow resolution ${s.avgResolutionHoursLast90d.toFixed(0)}h`);
  }
  if (typeof s.sentimentScore === "number") {
    score += s.sentimentScore * 10;
    if (s.sentimentScore <= -0.3) risks.push(`Negative support sentiment (${s.sentimentScore.toFixed(2)})`);
    if (s.sentimentScore >= 0.5) drivers.push(`Positive support sentiment (${s.sentimentScore.toFixed(2)})`);
  }
  return { score: clamp(score), drivers, risks };
}

function scoreCommercial(c: CommercialSnapshot): PillarScore {
  const drivers: string[] = [];
  const risks: string[] = [];
  let score = 60;
  if (c.actualUsageRatio >= 0.9 && c.actualUsageRatio <= 1.1) {
    score += 15;
    drivers.push(`Usage matches contract (${(c.actualUsageRatio * 100).toFixed(0)}%)`);
  } else if (c.actualUsageRatio > 1.1) {
    score += 10;
    drivers.push(`${((c.actualUsageRatio - 1) * 100).toFixed(0)}% over contract — expansion signal`);
  } else if (c.actualUsageRatio < 0.5) {
    score -= 20;
    risks.push(`Only ${(c.actualUsageRatio * 100).toFixed(0)}% of contract used`);
  }
  if (c.invoicesOverdueCount > 0) {
    score -= c.invoicesOverdueCount * 10;
    risks.push(`${c.invoicesOverdueCount} overdue invoices`);
  }
  if (c.renewalInDays > 0 && c.renewalInDays <= 30) {
    score -= 5;
    risks.push(`Renewal in ${c.renewalInDays}d — short runway`);
  } else if (c.renewalInDays > 90) {
    drivers.push(`Renewal runway ${c.renewalInDays}d`);
  }
  if (typeof c.discountPctOnLatestRenewal === "number" && c.discountPctOnLatestRenewal > 0.25) {
    score -= 10;
    risks.push(`Deep discount on last renewal (${(c.discountPctOnLatestRenewal * 100).toFixed(0)}%)`);
  }
  return { score: clamp(score), drivers, risks };
}

function scoreRelationship(r: RelationshipSnapshot): PillarScore {
  const drivers: string[] = [];
  const risks: string[] = [];
  let score = 50;
  if (r.hasExecSponsor) {
    score += 15;
    drivers.push("Exec sponsor engaged");
  } else {
    score -= 10;
    risks.push("No exec sponsor");
  }
  if (r.championStillInRole) {
    score += 10;
    drivers.push("Champion still in role");
  } else {
    score -= 20;
    risks.push("Champion has left the account");
  }
  if (r.stakeholderCount >= 4) {
    score += 10;
    drivers.push(`${r.stakeholderCount} stakeholders engaged`);
  } else if (r.stakeholderCount <= 1) {
    score -= 10;
    risks.push(`Only ${r.stakeholderCount} stakeholder`);
  }
  if (r.lastQbrDaysAgo === null) {
    score -= 10;
    risks.push("No QBR on record");
  } else if (r.lastQbrDaysAgo > 120) {
    score -= 15;
    risks.push(`Last QBR ${r.lastQbrDaysAgo}d ago`);
  }
  if (r.lastSubstantiveTouchDaysAgo !== null && r.lastSubstantiveTouchDaysAgo > 60) {
    score -= 10;
    risks.push(`No substantive touch for ${r.lastSubstantiveTouchDaysAgo}d`);
  }
  if (typeof r.npsLast90d === "number") {
    if (r.npsLast90d >= 50) {
      score += 10;
      drivers.push(`Promoter NPS (${r.npsLast90d})`);
    } else if (r.npsLast90d <= 0) {
      score -= 10;
      risks.push(`Detractor NPS (${r.npsLast90d})`);
    }
  }
  return { score: clamp(score), drivers, risks };
}

function decideStatus(score: number): HealthScore["status"] {
  if (score >= 75) return "healthy";
  if (score >= 55) return "monitoring";
  if (score >= 35) return "at_risk";
  return "critical";
}

function decidePlaybook(
  score: number,
  expansion: number,
  churn: number,
): HealthScore["playbook"] {
  if (score >= 80 && expansion >= 0.5) return "advocate";
  if (expansion >= 0.5) return "expansion_play";
  if (churn >= 0.6) return "exit_intervention";
  if (churn >= 0.35) return "save_play";
  return "renew_steady";
}

/**
 * Score one account.
 */
export function scoreAccountHealth(snapshot: AccountHealthSnapshot): HealthScore {
  const usage = scoreUsage(snapshot.usage);
  const engagement = scoreEngagement(snapshot.engagement);
  const support = scoreSupport(snapshot.support);
  const commercial = scoreCommercial(snapshot.commercial);
  const relationship = scoreRelationship(snapshot.relationship);

  const composite =
    usage.score * WEIGHTS.usage +
    engagement.score * WEIGHTS.engagement +
    support.score * WEIGHTS.support +
    commercial.score * WEIGHTS.commercial +
    relationship.score * WEIGHTS.relationship;
  const score = Math.round(composite * 10) / 10;

  // Expansion signal: high usage + over-contract usage + promoter NPS + breadth
  let expansion = 0;
  if (snapshot.commercial.actualUsageRatio > 1.0) expansion += 0.3;
  if (snapshot.usage.trendLast30vsPrior30 >= 0.15) expansion += 0.2;
  if (snapshot.usage.featureBreadthPct >= 0.7) expansion += 0.15;
  if ((snapshot.relationship.npsLast90d ?? 0) >= 50) expansion += 0.15;
  if (usage.score >= 75) expansion += 0.2;
  expansion = Math.min(1, expansion);

  // Churn risk: negative usage trend + low breadth + slow response + detractor NPS + no sponsor
  let churn = 0;
  if (snapshot.usage.trendLast30vsPrior30 <= -0.2) churn += 0.3;
  if (snapshot.usage.featureBreadthPct < 0.3) churn += 0.15;
  if (!snapshot.relationship.hasExecSponsor) churn += 0.1;
  if (!snapshot.relationship.championStillInRole) churn += 0.2;
  if ((snapshot.relationship.npsLast90d ?? 100) <= 0) churn += 0.1;
  if (snapshot.support.criticalOpenTickets > 0) churn += 0.15;
  if (snapshot.commercial.invoicesOverdueCount > 0) churn += 0.1;
  churn = Math.min(1, churn);

  const renewalConfidence = Math.max(0, Math.min(1, score / 100 - churn * 0.5 + expansion * 0.2));

  const topDrivers = [
    ...usage.drivers,
    ...engagement.drivers,
    ...commercial.drivers,
    ...relationship.drivers,
  ].slice(0, 5);
  const topRisks = [
    ...usage.risks,
    ...support.risks,
    ...commercial.risks,
    ...relationship.risks,
  ].slice(0, 5);

  return {
    accountId: snapshot.accountId,
    score,
    status: decideStatus(score),
    pillars: { usage, engagement, support, commercial, relationship },
    churnRisk: Math.round(churn * 100) / 100,
    expansionSignal: Math.round(expansion * 100) / 100,
    renewalConfidence: Math.round(renewalConfidence * 100) / 100,
    playbook: decidePlaybook(score, expansion, churn),
    topDrivers,
    topRisks,
  };
}

/**
 * NRR / GRR rollup over a set of accounts given start and end MRR.
 *
 * NRR = (startMRR + expansion - churn - contraction) / startMRR
 * GRR = (startMRR - churn - contraction) / startMRR
 */
export interface CohortRevenueDelta {
  accountId: string;
  startMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnedMrr: number; // lost entirely
}

export interface CohortNrrReport {
  startMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnedMrr: number;
  endMrr: number;
  nrr: number; // 1.0 = 100%
  grr: number;
  logoChurnCount: number;
  logoChurnRate: number;
}

export function computeCohortNrr(deltas: CohortRevenueDelta[]): CohortNrrReport {
  let startMrr = 0;
  let expansionMrr = 0;
  let contractionMrr = 0;
  let churnedMrr = 0;
  let logoChurnCount = 0;
  for (const d of deltas) {
    startMrr += d.startMrr;
    expansionMrr += d.expansionMrr;
    contractionMrr += d.contractionMrr;
    churnedMrr += d.churnedMrr;
    if (d.churnedMrr > 0 && d.startMrr > 0 && d.churnedMrr >= d.startMrr - d.contractionMrr) {
      logoChurnCount += 1;
    }
  }
  const endMrr = startMrr + expansionMrr - contractionMrr - churnedMrr;
  const nrr = startMrr === 0 ? 0 : (startMrr + expansionMrr - contractionMrr - churnedMrr) / startMrr;
  const grr = startMrr === 0 ? 0 : (startMrr - contractionMrr - churnedMrr) / startMrr;
  const logoChurnRate = deltas.length === 0 ? 0 : logoChurnCount / deltas.length;
  return {
    startMrr,
    expansionMrr,
    contractionMrr,
    churnedMrr,
    endMrr,
    nrr,
    grr,
    logoChurnCount,
    logoChurnRate,
  };
}
