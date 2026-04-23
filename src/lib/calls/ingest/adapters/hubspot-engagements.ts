/**
 * Phase 12e — HubSpot Engagements adapter.
 *
 * HubSpot stores calls as Engagement objects with `engagementType: "CALL"`
 * (v1 engagements API) or as CRM objects of type "call" (v3). Both surface
 * optional `bodyPreview`, `hs_call_body`, `hs_call_recording_url`, and —
 * for HubSpot Conversations AI — a transcript field.
 *
 * We normalize both v1 and v3 shapes into our canonical NormalizedCallTranscript.
 *
 * Pure function — takes a raw HubSpot payload as input. The network fetch is
 * done upstream by the orchestrator so this layer stays testable.
 */

import type {
  CallDirection,
  NormalizedCallTranscript,
  TranscriptTurn,
} from "../types";

/**
 * The shape HubSpot's v3 CRM calls API returns (only the fields we use).
 */
export interface HubSpotCallV3 {
  id: string;
  properties: {
    hs_call_body?: string | null;
    hs_call_direction?: string | null; // "INBOUND" | "OUTBOUND"
    hs_call_duration?: string | null;  // seconds as string
    hs_call_from_number?: string | null;
    hs_call_to_number?: string | null;
    hs_call_recording_url?: string | null;
    hs_call_title?: string | null;
    hs_call_transcript?: string | null; // Conversation intelligence
    hs_timestamp?: string | null;
    hs_createdate?: string | null;
  };
  associations?: {
    contacts?: { results?: Array<{ id: string }> };
    deals?: { results?: Array<{ id: string }> };
  };
}

/**
 * The v1 Engagements shape (legacy, still very common).
 */
export interface HubSpotEngagementV1 {
  engagement: {
    id: number | string;
    type: string; // "CALL"
    timestamp?: number | null;
    createdAt?: number | null;
  };
  metadata?: {
    body?: string | null;
    durationMilliseconds?: number | null;
    disposition?: string | null;
    fromNumber?: string | null;
    toNumber?: string | null;
    recordingUrl?: string | null;
    status?: string | null;
    title?: string | null;
    transcription?: string | null;
    direction?: string | null;
  };
  associations?: {
    contactIds?: number[];
    dealIds?: number[];
  };
}

export interface HubSpotAdapterContext {
  workspaceId: string;
  /**
   * Optional lead-id resolution hook. Given phone/email, return our internal
   * lead UUID if one matches.
   */
  resolveLeadId?: (email: string | null, phone: string | null) => Promise<string | null>;
}

/**
 * Normalize a HubSpot v3 "call" record into a NormalizedCallTranscript.
 */
export async function normalizeHubSpotCallV3(
  call: HubSpotCallV3,
  ctx: HubSpotAdapterContext,
): Promise<NormalizedCallTranscript> {
  const p = call.properties ?? {};
  const direction = parseDirection(p.hs_call_direction);
  const counterpartyPhone =
    direction === "inbound"
      ? p.hs_call_from_number ?? null
      : p.hs_call_to_number ?? null;
  const startedAtIso = firstValidIso(p.hs_timestamp, p.hs_createdate) ?? new Date().toISOString();
  const durationSec = p.hs_call_duration ? parseInt(p.hs_call_duration, 10) || null : null;

  const turns = parseHubSpotTranscript(p.hs_call_transcript ?? p.hs_call_body ?? null);

  const leadId = ctx.resolveLeadId
    ? await ctx.resolveLeadId(null, counterpartyPhone)
    : null;

  return {
    externalId: String(call.id),
    source: "hubspot",
    workspaceId: ctx.workspaceId,
    leadId,
    userId: null,
    direction,
    startedAtIso,
    durationSec,
    counterpartyPhone,
    counterpartyEmail: null,
    recordingUrl: p.hs_call_recording_url ?? null,
    turns,
    raw: call as unknown as Record<string, unknown>,
  };
}

/**
 * Normalize a HubSpot v1 "engagement" record into a NormalizedCallTranscript.
 */
