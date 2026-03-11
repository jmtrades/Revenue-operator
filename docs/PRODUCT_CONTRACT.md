# Recall-Touch — Product Contract

**Legacy.** Canonical product definition for Revenue Operator: [SYSTEM_DOCTRINE.md](./SYSTEM_DOCTRINE.md) and [PRODUCT_DEFINITION.md](./PRODUCT_DEFINITION.md).

**Governing product contract for all future code.**

---

## Core product definition

Recall-Touch is **not** software. It is a **staff member delivered through software.**

A **revenue receptionist** that:
- Responds instantly
- Qualifies leads
- Handles objections
- Pushes toward booking
- Prevents no-shows
- Revives dead leads

It does **not**:
- Act like ChatGPT
- Answer random questions endlessly
- Allow users to design workflows
- Expose technical systems
- Behave like a general chatbot

**Single destination:** a booked appointment.

---

## Product rule

If a feature does not directly increase **bookings**, **attendance**, or **recovered leads** → consider whether it helps users.

---

## User experience goal

Within **60 seconds** of signup the business owner must think:

**“This is handling my enquiries for me.”**

- No learning required
- No setup complexity
- No blank dashboard
- Value demonstrates automatically

---

## Onboarding (exactly 3 steps)

1. **Select business type**
2. **Connect calendar**
3. **Connect messaging channel**

**DONE.** System begins handling conversations immediately.

**Remove from UX:** value reconstruction theatre, fake analytics explanations, configuration pages, multi-step technical setup.

---

## Vertical preset system

When a business type is selected, the system **automatically** creates:

**Pipeline stages:** New Lead → Contacted → Qualified → Booked → Showed → No Show → Reactivation  

**Automations (user never configures):**
- Instant response
- Qualification conversation
- Booking link delivery
- Reminder sequence (24h + 3h)
- No-show recovery
- Review request
- Reactivation after 60–90 days

---

## AI behaviour

Receptionist, not assistant.

- Short messages, natural tone
- Moves toward booking
- Handles objections, redirects irrelevant questions, escalates edge cases
- Never long explanations, never ramble, never roleplay assistant behaviour  
**Every conversation has a destination: booking.**

---

## Message strategy engine (deterministic)

Conversation states:

`NEW_INTEREST` → `CLARIFICATION` → `CONSIDERING` → `SOFT_OBJECTION` | `HARD_OBJECTION` → `DRIFT` → `COMMITMENT` → `POST_BOOKING`

**State → Objective → Response → Next action timing.**

AI never improvises freely; it executes structured intent.

*(Code: `src/lib/conversation-state/`, `src/lib/playbooks/`.)*

---

## Demo mode

Built-in demo business environment. On demo: show real conversation timeline — Lead arrives → AI replies → Qualification → Booking → Reminder → Recovery. Runs automatically for sales demonstrations.

---

## Dashboard

**Outcome UI only.** Top metrics:

- Leads received
- Conversations handled
- Bookings created
- Recovered leads
- Estimated revenue generated

**Never show:** agents, nodes, workflows, executions, LLM reasoning.  
**Show:** Receptionist performance.

---

## Architecture

Keep current execution engine. Add **Preset Builder Layer** that composes workflows automatically.

```
Automation Engine + Opinionated Business Templates = Revenue Product
```

---

## Business model prep

- One workspace = one business location
- Future billing: conversations handled, number of locations, human takeover seats
- DB prepared: `conversations_handled`, `location_count` on workspaces

---

## Features to remove or hide from UI

- Workflow builders
- Technical settings
- Debug panels
- AI reasoning displays
- Complex onboarding
- Empty dashboards

Keep internally if needed; hide from user.

---

## Migration

Map existing conversations → new pipeline stages. Auto-assign business preset. Preserve data. No manual reconfiguration.

---

## Success condition

A non-technical business owner signs up and **instantly** understands:

**“This replaces my receptionist follow-ups and gets me more bookings.”**

If the product requires explanation — redesign it.

---

## Implementation order

1. Preset system ✅  
2. Conversation state engine enforcement ✅  
3. Booking-first AI behaviour  
4. Onboarding simplification  
5. Outcome-based dashboard  
6. Demo environment  
7. Revenue metrics  

Design every decision as if Recall-Touch is a staff member, not software.
