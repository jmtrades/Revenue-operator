/**
 * Bidirectional sync engine for CRM integrations (Task 19).
 * Sync queue with retry (exponential backoff, max 5); sync log for audit; inbound/outbound.
 */

import { getDb } from "@/lib/db/queries";
import { applyMapping, applyReverseMapping, normalizeCrmPayload, getDefaultMappings, formatPhone, type FieldMappingConfig, type LeadRecord } from "./field-mapper";
import type { CrmProviderId } from "./field-mapper";
import { getValidTokens } from "./token-refresh";
import { pushContactToCrm } from "./crm-clients";
import { log } from "@/lib/logger";

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
      const leadRecord = lead as LeadRecord;

      // Use custom mapping config if available, otherwise use defaults
      let effectiveConfig = mappingConfig as FieldMappingConfig;
      if (!effectiveConfig || !Array.isArray(effectiveConfig.mappings) || effectiveConfig.mappings.length === 0) {
        effectiveConfig = { mappings: getDefaultMappings(row.provider as CrmProviderId) };
      }

      const payload = applyMapping(leadRecord, effectiveConfig);

      if (Object.keys(payload).length === 0) {
        await db
          .from("sync_queue")
          .update({ status: "completed", updated_at: new Date().toISOString(), completed_at: new Date().toISOString() })
          .eq("id", jobId);
        await appendSyncLog({
          workspaceId: row.workspace_id,
          provider: row.provider,
          direction: "outbound",
          entityId: row.entity_id,
          action: "skipped",
          summary: "No fields to sync after mapping",
        });
        return { ok: true };
      }

      // Get valid OAuth tokens (auto-refreshes if expired)
      const tokens = await getValidTokens(row.workspace_id, row.provider as CrmProviderId);
      if (!tokens) {
        throw new Error(`No valid OAuth tokens for ${row.provider}. Reconnect the integration.`);
      }

      // Push to CRM
      const result = await pushContactToCrm(row.provider as CrmProviderId, tokens, payload);

      if (!result.ok) {
        throw new Error(result.error ?? `CRM push failed for ${row.provider}`);
      }

      // Success — mark completed and update sync stats
      await db
        .from("sync_queue")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      // Update connection sync stats (increment records_synced, update last_sync_at)
      try {
        const { data: connRow } = await db
          .from("workspace_crm_connections")
          .select("records_synced")
          .eq("workspace_id", row.workspace_id)
          .eq("provider", row.provider)
          .maybeSingle();
        const currentCount = (connRow as { records_synced?: number } | null)?.records_synced ?? 0;
        await db
          .from("workspace_crm_connections")
          .update({
            records_synced: currentCount + 1,
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("workspace_id", row.workspace_id)
          .eq("provider", row.provider);
      } catch {
        // Non-blocking — sync succeeded even if stats update fails
      }

      log("info", "crm_sync.pushed", {
        provider: row.provider,
        entityId: row.entity_id,
        externalId: result.externalId,
        fields: Object.keys(payload).length,
      });

      await appendSyncLog({
        workspaceId: row.workspace_id,
        provider: row.provider,
        direction: "outbound",
        entityId: row.entity_id,
        action: "created",
        summary: `Pushed to ${row.provider}${result.externalId ? ` (ID: ${result.externalId})` : ""} — ${Object.keys(payload).length} fields`,
        payloadSnapshot: payload,
      });
      return { ok: true };
    }

    if (row.direction === "inbound") {
      // ── Inbound CRM → Recall Touch (last-write-wins) ──────────────────
      const provider = row.provider as CrmProviderId;

      // 1. Normalize the provider-specific payload into a flat object
      const normalizedPayload = normalizeCrmPayload(provider, row.payload);

      // 2. Get field mapping config (custom or defaults) and reverse-map to RT fields
      const { data: configRow } = await db
        .from("integration_configs")
        .select("config")
        .eq("workspace_id", row.workspace_id)
        .eq("provider", provider)
        .eq("config_type", "field_mapping")
        .maybeSingle();
      const mappingConfig = (configRow as { config?: FieldMappingConfig } | null)?.config;
      let effectiveConfig = mappingConfig as FieldMappingConfig;
      if (!effectiveConfig || !Array.isArray(effectiveConfig.mappings) || effectiveConfig.mappings.length === 0) {
        effectiveConfig = { mappings: getDefaultMappings(provider) };
      }

      const rtFields = applyReverseMapping(normalizedPayload, effectiveConfig);

      // Also extract email/phone directly from the raw payload for matching
      const rawEmail = (normalizedPayload.email ?? normalizedPayload.Email ?? normalizedPayload.mail ?? "").toString().trim().toLowerCase();
      const rawPhone = formatPhone(normalizedPayload.phone ?? normalizedPayload.Phone ?? normalizedPayload.mobilePhone ?? "");
      const matchEmail = (rtFields.email ?? rawEmail).toString().trim().toLowerCase();
      const matchPhone = formatPhone((rtFields.phone ?? rawPhone).toString());

      if (!matchEmail && !matchPhone) {
        // Cannot match without at least an email or phone
        await db
          .from("sync_queue")
          .update({ status: "completed", updated_at: new Date().toISOString(), completed_at: new Date().toISOString() })
          .eq("id", jobId);
        await appendSyncLog({
          workspaceId: row.workspace_id,
          provider,
          direction: "inbound",
          entityId: row.entity_id,
          action: "skipped",
          summary: "No email or phone in payload — cannot match to lead",
          payloadSnapshot: row.payload,
        });
        return { ok: true };
      }

      // 3. Try to find an existing lead by email first, then phone
      let existingLead: { id: string; metadata?: Record<string, unknown> } | null = null;

      if (matchEmail) {
        const { data } = await db
          .from("leads")
          .select("id, metadata")
          .eq("workspace_id", row.workspace_id)
          .ilike("email", matchEmail)
          .limit(1)
          .maybeSingle();
        existingLead = data as { id: string; metadata?: Record<string, unknown> } | null;
      }
      if (!existingLead && matchPhone) {
        const phoneDigits = matchPhone.replace(/\D/g, "");
        if (phoneDigits.length >= 10) {
          const { data } = await db
            .from("leads")
            .select("id, metadata")
            .eq("workspace_id", row.workspace_id)
            .or(`phone.eq.${matchPhone},phone.like.%${phoneDigits.slice(-10)}`)
            .limit(1)
            .maybeSingle();
          existingLead = data as { id: string; metadata?: Record<string, unknown> } | null;
        }
      }

      // 4. Build update payload from reverse-mapped fields
      const updateFields: Record<string, unknown> = {};
      if (rtFields.name) updateFields.name = String(rtFields.name).trim();
      if (rtFields.email) updateFields.email = String(rtFields.email).trim().toLowerCase();
      if (rtFields.phone) updateFields.phone = formatPhone(rtFields.phone);
      if (rtFields.company) updateFields.company = String(rtFields.company).trim();
      if (rtFields.state) updateFields.status = String(rtFields.state).toLowerCase();
      updateFields.updated_at = new Date().toISOString();
      updateFields.last_activity_at = new Date().toISOString();

      if (existingLead) {
        // ── UPDATE existing lead ──
        const mergedMeta = {
          ...(existingLead.metadata ?? {}),
          last_crm_sync: new Date().toISOString(),
          crm_provider: provider,
        };
        const { error: updateErr } = await db
          .from("leads")
          .update({ ...updateFields, metadata: mergedMeta })
          .eq("id", existingLead.id)
          .eq("workspace_id", row.workspace_id);

        if (updateErr) {
          throw new Error(`Failed to update lead ${existingLead.id}: ${updateErr.message}`);
        }

        await db
          .from("sync_queue")
          .update({ status: "completed", updated_at: new Date().toISOString(), completed_at: new Date().toISOString() })
          .eq("id", jobId);
        await appendSyncLog({
          workspaceId: row.workspace_id,
          provider,
          direction: "inbound",
          entityId: existingLead.id,
          action: "updated",
          summary: `Updated lead ${existingLead.id} from ${provider} — ${Object.keys(updateFields).length} fields`,
          payloadSnapshot: row.payload,
        });

        log("info", "crm_sync.inbound_updated", {
          provider,
          leadId: existingLead.id,
          fields: Object.keys(updateFields).length,
        });
        return { ok: true };
      } else {
        // ── CREATE new lead from CRM data ──
        const newLeadData: Record<string, unknown> = {
          workspace_id: row.workspace_id,
          name: updateFields.name ?? "Unknown (CRM Import)",
          email: updateFields.email ?? null,
          phone: updateFields.phone ?? null,
          company: updateFields.company ?? null,
          status: updateFields.status ?? "NEW",
          metadata: {
            source: `crm_${provider}`,
            imported_at: new Date().toISOString(),
            crm_provider: provider,
          },
          last_activity_at: new Date().toISOString(),
        };

        const { data: created, error: insertErr } = await db
          .from("leads")
          .insert(newLeadData)
          .select("id")
          .maybeSingle();

        if (insertErr || !created) {
          throw new Error(`Failed to create lead from ${provider}: ${insertErr?.message ?? "Unknown error"}`);
        }

        const createdId = (created as { id: string }).id;

        await db
          .from("sync_queue")
          .update({ status: "completed", updated_at: new Date().toISOString(), completed_at: new Date().toISOString() })
          .eq("id", jobId);
        await appendSyncLog({
          workspaceId: row.workspace_id,
          provider,
          direction: "inbound",
          entityId: createdId,
          action: "created",
          summary: `Created new lead ${createdId} from ${provider}`,
          payloadSnapshot: row.payload,
        });

        log("info", "crm_sync.inbound_created", {
          provider,
          leadId: createdId,
          fields: Object.keys(updateFields).length,
        });
        return { ok: true };
      }
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
  "airtable",
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
    .eq("status", "active")
    .in("provider", CRM_PROVIDERS);
  const providers = (data ?? []).map((r: { provider: string }) => r.provider as CrmProviderId);
  return providers.filter((p): p is CrmProviderId => CRM_PROVIDERS.includes(p));
}
