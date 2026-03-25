/**
 * Compile governed message: approved templates + policy checks. Deterministic only.
 */

import { getApprovedTemplate, renderTemplate } from "./templates";
import { getApprovedPolicies, evaluatePolicies } from "./policies";
import { requiresReview } from "./review";
import { MAX_SMS_CHARS, trimToMaxChars, containsForbiddenLanguage } from "./doctrine";
import type { CheckResult } from "./schema";

export interface CompileGovernedMessageInput {
  workspace_id: string;
  audience?: string | null;
  domain_type: string;
  jurisdiction: string;
  channel: "sms" | "email" | "whatsapp";
  intent_type: string;
  clause_plan: { type: string }[];
  slots: Record<string, string | number | boolean>;
  thread_id?: string | null;
  work_unit_id?: string | null;
  conversation_id?: string | null;
  /** For deterministic template variation when multiple exist. */
  attempt_number?: number;
}

export interface CompileGovernedMessageOutput {
  rendered_text: string;
  trace: {
    policy_checks: CheckResult[];
    templates_used: { key: string; version: number }[];
    clause_plan?: unknown;
    approval_id?: string;
    /** Spec VIII: Preview API must show these. */
    disclaimer_lines?: string[];
    approval_mode?: string;
    policy_id?: string | null;
    template_id?: string | null;
  };
  decision: "send" | "block" | "review_required" | "approval_required" | "preview_required";
}

export async function compileGovernedMessage(
  input: CompileGovernedMessageInput
): Promise<CompileGovernedMessageOutput> {
  const templatesUsed: { key: string; version: number }[] = [];
  const policyChecks: CheckResult[] = [];

  const workspaceId = input.workspace_id || null;
  const clauseType = input.clause_plan?.[0]?.type ?? "acknowledgment";

  const template = await getApprovedTemplate(
    workspaceId,
    input.domain_type,
    input.jurisdiction,
    input.channel,
    input.intent_type,
    clauseType,
    input.thread_id ?? null,
    input.attempt_number ?? 0
  );

  if (!template) {
    return {
      rendered_text: "",
      trace: {
        policy_checks: [{ check: "approved_template", passed: false, reason: "no_approved_template" }],
        templates_used: [],
        disclaimer_lines: [],
        approval_mode: "autopilot",
        policy_id: null,
        template_id: null,
      },
      decision: "block",
    };
  }

  let rendered = renderTemplate(template.body, input.slots);
  templatesUsed.push({ key: template.key, version: template.version });

  const { resolveMessagePolicy } = await import("@/lib/governance/message-policy");
  const { resolveCompliancePack } = await import("@/lib/governance/compliance-pack");
  const { createMessageApproval } = await import("@/lib/governance/approval-queue");

  const messagePolicy = await resolveMessagePolicy(
    workspaceId,
    input.domain_type,
    input.jurisdiction,
    input.channel,
    input.intent_type
  );

  if (messagePolicy?.forbidden_phrases?.length) {
    const lower = rendered.toLowerCase();
    for (const phrase of messagePolicy.forbidden_phrases) {
      if (lower.includes(phrase.toLowerCase())) {
        policyChecks.push({ check: "policy_forbidden", passed: false, reason: "forbidden_phrase" });
        return {
          rendered_text: rendered,
          trace: {
            policy_checks: policyChecks,
            templates_used: templatesUsed,
            clause_plan: input.clause_plan,
            disclaimer_lines: messagePolicy?.required_disclaimers ?? [],
            approval_mode: messagePolicy?.approval_mode ?? "autopilot",
            policy_id: messagePolicy?.id ?? null,
            template_id: template?.key ?? null,
          },
          decision: "block",
        };
      }
    }
  }

  const compliance = await resolveCompliancePack(input.workspace_id, input.domain_type);
  const disclaimerLines = [
    ...(messagePolicy?.required_disclaimers ?? []),
    ...(compliance.disclaimers ?? []),
  ].filter(Boolean) as string[];
  if (disclaimerLines.length) {
    const suffix = "\n" + disclaimerLines.join("\n");
    rendered = (rendered + suffix).trim();
  }

  const baseTrace = {
    policy_checks: policyChecks,
    templates_used: templatesUsed,
    clause_plan: input.clause_plan,
    disclaimer_lines: disclaimerLines,
    approval_mode: messagePolicy?.approval_mode ?? "autopilot",
    policy_id: messagePolicy?.id ?? null,
    template_id: template?.key ?? null,
  };

  if (containsForbiddenLanguage(rendered)) {
    policyChecks.push({ check: "doctrine", passed: false, reason: "forbidden_language" });
    return {
      rendered_text: rendered,
      trace: baseTrace,
      decision: "block",
    };
  }

  const maxChars = input.channel === "sms" ? MAX_SMS_CHARS : 2000;
  if (rendered.length > maxChars) {
    rendered = trimToMaxChars(rendered, maxChars);
    policyChecks.push({ check: "length", passed: false, reason: "length_exceeded" });
    return {
      rendered_text: rendered,
      trace: baseTrace,
      decision: "block",
    };
  }

  if (messagePolicy?.approval_mode === "approval_required") {
    const approvalId = await createMessageApproval({
      workspace_id: input.workspace_id,
      proposed_message: rendered,
      policy_id: messagePolicy.id,
      conversation_id: input.conversation_id ?? null,
      work_unit_id: input.work_unit_id ?? null,
      thread_id: input.thread_id ?? null,
    });
    return {
      rendered_text: rendered,
      trace: { ...baseTrace, approval_id: approvalId },
      decision: "approval_required",
    };
  }

  if (messagePolicy?.approval_mode === "preview_required") {
    return {
      rendered_text: rendered,
      trace: baseTrace,
      decision: "preview_required",
    };
  }

  if (messagePolicy?.approval_mode === "jurisdiction_locked") {
    if (!input.jurisdiction?.trim()) {
      return {
        rendered_text: rendered,
        trace: baseTrace,
        decision: "block",
      };
    }
    if (messagePolicy.required_disclaimers === undefined || !Array.isArray(messagePolicy.required_disclaimers)) {
      return {
        rendered_text: rendered,
        trace: baseTrace,
        decision: "block",
      };
    }
    if (!compliance || typeof compliance !== "object") {
      return {
        rendered_text: rendered,
        trace: baseTrace,
        decision: "block",
      };
    }
    const approvalId = await createMessageApproval({
      workspace_id: input.workspace_id,
      proposed_message: rendered,
      policy_id: messagePolicy.id,
      conversation_id: input.conversation_id ?? null,
      work_unit_id: input.work_unit_id ?? null,
      thread_id: input.thread_id ?? null,
    });
    return {
      rendered_text: rendered,
      trace: { ...baseTrace, approval_id: approvalId },
      decision: "approval_required",
    };
  }

  const policies = await getApprovedPolicies(
    workspaceId,
    input.domain_type,
    input.jurisdiction,
    input.channel
  );
  const evalResult = evaluatePolicies(policies, {
    intentType: input.intent_type,
    renderedText: rendered,
    clausePlan: input.clause_plan,
    slots: input.slots,
    channel: input.channel,
  });

  for (const c of evalResult.checks) policyChecks.push(c);
  if (!evalResult.passed) {
    return {
      rendered_text: rendered,
      trace: baseTrace,
      decision: "block",
    };
  }

  if (requiresReview(input.intent_type, input.domain_type, input.jurisdiction)) {
    return {
      rendered_text: rendered,
      trace: baseTrace,
      decision: "review_required",
    };
  }

  return {
    rendered_text: rendered,
    trace: baseTrace,
    decision: "send",
  };
}
