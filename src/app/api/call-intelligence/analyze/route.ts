/**
 * POST /api/call-intelligence/analyze
 * Accept transcript (and optional title, call_type). Run Claude analysis, store call_example + call_insights.
 *
 * Actual schema (revenue_operator):
 *   call_examples:  id, workspace_id, scenario, example_text, category, created_at
 *   call_insights:  id, workspace_id, call_session_id, insight_type, content, confidence, metadata, created_at
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";

const ANALYSIS_PROMPT = `Analyze this call transcript and extract behavioral patterns. Focus on what the agent/caller does WELL — tone, opening, discovery, objection handling, qualification, closing, empathy, persistence, pacing, recovery.

For each category that has clear evidence in the transcript, provide:
1. category: one of tone, opening, discovery, objection_handling, qualification, closing, empathy, persistence, pacing, recovery
2. insight: one short sentence describing the pattern (e.g. "Acknowledges concern first, then redirects to value")
3. example_from_transcript: a short quote from the transcript that illustrates it (optional)
4. confidence: number 0.0 to 1.0

Respond with a JSON array only, no markdown. Example:
[{"category":"tone","insight":"Uses warm, confident tone with natural pacing","example_from_transcript":"Sure, I'd be happy to help with that.","confidence":0.9}]
If the transcript is too short or unclear, return [].`;

type InsightRow = { category: string; insight: string; example_from_transcript?: string | null; confidence: number };

function redactPII(text: string): string {
  return text
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}\b/g, "[REDACTED-CC]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED-SSN]")
    .replace(/\brouting\s*(?:number|#|num)?\s*:?\s*\d{9}\b/gi, "[REDACTED-ROUTING]")
    .replace(/\baccount\s*(?:number|#|num)?\s*:?\s*\d{8,17}\b/gi, "[REDACTED-ACCOUNT]");
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

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`analyze:${session.workspaceId}`, 10, 60_000);
  if (!rl.allowed) {
    const retryAfterSeconds = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.max(0, retryAfterSeconds)) } }
    );
  }

  let body: { transcript?: string; title?: string; call_type?: string };
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

  const sanitizedTranscript = redactPII(transcript);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "This feature is being configured. Please try again later or contact support." },
      { status: 503 }
    );
  }

  try {
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
        system: "You output only valid JSON arrays. No markdown, no explanation.",
        messages: [
          {
            role: "user",
            content: `${ANALYSIS_PROMPT}\n\n---\nTranscript:\n${sanitizedTranscript.slice(0, 30000)}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Analysis failed." }, { status: 502 });
    }

    const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
    const text = data?.content?.[0]?.text?.trim() ?? "[]";
    let insights: InsightRow[] = [];
    try {
      const parsed = JSON.parse(text.replace(/^[\s\S]*?\[/, "[").replace(/\][\s\S]*$/, "]"));
      if (Array.isArray(parsed)) {
        insights = parsed
          .filter(
            (x: unknown): x is InsightRow =>
              typeof x === "object" &&
              x !== null &&
              typeof (x as InsightRow).category === "string" &&
              typeof (x as InsightRow).insight === "string" &&
              typeof (x as InsightRow).confidence === "number"
          )
          .map((x) => ({
            category: String(x.category).slice(0, 64),
            insight: String(x.insight).slice(0, 500),
            example_from_transcript: x.example_from_transcript != null ? String(x.example_from_transcript).slice(0, 300) : undefined,
            confidence: Math.max(0, Math.min(1, Number(x.confidence))),
          }));
      }
    } catch {
      // use empty insights if parse fails
    }

    const db = getDb();
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 256) : null;
    const callType = typeof body.call_type === "string" ? body.call_type.trim().slice(0, 64) : null;

    // Insert into call_examples — uses actual DB columns: scenario, example_text, category
    const { data: example, error: insertExampleErr } = await db
      .from("call_examples")
      .insert({
        workspace_id: session.workspaceId,
        scenario: title || "Untitled call",
        example_text: transcript,
        category: callType || "general",
      })
      .select("id, scenario, created_at")
      .maybeSingle();

    if (insertExampleErr || !example) {
      log("error", "[call-intelligence/analyze] insert call_example failed:", { error: insertExampleErr?.message });
      return NextResponse.json({ error: "Failed to save." }, { status: 500 });
    }

    const exampleId = (example as { id: string }).id;
    if (insights.length > 0) {
      // Insert into call_insights — uses actual DB columns: insight_type, content, confidence, metadata
      const { error: insErr } = await db.from("call_insights").insert(
        insights.map((i) => ({
          workspace_id: session.workspaceId,
          call_session_id: exampleId, // link insight back to the example
          insight_type: i.category,
          content: i.insight,
          confidence: i.confidence,
          metadata: {
            example_from_transcript: i.example_from_transcript ?? null,
            applied: false,
            dismissed: false,
          },
        }))
      );
      if (insErr) {
        log("error", "[call-intelligence/analyze] insert call_insights failed:", { error: insErr.message });
      }
    }

    return NextResponse.json({
      ok: true,
      call_example: {
        id: exampleId,
        title: (example as { scenario: string }).scenario,
        status: "analyzed",
        created_at: (example as { created_at: string }).created_at,
      },
      insights_count: insights.length,
    });
  } catch (err) {
    log("error", "[call-intelligence/analyze] unexpected error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again." },
      { status: 502 }
    );
  }
}
import { log } from "@/lib/logger";
