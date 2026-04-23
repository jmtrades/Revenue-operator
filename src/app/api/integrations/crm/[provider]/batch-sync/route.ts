/**
 * POST /api/integrations/crm/[provider]/batch-sync — Enqueue outbound sync for workspace leads (Task 19).
 * Paginates leads and enqueues one job per lead for the given provider. Rate-limited by page size.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { enqueueBatchOutbound } from "@/lib/integrations/sync-engine";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";
import { isSupportedCrmProvider } from "@/lib/crm/providers";

export const dynamic = "force-dynamic";

// Phase 78 Task 9.3: batch sync is supported for every provider we ship.
const isAllowed = isSupportedCrmProvider;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> }
) {
  const csrfErr = assertSameOrigin(req);
  if (csrfErr) return csrfErr;

  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  // Rate limit: max 5 batch sync requests per 5 minutes per workspace
  const rl = await checkRateLimit(`crm-batch-sync:${session.workspaceId}`, 5, 300_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many sync requests. Please wait a few minutes." }, { status: 429 });
  }

  const { provider } = await ctx.params;
  if (!isAllowed(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10) || 100, 500);
  const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10) || 0;

  const db = getDb();
  const { data: rows } = await db
    .from("leads")
    .select("id")
    .eq("workspace_id", session.workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const leadIds = (rows ?? []).map((r: { id: string }) => r.id);
  const { enqueued } = await enqueueBatchOutbound({
    workspaceId: session.workspaceId,
    provider,
    leadIds,
  });

  return NextResponse.json({ enqueued, page_size: leadIds.length });
}
