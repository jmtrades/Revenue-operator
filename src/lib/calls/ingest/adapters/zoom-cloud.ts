/**
 * Phase 12e — Zoom Cloud Recording adapter.
 *
 * Zoom returns cloud recordings via `/meetings/{id}/recordings`. Each recording
 * bundle can include a VTT transcript file that we can download, parse, and
 * normalize into our canonical shape.
 *
 * Flow:
 *   1. Use existing `getMeeting` + `getRecording` from `src/lib/zoom/client.ts`
 *   2. Find the transcript file (file_type === "TRANSCRIPT" / "VTT")
 *   3. Download it with the workspace access token
 *   4. Parse VTT into normalized turns
 *   5. Normalize participants → counterparty phone/email
 *
 * Pure-ish: needs an HTTP fetcher injected so we can unit-test the VTT parser
 * without live Zoom credentials.
 */

import type {
  NormalizedCallTranscript,
  TranscriptTurn,
} from "../types";

export interface ZoomCloudMeeting {
  id: string;
  topic?: string | null;
  start_time?: string | null;
  duration?: number | null; // minutes
  host_email?: string | null;
  participants?: Array<{ user_email?: string | null; name?: string | null }>;
}

export interface ZoomCloudRecording {
  id: string;
  meeting_id: string;
  recording_files?: Array<{
    id: string;
    recording_type: string;
    file_type?: string;
    download_url?: string;
    status: string;
  }>;
}

export interface ZoomAdapterContext {
  workspaceId: string;
  /** Download a Zoom asset URL; must include an auth bearer. */
  downloadAsset: (downloadUrl: string) => Promise<string>;
  /** Optional lead-id resolution hook. */
  resolveLeadId?: (email: string | null, phone: string | null) => Promise<string | null>;
}

/**
 * Normalize a Zoom meeting + recording into a single NormalizedCallTranscript.
 * If no transcript file is available, returns a transcript with empty `turns`
 * so the rest of the pipeline (commitments, hallucination-guard) can still run
 * against metadata-only data.
 */
export async function normalizeZoomCloudRecording(
  meeting: ZoomCloudMeeting,
  recording: ZoomCloudRecording,
  ctx: ZoomAdapterContext,
): Promise<NormalizedCallTranscript> {
  const transcriptFile = (recording.recording_files ?? []).find(
    (f) => f.file_type?.toUpperCase() === "VTT" || f.recording_type?.toLowerCase() === "audio_transcript",
  );

  let turns: TranscriptTurn[] = [];
  if (transcriptFile?.download_url) {
    try {
      const vtt = await ctx.downloadAsset(transcriptFile.download_url);
      turns = parseZoomVtt(vtt, meeting.host_email ?? null);
    } catch {
      // Swallow — the pipeline can still work on metadata.
      turns = [];
    }
  }

  const otherParticipant = (meeting.participants ?? []).find(
    (p) => p.user_email && p.user_email !== meeting.host_email,
  );
  const counterpartyEmail = otherParticipant?.user_email ?? null;

  const leadId = ctx.resolveLeadId
    ? await ctx.resolveLeadId(counterpartyEmail, null)
    : null;

  const startedAtIso =
    meeting.start_time && !Number.isNaN(Date.parse(meeting.start_time))
      ? new Date(meeting.start_time).toISOString()
      : new Date().toISOString();

  return {
    externalId: String(meeting.id),
    source: "zoom_cloud",
    workspaceId: ctx.workspaceId,
    leadId,
    userId: null,
    direction: "unknown",
    startedAtIso,
    durationSec: meeting.duration != null ? meeting.duration * 60 : null,
    counterpartyPhone: null,
    counterpartyEmail,
    recordingUrl: transcriptFile?.download_url ?? null,
    turns,
    raw: { meeting: meeting as unknown as Record<string, unknown>, recording: recording as unknown as Record<string, unknown> },
  };
}

/**
 * Parse a Zoom VTT transcript into TranscriptTurn[].
 *
 * VTT shape:
 *   WEBVTT
 *
 *   1
 *   00:00:03.500 --> 00:00:05.800
 *   Jim Rep: Hi there, this is Jim from Acme.
 *
 *   2
 *   00:00:06.200 --> 00:00:08.100
 *   Prospect: Oh hi, yeah I was expecting your call.
 *
 * We split on blank lines, pull the cue-time, and assign speaker by the
 * "Name:" prefix — defaulting to "agent" for the host and "caller" for
 * others.
 */
export function parseZoomVtt(vtt: string, hostEmail: string | null): TranscriptTurn[] {
  const text = (vtt ?? "").trim();
  if (!text || !/WEBVTT/i.test(text.slice(0, 80))) return [];

  const blocks = text.split(/\r?\n\r?\n/).map((b) => b.trim()).filter(Boolean);
  const turns: TranscriptTurn[] = [];
  const hostLocalPart = hostEmail ? hostEmail.split("@")[0].toLowerCase() : null;

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    // Find the time cue line and the content line(s)
    const cueIdx = lines.findIndex((l) => /\d{2}:\d{2}:\d{2}(?:\.\d+)?\s*-->\s*\d{2}:\d{2}:\d{2}/.test(l));
    if (cueIdx === -1) continue;
    const cue = lines[cueIdx];
    const contentLines = lines.slice(cueIdx + 1);
    if (contentLines.length === 0) continue;
    const content = contentLines.join(" ").trim();
    if (!content) continue;

    const [startStr, endStr] = cue.split(/\s*-->\s*/);
    const startSec = parseVttTime(startStr);
    const endSec = parseVttTime(endStr);

    const namedMatch = content.match(/^([A-Za-z][A-Za-z0-9 _.'-]{0,50}):\s*(.*)$/);
    let speaker: TranscriptTurn["speaker"] = "other";
    let speakerName: string | null = null;
    let body = content;
    if (namedMatch) {
      speakerName = namedMatch[1].trim();
      body = namedMatch[2].trim();
      const lowerName = speakerName.toLowerCase();
      if (hostLocalPart && lowerName.includes(hostLocalPart)) {
        speaker = "agent";
      } else if (/\b(rep|sales|agent|ai|assistant)\b/.test(lowerName)) {
        speaker = "agent";
      } else {
        speaker = "caller";
      }
    }

    if (!body) continue;

    turns.push({
      speaker,
      text: body,
      startSec: startSec ?? null,
      endSec: endSec ?? null,
      speakerName,
    });
  }

  return turns;
}

function parseVttTime(raw: string): number | null {
  if (!raw) return null;
  const s = raw.trim();
  const m = s.match(/^(\d{2}):(\d{2}):(\d{2})(?:[.,](\d+))?$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const sec = parseInt(m[3], 10);
  const ms = m[4] ? parseInt(m[4].padEnd(3, "0").slice(0, 3), 10) : 0;
  return h * 3600 + min * 60 + sec + ms / 1000;
}
