/**
 * Resolve compliance pack: workspace + industry + region -> rules (disclaimers, forbidden claims, consent, etc.).
 * Deterministic. Used at compile time to enforce required disclaimers and block forbidden content.
 */

import { getDb } from "@/lib/db/queries";

export interface ComplianceRules {
  disclaimers: string[];
  forbidden_claims: string[];
  consent_required: boolean;
  quiet_hours?: { start: string; end: string; tz: string };
  opt_out_language?: string[];
}

const EMPTY_RULES: ComplianceRules = {
  disclaimers: [],
  forbidden_claims: [],
  consent_required: false,
};

export async function resolveCompliancePack(
  workspaceId: string,
  industryType?: string | null,
  _regionState?: string | null
): Promise<ComplianceRules> {
  const db = getDb();

  const { data: row } = await db
    .from("compliance_packs")
    .select("rules_json")
    .eq("workspace_id", workspaceId)
    .eq("industry_type", industryType ?? "general")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) {
    const { data: fallback } = await db
      .from("compliance_packs")
      .select("rules_json")
      .eq("workspace_id", workspaceId)
      .eq("industry_type", "general")
      .limit(1)
      .maybeSingle();
    const r = (fallback ?? row) as { rules_json?: Record<string, unknown> } | null;
    return parseRules(r?.rules_json);
  }

  return parseRules((row as { rules_json?: Record<string, unknown> }).rules_json);
}

function parseRules(rules?: Record<string, unknown> | null): ComplianceRules {
  if (!rules || typeof rules !== "object") return EMPTY_RULES;
  return {
    disclaimers: Array.isArray(rules.disclaimers) ? (rules.disclaimers as string[]) : [],
    forbidden_claims: Array.isArray(rules.forbidden_claims) ? (rules.forbidden_claims as string[]) : [],
    consent_required: Boolean(rules.consent_required),
    quiet_hours:
      rules.quiet_hours && typeof rules.quiet_hours === "object"
        ? (rules.quiet_hours as { start: string; end: string; tz: string })
        : undefined,
    opt_out_language: Array.isArray(rules.opt_out_language) ? (rules.opt_out_language as string[]) : undefined,
  };
}
