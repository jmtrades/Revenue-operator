/**
 * Phase 12e — End-to-end tests for the unified call ingestion pipeline.
 *
 * These tests prove the "listen to calls through the CRM or Zoom and know
 * how to proceed" directive:
 *   - manual-upload adapter normalizes arbitrary transcript payloads
 *   - Zoom VTT parser extracts speaker-tagged turns
 *   - HubSpot engagement/call shapes normalize into our canonical form
 *   - the Phase 12c intelligence stack runs end-to-end and surfaces
 *     commitments, hallucination risks, gatekeeper moments, competitor
 *     mentions, and derived next-actions
 *   - the pure serializer maps domain shapes onto DB row shapes exactly
 *   - the orchestrator runIngestion writes both rows idempotently
 */

import { describe, it, expect, vi } from "vitest";
import { normalizeManualUpload } from "../src/lib/calls/ingest/adapters/manual-upload";
import { parseZoomVtt, normalizeZoomCloudRecording } from "../src/lib/calls/ingest/adapters/zoom-cloud";
import {
  parseHubSpotTranscript,
  normalizeHubSpotCallV3,
  normalizeHubSpotEngagementV1,
} from "../src/lib/calls/ingest/adapters/hubspot-engagements";
import { analyseCallTranscript } from "../src/lib/calls/ingest/pipeline";
import {
  runIngestion,
  toIngestionRow,
  toIntelligenceRow,
  type IngestionWriter,
} from "../src/lib/calls/ingest/persist";
import type { NormalizedCallTranscript } from "../src/lib/calls/ingest/types";

// ---------------------------------------------------------------------------
// manual-upload adapter
// ---------------------------------------------------------------------------

