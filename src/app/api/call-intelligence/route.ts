/**
 * GET /api/call-intelligence — List call_examples and call_insights for workspace.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { data: examples, error: exErr } = await db
    .from("call_examples")
    .select("id, title, source, call_type, status, created_at, transcript")
    .eq("workspace_id", session.workspaceId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (exErr) {
    console.error("[call-intelligence] list examples", exErr);
    return NextResponse.json({ error: "Failed to load." }, { status: 500 });
  }

  const ids = (examples ?? []).map((e) => (e as { id: string }).id);
  const { data: insights } =
    ids.length > 0
      ? await db
          .from("call_insights")
          .select("id, call_example_id, category, insight, example_from_transcript, confidence, applied, dismissed, created_at")
          .in("call_example_id", ids)
      : { data: [] };

  return NextResponse.json({
    call_examples: examples ?? [],
    call_insights: insights ?? [],
  });
}
