/**
 * POST /api/public/settlement/open
 * Body: { token }. Validates token, marks used, creates Stripe Checkout session, returns url.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  validateSettlementToken,
  markSettlementTokenUsed,
  createStripeCheckoutSessionForSettlement,
  ensureSettlementAccount,
  SettlementNotConfiguredError,
} from "@/lib/settlement";
import { getDb } from "@/lib/db/queries";

async function appendSettlementOpened(externalRef: string, workspaceId: string): Promise<void> {
  const db = getDb();
  await db.from("protocol_events").insert({
    external_ref: externalRef,
    workspace_id: workspaceId,
    event_type: "settlement_opened",
    payload: {},
  });
}

export async function POST(request: NextRequest) {
  let body: { token?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) return NextResponse.json({ ok: false }, { status: 400 });

  const validation = await validateSettlementToken(token);
  if (!validation) return NextResponse.json({ ok: false }, { status: 400 });
  if ("alreadyUsed" in validation && validation.alreadyUsed) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const workspaceId = "workspaceId" in validation ? validation.workspaceId : "";
  const externalRef = "externalRef" in validation ? validation.externalRef : "";
  if (!workspaceId || !externalRef) return NextResponse.json({ ok: false }, { status: 400 });
  await ensureSettlementAccount(workspaceId);
  await markSettlementTokenUsed(token);
  await appendSettlementOpened(externalRef, workspaceId);

  try {
    const { url } = await createStripeCheckoutSessionForSettlement(workspaceId);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    if (err instanceof SettlementNotConfiguredError) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    throw err;
  }
}