export async function normalizeHubSpotEngagementV1(
  eng: HubSpotEngagementV1,
  ctx: HubSpotAdapterContext,
): Promise<NormalizedCallTranscript> {
  const m = eng.metadata ?? {};
  const direction = parseDirection(m.direction);
  const counterpartyPhone = direction === "inbound" ? m.fromNumber ?? null : m.toNumber ?? null;
  const startedAtIso =
    eng.engagement.timestamp ? new Date(eng.engagement.timestamp).toISOString() :
    eng.engagement.createdAt ? new Date(eng.engagement.createdAt).toISOString() :
    new Date().toISOString();
  const durationSec = m.durationMilliseconds != null ? Math.floor(m.durationMilliseconds / 1000) : null;

  const turns = parseHubSpotTranscript(m.transcription ?? m.body ?? null);

  const leadId = ctx.resolveLeadId
    ? await ctx.resolveLeadId(null, counterpartyPhone)
    : null;

  return {
    externalId: String(eng.engagement.id),
    source: "hubspot",
    workspaceId: ctx.workspaceId,
    leadId,
    userId: null,
    direction,
    startedAtIso,
    durationSec,
    counterpartyPhone,
    counterpartyEmail: null,
    recordingUrl: m.recordingUrl ?? null,
    turns,
    raw: eng as unknown as Record<string, unknown>,
  };
}

function parseDirection(raw: string | null | undefined): CallDirection {
  const s = (raw ?? "").toLowerCase();
  if (s.startsWith("in")) return "inbound";
  if (s.startsWith("out")) return "outbound";
  return "unknown";
}

function firstValidIso(...candidates: Array<string | null | undefined>): string | null {
  for (const c of candidates) {
    if (!c) continue;
    const parsed = Date.parse(c);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  return null;
}

/**
 * Parse HubSpot's transcription format.
 *
 * HubSpot Conversations AI returns transcripts as either:
 *   - "Rep (Jim): Hello\nCustomer (Prospect): Hi back"
 *   - a JSON-encoded array of { speaker, text, timestamp }
 *   - loose HTML (hs_call_body) — we strip to paragraphs
 */
export function parseHubSpotTranscript(raw: string | null | undefined): TranscriptTurn[] {
  const text = (raw ?? "").trim();
  if (!text) return [];

  // Try JSON first
  if (text.startsWith("[") || text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed
          .map((t) => normalizeHubSpotTurn(t))
          .filter((t): t is TranscriptTurn => t !== null);
      }
    } catch {
      // fall through to line-split
    }
  }

  // Strip HTML tags (hs_call_body is HTML)
  const stripped = text.replace(/<\/?[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const lines = stripped.split(/\n|(?<=[.!?])\s+(?=[A-Z][a-z]+(?:\s*\([^)]+\))?:)/);
  const turns: TranscriptTurn[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z][A-Za-z0-9 _.'-]{0,40})(?:\s*\([^)]*\))?:\s*(.+?)\s*$/);
    if (m) {
      const speakerLabel = m[1].trim().toLowerCase();
      turns.push({
        speaker:
          /\b(rep|agent|sales|ai|assistant|jim|our)\b/.test(speakerLabel)
            ? "agent"
            : /\b(customer|prospect|lead|caller|client|them)\b/.test(speakerLabel)
            ? "caller"
            : "other",
        text: m[2].trim(),
        startSec: null,
        endSec: null,
        speakerName: m[1].trim(),
      });
    } else if (line.trim().length > 0 && turns.length > 0) {
      turns[turns.length - 1].text += " " + line.trim();
    }
  }
  return turns;
}

function normalizeHubSpotTurn(t: unknown): TranscriptTurn | null {
  if (!t || typeof t !== "object") return null;
  const obj = t as Record<string, unknown>;
  const text = typeof obj.text === "string" ? obj.text : typeof obj.content === "string" ? obj.content : "";
  if (!text.trim()) return null;
  const speakerRaw = typeof obj.speaker === "string" ? obj.speaker.toLowerCase() : "";
  let speaker: TranscriptTurn["speaker"] = "other";
  if (/\b(rep|agent|sales|ai|assistant)\b/.test(speakerRaw)) speaker = "agent";
  else if (/\b(customer|prospect|lead|caller|client)\b/.test(speakerRaw)) speaker = "caller";
  return {
    speaker,
    text: text.trim(),
    startSec: typeof obj.startSec === "number" ? obj.startSec : typeof obj.timestamp === "number" ? obj.timestamp / 1000 : null,
    endSec: typeof obj.endSec === "number" ? obj.endSec : null,
    speakerName: typeof obj.speakerName === "string" ? obj.speakerName : typeof obj.speaker === "string" ? obj.speaker : null,
  };
}
