/**
 * GET /api/public/work/[external_ref]
 * Public work proof: what_happened (record-log), if_removed (disable-impact), reliance (proof).
 * Doctrine-safe. Same rate limiting as public record/capsule. No internal ids.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceIdByExternalRef, getPendingTransactionIdByExternalRef, getAcknowledgedTransactionIdByExternalRef } from "@/lib/shared-transaction-assurance";
import { getThreadIdByExternalRef, getContinuationEntriesForThread, getReciprocalEventsForThread } from "@/lib/reciprocal-events";
import { threadUnresolved, getPublicWorkStatement, STATEMENT_EXTERNAL_REFERENCE_UNRESOLVED, STATEMENT_ASSIGNED_OBLIGATION_UNRESOLVED } from "@/lib/operational-responsibilities";
import { contextHasExternalUncertainty } from "@/lib/outcome-dependencies";
import { listParticipantsForThread } from "@/lib/thread-participants";
import { threadHasOpenAssignment } from "@/lib/thread-assignments";
import { threadHasEvidence } from "@/lib/thread-evidence";
import { threadHasReference, STATEMENT_LATER_ACTIVITY_REFERENCED } from "@/lib/thread-reference-memory";
import { threadHasAmendment, STATEMENT_RECORD_UPDATED_AFTER_RELIANCE, getAmendmentLinesForThread } from "@/lib/institutional-auditability";
import { workspaceHasTemporalStability, STATEMENT_PUBLIC_STABILITY } from "@/lib/temporal-stability";
import {
  hashIpForPublicRecord,
  checkPublicRecordRateLimit,
  incrementPublicRecordRateLimit,
  recordPublicRecord404,
} from "@/lib/security/rate-limit";
import { getDisableImpactStatements } from "@/lib/operational-perception/disable-impact";
import { getDb } from "@/lib/db/queries";

const CAP_WHAT = 10;
const CAP_IF_REMOVED = 6;
const CAP_RELIANCE = 8;
const MAX_LEN = 90;

function trim(s: string): string {
  const t = s.slice(0, MAX_LEN).trim();
  return t.length ? t : "";
}

const EVIDENCE_STATEMENT = "Outcome evidence was attached.";

function neutralResponse(): NextResponse {
  return NextResponse.json({
    what_happened: [] as string[],
    if_removed: [] as string[],
    reliance: [] as string[],
    continuation: [] as string[],
    continuation_surface: false,
    pending_responsibility_statement: null as string | null,
    pending_assignment_statement: null as string | null,
    record_external_dependence_statement: null as string | null,
    evidence_present: false,
    evidence_statement: null as string | null,
    reference_continuation_statement: null as string | null,
    amendment_statement: null as string | null,
    stability_statement: null as string | null,
    participants: [] as { role: string; hint?: string | null }[],
    can_respond: false,
    can_follow_up: false,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ external_ref: string }> }
) {
  const { external_ref } = await params;
  if (!external_ref) {
    return NextResponse.json({ error: "external_ref required" }, { status: 400 });
  }
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "0.0.0.0";
  const ipHash = hashIpForPublicRecord(ip);

  const allowed = await checkPublicRecordRateLimit(ipHash, external_ref);
  if (!allowed) return neutralResponse();

  const workspaceId = await getWorkspaceIdByExternalRef(external_ref);
  if (!workspaceId) {
    await incrementPublicRecordRateLimit(ipHash, external_ref).catch((err) => { console.error("[public/work/[external_ref]] error:", err instanceof Error ? err.message : err); });
    const { overThreshold } = await recordPublicRecord404(ipHash).catch(() => ({ overThreshold: false }));
    if (overThreshold) return neutralResponse();
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await incrementPublicRecordRateLimit(ipHash, external_ref).catch((err) => { console.error("[public/work/[external_ref]] error:", err instanceof Error ? err.message : err); });

  const threadId = await getThreadIdByExternalRef(external_ref);
  let reopenDetected = false;
  let corridorToken: string | null = null;
  if (threadId) {
    const { getOrCreateCorridorSession, getCorridorTokenFromRequest } = await import("@/lib/public-corridor/session");
    const tokenFromRequest = getCorridorTokenFromRequest(request);
    const session = await getOrCreateCorridorSession(threadId, tokenFromRequest);
    corridorToken = session.token;
    reopenDetected = session.isReopen;
    
    if (reopenDetected) {
      const { recordOrientationStatement } = await import("@/lib/orientation/records");
      await recordOrientationStatement(workspaceId, "This record was reopened after completion.").catch((err) => { console.error("[public/work/[external_ref]] error:", err instanceof Error ? err.message : err); });
    }
  }

  const { detectAndRecordForwardedAccess } = await import("@/lib/third-party-reliance/forwarded-access");
  await detectAndRecordForwardedAccess(external_ref, ip, workspaceId).catch((err) => { console.error("[public/work/[external_ref]] error:", err instanceof Error ? err.message : err); });
  const { detectAndRecordReturnToRecord } = await import("@/lib/operational-ambiguity/return-to-record");
  await detectAndRecordReturnToRecord(external_ref, workspaceId, ip).catch((err) => { console.error("[public/work/[external_ref]] error:", err instanceof Error ? err.message : err); });

  const db = getDb();
  const [orientationRes, disableImpact, proofRow] = await Promise.all([
    db
      .from("orientation_records")
      .select("text")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(CAP_WHAT),
    getDisableImpactStatements(workspaceId),
    db
      .from("proof_capsules")
      .select("lines")
      .eq("workspace_id", workspaceId)
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const orientationData = (orientationRes as { data?: { text: string }[] })?.data ?? [];
  const what_happened = orientationData
    .map((r: { text?: string }) => trim(r.text ?? ""))
    .filter(Boolean)
    .slice(0, CAP_WHAT);
  const if_removed = disableImpact.slice(0, CAP_IF_REMOVED).map(trim).filter(Boolean);
  const lines = (proofRow?.data as { lines?: string[] } | null)?.lines ?? [];
  const reliance = lines.slice(0, CAP_RELIANCE).map(trim).filter(Boolean);

  const can_respond = !!(await getPendingTransactionIdByExternalRef(external_ref));
  const can_follow_up = !!(await getAcknowledgedTransactionIdByExternalRef(external_ref));
  const [continuationEntries, amendmentEntries, unresolved, externalUncertainty, participants, openAssignment, evidencePresent, hasReference, hasAmendment, hasStability] = threadId
    ? await Promise.all([
        getContinuationEntriesForThread(threadId),
        getAmendmentLinesForThread(threadId),
        threadUnresolved(threadId),
        contextHasExternalUncertainty("shared_transaction", threadId),
        listParticipantsForThread(threadId),
        threadHasOpenAssignment(threadId),
        threadHasEvidence(threadId),
        threadHasReference(threadId),
        threadHasAmendment(threadId),
        workspaceHasTemporalStability(workspaceId),
      ])
    : [[], [], false, false, [], false, false, false, false, false];
  const merged = [...(continuationEntries as { recorded_at: string; line: string }[]), ...(amendmentEntries as { recorded_at: string; line: string }[])];
  merged.sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  const continuationLines = merged.map((e) => e.line).slice(0, CAP_WHAT);
  const continuation_surface = continuationLines.length > 1;
  
  let chainHeaderLine: string | null = null;
  if (continuation_surface && threadId) {
    const events = await getReciprocalEventsForThread(threadId);
    if (events.length > 1) {
      chainHeaderLine = trim("A reciprocal chain formed through this record.");
    }
  }
  const pending_responsibility_statement = threadId && unresolved ? getPublicWorkStatement() : null;
  const pending_assignment_statement = threadId && openAssignment ? trim(STATEMENT_ASSIGNED_OBLIGATION_UNRESOLVED) : null;
  const record_external_dependence_statement = threadId && externalUncertainty ? trim(STATEMENT_EXTERNAL_REFERENCE_UNRESOLVED) : null;
  const evidence_statement = threadId && evidencePresent ? trim(EVIDENCE_STATEMENT) : null;
  const reference_continuation_statement = threadId && hasReference ? trim(STATEMENT_LATER_ACTIVITY_REFERENCED) : null;
  const amendment_statement = threadId && hasAmendment ? trim(STATEMENT_RECORD_UPDATED_AFTER_RELIANCE) : null;
  const stability_statement = hasStability ? trim(STATEMENT_PUBLIC_STABILITY) : null;
  const participantsCap = (participants as { role: string; hint?: string | null }[]).slice(0, 4);

  const response = NextResponse.json({
    what_happened,
    if_removed,
    reliance,
    continuation: continuationLines,
    continuation_surface,
    chain_header_line: chainHeaderLine,
    pending_responsibility_statement,
    pending_assignment_statement,
    record_external_dependence_statement,
    evidence_present: !!evidencePresent,
    evidence_statement,
    reference_continuation_statement,
    amendment_statement,
    stability_statement,
    participants: participantsCap,
    can_respond,
    can_follow_up,
  });
  
  if (corridorToken) {
    response.cookies.set("corridor_token", corridorToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60,
    });
  }

  response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");

  return response;
}
