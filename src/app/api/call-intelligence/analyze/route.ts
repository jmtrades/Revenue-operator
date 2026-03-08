/**
 * POST /api/call-intelligence/analyze
 * Accept transcript (and optional title, call_type). Run Claude analysis, store call_example + call_insights.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

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

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Call intelligence is not configured." }, { status: 503 });
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
            content: `${ANALYSIS_PROMPT}\n\n---\nTranscript:\n${transcript.slice(0, 30000)}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[call-intelligence/analyze] Anthropic error", res.status, errText);
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

    const { data: example, error: insertExampleErr } = await db
      .from("call_examples")
      .insert({
        workspace_id: session.workspaceId,
        title: title || "Untitled call",
        source: "upload",
        transcript,
        call_type: callType || null,
        status: "analyzed",
        analysis: { insightCount: insights.length },
      })
      .select("id, title, status, created_at")
      .single();

    if (insertExampleErr || !example) {
      console.error("[call-intelligence/analyze] insert call_example", insertExampleErr);
      return NextResponse.json({ error: "Failed to save." }, { status: 500 });
    }

    const exampleId = (example as { id: string }).id;
    if (insights.length > 0) {
      await db.from("call_insights").insert(
        insights.map((i) => ({
          workspace_id: session.workspaceId,
          call_example_id: exampleId,
          category: i.category,
          insight: i.insight,
          example_from_transcript: i.example_from_transcript ?? null,
          confidence: i.confidence,
        }))
      );
    }

    return NextResponse.json({
      ok: true,
      call_example: { id: exampleId, title: (example as { title: string }).title, status: "analyzed", created_at: (example as { created_at: string }).created_at },
      insights_count: insights.length,
    });
  } catch (e) {
    console.error("[call-intelligence/analyze]", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
