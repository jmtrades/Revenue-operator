/**
 * Phase 36 — ICP account scoring engine.
 *
 * The engine every $10B+ revenue platform has: take a raw account and
 * score it against the workspace's ICP across four weighted dimensions:
 *
 *   - Firmographic     (industry, size, geo, revenue)
 *   - Technographic    (tech stack, installed tools)
 *   - Intent           (research / engagement signals)
 *   - Fit              (role-level, buying-committee completeness)
 *
 * Output: 0..100 score + tier (A/B/C/D/disqualified) + per-dimension
 * contribution + human-readable reasons.
 *
 * Pure. Caller provides account + ICP definition. No I/O.
 */

export type IndustryCode = string;
export type CountryCode = string;

export interface AccountSnapshot {
  id: string;
  companyName: string;
  industry?: IndustryCode | null;
  country?: CountryCode | null;
  region?: string | null;
  employeeCount?: number | null;
  annualRevenue?: number | null;
  techStack?: string[];
  intentSignals?: Array<{ topic: string; strength: number; at: string }>;
  engagement?: {
    websiteVisitsLast30d?: number;
    highValuePageViewsLast30d?: number; // pricing / case study / vs competitor
    emailsOpenedLast30d?: number;
    webinarAttendedLast90d?: boolean;
  };
  contacts?: Array<{ title: string; level: "ic" | "manager" | "director" | "vp" | "cxo"; isChampion?: boolean }>;
  /** Free-form tags (e.g. ["funding_series_b", "public_company"]). */
  tags?: string[];
}

export interface IcpDefinition {
  id: string;
  name: string;
  /** Weights for the four dimensions — must sum to 1.0 (normalized internally). */
  weights: {
    firmographic: number;
    technographic: number;
    intent: number;
    fit: number;
  };
  firmographic: {
    industries?: IndustryCode[];
    industriesBlocklist?: IndustryCode[];
    countries?: CountryCode[];
    minEmployees?: number;
    maxEmployees?: number;
    minRevenue?: number;
    maxRevenue?: number;
  };
  technographic: {
    requiredTools?: string[];
    anyOfTools?: string[];
    blocklistTools?: string[];
    /** Complementary stack hints that boost score but aren't required. */
    bonusTools?: string[];
  };
  intent: {
    priorityTopics: string[];
    /** Minimum aggregated intent strength to credit intent at all. */
    minAggregateStrength?: number;
  };
  fit: {
    /** Titles keywords that indicate buyer personas. */
    targetPersonaKeywords: string[];
    /** Minimum seniority level needed on the account to hit 100% fit. */
    minChampionLevel?: "manager" | "director" | "vp" | "cxo";
    /** Require at least one champion? */
    requireChampion?: boolean;
  };
  /** Accounts matching any of these are auto-disqualified. */
  disqualifiers?: {
    industries?: IndustryCode[];
    tags?: string[];
    countries?: CountryCode[];
  };
}

export type IcpTier = "A" | "B" | "C" | "D" | "disqualified";

export interface IcpScore {
  accountId: string;
  icpId: string;
  score: number; // 0..100
  tier: IcpTier;
  disqualified: boolean;
  disqualifiedReason?: string;
  breakdown: {
    firmographic: { score: number; max: number; reasons: string[] };
    technographic: { score: number; max: number; reasons: string[] };
    intent: { score: number; max: number; reasons: string[] };
    fit: { score: number; max: number; reasons: string[] };
  };
  recommendedAction: string;
}

const LEVEL_RANK: Record<NonNullable<AccountSnapshot["contacts"]>[number]["level"], number> = {
  ic: 1,
  manager: 2,
  director: 3,
  vp: 4,
  cxo: 5,
};

function normalizeWeights(w: IcpDefinition["weights"]): IcpDefinition["weights"] {
  const sum = w.firmographic + w.technographic + w.intent + w.fit;
  if (sum === 0) return { firmographic: 0.25, technographic: 0.25, intent: 0.25, fit: 0.25 };
  return {
    firmographic: w.firmographic / sum,
    technographic: w.technographic / sum,
    intent: w.intent / sum,
    fit: w.fit / sum,
  };
}

