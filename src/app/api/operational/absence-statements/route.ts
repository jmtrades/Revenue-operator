/**
 * GET /api/operational/absence-statements?workspace_id=...
 * Pre-cancellation reality exposure: what will fail, become uncertain, move outside record.
 * No persuasion. Only factual statements.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDisableImpactStatements } from "@/lib/operational-perception/disable-impact";
import { getRetentionInterceptPayload } from "@/lib/operational-perception/retention-intercept";

const MAX_CHARS = 90;

function trim(s: string): string {
  return s.length > MAX_CHARS ? s.slice(0, MAX_CHARS).trim() : s;
}

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({
        what_will_fail: [],
        what_becomes_uncertain: [],
        what_moves_outside: [],
      }, { status: 200 });
    }
    const authErr = await requireWorkspaceAccess(request, workspaceId);
    if (authErr) {
      return NextResponse.json({
        what_will_fail: [],
        what_becomes_uncertain: [],
        what_moves_outside: [],
      }, { status: 200 });
    }

    let disableImpact: string[] = [];
    let retentionPayload: { recent_operation?: string[]; current_dependency?: string[]; if_disabled?: string[] } | null = null;

    try {
      disableImpact = await getDisableImpactStatements(workspaceId);
    } catch {
      // Continue with empty
    }

    try {
      retentionPayload = await getRetentionInterceptPayload(workspaceId);
    } catch {
      // Continue with empty
    }

    const what_will_fail = disableImpact.map(trim).filter(Boolean);
    const what_becomes_uncertain = [
      ...((retentionPayload?.recent_operation ?? []).map(trim)),
      ...((retentionPayload?.current_dependency ?? []).map(trim)),
      ...((retentionPayload?.if_disabled ?? []).map(trim)),
    ].filter(Boolean);
    const what_moves_outside = [] as string[];

    return NextResponse.json({
      what_will_fail,
      what_becomes_uncertain,
      what_moves_outside,
    });
  } catch {
    return NextResponse.json({
      what_will_fail: [],
      what_becomes_uncertain: [],
      what_moves_outside: [],
    }, { status: 200 });
  }
}
