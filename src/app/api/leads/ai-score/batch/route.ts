export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { checkRateLimit } from "@/lib/rate-limit";
import { scoreLeadWithAI, saveLeadScore } from "@/lib/lead-scoring/ai-scorer";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

const CONCURRENCY_LIMIT = 5;
const MAX_BATCH_SIZE = 50;

async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }
  return results;
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  try {
    const authSession = await getSession(req);
    const workspaceId =
      req.nextUrl.searchParams.get("workspace_id") || authSession?.workspaceId;
    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace_id required" },
        { status: 400 }
      );
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const rateLimitKey = `ai-score-batch:${workspaceId}`;
    const rateLimitResult = await checkRateLimit(rateLimitKey, 5, 60000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Maximum 5 batch requests per minute per workspace.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateLimitResult.resetAt / 1000)),
          },
        }
      );
    }

    let body: { lead_ids?: string[] };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { lead_ids } = body;
    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json(
        { error: "lead_ids array required and must not be empty" },
        { status: 400 }
      );
    }

    if (lead_ids.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          error: `Maximum ${MAX_BATCH_SIZE} leads per batch request`,
        },
        { status: 400 }
      );
    }

    const db = getDb();
    const { data: leads, error: leadsError } = await db
      .from("leads")
      .select("id")
      .eq("workspace_id", workspaceId)
      .in("id", lead_ids);

    if (leadsError) {
      return NextResponse.json(
        { error: "Failed to fetch leads" },
        { status: 500 }
      );
    }

    const foundIds = new Set((leads ?? []).map((l: { id: string }) => l.id));
    const notFoundIds = lead_ids.filter((id) => !foundIds.has(id));

    const scores = await processBatch(
      Array.from(foundIds),
      async (leadId) => {
        const score = await scoreLeadWithAI(workspaceId, leadId);
        await saveLeadScore(workspaceId, leadId, score);
        return {
          lead_id: leadId,
          ...score,
        };
      },
      CONCURRENCY_LIMIT
    );

    return NextResponse.json({
      processed: scores.length,
      failed: notFoundIds.length,
      not_found_ids: notFoundIds.length > 0 ? notFoundIds : undefined,
      scores,
    });
  } catch (error) {
    log("error", "[API] leads/ai-score/batch error:", { error: error });
    return NextResponse.json(
      {
        error: "Failed to process batch scoring",
        details: "Scoring failed",
      },
      { status: 500 }
    );
  }
}
