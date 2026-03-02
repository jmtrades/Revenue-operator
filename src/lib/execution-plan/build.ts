/**
 * Build canonical Execution Plan: domain pack + compliance + policy + approvals.
 * No message text from AI. Template-based rendering only. Deterministic.
 */

import { resolveDomainPackConfig, resolveDomainContext } from "@/lib/domain-packs/resolve";
import { getGeneralPackConfig } from "@/lib/domain-packs/general-pack";
import { runStrategyEngine } from "@/lib/domain-packs/strategy-engine";
import { resolveChannelPolicy, isWithinQuietHours } from "@/lib/channel-policy";
import { resolveMessagePolicy } from "@/lib/governance/message-policy";
import { resolveCompliancePack } from "@/lib/governance/compliance-pack";
import { compileGovernedMessage } from "@/lib/speech-governance/compiler";
import { getStrategyState, upsertStrategyState } from "@/lib/strategy-state/store";
import { getSignals, mergeAndUpsertSignals } from "@/lib/emotional-signals/store";
import type { EmotionalSignalsRecord } from "@/lib/emotional-signals/store";
import { interpretInboundMessage } from "@/lib/work-unit/intent-interpreter";
import { parseAIContract } from "@/lib/ai/contract";
import { resolveObjectives } from "@/lib/intelligence/objective-engine";
import { evaluateRisk } from "@/lib/intelligence/risk-engine";
import { getLatestCommitmentState } from "@/lib/intelligence/commitment-score";
import { resolveScenarioProfile } from "@/lib/scenarios/resolver";
import type { ListPurposeKey } from "@/lib/scenarios/types";
import { resolveQueueType } from "@/lib/scenarios/queue-type";
import { resolveTriageReason } from "@/lib/scenarios/triage";
import { evaluateStopConditions } from "@/lib/intelligence/stop-conditions";
import { appendLedgerEvent } from "@/lib/ops/ledger";
import { evaluateCadence } from "@/lib/intelligence/cadence-governor";
import { getBrokenCommitmentsCount } from "@/lib/intelligence/commitment-registry";
import { getLastNIntentActions } from "@/lib/intelligence/escalation-memory";
import { getPreviousSnapshot } from "@/lib/intelligence/conversation-snapshot";
import { evaluateDrift } from "@/lib/intelligence/drift-detector";
import { goodwillRequiresForceReview } from "@/lib/intelligence/goodwill-engine";
import { getStrategicPattern, evaluateStrategicGuard } from "@/lib/intelligence/strategic-pattern";
import { getOpenQuestions } from "@/lib/intelligence/unresolved-questions";
import { applyCommitmentDecay } from "@/lib/intelligence/commitment-decay";
import { buildStrategicHorizon } from "@/lib/intelligence/strategic-horizon";
import { evaluateVariantEffectiveness } from "@/lib/intelligence/strategy-effectiveness";
import { getOpenCommitments } from "@/lib/intelligence/commitment-registry";
import type { ExecutionPlan, ExecutionTrace, ExecutionDecision, ActionIntentToEmit } from "./types";

export interface NormalizedInboundEvent {
  workspace_id: string;
  conversation_id: string;
  thread_id?: string | null;
  work_unit_id?: string | null;
  lead_id?: string | null;
  channel?: string | null;
  raw_content?: string | null;
  pre_classified_intent?: string | null;
  pre_classified_risk_flags?: string[] | null;
  pre_classified_emotional_signals?: EmotionalSignalsRecord | null;
}

export interface ConversationContext {
  conversation_id: string;
  thread_id?: string | null;
  work_unit_id?: string | null;
  lead_id?: string | null;
  existing_channel?: string | null;
}

export interface DomainHints {
  work_unit_type?: string | null;
  subject_type?: string | null;
  domain_type?: string | null;
  jurisdiction?: string | null;
  /** Purpose for list execution (qualify, confirm, collect, reactivate, route, recover). */
  list_purpose?: string | null;
}

const DEFAULT_INTENT = "follow_up";
const DEFAULT_STATE = "discovery";
const MAX_DISCLAIMER_CHARS = 90;

function disclaimerLines(lines: string[]): string[] {
  return lines.map((s) => s.slice(0, MAX_DISCLAIMER_CHARS));
}

/**
 * Build execution plan in exact order. All resolution is deterministic.
 */
