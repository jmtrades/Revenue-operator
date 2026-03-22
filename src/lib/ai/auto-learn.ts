/**
 * Auto-Learning Engine - Makes the agent smarter after every call
 * Extracts insights from call outcomes and builds a persistent knowledge base
 */

import { getDb } from "@/lib/db/queries";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface TextContent {
  text: string;
}

interface MessageResponse {
  content: TextContent[];
}

export type CallOutcome =
  | "booked"
  | "no_show"
  | "hung_up"
  | "voicemail"
  | "transferred"
  | "declined"
  | "interested_followup"
  | "not_interested"
  | "technical_issue";

export interface CallLearning {
  callId: string;
  workspaceId: string;
  outcome: CallOutcome;
  whatWorked: string[];
  whatDidntWork: string[];
  newObjections: string[];
  newFaqQuestions: string[];
  scriptImprovements: string[];
  phrasesGetPositiveResponse: string[];
  engagementTriggers: string[];
  extractedAt: Date;
}

export interface AccumulatedLearnings {
  totalCallsAnalyzed: number;
  topPhrasesthatWork: Array<{ phrase: string; frequency: number }>;
  commonObjections: Array<{ objection: string; count: number }>;
  faqGapsFilled: string[];
  scriptImprovementsSuggested: string[];
  successPatterns: string[];
  failurePatterns: string[];
  recommendedToneAdjustments: string[];
  lastUpdated: Date;
}

async function callClaudeApi(prompt: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-1",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as MessageResponse;
  const content = data.content[0];
  if (!content || typeof content !== 'object' || !('text' in content)) {
    throw new Error("Unexpected response format from Claude API");
  }
  return content.text;
}

export async function analyzeCallAndLearn(
  workspaceId: string,
  callId: string,
  transcript: string,
  outcome: CallOutcome
): Promise<CallLearning> {
  const prompt = `You are an expert sales coach analyzing a call transcript. Extract actionable insights that will help improve the AI agent's performance on future calls.

CALL TRANSCRIPT:
${transcript}

CALL OUTCOME: ${outcome}

Analyze this call and respond with ONLY valid JSON (no markdown, no explanation):
{
  "whatWorked": ["specific phrase or technique used", ...], // 3-5 things that worked well
  "whatDidntWork": ["specific moment or approach that failed", ...], // 2-4 things that failed
  "newObjections": ["objection never mentioned before", ...], // Any new objections heard
  "newFaqQuestions": ["question the lead asked that wasn't answered", ...], // FAQ gaps
  "scriptImprovements": ["suggestion for improvement", ...], // 2-3 specific improvements
  "phrasesGetPositiveResponse": ["exact phrase that got positive response", ...], // Word-for-word phrases
  "engagementTriggers": ["topic or question that increased engagement", ...] // What kept them engaged
}

Be specific and extract EXACT phrases from the transcript when possible.`;

  const result = await callClaudeApi(prompt);

  try {
    let jsonStr = result;
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);

    const learning: CallLearning = {
      callId,
      workspaceId,
      outcome,
      whatWorked: Array.isArray(parsed.whatWorked) ? parsed.whatWorked : [],
      whatDidntWork: Array.isArray(parsed.whatDidntWork)
        ? parsed.whatDidntWork
        : [],
      newObjections: Array.isArray(parsed.newObjections)
        ? parsed.newObjections
        : [],
      newFaqQuestions: Array.isArray(parsed.newFaqQuestions)
        ? parsed.newFaqQuestions
        : [],
      scriptImprovements: Array.isArray(parsed.scriptImprovements)
        ? parsed.scriptImprovements
        : [],
      phrasesGetPositiveResponse: Array.isArray(
        parsed.phrasesGetPositiveResponse
      )
        ? parsed.phrasesGetPositiveResponse
        : [],
      engagementTriggers: Array.isArray(parsed.engagementTriggers)
        ? parsed.engagementTriggers
        : [],
      extractedAt: new Date(),
    };

    // Store the learning in the database
    const db = getDb();
    await db.from("workspace_settings").upsert(
      {
        workspace_id: workspaceId,
        setting_key: `call_learning_${callId}`,
        setting_value: JSON.stringify(learning),
      },
      { onConflict: "workspace_id,setting_key" }
    );

    return learning;
  } catch (err) {
    console.error("Failed to parse learning response:", err);
    throw new Error("Failed to analyze call for learning");
  }
}

