# Production Deployment

## Environment variables

### Required

- `DATABASE_URL` – Postgres connection string (e.g. Supabase direct connection).
- `SUPABASE_SERVICE_ROLE_KEY` – Service role key for server-side Supabase client.
- `APP_URL` – Base URL of the application (e.g. `https://app.example.com`).
- `CRON_SECRET` – Secret for cron authentication. All cron requests must send `Authorization: Bearer <CRON_SECRET>`.

### Optional (Stripe / settlement)

If settlement or Stripe billing is used:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_DEFAULT_PRICE_ID`

Missing keys are logged once at runtime; settlement features will not work without them.

### Optional (email)

- `RESEND_API_KEY`
- `EMAIL_FROM`

---

## Cron schedules

Configure your scheduler (e.g. cron, Vercel Cron, GitHub Actions) to call the following endpoints with `Authorization: Bearer <CRON_SECRET>`.

**Recommended for new installs (single bundled cron):**

| Schedule        | Route |
|----------------|-------|
| `*/2 * * * *`  | `/api/cron/core` |
| `0 * * * *`    | `/api/cron/assurance-delivery` |

**Optional: guarantees bundle** (progress-watchdog, integrity-audit, closure, handoff-notifications, no-reply in one call):

| Schedule        | Route |
|----------------|-------|
| `*/10 * * * *` | `/api/cron/guarantees` |

**Optional advanced (individual crons):**

| Schedule        | Route |
|----------------|-------|
| `* * * * *`    | `/api/cron/commitment-recovery` |
| `*/5 * * * *`  | `/api/cron/opportunity-recovery` |
| `*/5 * * * *`  | `/api/cron/connector-inbox` |
| `*/10 * * * *` | `/api/cron/exposure-engine` |
| `*/10 * * * *` | `/api/cron/operability-anchor` |
| `*/10 * * * *` | `/api/cron/payment-completion` |
| `*/10 * * * *` | `/api/cron/shared-transaction-recovery` |
| `*/30 * * * *` | `/api/cron/assumption-engine` |
| `*/30 * * * *` | `/api/cron/normalization-engine` |
| `*/30 * * * *` | `/api/cron/protocol-density` |
| `*/30 * * * *` | `/api/cron/economic-activation` |
| `0 * * * *`    | `/api/cron/assurance-delivery` |
| `0 * * * *`    | `/api/cron/settlement-export` |
| `0 */6 * * *`  | `/api/cron/settlement-authorization` |
| `0 2 * * *`    | `/api/cron/economic-usage-backfill` |
| `0 1 * * *`    | `/api/cron/proof-capsules` (daily; builds yesterday’s proof capsule per workspace) |
| `0 */6 * * *`  | `/api/cron/temporal-stability` (runs detectors per workspace; ≥3 threads, ≥2 UTC days) |
| (per env)      | `/api/cron/orientation-absence` (business hours; e.g. every 15 min during hours) |

**Optional: core drift detection** (doctrine-safe; records incident when required system action did not occur; deduped once per workspace per UTC day):

| Schedule        | Route |
|----------------|-------|
| `0 */6 * * *`  | `/api/cron/core-drift` |

All cron routes require valid `Authorization: Bearer <CRON_SECRET>`. No cron may run without auth.

**Quickstart:** Point inbound events to `POST /api/connectors/webhook-inbox` (see [QUICKSTART.md](QUICKSTART.md)). Optional: `POST /api/install/quickstart` with body `{ "workspace_id": "<uuid>" }` to ensure workspace installation state and connectors baseline; returns `{ ok: true }` only.

---

## Webhook setup

### Stripe

1. In Stripe Dashboard: Developers → Webhooks → Add endpoint.
2. URL: `https://<APP_URL>/api/billing/webhook`.
3. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.created`, `invoice.paid`, `invoice.payment_failed`.
4. Set `STRIPE_WEBHOOK_SECRET` to the signing secret from the dashboard.
5. On handler failure the app logs to `system_webhook_failures` and returns 200 to avoid retry storms.

---

## Health and verification

- **Health probe:** `GET /api/health` returns JSON:
  - `database`: `"ok"` or `"fail"`
  - `stripe`: `"ok"` or `"missing"`
  - `last_cron_execution`: `{ commitment_recovery, settlement_export }` (timestamps or null)
  - `system_ready`: `true` only when database is ok.

- **First installation:** Run `npx tsx scripts/create-demo-workspace.ts` (with env loaded). Then call `GET /api/responsibility?workspace_id=<DEMO_WORKSPACE_ID>` and confirm `installation_state` and other fields. Optional: set `DEMO_WORKSPACE_ID` and `DEMO_OWNER_ID` for idempotent re-runs.

---

## Operational safety

- **Idempotency:** Cron handlers and webhook handlers are idempotent; replay produces the same DB state where specified.
- **Cron auth:** Every cron request must include `Authorization: Bearer <CRON_SECRET>`; otherwise the server returns 401.
- **Outbound rate guard:** Max 20 automated sends per workspace per 10 minutes; over limit triggers escalation and `outbound_throttled` protocol event, no send.
- **Webhook failures:** Stripe webhook errors are written to `system_webhook_failures` and the response is 200 to prevent retry storms.
