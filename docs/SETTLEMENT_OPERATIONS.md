# Settlement layer – operations

Operational notes for the settlement layer. No pricing UI; consent required (Stripe Checkout).

## Required environment variables

- `STRIPE_SECRET_KEY` – Stripe API key for Checkout and usage records.
- `STRIPE_WEBHOOK_SECRET` – Webhook signature verification. Required in production.
- `STRIPE_DEFAULT_PRICE_ID` – Metered price ID used for settlement subscription.
- `APP_URL` – Base URL for settlement and success/cancel redirects.
- `CRON_SECRET` – Auth for cron routes (existing).
- `RESEND_API_KEY` / `EMAIL_FROM` – Optional; used for settlement authorization email when no conversation exists.

If Stripe vars are missing, settlement open route returns `ok: false`; authorization cron still issues intents and can deliver the link (e.g. by email).

## Recommended cron schedules

| Route | Schedule | Purpose |
|-------|----------|---------|
| `GET /api/cron/settlement-authorization` | Every 6 hours | Issue intents and send one authorization message per workspace (deduped 7 days). |
| `GET /api/cron/settlement-export` | Hourly | Export usage to Stripe for active settlements; max 50 workspaces, 7 periods per workspace, 20s deadline. |
| `GET /api/cron/economic-activation` | Every 30 min | Recompute economic_active, ensure activation, run usage metering (existing). |
| `GET /api/cron/economic-value` | Per existing schedule | Aggregate economic_events into ledger (existing). |
| `GET /api/cron/economic-usage-backfill` | Daily 02:00 UTC | Backfill economic_usage_meter for last 7 days for activated workspaces. |

## Unconfigured reminder

When settlement is ready (authorization possible), not active, and there have been at least two relief events in the last 48 hours, the settlement-authorization cron may send once per 3 days: "Settlement remains unconfigured." Throttle is stored in `settlement_nudges.last_unconfigured_sent_at`. No link is added if an intent link was already sent; the reminder is a statement only.

## Operational safety

- **Consent** – Charges only after explicit Stripe Checkout; no auto-charge.
- **Idempotency** – Stripe usage records use idempotency key `usage:{workspaceId}:{periodStart}:{periodEnd}`. Export cron uses lease table to avoid concurrent export for the same workspace.
- **Lease** – `settlement_export_leases` with 10-minute TTL; only one runner exports a workspace at a time.
- **Webhook dedupe** – Insert into `webhook_events` first; on conflict (event_id) return 200 without processing.
- **Suspension** – After 3 consecutive export failures (in 7-day window), settlement state set to suspended; `suspension_entry_created_at` set once per suspension. Responsibility surface shows `settlement_state.suspended`.
- **Resume** – When subscription becomes active again (e.g. invoice.paid) and/or next export succeeds, state returns to active.

## Backfill

- **Settlement accounts:** Run once: `npx tsx scripts/backfill-settlement-accounts.ts`. Ensures `settlement_accounts` for all workspaces with `economic_activation`. No Stripe calls.
