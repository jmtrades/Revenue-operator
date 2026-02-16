# Recall-Touch Expansion Framework

**Lead Systems Architect — expand across the decision lifecycle, not across product categories.**

Recall-Touch is evolving into a **Revenue Continuity Operator**. The system exists to **guarantee that real business decisions happen**. Expansion must preserve constitutional constraints: no CRM, chatbot platform, marketing automation, analytics dashboard, or workflow builder.

---

## Decision Definition

A **decision** is:

- A **booking**
- An **attended appointment**
- A **completed purchase**
- A **returning customer**

The system’s responsibility is **reliability of revenue events across time**.

---

## Lifecycle (Expansion Scope)

The platform must control **whether these events occur**, not how businesses advertise.

**Interest → Conversation → Decision → Attendance → Payment → Return**

All expansion stays within this lifecycle. No expansion into campaigns, funnels, or marketing tools.

---

## Mandated Internal Behavior Layers

Expand Recall-Touch by implementing **internal** behavior layers. All expansion must be **invisible to the user** (no new configuration, no new UI complexity).

| Layer | Purpose |
|-------|---------|
| **1. Attendance certainty** | Detect hesitation after booking and stabilize commitment. |
| **2. Decision completion** | Detect indecision loops and guide toward resolution without pressure. |
| **3. Revenue recovery** | Recover stalled or delayed decisions weeks later using context memory. |
| **4. Customer return timing** | Trigger conversations when the customer actually needs the service again. |

These are **allowed** expansion directions. Implementation must obey the architecture and behavior rules below.

---

## Do Not Introduce

- Campaign builders  
- Broadcast messaging  
- Funnels  
- Prompt editors  
- AI assistants  
- Marketing tools  

All expansion must be invisible to the user.

---

## Architecture Rule

Every capability must obey:

**Signal → State → Decision → Action → Proof**

Never bypass this pipeline.

**If a feature cannot be represented as a deterministic state transition tied to a revenue event — reject it.**

---

## Behavior Rule

Messages must remain **receptionist-grade human communication**.

- No persuasion tactics  
- No long explanations  
- No sales scripts  
- No AI tone  

The system **reduces uncertainty**, not increases pressure.

---

## UI Rule

The UI must show **only outcomes**:

- Decisions happening  
- Appointments attended  
- Customers returning  

**Never expose:**

- Confidence scores  
- Reasoning  
- AI details  
- Workflows  
- Configuration logic  

---

## Scaling Rule

When expanding to new industries: **add internal understanding only**.  
Never add configuration complexity.

The system adapts to businesses.  
Businesses do not configure the system.

---

## Success Condition

After onboarding, a business owner should understand **within 60 seconds**:

*"This makes sure my customers actually follow through."*

All future development decisions must be evaluated against this statement.  
**Reject anything that weakens it.**

---

---

## Guarantee Layer (Runtime)

A **Guarantee Layer** above the pipeline enforces outcome progression. See `docs/GUARANTEE_LAYER.md`.

- **Response continuity** — No unacknowledged inbound beyond human-reasonable delay.
- **Decision momentum** — No indefinite stagnation in same state; re-engage or escalate.
- **Attendance stability** — After booking, trigger stabilizing communication when needed.
- **Recovery persistence** — Recovery attempts across time; escalate after max attempts.
- **Lifecycle return** — After service completion, trigger return conversation when relevant.

All invariant checks are **deterministic state monitoring** (timestamps, state). No user-visible scoring. Corrective actions flow through Decision → Action. If the system cannot progress after defined attempts, it escalates to a human.

---

*This document defines the expansion mandate. See `docs/RECALL_TOUCH_DOCTRINE.md`, `docs/RECALL_TOUCH_CONSTITUTION.md`, and `docs/GUARANTEE_LAYER.md` for governance.*
