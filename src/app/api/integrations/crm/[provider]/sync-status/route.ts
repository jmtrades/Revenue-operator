/**
 * GET /api/integrations/crm/[provider]/sync-status - Real-time sync progress polling
 *
 * Returns current sync job progress for a specific provider.
 * Checks sync_queue table for pending/processing jobs.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export interface SyncProgressResponse {
  pending: number;
  completed: number;
  failed: number;
  total: number;
  is_syncing: boolean;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> }
) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json(
      {
        pending: 0,
        completed: 0,
        failed: 0,
        total: 0,
        is_syncing: false,
      } satisfies SyncProgressResponse,
      { status: 200 }
    );
  }

  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { provider } = await ctx.params;

  // Get all sync queue entries for this workspace+provider
  const { data: queueJobs, error: queueError } = await db
    .from("sync_queue")
    .select("status")
    .eq("workspace_id", session.workspaceId)
    .eq("provider", provider);

  if (queueError) {
    return NextResponse.json(
      {
        pending: 0,
        completed: 0,
        failed: 0,
        total: 0,
        is_syncing: false,
      } satisfies SyncProgressResponse,
      { status: 200 }
    );
  }

  const jobs = (queueJobs ?? []) as Array<{ status: string }>;

  const pending = jobs.filter((j) => j.status === "pending" || j.status === "processing").length;
  const completed = jobs.filter((j) => j.status === "completed").length;
  const failed = jobs.filter((j) => j.status === "failed").length;
  const total = jobs.length;
  const is_syncing = pending > 0;

  return NextResponse.json({
    pending,
    completed,
    failed,
    total,
    is_syncing,
  } satisfies SyncProgressResponse);
}
