/**
 * decisionJob: read state -> classify intent -> choose action -> template-slot message
 * -> safety check -> execute send (or safe fallback) -> log. NEVER block on approval.
 */

import { getDb } from "@/lib/db/queries";
import { fillSlots } from "@/lib/ai/templates";
import {
  mergeSettings,
  checkPolicy,
  getSafeFallback,
  isWithinBusinessHours,
  passesCooldownLadder,
  passesStageLimit,
} from "@/lib/autopilot";
import { canSend, getFallbackChannel } from "@/lib/channels/capabilities";
import { getWarmupLimit } from "@/lib/warmup";
import { getBookingRoute } from "@/lib/intelligence/booking-routing";
import { getSafeResponse, getEscalationHoldingMessage, detectSensitiveIntent } from "@/lib/safe-responses";
import { incrementMetric, METRIC_KEYS } from "@/lib/observability/metrics";
import { enqueueSendMessage } from "@/lib/action-queue/send-message";
import { isPreviewMode } from "@/lib/preview-mode";
import { shouldSimulateOnly, shouldRequireApproval, isFeatureEnabled, isRampComplete } from "@/lib/autonomy";
import { recordInaction } from "@/lib/inaction-reasons";
import { logRestraint } from "@/lib/trust/log-restraint";
import { narrativeForAction } from "@/lib/trust/build-narrative";
import { confidenceToLabel } from "@/lib/trust/confidence-language";
import { checkEscalation, logEscalation, getAssignedUserId, isLeadInEscalationHold } from "@/lib/escalation";
import type { LeadState } from "@/lib/types";
import { ALLOWED_ACTIONS_BY_STATE } from "@/lib/types";
import { resolveRole, ROLE_CONFIDENCE_THRESHOLDS, ROLE_SAFE_FALLBACK, type RoleId } from "@/lib/roles";
import { setLeadPlan } from "@/lib/plans/lead-plan";

const SAFE_FALLBACK_MESSAGES: Record<string, string> = {
  clarifying_question: "What were you looking to get done?",
  book_cta: "When works for a quick call?",
  greeting: "Hey — what were you looking to get done?",
};

