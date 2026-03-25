/**
 * Approved policies: lookup and evaluate. Deterministic checks only.
 */

import { getDb } from "@/lib/db/queries";
import { policySchema, type PolicySchema } from "./schema";
import { containsForbiddenLanguage } from "./doctrine";
import type { CheckResult } from "./schema";

export interface EvaluateInput {
  intentType: string;
  renderedText: string;
  clausePlan: { type: string }[];
  slots: Record<string, unknown>;
  channel: string;
}

export interface EvaluateResult {
  passed: boolean;
  checks: CheckResult[];
  requiredDisclosuresToInject?: string[];
}

export async function getApprovedPolicies(
  workspaceId: string | null,
  domainType: string,
  jurisdiction: string,
  channel: string
): Promise<PolicySchema[]> {
  const db = getDb();
  const status = "approved";
  const out: PolicySchema[] = [];

  if (workspaceId) {
    const { data: wsRows } = await db
      .from("speech_policies")
      .select("policy_json")
      .eq("workspace_id", workspaceId)
      .eq("domain_type", domainType)
      .eq("jurisdiction", jurisdiction)
      .eq("channel", channel)
      .eq("status", status);
    const list = (wsRows ?? []) as { policy_json: unknown }[];
    for (const r of list) {
      const parsed = policySchema.safeParse(r.policy_json);
      if (parsed.success) out.push(parsed.data);
    }
  }

  const { data: globalRows } = await db
    .from("speech_policies")
    .select("policy_json")
    .is("workspace_id", null)
    .eq("domain_type", domainType)
    .eq("jurisdiction", jurisdiction)
    .eq("channel", channel)
    .eq("status", status);
  const globalList = (globalRows ?? []) as { policy_json: unknown }[];
  for (const r of globalList) {
    const parsed = policySchema.safeParse(r.policy_json);
    if (parsed.success) out.push(parsed.data);
  }

  return out;
}

export function evaluatePolicies(
  policies: PolicySchema[],
  input: EvaluateInput
): EvaluateResult {
  const checks: CheckResult[] = [];
  const requiredDisclosuresToInject: string[] = [];

  for (const policy of policies) {
    if (policy.banned_phrases?.length) {
      const lower = input.renderedText.toLowerCase();
      for (const phrase of policy.banned_phrases) {
        if (lower.includes(phrase.toLowerCase())) {
          checks.push({ check: "banned_phrase", passed: false, reason: phrase });
          return { passed: false, checks, requiredDisclosuresToInject };
        }
      }
      checks.push({ check: "banned_phrase", passed: true });
    }

    if (policy.forbidden_terms_by_intent?.length) {
      const forIntent = policy.forbidden_terms_by_intent.find(
        (f) => f.intent_type === input.intentType
      );
      if (forIntent) {
        const lower = input.renderedText.toLowerCase();
        for (const term of forIntent.terms) {
          if (lower.includes(term.toLowerCase())) {
            checks.push({ check: "forbidden_term", passed: false, reason: term });
            return { passed: false, checks, requiredDisclosuresToInject };
          }
        }
      }
      checks.push({ check: "forbidden_term", passed: true });
    }

    if (containsForbiddenLanguage(input.renderedText)) {
      checks.push({ check: "doctrine_forbidden", passed: false, reason: "forbidden_language" });
      return { passed: false, checks, requiredDisclosuresToInject };
    }
    checks.push({ check: "doctrine_forbidden", passed: true });

    for (const rd of policy.required_disclosures ?? []) {
      const hasTrigger = rd.trigger_terms.some((t) =>
        input.renderedText.toLowerCase().includes(t.toLowerCase())
      );
      if (hasTrigger && rd.disclosure_template_key) {
        requiredDisclosuresToInject.push(rd.disclosure_template_key);
      }
    }
  }

  return {
    passed: true,
    checks,
    requiredDisclosuresToInject:
      requiredDisclosuresToInject.length > 0 ? requiredDisclosuresToInject : undefined,
  };
}
