/**
 * GET /api/public/entries/:external_ref
 * Public attestation: minimal entry state by external_ref (no internal ids, no counts, no history).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPublicEntryByExternalRef } from "@/lib/shared-transaction-assurance";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ external_ref: string }> }
) {
  const { external_ref } = await params;
  if (!external_ref) {
    return NextResponse.json({ error: "external_ref required" }, { status: 400 });
  }
  const entry = await getPublicEntryByExternalRef(external_ref);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    external_ref: entry.external_ref,
    subject_type: entry.subject_type,
    state: entry.state,
    last_event_type: entry.last_event_type,
    last_event_at: entry.last_event_at,
  });
}
