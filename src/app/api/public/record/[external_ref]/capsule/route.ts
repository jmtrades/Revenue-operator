/**
 * GET /api/public/record/[external_ref]/capsule
 * Shareable proof capsule. Response: { proof: string[] } only. Cap 8, no internal ids/timestamps/counts.
 * Same abuse hardening as public record: hashed IP rate limit + neutral response when over limit.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceIdByExternalRef } from "@/lib/shared-transaction-assurance";
import {
  hashIpForPublicRecord,
  checkPublicRecordRateLimit,
  incrementPublicRecordRateLimit,
  recordPublicRecord404,
} from "@/lib/security/rate-limit";
import { getDb } from "@/lib/db/queries";

const CAP_PROOF = 8;
const MAX_LEN = 90;

function trim(s: string): string {
  const t = s.slice(0, MAX_LEN).trim();
  return t.length ? t : "";
}

function neutralResponse(): NextResponse {
  return NextResponse.json({ proof: [] });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ external_ref: string }> }
) {
  const { external_ref } = await params;
  if (!external_ref) {
    return NextResponse.json({ proof: [] }, { status: 400 });
  }
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "0.0.0.0";
  const ipHash = hashIpForPublicRecord(ip);

  const allowed = await checkPublicRecordRateLimit(ipHash, external_ref);
  if (!allowed) return neutralResponse();

  const workspaceId = await getWorkspaceIdByExternalRef(external_ref);
  if (!workspaceId) {
    await incrementPublicRecordRateLimit(ipHash, external_ref).catch(() => {});
    const { overThreshold } = await recordPublicRecord404(ipHash).catch(() => ({ overThreshold: false }));
    if (overThreshold) return neutralResponse();
    return NextResponse.json({ proof: [] }, { status: 404 });
  }

  await incrementPublicRecordRateLimit(ipHash, external_ref).catch(() => {});

  let proof: string[] = [];
  try {
    const db = getDb();
    const { data: row } = await db
      .from("proof_capsules")
      .select("lines")
      .eq("workspace_id", workspaceId)
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lines = (row as { lines?: string[] } | null)?.lines;
    if (Array.isArray(lines)) {
      proof = lines.slice(0, CAP_PROOF).map(trim).filter(Boolean);
    }
  } catch {
    // leave empty
  }

  return NextResponse.json({ proof });
}
