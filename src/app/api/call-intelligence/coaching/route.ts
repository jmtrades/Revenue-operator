/**
 * POST /api/call-intelligence/coaching
 * Accepts a call transcript and returns real-time coaching suggestions.
 * Optionally saves results to call_coaching_results table if call_id provided.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";

const COACHING_PROMPT = `You are an expert sales coaching system. Analyze this call transcript and provide actionable coaching feedback across these key dimensions:

1. **Opening Strength** - Does the agent establish rapport and set clear agenda?
2. **Discovery Quality** - Does the agent ask effective discovery questions and listen actively?
3. **Objection Handling** - How well does the agent handle objections and concerns?
4. **Closing Technique** - Is the agent effective at moving toward commitment/next steps?
5. **Rapport Building** - Does the agent build trust and connection with the prospect?
6. **Next Steps Clarity** - Are action items and follow-ups crystal clear?

For each category, provide:
- A score from 0-100
- Specific feedback about what's working
- A concrete suggestion for improvement
- Priority level (critical, important, or nice_to_have)

Also provide:
- An overall_score (0-100)
- 2-3 talk_track_suggestions (specific phrases/approaches to use)
- Key moments from the call (timestamps are hints like "~1:30", ~5:15", timestamps are optional)

Respond with ONLY a valid JSON object matching this structure:
{
  "overall_score": 75,
  "coaching_points": [
    {
      "category": "opening_strength",
      "score": 70,
      "feedback": "...",
      "suggestion": "...",
      "priority": "important"
    }
  ],
  "talk_track_suggestions": ["...", "...", "..."],
  "key_moments": [
    {
      "timestamp_hint": "~1:30",
      "type": "positive",
      "description": "..."
    }
  ]
}`;

interface CoachingPoint {
  category: string;
  score: number;
  feedback: string;
  suggestion: string;
  priority: "critical" | "important" | "nice_to_have";
}

interface CoachingResponse {
  overall_score: number;
  coaching_points: CoachingPoint[];
  talk_track_suggestions: string[];
  key_moments: Array<{
    timestamp_hint: string;
    type: "positive" | "negative" | "opportunity";
    description: string;
  }>;
}

function redactPII(text: string): string {
  return text
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}\b/g, "[REDACTED-CC]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED-SSN]")
    .replace(/\brouting\s*(?:number|#|num)?\s*:?\s*\d{9}\b/gi, "[REDACTED-ROUTING]")
    .replace(/\baccount\s*(?:number|#|num)?\s*:?\s*\d{8,17}\b/gi, "[REDACTED-ACCOUNT]");
}

function validateCoachingResponse(data: unknown): data is CoachingResponse {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.overall_score !== "number" || obj.overall_score < 0 || obj.overall_score > 100) {
    return false;
  }

  if (!Array.isArray(obj.coaching_points)) return false;

  const validCategories = ["opening_strength", "discovery_quality", "objection_handling", "closing_technique", "rapport_building", "next_steps_clarity"];
  const validPriorities = ["critical", "important", "nice_to_have"];
  const validMomentTypes = ["positive", "negative", "opportunity"];

  const validPoints = (obj.coaching_points as unknown[]).every((point) => {
    if (typeof point !== "object" || point === null) return false;
    const p = point as Record<string, unknown>;
    return (
      typeof p.category === "string" &&
      validCategories.includes(p.category) &&
      typeof p.score === "number" &&
      p.score >= 0 &&
      p.score <= 100 &&
      typeof p.feedback === "string" &&
      typeof p.suggestion === "string" &&
      validPriorities.includes(p.priority as string)
    );
  });

  if (!validPoints) return false;

  if (!Array.isArray(obj.talk_track_suggestions)) return false;
  if (!(obj.talk_track_suggestions as unknown[]).every((s) => typeof s === "string")) {
    return false;
  }

  if (!Array.isArray(obj.key_moments)) return false;
  const validMoments = (obj.key_moments as unknown[]).every((moment) => {
    if (typeof moment !== "object" || moment === null) return false;
    const m = moment as Record<string, unknown>;
    return (
      typeof m.timestamp_hint === "string" &&
      validMomentTypes.includes(m.type as string) &&
      typeof m.description === "string"
    );
  });

  return validMoments;
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  // Rate limit: 20 per minute per workspace
  const rl = await checkRateLimit(`coaching:${session.workspaceId}`, 20, 60_000);
  if (!rl.allowed) {
    const retryAfterSeconds = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.max(0, retryAfterSeconds)) } }
    );
  }

  let body: {
    transcript?: string;
    call_id?: string;
    context?: { lead_name?: string; lead_industry?: string; call_type?: string };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
  if (!transcript || transcript.length < 100) {
    return NextResponse.json(
      { error: "Provide a transcript (at least 100 characters) to analyze." },
      { status: 400 }
    );
  }

  const callId = typeof body.call_id === "string" ? body.call_id.trim() : null;
  const context = body.context && typeof body.context === "object" ? body.context : {};

  const sanitizedTranscript = redactPII(transcript);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "This feature is being configured. Please try again later or contact support." },
      { status: 503 }
    );
  }

  try {
    // Build context string for Claude
    const contextStr = Object.entries(context)
      .filter(([_, v]) => v && typeof v === "string")
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const fullPrompt = contextStr
      ? `${COACHING_PROMPT}\n\nContext:\n${contextStr}\n\nTranscript:\n${sanitizedTranscript.slice(0, 30000)}`
      : `${COACHING_PROMPT}\n\nTranscript:\n${sanitizedTranscript.slice(0, 30000)}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: "You output only valid JSON. No markdown, no explanation.",
        messages: [
          {
            role: "user",
            content: fullPrompt,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("[coaching] Claude API error:", res.status, await res.text());
      return NextResponse.json({ error: "Analysis failed." }, { status: 502 });
    }

    const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
    const text = data?.content?.[0]?.text?.trim() ?? "{}";

    let coachingData: CoachingResponse = {
      overall_score: 0,
      coaching_points: [],
      talk_track_suggestions: [],
      key_moments: [],
    };

    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;
      const parsed = JSON.parse(jsonStr);

      if (validateCoachingResponse(parsed)) {
        coachingData = parsed;
      } else {
        console.warn("[coaching] Invalid response structure from Claude");
      }
    } catch (parseErr) {
      console.warn("[coaching] Failed to parse Claude response:", parseErr);
    }

    // Optionally save to database if call_id provided
    if (callId) {
      const db = getDb();
      const { error: saveErr } = await db.from("call_coaching_results").insert({
        workspace_id: session.workspaceId,
        call_id: callId,
        overall_score: coachingData.overall_score,
        coaching_data: coachingData,
        transcript: sanitizedTranscript.slice(0, 10000), // Store truncated transcript for reference
        created_at: new Date().toISOString(),
      });

      if (saveErr) {
        console.warn("[coaching] Failed to save coaching results:", saveErr.message);
        // Continue - we still return the coaching data even if storage fails
      }
    }

    return NextResponse.json({
      ok: true,
      coaching: coachingData,
      saved: callId ? true : false,
    });
  } catch (err) {
    console.error("[coaching] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong with this service. Please try again." },
      { status: 502 }
    );
  }
}
