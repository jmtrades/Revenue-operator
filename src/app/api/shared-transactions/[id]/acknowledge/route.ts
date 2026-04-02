/**
 * POST /api/shared-transactions/[id]/acknowledge
 * Counterparty acknowledges: confirm, reschedule, or dispute.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { acknowledgeSharedTransaction } from "@/lib/shared-transaction-assurance";
import { assertSameOrigin } from "@/lib/http/csrf";
import { getSession } from "@/lib/auth/request-session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfBlock = assertSameOrigin(request);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(request);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: { action?: string; new_deadline?: string; dispute_reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const action = body.action as "confirm" | "reschedule" | "dispute" | undefined;
  if (!action || !["confirm", "reschedule", "dispute"].includes(action)) {
    return NextResponse.json({ error: "action required: confirm | reschedule | dispute" }, { status: 400 });
  }
  const payload =
    action === "reschedule" && body.new_deadline
      ? { newDeadline: new Date(body.new_deadline) }
      : action === "dispute"
        ? { disputeReason: body.dispute_reason ?? undefined }
        : undefined;
  if (action === "reschedule" && !payload?.newDeadline) {
    return NextResponse.json({ error: "new_deadline required for reschedule" }, { status: 400 });
  }
  const result = await acknowledgeSharedTransaction(id, action, payload);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Acknowledgement failed" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
