/**
 * POST /api/onboard/send
 * Send public work link to counterparty contact.
 * Message body is fixed: "This matches what we agreed. Adjust it if anything is off."
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { createAcknowledgementToken } from "@/lib/shared-transaction-assurance";

export async function POST(request: NextRequest) {
  let body: { workspace_id?: string; external_ref?: string; counterparty_contact?: string; approval_mode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { workspace_id, external_ref, counterparty_contact, approval_mode } = body;
  if (!workspace_id || !external_ref || !counterparty_contact) {
    return NextResponse.json(
      { error: "workspace_id, external_ref, and counterparty_contact required" },
      { status: 400 }
    );
  }
  const authErr = await requireWorkspaceAccess(request, workspace_id);
  if (authErr) return authErr;

  if (approval_mode === "review_required" || approval_mode === "autopilot") {
    const dbForSettings = getDb();
    await dbForSettings.from("settings").update({ approval_mode, updated_at: new Date().toISOString() }).eq("workspace_id", workspace_id);
  }

  const db = getDb();
  const { data: tx } = await db
    .from("shared_transactions")
    .select("id, counterparty_identifier")
    .eq("workspace_id", workspace_id)
    .eq("external_ref", external_ref)
    .maybeSingle();

  if (!tx) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const transactionId = (tx as { id: string }).id;
  const { rawToken } = await createAcknowledgementToken(transactionId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  if (!baseUrl) {
    return NextResponse.json({ error: "APP_URL not configured" }, { status: 500 });
  }
  const link = `${baseUrl}/public/work/${external_ref}?token=${rawToken}`;

  const messageBody = "This matches what we agreed. Adjust it if anything is off.";

  return NextResponse.json({
    ok: true,
    link,
    message_body: messageBody,
  });
}
