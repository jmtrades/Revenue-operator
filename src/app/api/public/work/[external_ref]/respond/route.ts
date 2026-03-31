/**
 * POST /api/public/work/[external_ref]/respond
 * Public participation: confirm, dispute, or provide information. No internal ids.
 * Same rate limiting and neutral handling as GET public work. Maps to shared-transaction acknowledgement where possible.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  getPendingTransactionIdByExternalRef,
  getAcknowledgedTransactionIdByExternalRef,
  getTransactionIdByExternalRef,
  getWorkspaceIdByExternalRef,
  acknowledgeSharedTransaction,
} from "@/lib/shared-transaction-assurance";
import {
  hashIpForPublicRecord,
  checkPublicRecordRateLimit,
  incrementPublicRecordRateLimit,
} from "@/lib/security/rate-limit";
import { recordOrientationStatement } from "@/lib/orientation/records";
import { recordReciprocalEvent } from "@/lib/reciprocal-events";
import { onReciprocalEvent } from "@/lib/operational-responsibilities";
import { upsertParticipant } from "@/lib/thread-participants";
import { recordEvidence } from "@/lib/thread-evidence";

function neutralResponse(): NextResponse {
  return NextResponse.json({ ok: false });
}

const MAX_INFO_LEN = 200;

const POST_CONFIRM_ACTIONS = [
  "request_adjustment",
  "schedule_follow_up",
  "approve_next_step",
  "acknowledge_responsibility",
  "attach_outcome_evidence",
  "assign_third_party",
  "transfer_responsibility",
] as const;

const ORIENTATION_BY_ACTION: Record<(typeof POST_CONFIRM_ACTIONS)[number], string> = {
  request_adjustment: "Adjustment was requested.",
  schedule_follow_up: "Follow-up was scheduled.",
  approve_next_step: "Next step was approved.",
  acknowledge_responsibility: "Responsibility was acknowledged.",
  attach_outcome_evidence: "Outcome evidence was attached.",
  assign_third_party: "Responsibility was assigned within the record.",
  transfer_responsibility: "Responsibility transferred within the record.",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ external_ref: string }> }
) {
  const { external_ref } = await params;
  if (!external_ref) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "0.0.0.0";
  const ipHash = hashIpForPublicRecord(ip);

  const allowed = await checkPublicRecordRateLimit(ipHash, external_ref);
  if (!allowed) return neutralResponse();

  let body: {
    type?: string;
    text?: string;
    actor_role?: string;
    participant_hint?: string;
    org_hint?: string;
    evidence_text?: string;
    evidence_pointer?: string;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const type = typeof body.type === "string" ? body.type.trim().toLowerCase() : "";
  const allTypes = ["confirm", "dispute", "info", ...POST_CONFIRM_ACTIONS];
  if (!allTypes.includes(type)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const rawRole = typeof body.actor_role === "string" ? body.actor_role.trim().toLowerCase() : "";
  const actorRole =
    rawRole === "downstream" ? "downstream" : rawRole === "observer" ? "observer" : "counterparty";
  const participantHint =
    typeof body.participant_hint === "string" ? body.participant_hint.slice(0, 60).trim() : undefined;
  const orgHint =
    typeof body.org_hint === "string" ? body.org_hint.slice(0, 40).trim() : undefined;

  const transactionId = await getPendingTransactionIdByExternalRef(external_ref);
  const threadId = await getTransactionIdByExternalRef(external_ref);
  
  if (threadId) {
    const { getOrCreateCorridorSession, updateCorridorSession, getCorridorTokenFromRequest } = await import("@/lib/public-corridor/session");
    const corridorToken = getCorridorTokenFromRequest(request);
    const session = await getOrCreateCorridorSession(threadId, corridorToken);
    await updateCorridorSession(session.token, threadId, actorRole, participantHint ?? null);
    
    if (orgHint) {
      const { storeOrgHint } = await import("@/lib/public-corridor/org-hints");
      await storeOrgHint(threadId, actorRole, orgHint);
    }
  }

  if (type === "confirm" || type === "dispute") {
    if (!transactionId) return neutralResponse();
    await incrementPublicRecordRateLimit(ipHash, external_ref).catch((err) => { log("error", "[public/work/[external_ref]/respond] error:", { error: err instanceof Error ? err.message : err }); });
    const payload =
      type === "dispute"
        ? { disputeReason: typeof body.text === "string" ? body.text.slice(0, MAX_INFO_LEN).trim() : undefined }
        : undefined;
    const result = await acknowledgeSharedTransaction(
      transactionId,
      type as "confirm" | "dispute",
      payload
    );
    if (!result.ok) return neutralResponse();
    return NextResponse.json({ ok: true });
  }

  if (POST_CONFIRM_ACTIONS.includes(type as (typeof POST_CONFIRM_ACTIONS)[number])) {
    const ackTxId = await getAcknowledgedTransactionIdByExternalRef(external_ref);
    if (!ackTxId) return neutralResponse();
    const workspaceId = await getWorkspaceIdByExternalRef(external_ref);
    if (!workspaceId) return neutralResponse();
    await incrementPublicRecordRateLimit(ipHash, external_ref).catch((err) => { log("error", "[public/work/[external_ref]/respond] error:", { error: err instanceof Error ? err.message : err }); });
    const action = type as (typeof POST_CONFIRM_ACTIONS)[number];
    const participantHint =
      typeof body.participant_hint === "string" ? body.participant_hint.slice(0, 60).trim() : undefined;
    
    const { getOrCreateCorridorSession, updateCorridorSession, getCorridorTokenFromRequest } = await import("@/lib/public-corridor/session");
    const corridorToken = getCorridorTokenFromRequest(request);
    const session = await getOrCreateCorridorSession(ackTxId, corridorToken);
    await updateCorridorSession(session.token, ackTxId, actorRole, participantHint ?? null);
    
    if (orgHint) {
      const { storeOrgHint } = await import("@/lib/public-corridor/org-hints");
      await storeOrgHint(ackTxId, actorRole, orgHint);
    }
    
    await upsertParticipant(ackTxId, actorRole, participantHint ?? null).catch((err) => { log("error", "[public/work/[external_ref]/respond] error:", { error: err instanceof Error ? err.message : err }); });
    const eventId = await recordReciprocalEvent({
      threadId: ackTxId,
      actorRole,
      operationalAction: action,
      authorityTransfer:
        action === "approve_next_step" ||
        action === "acknowledge_responsibility" ||
        action === "assign_third_party" ||
        action === "transfer_responsibility",
    }).catch(() => null);
    if (eventId) {
      await onReciprocalEvent(ackTxId, eventId, actorRole, action);
      const { detectAndRecordActionReliance } = await import("@/lib/third-party-reliance/action-reliance");
      await detectAndRecordActionReliance(ackTxId, workspaceId, actorRole, action).catch((err) => { log("error", "[public/work/[external_ref]/respond] error:", { error: err instanceof Error ? err.message : err }); });
      const { detectAndRecordAuthorityTransfer } = await import("@/lib/third-party-reliance/authority-transfer");
      await detectAndRecordAuthorityTransfer(ackTxId, workspaceId, action, eventId).catch((err) => { log("error", "[public/work/[external_ref]/respond] error:", { error: err instanceof Error ? err.message : err }); });
      const { spawnRecursiveThreadIfNeeded } = await import("@/lib/network-formation/recursive-thread");
      await spawnRecursiveThreadIfNeeded(ackTxId, workspaceId, action, eventId, actorRole).catch((err) => { log("error", "[public/work/[external_ref]/respond] error:", { error: err instanceof Error ? err.message : err }); });
    }
    if (action === "attach_outcome_evidence") {
      const evidenceText =
        typeof body.evidence_text === "string" ? body.evidence_text.slice(0, 140).trim() : undefined;
      const evidencePointer =
        typeof body.evidence_pointer === "string" ? body.evidence_pointer.slice(0, 120).trim() : undefined;
      if (evidenceText || evidencePointer) {
        await recordEvidence(ackTxId, actorRole, "note", {
          evidenceText: evidenceText ?? null,
          evidencePointer: evidencePointer ?? null,
        }).catch((err) => { log("error", "[public/work/[external_ref]/respond] error:", { error: err instanceof Error ? err.message : err }); });
      } else {
        await recordEvidence(ackTxId, actorRole, "note", {}).catch((err) => { log("error", "[public/work/[external_ref]/respond] error:", { error: err instanceof Error ? err.message : err }); });
      }
    }
    const orientation = ORIENTATION_BY_ACTION[action];
    await recordOrientationStatement(workspaceId, orientation).catch((err) => { log("error", "[public/work/[external_ref]/respond] error:", { error: err instanceof Error ? err.message : err }); });
    
    if (orgHint) {
      const { storeOrgHint } = await import("@/lib/public-corridor/org-hints");
      await storeOrgHint(ackTxId, actorRole, orgHint);
    }
    
    return NextResponse.json({ ok: true });
  }

  // type === "info": orientation only, no state change; record reciprocal event if thread exists
  const workspaceId = await getWorkspaceIdByExternalRef(external_ref);
  if (!workspaceId) return neutralResponse();
  await incrementPublicRecordRateLimit(ipHash, external_ref).catch((err) => { log("error", "[public/work/[external_ref]/respond] error:", { error: err instanceof Error ? err.message : err }); });
  await recordOrientationStatement(workspaceId, "Information was provided for the record.").catch((err) => { log("error", "[public/work/[external_ref]/respond] error:", { error: err instanceof Error ? err.message : err }); });
  if (threadId) {
    await upsertParticipant(threadId, actorRole, participantHint ?? null).catch((err) => { log("error", "[public/work/[external_ref]/respond] error:", { error: err instanceof Error ? err.message : err }); });
    const eventId = await recordReciprocalEvent({
      threadId,
      actorRole,
      operationalAction: "provide_information",
    }).catch(() => null);
    if (eventId) onReciprocalEvent(threadId, eventId, actorRole, "provide_information").catch((err) => { log("error", "[public/work/[external_ref]/respond] error:", { error: err instanceof Error ? err.message : err }); });
  }
  return NextResponse.json({ ok: true });
}
import { log } from "@/lib/logger";
