/**
 * Phase 12e — Supabase-backed implementation of IngestionWriter.
 *
 * Wraps `getDb()` (which already enforces RLS via workspace_owner_check)
 * and does an upsert on the unique keys defined in the migration:
 *   - call_ingestions           (workspace_id, source, external_id)
 *   - call_intelligence_results (workspace_id, source, transcript_external_id)
 *
 * Kept separate from `persist.ts` so the pure pipeline can be unit-tested
 * without importing any Supabase code.
 */

import { getDb } from "@/lib/db/queries";
import type {
  CallIngestionRow,
  CallIntelligenceResultRow,
  IngestionWriter,
} from "./persist";

export function createSupabaseIngestionWriter(): IngestionWriter {
  return {
    async upsertIngestion(row: CallIngestionRow): Promise<{ id: string }> {
      const db = getDb();
      const { data, error } = await db
        .from("call_ingestions")
        .upsert(row, { onConflict: "workspace_id,source,external_id" })
        .select("id")
        .single();
      if (error || !data) {
        throw new Error(`call_ingestions upsert failed: ${error?.message ?? "no row"}`);
      }
      return { id: (data as { id: string }).id };
    },

    async upsertIntelligenceResult(row: CallIntelligenceResultRow): Promise<{ id: string }> {
      const db = getDb();
      const { data, error } = await db
        .from("call_intelligence_results")
        .upsert(row, { onConflict: "workspace_id,source,transcript_external_id" })
        .select("id")
        .single();
      if (error || !data) {
        throw new Error(`call_intelligence_results upsert failed: ${error?.message ?? "no row"}`);
      }
      return { id: (data as { id: string }).id };
    },
  };
}
