# Revenue Operator

Production-grade autonomous revenue infrastructure. Deterministic workflow engine with AI for perception and phrasing only.

## Principles

- **Rules decide behaviour** – AI interprets and phrases; state transitions are rule-based
- **No manual approval** – safe fallbacks always; never block
- **Template-slot messaging** – no freeform risk
- **Workspace isolation** – all queries scoped by workspace_id

## Quick Start

```bash
cp .env.example .env.local
# Fill required environment variables:
# - NEXT_PUBLIC_APP_URL=https://recall-touch.com (application URL)
# - NEXT_PUBLIC_SUPABASE_URL (Supabase project URL)
# - NEXT_PUBLIC_SUPABASE_ANON_KEY (Supabase anon key)
# - SUPABASE_SERVICE_ROLE_KEY (Supabase service role key)
# - OPENAI_API_KEY (OpenAI API key)

npm install
npm run build
npm run dev
```

## Security

- **Webhook signature** – HMAC-SHA256 with `x-webhook-signature` + `x-webhook-timestamp` (5min tolerance)
- **Replay protection** – dedupe_key + `replay_defense` table; cryptographic nonce per (workspace, signature, timestamp); duplicate rejected (409)
- **Rate limiting** – inbound (100/min per workspace+IP); stage-based outbound limits
- **Protected cron** – `Authorization: Bearer <CRON_SECRET>`
- **Opt-out** – triple enforcement (decision, execution, call engine); compliance confirmation only; no retries
- **Redaction** – secrets never logged

## API

### Webhook

```
POST /api/webhooks/inbound
Content-Type: application/json
X-Webhook-Signature: <hmac-sha256-hex>  # when using signature auth
X-Webhook-Timestamp: <ms>               # for replay tolerance
# OR X-Webhook-Secret: <secret>         # legacy

{
  "workspace_id": "uuid",
  "channel": "email",
  "external_lead_id": "lead-123",
  "message": "...",
  "email": "...", "name": "...", "company": "..."
}
```

Returns `200` immediately. Idempotent via dedupe_key. Replay rejected with `409`.

### Billing Dispute

```
POST /api/billing/dispute
Content-Type: application/json

{ "invoice_item_id": "uuid" }
```

Disputes an invoice line within the 7-day window. Sets status to `disputed`.

### Cron

- `GET /api/cron/process-queue` – process one job (runs alert checks and may auto-pause)
- `GET /api/cron/no-reply` – ghost recovery
- `GET /api/cron/billing` – attribution billing

### Admin

- `GET /api/admin/dlq` – list failed jobs
- `POST /api/admin/dlq` – re-drive job `{ "job_id": "..." }`

### Health

`GET /api/health`

## AI Contract

All model outputs are strict JSON: `intent`, `entities`, `sentiment`, `confidence`, `recommended_action`, `slot_values`. Invalid output → retry once → fallback.

## Autopilot

- Business hours
- VIP exclusion
- Forbidden phrase filter
- **Stage-based limits** – NEW/CONTACTED: 2/day; ENGAGED/QUALIFIED: 4/day; LOST/REACTIVATE: 1/day
- **Cooldown ladder** – 5min → 2h → 18h → 48h between attempts
- **Workspace warm-up** – Day 0–1: 20/day; Day 2–3: 50/day; Day 4–7: 150/day; Day 8+: unlimited
- **Channel capabilities** – `can_send`, `can_receive`, `can_call`; auto-switch to fallback when unsupported

## Tests

```bash
npm run test
```

- State transitions
- Idempotency (dedupe_key)
- Replay nonce rejection
- Stage-based limits and cooldown ladder
- Opt-out enforcement
- Channel fallback
- Warm-up caps
- Call consent and escalation triggers
- Dispute flow

## Migration (Final Hardening)

Apply migrations in order. The `revenue_operator_final_hardening_v2` migration adds:

- `replay_defense(workspace_id, signature, timestamp_ms)` – UNIQUE constraint
- `channel_capabilities` – default rows for email, sms, whatsapp, web
- `outbound_messages.attempt_count`
- `invoice_items` – evidence_chain, dispute_until, status
- `workspaces.status`, `workspaces.paused_at`, `workspaces.pause_reason`

Supabase: run migrations via Dashboard SQL or `supabase db push`.

## Production Checklist

- [ ] `NEXT_PUBLIC_APP_URL` set to `https://recall-touch.com` (application URL)
- [ ] `revenue_operator` schema exposed in Supabase
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `OPENAI_API_KEY` set
- [ ] `WEBHOOK_SECRET` set (signature or legacy secret)
- [ ] `CRON_SECRET` set for cron + admin DLQ
- [ ] Cron: `process-queue` every 1 min, `no-reply` daily, `billing` monthly
- [ ] Rate limit at edge if needed beyond built-in
- [ ] Rotate keys if exposed
