# Revenue Operator

Production-grade autonomous revenue infrastructure. A dependable operational decision layer businesses trust more than staff. The system is deterministic, safe, explainable, and financially accountable.

## Operational Philosophy

This platform is the decision layer between customer intent and business action.

**CRITICAL RULE: AI never decides actions directly.**

All actions pass through:

1. **State Machine** – Lead lifecycle: NEW → CONTACTED → ENGAGED → QUALIFIED → BOOKED → SHOWED → WON / LOST / REACTIVATE
2. **Policy Engine** – Controls allowed actions, safety, timing, compliance
3. **Reasoning Engine** – LLM produces structured JSON only: intent, confidence, entities, risk_flags, recommended_action, explanation
4. **Language Layer** – Templates generate final human-safe messages. No raw AI text may be sent to customers.

## Principles

- **Rules decide behaviour** – AI interprets and phrases; state transitions are rule-based
- **No manual approval** – safe fallbacks always; never block
- **Template-slot messaging** – no freeform risk
- **Workspace isolation** – all queries scoped by workspace_id

## Quick Start

```bash
cp .env.example .env.local
# Fill Supabase + OpenAI keys

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
- `GET /api/cron/learning` – learning job (qualification thresholds, timing intervals, prediction weights)
- `GET /api/cron/renewal-reminder` – 24h before renewal: sends reminder email (run hourly)

### Dashboard APIs

- `GET /api/overview?workspace_id=` – what happened, why, what next
- `GET /api/conversations?workspace_id=` – conversation list
- `GET /api/pipeline?workspace_id=` – leads by state with deals
- `GET /api/calls?workspace_id=` – call sessions
- `GET /api/leads/[id]/proof` – evidence chain
- `GET /api/leads/[id]/forensics` – post-loss explanation
- `GET /api/leads/[id]/follow-up` – follow-up recommendation
- `GET /api/leads/[id]/closer-packet` – pre-call brief
- `GET /api/leads/[id]/next-action` – next best action
- `GET /api/deals/[id]/prediction` – close probability
- `GET /api/reports/weekly?workspace_id=` – weekly performance report

### Zoom (Call-Aware Operator)

- Connect Zoom via OAuth: `/api/integrations/zoom/connect` (redirects to Zoom)
- Callback: `/api/integrations/zoom/callback`
- Webhook: `POST /api/webhooks/zoom` (meeting.ended, recording.completed, transcript.completed)

**How to connect Zoom**: Go to Dashboard → Activation, click “Connect Zoom”, authorize the app. Tokens are encrypted at rest (`ENCRYPTION_KEY`). For getting `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ENCRYPTION_KEY`, and `BASE_URL`, see **[docs/ZOOM_SETUP.md](docs/ZOOM_SETUP.md)**.

**Cloud recording + transcripts**: Enable cloud recording in Zoom account settings. Turn on “Audio transcript” in Recording settings. We ingest transcript files when available.

**Consent modes** (workspace setting):
- **strict**: Store transcript only if explicit consent phrase detected
- **soft**: Store if Zoom indicates recording consent + user toggled (default)
- **off**: Store summary only; no transcript or quotes

**Post-call follow-up**: After a call ends, we analyze the transcript, update lead state (e.g. SHOWED), and schedule follow-ups (recap, proof, booking) respecting policy and cooldowns. Never contradict the closer, negotiate price, or promise guarantees.

### Delivery (Twilio)

`POST /api/webhooks/twilio/status` – delivery receipt callback (MessageStatus=delivered)

### Admin

- `GET /api/admin/dlq` – list failed jobs (Bearer auth)
- `POST /api/admin/dlq` – re-drive job `{ "job_id": "..." }`

### Health

`GET /api/health`

## AI Contract

All model outputs are strict JSON: `intent`, `entities`, `sentiment`, `confidence`, `recommended_action`, `slot_values`. Invalid output → retry once → fallback.

## Operational Infrastructure

**Burst drain**: After webhook ingest, processes up to 10 jobs within 7s. Cron is fallback only.

**Job locking**: DB-backed queue uses `locked_by` to prevent double execution. Idempotent completion via `completion_id`.

**Delivery layer**: SMS-first (Twilio). Status: queued → sent → delivered/failed. Retry with backoff, channel fallback. No silent failures.

**Reactivation**: Multi-horizon (1d, 3d, 7d, 14d, 30d, 90d). Angles rotate: value → clarification → proof → urgency → closure.

**Tiered booking**: p < 0.25 clarify+nurture; 0.25–0.55 triage call; p ≥ 0.55 direct booking.

**Safe responses**: Micro-scripts for pricing, refund, anger, legal/medical, negotiation.

**Next best action**: ask_clarification, send_proof, reframe_value, book_call, schedule_followup, reactivate_later, escalate_human.

**Closer packet**: Pre-call brief (lead context, pain, urgency, objections, strategy, suggested questions).

**Team mode**: Roles owner/manager/closer. Hot leads (p ≥ 0.6) → closer; others → operator.

**Observability**: Tracks delivery failures, opt-out, DLQ growth, reply rate collapse. Auto-pause workspace on anomaly.

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

- [ ] `revenue_operator` schema exposed in Supabase (Project Settings → API → Exposed schemas)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `OPENAI_API_KEY` set
- [ ] `WEBHOOK_SECRET` set (signature or legacy secret)
- [ ] `CRON_SECRET` set for cron + admin DLQ
- [ ] Cron: `process-queue` every 1 min, `no-reply` daily, `billing` monthly, `learning` daily
- [ ] Rate limit at edge if needed beyond built-in
- [ ] Rotate keys if exposed

## Commands

**Local development:**
```bash
cp .env.example .env.local   # fill keys
npm install
npm run dev
```

**Production build:**
```bash
npm run build
npm run start
```

**Deploy (Vercel example):**
```bash
vercel --prod
```
Set env vars in Vercel dashboard. Configure cron: `process-queue` (1 min), `no-reply` (daily), `billing` (monthly), `learning` (daily).
