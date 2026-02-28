# Voice Execution Closure

Voice execution is closed end-to-end via a deterministic plan, a strict executor contract, and an append-only outcome ingest. No direct Twilio or voice SDK calls from the core pipeline.

---

## Intent payload contract (place_outbound_call)

The action intent payload emitted for voice is:

```json
{
  "phone": "+1...",
  "domain_type": "general",
  "jurisdiction": "UK",
  "thread_id": "...",
  "work_unit_id": "...",
  "conversation_id": "...",
  "plan": {
    "domain_type": "...",
    "jurisdiction": "...",
    "stage_state": "...",
    "consent_required": false,
    "max_duration_seconds": null,
    "escalation_threshold": null,
    "disclaimer_lines": ["..."],
    "script_blocks": [
      {
        "block_type": "opening_block",
        "lines": ["..."],
        "required_disclosures": [],
        "forbidden_phrases": [],
        "consent_required": false,
        "escalation_threshold": null,
        "max_duration_seconds": null
      }
    ]
  },
  "compliance_requirements": {
    "consent_required": false,
    "quiet_hours_respected": true,
    "jurisdiction_locked": false
  },
  "trace": {
    "policy_id": null,
    "approval_id": null
  }
}
```

- All outbound voice text comes from `plan.script_blocks[].lines` only. No freeform.
- Executor must use `plan` only; no generation.

---

## Outcome ingest contract

**POST /api/connectors/voice/outcome**

**Auth:** Workspace role required (owner, admin, operator, closer).

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| workspace_id | string | Yes | Workspace ID. |
| external_call_id | string | Yes | Unique call id from executor (dedup key). |
| action_intent_id | string | No | Intent to mark complete. |
| outcome | string | No | One of: connected, no_answer, voicemail, busy, failed, completed. |
| duration_seconds | number | No | Call duration. |
| consent_recorded | boolean | No | Whether consent was recorded. |
| disclosures_read | boolean | No | Whether disclosures were read. |
| objection_key | string | No | e.g. price, timing, authority. |
| next_required_action | string | No | schedule_followup, request_disclosure_confirmation, escalate_to_human. |
| notes_structured | object | No | Structured only; e.g. commitment, timeline, risk_flags. |
| conversation_id | string | No | For strategy state update. |
| thread_id | string | No | For strategy state / next intent. |
| work_unit_id | string | No | For strategy state / next intent. |
| strategy_state | string | No | New state when conversation_id present. |

**Behavior:**

- Append-only: insert into `connector_events` with `channel = "voice_outcome"`, `external_id = external_call_id`. On unique violation (23505), return `{ ok: true, idempotent: true }` and skip side effects.
- Mark `action_intent` completed: `outcome === "failed"` → result_status `failed`; otherwise `succeeded`.
- Add one orientation line (≤90 chars, factual) to payload, e.g. "A call attempt occurred.", "A call connected.", "Consent was recorded on the call.", "Disclosure was delivered on the call.", "A call outcome required human review." (when next_required_action is escalate_to_human).
- If `conversation_id` present, upsert `conversation_strategy_state`.
- If `next_required_action` present, create next action intent with dedupe key `voice_outcome:{external_call_id}:{next_required_action}`.

---

## Executor responsibilities

1. Poll **GET /api/operational/action-intents/claim** (or equivalent) for work.
2. If intent type is `place_outbound_call`, place the call using the payload `plan` only (script_blocks lines, disclaimer_lines, compliance_requirements).
3. **POST** results to **/api/connectors/voice/outcome** with `workspace_id`, `external_call_id`, `outcome`, and optional fields.
4. Mark intent complete (or rely on outcome route when `action_intent_id` is sent).

No Twilio or voice SDK in the core repo. Executor runs outside the repo.

---

## Troubleshooting checklist (doctrine-safe)

- **Duplicate outcome:** Same `external_call_id` twice returns 200 and `idempotent: true`; no duplicate event or double complete.
- **Missing plan:** If voice plan build fails, no intent is emitted (emit returns null).
- **Forbidden phrase in script:** Plan build returns `ok: false` with reason `internal_error`; no intent emitted.
- **State update:** Only when `conversation_id` is provided; state is normalized to allowed strategy states.
- **Next action dedupe:** Same `external_call_id` + same `next_required_action` dedupes via `createActionIntent` dedupe key.

All record lines are ≤90 characters and factual. No advice, no persuasion.
