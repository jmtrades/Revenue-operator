/**
 * Run governed execution: buildExecutionPlan + persist strategy state + emit action intent.
 * Use when inbound event should produce a governed, compliant, auditable plan and intent.
 */

import { buildExecutionPlan } from "./build";
import { emitExecutionPlanIntent, type EmitRecipient } from "./emit";
import { getDb } from "@/lib/db/queries";
import type { NormalizedInboundEvent, ConversationContext, DomainHints } from "./build";
import type { ExecutionPlan } from "./types";

export interface RunGovernedExecutionInput {
  workspaceId: string;
  inboundEvent: NormalizedInboundEvent;
  conversationContext: ConversationContext;
  recipient: EmitRecipient;
  domainHints?: DomainHints | null;
  nowIso?: string;
}

/**
 * Build plan, persist strategy state (inside build), then emit the appropriate action_intent.
 * Returns the plan; intent is emitted when decision is send | emit_approval | emit_preview.
 */
export async function runGovernedExecution(
  input: RunGovernedExecutionInput
): Promise<ExecutionPlan> {
  // Universal inbound autostart: if workspace not yet activated with a domain pack, create minimal general pack
  // and set preview_required so the first response is a governed preview.
  const db = getDb();
  const { data: existingPack } = await db
    .from("domain_packs")
    .select("workspace_id")
    .eq("workspace_id", input.workspaceId)
    .maybeSingle();
  if (!existingPack) {
    try {
      await db
        .from("domain_packs")
        .upsert(
          {
            workspace_id: input.workspaceId,
            domain_type: "general",
            config_json: { default_jurisdiction: "UNSPECIFIED" },
          },
          { onConflict: "workspace_id,domain_type" }
        );
      await db
        .from("settings")
        .update({ approval_mode: "preview_required", updated_at: new Date().toISOString() })
        .eq("workspace_id", input.workspaceId);
      const { ensureWorkspaceScenarioBaseline } = await import("@/lib/scenarios/seed");
      await ensureWorkspaceScenarioBaseline(input.workspaceId).catch(() => {});
    } catch {
      // Best-effort autostart; execution plan builder still enforces UNSPECIFIED safety.
    }
  }

  const plan = await buildExecutionPlan(
    input.workspaceId,
    input.inboundEvent,
    input.conversationContext,
    input.domainHints ?? null,
    input.nowIso
  );

  await emitExecutionPlanIntent(plan, input.recipient, {
    rendered_text: plan.rendered_text ?? undefined,
    approval_id: plan.approval_id ?? undefined,
    dedupe_suffix: input.nowIso ?? new Date().toISOString(),
  });

  const threadId = plan.identifiers.thread_id ?? null;
  if (threadId && plan.decision !== "blocked" && plan.action_intent_to_emit) {
    const variantUsed =
      plan.action_intent_to_emit === "escalate_to_human"
        ? "handoff"
        : plan.action_intent_to_emit === "request_disclosure_confirmation"
          ? "clarify"
          : "direct";
    const { updateStrategicPattern } = await import("@/lib/intelligence/strategic-pattern");
    await updateStrategicPattern(input.workspaceId, threadId, variantUsed).catch(() => {});
  }

  return plan;
}
