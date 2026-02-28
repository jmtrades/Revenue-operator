# Speech Governance

All outbound customer-facing messages (SMS, email, WhatsApp) are produced by a single deterministic path: **Intent → Clause plan → Approved templates → Slot values → Rendered text**. No other path may send customer-facing text.

## Guarantees

- **Deterministic**: Same inputs (workspace, domain, jurisdiction, channel, intent, clause plan, slots) always yield the same rendered text and decision.
- **Reviewable**: Every send attempt is recorded in `message_traces` (append-only) with policy checks, templates used, and result status (prepared / sent / blocked / skipped / failed).
- **Policy-bound**: Only approved templates (status `approved` and an approval record) are used. Policies (banned phrases, required clauses, forbidden terms by intent, length caps) are evaluated before send.
- **Doctrine-safe**: Rendered text never exceeds channel caps (e.g. 320 chars for SMS), never includes forbidden language, and never exposes internal identifiers.

## Flow

1. **Resolve context**: Domain type and jurisdiction come from workspace domain pack or settings (default `general` / `UK`).
2. **Get template**: `getApprovedTemplate(workspaceId, domain, jurisdiction, channel, intentType, clauseType)` — workspace-approved first, then global approved, then null (block).
3. **Render**: `renderTemplate(body, slots)` replaces `{{slot_name}}` with slot values. Deterministic only.
4. **Policy checks**: Banned phrases, forbidden terms by intent, doctrine forbidden language, length cap.
5. **Review gate**: High-risk intents (e.g. lending, screening outcomes, legal terms) can return `review_required`; no send until human authority.
6. **Trace**: Append-only `message_traces` and, when sent/blocked, `audit_log` entries. Slots are redacted (no raw email/phone in traces).

## Send pipeline

All sends go through `compileGovernedMessage`. In the delivery provider, when no structured intent is provided, a **passthrough** template (`{{content}}`) is used so existing content still passes through the same policy and length checks. If the compiler returns block or review_required, the message is not sent; a trace is recorded and the appropriate action intent is emitted (`human_review_required`, `policy_violation_detected`, `template_missing`).

## Preview

`POST /api/message/preview` returns the rendered message and decision (send / block / review_required) without sending. Used to verify default pack and templates before go-live.
