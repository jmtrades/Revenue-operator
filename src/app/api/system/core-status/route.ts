/**
 * GET /api/system/core-status?workspace_id=...
 * Doctrine-safe "is it working" booleans only. No timestamps, ids, or counts.
 * Requires session auth + workspace access.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getCronHeartbeats } from "@/lib/runtime/cron-heartbeat";
import { getDb } from "@/lib/db/queries";

const RECENT_CRON_MS = 25 * 60 * 60 * 1000; // 25 hours
const RECENT_ASSURANCE_MARKER_MS = 24 * 60 * 60 * 1000; // 24h for attempt marker
const RECENT_PROOF_DAYS = 7;
const RECENT_GUARANTEES_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isRecent(isoDate: string | null, withinMs: number): boolean {
  if (!isoDate) return false;
  const t = new Date(isoDate).getTime();
  return Date.now() - t <= withinMs;
}

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({
        inbound_processing_active: false,
        queue_processing_active: false,
        assurance_attempted_recently: false,
        proof_capsule_recently_available: false,
        guarantees_bundle_configured: false,
        dependence_level: "none",
      }, { status: 200 });
    }
    const authErr = await requireWorkspaceAccess(request, workspaceId);
    if (authErr) {
      return NextResponse.json({
        inbound_processing_active: false,
        queue_processing_active: false,
        assurance_attempted_recently: false,
        proof_capsule_recently_available: false,
        guarantees_bundle_configured: false,
        dependence_level: "none",
      }, { status: 200 });
    }

    let heartbeats: Record<string, string | null> = {};
    try {
      heartbeats = await getCronHeartbeats();
    } catch {
      // Continue with empty
    }
    
    const connectorInboxAt = heartbeats["connector-inbox"] ?? null;
    const coreAt = heartbeats["core"] ?? null;
    const processQueueAt = heartbeats["process-queue"] ?? null;
    const assuranceAt = heartbeats["assurance-delivery"] ?? null;
    const guaranteesAt = heartbeats["guarantees"] ?? null;

    const inbound_processing_active = isRecent(connectorInboxAt, RECENT_CRON_MS) || isRecent(coreAt, RECENT_CRON_MS);
    const queue_processing_active = isRecent(processQueueAt, RECENT_CRON_MS) || isRecent(coreAt, RECENT_CRON_MS);

    let assuranceMarkerRecent = false;
    try {
      const db = getDb();
      const since = new Date(Date.now() - RECENT_ASSURANCE_MARKER_MS).toISOString();
      const { data: markerRow } = await db
        .from("assurance_attempt_marker")
        .select("id")
        .eq("workspace_id", workspaceId)
        .gte("attempted_at", since)
        .limit(1)
        .maybeSingle();
      assuranceMarkerRecent = !!markerRow;
    } catch {
      // leave false
    }
    const assurance_attempted_recently = isRecent(assuranceAt, RECENT_CRON_MS) || assuranceMarkerRecent;

    let proof_capsule_recently_available = false;
    try {
      const db = getDb();
      const since = new Date(Date.now() - RECENT_PROOF_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data: row } = await db
        .from("proof_capsules")
        .select("id")
        .eq("workspace_id", workspaceId)
        .gte("period_end", since.slice(0, 10))
        .limit(1)
        .maybeSingle();
      proof_capsule_recently_available = !!row;
    } catch {
      // leave false
    }

    const guarantees_bundle_configured = isRecent(guaranteesAt, RECENT_GUARANTEES_DAYS_MS);

    let dependence_level: "none" | "internal" | "counterparty" | "multi-party" | "institutional" = "none";
    try {
      const { computeOperationalDependenceLevel } = await import("@/lib/revenue-product/dependence-level");
      dependence_level = await computeOperationalDependenceLevel(workspaceId);
    } catch {
      // Default to none
    }

    return NextResponse.json({
      inbound_processing_active,
      queue_processing_active,
      assurance_attempted_recently,
      proof_capsule_recently_available,
      guarantees_bundle_configured,
      dependence_level,
    });
  } catch {
    return NextResponse.json({
      inbound_processing_active: false,
      queue_processing_active: false,
      assurance_attempted_recently: false,
      proof_capsule_recently_available: false,
      guarantees_bundle_configured: false,
      dependence_level: "none",
    }, { status: 200 });
  }
}
