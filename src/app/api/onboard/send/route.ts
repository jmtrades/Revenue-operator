/**
 * POST /api/onboard/send
 * Send public work link to counterparty contact.
 * Message body is fixed: "This matches what we agreed. Adjust it if anything is off."
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { createAcknowledgementToken } from "@/lib/shared-transaction-assurance";

export async function POST(request: NextRequest) {
  let body: { workspace_id?: string; external_ref?: string; counterparty_contact?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { workspace_id, external_ref, counterparty_contact } = body;
  if (!workspace_id || !external_ref || !counterparty_contact) {
    return NextResponse.json(
      { error: "workspace_id, external_ref, and counterparty_contact required" },
      { status: 400 }
    );
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
