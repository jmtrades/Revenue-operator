/**
 * Phase 12e — Unified call intelligence pipeline.
 *
 * Takes a NormalizedCallTranscript from ANY source (CRM call log, Zoom
 * recording, Gong, Chorus, Aircall, Zoom Phone…) and runs it through the
 * entire Phase 12c intelligence stack to produce a single
 * CallIntelligenceResult.
 *
 * This is the "listen to calls through the CRM or Zoom and know how to
 * proceed" directive, concretised: one function, source-agnostic, pure.
 *
 * Intentionally pure — no I/O, no DB, no LLM. Persistence happens in the
 * caller so we can test the pipeline without a Supabase client.
 */

import {
  classifyOpeningUtterance,
  foldAmdClassifications,
} from "@/lib/voice/amd-classifier";
import {
  detectIvrPrompt,
  planIvrNavigation,
  type IvrIntent,
} from "@/lib/voice/ivr-navigator";
import {
  extractCommitmentsFromUtterances,
  type TranscriptUtterance,
} from "@/lib/voice/commitment-extraction";
import {
  scanUtteranceForHallucinations,
  type WorkspaceFacts,
} from "@/lib/voice/hallucination-guard";
import {
  detectGatekeeper,
  generateGatekeeperMove,
} from "@/lib/voice/gatekeeper-playbook";
import {
  detectCompetitorMention,
  type CompetitorBattlecard,
} from "@/lib/voice/real-time-battlecards";
import {
  buildWarmTransferBrief,
  type TransferContext,
} from "@/lib/voice/warm-transfer-brief";

import type {
  CallIntelligenceResult,
  NormalizedCallTranscript,
  TranscriptTurn,
} from "./types";

export interface PipelineContext {
  /** Competitor battlecards to detect. Empty → no competitor analysis. */
  battlecards?: CompetitorBattlecard[];
  /** Workspace facts allow-list for the hallucination guard. */
  workspaceFacts?: WorkspaceFacts;
  /** Target IVR intent for navigation planning (usually "reach_person"). */
  ivrTargetIntent?: IvrIntent;
  /** Whether to build a warm-transfer brief (only useful for live/escalation). */
  buildWarmBrief?: boolean;
  /** Lead display context for the warm brief. */
  leadContext?: {
    leadName: string | null;
    companyName: string | null;
    callIntent: string | null;
  };
}

/**
 * Run the full Phase 12c stack on a single normalized transcript.
 * Pure function — returns a structured result but never writes to disk.
 */
export function analyseCallTranscript(
  transcript: NormalizedCallTranscript,
  ctx: PipelineContext = {},
): CallIntelligenceResult {
  const turns = transcript.turns ?? [];
  const agentTurns = turns.filter((t) => t.speaker === "agent");
  const callerTurns = turns.filter((t) => t.speaker === "caller");

  // 1) AMD — only meaningful if we have opening caller utterances
  const amd = analyseAmd(callerTurns);

  // 2) IVR navigation — look at caller turns in the first 20s of the call
  const ivrPath = analyseIvrPath(callerTurns, ctx.ivrTargetIntent ?? "reach_person");

  // 3) Commitments — extracted from every utterance
  const utterances: TranscriptUtterance[] = turns
    .filter((t) => t.speaker === "agent" || t.speaker === "caller")
    .map((t) => ({ speaker: t.speaker as "agent" | "caller", text: t.text }));
  const commitments = extractCommitmentsFromUtterances(
    utterances,
    new Date(transcript.startedAtIso),
  ).map((c) => ({
    type: c.type,
    description: c.description,
    whenIso: c.whenIso,
    amountUsd: c.amountUsd,
    speaker: c.speaker,
    confidence: c.confidence,
  }));

  // 4) Hallucination audit — run on AGENT turns only (we can't control the caller)
  const hallucinationFindings = auditHallucinations(agentTurns, ctx.workspaceFacts);

  // 5) Gatekeeper moments — find places where a non-prospect answered
  const gatekeeperMoments = detectGatekeeperMoments(callerTurns);

  // 6) Competitor mentions — across caller turns (they name the competitor)
  const competitorsMentioned = detectCompetitorMentions(
    callerTurns,
    ctx.battlecards ?? [],
  );

  // 7) Warm-transfer brief — optional; only on live-transfer-escalation flows
  const warmTransferBrief = ctx.buildWarmBrief
    ? buildBriefFromTranscript(transcript, commitments, ctx)
    : null;

  // 8) Derived next-actions + risk rollup
  const nextActions = deriveNextActions(transcript, commitments, hallucinationFindings);
  const risks = deriveRisks(hallucinationFindings, commitments, gatekeeperMoments);

  return {
    transcriptExternalId: transcript.externalId,
    source: transcript.source,
    workspaceId: transcript.workspaceId,
    leadId: transcript.leadId,
    amd,
    ivrPath,
    commitments,
    hallucinationFindings,
    gatekeeperMoments,
    competitorsMentioned,
    warmTransferBrief,
    callQualityScore: null,
    nextActions,
    risks,
    oneLineSummary: summarise(transcript, commitments, nextActions),
    analyzedAtIso: new Date().toISOString(),
    schemaVersion: "v1",
  };
}

