# Vercel Environment Variables — recall-touch.com

Production deployment requires these variables. Missing required vars must cause validation failure in production.

## Domain

- **BASE_URL** = `https://recall-touch.com` (used by cron self-calls, links, prod gate)
- **NEXT_PUBLIC_APP_URL** = `https://recall-touch.com`

## Core (required)

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Cron route auth: `Authorization: Bearer <CRON_SECRET>` |
| `PUBLIC_VIEW_SALT` | Salt for public record view fingerprint hashing |
| `FOUNDER_EXPORT_KEY` | Auth for `GET /api/internal/founder/export` (header `X-Founder-Key` or `Authorization: Bearer`) |
| `SESSION_SECRET` or `ENCRYPTION_KEY` | Session cookie signing (at least one required) |

## Supabase (required)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (client + server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB (founder export, cron, migrations) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY` | Client-side DB (RLS applies) |

## Stripe (required for billing)

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification; endpoint `https://recall-touch.com/api/billing/webhook` |
| `STRIPE_SOLO_MONTHLY` | Price ID Solo monthly |
| `STRIPE_SOLO_YEARLY` | Price ID Solo annual |
| `STRIPE_GROWTH_MONTHLY` | Price ID Growth monthly |
| `STRIPE_GROWTH_YEARLY` | Price ID Growth annual |
| `STRIPE_TEAM_MONTHLY` | Price ID Team monthly |
| `STRIPE_TEAM_YEARLY` | Price ID Team annual |

Legacy single price: `STRIPE_PRICE_ID` or `STRIPE_DEFAULT_PRICE_ID` may be used if tier-specific IDs not set.

## Optional

| Variable | Purpose |
|----------|---------|
| `EMAIL_SENDER_ADDRESS` or `EMAIL_FROM` | Sender for transactional email |
| `TWILIO_*`, `RESEND_*`, `ZOOM_*` | Per-feature; see conditional vars in verify-prod-config |

## Cron

- **Schedule:** Every 2 minutes.
- **URL:** `GET https://recall-touch.com/api/cron/core`
- **Header:** `Authorization: Bearer <CRON_SECRET>`

## Webhook

- **Stripe:** `https://recall-touch.com/api/billing/webhook`
- **Events:** `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`

## Security

- Never log or expose `CRON_SECRET`, `FOUNDER_EXPORT_KEY`, `PUBLIC_VIEW_SALT`, or Stripe keys.
- All API responses are doctrine-safe: no stack traces, no internal IDs in client payloads.
- Founder export uses strict allowlist; no Stripe IDs, tokens, or secrets in response.

## Verification

- **Pre-deploy:** `npm run verify:env` (or `verify-prod-config`) checks required vars.
- **Post-deploy:** `BASE_URL=https://recall-touch.com npm run prod:gate` validates live app.
