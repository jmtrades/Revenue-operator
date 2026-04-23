/**
 * Phase 12e — Manual-upload adapter.
 *
 * The simplest possible adapter: the caller hands us a raw transcript
 * payload (from a webhook, a file upload, or a test fixture) and we
 * normalize it into our canonical shape.
 *
 * This is the path used by:
 *   - the operator dashboard's "upload a call" button
 *   - our E2E fixtures
 *   - any CRM/dialer that hits our generic webhook endpoint
 *
 * Pure function — no I/O. Safe to call from anywhere.
 */

import type {
  CallDirection,
  NormalizedCallTranscript,
  TranscriptTurn,
} from "../types";

export interface ManualUploadInput {
  externalId: string;
  workspaceId: string;
  /** Optional lead match (we'll also try phone/email match upstream). */
  leadId?: string | null;
  userId?: string | null;
  startedAtIso: string;
  durationSec?: number | null;
  direction?: CallDirection;
  counterpartyPhone?: string | null;
  counterpartyEmail?: string | null;
  recordingUrl?: string | null;
  /** Source label if the caller wants to brand it (defaults to "manual_upload"). */
  sourceLabel?: "manual_upload" | "hubspot" | "zoom_cloud" | "zoom_phone" | "gong" | "chorus";

  /** Transcript in any of these shapes — we'll normalize all three. */
  turns?: Array<{
    speaker?: string | null;
    text: string;
    startSec?: number | null;
    endSec?: number | null;
    speakerName?: string | null;
  }>;
  /** Alternative: a single contiguous string. We'll do a best-effort split. */
  rawText?: string | null;
  /** Raw provider payload — keep for debugging. */
  raw?: Record<string, unknown>;
}

/**
 * Normalize a manual-upload payload into a canonical NormalizedCallTranscript.
 */
export function normalizeManualUpload(input: ManualUploadInput): NormalizedCallTranscript {
  const turns = buildTurns(input);
  return {
    externalId: input.externalId,
    source: input.sourceLabel ?? "manual_upload",
    workspaceId: input.workspaceId,
    leadId: input.leadId ?? null,
    userId: input.userId ?? null,
    direction: input.direction ?? "unknown",
    startedAtIso: input.startedAtIso,
    durationSec: input.durationSec ?? null,
    counterpartyPhone: input.counterpartyPhone ?? null,
    counterpartyEmail: input.counterpartyEmail ?? null,
    recordingUrl: input.recordingUrl ?? null,
    turns,
    raw: input.raw ?? {},
  };
}

function buildTurns(input: ManualUploadInput): TranscriptTurn[] {
  if (Array.isArray(input.turns) && input.turns.length > 0) {
    return input.turns.map((t) => ({
      speaker: normalizeSpeaker(t.speaker),
      text: (t.text ?? "").trim(),
      startSec: t.startSec ?? null,
      endSec: t.endSec ?? null,
      speakerName: t.speakerName ?? null,
    })).filter((t) => t.text.length > 0);
  }

  const raw = (input.rawText ?? "").trim();
  if (!raw) return [];

  // Best-effort split for "Speaker: text" line formats.
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const parsed: TranscriptTurn[] = [];
  for (const line of lines) {
    const m = line.match(/^([A-Za-z][A-Za-z0-9 _.-]{0,40}):\s*(.+)$/);
    if (m) {
      parsed.push({
        speaker: normalizeSpeaker(m[1]),
        text: m[2].trim(),
        startSec: null,
        endSec: null,
        speakerName: m[1].trim(),
      });
    } else {
      // Orphan line — attach to previous turn if any, else "other"
      if (parsed.length > 0) {
        parsed[parsed.length - 1].text += " " + line;
      } else {
        parsed.push({ speaker: "other", text: line, startSec: null, endSec: null });
      }
    }
  }
  return parsed;
}

function normalizeSpeaker(raw: string | null | undefined): TranscriptTurn["speaker"] {
  if (!raw) return "other";
  const s = raw.toLowerCase().trim();
  if (/^(agent|rep|sales|our|ai|assistant|me|user\s*\(agent\))\b/.test(s)) return "agent";
  if (/^(caller|lead|prospect|customer|client|them|contact)\b/.test(s)) return "caller";
  // Named speaker heuristic: default to "caller" (most CRMs surface caller first).
  return "other";
}