// ---------------------------------------------------------------------------
// Per-module helpers
// ---------------------------------------------------------------------------

function analyseAmd(callerTurns: TranscriptTurn[]): CallIntelligenceResult["amd"] {
  if (callerTurns.length === 0) return null;
  // Use up to the first 3 caller utterances (opening window)
  const openers = callerTurns.slice(0, 3);
  const classifications = openers.map((t) =>
    classifyOpeningUtterance(t.text, {
      elapsedMs: (t.startSec ?? 0) * 1000,
    }),
  );
  const folded = foldAmdClassifications(classifications);
  return {
    verdict: folded.verdict,
    confidence: folded.confidence,
    suggestedAction: folded.recommendedAction,
  };
}

function analyseIvrPath(
  callerTurns: TranscriptTurn[],
  targetIntent: IvrIntent,
): CallIntelligenceResult["ivrPath"] {
  const path: NonNullable<CallIntelligenceResult["ivrPath"]> = [];
  for (const turn of callerTurns.slice(0, 6)) {
    const detection = detectIvrPrompt(turn.text);
    if (!detection.isIvrPrompt) continue;
    const plan = planIvrNavigation(detection, targetIntent);
    path.push({
      prompt: turn.text.slice(0, 240),
      keyPressed: plan.key ?? plan.word ?? null,
      reason: plan.reason,
    });
  }
  return path;
}

function auditHallucinations(
  agentTurns: TranscriptTurn[],
  facts: WorkspaceFacts | undefined,
): CallIntelligenceResult["hallucinationFindings"] {
  const out: CallIntelligenceResult["hallucinationFindings"] = [];
  for (const turn of agentTurns) {
    const r = scanUtteranceForHallucinations(turn.text, facts ?? {});
    if (r.findings.length === 0) continue;
    for (const f of r.findings) {
      out.push({
        utterance: turn.text.slice(0, 240),
        severity: f.severity,
        category: f.category,
        reason: f.reason,
      });
    }
  }
  return out;
}

function detectGatekeeperMoments(
  callerTurns: TranscriptTurn[],
): CallIntelligenceResult["gatekeeperMoments"] {
  const out: CallIntelligenceResult["gatekeeperMoments"] = [];
  for (const turn of callerTurns) {
    const detection = detectGatekeeper(turn.text);
    if (!detection.isGatekeeper) continue;
    const move = generateGatekeeperMove({
      detection,
      targetName: null,
      targetRole: null,
      reasonForCall: null,
      yourName: null,
      yourOrg: null,
    });
    out.push({
      type: detection.type ?? "unknown",
      utterance: turn.text.slice(0, 240),
      recommendedMove: move.action,
    });
  }
  return out;
}

