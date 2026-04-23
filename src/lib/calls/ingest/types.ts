/**
 * Phase 12e — Unified call-ingestion types.
 *
 * Every CRM, dialer, and conversation-intelligence platform returns call
 * transcripts in a different shape. This module defines the one canonical
 * shape Recall-Touch uses internally — every adapter (HubSpot, Salesforce,
 * Pipedrive, Close, Zoho, Gong, Chorus, Zoom Cloud, Zoom Phone, …) normalises
 * into this type, and the intelligence pipeline consumes only this type.
 *
 * This lets us add a new source by writing one adapter — the intelligence
 * stack never changes.
 */

export type CallIngestionSource =
  | "hubspot"
  | "salesforce"
  | "pipedrive"
  | "close"
  | "zoho"
  | "gong"
  | "chorus"
  | "zoom_cloud"
  | "zoom_phone"
  | "gohighlevel"
  | "freshsales"
  | "aircall"
  | "dialpad"
  | "ringcentral"
  | "manual_upload";

export type CallDirection = "inbound" | "outbound" | "unknown";

export interface TranscriptTurn {
  /** "agent" = our rep/AI; "caller" = prospect/customer; "other" = unknown speaker. */
  speaker: "agent" | "caller" | "other";
  /** Raw transcript text for this turn (single utterance / paragraph). */
  text: string;
  /** Offset from call start in seconds. Null if source doesn't provide timing. */
  startSec: number | null;
  /** End offset in seconds. Null if unknown. */
  endSec: number | null;
  /** Speaker display name from the provider, if any. */
  speakerName?: string | null;
}

export interface NormalizedCallTranscript {
  /** Provider's ID for this call — stable across re-fetches. */
  externalId: string;
  /** Which upstream system this came from. */
  source: CallIngestionSource;
  /** Our workspace that owns the connection. */
  workspaceId: string;
  /** Matched lead in our system, or null if we can't find one. */
  leadId: string | null;
  /** Matched user (rep) in our workspace, or null. */
  userId: string | null;
  /** Best-effort: inbound / outbound. */
  direction: CallDirection;
  /** ISO-8601 start timestamp. */
  startedAtIso: string;
  /** Call duration in seconds, if known. */
  durationSec: number | null;
  /** Other participant's phone number (e.164 when possible). */
  counterpartyPhone: string | null;
  /** Other participant's email (if available — e.g. Zoom participant list). */
  counterpartyEmail: string | null;
  /** URL of the raw recording (audio/video) if the source provided one. */
  recordingUrl: string | null;
  /** Ordered transcript turns. Empty array if provider didn't give one. */
  turns: TranscriptTurn[];
  /** Raw provider payload — keep for debugging / re-normalisation. */
  raw: Record<string, unknown>;
}

/**
 * Result of running a normalized transcript through the intelligence stack.
 * Persisted to call_intelligence_results. Every module's output is optional
 * because not every call needs every analysis (e.g. no IVR on an inbound).
 */
export interface CallIntelligenceResult {
  transcriptExternalId: string;
  source: CallIngestionSource;
  workspaceId: string;
  leadId: string | null;

  // Phase 12c.1 — AMD / opening classification (did we hit a machine?)
  amd?: {
    verdict: "human" | "machine_greeting" | "beep" | "ambient" | "unknown";
    confidence: number;
    suggestedAction:
      | "continue_pitch"
      | "drop_voicemail_now"
      | "wait_for_beep"
      | "keep_listening"
      | "hang_up";
  } | null;

  // Phase 12c.2 — IVR navigation path (if applicable)
  ivrPath?: Array<{ prompt: string; keyPressed: string | null; reason: string }>;

  // Phase 12c.4 — Commitments spoken on the call
  commitments: Array<{
    type: string;
    description: string;
    whenIso: string | null;
    amountUsd: number | null;
    speaker: "agent" | "caller" | "unknown";
    confidence: number;
  }>;

  // Phase 12c.5 — Hallucination-guard findings (post-hoc audit of agent turns)
  hallucinationFindings: Array<{
    utterance: string;
    severity: "block" | "warn" | "allow";
    category: string;
    reason: string;
  }>;

  // Phase 12c.6 — Gatekeeper moments + how they were handled
  gatekeeperMoments: Array<{
    type: string;
    utterance: string;
    recommendedMove: string;
  }>;

  // Phase 12c.7 — Competitors mentioned on the call
  competitorsMentioned: Array<{
    competitorName: string;
    battlecardId: string | null;
    excerpt: string;
  }>;

  // Phase 12c.3 — Warm-transfer brief (if this was a transfer candidate)
  warmTransferBrief?: {
    headline: string;
    openingLine: string;
    mustKnow: string[];
    openCommitments: string[];
  } | null;

  // Phase 11f — Call quality rubric (rolled up)
  callQualityScore?: {
    overall: number;
    dimensions: Record<string, number>;
  } | null;

  /** Structured next-move recommendation the agent / CRM should execute. */
  nextActions: Array<{
    kind: "send_email" | "schedule_meeting" | "create_task" | "update_crm" | "escalate_to_human" | "suppress" | "no_op";
    note: string;
    dueIso?: string | null;
  }>;

  /** Dimension-level risk flags surfaced to the operator dashboard. */
  risks: Array<{
    type:
      | "hallucination_risk"
      | "unfulfilled_commitment"
      | "champion_silent"
      | "no_economic_buyer"
      | "compliance_tcpa"
      | "consent_issue"
      | "dead_deal_signal";
    severity: "info" | "warning" | "critical";
    message: string;
  }>;

  /** Machine-generated one-line summary so humans can scan a queue fast. */
  oneLineSummary: string;

  /** Wall-clock timestamp of the analysis run. */
  analyzedAtIso: string;

  /** Schema version for future-proofing analytics. */
  schemaVersion: "v1";
}

export interface AdapterFetchOptions {
  /** Don't refetch calls that started before this ISO timestamp. */
  sinceIso: string;
  /** Cursor from the previous page (adapter-specific shape). */
  cursor?: string | null;
  /** Max calls to fetch per page. Adapters may cap lower. */
  limit?: number;
}

export interface AdapterFetchResult {
  transcripts: NormalizedCallTranscript[];
  nextCursor: string | null;
  /** Provider-reported total, if known. */
  totalCount?: number;
}