function scoreFirmographic(
  a: AccountSnapshot,
  icp: IcpDefinition,
): { score: number; reasons: string[] } {
  const rules = icp.firmographic;
  const reasons: string[] = [];
  let score = 0;
  let checks = 0;

  if (rules.industries && rules.industries.length > 0) {
    checks += 1;
    if (a.industry && rules.industries.includes(a.industry)) {
      score += 1;
      reasons.push(`Industry match: ${a.industry}`);
    } else {
      reasons.push(`Industry not on ICP list (got ${a.industry ?? "unknown"})`);
    }
  }
  if (rules.industriesBlocklist && a.industry && rules.industriesBlocklist.includes(a.industry)) {
    reasons.push(`Industry on blocklist: ${a.industry}`);
    score = Math.max(0, score - 1);
  }
  if (rules.countries && rules.countries.length > 0) {
    checks += 1;
    if (a.country && rules.countries.includes(a.country)) {
      score += 1;
      reasons.push(`Country match: ${a.country}`);
    } else {
      reasons.push(`Country not on ICP list (got ${a.country ?? "unknown"})`);
    }
  }
  if (rules.minEmployees !== undefined || rules.maxEmployees !== undefined) {
    checks += 1;
    const n = a.employeeCount ?? -1;
    const min = rules.minEmployees ?? 0;
    const max = rules.maxEmployees ?? Infinity;
    if (n >= min && n <= max) {
      score += 1;
      reasons.push(`Employee count in band: ${n}`);
    } else {
      reasons.push(`Employee count outside ${min}..${max === Infinity ? "∞" : max} (got ${n})`);
    }
  }
  if (rules.minRevenue !== undefined || rules.maxRevenue !== undefined) {
    checks += 1;
    const r = a.annualRevenue ?? -1;
    const min = rules.minRevenue ?? 0;
    const max = rules.maxRevenue ?? Infinity;
    if (r >= min && r <= max) {
      score += 1;
      reasons.push(`Revenue in band`);
    } else {
      reasons.push(`Revenue outside band`);
    }
  }
  const normalized = checks === 0 ? 0.5 : score / checks;
  return { score: normalized * 100, reasons };
}

function scoreTechnographic(
  a: AccountSnapshot,
  icp: IcpDefinition,
): { score: number; reasons: string[] } {
  const rules = icp.technographic;
  const stack = new Set((a.techStack ?? []).map((t) => t.toLowerCase()));
  const reasons: string[] = [];
  let baseScore = 0;
  let baseWeight = 0;

  if (rules.requiredTools && rules.requiredTools.length > 0) {
    baseWeight += 2;
    const missing = rules.requiredTools.filter((t) => !stack.has(t.toLowerCase()));
    if (missing.length === 0) {
      baseScore += 2;
      reasons.push(`All required tools present: ${rules.requiredTools.join(", ")}`);
    } else {
      reasons.push(`Missing required tools: ${missing.join(", ")}`);
    }
  }
  if (rules.anyOfTools && rules.anyOfTools.length > 0) {
    baseWeight += 1;
    const matched = rules.anyOfTools.filter((t) => stack.has(t.toLowerCase()));
    if (matched.length > 0) {
      baseScore += 1;
      reasons.push(`At least one ICP tool installed: ${matched.join(", ")}`);
    } else {
      reasons.push(`None of the ICP tools installed`);
    }
  }

  // Base: 0..85. Leaves 15pts of headroom for bonus tools to push >= ideal.
  let base = baseWeight === 0 ? 42.5 : Math.max(0, baseScore / baseWeight) * 85;

  if (rules.blocklistTools && rules.blocklistTools.length > 0) {
    const blocked = rules.blocklistTools.filter((t) => stack.has(t.toLowerCase()));
    if (blocked.length > 0) {
      base = Math.max(0, base - 20);
      reasons.push(`Competing tools detected: ${blocked.join(", ")}`);
    }
  }

  let bonus = 0;
  if (rules.bonusTools && rules.bonusTools.length > 0) {
    const bonusMatched = rules.bonusTools.filter((t) => stack.has(t.toLowerCase()));
    if (bonusMatched.length > 0) {
      bonus = 15 * Math.min(1, bonusMatched.length / rules.bonusTools.length);
      reasons.push(`Bonus tools present: ${bonusMatched.join(", ")}`);
    }
  }

  return { score: Math.min(100, base + bonus), reasons };
}

