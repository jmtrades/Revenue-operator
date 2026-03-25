# Pricing and Stripe Setup

Production billing uses Stripe. Price mapping is via environment variables only.

## Required env vars (6 price vars + Stripe keys)

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe API (checkout, portal, webhook verification) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `STRIPE_PRICE_SOLO_MONTH` | Solo monthly price_id |
| `STRIPE_PRICE_SOLO_YEAR` | Solo annual price_id |
| `STRIPE_PRICE_GROWTH_MONTH` | Growth monthly price_id ($497) |
| `STRIPE_PRICE_GROWTH_YEAR` | Growth annual price_id ($4,970) |
| `STRIPE_PRICE_TEAM_MONTH` | Team monthly price_id |
| `STRIPE_PRICE_TEAM_YEAR` | Team annual price_id |

Enterprise has no Stripe checkout; contract only. Do not set `STRIPE_PRICE_ENTERPRISE_*` for checkout.

## Products and prices in Stripe

1. Create Products: Solo, Growth, Team (no Product for Enterprise checkout).
2. For each product create two recurring Prices: one monthly, one annual.
3. Copy each price ID (e.g. `price_xxx`) into the corresponding env var.
4. Webhook: point Stripe webhook to `https://your-domain.com/api/billing/webhook`, events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*` as needed.

## Contract behavior

- **Trial start** (`POST /api/trial/start`): `{ ok, checkout_url? | reason }`. Reasons: `invalid_json`, `invalid_email`, `missing_env`, `missing_price_id`, `workspace_creation_failed`, `checkout_creation_failed`, `wrong_price_mode`, `stripe_unreachable`, `already_active`.
- **Checkout** (`POST /api/billing/checkout`): Same contract; uses `effectiveOrigin(req)` for success/cancel URLs (never localhost in production).
- **Webhook**: Raw body `req.text()`; signature verified; 200 on duplicate (23505); no stack traces.

See `src/lib/stripe-prices.ts` for tier/interval → price_id resolution.
