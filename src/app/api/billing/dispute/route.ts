/**
 * POST /api/billing/dispute - dispute an invoice item
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function POST(req: NextRequest) {
  let body: { invoice_item_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const invoiceItemId = body.invoice_item_id;
  if (!invoiceItemId || typeof invoiceItemId !== "string") {
    return NextResponse.json({ error: "invoice_item_id required" }, { status: 400 });
  }
  const db = getDb();
  const { data: item } = await db
    .from("invoice_items")
    .select("id, dispute_until")
    .eq("id", invoiceItemId)
    .maybeSingle();
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const until = (item as { dispute_until?: string }).dispute_until
    ? new Date((item as { dispute_until: string }).dispute_until)
    : new Date(Date.now() + 7 * 86400000);
  if (Date.now() > until.getTime()) {
    return NextResponse.json({ error: "Dispute window closed" }, { status: 400 });
  }
  await db
    .from("invoice_items")
    .update({ status: "disputed" })
    .eq("id", invoiceItemId);
  return NextResponse.json({ ok: true, invoice_item_id: invoiceItemId });
}
