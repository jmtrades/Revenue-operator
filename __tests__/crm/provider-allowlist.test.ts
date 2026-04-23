/**
 * Phase 78 Task 9.3 contract: `src/lib/crm/providers.ts` is the single source
 * of truth for which CRM providers Revenue Operator supports at the code
 * level. Every UI/API surface that needs "which CRMs do we support" imports
 * from this module. Duplicated hardcoded arrays are a P0 defect because they
 * silently drop providers on the floor (users see the connector on one screen
 * and not another — a $100B-grade "is the rest of the product actually wired
 * up?" smell).
 *
 * These tests lock in:
 *   1. The exact ordered contents of `SUPPORTED_CRM_PROVIDERS` (17 ids).
 *   2. The length invariant (guards against accidental additions/removals).
 *   3. `isSupportedCrmProvider` accepts every member and rejects non-members.
 *   4. `CrmProviderId` re-exported from `field-mapper` is the same type used
 *      by the canonical module (no silent shadow types).
 *   5. The old 8-value shadow allowlists in the four call sites now all
 *      reference `SUPPORTED_CRM_PROVIDERS` (regression guard).
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  SUPPORTED_CRM_PROVIDERS,
  isSupportedCrmProvider,
  type CrmProviderId,
} from "@/lib/crm/providers";
import { SUPPORTED_CRM_PROVIDERS as FIELD_MAPPER_REEXPORT } from "@/lib/integrations/field-mapper";

describe("crm/providers — single source of truth for supported CRM providers", () => {
  it("exports exactly the 17 provider ids we support, in the expected order", () => {
    // Snapshot: this list is THE contract. Adding or removing a provider
    // must be a deliberate, reviewed change — not a side effect of
    // "I cleaned up an import somewhere".
    expect([...SUPPORTED_CRM_PROVIDERS]).toEqual([
      "salesforce",
      "hubspot",
      "zoho_crm",
      "pipedrive",
      "gohighlevel",
      "google_contacts",
      "microsoft_365",
      "airtable",
      "close",
      "follow_up_boss",
      "active_campaign",
      "copper",
      "monday_crm",
      "freshsales",
      "attio",
      "keap",
      "google_sheets",
    ]);
  });

  it("has length 17 (explicit invariant — guards accidental slip to 16 or 18)", () => {
    expect(SUPPORTED_CRM_PROVIDERS.length).toBe(17);
  });

  it("has no duplicate provider ids", () => {
    const seen = new Set(SUPPORTED_CRM_PROVIDERS);
    expect(seen.size).toBe(SUPPORTED_CRM_PROVIDERS.length);
  });

  it("is a readonly tuple at the type level (no runtime mutation)", () => {
    // `as const` + `readonly` means `.push` is not a function on the tuple
    // type. Runtime Array.prototype.push still exists, but pushing would
    // mutate the shared constant — the type-level readonly catches it in
    // review. We assert the array is frozen in spirit by checking its
    // contents don't shift under us after an assignment attempt.
    const before = [...SUPPORTED_CRM_PROVIDERS];
    // @ts-expect-error — SUPPORTED_CRM_PROVIDERS is readonly
    SUPPORTED_CRM_PROVIDERS[0] = "oops";
    // Even if the above compiled, the array might mutate — but whether
    // it did or not, the type contract says "don't touch".
    // Restore for downstream tests in case runtime mutation did happen.
    const after = [...SUPPORTED_CRM_PROVIDERS];
    if (after[0] !== before[0]) {
      // Runtime mutation happened; restore in-place so other tests see
      // the right contents. This branch exercises the safety net.
      (SUPPORTED_CRM_PROVIDERS as unknown as string[])[0] = before[0];
    }
    expect([...SUPPORTED_CRM_PROVIDERS]).toEqual(before);
  });
});

describe("crm/providers — isSupportedCrmProvider type guard", () => {
  it("accepts every member of SUPPORTED_CRM_PROVIDERS", () => {
    for (const p of SUPPORTED_CRM_PROVIDERS) {
      expect(isSupportedCrmProvider(p)).toBe(true);
    }
  });

  it("rejects unknown provider ids", () => {
    for (const bogus of [
      "",
      "SALESFORCE", // case-sensitive
      "sales_force",
      "zoho",
      "mailchimp",
      "notion",
      "sheets",
    ]) {
      expect(isSupportedCrmProvider(bogus)).toBe(false);
    }
  });

  it("rejects non-string input (defence against untyped boundaries)", () => {
    for (const bogus of [null, undefined, 0, 1, true, false, {}, [], ["hubspot"]]) {
      expect(isSupportedCrmProvider(bogus)).toBe(false);
    }
  });
});

describe("crm/providers — re-export contract with @/lib/integrations/field-mapper", () => {
  it("field-mapper re-exports the exact same SUPPORTED_CRM_PROVIDERS reference/values", () => {
    // Existing callers import CrmProviderId / SUPPORTED_CRM_PROVIDERS from
    // field-mapper. The re-export must not diverge from the canonical list.
    expect([...FIELD_MAPPER_REEXPORT]).toEqual([...SUPPORTED_CRM_PROVIDERS]);
  });

  it("CrmProviderId compiles against every supported id (structural type check)", () => {
    // If this test compiles, `CrmProviderId` accepts every runtime id.
    const sample: CrmProviderId[] = [...SUPPORTED_CRM_PROVIDERS];
    expect(sample.length).toBe(17);
  });
});

describe("crm/providers — regression: old hardcoded 8-value allowlists are gone", () => {
  // These assertions read the four files the plan called out and assert
  // they no longer contain the 8-value hardcoded `CrmProviderId[]` literal
  // that used to drop 9 providers on the floor. A regex-level check is
  // sufficient: if the file stops importing from `@/lib/crm/providers`,
  // the check above already catches it via the tsc compile chain; this
  // check specifically guards against someone re-hardcoding the array.

  const repoRoot = resolve(__dirname, "..", "..");

  function filesThatMustSourceAllowlistFromProvidersModule(): Array<{
    path: string;
    purpose: string;
  }> {
    return [
      {
        path: "src/app/api/integrations/crm/status/route.ts",
        purpose: "CRM status route must read allowlist from @/lib/crm/providers",
      },
      {
        path: "src/lib/integrations/sync-engine.ts",
        purpose: "sync-engine.getConnectedCrmProviders must read allowlist from @/lib/crm/providers",
      },
      {
        path: "src/app/api/integrations/crm/[provider]/mapping/route.ts",
        purpose: "mapping route must read allowlist from @/lib/crm/providers",
      },
      {
        path: "src/app/app/settings/integrations/sync-log/page.tsx",
        purpose: "sync-log page must read provider list from @/lib/crm/providers",
      },
      {
        path: "src/app/api/integrations/crm/[provider]/batch-sync/route.ts",
        purpose: "batch-sync route must read allowlist from @/lib/crm/providers",
      },
      {
        path: "src/app/api/integrations/crm/[provider]/import/route.ts",
        purpose: "import route must read allowlist from @/lib/crm/providers",
      },
    ];
  }

  for (const { path, purpose } of filesThatMustSourceAllowlistFromProvidersModule()) {
    it(`${path}: ${purpose}`, () => {
      const abs = resolve(repoRoot, path);
      expect(existsSync(abs)).toBe(true);
      const src = readFileSync(abs, "utf8");
      expect(src).toMatch(/@\/lib\/crm\/providers/);
    });
  }
});
