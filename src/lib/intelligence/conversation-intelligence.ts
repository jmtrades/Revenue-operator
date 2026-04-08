/**
 * Conversation Intelligence Analyzer
 * Extracts insights, scores performance, identifies coaching opportunities,
 * and aggregates team-wide patterns from call transcripts.
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface Utterance {
  speaker: "sales" | "prospect";
  text: string;
  timestamp: number; // seconds from call start
  duration?: number; // seconds
}

export interface CallTranscript {
  callId: string;
  duration: number; // seconds
  startTime: string; // ISO 8601
  utterances: Utterance[];
  recordingUrl?: string;
}

export interface SentimentPoint {
  timestamp: number;
  sentiment: "positive" | "neutral" | "negative";
  score: number; // -1 to 1
}

export interface ConversationAnalysis {
  callId: string;
  talkListenRatio: { talkPercent: number; listenPercent: number };
  longestMonologueSeconds: number;
  questionCount: { total: number; open: number; closed: number };
  fillerWords: Record<string, number>;
  keyTopics: Array<{ topic: string; mentions: number; context: string[] }>;
  sentimentTrajectory: { start: number; middle: number; end: number };
  prospectEngagement: { questionCount: number; interestSignals: string[] };
  callDuration: number;
  utteranceCount: number;
}

export interface CallScore {
  discoveryQuality: number; // 0-20
  rapportBuilding: number; // 0-20
  valueArticulation: number; // 0-20
  objectionHandling: number; // 0-20
  closeAttempt: number; // 0-20
  overallScore: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
}

export interface CoachingInsight {
  category: "talk-ratio" | "listening" | "questions" | "objections" | "signals" | "techniques";
  title: string;
  description: string;
  example?: string;
  timestamp?: number;
  impact: "high" | "medium" | "low";
  priority: number; // 1-10, higher = more important
}

export interface KeyMoment {
  timestamp: number;
  type: "buying-signal" | "risk-signal" | "breakthrough" | "objection";
  text: string;
  speaker: "sales" | "prospect";
  context: string;
}

export interface TeamInsights {
  teamSize: number;
  averageTalkRatio: number;
  averageScore: number;
  commonObjections: Array<{ objection: string; frequency: number; topResponse?: string }>;
  topTechniques: Array<{ technique: string; frequency: number; successRate: number }>;
  commonGaps: string[];
  topPerformerTechniques: string[];
  winPatterns: string[];
  lossPatterns: string[];
}

export interface CompetitorMention {
  competitorName: string;
  timestamp: number;
  context: string;
  sentiment: "positive" | "neutral" | "negative";
  aspectMentioned: string; // e.g., "pricing", "features", "support"
  prospectOpinion: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FILLER_WORDS = ["um", "uh", "like", "you know", "basically", "literally", "actually", "so", "well"];
const OPEN_QUESTION_STARTERS = ["what", "how", "why", "tell me", "describe", "explain", "share"];
const CLOSED_QUESTION_PATTERNS = ["is ", "are ", "did ", "do ", "can ", "could ", "will ", "would ", "have "];
const BUYING_SIGNALS = [
  "pricing",
  "cost",
  "implementation",
  "timeline",
  "next step",
  "when can we",
  "how soon",
  "contract",
  "terms",
];
const RISK_SIGNALS = ["competitor", "hesitat", "not sure", "need to check", "talk to", "concerns", "cancel"];
const BREAKTHROUGH_PHRASES = ["exactly what we need", "that solves", "perfect", "love that", "that's it"];

// ============================================================================
// MAIN ANALYSIS FUNCTIONS
// ============================================================================

export function analyzeConversation(transcript: CallTranscript): ConversationAnalysis {
  // Calculate talk-to-listen ratio
  const salesUtterances = transcript.utterances.filter((u) => u.speaker === "sales");
  const prospectUtterances = transcript.utterances.filter((u) => u.speaker === "prospect");

  const salesDuration = salesUtterances.reduce((sum, u) => sum + (u.duration || 0), 0);
  const prospectDuration = prospectUtterances.reduce((sum, u) => sum + (u.duration || 0), 0);
  const totalDuration = salesDuration + prospectDuration || 1;

  const talkPercent = Math.round((salesDuration / totalDuration) * 100);
  const listenPercent = 100 - talkPercent;

  // Find longest monologue
  let longestMonologue = 0;
  let currentMonologue = 0;
  let lastSpeaker: "sales" | "prospect" | null = null;

  for (const u of transcript.utterances) {
    if (u.speaker === lastSpeaker) {
      currentMonologue += u.duration || 0;
    } else {
      longestMonologue = Math.max(longestMonologue, currentMonologue);
      currentMonologue = u.duration || 0;
      lastSpeaker = u.speaker;
    }
  }
  longestMonologue = Math.max(longestMonologue, currentMonologue);

  // Count questions
  const salesText = salesUtterances.map((u) => u.text.toLowerCase()).join(" ");
  const openQuestions = OPEN_QUESTION_STARTERS.filter((s) => salesText.includes(s)).length;
  const closedQuestions = CLOSED_QUESTION_PATTERNS.filter((p) => new RegExp(p).test(salesText)).length;
  const questionCount = {
    total: openQuestions + closedQuestions,
    open: openQuestions,
    closed: closedQuestions,
  };

  // Count filler words
  const allText = transcript.utterances.map((u) => u.text.toLowerCase()).join(" ");
  const fillerWords: Record<string, number> = {};
  for (const filler of FILLER_WORDS) {
    const count = (allText.match(new RegExp(`\\b${filler}\\b`, "g")) || []).length;
    if (count > 0) fillerWords[filler] = count;
  }

  // Extract key topics
  const topicKeywords = {
    pricing: ["price", "cost", "budget", "investment", "expensive"],
    timeline: ["when", "timeline", "deadline", "schedule", "soon"],
    competition: ["competitor", "alternative", "vs", "instead of"],
    "pain points": ["problem", "challenge", "struggling", "difficult", "pain"],
    objections: ["but", "however", "concern", "worry", "hesit"],
  };

  const keyTopics: Array<{ topic: string; mentions: number; context: string[] }> = [];
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    const mentions = keywords.filter((kw) => allText.includes(kw.toLowerCase())).length;
    if (mentions > 0) {
      const context = transcript.utterances
        .filter((u) => keywords.some((kw) => u.text.toLowerCase().includes(kw.toLowerCase())))
        .slice(0, 3)
        .map((u) => u.text.substring(0, 100));
      keyTopics.push({ topic, mentions, context });
    }
  }

  // Sentiment trajectory
  const sentimentStart = calculateSentiment(salesUtterances.slice(0, Math.ceil(salesUtterances.length * 0.2)));
  const sentimentEnd = calculateSentiment(salesUtterances.slice(Math.floor(salesUtterances.length * 0.8)));
  const sentimentMiddle = calculateSentiment(
    salesUtterances.slice(
      Math.ceil(salesUtterances.length * 0.35),
      Math.ceil(salesUtterances.length * 0.65),
    ),
  );

  // Prospect engagement
  const prospectText = prospectUtterances.map((u) => u.text.toLowerCase()).join(" ");
  const prospectQuestionCount = (
    OPEN_QUESTION_STARTERS.concat(CLOSED_QUESTION_PATTERNS)
  ).filter((p) => prospectText.includes(p)).length;

  const interestSignals: string[] = [];
  const buyingSignalPhrases = ["that sounds", "interesting", "tell me more", "how much", "when can"];
  for (const phrase of buyingSignalPhrases) {
    if (prospectText.includes(phrase)) interestSignals.push(phrase);
  }

  return {
    callId: transcript.callId,
    talkListenRatio: { talkPercent, listenPercent },
    longestMonologueSeconds: longestMonologue,
    questionCount,
    fillerWords,
    keyTopics: keyTopics.sort((a, b) => b.mentions - a.mentions),
    sentimentTrajectory: {
      start: sentimentStart,
      middle: sentimentMiddle,
      end: sentimentEnd,
    },
    prospectEngagement: {
      questionCount: prospectQuestionCount,
      interestSignals,
    },
    callDuration: transcript.duration,
    utteranceCount: transcript.utterances.length,
  };
}

export function scoreCallPerformance(analysis: ConversationAnalysis): CallScore {
  // Discovery quality: Did they uncover needs? (open questions, listen ratio)
  const discoveryQuality = Math.min(
    20,
    Math.floor((analysis.questionCount.open / Math.max(1, analysis.questionCount.total)) * 15 +
      (analysis.talkListenRatio.listenPercent > 50 ? 5 : 0)),
  );

  // Rapport building: Active listening signals, talk ratio balance
  const rapportBuilding = Math.min(
    20,
    Math.floor(
      (analysis.talkListenRatio.listenPercent > 55 ? 10 : 5) +
        (analysis.longestMonologueSeconds < 120 ? 10 : 5),
    ),
  );

  // Value articulation: Clear benefits communicated (topics discussed)
  const valueArticulation = Math.min(
    20,
    Math.floor(analysis.keyTopics.length * 3 + (analysis.sentimentTrajectory.end > 0.3 ? 5 : 0)),
  );

  // Objection handling: Addressed concerns (topic mentions, sentiment recovery)
  const objectionCount = analysis.keyTopics.filter((t) => t.topic === "objections").length;
  const objectionHandling = Math.min(
    20,
    Math.floor(
      objectionCount * 5 +
        (analysis.sentimentTrajectory.end > analysis.sentimentTrajectory.middle ? 5 : 0),
    ),
  );

  // Close attempt: Asked for next step (buying signals in sales utterances)
  const closeAttempt = analysis.keyTopics.some((t) => t.topic === "timeline" || t.topic === "pricing") ? 15 : 5;

  const overallScore = Math.min(
    100,
    discoveryQuality + rapportBuilding + valueArticulation + objectionHandling + closeAttempt,
  );

  const grade: "A" | "B" | "C" | "D" | "F" =
    overallScore >= 90 ? "A" : overallScore >= 80 ? "B" : overallScore >= 70 ? "C" : overallScore >= 60 ? "D" : "F";

  return {
    discoveryQuality,
    rapportBuilding,
    valueArticulation,
    objectionHandling,
    closeAttempt,
    overallScore,
    grade,
  };
}

export function extractCoachingInsights(
  analysis: ConversationAnalysis,
  score: CallScore,
): CoachingInsight[] {
  const insights: CoachingInsight[] = [];

  // Talk ratio coaching
  if (analysis.talkListenRatio.talkPercent > 65) {
    insights.push({
      category: "talk-ratio",
      title: "Reduce your talk time",
      description: `You spoke for ${analysis.talkListenRatio.talkPercent}% of the call. Target 40-50% to let prospects share more.`,
      impact: "high",
      priority: 10,
    });
  }

  // Monologue coaching
  if (analysis.longestMonologueSeconds > 180) {
    insights.push({
      category: "listening",
      title: "Break up long monologues",
      description: `Your longest speech was ${Math.round(analysis.longestMonologueSeconds)} seconds. Keep monologues under 2 minutes.`,
      impact: "high",
      priority: 9,
    });
  }

  // Question quality
  if (analysis.questionCount.open === 0) {
    insights.push({
      category: "questions",
      title: "Ask more open-ended questions",
      description: "You asked only closed questions. Use 'What', 'How', 'Tell me' to let prospects elaborate.",
      impact: "high",
      priority: 9,
    });
  } else if (analysis.questionCount.closed > analysis.questionCount.open * 2) {
    insights.push({
      category: "questions",
      title: "Balance question types",
      description: `You asked ${analysis.questionCount.closed} closed vs ${analysis.questionCount.open} open questions. Increase open questions for discovery.`,
      impact: "medium",
      priority: 7,
    });
  }

  // Filler words
  const totalFillers = Object.values(analysis.fillerWords).reduce((a, b) => a + b, 0);
  if (totalFillers > 15) {
    const topFiller = Object.entries(analysis.fillerWords).sort((a, b) => b[1] - a[1])[0];
    insights.push({
      category: "techniques",
      title: "Reduce filler words",
      description: `You said "${topFiller[0]}" ${topFiller[1]} times. Pause instead of filling silence.`,
      impact: "medium",
      priority: 5,
    });
  }

  // Objection handling
  if (score.objectionHandling < 10) {
    insights.push({
      category: "objections",
      title: "Improve objection handling",
      description: "You didn't effectively address prospect concerns. Acknowledge, explore, and reframe objections.",
      impact: "high",
      priority: 8,
    });
  }

  // Discovery quality
  if (score.discoveryQuality < 10) {
    insights.push({
      category: "talk-ratio",
      title: "Focus on discovery",
      description: "Ask more discovery questions before diving into solutions. Uncover specific needs first.",
      impact: "high",
      priority: 10,
    });
  }

  // Positive sentiment boost
  if (analysis.sentimentTrajectory.end > 0.6) {
    insights.push({
      category: "techniques",
      title: "Strong closing energy",
      description: "Prospect sentiment improved during the call. This positive momentum was well-maintained.",
      impact: "medium",
      priority: 2,
    });
  }

  return insights.sort((a, b) => b.priority - a.priority);
}

export function detectKeyMoments(transcript: CallTranscript): KeyMoment[] {
  const moments: KeyMoment[] = [];

  for (const u of transcript.utterances) {
    const text = u.text.toLowerCase();

    // Buying signals
    for (const signal of BUYING_SIGNALS) {
      if (text.includes(signal)) {
        moments.push({
          timestamp: u.timestamp,
          type: "buying-signal",
          text: u.text,
          speaker: u.speaker,
          context: signal,
        });
      }
    }

    // Risk signals
    for (const signal of RISK_SIGNALS) {
      if (text.includes(signal)) {
        moments.push({
          timestamp: u.timestamp,
          type: "risk-signal",
          text: u.text,
          speaker: u.speaker,
          context: signal,
        });
      }
    }

    // Breakthrough moments
    for (const phrase of BREAKTHROUGH_PHRASES) {
      if (text.includes(phrase)) {
        moments.push({
          timestamp: u.timestamp,
          type: "breakthrough",
          text: u.text,
          speaker: u.speaker,
          context: phrase,
        });
      }
    }

    // Objection moments
    if (text.match(/\b(but|however|concern|worry|hesitat|objection)\b/)) {
      moments.push({
        timestamp: u.timestamp,
        type: "objection",
        text: u.text,
        speaker: u.speaker,
        context: "objection",
      });
    }
  }

  return moments.sort((a, b) => a.timestamp - b.timestamp);
}

export function aggregateTeamInsights(analyses: ConversationAnalysis[]): TeamInsights {
  if (analyses.length === 0) {
    return {
      teamSize: 0,
      averageTalkRatio: 0,
      averageScore: 0,
      commonObjections: [],
      topTechniques: [],
      commonGaps: [],
      topPerformerTechniques: [],
      winPatterns: [],
      lossPatterns: [],
    };
  }

  const avgTalkRatio =
    analyses.reduce((sum, a) => sum + a.talkListenRatio.talkPercent, 0) / analyses.length;

  // Placeholder for actual scores (would be passed separately in real implementation)
  const avgScore = 75;

  // Aggregate topics
  const allTopics: Record<string, number> = {};
  for (const analysis of analyses) {
    for (const topic of analysis.keyTopics) {
      allTopics[topic.topic] = (allTopics[topic.topic] || 0) + topic.mentions;
    }
  }

  const topTechniques = Object.entries(allTopics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([technique, frequency]) => ({
      technique,
      frequency,
      successRate: 0.75, // Conservative baseline
    }));

  const commonGaps = [
    avgTalkRatio > 55 ? "Reduce talk time - let prospects speak more" : undefined,
    analyses.some((a) => a.questionCount.open === 0) ? "Improve open-ended questions" : undefined,
    analyses.some((a) => Object.values(a.fillerWords).reduce((a, b) => a + b, 0) > 20)
      ? "Reduce filler words"
      : undefined,
  ].filter((g) => g !== undefined) as string[];

  return {
    teamSize: analyses.length,
    averageTalkRatio: Math.round(avgTalkRatio),
    averageScore: avgScore,
    commonObjections: Object.entries(allTopics)
      .filter(([k]) => k.includes("object"))
      .map(([objection, frequency]) => ({
        objection,
        frequency,
        topResponse: "Acknowledge and reframe",
      })),
    topTechniques,
    commonGaps,
    topPerformerTechniques: ["Ask discovery questions", "Balance talk-to-listen", "Handle objections smoothly"],
    winPatterns: ["High engagement in discovery", "Strong rapport with prospects", "Clear value articulation"],
    lossPatterns: [
      "Talking too much without discovery",
      "Not addressing objections",
      "Poor closing attempt",
    ],
  };
}

export function extractCompetitorMentions(transcript: CallTranscript): CompetitorMention[] {
  const mentions: CompetitorMention[] = [];
  const competitors = ["salesforce", "hubspot", "pipedrive", "freshworks", "zendesk", "intercom"];

  for (const u of transcript.utterances) {
    const text = u.text.toLowerCase();

    for (const competitor of competitors) {
      if (text.includes(competitor)) {
        const sentiment = text.includes("better") || text.includes("prefer")
          ? "negative"
          : text.includes("good") || text.includes("like")
            ? "positive"
            : "neutral";

        const aspects = {
          pricing: text.includes("price") || text.includes("cost"),
          features: text.includes("feature") || text.includes("capability"),
          support: text.includes("support") || text.includes("service"),
          ease: text.includes("easy") || text.includes("simple"),
        };

        const aspectMentioned = Object.entries(aspects)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(", ");

        mentions.push({
          competitorName: competitor,
          timestamp: u.timestamp,
          context: u.text.substring(0, 150),
          sentiment,
          aspectMentioned: aspectMentioned || "general",
          prospectOpinion: text.includes("love") || text.includes("great") ? "positive" : "mixed",
        });
      }
    }
  }

  return mentions;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateSentiment(utterances: Utterance[]): number {
  if (utterances.length === 0) return 0;

  const positiveWords = ["great", "love", "amazing", "excellent", "perfect", "wonderful", "good"];
  const negativeWords = ["bad", "terrible", "awful", "hate", "problem", "issue", "concern"];

  let score = 0;
  for (const u of utterances) {
    const text = u.text.toLowerCase();
    for (const word of positiveWords) {
      if (text.includes(word)) score += 0.2;
    }
    for (const word of negativeWords) {
      if (text.includes(word)) score -= 0.2;
    }
  }

  return Math.max(-1, Math.min(1, score / Math.max(1, utterances.length)));
}
