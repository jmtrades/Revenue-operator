/**
 * Bulk ingestion pipeline for CRM backfill pulls.
 *
 * Flow (per record):
 *   raw payload → normalizeCrmPayload (unwrap provider envelope)
 *               → applyReverseMapping (CRM fields → LeadRecord fields)
 *               → upsert into revenue_operator.leads keyed on (workspace_id, external_id)
 *               → append sync_log row
 *
 * The uniqueness on (workspace_id, external_id) means a re-pull is idempotent:
 * we UPDATE the existing row instead of creating a duplicate. This matters a
 * lot for cursor-resumable backfills where a crash mid-batch would otherwise
 * leave dupes.
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import {
  applyReverseMapping,
  getDefaultMappings,
  normalizeCrmPayload,
  type CrmProviderId,
  type FieldMappingConfig,
} from "./field-mapper";
import type { PulledRecord } from "./crm-pull";

export interface IngestResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
}

async function loadMappingConfig(
  workspaceId: string,
  provider: CrmProviderId,
): Promise<FieldMappingConfig> {
  const db = getDb();
  const { data } = await db
    .from("workspace_crm_connections")
    .select("field_mapping")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .maybeSingle();

  const row = data as { field_mapping?: FieldMappingConfig | null } | null;
  if (row?.field_mapping && Array.isArray(row.field_mapping.mappings)) {
    return row.field_mapping;
  }
  return { mappings: getDefaultMappings(provider) };
}

/**
 * Ingest a batch of pulled records. Returns a summary; never throws for a
 * single-record failure — those are counted into `errors` and the overall
 * batch continues so one malformed row can't abort the whole backfill.
 */
export async function ingestPulledBatch(
  workspaceId: string,
  provider: CrmProviderId,
  records: PulledRecord[],
): Promise<IngestResult> {
  if (records.length === 0) return { imported: 0, updated: 0, skipped: 0, errors: 0 };

  const db = getDb();
  const config = await loadMappingConfig(workspaceId, provider);

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const rec of records) {
    try {
      const normalized = normalizeCrmPayload(provider, rec.raw);
      const mapped = applyReverseMapping(normalized, config);

      // Require at least one identifying field (phone or email or name) so we
      // don't flood leads with empty placeholders from a misconfigured mapping.
      if (!mapped.phone && !mapped.email && !mapped.name) {
        skipped++;
        continue;
      }

      const leadRow = {
        workspace_id: workspaceId,
        external_id: rec.externalId,
        name: mapped.name ?? "Unknown (CRM Import)",
        email: mapped.email ?? null,
        phone: mapped.phone ?? null,
        company: mapped.company ?? null,
        state: mapped.state ?? "NEW",
        metadata: {
          source: `crm_${provider}`,
          crm_provider: provider,
          crm_external_id: rec.externalId,
          imported_at: new Date().toISOString(),
        },
        last_activity_at: new Date().toISOString(),
      };

      // Upsert on (workspace_id, external_id) — existing rows get updated,
      // new rows get inserted. Supabase returns the resulting row so we can
      // distinguish create vs update via the affected count approach.
      const { data, error } = await db
        .from("leads")
        .upsert(leadRow, { onConflict: "workspace_id,external_id" })
        .select("id, created_at, updated_at")
        .maybeSingle();

      if (error || !data) {
        errors++;
        continue;
      }

      const row = data as { id: string; created_at: string; updated_at: string };
      // If updated_at equals created_at (within 1s) it's a fresh insert.
      const createdMs = new Date(row.created_at).getTime();
      const updatedMs = new Date(row.updated_at).getTime();
      const isNew = Math.abs(updatedMs - createdMs) < 1_000;

      if (isNew) imported++;
      else updated++;
    } catch (err) {
      errors++;
      log("warn", "crm_ingest.record_failed", {
        provider,
        workspaceId,
        externalId: rec.externalId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // One aggregate sync_log row per batch — keeps the log skinny while still
  // preserving observability into each pull.
  try {
    await db.from("sync_log").insert({
      workspace_id: workspaceId,
      provider,
      direction: "inbound",
      entity_type: "contact",
      action: "backfill_batch",
      summary: `Pulled ${records.length}: ${imported} new / ${updated} updated / ${skipped} skipped / ${errors} errors`,
      payload_snapshot: { imported, updated, skipped, errors, sampled_external_ids: records.slice(0, 5).map((r) => r.externalId) },
    });
  } catch {
    // Non-blocking — sync_log is observability, not correctness.
  }

  return { imported, updated, skipped, errors };
}
