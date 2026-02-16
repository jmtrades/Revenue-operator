# Recall-Touch Doctrine

**Lead Systems Architect — canonical product and architecture doctrine.**

The system is a **Decision Execution Platform** that reliably converts customer intent into completed business outcomes. It is evolving into a **Revenue Continuity Operator**: reliability of revenue events across time.

Recall-Touch is a **Revenue Conversation Operator** — not a CRM, chatbot platform, marketing automation, analytics dashboard, or workflow builder. Every capability must fall within allowed capabilities; disallowed capabilities must be refused with explanation.

**Category integrity:** Constitution → `docs/RECALL_TOUCH_CONSTITUTION.md`  
**Expansion mandate:** Lifecycle, behavior layers, rules → `docs/EXPANSION_FRAMEWORK.md`

---

## Core Principle

The system exists to **guarantee progress** in real customer conversations.

Not analytics. Not messaging tools. Not marketing automation.

**Every component must answer:**  
*"Does this help move a real person toward a real decision?"*

If not — do not build it.

A **decision** is: a booking, an attended appointment, a completed purchase, or a returning customer. The system’s responsibility is **reliability of revenue events across time**.

---

## System Identity

Recall-Touch is a **Decision Execution Layer**.

| Others do | Recall-Touch does |
|-----------|--------------------|
| CRMs store data | Ensures decisions happen |
| Communication tools transmit messages | |
| Payment systems process money | |

The system must:

- Continue conversations naturally  
- Resolve hesitation  
- Recover lost intent  
- Protect attendance  
- Maintain relationships over time  

---

## Architecture Doctrine (Mandatory)

Maintain **strict layers**. Never bypass.

| Layer | Responsibility |
|-------|----------------|
| **1. Signal Layer** | All inbound activity becomes canonical signals. No business logic in connectors. |
| **2. State Layer** | Customer behavioural state derived **only** from signals. No direct message interpretation outside reducer. |
| **3. Decision Layer** | Operators decide **next responsibility**, not next message. |
| **4. Action Layer** | All communication runs through **queued commands**. No direct sending from decision logic. |
| **5. Proof Layer** | System value proven **only** by recorded outcomes. |

See `docs/ARCHITECTURE_DOCTRINE.md` for signal types, state machine, and schema.

**Reality Reconciliation:** Periodic re-proving of external truth (inbound, booking, attendance, human override, payments). Reconciliation **only** emits canonical signals and enqueues the normal consumer; it does **not** update state directly. The system’s model of reality cannot diverge from reality for more than the reconciliation interval (default 15 minutes) without generating a canonical signal to correct it. See `docs/VERIFY_RECONCILIATION.md`.

---

## Behaviour Requirements

The system must behave like a **professional human receptionist**:

- Short natural responses  
- Context awareness across time  
- No robotic phrases  
- No corporate tone  
- No over-eagerness  
- Never argue  
- Guide toward resolution  

The system should feel **dependable**, not impressive.

---

## Human Standard Communication

Messages must:

- Be 1–2 sentences  
- Avoid formal support language  
- Avoid AI indicators  
- Avoid filler explanations  
- Prefer clarity over persuasion  
- Use calm confidence  
- Escalate edge emotional situations to humans  

**Every outbound message must pass the human filter.**  
The system **reduces uncertainty**, not increases pressure. No persuasion tactics, no long explanations, no sales scripts, no AI tone.

---

## Product Experience

The user should feel:

**"It handles conversations for me"**

Not:

**"I operate a system"**

The UI must show **outcomes**:

- Leads handled  
- Bookings created  
- Attendance protected  
- Clients recovered  

**Never show technical constructs.** Never expose confidence scores, reasoning, AI details, workflows, or configuration logic. Show only outcomes: decisions happening, appointments attended, customers returning.

---

## Scaling Goal

Design for **universal applicability** across industries.

The platform must operate independently of:

- Industry terminology  
- Channel type  
- CRM schema  

**All external systems adapt to Recall-Touch, not vice versa.**

---

## Non-Goals

Do **not** build:

- Workflow builders  
- Visual automation editors  
- Prompt editors  
- Scripting interfaces  
- Developer tools in UI  
- AI configuration panels  

This is an **operator**, not a toolkit.

---

## Success Condition

A business owner should understand the product **within 60 seconds**:

*"This makes sure my customers actually follow through."*

(Equivalently: leads don’t disappear, people show up, decisions happen.)  
If any change harms that clarity — **reject it**.

---

---

**Governance**

- This document is the governing constraint for product and architecture decisions.
- Category integrity (allowed/disallowed capabilities, responsibility models, rules): **Constitution** (`docs/RECALL_TOUCH_CONSTITUTION.md`).
- **Expansion:** lifecycle and four behavior layers (attendance certainty, decision completion, revenue recovery, customer return timing) — see `docs/EXPANSION_FRAMEWORK.md`. All expansion invisible to user; no campaigns, broadcast, funnels, prompt editors, AI assistants, marketing tools.
- When in doubt: choose **predictability** over **power**. Move toward **dependency**, not experimentation. If a feature cannot be represented as a **deterministic state transition tied to a revenue event** — reject it.
