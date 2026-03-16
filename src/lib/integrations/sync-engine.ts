/**
 * Bidirectional sync engine for CRM integrations (Task 19).
 * Sync queue with retry (exponential backoff, max 5); sync log for audit; inbound/outbound.
 */

import { getDb } from "@/lib/db/queries";
import { applyMapping, type FieldMappingConfig, type LeadRecord } from "./field-mapper";
import type { CrmProviderId } from "./field-mapper";

export type SyncDirection = "inbound" | "outbound";
export type SyncStatus = "pending" | "processing" | "completed" | "failed";
export type SyncLogAction = "created" | "updated" | "failed" | "conflict" | "skipped";

export interface SyncJobRow {
  id: string;
  workspace_id: string;
  provider: string;
  direction: SyncDirection;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown>;
  status: SyncStatus;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface SyncLogRow {
  id: string;
  workspace_id: string;
  provider: string;
  direction: SyncDirection;
  entity_type: string;
  entity_id: string | null;
  action: SyncLogAction;
  summary: string | null;
  payload_snapshot: Record<string, unknown>;
  created_at: string;
}

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000;

/** Exponential backoff delay for retry_count (0-based). */
export function getRetryDelayMs(retryCount: number): number {
  return BASE_DELAY_MS * Math.pow(2, Math.min(retryCount, 4));
}

/**
 * Enqueue a sync job. Call from lead update/create or from inbound webhook handler.
 */
export async function enqueueSync(params: {
  workspaceId: string;
  provider: CrmProviderId;
  direction: SyncDirection;
  entityType?: "lead" | "contact";
  entityId?: string | null;
  payload?: Record<string, unknown>;
}): Promise<string | null> {
  const db = getDb();
  const { data, error } = await db
    .from("sync_queue")
    .insert({
      workspace_id: params.workspaceId,
      provider: params.provider,
      direction: params.direction,
      entity_type: params.entityType ?? "lead",
      entity_id: params.entityId ?? null,
      payload: params.payload ?? {},
      status: "pending",
      retry_count: 0,
      max_retries: MAX_RETRIES,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

/**
 * Append an audit entry to sync_log.
 */
export async function appendSyncLog(params: {
  workspaceId: string;
  provider: string;
  direction: SyncDirection;
  entityType?: string;
  entityId?: string | null;
  action: SyncLogAction;
  summary?: string | null;
  payloadSnapshot?: Record<string, unknown>;
}): Promise<void> {
  const db = getDb();
  await db.from("sync_log").insert({
    workspace_id: params.workspaceId,
    provider: params.provider,
    direction: params.direction,
    entity_type: params.entityType ?? "lead",
    entity_id: params.entityId ?? null,
    action: params.action,
    summary: params.summary ?? null,
    payload_snapshot: params.payloadSnapshot ?? {},
  });
}

/**
 * Process one pending job from the queue (outbound: load lead, apply mapping, push to CRM).
 * Push is stubbed until CRM API clients exist; we still log success/failure.
 */
export async function processSyncJob(jobId: string): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const { data: job, error: fetchErr } = await db
    .from("sync_queue")
    .select("*")
    .eq("id", jobId)
    .eq("status", "pending")
    .maybeSingle();
  if (fetchErr || !job) {
    return { ok: false, error: "Job not found or not pending" };
  }
  const row = job as SyncJobRow;
  if (row.retry_count >= row.max_retries) {
    await db
      .from("sync_queue")
      .update({
        status: "failed",
        last_error: "Max retries exceeded",
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    await appendSyncLog({
      workspaceId: row.workspace_id,
      provider: row.provider,
      direction: row.direction,
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: "failed",
      summary: "Max retries exceeded",
      payloadSnapshot: row.payload,
    });
    return { ok: false, error: "Max retries exceeded" };
  }

  await db
    .from("sync_queue")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  try {
    if (row.direction === "outbound" && row.entity_id) {
      const { data: lead } = await db
        .from("leads")
        .select("id, name, email, phone, company, state, metadata")
        .eq("id", row.entity_id)
        .eq("workspace_id", row.workspace_id)
        .maybeSingle();
      if (!lead) {
        await db
          .from("sync_queue")
          .update({
            status: "failed",
            last_error: "Lead not found",
            updated_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);
        await appendSyncLog({
          workspaceId: row.workspace_id,
          provider: row.provider,
          direction: "outbound",
          entityId: row.entity_id,
          action: "failed",
          summary: "Lead not found",
        });
        return { ok: false, error: "Lead not found" };
      }
      const { data: configRow } = await db
        .from("integration_configs")
        .select("config")
        .eq("workspace_id", row.workspace_id)
        .eq("provider", row.provider)
        .eq("config_type", "field_mapping")
        .maybeSingle();
      const mappingConfig = (configRow as { config?: FieldMappingConfig } | null)?.config;
      if (!mappingConfig || !Array.isArray(mappingConfig.mappings) || mappingConfig.mappings.length === 0) {
        await db
          .from("sync_queue")
          .update({
            status: "completed",
            updated_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);
        await appendSyncLog({
          workspaceId: row.workspace_id,
          provider: row.provider,
          direction: "outbound",
          entityId: row.entity_id,
          action: "skipped",
          summary: "No mapping config",
        });
        return { ok: true };
      }
      const leadRecord = lead as LeadRecord;
      const payload = applyMapping(leadRecord, mappingConfig as FieldMappingConfig);
      // Stub: actual push to CRM would go here (e.g. HubSpot API, Salesforce API).
      // For now we just mark completed and log.
      await db
        .from("sync_queue")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      await appendSyncLog({
        workspaceId: row.workspace_id,
        provider: row.provider,
        direction: "outbound",
        entityId: row.entity_id,
        action: "updated",
        summary: `Outbound sync queued (${Object.keys(payload).length} fields). CRM API push not yet implemented.`,
        payloadSnapshot: payload,
      });
      return { ok: true };
    }

    if (row.direction === "inbound") {
      // Inbound: apply payload to lead (last-write-wins). Payload should have external_id or phone to match.
      await db
        .from("sync_queue")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      await appendSyncLog({
        workspaceId: row.workspace_id,
        provider: row.provider,
        direction: "inbound",
        entityId: row.entity_id,
        action: "updated",
        summary: "Inbound sync received. Apply to lead not yet implemented.",
        payloadSnapshot: row.payload,
      });
      return { ok: true };
    }

    await db
      .from("sync_queue")
      .update({
        status: "failed",
        last_error: "Unknown direction",
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return { ok: false, error: "Unknown direction" };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const nextRetry = row.retry_count + 1 < row.max_retries;
    const delayMs = getRetryDelayMs(row.retry_count);
    const nextRetryAt = nextRetry ? new Date(Date.now() + delayMs).toISOString() : null;
    await db
      .from("sync_queue")
      .update({
        status: nextRetry ? "pending" : "failed",
        retry_count: row.retry_count + 1,
        last_error: errMsg,
        next_retry_at: nextRetryAt,
        updated_at: new Date().toISOString(),
        completed_at: nextRetry ? null : new Date().toISOString(),
      })
      .eq("id", jobId);
    await appendSyncLog({
      workspaceId: row.workspace_id,
      provider: row.provider,
      direction: row.direction,
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: "failed",
      summary: errMsg,
      payloadSnapshot: row.payload,
    });
    return { ok: false, error: errMsg };
  }
}

/**
 * Get next N pending jobs (by next_retry_at or created_at). Used by cron to process queue.
 */
export async function getPendingSyncJobs(limit: number): Promise<SyncJobRow[]> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data } = await db
    .from("sync_queue")
    .select("*")
    .eq("status", "pending")
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data ?? []) as SyncJobRow[];
}

/**
 * Fetch sync log for workspace (for Sync Log UI). Paginated.
 */
export async function getSyncHistory(params: {
  workspaceId: string;
  limit?: number;
  offset?: number;
  provider?: string;
  direction?: SyncDirection;
}): Promise<{ entries: SyncLogRow[]; total: number }> {
  const db = getDb();
  const limit = Math.min(params.limit ?? 50, 100);
  const offset = params.offset ?? 0;

  let query = db
    .from("sync_log")
    .select("id, workspace_id, provider, direction, entity_type, entity_id, action, summary, payload_snapshot, created_at", { count: "exact" })
    .eq("workspace_id", params.workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (params.provider) query = query.eq("provider", params.provider);
  if (params.direction) query = query.eq("direction", params.direction);

  const { data, error, count } = await query;
  if (error) return { entries: [], total: 0 };
  return {
    entries: (data ?? []) as SyncLogRow[],
    total: count ?? 0,
  };
}

/**
 * Batch: enqueue outbound sync for a page of leads. Rate-limit by caller (e.g. 1 page per request).
 */
export async function enqueueBatchOutbound(params: {
  workspaceId: string;
  provider: CrmProviderId;
  leadIds: string[];
}): Promise<{ enqueued: number }> {
  let enqueued = 0;
  for (const leadId of params.leadIds) {
    const id = await enqueueSync({
      workspaceId: params.workspaceId,
      provider: params.provider,
      direction: "outbound",
      entityType: "lead",
      entityId: leadId,
    });
    if (id) enqueued += 1;
  }
  return { enqueued };
}

const CRM_PROVIDERS: CrmProviderId[] = [
  "salesforce",
  "hubspot",
  "zoho_crm",
  "pipedrive",
  "gohighlevel",
  "google_contacts",
  "microsoft_365",
];

/**
 * Return provider ids that have an active connection for the workspace (for outbound enqueue on lead create/update).
 */
export async function getConnectedCrmProviders(workspaceId: string): Promise<CrmProviderId[]> {
  const db = getDb();
  const { data } = await db
    .from("workspace_crm_connections")
    .select("provider")
    .eq("workspace_id", workspaceId)
    .not("connected_at", "is", null)
    .in("provider", CRM_PROVIDERS);
  const providers = (data ?? []).map((r: { provider: string }) => r.provider as CrmProviderId);
  return providers.filter((p): p is CrmProviderId => CRM_PROVIDERS.includes(p));
}
