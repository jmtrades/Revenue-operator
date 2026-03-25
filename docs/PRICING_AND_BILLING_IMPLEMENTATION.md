# Pricing, Enterprise Layer, Global Execution — Implementation Summary

## Files created

| Path | Purpose |
|------|--------|
| `supabase/migrations/billing_interval_and_tier_sync.sql` | Add `billing_interval` (month \| year) to workspaces |
| `src/lib/stripe-prices.ts` | Tier + interval → price_id resolution; priceIdToTierAndInterval for webhook |
| `src/app/api/dashboard/billing/route.ts` | GET billing status (plan_name, interval, status, renews_at, can_manage) |
| `src/app/api/billing/portal/route.ts` | POST create Stripe Customer Portal session for "Manage billing" |
| `src/app/dashboard/billing/page.tsx` | Billing status page: plan, interval, status, renewal date, Manage billing link |
| `__tests__/stripe-prices-and-billing.test.ts` | Tier mapping, price resolution, priceIdToTierAndInterval, feature copy, pricing contract |
| `docs/PRICING_AND_BILLING_IMPLEMENTATION.md` | This summary |

## Files modified

| Path | Changes |
|------|--------|
| `src/app/pricing/page.tsx` | Repositioned: Solo $297, Growth $897, Team $2,400, Enterprise contract; annual note (no %); export ANNUAL_NOTE and pricingCopyForTests |
| `src/app/api/billing/checkout/route.ts` | Body: tier, interval (default solo, month); use getPriceId; return invalid_tier, invalid_interval, missing_price_id, wrong_price_mode, stripe_unreachable |
| `src/app/api/trial/start/route.ts` | Body: tier, interval; use getPriceId; same error reasons |
| `src/app/api/billing/webhook/route.ts` | On checkout.session.completed and customer.subscription.updated: read first subscription item price_id, priceIdToTierAndInterval, persist billing_tier + billing_interval |
| `src/app/dashboard/layout.tsx` | ALLOWED_DASHBOARD_PATHS + /dashboard/billing; NAV + Billing |
| `src/lib/feature-gate/types.ts` | Team: dual_approval true |
| `src/lib/billing-copy.ts` | FEATURE_UNAVAILABLE_MESSAGE = "Not available for current plan." |
| `.env.example` | STRIPE_PRICE_SOLO_MONTH/YEAR, GROWTH_MONTH/YEAR, TEAM_MONTH/YEAR (replacing single STRIPE_PRICE_ID) |
| `__tests__/checkout-route.test.ts` | Tier/interval in body; STRIPE_PRICE_SOLO_MONTH; invalid_tier test |
| `__tests__/trial-start.test.ts` | STRIPE_PRICE_SOLO_MONTH in beforeEach |
| `__tests__/billing-integration.test.ts` | All checkout/trial use STRIPE_PRICE_SOLO_MONTH and tier/interval; missing_price_id test |
| `__tests__/marketing-routes.test.ts` | Expect Solo, Growth, Team, Enterprise, "Request Enterprise Discussion" |
| `__tests__/surfaces-contract.test.ts` | Nav href count: at least 5 |
| `__tests__/ui-doctrine-forbidden-language.test.ts` | Exclude strings containing window.location / location.origin from user-facing check |

## New env vars

| Variable | Purpose |
|----------|---------|
| `STRIPE_PRICE_SOLO_MONTH` | Stripe price ID for Solo monthly |
| `STRIPE_PRICE_SOLO_YEAR` | Stripe price ID for Solo annual |
| `STRIPE_PRICE_GROWTH_MONTH` | Stripe price ID for Growth monthly |
| `STRIPE_PRICE_GROWTH_YEAR` | Stripe price ID for Growth annual |
| `STRIPE_PRICE_TEAM_MONTH` | Stripe price ID for Team monthly |
| `STRIPE_PRICE_TEAM_YEAR` | Stripe price ID for Team annual |

Enterprise is contract-only; no public Stripe price. Legacy `STRIPE_PRICE_ID` is no longer used.

## Migration order

1. `billing_interval_and_tier_sync.sql` — run after existing workspace/billing migrations (e.g. `billing_tier_feature_gate.sql`, `billing_trial_fields.sql`).

## Test coverage added

- **Stripe price resolution**: resolvePriceId (invalid tier/interval, missing/placeholder env), getPriceId (invalid_tier, invalid_interval, missing_price_id), priceIdToTierAndInterval (null, match, unknown).
- **Feature gating**: FEATURE_UNAVAILABLE_MESSAGE text; Team tier has dual_approval.
- **Pricing page**: Annual text has no percentage; no forbidden positioning words in pricing copy.
- **Checkout**: invalid_tier (enterprise), missing_price_id when env missing.
- **Billing integration**: All checkout and trial tests use tier/interval and STRIPE_PRICE_SOLO_MONTH; missing_price_id when price env missing.

## Stripe setup checklist

1. **Products and prices (Stripe Dashboard)**  
   Create products/prices for:
   - Solo monthly, Solo annual  
   - Growth monthly, Growth annual  
   - Team monthly, Team annual  

2. **Env**  
   Set `STRIPE_PRICE_SOLO_MONTH`, `STRIPE_PRICE_SOLO_YEAR`, `STRIPE_PRICE_GROWTH_MONTH`, `STRIPE_PRICE_GROWTH_YEAR`, `STRIPE_PRICE_TEAM_MONTH`, `STRIPE_PRICE_TEAM_YEAR` to the corresponding Stripe price IDs.

3. **Customer Portal**  
   Enable and configure Stripe Billing Portal (Settings → Billing → Customer portal) so "Manage billing" works.

4. **Webhook**  
   No change to webhook URL or events; handler now also sets `billing_tier` and `billing_interval` from subscription item price_id. Unknown price_id is ignored (no crash).

5. **Idempotency**  
   Checkout and trial remain idempotent; webhook remains safe for replay.

## API contract

- **POST /api/billing/checkout**  
  Body: `email?`, `workspace_id?`, `tier?` (default `solo`), `interval?` (default `month`).  
  Returns: `ok`, `reason?`, `url`/`checkout_url?`, `session_id?`.  
  Reasons: `invalid_tier`, `invalid_interval`, `missing_price_id`, `wrong_price_mode`, `stripe_unreachable`, `missing_env`, `already_active`, etc.

- **POST /api/trial/start**  
  Body: `email`, `tier?`, `interval?`, `hired_roles?`, `business_type?`.  
  Same price resolution and reasons as checkout.

- **GET /api/dashboard/billing?workspace_id=**  
  Returns: `plan_name`, `interval`, `status`, `renews_at`, `can_manage`.

- **POST /api/billing/portal**  
  Body: `workspace_id`, `return_url?`.  
  Returns: `ok`, `url?` (Stripe Customer Portal session URL).

## Positioning

- Public pricing: operational scope (Solo, Growth, Team, Enterprise). No SaaS language. Annual: "two months at no charge" / continuity, no percentage.
- Feature gating: show "Not available for current plan." (no "Upgrade to unlock").
- Billing status page: plan, interval, status, renewal, Manage billing only. No upsell or comparison.
