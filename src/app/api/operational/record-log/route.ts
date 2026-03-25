/**
 * GET /api/operational/record-log?workspace_id=...
 * Chronological operational log. Each entry: at, subject, event.
 * For Record surface only. No chat, no metadata beyond time and statement.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

const LIMIT = 80;
const MAX_THREADS_CHECK = 100;

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({ entries: [] }, { status: 200 });
    }
    const authErr = await requireWorkspaceAccess(request, workspaceId);
    if (authErr) return NextResponse.json({ entries: [] }, { status: 200 });

    const db = getDb();
    let entries: Array<{ at: string; subject: string; event: string }> = [];
    
    try {
      const { data } = await db
        .from("orientation_records")
        .select("created_at, text")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(LIMIT);

      entries = (data ?? []).slice(0, LIMIT).map((r: { created_at: string; text: string }) => ({
        at: r.created_at,
        subject: "Operation",
        event: (r.text ?? "").trim() || "Recorded.",
      }));
    } catch {
      // Continue with empty
    }

    try {
      const { data: threads } = await db
        .from("shared_transactions")
        .select("id")
        .eq("workspace_id", workspaceId)
        .in("state", ["pending_acknowledgement", "disputed", "expired"])
        .limit(MAX_THREADS_CHECK);
      
      if (threads?.length) {
        const { hasUncertainCompletion } = await import("@/lib/reality-signals/uncertain-completion");
        const { detectAndRecordCompletionDecay } = await import("@/lib/operational-ambiguity/completion-decay");
        for (const t of threads.slice(0, MAX_THREADS_CHECK)) {
          const threadId = (t as { id: string }).id;
          try {
            if (await hasUncertainCompletion(threadId)) {
              const { data: existing } = await db
                .from("orientation_records")
                .select("id")
                .eq("workspace_id", workspaceId)
                .eq("text", "Completion was recorded without shared confirmation.")
                .limit(1)
                .maybeSingle();
              if (!existing) {
                const { recordOrientationStatement } = await import("@/lib/orientation/records");
                await recordOrientationStatement(workspaceId, "Completion was recorded without shared confirmation.").catch((err) => { console.error("[operational/record-log] error:", err instanceof Error ? err.message : err); });
              }
            }
            await detectAndRecordCompletionDecay(threadId, workspaceId).catch((err) => { console.error("[operational/record-log] error:", err instanceof Error ? err.message : err); });
          } catch {
            // Continue to next thread
          }
        }
      }
    } catch {
      // Continue
    }

    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ entries: [] }, { status: 200 });
  }
}
