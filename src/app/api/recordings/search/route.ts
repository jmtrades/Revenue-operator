import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export const dynamic = "force-dynamic";

interface CallRecording {
  id: string;
  call_sid: string;
  caller_phone: string;
  duration_seconds: number;
  sentiment: "positive" | "neutral" | "negative";
  keywords: string[];
  transcript_preview: string;
  recording_url: string;
  created_at: string;
  has_transcript: boolean;
}

interface SearchResponse {
  recordings: CallRecording[];
  total: number;
}

export async function GET(request: NextRequest): Promise<NextResponse<SearchResponse | { error: string } | unknown>> {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const leadId = request.nextUrl.searchParams.get("lead_id") ?? undefined;
  const dateFrom = request.nextUrl.searchParams.get("from") ?? undefined;
  const dateTo = request.nextUrl.searchParams.get("to") ?? undefined;
  const outcome = request.nextUrl.searchParams.get("outcome") ?? undefined;
  const offset = parseInt(request.nextUrl.searchParams.get("offset") ?? "0", 10);
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "20", 10), 100);

  if (!workspaceId) return NextResponse.json({ error: "Missing workspace_id" }, { status: 400 });

  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();

    let dbQuery = db
      .from("call_recordings")
      .select(`
        id, call_session_id, recording_sid, duration_seconds, status,
        transcript_text, keywords, created_at,
        call_sessions!inner(id, lead_id, outcome, from_number)
      `)
      .eq("workspace_id", workspaceId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (leadId) {
      dbQuery = dbQuery.eq("call_sessions.lead_id", leadId);
    }
    if (dateFrom) {
      dbQuery = dbQuery.gte("created_at", dateFrom);
    }
    if (dateTo) {
      dbQuery = dbQuery.lte("created_at", dateTo);
    }
    if (outcome) {
      dbQuery = dbQuery.eq("call_sessions.outcome", outcome);
    }

    // For full-text search, use the tsvector index
    if (query) {
      dbQuery = dbQuery.textSearch("transcript_text", query, { type: "websearch" });
    }

    const { data, error } = await dbQuery;

    // Fetch total count in parallel
    let countQuery = db
      .from("call_recordings")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "completed");

    if (leadId) {
      countQuery = countQuery.eq("call_sessions.lead_id", leadId);
    }
    if (dateFrom) {
      countQuery = countQuery.gte("created_at", dateFrom);
    }
    if (dateTo) {
      countQuery = countQuery.lte("created_at", dateTo);
    }
    if (outcome) {
      countQuery = countQuery.eq("call_sessions.outcome", outcome);
    }
    if (query) {
      countQuery = countQuery.textSearch("transcript_text", query, { type: "websearch" });
    }

    const { count: totalCount } = await countQuery;
    const total = totalCount ?? 0;

    if (error) {
      // Fallback to ILIKE if FTS fails
      let fallbackQuery = db
        .from("call_recordings")
        .select(`
          id, call_session_id, recording_sid, duration_seconds, status,
          transcript_text, keywords, created_at,
          call_sessions!inner(id, lead_id, outcome, from_number)
        `)
        .eq("workspace_id", workspaceId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (leadId) {
        fallbackQuery = fallbackQuery.eq("call_sessions.lead_id", leadId);
      }
      if (query) {
        fallbackQuery = fallbackQuery.ilike("transcript_text", `%${query}%`);
      }
      if (dateFrom) {
        fallbackQuery = fallbackQuery.gte("created_at", dateFrom);
      }
      if (dateTo) {
        fallbackQuery = fallbackQuery.lte("created_at", dateTo);
      }

      const { data: fallbackData } = await fallbackQuery;

      const recordings = mapRecordings(fallbackData ?? [], query);
      return NextResponse.json({ recordings, total });
    }

    const recordings = mapRecordings(data ?? [], query);
    return NextResponse.json({ recordings, total });
  } catch (err) {
    log("error", "api.recordings.search_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

function mapRecordings(data: Record<string, unknown>[], _query: string): CallRecording[] {
  return data.map((r: Record<string, unknown>) => {
    const session = r.call_sessions as Record<string, unknown> | undefined;
    const transcriptText = r.transcript_text as string | null;
    const sentiment = deriveSentiment(session?.outcome as string | undefined);
    const callerPhone = (session?.from_number as string) || "";

    return {
      id: r.id as string,
      call_sid: (session?.id as string) || (r.call_session_id as string) || "",
      caller_phone: callerPhone,
      duration_seconds: (r.duration_seconds as number) || 0,
      sentiment,
      keywords: (r.keywords as string[]) || [],
      transcript_preview: transcriptText ? transcriptText.slice(0, 100) : "",
      recording_url: `/api/recordings/${(r.recording_sid as string) || (r.id as string)}/audio`,
      created_at: r.created_at as string,
      has_transcript: Boolean(transcriptText && transcriptText.length > 0),
    };
  });
}

function deriveSentiment(outcome: string | undefined): "positive" | "neutral" | "negative" {
  if (!outcome) return "neutral";
  const lowerOutcome = outcome.toLowerCase();
  if (lowerOutcome.includes("positive") || lowerOutcome.includes("success") || lowerOutcome.includes("won")) {
    return "positive";
  }
  if (lowerOutcome.includes("negative") || lowerOutcome.includes("lost") || lowerOutcome.includes("failed")) {
    return "negative";
  }
  return "neutral";
}

function extractSnippet(text: string | null, query: string): string {
  if (!text) return "";
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text.slice(0, 150);
  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + query.length + 60);
  return (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "");
}
