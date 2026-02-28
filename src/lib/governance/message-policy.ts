/**
 * Resolve message policy: (workspace, domain, jurisdiction, channel, intent) -> template + disclaimers + approval_mode.
 * Deterministic: workspace row first, then global.
 */

import { getDb } from "@/lib/db/queries";

export type ApprovalMode =
  | "autopilot"
  | "preview_required"
  | "approval_required"
  | "locked_script"
  | "jurisdiction_locked"
  | "dual_approval_required"
  | "compliance_only_approval";

export interface ResolvedMessagePolicy {
  id: string;
  template_id: string | null;
  required_disclaimers: string[];
  forbidden_phrases: string[];
  required_phrases: string[];
  approval_mode: ApprovalMode;
}

export async function resolveMessagePolicy(
  workspaceId: string | null,
  domainType: string,
  jurisdiction: string,
  channel: string,
  intentType: string
): Promise<ResolvedMessagePolicy | null> {
  const db = getDb();

  if (workspaceId) {
    const { data: row } = await db
      .from("message_policies")
      .select("id, template_id, required_disclaimers, forbidden_phrases, required_phrases, approval_mode")
      .eq("workspace_id", workspaceId)
      .eq("domain_type", domainType)
      .eq("jurisdiction", jurisdiction)
      .eq("channel", channel)
      .eq("intent_type", intentType)
      .maybeSingle();
    if (row) {
      const r = row as {
        id: string;
        template_id: string | null;
        required_disclaimers: unknown;
        forbidden_phrases: unknown;
        required_phrases: unknown;
        approval_mode: string;
      };
      return {
        id: r.id,
        template_id: r.template_id,
        required_disclaimers: Array.isArray(r.required_disclaimers) ? r.required_disclaimers as string[] : [],
        forbidden_phrases: Array.isArray(r.forbidden_phrases) ? r.forbidden_phrases as string[] : [],
        required_phrases: Array.isArray(r.required_phrases) ? r.required_phrases as string[] : [],
        approval_mode: r.approval_mode as ApprovalMode,
      };
    }
  }

  const { data: globalRow } = await db
    .from("message_policies")
    .select("id, template_id, required_disclaimers, forbidden_phrases, required_phrases, approval_mode")
    .is("workspace_id", null)
    .eq("domain_type", domainType)
    .eq("jurisdiction", jurisdiction)
    .eq("channel", channel)
    .eq("intent_type", intentType)
    .maybeSingle();
  if (globalRow) {
    const r = globalRow as {
      id: string;
      template_id: string | null;
      required_disclaimers: unknown;
      forbidden_phrases: unknown;
      required_phrases: unknown;
      approval_mode: string;
    };
    return {
      id: r.id,
      template_id: r.template_id,
      required_disclaimers: Array.isArray(r.required_disclaimers) ? r.required_disclaimers as string[] : [],
      forbidden_phrases: Array.isArray(r.forbidden_phrases) ? r.forbidden_phrases as string[] : [],
      required_phrases: Array.isArray(r.required_phrases) ? r.required_phrases as string[] : [],
      approval_mode: r.approval_mode as ApprovalMode,
    };
  }

  return null;
}