function detectCompetitorMentions(
  callerTurns: TranscriptTurn[],
  battlecards: CompetitorBattlecard[],
): CallIntelligenceResult["competitorsMentioned"] {
  if (battlecards.length === 0) return [];
  const out: CallIntelligenceResult["competitorsMentioned"] = [];
  const seen = new Set<string>();
  for (const turn of callerTurns) {
    const d = detectCompetitorMention(turn.text, battlecards);
    if (!d.mentioned || !d.competitorName) continue;
    const sig = `${d.battlecardId ?? ""}|${d.competitorName.toLowerCase()}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push({
      competitorName: d.competitorName,
      battlecardId: d.battlecardId ?? null,
      excerpt: turn.text.slice(0, 200),
    });
  }
  return out;
}

function buildBriefFromTranscript(
  transcript: NormalizedCallTranscript,
  commitments: CallIntelligenceResult["commitments"],
  ctx: PipelineContext,
): CallIntelligenceResult["warmTransferBrief"] {
  const keyQuotes = transcript.turns
    .filter((t) => t.speaker === "caller")
    .slice(0, 5)
    .map((t) => t.text.slice(0, 160));
  const input: TransferContext = {
    caller: {
      name: ctx.leadContext?.leadName ?? null,
      company: ctx.leadContext?.companyName ?? null,
      phone: transcript.counterpartyPhone,
      email: transcript.counterpartyEmail,
    },
    intent: ctx.leadContext?.callIntent ?? "inbound conversation",
    callStartedAt: transcript.startedAtIso,
    callDurationSeconds: transcript.durationSec ?? 0,
    stage: "discovery",
    sentiment: "neutral",
    objections: [],
    commitments: commitments.map((c) => ({
      type: c.type,
      description: c.description,
      dueBy: c.whenIso,
    })),
    qualifyingFacts: keyQuotes,
    reasonForTransfer: "call ingested — live handoff requested",
  };
  const brief = buildWarmTransferBrief(input);
  return {
    headline: brief.headline,
    openingLine: brief.recommendedOpeningLine,
    mustKnow: brief.mustKnow,
    openCommitments: brief.openCommitments,
  };
}

// ---------------------------------------------------------------------------
// Derived next-actions + risks
// ---------------------------------------------------------------------------

function deriveNextActions(
  transcript: NormalizedCallTranscript,
  commitments: CallIntelligenceResult["commitments"],
  hallucinationFindings: CallIntelligenceResult["hallucinationFindings"],
): CallIntelligenceResult["nextActions"] {
  const actions: CallIntelligenceResult["nextActions"] = [];

  // Each commitment → concrete follow-up task
  for (const c of commitments) {
    switch (c.type) {
      case "info_send":
      case "document_send":
        actions.push({
          kind: "send_email",
          note: `Deliver promised ${c.type.replace("_", " ")}: ${c.description}`,
          dueIso: c.whenIso,
        });
        break;
      case "appointment":
        actions.push({
          kind: "schedule_meeting",
          note: `Book the meeting committed on call: ${c.description}`,
          dueIso: c.whenIso,
        });
        break;
      case "payment":
        actions.push({
          kind: "create_task",
          note: `Watch for payment: ${c.description}`,
          dueIso: c.whenIso,
        });
        break;
      case "price_quote":
      case "callback":
      case "other":
        actions.push({
          kind: "create_task",
          note: c.description,
          dueIso: c.whenIso,
        });
        break;
    }
  }

  // Any blocking hallucination → human review
  if (hallucinationFindings.some((f) => f.severity === "block")) {
    actions.push({
      kind: "escalate_to_human",
      note: "Agent made unverified factual claims on this call — human review required.",
    });
  }

  // If zero explicit commitments but call had real duration → update CRM with transcript
  if (commitments.length === 0 && (transcript.durationSec ?? 0) > 30) {
    actions.push({
      kind: "update_crm",
      note: "Log transcript + sentiment to CRM; no explicit commitments detected.",
    });
  }

  if (actions.length === 0) {
    actions.push({ kind: "no_op", note: "No follow-up detected." });
  }
  return actions;
}

function deriveRisks(
  hallucinationFindings: CallIntelligenceResult["hallucinationFindings"],
  commitments: CallIntelligenceResult["commitments"],
  gatekeeperMoments: CallIntelligenceResult["gatekeeperMoments"],
): CallIntelligenceResult["risks"] {
  const risks: CallIntelligenceResult["risks"] = [];

  if (hallucinationFindings.some((f) => f.severity === "block")) {
    risks.push({
      type: "hallucination_risk",
      severity: "critical",
      message: "One or more agent utterances made unverified factual claims.",
    });
  } else if (hallucinationFindings.some((f) => f.severity === "warn")) {
    risks.push({
      type: "hallucination_risk",
      severity: "warning",
      message: "Agent made comparative/competitor claims that should be audited.",
    });
  }

  const unfulfilled = commitments.filter(
    (c) => c.whenIso && new Date(c.whenIso).getTime() < Date.now(),
  );
  if (unfulfilled.length > 0) {
    risks.push({
      type: "unfulfilled_commitment",
      severity: "warning",
      message: `${unfulfilled.length} promised item(s) have a due date in the past.`,
    });
  }

  if (gatekeeperMoments.length >= 3) {
    risks.push({
      type: "dead_deal_signal",
      severity: "info",
      message: "Multiple gatekeeper turns — we may not be reaching the buyer.",
    });
  }

  return risks;
}

function summarise(
  transcript: NormalizedCallTranscript,
  commitments: CallIntelligenceResult["commitments"],
  nextActions: CallIntelligenceResult["nextActions"],
): string {
  const dir = transcript.direction === "outbound" ? "Outbound" : transcript.direction === "inbound" ? "Inbound" : "Call";
  const len = transcript.durationSec != null ? `${Math.round(transcript.durationSec / 60)}m` : "?m";
  const commitBit = commitments.length > 0 ? `${commitments.length} commitment${commitments.length === 1 ? "" : "s"}` : "no commitments";
  const action = nextActions[0]?.kind ?? "no_op";
  return `${dir} · ${len} · ${commitBit} · next: ${action}`;
}
