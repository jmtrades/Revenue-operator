/**
 * POST /api/onboard/create-thread
 * Auto-create first shared_transaction with orientation records.
 * Creates thread even without integration data.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { createSharedTransaction } from "@/lib/shared-transaction-assurance";
import { recordOrientationStatement } from "@/lib/orientation/records";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(request: NextRequest) {
  const csrfBlock = assertSameOrigin(request);
  if (csrfBlock) return csrfBlock;

  let body: { workspace_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workspaceId = body.workspace_id;
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data: existing } = await db
    .from("shared_transactions")
    .select("id, external_ref")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      thread_id: (existing as { id: string }).id,
      external_ref: (existing as { external_ref: string }).external_ref,
    });
  }

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);

  const threadId = await createSharedTransaction({
    workspaceId,
    counterpartyIdentifier: "onboarding@example.com",
    subjectType: "agreement",
    subjectId: `onboard-${workspaceId}`,
    initiatedBy: "business",
    acknowledgementDeadline: deadline,
  });

  if (!threadId) {
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
  }

  const { data: tx } = await db.from("shared_transactions").select("external_ref").eq("id", threadId).maybeSingle();
  const externalRef = (tx as { external_ref: string } | null)?.external_ref ?? "";

  await recordOrientationStatement(workspaceId, "A request for work was received.");
  await recordOrientationStatement(workspaceId, "Details were discussed.");
  await recordOrientationStatement(workspaceId, "Confirmation is pending.");

  return NextResponse.json({
    thread_id: threadId,
    external_ref: externalRef,
  });
}
