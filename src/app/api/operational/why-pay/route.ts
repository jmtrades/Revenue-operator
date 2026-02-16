/**
 * GET /api/operational/why-pay?workspace_id=...
 * Billing justification: factual lines explaining why the record matters.
 * Up to 6 lines. No metrics, no percentages, no persuasion.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { workspaceHasTemporalStability } from "@/lib/temporal-stability";
import { hasThirdPartyReliance } from "@/lib/third-party-reliance/presence-state";
import { hasCascadeUncertainty } from "@/lib/operational-ambiguity/cascade-uncertainty";
import { hasHistoricalClarity } from "@/lib/operational-ambiguity/historical-clarity";
import { workspaceHasMultiDayReferences } from "@/lib/thread-reference-memory";

const MAX_LINES = 6;
const MAX_CHARS = 90;

function trim(s: string): string {
  return s.length > MAX_CHARS ? s.slice(0, MAX_CHARS).trim() : s;
}

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({ lines: [] }, { status: 200 });
    }
    const authErr = await requireWorkspaceAccess(request, workspaceId);
    if (authErr) return NextResponse.json({ lines: [] }, { status: 200 });

    const db = getDb();
    const lines: string[] = [];

    try {
      const { data: acknowledgedThread } = await db
        .from("shared_transactions")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("state", "acknowledged")
        .limit(1)
        .maybeSingle();
      
      if (acknowledgedThread) {
        lines.push(trim("Work depended on shared confirmation."));
      }
    } catch {
      // Continue
    }

    try {
      if (await hasThirdPartyReliance(workspaceId)) {
        lines.push(trim("External parties acted using recorded outcomes."));
      }
    } catch {
      // Continue
    }

    try {
      if (await workspaceHasMultiDayReferences(workspaceId)) {
        lines.push(trim("Later activity referenced earlier records."));
      }
    } catch {
      // Continue
    }

    try {
      const { data: parallelReality } = await db
        .from("orientation_records")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("text", "Related activity occurred without reference to this record.")
        .limit(1)
        .maybeSingle();
      
      if (parallelReality) {
        lines.push(trim("Uncertainty was resolved through the record."));
      }
    } catch {
      // Continue
    }

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      if (await hasHistoricalClarity(workspaceId, sevenDaysAgo, new Date().toISOString())) {
        lines.push(trim("Recorded outcomes prevented disagreement."));
      }
    } catch {
      // Continue
    }

    try {
      if (await hasCascadeUncertainty(workspaceId)) {
        lines.push(trim("Dependent work relied on recorded completion."));
      }
    } catch {
      // Continue
    }

    return NextResponse.json({
      lines: lines.slice(0, MAX_LINES),
    });
  } catch {
    return NextResponse.json({ lines: [] }, { status: 200 });
  }
}
