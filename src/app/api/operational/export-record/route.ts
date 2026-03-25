/**
 * GET /api/operational/export-record?workspace_id=...
 * Settlement export: deterministic chronological document of operational record.
 * The deliverable product companies actually buy.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { getContinuationEntriesForThread } from "@/lib/reciprocal-events";

const MAX_THREADS = 1000;
const MAX_CONTINUATION_PER_THREAD = 500;
const MAX_RESPONSIBILITIES_PER_THREAD = 200;
const MAX_AMENDMENTS_PER_THREAD = 200;

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({
        orientation: [],
        continuation: [],
        responsibilities: [],
        amendments: [],
        proof: null,
      }, { status: 200 });
    }
    const authErr = await requireWorkspaceAccess(request, workspaceId);
    if (authErr) {
      return NextResponse.json({
        orientation: [],
        continuation: [],
        responsibilities: [],
        amendments: [],
        proof: null,
      }, { status: 200 });
    }

    const db = getDb();

    let orientation: Array<{ at: string; statement: string }> = [];
    try {
      const { data: orientationRows } = await db
        .from("orientation_records")
        .select("created_at, text")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true })
        .limit(10000);

      orientation = (orientationRows ?? []).map((r: { created_at: string; text: string }) => ({
        at: r.created_at,
        statement: r.text,
      }));
    } catch {
      // Continue with empty
    }

    let threads: Array<{ id: string; external_ref: string; state: string; acknowledged_at: string | null }> = [];
    try {
      const { data: threadRows } = await db
        .from("shared_transactions")
        .select("id, external_ref, state, acknowledged_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true })
        .limit(MAX_THREADS);

      threads = (threadRows ?? []) as Array<{ id: string; external_ref: string; state: string; acknowledged_at: string | null }>;
    } catch {
      // Continue with empty
    }

    const continuation: Array<{ thread_ref: string; at: string; line: string }> = [];
    const responsibilities: Array<{ thread_ref: string; required_action: string; satisfied: boolean; resolved_at: string | null }> = [];
    const amendments: Array<{ thread_ref: string; at: string; type: string; summary: string }> = [];

    for (const thread of threads.slice(0, MAX_THREADS)) {
      const threadId = thread.id;
      const externalRef = thread.external_ref;
      
      try {
        const contEntries = await getContinuationEntriesForThread(threadId);
        for (const entry of contEntries.slice(0, MAX_CONTINUATION_PER_THREAD)) {
          continuation.push({
            thread_ref: externalRef,
            at: entry.recorded_at,
            line: entry.line,
          });
        }
      } catch {
        // Continue
      }

      try {
        const { data: respRows } = await db
          .from("operational_responsibilities")
          .select("required_action, satisfied, resolved_at")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: true })
          .limit(MAX_RESPONSIBILITIES_PER_THREAD);
        
        for (const resp of respRows ?? []) {
          responsibilities.push({
            thread_ref: externalRef,
            required_action: (resp as { required_action: string }).required_action,
            satisfied: (resp as { satisfied: boolean }).satisfied,
            resolved_at: (resp as { resolved_at: string | null }).resolved_at,
          });
        }
      } catch {
        // Continue
      }

      try {
        const { data: amendRows } = await db
          .from("thread_amendments")
          .select("recorded_at, amendment_type, amendment_summary")
          .eq("thread_id", threadId)
          .order("recorded_at", { ascending: true })
          .limit(MAX_AMENDMENTS_PER_THREAD);
        
        for (const amend of amendRows ?? []) {
          amendments.push({
            thread_ref: externalRef,
            at: (amend as { recorded_at: string }).recorded_at,
            type: (amend as { amendment_type: string }).amendment_type || "",
            summary: (amend as { amendment_summary: string }).amendment_summary || "",
          });
        }
      } catch {
        // Continue
      }
    }

    let proof: { period_start: string; period_end: string; lines: string[] } | null = null;
    try {
      const { data: proofRow } = await db
        .from("proof_capsules")
        .select("period_start, period_end, lines")
        .eq("workspace_id", workspaceId)
        .order("period_end", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (proofRow) {
        proof = {
          period_start: (proofRow as { period_start: string }).period_start,
          period_end: (proofRow as { period_end: string }).period_end,
          lines: (proofRow as { lines?: string[] }).lines ?? [],
        };
      }
    } catch {
      // Continue with null
    }

    return NextResponse.json({
      orientation,
      continuation,
      responsibilities,
      amendments,
      proof,
    });
  } catch {
    return NextResponse.json({
      orientation: [],
      continuation: [],
      responsibilities: [],
      amendments: [],
      proof: null,
    }, { status: 200 });
  }
}
