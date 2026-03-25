# Universal Revenue Communication Operator — Architecture

Recall-Touch owns the **conversation layer** between a business and its leads. All channels normalize into one unified conversation timeline.

---

## Universal Conversation Model

| Entity | Purpose |
|--------|--------|
| **workspace** | Business location (1 workspace = 1 location for billing) |
| **lead** | Person |
| **participant_identity** | Phone/email/social/CRM id mapping (channel + external_id + optional crm_id) |
| **conversation** | Thread (lead + channel + external_thread_id) |
| **message** | Inbound or outbound message |
| **booking** | Appointment (scheduled, completed, no_show, cancelled) |
| **outcome** | show / no_show / won / lost / reactivated |
| **revenue_state** | at_risk / secured / lost / recovered |

All connectors map into this model. Code: `src/lib/universal-model/`.

---

## Connector Layer

### SourceAdapter (inbound)

1. **verify** — Validate request (signature, token).
2. **normalize** — Map raw payload → `NormalizedInboundEvent`.
3. Pipeline: **processNormalizedInbound** → upsert lead + conversation + message → resolve conversation state → enqueue decision.

Entry types:

- **Native:** SMS, Email, Web form, Web chat, WhatsApp, Instagram
- **CRM sync:** HubSpot, HighLevel, Pipedrive, Zoho
- **Enterprise:** Signed inbound webhook with versioned schema and idempotency keys

Code: `src/lib/connectors/source-adapter.ts`, `normalize-to-pipeline.ts`.

### DestinationAdapter (outbound)

- **sendMessage** — Deliver to lead (SMS, email, etc.).
- **updateCrm** — Update stage, custom fields.
- **appendNote** — Append note in destination system.

Code: `src/lib/connectors/destination-adapter.ts`.

---

## AI Behavior

AI is a **receptionist**, not a general assistant.

**Allowed goals:** obtain reply, qualify, move to booking, confirm attendance, recover lost leads.

**Deterministic conversation states:**

- NEW_INTEREST, CLARIFICATION, CONSIDERING
- SOFT_OBJECTION, HARD_OBJECTION
- COMMITMENT, POST_BOOKING
- NO_SHOW, COLD

**State → objective → response → next timing.** Code: `src/lib/conversation-state/`, `src/lib/playbooks/`.

---

## Preset Playbooks

Selecting **business type** auto-generates: qualification questions, tone, cadence, booking urgency, reactivation timing, objection patterns. Users never write scripts. Code: `src/lib/presets/`.

---

## User Experience

- **Solo:** Connect channel → send test message → system works.
- **Business:** Connect calendar → operator handles conversations.
- **Enterprise:** Send events → receive outcomes.

No empty dashboards. No configuration screens. No AI terminology.

---

## Dashboard

Outcomes only:

- Leads received
- Conversations handled
- Bookings created
- Shows protected
- Lost leads recovered

Code: `src/lib/lifecycle/` (RECEPTIONIST_PERFORMANCE_METRICS), `src/app/dashboard/revenue/page.tsx`.

---

## Success Condition

A non-technical user understands in under 10 seconds:

**“This handles my enquiries and follow-ups automatically and gets me more bookings.”**

Implementation uses the existing execution engine; only normalization, adapter, and playbook layers were added.