export async function getAccumulatedLearnings(
  workspaceId: string
): Promise<AccumulatedLearnings> {
  const db = getDb();

  // Fetch all learning records for this workspace
  const { data: learnings, error } = await db
    .from("workspace_settings")
    .select("setting_value")
    .eq("workspace_id", workspaceId)
    .like("setting_key", "call_learning_%");

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  const callLearnings: CallLearning[] = [];

  if (learnings && Array.isArray(learnings)) {
    for (const record of learnings) {
      const row = record as { setting_value: string };
      try {
        const learning = JSON.parse(row.setting_value) as CallLearning;
        callLearnings.push(learning);
      } catch {
        // Skip invalid records
      }
    }
  }

  if (callLearnings.length === 0) {
    return {
      totalCallsAnalyzed: 0,
      topPhrasesthatWork: [],
      commonObjections: [],
      faqGapsFilled: [],
      scriptImprovementsSuggested: [],
      successPatterns: [],
      failurePatterns: [],
      recommendedToneAdjustments: [],
      lastUpdated: new Date(),
    };
  }

  // Aggregate the learnings
  const phraseFrequency: Record<string, number> = {};
  const objectionFrequency: Record<string, number> = {};
  const allFaqGaps: string[] = [];
  const allScriptImprovements: string[] = [];
  const allWhatWorked: string[] = [];
  const allWhatDidntWork: string[] = [];

  for (const learning of callLearnings) {
    // Count phrase frequencies
    for (const phrase of learning.phrasesGetPositiveResponse) {
      phraseFrequency[phrase] = (phraseFrequency[phrase] || 0) + 1;
    }

    // Count objection frequencies
    for (const objection of learning.newObjections) {
      objectionFrequency[objection] = (objectionFrequency[objection] || 0) + 1;
    }

    allFaqGaps.push(...learning.newFaqQuestions);
    allScriptImprovements.push(...learning.scriptImprovements);
    allWhatWorked.push(...learning.whatWorked);
    allWhatDidntWork.push(...learning.whatDidntWork);
  }

  // Convert to arrays and sort by frequency
  const topPhrases = Object.entries(phraseFrequency)
    .map(([phrase, frequency]) => ({ phrase, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  const commonObjections = Object.entries(objectionFrequency)
    .map(([objection, count]) => ({ objection, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Remove duplicates
  const uniqueFaqGaps = Array.from(new Set(allFaqGaps));
  const uniqueScriptImprovements = Array.from(new Set(allScriptImprovements));
  const successPatterns = Array.from(new Set(allWhatWorked)).slice(0, 5);
  const failurePatterns = Array.from(new Set(allWhatDidntWork)).slice(0, 5);

  // Calculate success rate to determine tone adjustments
  const successfulOutcomes = callLearnings.filter((l) =>
    ["booked", "interested_followup"].includes(l.outcome)
  ).length;

  const successRate = successfulOutcomes / callLearnings.length;
  const toneAdjustments: string[] = [];

  if (successRate > 0.7) {
    toneAdjustments.push("Agent is performing well - maintain current approach");
  } else if (successRate > 0.5) {
    toneAdjustments.push("Improve engagement - try being more consultative");
    toneAdjustments.push("Listen more, talk less");
  } else {
    toneAdjustments.push(
      "Significant improvements needed - focus on discovery questions"
    );
    toneAdjustments.push("Build more rapport before presenting solutions");
  }

  return {
    totalCallsAnalyzed: callLearnings.length,
    topPhrasesthatWork: topPhrases,
    commonObjections,
    faqGapsFilled: uniqueFaqGaps.slice(0, 10),
    scriptImprovementsSuggested: uniqueScriptImprovements.slice(0, 5),
    successPatterns,
    failurePatterns,
    recommendedToneAdjustments: toneAdjustments,
    lastUpdated: new Date(),
  };
}
