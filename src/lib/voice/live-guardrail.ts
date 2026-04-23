/**
 * Phase 12f — Live pre-TTS guardrail.
 *
 * Every AI-generated utterance on a live call (demo agent, outbound dialer,
 * inbound answerer) goes through this function BEFORE it is handed to the
 * text-to-speech layer. It:
 *
 *   1. Scans for hallucinated price/feature/guarantee/policy/timeline/compliance
 *      assertions via `enforceHallucinationGuard` (Phase 12c.5).
 *   2. Surfaces any commitments the agent just made so the caller can capture
 *      them to CRM / follow-up queue.
 *   3. Detects competitor mentions and returns any relevant battlecard so the
 *      orchestrator can inject the recommended pivot on the NEXT turn.
 *
 * Pure, synchronous, deterministic. No I/O, no LLM. Safe to call on every
 * single LLM-generated response in the hot path.
 *
 * The caller decides what to do with the findings — typically:
 *   - `text` is what to actually speak (rewritten if a block-level finding hit)
 *   - `mutated === true` means the model said something risky and we replaced it
 *   - `commitments` get logged to the call record and queued for follow-up
 *   - `competitorMention` informs the next turn's strategy context
 */
import {
  enforceHallucinationGuard,
  type HallucinationScanResult,
  type WorkspaceFacts,
} from "./hallucination-guard";
import {
  extractCommitmentsFromUtterances,
  type TranscriptCommitment,
  type TranscriptUtterance,
} from "./commitment-extraction";
import {
  detectCompetitorMention,
  type BattlecardDetection,
  type CompetitorBattlecard,
} from "./real-time-battlecards";
// Phase 13d — industry-specific compliance disclosures get whitelisted so
// the hallucination guard does not block lawfully-required phrasing.
import {
  buildIndustryWorkspaceFacts,
  type DisclaimerChannel,
} from "@/lib/industry/disclaimers";

export interface LiveGuardrailContext {
  /** Workspace fact allow-list for hallucination detection. */
  workspaceFacts?: WorkspaceFacts;
  /** Competitor battlecards to check against. */
  battlecards?: CompetitorBattlecard[];
  /** Anchor timestamp used when extracting commitments (defaults to now). */
  referenceDate?: Date;
  /** Workspace industry id (Phase 13d) — drives the disclaimer overlay. */
  industry?: string | null;
  /** US two-letter state code (Phase 13d) — state-specific overrides. */
  state?: string | null;
  /** Channel of the utterance (Phase 13d). Defaults to "voice". */
  channel?: DisclaimerChannel;
  /** Whether the call is being recorded (Phase 13d) — unlocks recording phrases. */
  isRecorded?: boolean;
  /** Whether this is a debt-collection call (Phase 13d) — unlocks FDCPA phrase. */
  isDebtCollection?: boolean;
}

export interface LiveGuardrailResult {
  /** The text that should actually be spoken. Same as input unless mutated. */
  text: string;
  /** True when the hallucination guard replaced the utterance. */
  mutated: boolean;
  /** Full hallucination-guard scan result (for audit / alerting). */
  scan: HallucinationScanResult;
  /** Commitments the agent just made — caller should queue these. */
  commitments: TranscriptCommitment[];
  /** Competitor mention detection, if any. */
  competitorMention: BattlecardDetection | null;
}

/**
 * Guard a single agent utterance before it goes to TTS.
 *
 * Always returns a usable `text` — callers can safely speak `result.text`
 * without re-checking. `mutated` / `scan` / `commitments` / `competitorMention`
 * are available for logging and next-turn strategy.
 */
export function guardLiveUtterance(
  utterance: string,
  ctx: LiveGuardrailContext = {},
): LiveGuardrailResult {
  // Phase 13d — merge industry/state/channel disclaimer allowances onto the
  // caller-provided WorkspaceFacts so lawfully-required phrases (HIPAA,
  // attorney advertising, "past performance does not guarantee future
  // results", etc.) don't get rewritten by the hallucination guard.
  let facts: WorkspaceFacts = ctx.workspaceFacts ?? {};
  if (ctx.industry) {
    const overlay = buildIndustryWorkspaceFacts({
      industry: ctx.industry,
      state: ctx.state ?? null,
      channel: ctx.channel ?? "voice",
      isRecorded: ctx.isRecorded ?? false,
      isDebtCollection: ctx.isDebtCollection ?? false,
    });
    facts = {
      ...facts,
      allowedPolicies: [...(facts.allowedPolicies ?? []), ...overlay.allowedPolicies],
      allowedGuarantees: [...(facts.allowedGuarantees ?? []), ...overlay.allowedGuarantees],
      allowedTimelines: [...(facts.allowedTimelines ?? []), ...overlay.allowedTimelines],
    };
  }

  const safe = enforceHallucinationGuard(utterance ?? "", facts);

  // Extract commitments from the (possibly rewritten) utterance so we never
  // queue promises made by the raw hallucinated text.
  const now = ctx.referenceDate ?? new Date();
  const utterances: TranscriptUtterance[] = [
    {
      speaker: "agent",
      text: safe.text,
    },
  ];
  const commitments = extractCommitmentsFromUtterances(utterances, now);

  let competitorMention: BattlecardDetection | null = null;
  if (ctx.battlecards && ctx.battlecards.length > 0) {
    const d = detectCompetitorMention(safe.text, ctx.battlecards);
    if (d.mentioned) {
      competitorMention = d;
    }
  }

  return {
    text: safe.text,
    mutated: safe.mutated,
    scan: safe.scan,
    commitments,
    competitorMention,
  };
}
