# Action Intents — Universal Execution Interface

Revenue Operator **emits intents**. A **separate executor** performs actions (Stripe, Twilio, calendar, etc.). This repo does not make external API calls for execution.

## Separation

| In this repo | In the executor (external) |
|--------------|----------------------------|
| Deterministic emission at defined moments | Claim intents, call Stripe/Twilio/Calendar, complete with result |
| Append-only `action_intents` table | Poll or webhook to claim; POST complete with optional write_back |
| No external API calls | All outbound execution |
| Doctrine, settlement gating, determinism preserved | Uses intent payload only; no policy logic |

## Data model

- **action_intents**: `id`, `workspace_id`, `thread_id`, `work_unit_id`, `intent_type`, `payload_json`, `dedupe_key` (unique), `created_at`, `claimed_at`, `claimed_by`, `completed_at`, `result_status` (succeeded|failed|skipped), `result_ref`.
- Indexes: `(workspace_id, created_at DESC)`, unclaimed by created: `(workspace_id, created_at ASC) WHERE claimed_at IS NULL`.

## Intent types (doctrine-safe, deterministic)

1. **send_public_record_link** — When a shared transaction is created with state `pending_acknowledgement`. Payload: `thread_id`, `external_ref`, `subject_type`, `subject_id`.
2. **request_counterparty_action** — When a pending responsibility exists (after `createResponsibilityForEvent`). Payload: `thread_id`, `required_action`, `assigned_role`.
3. **create_followup_commitment** — When `schedule_follow_up` is recorded. Payload: `thread_id`, `event_id`.

Dedupe keys prevent duplicate intents (e.g. `st:{threadId}:send_public_record_link`).

## API (executor integration)

- **GET /api/operational/action-intents?workspace_id=...**  
  Returns unclaimed intents (max 50). Requires workspace access. Response: `{ intents: [{ id, intent_type, payload_json, created_at, thread_id, work_unit_id }] }`.

- **POST /api/operational/action-intents/claim**  
  Body: `{ workspace_id, worker_id }`. Returns one claimed intent or `{ intent: null }`. Requires workspace access.

- **POST /api/operational/action-intents/complete**  
  Body: `{ id, result_status, result_ref?, write_back? }`. `result_status`: `succeeded` | `failed` | `skipped`. Optional `write_back`: `{ type: "connector_event", workspace_id, channel, external_id, payload? }` or `{ type: "reciprocal_event", workspace_id, thread_id, actor_role, operational_action }` — append-only recorded reality. Requires workspace access (intent must belong to workspace).

## Library

- **createActionIntent(workspaceId, { threadId?, workUnitId?, intentType, payload, dedupeKey })** — Idempotent; ignores unique violation (23505).
- **claimNextActionIntent(workspaceId, workerId)** — Atomic claim (oldest unclaimed); returns row or null.
- **completeActionIntent(id, status, resultRef?)** — Sets `completed_at`, `result_status`, `result_ref`.

No external calls in this repo. All user-facing statements ≤90 chars. Append-only; no deletes.
