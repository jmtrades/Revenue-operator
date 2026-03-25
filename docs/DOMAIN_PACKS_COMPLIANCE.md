# Domain Packs and Compliance

Domain packs provide domain type, jurisdiction, and optional policy/template overrides per workspace. Speech governance uses them to select templates and policies.

## Resolver

- **`resolveDomainContext(workspaceId)`**: Returns `{ domain_type, jurisdiction }`.
  - Reads `domain_packs` for the workspace first; if present, uses `domain_type` and `config_json.default_jurisdiction` (default `UK`).
  - Else reads `settings.business_type` and maps to domain (e.g. `real_estate` → `real_estate`, else `general`). Jurisdiction defaults to `UK`.
- **`resolvePackPolicy(workspaceId, domain, jurisdiction, channel)`**: Returns approved speech policies for that scope (workspace + global), used by the governance compiler.

## Domain pack config (extensible)

`domain_packs.config_json` can include:

- `default_domain_type`, `default_jurisdiction`
- `allowed_intents_by_channel`, `clause_plan_overrides`, `required_disclosures_map`
- `banned_phrases`, `review_required_intents`, `slot_schema` per intent

The speech governance layer uses `domain_type` and `jurisdiction` from the resolver to select templates and policies; additional keys can drive future compliance features.

## Real estate pack (example)

A default global pack is seeded for:

- **Domain**: `real_estate`
- **Jurisdictions**: `UK`, `US-CA`, `US-NY` (minimal differences)
- **Templates**: e.g. inquiry intake, viewing scheduling, reschedule, info request, offer received, document request
- **Policies**: Generic banned discrimination terms, required disclosure when discussing affordability/finance, review_required for screening outcomes and legal terms

Seed script: `scripts/seed-domain-packs.ts` (idempotent). Run after migrations so global templates and policies exist with status `approved`. Passthrough templates for `general`/`UK` (sms/email) allow existing flows to pass through governance without changing content.
