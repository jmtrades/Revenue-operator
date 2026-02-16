/**
 * POST /api/public/shared-transactions/acknowledge
 * One-tap counterparty acknowledgement (no login). Token in body; never expose internal IDs.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  validateTokenAndGetTransactionId,
  markTokenUsed,
  acknowledgeSharedTransaction,
  resolveWorkspaceByCounterparty,
  mirrorProtocolEventToCounterpartyWorkspace,
} from "@/lib/shared-transaction-assurance";
import { getDb } from "@/lib/db/queries";

export async function POST(request: NextRequest) {
  let body: { token?: string; action?: string; new_deadline?: string; dispute_reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false });
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const action = body.action;
  if (!token) return NextResponse.json({ ok: false });
  if (!action || !["confirm", "reschedule", "dispute"].includes(action)) {
    return NextResponse.json({ ok: false });
  }

  const validation = await validateTokenAndGetTransactionId(token);
  if (!validation) return NextResponse.json({ ok: false });
  if ("alreadyUsed" in validation && validation.alreadyUsed) {
    return NextResponse.json({ ok: true });
  }

  const transactionId = "transactionId" in validation ? validation.transactionId : "";
  if (!transactionId) return NextResponse.json({ ok: false });

  const newDeadline = body.new_deadline ? new Date(body.new_deadline) : undefined;
  const payload =
    action === "reschedule" && newDeadline
      ? { newDeadline }
      : action === "dispute"
        ? { disputeReason: typeof body.dispute_reason === "string" ? body.dispute_reason : undefined }
        : undefined;

  const result = await acknowledgeSharedTransaction(
    transactionId,
    action as "confirm" | "reschedule" | "dispute",
    payload
  );
  if (!result.ok) return NextResponse.json({ ok: false });

  await markTokenUsed(token);

  if (result.externalRef) {
    const db = getDb();
    const { data: txRow } = await db.from("shared_transactions").select("workspace_id").eq("id", transactionId).single();
    const workspaceId = (txRow as { workspace_id: string } | null)?.workspace_id;
    if (workspaceId) {
      const { recordRecordReference } = await import("@/lib/record-reference");
      recordRecordReference(workspaceId, "counterparty", "ack_flow", result.externalRef).catch(() => {});
      const { recomputeInstitutionalState } = await import("@/lib/institutional-state");
      recomputeInstitutionalState(workspaceId).catch(() => {});
    }
  }

  const eventType =
    action === "confirm" ? "acknowledged" : action === "reschedule" ? "rescheduled" : "disputed";
  if (result.externalRef && result.counterpartyIdentifier) {
    try {
      const db = getDb();
      const { data: txRow } = await db
        .from("shared_transactions")
        .select("workspace_id")
        .eq("id", transactionId)
        .single();
      const originWorkspaceId = (txRow as { workspace_id: string } | null)?.workspace_id ?? null;
      const counterpartyWorkspaceId = await resolveWorkspaceByCounterparty(result.counterpartyIdentifier);
      await mirrorProtocolEventToCounterpartyWorkspace(
        result.externalRef,
        counterpartyWorkspaceId,
        eventType,
        {},
        originWorkspaceId
      );
    } catch (err) {
      console.warn("Shared entry protocol: mirror failed", err);
    }
  }
  return NextResponse.json({ ok: true });
}
