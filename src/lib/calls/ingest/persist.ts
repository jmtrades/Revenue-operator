/**
 * Phase 12e — Persistence layer for call ingestion + intelligence results.
 *
 * The actual Supabase writes are thin — the value here is in:
 *   1. Serializing our TypeScript shapes (NormalizedCallTranscript,
 *      CallIntelligenceResult) into the database column shapes exactly,
 *      without duplicating key names.
 *   2. Providing an injectable writer so tests can exercise the pipeline
 *      without a live Supabase client.
 *
 * The `runIngestion` function is the main orchestrator used by the API
 * route, webhooks, and adapter scripts.
 */

import { analyseCallTranscript, type PipelineContext } from "./pipeline";
import type {
  CallIntelligenceResult,
  NormalizedCallTranscript,
} from "./types";

// ---------------------------------------------------------------------------
// Row shapes (mirror the migration at supabase/migrations/20260422_phase12e_*)
// ---------------------------------------------------------------------------

export interface CallIngestionRow {
  workspace_id: string;
  source: NormalizedCallTranscript["source"];
  external_id: string;
  lead_id: string | null;
  user_id: string | null;
  direction: NormalizedCallTranscript["direction"];
  started_at: string;
  duration_sec: number | null;
  counterparty_phone: string | null;
  counterparty_email: string | null;
  recording_url: string | null;
  turns: NormalizedCallTranscript["turns"];
  raw: NormalizedCallTranscript["raw"];
}

export interface CallIntelligenceResultRow {
  workspace_id: string;
  source: CallIntelligenceResult["source"];
  transcript_external_id: string;
  ingestion_id: string | null;
  lead_id: string | null;
  amd: CallIntelligenceResult["amd"] | null;
  ivr_path: CallIntelligenceResult["ivrPath"];
  commitments: CallIntelligenceResult["commitments"];
  hallucination_findings: CallIntelligenceResult["hallucinationFindings"];
  gatekeeper_moments: CallIntelligenceResult["gatekeeperMoments"];
  competitors_mentioned: CallIntelligenceResult["competitorsMentioned"];
  warm_transfer_brief: CallIntelligenceResult["warmTransferBrief"] | null;
  call_quality_score: CallIntelligenceResult["callQualityScore"] | null;
  next_actions: CallIntelligenceResult["nextActions"];
  risks: CallIntelligenceResult["risks"];
  one_line_summary: string;
  schema_version: CallIntelligenceResult["schemaVersion"];
  analyzed_at: string;
}

// ---------------------------------------------------------------------------
// Pure serializers
// ---------------------------------------------------------------------------

export function toIngestionRow(
  transcript: NormalizedCallTranscript,
): CallIngestionRow {
  return {
    workspace_id: transcript.workspaceId,
    source: transcript.source,
    external_id: transcript.externalId,
    lead_id: transcript.leadId,
    user_id: transcript.userId,
    direction: transcript.direction,
    started_at: transcript.startedAtIso,
    duration_sec: transcript.durationSec,
    counterparty_phone: transcript.counterpartyPhone,
    counterparty_email: transcript.counterpartyEmail,
    recording_url: transcript.recordingUrl,
    turns: transcript.turns ?? [],
    raw: transcript.raw ?? {},
  };
}

export function toIntelligenceRow(
  result: CallIntelligenceResult,
  ingestionId: string | null = null,
): CallIntelligenceResultRow {
  return {
    workspace_id: result.workspaceId,
    source: result.source,
    transcript_external_id: result.transcriptExternalId,
    ingestion_id: ingestionId,
    lead_id: result.leadId,
    amd: result.amd ?? null,
    ivr_path: result.ivrPath ?? [],
    commitments: result.commitments,
    hallucination_findings: result.hallucinationFindings,
    gatekeeper_moments: result.gatekeeperMoments,
    competitors_mentioned: result.competitorsMentioned,
    warm_transfer_brief: result.warmTransferBrief ?? null,
    call_quality_score: result.callQualityScore ?? null,
    next_actions: result.nextActions,
    risks: result.risks,
    one_line_summary: result.oneLineSummary,
    schema_version: result.schemaVersion,
    analyzed_at: result.analyzedAtIso,
  };
}

// ---------------------------------------------------------------------------
// Writer abstraction (so tests can inject a stub)
// ---------------------------------------------------------------------------

export interface IngestionWriter {
  /**
   * Upsert the normalized transcript. Returns the DB row id so the result
   * can reference it.
   */
  upsertIngestion(row: CallIngestionRow): Promise<{ id: string }>;
  /**
   * Upsert the intelligence result row. Returns the DB row id.
   */
  upsertIntelligenceResult(row: CallIntelligenceResultRow): Promise<{ id: string }>;
}

export interface RunIngestionOptions {
  writer: IngestionWriter;
  pipelineContext?: PipelineContext;
}

export interface RunIngestionResult {
  ingestionId: string;
  intelligenceId: string;
  analysis: CallIntelligenceResult;
}

/**
 * End-to-end orchestrator: normalize → analyse → persist.
 *
 * Pure except for the two writer calls. Always idempotent on
 * (workspace_id, source, external_id).
 */
export async function runIngestion(
  transcript: NormalizedCallTranscript,
  opts: RunIngestionOptions,
): Promise<RunIngestionResult> {
  const { writer, pipelineContext = {} } = opts;
  const analysis = analyseCallTranscript(transcript, pipelineContext);

  const ingestion = await writer.upsertIngestion(toIngestionRow(transcript));
  const intel = await writer.upsertIntelligenceResult(
    toIntelligenceRow(analysis, ingestion.id),
  );

  return {
    ingestionId: ingestion.id,
    intelligenceId: intel.id,
    analysis,
  };
}