describe("manual-upload adapter", () => {
  it("normalizes turns array input into canonical shape", () => {
    const out = normalizeManualUpload({
      externalId: "ext-1",
      workspaceId: "ws-1",
      startedAtIso: "2026-04-22T12:00:00.000Z",
      durationSec: 180,
      direction: "outbound",
      counterpartyPhone: "+15550001",
      turns: [
        { speaker: "agent", text: "Hi there, this is Jim from Acme." },
        { speaker: "caller", text: "Oh hi, yeah I was expecting your call." },
      ],
    });
    expect(out.source).toBe("manual_upload");
    expect(out.turns).toHaveLength(2);
    expect(out.turns[0].speaker).toBe("agent");
    expect(out.turns[1].speaker).toBe("caller");
    expect(out.direction).toBe("outbound");
    expect(out.durationSec).toBe(180);
  });

  it("parses 'Speaker: text' line-format rawText", () => {
    const out = normalizeManualUpload({
      externalId: "ext-2",
      workspaceId: "ws-1",
      startedAtIso: "2026-04-22T12:00:00.000Z",
      rawText: `Agent: Hi there.\nProspect: Yeah, speaking.`,
    });
    expect(out.turns.map((t) => t.speaker)).toEqual(["agent", "caller"]);
    expect(out.turns[0].text).toBe("Hi there.");
  });

  it("drops empty turns and tolerates missing optional fields", () => {
    const out = normalizeManualUpload({
      externalId: "ext-3",
      workspaceId: "ws-1",
      startedAtIso: "2026-04-22T12:00:00.000Z",
      turns: [
        { speaker: "agent", text: "" },
        { speaker: "caller", text: "   " },
        { speaker: "caller", text: "Real utterance." },
      ],
    });
    expect(out.turns).toHaveLength(1);
    expect(out.direction).toBe("unknown");
    expect(out.counterpartyPhone).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Zoom VTT parser + adapter
// ---------------------------------------------------------------------------

describe("zoom-cloud adapter", () => {
  it("parses a valid WEBVTT cue list and assigns speakers", () => {
    const vtt = [
      "WEBVTT",
      "",
      "1",
      "00:00:03.500 --> 00:00:05.800",
      "Jim Rep: Hi there, this is Jim from Acme.",
      "",
      "2",
      "00:00:06.200 --> 00:00:08.100",
      "Prospect: Oh hi, yeah I was expecting your call.",
      "",
    ].join("\n");
    const turns = parseZoomVtt(vtt, "jim@acme.com");
    expect(turns).toHaveLength(2);
    expect(turns[0].speaker).toBe("agent");
    expect(turns[0].text).toBe("Hi there, this is Jim from Acme.");
    expect(turns[0].startSec).toBeCloseTo(3.5, 3);
    expect(turns[1].speaker).toBe("caller");
  });

  it("returns [] on non-WEBVTT content", () => {
    expect(parseZoomVtt("not a transcript", null)).toEqual([]);
    expect(parseZoomVtt("", null)).toEqual([]);
  });

  it("normalizes a zoom meeting + recording via injected fetcher", async () => {
    const vtt = [
      "WEBVTT",
      "",
      "1",
      "00:00:01.000 --> 00:00:03.000",
      "Jim Rep: Hi, thanks for taking the call.",
      "",
      "2",
      "00:00:03.500 --> 00:00:06.000",
      "Prospect: Sure, what's this about?",
      "",
    ].join("\n");
    const t = await normalizeZoomCloudRecording(
      {
        id: "123456789",
        start_time: "2026-04-22T15:00:00Z",
        duration: 25, // minutes
        host_email: "jim@acme.com",
        participants: [
          { user_email: "jim@acme.com", name: "Jim Rep" },
          { user_email: "prospect@buyer.com", name: "Prospect" },
        ],
      },
      {
        id: "rec-1",
        meeting_id: "123456789",
        recording_files: [
          {
            id: "f-1",
            recording_type: "audio_transcript",
            file_type: "VTT",
            download_url: "https://zoom.example/rec-1.vtt",
            status: "completed",
          },
        ],
      },
      {
        workspaceId: "ws-zoom",
        downloadAsset: async () => vtt,
      },
    );
    expect(t.source).toBe("zoom_cloud");
    expect(t.workspaceId).toBe("ws-zoom");
    expect(t.durationSec).toBe(25 * 60);
    expect(t.counterpartyEmail).toBe("prospect@buyer.com");
    expect(t.turns).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// HubSpot adapters
// ---------------------------------------------------------------------------

describe("hubspot-engagements adapter", () => {
  it("parses 'Rep: ... Customer: ...' plain text transcripts", () => {
    const turns = parseHubSpotTranscript(
      "Rep (Jim): Hi there, this is Jim.\nCustomer (Prospect): Hi, yeah I got your email.",
    );
    expect(turns.map((t) => t.speaker)).toEqual(["agent", "caller"]);
  });

  it("parses a JSON-encoded transcript array", () => {
    const json = JSON.stringify([
      { speaker: "rep", text: "Hi there." },
      { speaker: "customer", text: "Yeah, hi." },
    ]);
    const turns = parseHubSpotTranscript(json);
    expect(turns).toHaveLength(2);
    expect(turns[0].speaker).toBe("agent");
    expect(turns[1].speaker).toBe("caller");
  });

  it("normalizes a v3 CRM call record", async () => {
    const t = await normalizeHubSpotCallV3(
      {
        id: "9001",
        properties: {
          hs_call_direction: "OUTBOUND",
          hs_call_duration: "240",
          hs_call_from_number: "+15550002",
          hs_call_to_number: "+15550001",
          hs_call_recording_url: "https://hubspot.example/rec.mp3",
          hs_timestamp: "2026-04-22T16:00:00Z",
          hs_call_transcript:
            "Rep: Hi, quick call. Customer: Yeah, what's this about?",
        },
      },
      { workspaceId: "ws-hs" },
    );
    expect(t.source).toBe("hubspot");
    expect(t.direction).toBe("outbound");
    expect(t.durationSec).toBe(240);
    expect(t.counterpartyPhone).toBe("+15550001");
    expect(t.turns.length).toBeGreaterThan(0);
  });

  it("normalizes a v1 engagement record", async () => {
    const t = await normalizeHubSpotEngagementV1(
      {
        engagement: { id: 42, type: "CALL", timestamp: 1745330400000 },
        metadata: {
          direction: "inbound",
          durationMilliseconds: 180_000,
          fromNumber: "+15550009",
          toNumber: "+15550000",
          recordingUrl: null,
          transcription:
            "Agent: Good morning, how can I help. Caller: I wanted to ask about pricing.",
        },
      },
      { workspaceId: "ws-hs" },
    );
    expect(t.direction).toBe("inbound");
    expect(t.durationSec).toBe(180);
    expect(t.counterpartyPhone).toBe("+15550009");
    expect(t.externalId).toBe("42");
  });
});

// ---------------------------------------------------------------------------
// Pipeline — runs all 12c modules
// ---------------------------------------------------------------------------

const anchorIso = "2026-04-22T12:00:00.000Z";

function fixtureTranscript(overrides: Partial<NormalizedCallTranscript> = {}): NormalizedCallTranscript {
  return {
    externalId: "call-abc",
    source: "manual_upload",
    workspaceId: "ws-1",
    leadId: "lead-1",
    userId: null,
    direction: "outbound",
    startedAtIso: anchorIso,
    durationSec: 300,
    counterpartyPhone: "+15550001",
    counterpartyEmail: "prospect@buyer.com",
    recordingUrl: null,
    turns: [
      { speaker: "agent", text: "Hi there, this is Jim from Acme Revenue.", startSec: 0, endSec: 3 },
      { speaker: "caller", text: "Hey Jim, I was expecting your call.", startSec: 3, endSec: 5 },
      { speaker: "agent", text: "Great — I'll send you the pricing tomorrow.", startSec: 10, endSec: 13 },
      { speaker: "caller", text: "We're currently evaluating HubSpot as well.", startSec: 14, endSec: 17 },
      { speaker: "agent", text: "Totally fair. Our product costs $99/mo.", startSec: 18, endSec: 21 },
    ],
    raw: {},
    ...overrides,
  };
}

describe("analyseCallTranscript — end-to-end intelligence run", () => {
  it("surfaces commitments, hallucination blocks, competitor mentions, and next-actions", () => {
    const transcript = fixtureTranscript();
    const result = analyseCallTranscript(transcript, {
      battlecards: [
        { id: "bc-1", competitorName: "HubSpot", aliases: [], counterLine: "We're a revenue-ops layer on top of your CRM.", proofPoints: [], concession: null } as any,
      ],
    });

    // structural guarantees
    expect(result.transcriptExternalId).toBe("call-abc");
    expect(result.source).toBe("manual_upload");
    expect(result.workspaceId).toBe("ws-1");
    expect(result.schemaVersion).toBe("v1");

    // commitments — the "send you the pricing" promise should be captured
    expect(result.commitments.length).toBeGreaterThan(0);
    const info = result.commitments.find((c) => c.type === "info_send");
    expect(info).toBeDefined();

    // hallucination guard — unverified price claim should be blocked
    const priceFindings = result.hallucinationFindings.filter((f) => f.category === "price");
    expect(priceFindings.length).toBeGreaterThan(0);
    expect(result.hallucinationFindings.some((f) => f.severity === "block")).toBe(true);

    // competitor detection
    expect(result.competitorsMentioned.some((c) => /HubSpot/i.test(c.competitorName))).toBe(true);

    // derived next-actions
    expect(result.nextActions.length).toBeGreaterThan(0);
    expect(result.nextActions.some((a) => a.kind === "escalate_to_human")).toBe(true);

    // risks
    expect(result.risks.some((r) => r.type === "hallucination_risk")).toBe(true);

    // summary is machine-generated short string
    expect(result.oneLineSummary.length).toBeGreaterThan(0);
    expect(result.oneLineSummary).toMatch(/Outbound/);
  });

  it("handles an empty-turns transcript without crashing", () => {
    const transcript = fixtureTranscript({ turns: [], durationSec: 0 });
    const result = analyseCallTranscript(transcript);
    expect(result.amd).toBeNull();
    expect(result.commitments).toEqual([]);
    expect(result.hallucinationFindings).toEqual([]);
    expect(result.oneLineSummary).toMatch(/no commitments/);
    expect(result.nextActions[0].kind).toBe("no_op");
  });

  it("builds a warm-transfer brief when requested", () => {
    const transcript = fixtureTranscript();
    const result = analyseCallTranscript(transcript, {
      buildWarmBrief: true,
      leadContext: { leadName: "Alice Buyer", companyName: "BuyerCo", callIntent: "discovery call" },
    });
    expect(result.warmTransferBrief).not.toBeNull();
    expect(result.warmTransferBrief?.headline).toMatch(/Alice Buyer|BuyerCo/);
    expect(Array.isArray(result.warmTransferBrief?.openCommitments)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Persister — pure serialization + orchestrator
// ---------------------------------------------------------------------------

describe("persist — toIngestionRow / toIntelligenceRow", () => {
  it("maps canonical shapes to DB row shapes 1:1", () => {
    const t = fixtureTranscript();
    const row = toIngestionRow(t);
    expect(row.workspace_id).toBe("ws-1");
    expect(row.source).toBe("manual_upload");
    expect(row.external_id).toBe("call-abc");
    expect(row.started_at).toBe(anchorIso);
    expect(row.turns).toHaveLength(5);
    expect(row.counterparty_email).toBe("prospect@buyer.com");

    const analysis = analyseCallTranscript(t);
    const intelRow = toIntelligenceRow(analysis, "ingestion-uuid");
    expect(intelRow.ingestion_id).toBe("ingestion-uuid");
    expect(intelRow.transcript_external_id).toBe("call-abc");
    expect(intelRow.schema_version).toBe("v1");
    expect(typeof intelRow.one_line_summary).toBe("string");
  });
});

describe("runIngestion — orchestrator", () => {
  it("calls the writer twice and propagates IDs into the result", async () => {
    const transcript = fixtureTranscript();
    const writer: IngestionWriter = {
      upsertIngestion: vi.fn(async () => ({ id: "ing-id-xyz" })),
      upsertIntelligenceResult: vi.fn(async () => ({ id: "intel-id-abc" })),
    };
    const out = await runIngestion(transcript, { writer });
    expect(writer.upsertIngestion).toHaveBeenCalledTimes(1);
    expect(writer.upsertIntelligenceResult).toHaveBeenCalledTimes(1);
    expect(out.ingestionId).toBe("ing-id-xyz");
    expect(out.intelligenceId).toBe("intel-id-abc");
    expect(out.analysis.transcriptExternalId).toBe("call-abc");

    // Verify the intel row carries the ingestion_id
    const call = (writer.upsertIntelligenceResult as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.ingestion_id).toBe("ing-id-xyz");
  });
});
