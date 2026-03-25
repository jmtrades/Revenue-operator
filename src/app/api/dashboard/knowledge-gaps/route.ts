/**
 * GET /api/dashboard/knowledge-gaps?workspace_id=...
 * Returns questions the AI couldn't answer, surfaced from call transcripts.
 *
 * POST /api/dashboard/knowledge-gaps
 * Dismisses a gap (marks as resolved) or adds answer to knowledge base.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();

  try {
    const { data, error } = await db
      .from("knowledge_gaps")
      .select("id, question, occurrences, first_seen_at, last_seen_at, call_session_id, status")
      .eq("workspace_id", workspaceId)
      .eq("status", "open")
      .order("occurrences", { ascending: false })
      .limit(20);

    if (error) {
      // Table may not exist yet — return empty state
      return NextResponse.json({ gaps: [], total: 0 });
    }

    return NextResponse.json({
      gaps: data ?? [],
      total: (data ?? []).length,
    });
  } catch {
    return NextResponse.json({ gaps: [], total: 0 });
  }
}

export async function POST(req: NextRequest) {
  let body: { workspace_id: string; gap_id: string; action: "dismiss" | "add_answer"; answer?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { workspace_id, gap_id, action } = body;
  if (!workspace_id || !gap_id || !action) {
    return NextResponse.json({ error: "workspace_id, gap_id, and action required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspace_id);
  if (authErr) return authErr;

  const db = getDb();

  if (action === "dismiss") {
    await db
      .from("knowledge_gaps")
      .update({ status: "dismissed" })
      .eq("id", gap_id)
      .eq("workspace_id", workspace_id);

    return NextResponse.json({ ok: true });
  }

  if (action === "add_answer" && body.answer?.trim()) {
    // 1. Mark gap as resolved
    const { data: gap } = await db
      .from("knowledge_gaps")
      .select("question")
      .eq("id", gap_id)
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    const gapRow = gap as { question?: string } | null;

    await db
      .from("knowledge_gaps")
      .update({ status: "resolved", resolved_answer: body.answer.trim() })
      .eq("id", gap_id)
      .eq("workspace_id", workspace_id);

    // 2. Add to primary agent's knowledge base
    if (gapRow?.question) {
      try {
        const { data: agent } = await db
          .from("agents")
          .select("id, knowledge_base")
          .eq("workspace_id", workspace_id)
          .eq("is_active", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        const agentRow = agent as { id: string; knowledge_base?: { faq?: Array<{ q: string; a: string }> } } | null;
        if (agentRow) {
          const currentFaq = agentRow.knowledge_base?.faq ?? [];
          const newFaq = [...currentFaq, { q: gapRow.question, a: body.answer.trim() }];
          await db
            .from("agents")
            .update({
              knowledge_base: {
                ...agentRow.knowledge_base,
                faq: newFaq,
              },
            })
            .eq("id", agentRow.id);
        }
      } catch {
        // Non-critical: gap is resolved even if KB update fails
      }
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
