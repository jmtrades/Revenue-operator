# Marketing Pages — Doctrine Scope

Marketing pages live outside the dashboard and are treated differently for doctrine enforcement.

## In scope

- **Factual copy only.** No persuasion language; no "you should", "boost", "optimize", or sales coaching.
- **No internal IDs** in responses or URLs shown to users.
- **Pricing** (/pricing): tiers and "Contact enterprise" CTA are factual.
- **Example** (/example): redirects to a demo public record (DEMO_EXTERNAL_REF); same doctrine-safe public work API.

## Excluded from doctrine tests

- **Forbidden-language scan** (ui-doctrine-forbidden-language.test.ts) does **not** run on:
  - `src/app/pricing/`
  - `src/app/example/`
  - `src/app/onboard/` (onboarding uses fixed product copy, e.g. first-record message "what we agreed", which is factual and mandated)
- Marketing pages may use factual phrases (e.g. "contact us", "enterprise") that would otherwise flag. They remain factual and short; exclusions are documented so the test scope stays "dashboard/components" only.

## Contract tests

- `__tests__/marketing-routes.test.ts` asserts: pricing has tiers and Contact enterprise CTA; example uses DEMO_EXTERNAL_REF and redirects to public work; no internal IDs in pricing page.