export async function buildExecutionPlan(
  workspaceId: string,
  inboundEvent: NormalizedInboundEvent,
  conversationContext: ConversationContext,
  domainHints?: DomainHints | null,
  nowIso?: string
): Promise<ExecutionPlan> {
  const now = nowIso ?? new Date().toISOString();
  const conversationId = inboundEvent.conversation_id ?? conversationContext.conversation_id;
  const threadId = inboundEvent.thread_id ?? conversationContext.thread_id ?? null;
  const workUnitId = inboundEvent.work_unit_id ?? conversationContext.work_unit_id ?? null;

  // 1. Resolve domain pack
  const domainPackConfig = await resolveDomainPackConfig(workspaceId);
  const domainContext = await resolveDomainContext(workspaceId);
  const resolvedDomainType = domainHints?.domain_type ?? domainContext.domain_type ?? "general";

  const effectiveDomainConfig =
    resolvedDomainType === "general" && (!domainPackConfig || !domainPackConfig.strategy_graph)
      ? getGeneralPackConfig()
      : domainPackConfig;

  // 2. Resolve channel policy + quiet hours
  const intentForChannel = inboundEvent.pre_classified_intent ?? DEFAULT_INTENT;
  const compliancePack = await resolveCompliancePack(workspaceId, resolvedDomainType);
  const channelPolicy = await resolveChannelPolicy({
    workspaceId,
    intentType: intentForChannel,
    compliancePackQuietHours: compliancePack.quiet_hours ?? null,
  });
  const withinQuietHours = isWithinQuietHours(channelPolicy);

  // 3. Resolve jurisdiction
  const jurisdiction = domainHints?.jurisdiction ?? domainContext.jurisdiction ?? "UK";

  // 3b. Resolve scenario profile (deterministic: inbound → triage, list_purpose → list_execution)
  const scenarioContextSource = domainHints?.list_purpose ? "list_run" as const : "inbound" as const;
  const listPurpose = (domainHints?.list_purpose as ListPurposeKey | null) ?? null;
  const { profile: scenarioProfile, use_mode_key: useModeKey } = await resolveScenarioProfile(workspaceId, {
    source: scenarioContextSource,
    list_purpose: listPurpose,
  });

  // 4. AI structured classifier (existing contract)
  let intent_type = inboundEvent.pre_classified_intent ?? DEFAULT_INTENT;
  let risk_flags: string[] = inboundEvent.pre_classified_risk_flags ?? [];
  let emotional_signals: EmotionalSignalsRecord = inboundEvent.pre_classified_emotional_signals ?? {};
  if (inboundEvent.raw_content) {
    const parsed = parseAIContract(inboundEvent.raw_content);
    if (parsed.success) {
      const interpreted = interpretInboundMessage(parsed.data);
      intent_type = interpreted.intent;
      risk_flags = interpreted.risk_flags ?? [];
      emotional_signals = {
        urgency_score: risk_flags.includes("opt_out_signal") ? 0.8 : 0,
        skepticism_score: interpreted.sentiment === "negative" ? 0.6 : 0,
        compliance_sensitivity: risk_flags.includes("legal_sensitivity") ? 0.8 : 0,
        aggression_level: risk_flags.includes("anger") ? 0.7 : 0,
        authority_resistance: 0,
        trust_requirement: 0,
      };
    }
  }
  const triageResult = resolveTriageReason({ intent_type, risk_flags });

  // 5. Update emotional signals store (merge)
  const channelChosen = withinQuietHours ? (channelPolicy.fallback_channel ?? channelPolicy.primary_channel) : channelPolicy.primary_channel;
  if (threadId) {
    await mergeAndUpsertSignals(workspaceId, threadId, emotional_signals, now);
  }

  // 6. Get current strategy state (or default = discovery)
  const strategyRow = await getStrategyState(workspaceId, conversationId);
  const currentState = strategyRow?.current_state ?? DEFAULT_STATE;

  // 7. Run strategy engine
  const signalsForEngine = await (threadId ? getSignals(workspaceId, threadId) : Promise.resolve({}) as Promise<EmotionalSignalsRecord>);
  const emotionalSignals = {
    urgency_score: (signalsForEngine as EmotionalSignalsRecord).urgency_score ?? 0,
    skepticism_score: (signalsForEngine as EmotionalSignalsRecord).skepticism_score ?? 0,
    compliance_sensitivity: (signalsForEngine as EmotionalSignalsRecord).compliance_sensitivity ?? 0,
    aggression_level: (signalsForEngine as EmotionalSignalsRecord).aggression_level ?? 0,
    authority_resistance: (signalsForEngine as EmotionalSignalsRecord).authority_resistance ?? 0,
    trust_requirement: (signalsForEngine as EmotionalSignalsRecord).trust_requirement ?? 0,
  };
  const strategyOutput = runStrategyEngine({
    workspaceId,
    currentState,
    emotionalSignals,
    domainPackConfig: effectiveDomainConfig,
    conversationHistoryLength: 0,
    lastIntent: intent_type,
  });
  const strategy_state_after = strategyOutput.suggested_state_transition ?? currentState;

  // 8. Resolve message policy
  const messagePolicy = await resolveMessagePolicy(
    workspaceId,
    resolvedDomainType,
    jurisdiction,
    channelChosen === "email" ? "email" : channelChosen === "whatsapp" ? "whatsapp" : "sms",
    intent_type
  );
  const jurisdictionUnspecified = jurisdiction === "UNSPECIFIED" || !jurisdiction?.trim();
  const approval_mode = (jurisdictionUnspecified ? "preview_required" : (messagePolicy?.approval_mode ?? "autopilot")) as ExecutionPlan["approval_mode"];
  const policy_id = messagePolicy?.id ?? null;

  // 9. Resolve compliance pack (already have compliancePack)
  const disclaimer_lines = disclaimerLines([
    ...(messagePolicy?.required_disclaimers ?? []),
    ...(compliancePack.disclaimers ?? []),
    ...strategyOutput.disclosure_blocks,
  ].filter(Boolean));

  // 10. Compile governed message (templates only; no freeform). For voice we still resolve template for script.
  const clause_plan = [{ type: "acknowledgment" }];
  const slots: Record<string, string | number | boolean> = { content: "" };
  const compileChannel = channelChosen === "email" ? "email" : channelChosen === "whatsapp" ? "whatsapp" : "sms";
  const compileResult = await compileGovernedMessage({
    workspace_id: workspaceId,
    domain_type: resolvedDomainType,
    jurisdiction,
    channel: compileChannel,
    intent_type,
    clause_plan,
    slots,
    thread_id: threadId,
    work_unit_id: workUnitId,
    conversation_id: conversationId,
  });

  const trace: ExecutionTrace = {
    policy_checks: compileResult.trace?.policy_checks ?? [],
    templates_used: compileResult.trace?.templates_used ?? [],
    clause_plan,
    blocked_reason: compileResult.decision === "block" ? "policy_or_doctrine" : undefined,
  };

  // Risk evaluation (deterministic); broken commitments → requiresReview
  const commitmentState = threadId ? await getLatestCommitmentState(workspaceId, threadId) : null;
  const brokenCommitmentsCount = threadId ? await getBrokenCommitmentsCount(workspaceId, threadId) : 0;
  const riskOutput = evaluateRisk({
    jurisdictionComplete: !jurisdictionUnspecified,
    disclosureStateComplete: true,
    consentPresent: true,
    volatilityScore: commitmentState?.volatilityScore ?? 0,
    legalKeywordsDetected: false,
    objectionCycleCount: 0,
    rateCeilingProximity: 0,
    escalationLoopCount: 0,
    brokenCommitmentsCount,
  });
  const riskScore = riskOutput.riskScore;

  const emotionalCategoryForCadence =
    risk_flags.some((f) => /anger|hostile|aggressive/i.test(f)) ? "hostile" : "neutral";
  const cadenceResult = evaluateCadence({
    lastContactAt: null,
    contactCount24h: 0,
    volatilityScore: commitmentState?.volatilityScore ?? 0,
    emotionalCategory: emotionalCategoryForCadence,
    attemptCount48h: 0,
    brokenCommitmentsExist: brokenCommitmentsCount > 0,
  });

  const stopReason = evaluateStopConditions({
    riskScore,
    jurisdictionComplete: !jurisdictionUnspecified,
    consentPresent: true,
    disclosureComplete: true,
    objectionChainCount: 0,
    attemptCount: 0,
    rateHeadroom: 100,
    executionStale: false,
    complianceLock: false,
    maxObjectionChain: scenarioProfile?.rules?.max_objection_chain ?? 3,
    maxAttemptsPerLead: scenarioProfile?.rules?.max_attempts_per_lead ?? 10,
    cadenceResult,
    brokenCommitmentsCount,
  });

  if (cadenceResult !== "allow") {
    await appendLedgerEvent({
      workspaceId,
      eventType: "cadence_governor_triggered",
      severity: "notice",
      subjectType: "workspace",
      subjectRef: workspaceId,
      details: { cadence_result: cadenceResult, conversation_id: conversationId },
    }).catch(() => {});
  }

  const legalKeywordsPresent = risk_flags.some((f) => /legal|lawyer|sue|complaint|gdpr|data_request|opt_out/i.test(f));
  const temporary_mode_override: string | null =
    riskScore > 80 ||
    emotionalCategoryForCadence === "hostile" ||
    triageResult.triage_reason === "compliance_risk" ||
    legalKeywordsPresent
      ? "compliance_shield"
      : null;
  if (temporary_mode_override) {
    await appendLedgerEvent({
      workspaceId,
      eventType: "scenario_auto_override",
      severity: "notice",
      subjectType: "workspace",
      subjectRef: workspaceId,
      details: { override: temporary_mode_override, conversation_id: conversationId },
    }).catch(() => {});
  }
  const effectiveModeKey = temporary_mode_override ?? useModeKey;

  // 11. Decide (stop condition forces no send)
  let decision: ExecutionDecision = "blocked";
  let action_intent_to_emit: ActionIntentToEmit | null = null;
  let approval_id: string | null = null;

  if (stopReason) {
    decision = riskScore >= 75 ? "emit_approval" : "emit_preview";
    action_intent_to_emit = riskScore >= 75 ? "escalate_to_human" : "request_disclosure_confirmation";
    if (riskScore >= 75) approval_id = compileResult.trace?.approval_id ?? null;
    await appendLedgerEvent({
      workspaceId,
      eventType: "stop_condition_triggered",
      severity: "notice",
      subjectType: "workspace",
      subjectRef: workspaceId,
      details: { stop_reason: stopReason, conversation_id: conversationId },
    }).catch(() => {});
  } else if (riskOutput.requiresPause) {
    decision = "emit_preview";
    action_intent_to_emit = "request_disclosure_confirmation";
  } else if (riskOutput.requiresEscalation) {
    decision = "emit_approval";
    action_intent_to_emit = "escalate_to_human";
    approval_id = compileResult.trace?.approval_id ?? null;
  } else if (compileResult.decision === "block") {
    decision = "blocked";
  } else if (compileResult.decision === "approval_required") {
    approval_id = compileResult.trace?.approval_id ?? null;
    if (approval_id) decision = "emit_approval";
    else decision = "blocked";
    action_intent_to_emit = "escalate_to_human";
  } else if (compileResult.decision === "preview_required" || compileResult.decision === "review_required") {
    decision = "emit_preview";
    action_intent_to_emit = "request_disclosure_confirmation";
  } else if (compileResult.decision === "send") {
    if (jurisdictionUnspecified) {
      decision = "emit_preview";
      action_intent_to_emit = "request_disclosure_confirmation";
    } else {
      decision = "send";
      action_intent_to_emit = channelChosen === "voice" ? "place_outbound_call" : "send_message";
    }
  }

  // Resolve objectives (scenario-aware; deterministic)
  const objectives = resolveObjectives({
    workspaceId,
    leadState: {
      strategy_state: strategy_state_after,
      intent_type,
      has_pending_commitment: false,
      last_channel: channelChosen,
    },
    conversationContext: {
      conversation_id: conversationId,
      thread_id: threadId ?? undefined,
      work_unit_id: workUnitId ?? undefined,
      domain_type: resolvedDomainType,
    },
    riskScore,
    useModeKey: effectiveModeKey,
    scenarioProfile: scenarioProfile ? { primary_objective: scenarioProfile.primary_objective, secondary_objectives: scenarioProfile.secondary_objectives } : null,
  });

  // List execution without explicit profile: force preview, never send
  if (effectiveModeKey === "list_execution" && !scenarioProfile) {
    decision = "emit_preview";
    action_intent_to_emit = "request_disclosure_confirmation";
  }

  let decayAdjustedGoodwill: number | null = null;
  let strategicHorizonSteps: string[] = [];
  if (threadId) {
    const prevSnapshot = await getPreviousSnapshot(workspaceId, threadId).catch(() => null);
    const openCommitments = await getOpenCommitments(workspaceId, threadId).catch(() => []);
    const recordedAt = (prevSnapshot as { recorded_at?: string | null } | null)?.recorded_at ?? null;
    const daysSinceLastResponse = recordedAt
      ? Math.max(0, (Date.now() - new Date(recordedAt).getTime()) / (24 * 60 * 60 * 1000))
      : 0;
    const goodwillBeforeDecay = prevSnapshot?.goodwill_score ?? 50;
    const decayResult = applyCommitmentDecay({
      lastMeaningfulOutcomeAt: recordedAt,
      openCommitmentsCount: openCommitments.length,
      daysSinceLastResponse,
      goodwillScore: goodwillBeforeDecay,
    });
    decayAdjustedGoodwill = decayResult.adjustedGoodwill;
    if (decayResult.goodwillDelta !== 0 || decayResult.frictionDelta !== 0) {
      await appendLedgerEvent({
        workspaceId,
        eventType: "commitment_decay_applied",
        severity: "info",
        subjectType: "thread",
        subjectRef: threadId.slice(0, 160),
        details: { goodwill_delta: decayResult.goodwillDelta, friction_delta: decayResult.frictionDelta },
      }).catch(() => {});
    }
    if (decayAdjustedGoodwill < 10) {
      decision = "emit_approval";
      action_intent_to_emit = "escalate_to_human";
      approval_id = compileResult.trace?.approval_id ?? null;
    }
    strategicHorizonSteps = buildStrategicHorizon({
      stage: prevSnapshot?.stage ?? null,
      primaryObjective: objectives.primary ?? null,
      secondaryObjectives: undefined,
      openQuestionsCount: (await getOpenQuestions(workspaceId, threadId).catch(() => [])).length,
      brokenCommitmentsCount,
      goodwillScore: decayAdjustedGoodwill,
      riskScore,
      driftScore: prevSnapshot?.drift_score ?? 0,
    });
  }

  // Decision guard: contradiction/drift/goodwill/escalation severity — never silent send
  if (decision === "send" && threadId) {
    const prevSnapshot = await getPreviousSnapshot(workspaceId, threadId).catch(() => null);
    const driftResult = evaluateDrift({
      lastOutcomeTypes: [],
      commitmentReversalsCount: 0,
      repeatedUnknownCount: 0,
    });
    const goodwill = decayAdjustedGoodwill ?? prevSnapshot?.goodwill_score ?? 50;
    const contradictionScore = prevSnapshot?.contradiction_score ?? driftResult.contradictionScore;
    const driftScore = prevSnapshot?.drift_score ?? driftResult.driftScore;
    const lastOutcomeForSeverity = emotionalCategoryForCadence === "hostile" ? "hostile" : triageResult.triage_reason === "compliance_risk" ? "legal_risk" : null;
    let escalationSeverity = 2;
    if (lastOutcomeForSeverity === "legal_risk" || lastOutcomeForSeverity === "hostile") escalationSeverity = 5;
    else if (brokenCommitmentsCount >= 3) escalationSeverity = 4;
    else if (goodwill < 15) escalationSeverity = 4;

    const variantScore = await evaluateVariantEffectiveness(workspaceId, "direct").catch(() => 0);
    const blockByVariantScore = variantScore < -20;
    const blockByGoodwill = goodwill < 5;
    if (blockByVariantScore || blockByGoodwill) {
      decision = "emit_approval";
      action_intent_to_emit = "escalate_to_human";
      approval_id = compileResult.trace?.approval_id ?? null;
      await appendLedgerEvent({
        workspaceId,
        eventType: "strategic_guard_block",
        severity: "notice",
        subjectType: "thread",
        subjectRef: threadId.slice(0, 160),
        details: { reason: "strategic_guard_block", variant_score: variantScore, goodwill: blockByGoodwill ? goodwill : undefined },
      }).catch(() => {});
    } else if (
      escalationSeverity >= 4 ||
      contradictionScore >= 60 ||
      driftScore >= 70 ||
      goodwillRequiresForceReview(goodwill)
    ) {
      decision = "emit_approval";
      action_intent_to_emit = "escalate_to_human";
      approval_id = compileResult.trace?.approval_id ?? null;
      await appendLedgerEvent({
        workspaceId,
        eventType: "stop_condition_triggered",
        severity: "notice",
        subjectType: "workspace",
        subjectRef: workspaceId,
        details: { reason: "decision_guard", conversation_id: conversationId },
      }).catch(() => {});
    }
  }

  let strategicBlockVariant: string | null = null;
  // Strategic pattern guard: prevent repeated failed macro-strategy
  if (threadId) {
    const strategicPattern = await getStrategicPattern(workspaceId, threadId).catch(() => null);
    const _openQuestions = await getOpenQuestions(workspaceId, threadId).catch(() => []);
    const goodwill = (await getPreviousSnapshot(workspaceId, threadId).catch(() => null))?.goodwill_score ?? 50;
    const guardResult = evaluateStrategicGuard(
      strategicPattern,
      goodwill,
      0,
      false,
      legalKeywordsPresent
    );
    if (guardResult.forceEscalation) {
      decision = "emit_approval";
      action_intent_to_emit = "escalate_to_human";
      approval_id = compileResult.trace?.approval_id ?? null;
      await appendLedgerEvent({
        workspaceId,
        eventType: "strategic_guard_triggered",
        severity: "notice",
        subjectType: "thread",
        subjectRef: threadId.slice(0, 160),
        details: { reason: "force_escalation" },
      }).catch(() => {});
    } else if (guardResult.forcePause) {
      decision = "emit_preview";
      action_intent_to_emit = "request_disclosure_confirmation";
      await appendLedgerEvent({
        workspaceId,
        eventType: "strategic_guard_triggered",
        severity: "notice",
        subjectType: "thread",
        subjectRef: threadId.slice(0, 160),
        details: { reason: "force_pause" },
      }).catch(() => {});
    } else if (guardResult.blockVariant) {
      strategicBlockVariant = guardResult.blockVariant;
      await appendLedgerEvent({
        workspaceId,
        eventType: "strategic_guard_triggered",
        severity: "info",
        subjectType: "thread",
        subjectRef: threadId.slice(0, 160),
        details: { reason: "block_variant", block_variant: guardResult.blockVariant },
      }).catch(() => {});
    }
  }

  const queueType = resolveQueueType({
    isInbound: scenarioContextSource === "inbound",
    primary_objective: objectives.primary,
    risk_score: riskScore,
    use_mode_key: effectiveModeKey,
  });

  // Persist updated strategy state
  await upsertStrategyState({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    thread_id: threadId,
    work_unit_id: workUnitId,
    domain_type: resolvedDomainType,
    current_state: strategy_state_after,
    last_intent_type: intent_type,
    last_channel: channelChosen,
    jurisdiction,
    updated_at: now,
  });

  const last3Intents = threadId ? await getLastNIntentActions(workspaceId, threadId, 3) : [];
  const last_3_channel_types = last3Intents.map((a) =>
    a.intent_type === "place_outbound_call" ? "voice" : a.intent_type === "send_message" ? "message" : "unknown"
  );

  const plan: ExecutionPlan = {
    identifiers: {
      workspace_id: workspaceId,
      conversation_id: conversationId,
      thread_id: threadId,
      work_unit_id: workUnitId,
    },
    domain_type: resolvedDomainType,
    industry_type: resolvedDomainType !== "general" ? resolvedDomainType : null,
    jurisdiction,
    channel_chosen: channelChosen,
    intent_type,
    strategy_state_before: currentState,
    strategy_state_after,
    template_id: compileResult.trace?.templates_used?.[0]?.key ?? null,
    render_vars: slots,
    disclaimer_lines,
    policy_id,
    approval_mode,
    decision,
    action_intent_to_emit,
    approval_id: approval_id ?? undefined,
    rendered_text: compileResult.rendered_text ?? null,
    trace,
    primary_objective: objectives.primary,
    secondary_objective: objectives.secondary ?? null,
    risk_score: riskScore,
    queue_type: queueType,
    use_mode_key: effectiveModeKey,
    scenario_profile_id: scenarioProfile?.profile_id ?? null,
    temporary_mode_override: temporary_mode_override ?? undefined,
    regulatory_constraints_snapshot: compliancePack.disclaimers ?? [],
    what_not_to_say: compliancePack.forbidden_claims ?? [],
    last_3_channel_types: last_3_channel_types.length > 0 ? last_3_channel_types : undefined,
    strategic_block_variant: strategicBlockVariant ?? undefined,
    strategic_horizon: strategicHorizonSteps.length > 0 ? strategicHorizonSteps : undefined,
  };

  return plan;
}
