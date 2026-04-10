/**
 * Predictive Best-Time-to-Contact Engine
 * Learns from historical call data to predict optimal contact times
 * Maximizes answer rates and conversion using Bayesian updating
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface LeadContactProfile {
  leadId: string;
  industry: string;
  timezone: string;
  sourceType: string;
  pastInteractions: CallOutcome[];
  lastContactedAt: Date | null;
  answerRate: number; // 0-1
  conversationRate: number; // 0-1
}

export interface CallOutcome {
  timestamp: Date;
  hour: number;
  dayOfWeek: number;
  answered: boolean;
  voicemail: boolean;
  converted: boolean;
}

export interface CallRecord {
  leadId: string;
  timestamp: Date;
  hour: number;
  dayOfWeek: number;
  industry: string;
  sourceType: string;
  timezone: string;
  answered: boolean;
  voicemail: boolean;
  converted: boolean;
}

export interface ContactWindow {
  bestHour: number;
  bestDayOfWeek: number;
  confidence: number;
  alternativeWindows: AlternativeWindow[];
  reasoning: string;
}

export interface AlternativeWindow {
  hour: number;
  dayOfWeek: number;
  score: number;
  answerRate: number;
}

export interface IndustryPattern {
  industry: string;
  bestHours: number[];
  bestDays: number[];
  baseAnswerRate: number;
  baseTCPACompliance: boolean;
}

export interface RankedLead {
  leadId: string;
  answerProbability: number;
  reasoning: string;
  nextBestWindow: ContactWindow;
}

export interface TimeSlot {
  hour: number;
  dayOfWeek: number;
  leadIds: string[];
  timezone: string;
  expectedAnswerRate: number;
}

export interface DailyCallPlan {
  date: Date;
  slots: TimeSlot[];
  totalExpectedAnswers: number;
  tcpaCompliant: boolean;
  summary: string;
}

// ============================================================================
// INDUSTRY BASELINES (Priors for Bayesian updating)
// ============================================================================

const INDUSTRY_PATTERNS: Record<string, IndustryPattern> = {
  "real-estate": {
    industry: "real-estate",
    bestHours: [17, 18, 19],
    bestDays: [5, 6],
    baseAnswerRate: 0.35,
    baseTCPACompliance: true,
  },
  healthcare: {
    industry: "healthcare",
    bestHours: [7, 8, 12, 13],
    bestDays: [1, 2, 3, 4, 5],
    baseAnswerRate: 0.42,
    baseTCPACompliance: true,
  },
  saas: {
    industry: "saas",
    bestHours: [9, 10, 11],
    bestDays: [1, 2, 3],
    baseAnswerRate: 0.28,
    baseTCPACompliance: true,
  },
  "b2b": {
    industry: "b2b",
    bestHours: [9, 10, 11],
    bestDays: [1, 2, 3],
    baseAnswerRate: 0.25,
    baseTCPACompliance: true,
  },
  legal: {
    industry: "legal",
    bestHours: [10, 11, 12],
    bestDays: [0, 1, 2],
    baseAnswerRate: 0.38,
    baseTCPACompliance: true,
  },
  "home-services": {
    industry: "home-services",
    bestHours: [7, 8, 9, 17, 18, 19],
    bestDays: [0, 1, 2, 3, 4, 5, 6],
    baseAnswerRate: 0.45,
    baseTCPACompliance: true,
  },
  insurance: {
    industry: "insurance",
    bestHours: [13, 14, 15, 16],
    bestDays: [1, 2, 3, 4, 5],
    baseAnswerRate: 0.32,
    baseTCPACompliance: true,
  },
  automotive: {
    industry: "automotive",
    bestHours: [10, 11, 12, 13, 14, 15, 17, 18, 19],
    bestDays: [5, 6],
    baseAnswerRate: 0.4,
    baseTCPACompliance: true,
  },
  financial: {
    industry: "financial",
    bestHours: [14, 15, 16, 17],
    bestDays: [1, 2, 3],
    baseAnswerRate: 0.33,
    baseTCPACompliance: true,
  },
};

// In-memory model: hour x day x industry x source
const MODEL: Record<
  string,
  {
    answered: number;
    total: number;
    converted: number;
  }
> = {};

// ============================================================================
// HELPER: Generate model key
// ============================================================================

function getModelKey(
  hour: number,
  day: number,
  industry: string,
  sourceType: string
): string {
  return `${hour}:${day}:${industry}:${sourceType}`;
}

// ============================================================================
// 1. PREDICT BEST CONTACT WINDOW
// ============================================================================

export function predictBestContactWindow(
  leadProfile: LeadContactProfile
): ContactWindow {
  const { industry, sourceType, timezone, pastInteractions } = leadProfile;

  // Get industry baseline
  const baseline =
    INDUSTRY_PATTERNS[industry.toLowerCase()] ||
    INDUSTRY_PATTERNS["b2b"];

  // Compute empirical data from past interactions
  const empiricalScores = computeEmpiricalScores(
    pastInteractions,
    industry,
    sourceType
  );

  // Bayesian update: combine prior with empirical
  const windowScores = bayesianUpdate(
    baseline,
    empiricalScores,
    pastInteractions.length
  );

  // Find best and alternative windows
  const sorted = Object.entries(windowScores)
    .map(([key, score]) => {
      const [h, d] = key.split(":").map(Number);
      return { hour: h, dayOfWeek: d, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = sorted[0];
  const alternatives = sorted.slice(1, 4).map((w) => ({
    hour: w.hour,
    dayOfWeek: w.dayOfWeek,
    score: w.score,
    answerRate: getAnswerRateForWindow(w.hour, w.dayOfWeek, industry, sourceType),
  }));

  const confidence = Math.min(
    1,
    (pastInteractions.length / 10) * 0.7 + best.score * 0.3
  );
  const reasoning = generateWindowReasoning(
    best,
    industry,
    confidence,
    timezone
  );

  return {
    bestHour: best.hour,
    bestDayOfWeek: best.dayOfWeek,
    confidence,
    alternativeWindows: alternatives,
    reasoning,
  };
}

// ============================================================================
// 2. UPDATE CONTACT MODEL
// ============================================================================

export function updateContactModel(callRecord: CallRecord): void {
  const {
    hour,
    dayOfWeek,
    industry,
    sourceType,
    answered,
    converted,
  } = callRecord;

  const key = getModelKey(hour, dayOfWeek, industry, sourceType);

  if (!MODEL[key]) {
    MODEL[key] = { answered: 0, total: 0, converted: 0 };
  }

  // Apply recency weighting: recent data weighted 2x
  const weight = isRecent(callRecord.timestamp) ? 2 : 1;

  MODEL[key].total += weight;
  if (answered) MODEL[key].answered += weight;
  if (converted) MODEL[key].converted += weight;
}

// ============================================================================
// 3. GET INDUSTRY CONTACT PATTERNS
// ============================================================================

export function getIndustryContactPatterns(industry: string): IndustryPattern {
  return (
    INDUSTRY_PATTERNS[industry.toLowerCase()] ||
    INDUSTRY_PATTERNS["b2b"]
  );
}

// ============================================================================
// 4. RANK LEADS FOR CURRENT WINDOW
// ============================================================================

export function rankLeadsForCurrentWindow(
  leads: LeadContactProfile[],
  currentTime: Date
): RankedLead[] {
  const hour = currentTime.getHours();
  const dayOfWeek = currentTime.getDay();

  return leads
    .map((lead) => {
      const answerProb = computeAnswerProbability(
        hour,
        dayOfWeek,
        lead.industry,
        lead.sourceType,
        lead.timezone,
        currentTime
      );

      const nextWindow = predictBestContactWindow(lead);

      return {
        leadId: lead.leadId,
        answerProbability: answerProb,
        reasoning: generateLeadRanking(lead, answerProb, hour, dayOfWeek),
        nextBestWindow: nextWindow,
      };
    })
    .sort((a, b) => b.answerProbability - a.answerProbability);
}

// ============================================================================
// 5. GENERATE DAILY CALL PLAN
// ============================================================================

export function generateDailyCallPlan(
  leads: LeadContactProfile[],
  date: Date
): DailyCallPlan {
  const slots: TimeSlot[] = [];
  const tcpaQuietStart = 21;
  const tcpaQuietEnd = 8;

  // Group leads by timezone
  const leadsByTimezone = groupBy(leads, (l) => l.timezone);

  // For each timezone, create time slots respecting TCPA
  for (const [timezone, tzLeads] of Object.entries(leadsByTimezone)) {
    for (let hour = tcpaQuietEnd; hour < tcpaQuietStart; hour++) {
      for (let day = 0; day < 7; day++) {
        // Skip weekends for most industries
        if (day === 6 || day === 0) continue;

        const testDate = new Date(date);
        testDate.setDate(testDate.getDate() + (day - testDate.getDay()));
        testDate.setHours(hour, 0, 0, 0);

        const candidateLeads = tzLeads.filter((lead) => {
          const window = predictBestContactWindow(lead);
          // Check if this hour/day matches lead's preference
          return (
            (window.bestHour === hour || window.alternativeWindows.some(w => w.hour === hour && w.dayOfWeek === day)) &&
            lead.lastContactedAt === null ||
            (lead.lastContactedAt &&
              (new Date().getTime() - lead.lastContactedAt.getTime()) >
                24 * 60 * 60 * 1000)
          );
        });

        if (candidateLeads.length > 0) {
          const avgAnswerRate =
            candidateLeads.reduce((sum, l) => sum + l.answerRate, 0) /
            candidateLeads.length;

          slots.push({
            hour,
            dayOfWeek: day,
            leadIds: candidateLeads.map((l) => l.leadId),
            timezone,
            expectedAnswerRate: avgAnswerRate,
          });
        }
      }
    }
  }

  const totalExpectedAnswers = slots.reduce(
    (sum, slot) => sum + slot.leadIds.length * slot.expectedAnswerRate,
    0
  );

  const tcpaCompliant = slots.every(
    (slot) =>
      slot.hour >= tcpaQuietEnd && slot.hour < tcpaQuietStart
  );

  return {
    date,
    slots: slots.sort((a, b) => a.hour - b.hour),
    totalExpectedAnswers,
    tcpaCompliant,
    summary: `${slots.length} slots across ${Object.keys(leadsByTimezone).length} timezones, ${Math.round(totalExpectedAnswers)} expected answers`,
  };
}

// ============================================================================
// HELPER: Bayesian update (priors + empirical)
// ============================================================================

function bayesianUpdate(
  baseline: IndustryPattern,
  empirical: Record<string, number>,
  dataPoints: number
): Record<string, number> {
  const result: Record<string, number> = {};

  for (let h = 0; h < 24; h++) {
    for (let d = 0; d < 7; d++) {
      const isBaselineHour = baseline.bestHours.includes(h);
      const isBaselineDay = baseline.bestDays.includes(d);
      const priorScore = isBaselineHour && isBaselineDay ? 0.7 : 0.3;

      const empiricalKey = `${h}:${d}`;
      const empiricalScore = empirical[empiricalKey] || 0;

      // Weight empirical data more as we have more observations
      const empiricalWeight = Math.min(0.9, dataPoints / 20);
      const priorWeight = 1 - empiricalWeight;

      result[empiricalKey] =
        priorScore * priorWeight + empiricalScore * empiricalWeight;
    }
  }

  return result;
}

// ============================================================================
// HELPER: Compute empirical scores from past interactions
// ============================================================================

function computeEmpiricalScores(
  interactions: CallOutcome[],
  _industry: string,
  _sourceType: string
): Record<string, number> {
  const scores: Record<string, number> = {};
  const windowCounts: Record<string, { answered: number; total: number }> = {};

  for (const interaction of interactions) {
    if (!isRecent(interaction.timestamp)) continue; // Skip old data

    const key = `${interaction.hour}:${interaction.dayOfWeek}`;
    if (!windowCounts[key]) {
      windowCounts[key] = { answered: 0, total: 0 };
    }

    windowCounts[key].total += 1;
    if (interaction.answered) {
      windowCounts[key].answered += 1;
    }
  }

  // Normalize to 0-1 scale
  for (const [key, counts] of Object.entries(windowCounts)) {
    scores[key] = counts.total > 0 ? counts.answered / counts.total : 0;
  }

  return scores;
}

// ============================================================================
// HELPER: Compute answer probability for a specific window
// ============================================================================

function computeAnswerProbability(
  hour: number,
  dayOfWeek: number,
  industry: string,
  sourceType: string,
  timezone: string,
  _currentTime: Date
): number {
  // Adjust for timezone offset
  const tzOffset = getTimezoneOffset(timezone);
  const localHour = (hour + tzOffset + 24) % 24;

  const key = getModelKey(localHour, dayOfWeek, industry, sourceType);
  const baseline =
    INDUSTRY_PATTERNS[industry.toLowerCase()]?.baseAnswerRate || 0.3;

  if (!MODEL[key]) {
    return baseline;
  }

  const empirical =
    MODEL[key].total > 0 ? MODEL[key].answered / MODEL[key].total : baseline;
  const dataPoints = MODEL[key].total;

  // Bayesian blend: more data → more empirical weight
  const empiricalWeight = Math.min(0.8, dataPoints / 30);
  return baseline * (1 - empiricalWeight) + empirical * empiricalWeight;
}

// ============================================================================
// HELPER: Get answer rate for a window
// ============================================================================

function getAnswerRateForWindow(
  hour: number,
  dayOfWeek: number,
  industry: string,
  sourceType: string
): number {
  const key = getModelKey(hour, dayOfWeek, industry, sourceType);
  if (!MODEL[key] || MODEL[key].total === 0) {
    return INDUSTRY_PATTERNS[industry.toLowerCase()]?.baseAnswerRate || 0.3;
  }
  // Prevent division by zero
  if (MODEL[key].total === 0) return 0;
  return MODEL[key].answered / MODEL[key].total;
}

// ============================================================================
// HELPER: Check if timestamp is recent (< 3 months)
// ============================================================================

function isRecent(timestamp: Date): boolean {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return timestamp > threeMonthsAgo;
}

// ============================================================================
// HELPER: Generate window reasoning
// ============================================================================

function generateWindowReasoning(
  best: { hour: number; dayOfWeek: number; score: number },
  industry: string,
  confidence: number,
  timezone: string
): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayName = days[best.dayOfWeek];
  const period = best.hour < 12 ? "morning" : best.hour < 18 ? "afternoon" : "evening";

  return `${dayName} ${best.hour}:00 (${period}) has ${Math.round(confidence * 100)}% confidence based on ${industry} patterns and historical data in ${timezone}`;
}

// ============================================================================
// HELPER: Generate lead ranking reasoning
// ============================================================================

function generateLeadRanking(
  lead: LeadContactProfile,
  probability: number,
  currentHour: number,
  currentDay: number
): string {
  const answerChance = Math.round(probability * 100);
  const dayName = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ][currentDay];

  return `${answerChance}% chance to answer right now (${dayName} ${currentHour}:00); source: ${lead.sourceType}`;
}

// ============================================================================
// HELPER: Group by utility
// ============================================================================

function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string
): Record<string, T[]> {
  return items.reduce(
    (acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

// ============================================================================
// HELPER: Get timezone offset (simplified)
// ============================================================================

function getTimezoneOffset(timezone: string): number {
  const offsets: Record<string, number> = {
    "US/Eastern": -5,
    "US/Central": -6,
    "US/Mountain": -7,
    "US/Pacific": -8,
    "US/Alaska": -9,
    "US/Hawaii": -10,
    "Europe/London": 0,
    "Europe/Paris": 1,
    "Asia/Tokyo": 9,
    "Asia/Shanghai": 8,
    "Australia/Sydney": 10,
  };
  return offsets[timezone] || 0;
}
