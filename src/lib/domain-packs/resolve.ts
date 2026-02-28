/**
 * Resolve domain context and pack policy for a workspace. Deterministic fallbacks.
 */

import { getDb } from "@/lib/db/queries";
import type { PolicySchema } from "@/lib/speech-governance/schema";
import { domainPackConfigSchema, type DomainPackConfig } from "./schema";

export interface DomainContext {
  domain_type: string;
  jurisdiction: string;
}

export async function resolveDomainContext(workspaceId: string): Promise<DomainContext> {
  const db = getDb();
  const { data: pack } = await db
    .from("domain_packs")
    .select("domain_type, config_json")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (pack) {
    const row = pack as { domain_type: string; config_json?: { default_jurisdiction?: string } };
    return {
      domain_type: row.domain_type,
      jurisdiction: row.config_json?.default_jurisdiction ?? "UK",
    };
  }

  const { data: settingsRow } = await db
    .from("settings")
    .select("business_type")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const businessType = (settingsRow as { business_type?: string } | null)?.business_type;
  const domainType = businessType === "real_estate" ? "real_estate" : businessType ?? "general";

  return { domain_type: domainType, jurisdiction: "UNSPECIFIED" };
}

/** Load full domain pack config (strategy graph, objection tree, regulatory matrix). */
export async function resolveDomainPackConfig(workspaceId: string): Promise<DomainPackConfig | null> {
  const db = getDb();
  const { data: pack } = await db
    .from("domain_packs")
    .select("config_json")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!pack?.config_json || typeof pack.config_json !== "object") return null;
  const parsed = domainPackConfigSchema.safeParse(pack.config_json);
  return parsed.success ? parsed.data : null;
}

export async function resolvePackPolicy(
  workspaceId: string,
  domain: string,
  jurisdiction: string,
  channel: string
): Promise<PolicySchema[]> {
  const { getApprovedPolicies } = await import("@/lib/speech-governance");
  return getApprovedPolicies(workspaceId, domain, jurisdiction, channel);
}
