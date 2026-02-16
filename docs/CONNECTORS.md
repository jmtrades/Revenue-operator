# Connectors (signals only)

Connector adapters emit canonical signals into the pipeline. External systems are signal sources only; no business logic inside integrations.

## Webhook Inbox

Append-only event intake. A cron job maps inbox events to canonical signals.

### POST inbox events

**Endpoint:** `POST /api/connectors/webhook-inbox`

**Body:**

```json
{
  "workspace_id": "<uuid>",
  "kind": "<kind>",
  "data": { ... },
  "occurred_at": "<ISO8601>"
}
```

- `workspace_id` – Must exist in `workspaces`.
- `kind` – One of: `email.inbound`, `email.outbound`, `calendar.event_created`, `calendar.no_show_signal`.
- `data` – Payload for the mapper (e.g. `body`, `content`, `lead_id`, `conversation_id` as needed).
- `occurred_at` – When the event occurred (ISO8601).

Events are stored in `connector_inbox_events`. No response body beyond success/error.

### Cron: process inbox

**Endpoint:** `GET /api/cron/connector-inbox`

**Schedule:** Every 5 minutes (e.g. `*/5 * * * *`).

Requires `Authorization: Bearer <CRON_SECRET>`.

Processes unprocessed inbox events by `occurred_at` window, maps by `kind`:

- `email.inbound` → InboundMessageDiscovered
- `email.outbound` → BusinessMessageSent (OutboundMessageSent)
- `calendar.event_created` → BookingCreated (if lead mapping exists) or recordObservedRiskEvent
- `calendar.no_show_signal` → AppointmentMissed

Processed events are marked in `connector_inbox_event_state` (append-only inbox preserved).

## Interfaces

Connector interfaces live in `src/lib/connectors/install-pack/interfaces.ts`:

- **EmailConnector** – `listRecentThreads`, `listInboundMessages(since)`, `listOutboundMessages(since)`
- **CalendarConnector** – `listEvents(since)`, `listAttendanceSignals(since)`
- **MessagingConnector** – `listInboundMessages(since)`, `listOutboundMessages(since)`
- **WebhookConnector** – `acceptEvent(payload)`

Registry: `registerConnector(kind, impl)`, `getConnector(kind)`, `hasConnector(kind)`. All connectors return raw events; mapping into canonical signals is done in the signal consumer layer.
