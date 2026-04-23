/**
 * GET /api/operational/ambient-state?workspace_id=...
 * Single ambient state line for top bar. Doctrine-safe. No numbers, no forbidden words.
 * Priority: authority required > operation anchored > proof (last 7 days) > default.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getInstitutionalState } from "@/lib/institutional-state";
import { processMaintainsOperation } from "@/lib/operability-anchor";
import { workspaceHasUnresolvedResponsibility, getSituationStatement, STATEMENT_RELATED_OUTCOME_UNRESOLVED } from "@/lib/operational-responsibilities";
import { workspaceHasThreadPropagatingUncertainty } from "@/lib/outcome-dependencies";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

const MAX_LINE = 90;
const FORBIDDEN = /\b(you|your|we|us|click|optimize|ROI|KPI|dashboard|assistant|metric|percentage)\b/gi;

function trim(s: string): string {
  const t = s.replace(FORBIDDEN, "").replace(/\s+/g, " ").trim();
  return t.length > MAX_LINE ? t.slice(0, MAX_LINE).trim() : t;
}

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const now = new Date().toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [handoffRes, operationAnchored, institutionalState, proofRes] = await Promise.all([
    db
      .from("escalation_logs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("holding_message_sent", true)
      .not("hold_until", "is", null)
      .gt("hold_until", now),
    processMaintainsOperation(workspaceId),
    getInstitutionalState(workspaceId),
    db
      .from("proof_capsules")
      .select("lines")
      .eq("workspace_id", workspaceId)
      .gte("period_end", sevenDaysAgo)
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const handoffCount = Number((handoffRes as { count?: number }).count ?? 0);
  const proofData = (proofRes as { data?: { lines?: string[] } | null })?.data;
  const firstProofLine = (() => {
    const lines = proofData?.lines;
    if (!Array.isArray(lines) || lines.length === 0) return null;
    const raw = lines[0];
    return typeof raw === "string" && raw.trim() ? trim(raw) : null;
  })();

  let hasUnresolved = false;
  let hasThreadPropagatingUncertainty = false;
  try {
    [hasUnresolved, hasThreadPropagatingUncertainty] = await Promise.all([
      workspaceHasUnresolvedResponsibility(workspaceId),
      workspaceHasThreadPropagatingUncertainty(workspaceId),
    ]);
  } catch (err) {
    // Fail closed: assume unresolved issues exist if check fails
    hasUnresolved = true;
    log("error", "Failed to check unresolved responsibility state", {
      workspace_id: workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
  let line: string;
  if (handoffCount > 0) {
    line = "A situation now requires human decision.";
  } else if (hasThreadPropagatingUncertainty) {
    line = trim(STATEMENT_RELATED_OUTCOME_UNRESOLVED);
  } else if (hasUnresolved) {
    line = getSituationStatement();
  } else if (operationAnchored) {
    line = "Operational execution active.";
  } else if (firstProofLine) {
    line = firstProofLine;
  } else {
    line = "Governed strategy applied.";
  }

  const institutional_state =
    institutionalState === "embedded" ||
    institutionalState === "reliant" ||
    institutionalState === "assumed" ||
    institutionalState === "institutional"
      ? institutionalState
      : "none";

  return NextResponse.json({
    line: trim(line),
    institutional_state,
  });
}
