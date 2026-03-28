/**
 * GET /api/analytics/conversations/talk-tracks
 * Identifies winning and losing talk tracks from successful/unsuccessful calls.
 * Query params: workspace_id, range (7d|30d|90d)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { log } from "@/lib/logger";

type WinningTrack = {
  phrase: string;
  context: string;
  success_rate: number;
  usage_count: number;
};

type LosingTrack = {
  phrase: string;
  context: string;
  failure_rate: number;
  alternative: string;
};

type TalkTracksResponse = {
  winning_tracks: WinningTrack[];
  losing_tracks: LosingTrack[];
};

// Common phrases and keywords to track
const COMMON_PHRASES = [
  "how are you", "good morning", "good afternoon",
  "is there anything", "can i help", "what brings you",
  "let me show you", "based on", "i understand",
  "the benefit of", "that way you", "this will help",
  "does that sound", "make sense", "would you like",
  "can we schedule", "let's set up", "next step",
  "i appreciate", "thank you for", "looking forward",
];

function extractPhrasesFromTranscript(text: string | null): string[] {
  if (!text) return [];

  const lowerText = text.toLowerCase();
  const foundPhrases: string[] = [];

  for (const phrase of COMMON_PHRASES) {
    if (lowerText.includes(phrase)) {
      foundPhrases.push(phrase);
    }
  }

  return foundPhrases;
}

function getRangeStart(range: string): Date {
  const now = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 7;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return start;
}

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  const range = req.nextUrl.searchParams.get("range") || "7d";

  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();
    const rangeStart = getRangeStart(range);

    // Fetch calls with their outcomes
    const { data: calls, error: callsErr } = await db
      .from("call_sessions")
      .select(`
        id, transcript_text, outcome, call_started_at, call_ended_at
      `)
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", rangeStart.toISOString())
      .not("transcript_text", "is", null);

    if (callsErr) {
      log("error", "analytics.talk_tracks.GET", { error: callsErr.message });
      return NextResponse.json({ error: "Failed to load calls" }, { status: 500 });
    }

    // Fetch appointments for conversion tracking
    const { data: appointments } = await db
      .from("appointments")
      .select("call_session_id")
      .eq("workspace_id", workspaceId)
      .gte("created_at", rangeStart.toISOString())
      .in("status", ["confirmed", "completed"]);

    const successfulCallIds = new Set(
      appointments
        ?.filter((a) => a.call_session_id)
        .map((a) => a.call_session_id as string) ?? []
    );

    // Track phrase usage by outcome
    const phraseStats: Record<string, { successful: number; failed: number; contexts: string[] }> = {};

    for (const call of calls ?? []) {
      const callId = call.id as string;
      const transcript = call.transcript_text as string | null;
      const isSuccessful = successfulCallIds.has(callId) || call.outcome === "successful" || call.outcome === "booked";

      const phrases = extractPhrasesFromTranscript(transcript);

      for (const phrase of phrases) {
        if (!phraseStats[phrase]) {
          phraseStats[phrase] = { successful: 0, failed: 0, contexts: [] };
        }

        if (isSuccessful) {
          phraseStats[phrase].successful++;
        } else {
          phraseStats[phrase].failed++;
        }

        // Store context (snippet around phrase)
        if (transcript && phraseStats[phrase].contexts.length < 2) {
          const idx = transcript.toLowerCase().indexOf(phrase);
          if (idx !== -1) {
            const start = Math.max(0, idx - 30);
            const end = Math.min(transcript.length, idx + phrase.length + 30);
            const context = transcript.substring(start, end).trim();
            phraseStats[phrase].contexts.push(context);
          }
        }
      }
    }

    // Calculate success rates and categorize
    const winningTracks: WinningTrack[] = [];
    const losingTracks: LosingTrack[] = [];

    for (const [phrase, stats] of Object.entries(phraseStats)) {
      const total = stats.successful + stats.failed;
      if (total < 2) continue; // Only consider phrases used at least twice

      const successRate = stats.successful / total;

      if (successRate >= 0.6) {
        // Winning track: >60% success rate
        winningTracks.push({
          phrase,
          context: stats.contexts[0] || phrase,
          success_rate: parseFloat(successRate.toFixed(3)),
          usage_count: total,
        });
      } else if (successRate <= 0.3) {
        // Losing track: <30% success rate
        const alternativeMap: Record<string, string> = {
          "is there anything": "can I help you with",
          "how are you": "how's everything going",
          "good morning": "welcome",
          "let me show you": "let me walk you through",
          "based on": "looking at your situation",
          "the benefit of": "what you'll get",
          "does that sound": "does that work for you",
          "can we schedule": "let's lock in a time",
          "next step": "what comes next",
        };

        losingTracks.push({
          phrase,
          context: stats.contexts[0] || phrase,
          failure_rate: parseFloat((1 - successRate).toFixed(3)),
          alternative: alternativeMap[phrase] || "try a different approach",
        });
      }
    }

    // Sort by usage/effectiveness
    winningTracks.sort((a, b) => b.success_rate - a.success_rate);
    losingTracks.sort((a, b) => b.failure_rate - a.failure_rate);

    const response: TalkTracksResponse = {
      winning_tracks: winningTracks.slice(0, 10),
      losing_tracks: losingTracks.slice(0, 10),
    };

    return NextResponse.json(response);
  } catch (error) {
    log("error", "analytics.talk_tracks.GET", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
