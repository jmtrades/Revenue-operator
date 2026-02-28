/**
 * Approved templates: lookup by scope, render with slots. Deterministic only.
 * When threadId + attemptNumber provided and multiple templates exist, use selectDeterministicVariant.
 */

import { getDb } from "@/lib/db/queries";
import { selectDeterministicVariant } from "@/lib/intelligence/deterministic-variant";

const SLOT_PATTERN = /\{\{\s*(\w+)\s*\}\}/g;

export interface ApprovedTemplate {
  body: string;
  version: number;
  key: string;
}

export function extractSlotNames(body: string): string[] {
  const names: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = SLOT_PATTERN.exec(body)) !== null) {
    if (!names.includes(m[1])) names.push(m[1]);
  }
  return names;
}

export function renderTemplate(body: string, slots: Record<string, string | number | boolean>): string {
  return body.replace(SLOT_PATTERN, (_, name) => {
    const v = slots[name];
    return v !== undefined && v !== null ? String(v) : "";
  });
}

const TEMPLATE_VARIATION_LIMIT = 10;

export async function getApprovedTemplate(
  workspaceId: string | null,
  domainType: string,
  jurisdiction: string,
  channel: string,
  intentType: string,
  clauseType: string,
  threadId?: string | null,
  attemptNumber?: number
): Promise<ApprovedTemplate | null> {
  const db = getDb();
  const status = "approved";
  const useVariation = typeof threadId === "string" && threadId.length > 0;
  const limit = useVariation ? TEMPLATE_VARIATION_LIMIT : 1;

  if (workspaceId) {
    const { data: wsData } = await db
      .from("speech_templates")
      .select("template_body, version, template_key")
      .eq("workspace_id", workspaceId)
      .eq("domain_type", domainType)
      .eq("jurisdiction", jurisdiction)
      .eq("channel", channel)
      .eq("intent_type", intentType)
      .eq("clause_type", clauseType)
      .eq("status", status)
      .order("version", { ascending: false })
      .limit(limit);
    const wsList = (wsData ?? []) as Array<{ template_body: string; version: number; template_key: string }>;
    if (wsList.length > 0) {
      if (useVariation && wsList.length > 1) {
        const keys = wsList.map((r) => r.template_key);
        const chosen = selectDeterministicVariant(threadId!, attemptNumber ?? 0, keys);
        const row = wsList.find((r) => r.template_key === chosen) ?? wsList[0];
        return { body: row.template_body, version: row.version, key: row.template_key };
      }
      const row = wsList[0];
      return { body: row.template_body, version: row.version, key: row.template_key };
    }
  }

  const { data: globalData } = await db
    .from("speech_templates")
    .select("template_body, version, template_key")
    .is("workspace_id", null)
    .eq("domain_type", domainType)
    .eq("jurisdiction", jurisdiction)
    .eq("channel", channel)
    .eq("intent_type", intentType)
    .eq("clause_type", clauseType)
    .eq("status", status)
    .order("version", { ascending: false })
    .limit(limit);
  const globalList = (globalData ?? []) as Array<{ template_body: string; version: number; template_key: string }>;
  if (globalList.length > 0) {
    if (useVariation && globalList.length > 1) {
      const keys = globalList.map((r) => r.template_key);
      const chosen = selectDeterministicVariant(threadId!, attemptNumber ?? 0, keys);
      const row = globalList.find((r) => r.template_key === chosen) ?? globalList[0];
      return { body: row.template_body, version: row.version, key: row.template_key };
    }
    const row = globalList[0];
    return { body: row.template_body, version: row.version, key: row.template_key };
  }
  return null;
}
