# Continuity Infrastructure — Quickstart

Three steps only. No extra UI.

## 1. Set environment variables

Required: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `WEBHOOK_SECRET` (or `WEBHOOK_SIGNING_SECRET`), `CRON_SECRET`.

Optional for outbound: Twilio, Resend.

## 2. Point inbound webhook to webhook inbox

Send inbound events to:

```
POST /api/connectors/webhook-inbox
Content-Type: application/json

{
  "workspace_id": "<uuid>",
  "kind": "inbound_message",
  "data": { ... },
  "occurred_at": "<iso8601>"
}
```

Workspace must exist. Events are appended and processed by cron.

## 3. Turn on crons

From the deployment doc, enable at least:

- `GET /api/cron/process-queue` — every 1 min
- `GET /api/cron/no-reply` — daily
- `GET /api/cron/calendar-ended` — every 5 min
- `GET /api/cron/proof-capsules` — daily

Header: `Authorization: Bearer <CRON_SECRET>`.

---

Optional: `POST /api/install/quickstart` with body `{ "workspace_id": "<uuid>" }` to ensure workspace installation state and connectors baseline. Returns `{ ok: true }` only.
