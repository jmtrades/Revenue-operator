/**
 * POST /api/onboard/append-outcome
 * Append a new outcome to the same record thread model.
 * Creates a new thread linked via reference memory.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { createSharedTransaction } from "@/lib/shared-transaction-assurance";
import { recordOrientationStatement } from "@/lib/orientation/records";
import { detectAndAttachReference } from "@/lib/thread-reference-memory";
import { recordOutcomeDependency } from "@/lib/outcome-dependencies";

export async function POST(request: NextRequest) {
  let body: { workspace_id?: string; external_ref?: string; outcome_text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { workspace_id, external_ref, outcome_text } = body;
  if (!workspace_id || !external_ref) {
    return NextResponse.json({ error: "workspace_id and external_ref required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspace_id);
  if (authErr) return authErr;

  const db = getDb();
  const { data: existingTx } = await db
    .from("shared_transactions")
    .select("id, subject_type, subject_id, counterparty_identifier")
    .eq("workspace_id", workspace_id)
    .eq("external_ref", external_ref)
    .maybeSingle();

  if (!existingTx) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const existingThreadId = (existingTx as { id: string }).id;
  const subjectType = (existingTx as { subject_type: string }).subject_type;
  const subjectId = (existingTx as { subject_id: string }).subject_id;
  const counterpartyIdentifier = (existingTx as { counterparty_identifier: string }).counterparty_identifier;

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);

  const newThreadId = await createSharedTransaction({
    workspaceId: workspace_id,
    counterpartyIdentifier,
    subjectType: subjectType as "agreement" | "booking" | "payment" | "delivery" | "job",
    subjectId: `outcome-${Date.now()}`,
    initiatedBy: "business",
    acknowledgementDeadline: deadline,
  });

  if (!newThreadId) {
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
  }

  await detectAndAttachReference({
    workspaceId: workspace_id,
    referenceContextType: "shared_transaction",
    referenceContextId: newThreadId,
    subjectType,
    subjectId,
    threadId: existingThreadId,
  }).catch((err) => { console.error("[onboard/append-outcome] error:", err instanceof Error ? err.message : err); });

  await recordOutcomeDependency({
    workspaceId: workspace_id,
    sourceThreadId: existingThreadId,
    dependentContextType: "shared_transaction",
    dependentContextId: newThreadId,
    dependencyType: "prior_outcome_reference",
  }).catch((err) => { console.error("[onboard/append-outcome] error:", err instanceof Error ? err.message : err); });

  if (outcome_text && outcome_text.trim()) {
    await recordOrientationStatement(workspace_id, outcome_text.trim().slice(0, 90)).catch((err) => { console.error("[onboard/append-outcome] error:", err instanceof Error ? err.message : err); });
  }

  const { data: tx } = await db.from("shared_transactions").select("external_ref").eq("id", newThreadId).maybeSingle();
  const newExternalRef = (tx as { external_ref: string } | null)?.external_ref ?? "";

  return NextResponse.json({
    thread_id: newThreadId,
    external_ref: newExternalRef,
  });
}
