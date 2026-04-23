/**
 * Single source of truth for the full list of CRM providers Revenue Operator
 * supports at the code level. Phase 78 Task 9.3 fix for P0-26:
 *
 * Before this module, the set of "supported CRM providers" was scattered:
 *   - `src/lib/integrations/field-mapper.ts` had the canonical 17-value
 *     `CrmProviderId` union type.
 *   - `src/app/api/integrations/crm/status/route.ts` declared its own
 *     8-value `CRM_PROVIDERS as const` AND exported a shadow
 *     `CrmProviderId` type that the UI imported.
 *   - `src/lib/integrations/sync-engine.ts`, the mapping route, the
 *     sync-log page, the batch-sync route, and the webhooks route all
 *     declared their own hardcoded arrays.
 *   - Some of those arrays were length 7, some length 8. None were
 *     length 17. The UI silently dropped 9 providers on the floor.
 *
 * Consolidation rules:
 *   - Every UI/API surface that needs "which CRMs does RO support" imports
 *     `SUPPORTED_CRM_PROVIDERS` from this module.
 *   - Semantically distinct subsets (OAuth-capable providers for /connect,
 *     webhook-capable providers for /webhooks) are allowed to declare
 *     their own arrays, but those arrays MUST be subsets of
 *     `SUPPORTED_CRM_PROVIDERS` and MUST import the base type from here.
 *   - `CrmProviderId` is derived from this array via `typeof ... [number]`
 *     so the type and the runtime list cannot drift.
 */

export const SUPPORTED_CRM_PROVIDERS = [
  "salesforce",
  "hubspot",
  "zoho_crm",
  "pipedrive",
  "gohighlevel",
  "google_contacts",
  "microsoft_365",
  "airtable",
  // Phase 8 — coverage expansion. Each of these is a top-15 sales CRM by
  // deployed seat count in North America + EMEA.
  "close",
  "follow_up_boss",
  "active_campaign",
  "copper",
  "monday_crm",
  "freshsales",
  "attio",
  "keap",
  // Google Sheets is a common "poor man's CRM" — we treat it as a first-class
  // destination so operators who live in a spreadsheet don't have to leave it.
  "google_sheets",
] as const;

export type CrmProviderId = (typeof SUPPORTED_CRM_PROVIDERS)[number];

/** Runtime type guard — true iff `value` is one of the supported provider ids. */
export function isSupportedCrmProvider(value: unknown): value is CrmProviderId {
  return (
    typeof value === "string" &&
    (SUPPORTED_CRM_PROVIDERS as readonly string[]).includes(value)
  );
}
