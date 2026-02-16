/**
 * GET /api/public/record/[external_ref]
 * Shareable proof record. ONLY: external_ref, subject_type, state, last_event_type, last_event_at.
 * No workspace_id, lead_id, conversation_id, or other internal identifiers.
 * Rate limited by IP hash + external_ref; repeated 404s from same IP return neutral doctrine-safe response.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPublicEntryByExternalRef } from "@/lib/shared-transaction-assurance";
import {
  hashIpForPublicRecord,
  checkPublicRecordRateLimit,
  incrementPublicRecordRateLimit,
  recordPublicRecord404,
} from "@/lib/security/rate-limit";

const ALLOWED_STATES = ["normal", "outside_authority", "beyond_scope", "exposure"] as const;
type PublicState = (typeof ALLOWED_STATES)[number];

function toPublicState(raw: string): PublicState {
  if (raw === "acknowledged" || raw === "resolved" || raw === "completed") return "normal";
  if (raw === "disputed" || raw === "expired" || raw === "authority_required") return "outside_authority";
  if (raw === "exposure" || raw === "pending_acknowledgement") return "exposure";
  return "beyond_scope";
}

function neutralResponse(): NextResponse {
  return NextResponse.json({
    external_ref: "",
    subject_type: "",
    state: "beyond_scope" as PublicState,
    last_event_type: "",
    last_event_at: "",
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ external_ref: string }> }
) {
  const { external_ref } = await params;
  if (!external_ref) {
    return NextResponse.json({ ok: false, error: "external_ref required" }, { status: 400 });
  }
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "0.0.0.0";
  const ipHash = hashIpForPublicRecord(ip);

  const allowed = await checkPublicRecordRateLimit(ipHash, external_ref);
  if (!allowed) {
    return neutralResponse();
  }

  const entry = await getPublicEntryByExternalRef(external_ref);
  if (!entry) {
    await incrementPublicRecordRateLimit(ipHash, external_ref).catch(() => {});
    const { overThreshold } = await recordPublicRecord404(ipHash).catch(() => ({ overThreshold: false }));
    if (overThreshold) return neutralResponse();
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  await incrementPublicRecordRateLimit(ipHash, external_ref).catch(() => {});
  const { getWorkspaceIdByExternalRef } = await import("@/lib/shared-transaction-assurance");
  const workspaceId = await getWorkspaceIdByExternalRef(external_ref);
  if (workspaceId) {
    const { recordRecordReference } = await import("@/lib/record-reference");
    recordRecordReference(workspaceId, "counterparty", "public_record", external_ref).catch(() => {});
  }
  const state = toPublicState(entry.state);
  return NextResponse.json({
    external_ref: entry.external_ref,
    subject_type: entry.subject_type,
    state,
    last_event_type: entry.last_event_type,
    last_event_at: entry.last_event_at,
  });
}
