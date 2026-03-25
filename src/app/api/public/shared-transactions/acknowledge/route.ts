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
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const action = body.action;
  if (!token) return NextResponse.json({ ok: false }, { status: 400 });
  if (!action || !["confirm", "reschedule", "dispute"].includes(action)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const validation = await validateTokenAndGetTransactionId(token);
  if (!validation) return NextResponse.json({ ok: false }, { status: 400 });
  if ("alreadyUsed" in validation && validation.alreadyUsed) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const transactionId = "transactionId" in validation ? validation.transactionId : "";
  if (!transactionId) return NextResponse.json({ ok: false }, { status: 400 });

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
  if (!result.ok) return NextResponse.json({ ok: false }, { status: 400 });

  await markTokenUsed(token);

  if (result.externalRef) {
    const db = getDb();
    const { data: txRow } = await db.from("shared_transactions").select("workspace_id").eq("id", transactionId).maybeSingle();
    const workspaceId = (txRow as { workspace_id: string } | null)?.workspace_id;
    if (workspaceId) {
      const { recordRecordReference } = await import("@/lib/record-reference");
      recordRecordReference(workspaceId, "counterparty", "ack_flow", result.externalRef).catch((err) => { console.error("[public/shared-transactions/acknowledge] error:", err instanceof Error ? err.message : err); });
      const { recomputeInstitutionalState } = await import("@/lib/institutional-state");
      recomputeInstitutionalState(workspaceId).catch((err) => { console.error("[public/shared-transactions/acknowledge] error:", err instanceof Error ? err.message : err); });
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
        .maybeSingle();
      const originWorkspaceId = (txRow as { workspace_id: string } | null)?.workspace_id ?? null;
      const counterpartyWorkspaceId = await resolveWorkspaceByCounterparty(result.counterpartyIdentifier);
      await mirrorProtocolEventToCounterpartyWorkspace(
        result.externalRef,
        counterpartyWorkspaceId,
        eventType,
        {},
        originWorkspaceId
      );
    } catch {
      // Mirror failed; primary response already returned
    }
  }
  return NextResponse.json({ ok: true });
}
