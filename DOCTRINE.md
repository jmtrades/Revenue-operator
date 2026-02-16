# Revenue Operator — Operational Continuity Doctrine

This system is **Operational Continuity Infrastructure**, not a CRM, AI assistant, chatbot, marketing tool, or workflow automation.

---

## Global design principle

The product must feel like **a system that keeps reality consistent**, not a tool that helps people work.

- **Never** design features as assistance.
- **Always** design as environmental effect.

The user should feel: **"I operate inside this"** — not "I use this."

**Success:** Organizations feel unsafe operating without it.  
**Failure:** Users perceive it as automation software.

When adding or modifying features, ask:
- Does this **help the user work?** → If yes, reject it.
- Does this **allow work to continue without them?** → If yes, implement it.

---

## What must never be added

- Dashboards with KPIs
- Productivity analytics or engagement charts
- AI advice or optimization suggestions
- Marketing copy or gamification
- Performance scoring

If a feature looks like SaaS analytics, remove it.

---

## What must be present

### 1. Environmental presence

Whenever the system affects real outcomes, leave a **neutral trace**. Automatically append a factual reference link to confirmations, follow-ups, shared records, invoices, completions, dispute resolutions. The trace must not be branded; format: factual reference only. Goal: non-users begin relying on the record.

### 2. Absence moments

Reveal value only when **removal is considered**. Trigger disable-impact and retention-intercept during: cancellation, downgrade, integration disconnect, inactivity return, billing failure, export attempts. Never display randomly. Display statements only; no persuasion UI.

### 3. Multi-audience operation

Support three realities: **Organization** (teams/staff), **Professional** (solo with clients), **Personal** (life continuity). Same engines; only wording/tone varies by audience. Audience controls wording, never behavior.

### 4. Pricing model

Billing is based on **maintained operation** (e.g. continuity_scope_units: prevented continuation, causal outcomes, maintained expectations, normalized behavior, detached operation). Do not charge per user or per message.

### 5. External adoption loop

Counterparties who interact with references should naturally become participants. Never require signup to trust the record; trust must come from consistency.

---

## System output style

All visible text must be:

- Short factual sentence
- Past or present tense
- No adjectives, persuasion, or value claims
- No numbers unless necessary; no percentages; no performance language

**Bad:** "You saved 12 hours and increased conversions"  
**Correct:** "Follow-ups occurred without manual action."

Doctrine rules: factual, short, non-persuasive, ≤90 chars, no metrics, no marketing, no predictions, no analytics language.

---

## UI/UX

The interface must feel like: **bank ledger + operating system + audit log** — **not** dashboard + CRM + analytics.

Use calm whitespace. No bright alerts, red warnings, growth charts, or progress bars. Replace buttons with actions; replace metrics with state; replace graphs with sentences.

Pages should answer only:

- What continued
- What required attention
- What would fail without it

Everything else is noise.

---

## Engineering rules

- Never introduce non-deterministic decisions into execution paths.
- LLM may interpret input but must never decide action.
- All actions must remain policy-gated.
- All user-visible statements must derive from stored events.
- If a statement cannot be proven from data, do not show it.

---

## Existing system (do not break)

- State machine (commitments, payments, opportunities, shared transactions, communication recovery)
- Causality engine, continuation engine, displacement engine, detachment engine
- Institutional / assumption / normalization layers, operability anchor, exposure engine
- Proof capsules, retention + disable impact, public record references
- Settlement + usage classification (continuity_scope_units), core + guarantees crons

Cursor and all contributors must treat this document as a governing constraint.