function scoreIntent(
  a: AccountSnapshot,
  icp: IcpDefinition,
): { score: number; reasons: string[] } {
  const signals = a.intentSignals ?? [];
  const engagement = a.engagement ?? {};
  const priority = new Set(icp.intent.priorityTopics.map((t) => t.toLowerCase()));
  const reasons: string[] = [];

  let priorityStrength = 0;
  for (const sig of signals) {
    if (priority.has(sig.topic.toLowerCase())) {
      priorityStrength += sig.strength;
    }
  }
  if (priorityStrength > 0) {
    reasons.push(`Priority-topic intent strength: ${priorityStrength.toFixed(1)}`);
  }

  // Engagement boost.
  const e = engagement;
  let engagementBoost = 0;
  if (e.websiteVisitsLast30d && e.websiteVisitsLast30d > 10) {
    engagementBoost += 10;
    reasons.push(`${e.websiteVisitsLast30d} site visits in 30d`);
  }
  if (e.highValuePageViewsLast30d && e.highValuePageViewsLast30d > 2) {
    engagementBoost += 15;
    reasons.push(`${e.highValuePageViewsLast30d} high-value page views in 30d`);
  }
  if (e.emailsOpenedLast30d && e.emailsOpenedLast30d > 3) {
    engagementBoost += 5;
  }
  if (e.webinarAttendedLast90d) {
    engagementBoost += 10;
    reasons.push(`Webinar attended in 90d`);
  }

  const minAggregate = icp.intent.minAggregateStrength ?? 0;
  if (priorityStrength < minAggregate) {
    reasons.push(`Priority intent ${priorityStrength.toFixed(1)} below min ${minAggregate}`);
  }

  // Convert priorityStrength to 0..70 curve, add engagement 0..30.
  const intentCore = Math.min(70, priorityStrength * 10);
  const engagementCore = Math.min(30, engagementBoost);
  return { score: intentCore + engagementCore, reasons };
}

function scoreFit(
  a: AccountSnapshot,
  icp: IcpDefinition,
): { score: number; reasons: string[] } {
  const contacts = a.contacts ?? [];
  const reasons: string[] = [];
  if (contacts.length === 0) {
    return { score: 0, reasons: ["No contacts engaged on account"] };
  }

  const kws = icp.fit.targetPersonaKeywords.map((k) => k.toLowerCase());
  const personaMatches = contacts.filter((c) =>
    kws.some((k) => c.title.toLowerCase().includes(k)),
  );
  let personaScore = 0;
  if (personaMatches.length > 0) {
    personaScore = Math.min(50, 20 + personaMatches.length * 10);
    reasons.push(`${personaMatches.length} persona-match contacts`);
  } else {
    reasons.push(`No titles match target personas`);
  }

  const topLevel = Math.max(...contacts.map((c) => LEVEL_RANK[c.level]));
  const minLevel = icp.fit.minChampionLevel ? LEVEL_RANK[icp.fit.minChampionLevel] : 0;
  let seniorityScore = 0;
  if (topLevel >= minLevel) {
    seniorityScore = Math.min(30, topLevel * 6);
    reasons.push(`Top seniority on account meets threshold`);
  } else {
    reasons.push(`Top seniority below minimum`);
  }

  let championScore = 0;
  const hasChampion = contacts.some((c) => c.isChampion);
  if (icp.fit.requireChampion) {
    if (hasChampion) {
      championScore = 20;
      reasons.push(`Champion identified`);
    } else {
      reasons.push(`No champion — required by ICP`);
    }
  } else {
    championScore = hasChampion ? 20 : 10;
  }

  return {
    score: Math.min(100, personaScore + seniorityScore + championScore),
    reasons,
  };
}