export async function runDecisionJob(
  leadId: string,
  workspaceId: string
): Promise<void> {
  const db = getDb();
  const { data: lead, error: leadErr } = await db
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (leadErr || !lead) {
    return;
  }

  // Brain-first: use autonomous intelligence if available and fresh
  try {
    const { getLeadIntelligence } = await import("@/lib/intelligence/lead-brain");
    const brainIntel = await getLeadIntelligence(workspaceId, leadId);
    if (brainIntel) {
      const computedAge = Date.now() - new Date(brainIntel.computed_at).getTime();
      const sixHoursMs = 6 * 60 * 60 * 1000;
      if (computedAge < sixHoursMs && brainIntel.action_confidence >= 0.6) {
        // Brain has a fresh, confident recommendation — use it
        // Brain intelligence available — executing recommended action
        const { executeAutonomousAction } = await import("@/lib/intelligence/autonomous-executor");
        const actionResult = await executeAutonomousAction(brainIntel);
        if (actionResult.success) {
          // Log the brain-driven decision
          try {
            await db.from("action_logs").insert({
              workspace_id: workspaceId,
              entity_type: "lead",
              entity_id: leadId,
              action: "brain_decision_executed",
              actor: "brain",
              role: "autonomous_agent",
              payload: {
                brain_action: brainIntel.next_best_action,
                confidence: brainIntel.action_confidence,
                executor_result: actionResult.action_type,
                reason: actionResult.reason,
              },
            });
          } catch {
            // Non-blocking
          }
          return;
        }
        // If brain action failed, fall through to legacy path
      }
    }
  } catch (brainErr) {
    // Non-blocking — fall through to legacy decision
    // Brain intelligence unavailable — falling through to legacy decision path
  }

  const { data: settingsRow } = await db
    .from("settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const settings = mergeSettings(settingsRow as Partial<import("@/lib/autopilot").WorkspaceSettings> | undefined);
  const communicationStyle =
    ((settingsRow as { communication_style?: string })?.communication_style as "direct" | "consultative" | "high_urgency") ?? "consultative";

  const state = lead.state as LeadState;
  const allowedActions = ALLOWED_ACTIONS_BY_STATE[state] ?? [];

  if (allowedActions.length === 0) {
    await recordInaction(leadId, workspaceId, "no_allowed_actions", { state });
    return;
  }

  const previewMode = await isPreviewMode(workspaceId);
  const simulateOnly = await shouldSimulateOnly(workspaceId);
  const forceSimulate = previewMode || simulateOnly;
  const rampOk = await isRampComplete(workspaceId);

  // Autonomy ramp: restrict until day N
  if (!rampOk) {
    await recordInaction(leadId, workspaceId, "autonomy_ramp", { state });
    return;
  }

  if (lead.opt_out) {
    await recordInaction(leadId, workspaceId, "opt_out");
    return;
  }

  if (settings.vip_rules.exclude_from_messaging) {
    const domains = settings.vip_rules.domains ?? [];
    const company = (lead.company ?? "").toLowerCase();
    if (lead.is_vip || domains.some((d: string) => company.includes(d.toLowerCase()))) {
      await recordInaction(leadId, workspaceId, "vip_excluded");
      return;
    }
  }

  let action = allowedActions[0];
  let message = "";
  let confidence = 0.9;
  let lastUserMsg = "";

  const { data: convRow } = await db.from("conversations").select("id").eq("lead_id", leadId).limit(1).maybeSingle();
  const convId = (convRow as { id?: string })?.id;
  if (!convId) return;

  let reasoning: Record<string, unknown> = {};
  try {
    const { data: messages } = await db
      .from("messages")
      .select("content, role, metadata")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: false })
      .limit(5);

    const lastUserMessage = (messages ?? []).find((m: { role: string }) => m.role === "user");
    lastUserMsg = lastUserMessage?.content ?? "";

    // Conversation state engine: single source of truth. State → Objective → Response → Next action timing. AI never improvises freely.
    type ConvState = "NEW_INTEREST" | "CLARIFICATION" | "CONSIDERING" | "SOFT_OBJECTION" | "HARD_OBJECTION" | "DRIFT" | "COMMITMENT" | "POST_BOOKING" | "NO_SHOW" | "COLD";
    let conversationState = (lastUserMessage as { metadata?: { conversation_state?: string } })?.metadata?.conversation_state as ConvState | undefined;
    if (!conversationState && lastUserMsg) {
      const { getConversationContext } = await import("@/lib/conversation-state/resolver");
      const { resolveConversationState } = await import("@/lib/conversation-state/resolver");
      const ctx = await getConversationContext(leadId, convId);
      const result = await resolveConversationState({ ...ctx, message: lastUserMsg });
      conversationState = result.state as ConvState;
    }

    // State-driven flow: state → playbook → objection → template v2 (booking-first)
    if (conversationState) {
      // Get business context
      const { data: businessContextRow } = await db
        .from("workspace_business_context")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      const businessContext = businessContextRow
        ? {
            business_name: (businessContextRow as { business_name?: string }).business_name ?? "",
            offer_summary: (businessContextRow as { offer_summary?: string }).offer_summary ?? "",
            ideal_customer: (businessContextRow as { ideal_customer?: string }).ideal_customer ?? "",
            disqualifiers: (businessContextRow as { disqualifiers?: string }).disqualifiers ?? "",
            pricing_range: (businessContextRow as { pricing_range?: string | null }).pricing_range ?? null,
            booking_link: (businessContextRow as { booking_link?: string | null }).booking_link ?? null,
            tone_guidelines: (businessContextRow as { tone_guidelines?: Record<string, unknown> }).tone_guidelines ?? { style: "calm", formality: "professional" },
            negotiation_rules: (businessContextRow as { negotiation_rules?: Record<string, unknown> }).negotiation_rules ?? {
              discounts_allowed: false,
              deposit_required: false,
              payment_terms: null,
            },
          }
        : {
            business_name: "",
            offer_summary: "",
            ideal_customer: "",
            disqualifiers: "",
            pricing_range: null,
            booking_link: null,
            tone_guidelines: { style: "calm", formality: "professional" },
            negotiation_rules: { discounts_allowed: false, deposit_required: false, payment_terms: null },
          };

      // Get playbook for state
      const { getPlaybookForState, calculateNextActionAt } = await import("@/lib/playbooks");
      const { data: leadRow } = await db.from("leads").select("created_at, last_activity_at").eq("id", leadId).maybeSingle();
      const leadCreated = leadRow ? new Date((leadRow as { created_at?: string }).created_at ?? Date.now()) : new Date();
      const _lastActivity = leadRow ? new Date((leadRow as { last_activity_at?: string }).last_activity_at ?? Date.now()) : new Date();
      const conversationAgeHours = (Date.now() - leadCreated.getTime()) / (1000 * 60 * 60);

      const playbook = getPlaybookForState(conversationState, businessContext, {
        leadName: lead.name ?? undefined,
        company: lead.company ?? undefined,
        state: lead.state as string,
        lastMessage: lastUserMsg,
        conversationAgeHours,
      });

      // Detect objection if present
      const { detectObjectionType, getObjectionResponseSlots } = await import("@/lib/objections/library");
      const objectionType = detectObjectionType(lastUserMsg, conversationState);
      const objectionSlots = objectionType ? getObjectionResponseSlots(objectionType, businessContext, conversationState) : null;

      // Store conversation memory for recall (topic, hesitation, objections)
      const { upsertConversationMemory } = await import("@/lib/human-presence/conversation-memory");
      const memoryUpdates: { previous_objections?: string[]; hesitation_reason?: string } = {};
      if (objectionType) memoryUpdates.previous_objections = [objectionType];
      if (/price|cost|how much|budget/i.test(lastUserMsg)) memoryUpdates.hesitation_reason = "price";
      if (Object.keys(memoryUpdates).length > 0) {
        upsertConversationMemory(leadId, workspaceId, memoryUpdates).catch(() => {});
      }

      // Message Compiler: structured plan + deterministic render (no templates, no raw LLM text)
      const { compileMessage, stateToIntent } = await import("@/lib/message-compiler");
      const { buildMessage, validateMessage } = await import("@/lib/templates/v2");
      const { conversationHadProofReference, conversationAlreadyHadRecordExpectation } = await import("@/lib/environmental-presence/proof-reference");
      const addRecordExpectation =
        (await conversationHadProofReference(workspaceId, convId)) && !(await conversationAlreadyHadRecordExpectation(convId));
      const { data: convChannel } = await db.from("conversations").select("channel").eq("id", convId).maybeSingle();
      const channel = ((convChannel as { channel?: string })?.channel ?? "sms") as "sms" | "email" | "web";

      const intent = stateToIntent(conversationState);
      if (intent) {
        message = compileMessage(intent, {
          channel,
          tone: objectionType ? "warm" : conversationState === "DRIFT" || conversationState === "COLD" ? "warm" : "neutral",
          businessContext: {
            business_name: businessContext.business_name,
            offer_summary: businessContext.offer_summary ?? undefined,
            pricing_range: businessContext.pricing_range ?? undefined,
          },
          entities: { name: lead.name ?? undefined },
          addRecordExpectation,
        });
      } else {
        message = buildMessage({
          state: conversationState,
          playbook,
          objectionType: objectionType ?? undefined,
          objectionSlots: objectionSlots ?? undefined,
          businessContext,
          leadContext: {
            leadName: lead.name ?? undefined,
            company: lead.company ?? undefined,
            lastMessage: lastUserMsg,
          },
          channel,
        });
      }

      // Validate message
      const validation = validateMessage(message, playbook);
      if (!validation.valid) {
        message = "Hey — what were you looking to get done?";
      }

      // Update action based on playbook recommendation
      const playbookActionMap: Record<string, string> = {
        acknowledge: "greeting",
        clarify: "clarifying_question",
        qualify: "qualification_question",
        objection_handle: "follow_up",
        reengage: "follow_up",
        book: "booking",
        confirm: "confirmation",
        defer: "follow_up",
      };
      const recommendedAction = playbookActionMap[playbook.recommended_next_action_type] ?? action;
      if (allowedActions.includes(recommendedAction)) {
        action = recommendedAction;
      }

      confidence = 0.85; // High confidence for state-driven templates
      reasoning = {
        conversation_state: conversationState,
        playbook: playbook.primary_goal,
        objection_type: objectionType,
        template_set: playbook.template_set_id,
      };

      // Calculate next action timing for scheduling
      const isLowPressure = lead.state === "REACTIVATE" || conversationAgeHours > 72;
      const nextActionAt = calculateNextActionAt(playbook, isLowPressure);
      reasoning.next_action_at = nextActionAt.toISOString();
      
      // Store next action timing for later scheduling
      (reasoning as { _next_action_at?: Date })._next_action_at = nextActionAt;
    } else {
      // Fallback: Message Compiler when action maps to intent; otherwise fillSlots
      const { compileMessage, actionToIntent } = await import("@/lib/message-compiler");
      const { conversationHadProofReference, conversationAlreadyHadRecordExpectation } = await import("@/lib/environmental-presence/proof-reference");
      const addRecordExpectationFallback =
        (await conversationHadProofReference(workspaceId, convId)) && !(await conversationAlreadyHadRecordExpectation(convId));
      const fallbackIntent = actionToIntent(action);
      if (fallbackIntent) {
        const { data: convChannel } = await db.from("conversations").select("channel").eq("id", convId).maybeSingle();
        const ch = ((convChannel as { channel?: string })?.channel ?? "sms") as "sms" | "email" | "web";
        message = compileMessage(fallbackIntent, { channel: ch, entities: { name: lead.name ?? undefined }, addRecordExpectation: addRecordExpectationFallback });
        confidence = 0.8;
        reasoning = { explanation: "Message Compiler fallback." };
      } else {
        const result = await fillSlots(action, {
          leadName: lead.name ?? undefined,
          company: lead.company ?? undefined,
          lastMessage: lastUserMsg,
          workspaceId,
          leadId,
          communication_style: communicationStyle,
        });
        message = result.message;
        confidence = result.confidence;
        reasoning = { risk_flags: result.risk_flags, explanation: result.explanation };
      }
    }

    // Safety checks
    const riskFlags = (reasoning as { risk_flags?: string[] }).risk_flags ?? [];
    const sensitive = detectSensitiveIntent(riskFlags, lastUserMsg);
    if (sensitive) {
      message = getSafeResponse(sensitive);
      reasoning = { ...reasoning, sensitive_type: sensitive };
    } else if (riskFlags.includes("opt_out_signal")) {
      message = "You've been unsubscribed. You won't receive further messages.";
      reasoning = { ...reasoning, sensitive_type: "opt_out" };
    } else if (riskFlags.includes("anger")) {
      message = getSafeResponse("anger");
      reasoning = { ...reasoning, sensitive_type: "anger" };
    }
    // Tiered booking routing
    if ((action === "booking" || action === "call_invite") && allowedActions.includes("qualification_question")) {
      const { data: dealRow } = await db.from("deals").select("id").eq("lead_id", leadId).neq("status", "lost").limit(1).maybeSingle();
      const dealId = (dealRow as { id?: string })?.id;
      if (dealId) {
        const route = await getBookingRoute(dealId);
        const { conversationHadProofReference, conversationAlreadyHadRecordExpectation } = await import("@/lib/environmental-presence/proof-reference");
        const addRec = (await conversationHadProofReference(workspaceId, convId)) && !(await conversationAlreadyHadRecordExpectation(convId));
        if (route.tier === "clarify_nurture") {
          action = "qualification_question";
          const { compileMessage } = await import("@/lib/message-compiler");
          const { data: chRow } = await db.from("conversations").select("channel").eq("id", convId).maybeSingle();
          const ch = ((chRow as { channel?: string })?.channel ?? "sms") as "sms" | "email" | "web";
          message = compileMessage("clarification", { channel: ch, entities: { name: lead.name ?? undefined }, addRecordExpectation: addRec });
          reasoning = { ...reasoning, booking_route: route };
        } else if (route.tier === "triage_call" && action === "booking") {
          action = "call_invite";
          const { compileMessage } = await import("@/lib/message-compiler");
          const { data: chRow } = await db.from("conversations").select("channel").eq("id", convId).maybeSingle();
          const ch = ((chRow as { channel?: string })?.channel ?? "sms") as "sms" | "email" | "web";
          message = compileMessage("follow_up", { channel: ch, entities: { name: lead.name ?? undefined }, addRecordExpectation: addRec });
          reasoning = { ...reasoning, booking_route: route };
        } else {
          reasoning = { ...reasoning, booking_route: route };
        }
      }
    }
  } catch {
    action = getSafeFallback(settings, allowedActions);
    message = SAFE_FALLBACK_MESSAGES[action] ?? SAFE_FALLBACK_MESSAGES.clarifying_question;
  }

  if (confidence < 0.6) {
    action = getSafeFallback(settings, allowedActions);
    message = SAFE_FALLBACK_MESSAGES[action] ?? SAFE_FALLBACK_MESSAGES.clarifying_question;
  }

  const hiredRoles = ((settingsRow as { hired_roles?: string[] })?.hired_roles ?? ["full_autopilot"]) as RoleId[];
  const roleResolved = resolveRole(state, action, hiredRoles);
  if (!roleResolved) {
    await recordInaction(leadId, workspaceId, "no_role_for_action", { state, action });
    return;
  }
  const { role: roleId, label: roleLabel } = roleResolved;
  const roleThreshold = ROLE_CONFIDENCE_THRESHOLDS[roleId];
  if (confidence < roleThreshold) {
    const fallbackAction = ROLE_SAFE_FALLBACK[roleId];
    action = allowedActions.includes(fallbackAction) ? fallbackAction : getSafeFallback(settings, allowedActions);
    message = SAFE_FALLBACK_MESSAGES[action] ?? SAFE_FALLBACK_MESSAGES.clarifying_question;
  }

  // Feature flags: map action to feature
  const actionToFeature: Record<string, import("@/lib/autonomy").AutonomyFeature> = {
    follow_up: "followups",
    booking: "booking",
    call_invite: "booking",
    confirmation: "confirmations",
    winback: "winback",
    qualification_question: "triage",
    clarifying_question: "triage",
  };
  const feature = actionToFeature[action] ?? "followups";
  const featureEnabled = await isFeatureEnabled(workspaceId, feature);
  if (!featureEnabled) {
    await recordInaction(leadId, workspaceId, "feature_disabled", { feature });
    return;
  }

  const { isCoverageEnabled } = await import("@/lib/coverage-flags");
  const coverageFlags = (settingsRow as { coverage_flags?: Record<string, boolean> })?.coverage_flags;
  if (!isCoverageEnabled(coverageFlags, action)) {
    await logRestraint(workspaceId, leadId, "coverage_not_enabled", { action });
    await recordInaction(leadId, workspaceId, "coverage_not_enabled", { action });
    return;
  }

  if (!isWithinBusinessHours(settings)) {
    await logRestraint(workspaceId, leadId, "outside_business_hours");
    await recordInaction(leadId, workspaceId, "outside_business_hours");
    return;
  }

  const { data: wsRow } = await db.from("workspaces").select("created_at, status").eq("id", workspaceId).maybeSingle();
  const ws = wsRow as { created_at?: string; status?: string } | undefined;
  if (ws?.status === "paused" || ws?.status === "expired") {
    await logRestraint(workspaceId, leadId, "workspace_paused");
    await recordInaction(leadId, workspaceId, "workspace_paused");
    return;
  }
  const wsCreated = ws?.created_at ? new Date(ws.created_at) : new Date();
  const warmupLimit = getWarmupLimit(wsCreated);
  if (warmupLimit < Number.POSITIVE_INFINITY) {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const { count: warmupToday } = await db
      .from("outbound_messages")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("sent_at", todayStart.toISOString());
    if ((warmupToday ?? 0) >= warmupLimit) {
      await logRestraint(workspaceId, leadId, "warmup_limit", { warmupToday, warmupLimit });
      await recordInaction(leadId, workspaceId, "warmup_limit", { warmupToday, warmupLimit });
      return;
    }
  }

  const { data: convRow2 } = await db.from("conversations").select("channel").eq("lead_id", leadId).limit(1).maybeSingle();
  let channel = (convRow2 as { channel?: string })?.channel ?? "web";
  const channelCanSend = await canSend(channel);
  if (!channelCanSend) {
    const fallback = await getFallbackChannel(channel);
    if (!fallback) {
      await recordInaction(leadId, workspaceId, "channel_unavailable", { channel });
      return;
    }
    channel = fallback;
  }

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { count: outboundToday } = await db
    .from("outbound_messages")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .gte("sent_at", todayStart.toISOString());
  if (!passesStageLimit(state, outboundToday ?? 0)) {
    await logRestraint(workspaceId, leadId, "stage_limit", { state, outboundToday });
    await recordInaction(leadId, workspaceId, "stage_limit", { state, outboundToday });
    return;
  }

  const { data: outboundRows } = await db
    .from("outbound_messages")
    .select("sent_at")
    .eq("lead_id", leadId)
    .order("sent_at", { ascending: false })
    .limit(1);
  const { count: totalOutbound } = await db
    .from("outbound_messages")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", leadId);
  const lastOutbound = outboundRows?.[0] as { sent_at?: string } | undefined;
  const lastAt = lastOutbound?.sent_at ? new Date(lastOutbound.sent_at) : null;
  const attemptCount = (totalOutbound ?? 0) + 1;
  if (!passesCooldownLadder(lastAt, attemptCount)) {
    await logRestraint(workspaceId, leadId, "cooldown_active", { attemptCount });
    await recordInaction(leadId, workspaceId, "cooldown_active", { attemptCount });
    return;
  }

  const inEscalationHold = await isLeadInEscalationHold(leadId);
  if (inEscalationHold) {
    const holdingMessage = getEscalationHoldingMessage();
    await db.from("messages").insert({
      conversation_id: convId,
      role: "assistant",
      content: holdingMessage,
      confidence_score: 1,
      approved_by_human: false,
      metadata: { action: "escalation_hold_limited_assist", reasoning },
    });
    const { data: convH } = await db.from("conversations").select("channel").eq("id", convId).maybeSingle();
    const outCh = (convH as { channel?: string })?.channel ?? "web";
    await enqueueSendMessage(
      workspaceId,
      leadId,
      convId,
      outCh,
      holdingMessage,
      `send:${workspaceId}:${leadId}:${convId}:hold:${(totalOutbound ?? 0) + 1}`
    );
    return;
  }

  const policy = checkPolicy(
    { is_vip: lead.is_vip, company: lead.company, opt_out: lead.opt_out },
    message,
    action,
    settings,
    state
  );

  if (!policy.allowed) {
    message = SAFE_FALLBACK_MESSAGES[policy.safeFallback] ?? SAFE_FALLBACK_MESSAGES.clarifying_question;
  }

  const sensitive = detectSensitiveIntent((reasoning.risk_flags ?? []) as string[], lastUserMsg);
  const { data: dealRow } = await db.from("deals").select("value_cents").eq("lead_id", leadId).neq("status", "lost").limit(1).maybeSingle();
  const dealValue = (dealRow as { value_cents?: number })?.value_cents ?? 0;

  // Human presence layer: timing, variation, memory, validation, emotional complexity
  const { applyHumanPresence } = await import("@/lib/human-presence");
  type ConvState = import("@/lib/conversation-state/resolver").ConversationState;
  const conversationStateForPresence = (reasoning as { conversation_state?: string }).conversation_state ?? "NEW_INTEREST";
  const presenceResult = await applyHumanPresence({
    leadId,
    workspaceId,
    conversationId: convId,
    state: conversationStateForPresence as ConvState,
    message,
    lastUserMessage: lastUserMsg,
    objectionCount: (reasoning as { objection_type?: string })?.objection_type ? 1 : 0,
  });
  message = presenceResult.content;
  const shouldEscalateByEmotion = presenceResult.shouldEscalateByEmotion ?? false;

  const needsApproval = !forceSimulate && (await shouldRequireApproval(workspaceId, action, {
    isSensitive: !!sensitive,
    dealValueCents: dealValue,
  }));

  const escalationCheck = await checkEscalation(workspaceId, leadId, {
    dealValueCents: dealValue,
    isVip: lead.is_vip ?? false,
    angerDetected: sensitive === "anger",
    negotiationDetected: sensitive === "negotiation",
    policySensitiveDetected: !!sensitive,
  });

  if (!forceSimulate && ((escalationCheck.shouldEscalate && escalationCheck.reason) || needsApproval || shouldEscalateByEmotion)) {
    const escReason = escalationCheck.reason ?? (shouldEscalateByEmotion ? "emotional_complexity" : "autonomy_assist_approval_required");
    const assignedUserId = await getAssignedUserId(workspaceId, leadId);
    const { data: escRules } = await db.from("settings").select("escalation_rules, escalation_timeout_hours").eq("workspace_id", workspaceId).maybeSingle();
    const timeoutHours = (escRules as { escalation_rules?: { escalation_timeout_hours?: number }; escalation_timeout_hours?: number })?.escalation_rules?.escalation_timeout_hours
      ?? (escRules as { escalation_timeout_hours?: number })?.escalation_timeout_hours
      ?? 24;
    const holdUntil = new Date();
    holdUntil.setHours(holdUntil.getHours() + timeoutHours);
    const escalationId = await logEscalation(workspaceId, leadId, escReason, action, message, assignedUserId ?? undefined, holdUntil);

    const holdingMessage = getEscalationHoldingMessage();
    await db.from("messages").insert({
      conversation_id: convId,
      role: "assistant",
      content: holdingMessage,
      confidence_score: 1,
      approved_by_human: false,
      metadata: { action: "escalation_holding", escalation_reason: escReason, reasoning },
    });

    if (escalationId) {
      await db.from("escalation_logs").update({ hold_until: holdUntil.toISOString(), holding_message_sent: true }).eq("id", escalationId);
    }

    const { data: conv } = await db.from("conversations").select("channel").eq("id", convId).maybeSingle();
    const outChannel = (conv as { channel?: string })?.channel ?? "web";
    await enqueueSendMessage(
      workspaceId,
      leadId,
      convId,
      outChannel,
      holdingMessage,
      `send:${workspaceId}:${leadId}:${convId}:escalation:${(totalOutbound ?? 0) + 1}`
    );

    await db.from("pending_approvals").insert({
      lead_id: leadId,
      conversation_id: convId,
      proposed_message: message,
      confidence_score: confidence,
      intent_classification: reasoning,
      status: "pending",
    });
    const escNarrative = narrativeForAction(action, { lastUserMsg, state, policyReason: policy.reason, reasoning });
    await db.from("action_logs").insert({
      workspace_id: workspaceId,
      entity_type: "lead",
      entity_id: leadId,
      action: "escalation_suggest",
      actor: roleLabel,
      role: roleId,
      payload: {
        escalation_reason: escReason,
        proposed_action: action,
        reasoning,
        hold_until: holdUntil.toISOString(),
        noticed: escNarrative.noticed,
        decision: escNarrative.decision,
        expected: escNarrative.expected,
        confidence_label: confidenceToLabel(confidence),
      },
    });
    return;
  }

  const metadata = { action, policy_reason: policy.reason, reasoning, ...(forceSimulate ? { simulated: true } : {}) };

  await db.from("messages").insert({
    conversation_id: convId,
    role: "assistant",
    content: message,
    confidence_score: confidence,
    approved_by_human: false,
    metadata,
  });

  const narrative = narrativeForAction(action, { lastUserMsg, state, policyReason: policy.reason, reasoning });
  const confidenceLabel = confidenceToLabel(confidence);
  if (forceSimulate) {
    await db.from("action_logs").insert({
      workspace_id: workspaceId,
      entity_type: "lead",
      entity_id: leadId,
      action: "simulated_send_message",
      actor: roleLabel,
      role: roleId,
      payload: {
        action,
        confidence,
        policy_reason: policy.reason,
        reasoning,
        simulated: true,
        noticed: narrative.noticed,
        decision: narrative.decision,
        expected: narrative.expected,
        confidence_label: confidenceLabel,
      },
    });
    return;
  }

  const { data: conv } = await db.from("conversations").select("channel").eq("id", convId).maybeSingle();
  const outChannel = (conv as { channel?: string })?.channel ?? "web";
  await enqueueSendMessage(
    workspaceId,
    leadId,
    convId,
    outChannel,
    message,
    `send:${workspaceId}:${leadId}:${convId}:${attemptCount}`,
    { send_at: presenceResult.sendAt, delay_seconds: presenceResult.delaySeconds }
  );

  // Schedule next action based on playbook (if state-driven flow was used)
  const nextActionAt = (reasoning as { _next_action_at?: Date })._next_action_at;
  const conversationStateFromReasoning = (reasoning as { conversation_state?: string }).conversation_state;
  if (nextActionAt && conversationStateFromReasoning) {
    const playbookActionMap: Record<string, string> = {
      NEW_INTEREST: "observe",
      CLARIFICATION: "observe",
      CONSIDERING: "observe",
      SOFT_OBJECTION: "follow_up",
      HARD_OBJECTION: "follow_up",
      DRIFT: "follow_up",
      COMMITMENT: "confirm",
      POST_BOOKING: "observe",
    };
    const nextActionType = playbookActionMap[conversationStateFromReasoning] ?? "observe";
    await setLeadPlan(workspaceId, leadId, {
      next_action_type: nextActionType,
      next_action_at: nextActionAt.toISOString(),
    }).catch(() => {});
  }

  await incrementMetric(workspaceId, policy.allowed ? METRIC_KEYS.REPLIES_SENT : METRIC_KEYS.FALLBACK_USED);

  try {
    const { recordRiskIncidentPrevented } = await import("@/lib/risk-surface/record-incident");
    await recordRiskIncidentPrevented(workspaceId, action, { leadId, detail: { action } });
  } catch {
    // Non-blocking
  }

  await db.from("action_logs").insert({
    workspace_id: workspaceId,
    entity_type: "lead",
    entity_id: leadId,
    action: "send_message",
    actor: roleLabel,
    role: roleId,
    payload: {
      action,
      confidence,
      policy_reason: policy.reason,
      reasoning,
      noticed: narrative.noticed,
      decision: narrative.decision,
      expected: narrative.expected,
      confidence_label: confidenceLabel,
    },
  });
}
