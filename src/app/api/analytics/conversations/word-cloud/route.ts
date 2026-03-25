/**
 * GET /api/analytics/conversations/word-cloud
 * Analyzes recent call transcripts to generate word frequency data.
 * Query params: workspace_id, limit (default 50)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

type WordCloudWord = {
  text: string;
  value: number;
};

type WordCloudResponse = {
  words: WordCloudWord[];
  generated_at: string;
};

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
  "that", "this", "these", "those", "what", "which", "who", "when", "where", "why", "how",
  "can", "could", "would", "should", "will", "shall", "may", "might", "must",
  "as", "if", "about", "above", "after", "before", "between", "down", "during",
  "just", "out", "over", "through", "up", "very", "own", "so", "than", "too",
  "our", "their", "my", "his", "her", "its", "from", "get", "got", "got", "go",
  "think", "want", "like", "need", "help", "use", "right", "call", "say", "said",
  "ok", "yeah", "yes", "no", "sure", "thanks", "thank", "great", "good", "well",
  "agent", "agent's", "user", "lead", "prospect", "customer", "rep", "representative",
]);

function extractWords(text: string | null): Record<string, number> {
  if (!text) return {};

  const words = text.toLowerCase().split(/\s+/);
  const freq: Record<string, number> = {};

  for (const word of words) {
    // Remove punctuation
    const clean = word.replace(/[^a-z0-9]/g, "").trim();

    // Skip empty, too short, or stop words
    if (clean.length < 4 || STOP_WORDS.has(clean)) {
      continue;
    }

    freq[clean] = (freq[clean] ?? 0) + 1;
  }

  return freq;
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  const limitParam = req.nextUrl.searchParams.get("limit") || "50";
  const limit = Math.min(Math.max(1, parseInt(limitParam) || 50), 200);

  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch recent transcripts
    const { data: calls, error: callsErr } = await db
      .from("call_sessions")
      .select("transcript_text")
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", sevenDaysAgo.toISOString())
      .not("transcript_text", "is", null)
      .order("call_started_at", { ascending: false })
      .limit(100);

    if (callsErr) {
      console.error("[word-cloud] query failed:", callsErr.message);
      return NextResponse.json({ error: "Failed to load transcripts" }, { status: 500 });
    }

    // Aggregate word frequencies
    const allFreq: Record<string, number> = {};

    for (const call of calls ?? []) {
      const freq = extractWords(call.transcript_text as string | null);
      for (const [word, count] of Object.entries(freq)) {
        allFreq[word] = (allFreq[word] ?? 0) + count;
      }
    }

    // Convert to array and sort by frequency
    const words: WordCloudWord[] = Object.entries(allFreq)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

    const response: WordCloudResponse = {
      words,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[analytics/word-cloud]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