function checkDisqualifier(
  a: AccountSnapshot,
  icp: IcpDefinition,
): string | null {
  const dq = icp.disqualifiers ?? {};
  if (dq.industries && a.industry && dq.industries.includes(a.industry)) {
    return `Industry disqualified: ${a.industry}`;
  }
  if (dq.countries && a.country && dq.countries.includes(a.country)) {
    return `Country disqualified: ${a.country}`;
  }
  if (dq.tags && a.tags) {
    const bad = a.tags.find((t) => dq.tags!.includes(t));
    if (bad) return `Account tag disqualified: ${bad}`;
  }
  return null;
}

export function scoreAccount(
  account: AccountSnapshot,
  icp: IcpDefinition,
): IcpScore {
  const dqReason = checkDisqualifier(account, icp);
  if (dqReason) {
    return {
      accountId: account.id,
      icpId: icp.id,
      score: 0,
      tier: "disqualified",
      disqualified: true,
      disqualifiedReason: dqReason,
      breakdown: {
        firmographic: { score: 0, max: 100, reasons: [dqReason] },
        technographic: { score: 0, max: 100, reasons: [] },
        intent: { score: 0, max: 100, reasons: [] },
        fit: { score: 0, max: 100, reasons: [] },
      },
      recommendedAction: `Do not pursue — ${dqReason}`,
    };
  }

  const weights = normalizeWeights(icp.weights);
  const firm = scoreFirmographic(account, icp);
  const tech = scoreTechnographic(account, icp);
  const intent = scoreIntent(account, icp);
  const fit = scoreFit(account, icp);

  const composite =
    firm.score * weights.firmographic +
    tech.score * weights.technographic +
    intent.score * weights.intent +
    fit.score * weights.fit;

  const score = Math.round(composite * 10) / 10;
  const tier: IcpTier =
    score >= 85 ? "A" :
    score >= 70 ? "B" :
    score >= 50 ? "C" : "D";

  const recommendedAction =
    tier === "A" ? "Prioritize — assign to top AE, run outbound + content play" :
    tier === "B" ? "Nurture — add to targeted cadence; monitor for intent spike" :
    tier === "C" ? "Qualify — needs discovery to validate fit signals" :
    "Deprioritize — auto-drip only";

  return {
    accountId: account.id,
    icpId: icp.id,
    score,
    tier,
    disqualified: false,
    breakdown: {
      firmographic: { score: firm.score, max: 100, reasons: firm.reasons },
      technographic: { score: tech.score, max: 100, reasons: tech.reasons },
      intent: { score: intent.score, max: 100, reasons: intent.reasons },
      fit: { score: fit.score, max: 100, reasons: fit.reasons },
    },
    recommendedAction,
  };
}

/**
 * Score a book of accounts and return a tier distribution + top-N list.
 */
export function scoreBook(
  accounts: AccountSnapshot[],
  icp: IcpDefinition,
  topN = 50,
): {
  total: number;
  tierCounts: Record<IcpTier, number>;
  topAccounts: IcpScore[];
  all: IcpScore[];
} {
  const all = accounts.map((a) => scoreAccount(a, icp));
  const tierCounts: Record<IcpTier, number> = { A: 0, B: 0, C: 0, D: 0, disqualified: 0 };
  for (const s of all) tierCounts[s.tier]++;
  const topAccounts = [...all]
    .filter((s) => !s.disqualified)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
  return { total: all.length, tierCounts, topAccounts, all };
}
