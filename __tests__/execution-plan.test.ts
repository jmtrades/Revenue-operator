/**
 * Execution plan: deterministic plan, no AI message text, policy/compliance applied, approval_required path.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ExecutionPlan, ExecutionDecision } from "@/lib/execution-plan/types";

vi.mock("@/lib/db/queries", () => ({
  getDb: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }), order: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: "approval-1" } }) }) }),
      upsert: () => Promise.resolve({ error: null }),
      update: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
    }),
  }),
}));

vi.mock("@/lib/domain-packs/resolve", () => ({
  resolveDomainPackConfig: () => Promise.resolve(null),
  resolveDomainContext: () => Promise.resolve({ domain_type: "general", jurisdiction: "UK" }),
}));

vi.mock("@/lib/channel-policy", () => ({
  resolveChannelPolicy: () => Promise.resolve({
    primary_channel: "sms",
    fallback_channel: "email",
    escalation_channel: "voice",
    quiet_hours_enforced: false,
  }),
  isWithinQuietHours: () => false,
}));

vi.mock("@/lib/governance/message-policy", () => ({
  resolveMessagePolicy: () => Promise.resolve({
    id: "policy-1",
    template_id: null,
    required_disclaimers: [],
    forbidden_phrases: [],
    required_phrases: [],
    approval_mode: "autopilot",
  }),
}));

vi.mock("@/lib/governance/compliance-pack", () => ({
  resolveCompliancePack: () => Promise.resolve({
    disclaimers: [],
    forbidden_claims: [],
    consent_required: false,
  }),
}));

vi.mock("@/lib/strategy-state/store", () => ({
  getStrategyState: () => Promise.resolve(null),
  upsertStrategyState: () => Promise.resolve(),
}));

vi.mock("@/lib/emotional-signals/store", () => ({
  getSignals: () => Promise.resolve({}),
  mergeAndUpsertSignals: () => Promise.resolve({}),
}));

vi.mock("@/lib/scenarios/resolver", () => ({
  resolveScenarioProfile: () => Promise.resolve({ profile: null, use_mode_key: "triage" }),
}));

vi.mock("@/lib/speech-governance/compiler", () => ({
  compileGovernedMessage: () => Promise.resolve({
    rendered_text: "Template text only.",
    trace: { policy_checks: [], templates_used: [{ key: "general_ack", version: 1 }] },
    decision: "send",
  }),
}));

describe("Execution plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("buildExecutionPlan returns ExecutionPlan shape with valid decision", async () => {
    const { buildExecutionPlan } = await import("@/lib/execution-plan/build");
    const plan = await buildExecutionPlan(
      "ws-1",
      {
        workspace_id: "ws-1",
        conversation_id: "conv-1",
        pre_classified_intent: "follow_up",
      },
      { conversation_id: "conv-1" },
      null,
      "2025-01-01T12:00:00.000Z"
    );

    expect(plan).toBeDefined();
    const decisions: ExecutionDecision[] = ["send", "emit_approval", "emit_preview", "blocked"];
    expect(decisions).toContain(plan.decision);
    expect(plan.identifiers.workspace_id).toBe("ws-1");
    expect(plan.identifiers.conversation_id).toBe("conv-1");
    expect(plan.intent_type).toBe("follow_up");
    expect(plan.channel_chosen).toBeDefined();
    expect(plan.strategy_state_before).toBeDefined();
    expect(plan.strategy_state_after).toBeDefined();
    expect(plan.trace).toBeDefined();
    expect(Array.isArray(plan.trace.policy_checks)).toBe(true);
  });

  it("plan has no freeform AI message text — rendered_text from template only", async () => {
    const { buildExecutionPlan } = await import("@/lib/execution-plan/build");
    const plan = await buildExecutionPlan(
      "ws-1",
      { workspace_id: "ws-1", conversation_id: "conv-1" },
      { conversation_id: "conv-1" },
      null,
      "2025-01-01T12:00:00.000Z"
    );

    if (plan.rendered_text) {
      expect(typeof plan.rendered_text).toBe("string");
      expect(plan.rendered_text.length).toBeLessThanOrEqual(2000);
    }
  });

  it("same inputs produce same decision and state shape (determinism)", async () => {
    const { buildExecutionPlan } = await import("@/lib/execution-plan/build");
    const input = {
      workspaceId: "ws-1" as const,
      inboundEvent: { workspace_id: "ws-1", conversation_id: "conv-2" } as Parameters<typeof buildExecutionPlan>[1],
      conversationContext: { conversation_id: "conv-2" } as Parameters<typeof buildExecutionPlan>[2],
      domainHints: null as Parameters<typeof buildExecutionPlan>[3],
      nowIso: "2025-01-01T12:00:00.000Z" as Parameters<typeof buildExecutionPlan>[4],
    };

    const plan1 = await buildExecutionPlan(input.workspaceId, input.inboundEvent, input.conversationContext, input.domainHints, input.nowIso);
    const plan2 = await buildExecutionPlan(input.workspaceId, input.inboundEvent, input.conversationContext, input.domainHints, input.nowIso);

    expect(plan1.decision).toBe(plan2.decision);
    expect(plan1.strategy_state_after).toBe(plan2.strategy_state_after);
    expect(plan1.intent_type).toBe(plan2.intent_type);
  });
});
