/**
 * Cron: data retention. Enforces workspace-level retention policies + generic cleanup.
 *
 * For each workspace with data_retention_days set:
 * - Soft-delete call_recordings (mark purged_at, don't hard delete)
 * - Soft-delete call transcripts (mark purged_at in call_recordings.transcript_text → NULL, keep row)
 * - Soft-delete sync_log entries (mark purged_at)
 *
 * Also handles generic archival:
 * - public_record_views (90 days) → archive
 * - executor_outcome_reports (12 months) → archive
 * - operational_ledger (24 months) → archive
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

const LIMIT_PER_TABLE = 500;
const PUBLIC_VIEWS_DAYS = 90;
const EXECUTOR_REPORTS_MONTHS = 12;
const LEDGER_MONTHS = 24;

interface CleanupResult {
  workspace_id: string;
  retention_days: number;
  call_recordings_purged: number;
  sync_log_purged: number;
}

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const db = getDb();
  const now = new Date();

  // Get all workspaces with retention policies set
  const { data: workspacesWithRetention } = await db
    .from("workspaces")
    .select("id, data_retention_days")
    .gt("data_retention_days", 0)
    .not("data_retention_days", "is", null);

  const cleanupResults: CleanupResult[] = [];

  // Process each workspace's retention policy
  if (workspacesWithRetention?.length) {
    for (const ws of workspacesWithRetention as { id: string; data_retention_days: number }[]) {
      const { id: workspaceId, data_retention_days: retentionDays } = ws;
      const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

      let recordingsPurged = 0;
      let syncLogPurged = 0;

      // Soft-delete old call_recordings (mark purged_at, don't hard delete)
      const { data: recordingsToPurge } = await db
        .from("call_recordings")
        .select("id")
        .eq("workspace_id", workspaceId)
        .is("purged_at", null)
        .lt("created_at", cutoff)
        .order("created_at", { ascending: true })
        .limit(LIMIT_PER_TABLE);

      if (recordingsToPurge?.length) {
        const ids = (recordingsToPurge as { id: string }[]).map(r => r.id);
        await db
          .from("call_recordings")
          .update({ purged_at: now.toISOString(), transcript_text: null })
          .in("id", ids);
        recordingsPurged = ids.length;
      }

      // Soft-delete old sync_log entries
      const { data: syncLogToPurge } = await db
        .from("sync_log")
        .select("id")
        .eq("workspace_id", workspaceId)
        .is("purged_at", null)
        .lt("created_at", cutoff)
        .order("created_at", { ascending: true })
        .limit(LIMIT_PER_TABLE);

      if (syncLogToPurge?.length) {
        const ids = (syncLogToPurge as { id: string }[]).map(r => r.id);
        await db
          .from("sync_log")
          .update({ purged_at: now.toISOString() })
          .in("id", ids);
        syncLogPurged = ids.length;
      }

      cleanupResults.push({
        workspace_id: workspaceId,
        retention_days: retentionDays,
        call_recordings_purged: recordingsPurged,
        sync_log_purged: syncLogPurged,
      });

      if (recordingsPurged > 0 || syncLogPurged > 0) {
        log("info", `Data retention cleanup: workspace=${workspaceId} retention=${retentionDays}d recordings=${recordingsPurged} sync_log=${syncLogPurged}`);
      }
    }
  }

  // --- Legacy archival (unchanged) ---
  const viewsCutoff = new Date(now.getTime() - PUBLIC_VIEWS_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const reportsCutoff = new Date(now.getTime() - EXECUTOR_REPORTS_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString();
  const ledgerCutoff = new Date(now.getTime() - LEDGER_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString();

  let viewsArchived = 0;
  let reportsArchived = 0;
  let ledgerArchived = 0;

  const { data: viewsToArchive } = await db
    .from("public_record_views")
    .select("id, workspace_id, external_ref, viewed_at, viewer_fingerprint_hash, referrer_domain, country_code")
    .is("archived_at", null)
    .lt("viewed_at", viewsCutoff)
    .order("viewed_at", { ascending: true })
    .limit(LIMIT_PER_TABLE);

  if (viewsToArchive?.length) {
    const rows = viewsToArchive as { id: string; workspace_id: string; external_ref: string; viewed_at: string; viewer_fingerprint_hash: string | null; referrer_domain: string | null; country_code: string | null }[];
    await db.from("public_record_views_archive").insert(
      rows.map((r) => ({
        id: r.id,
        workspace_id: r.workspace_id,
        external_ref: r.external_ref,
        viewed_at: r.viewed_at,
        viewer_fingerprint_hash: r.viewer_fingerprint_hash,
        referrer_domain: r.referrer_domain,
        country_code: r.country_code,
      }))
    );
    for (const r of rows) {
      await db.from("public_record_views").update({ archived_at: now.toISOString() }).eq("id", r.id);
    }
    viewsArchived = rows.length;
  }

  const { data: reportsToArchive } = await db
    .from("executor_outcome_reports")
    .select("id, workspace_id, external_id, action_intent_id, status, details_json, occurred_at")
    .is("archived_at", null)
    .lt("occurred_at", reportsCutoff)
    .order("occurred_at", { ascending: true })
    .limit(LIMIT_PER_TABLE);

  if (reportsToArchive?.length) {
    const rows = reportsToArchive as { id: string; workspace_id: string; external_id: string; action_intent_id: string | null; status: string; details_json: unknown; occurred_at: string }[];
    await db.from("executor_outcome_reports_archive").insert(
      rows.map((r) => ({
        id: r.id,
        workspace_id: r.workspace_id,
        external_id: r.external_id,
        action_intent_id: r.action_intent_id,
        status: r.status,
        details_json: r.details_json ?? {},
        occurred_at: r.occurred_at,
      }))
    );
    for (const r of rows) {
      await db.from("executor_outcome_reports").update({ archived_at: now.toISOString() }).eq("id", r.id);
    }
    reportsArchived = rows.length;
  }

  const { data: ledgerToArchive } = await db
    .from("operational_ledger")
    .select("id, workspace_id, event_type, severity, subject_type, subject_ref, details_json, occurred_at")
    .is("archived_at", null)
    .lt("occurred_at", ledgerCutoff)
    .order("occurred_at", { ascending: true })
    .limit(LIMIT_PER_TABLE);

  if (ledgerToArchive?.length) {
    const rows = ledgerToArchive as { id: string; workspace_id: string; event_type: string; severity: string; subject_type: string; subject_ref: string; details_json: unknown; occurred_at: string }[];
    await db.from("operational_ledger_archive").insert(
      rows.map((r) => ({
        id: r.id,
        workspace_id: r.workspace_id,
        event_type: r.event_type,
        severity: r.severity,
        subject_type: r.subject_type,
        subject_ref: r.subject_ref,
        details_json: r.details_json ?? {},
        occurred_at: r.occurred_at,
      }))
    );
    for (const r of rows) {
      await db.from("operational_ledger").update({ archived_at: now.toISOString() }).eq("id", r.id);
    }
    ledgerArchived = rows.length;
  }

  return NextResponse.json({
    ok: true,
    workspace_retention_cleanup: cleanupResults,
    public_record_views_archived: viewsArchived,
    executor_outcome_reports_archived: reportsArchived,
    operational_ledger_archived: ledgerArchived,
  });
}
