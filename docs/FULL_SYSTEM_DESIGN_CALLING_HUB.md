# RecallTouch: Category-Defining AI Calling Hub — Full System Design

This document defines the shift from **script-centric** to **objective-centric** architecture and the full Cursor implementation prompt. See also `PRODUCT_ARCHITECTURE_VISION.md` and `CURSOR_MASTER_PROMPT_ARCHITECTURE_IMPLEMENTATION.md`.

---

## SECTION 1 — FULL REDESIGN VISION

RecallTouch must become "an intelligent calling operator that understands businesses, adapts to situations, and drives outcomes."

**Three core layers:**

1. **Business Brain** — What the agent knows about the business: what it does, who it serves, what it sells, where it operates, how it talks, what it can and cannot say. Configured once, shared across agents and campaigns.

2. **Call Playbooks** — Pre-built behavioral blueprints: inbound receptionist, outbound qualifier, appointment setter, follow-up, support triage, reactivation. Each defines conversation strategy, success conditions, failure handling, escalation rules, outcome actions. Users pick and customize.

3. **Scenario Engine** — Conversations as a graph: greeting → discovery → qualification → objection handling → booking → confirmation → wrap-up. Each node: trigger, behavior, exit, next step. Graph generated from playbook + business brain; no raw prompts to users.

**On top:**

4. **Intelligence Layer** — Research enrichment, pre-call prep, post-call analysis, optimization recommendations.

5. **Confidence & Launch System** — Readiness scoring, scenario testing, behavioral previews, risk warnings, gated launch.

**Setup flow:** Pick a playbook → Tell us about your business → Customize behavior → Connect your number → Test scenarios → Launch.

---

## SECTIONS 2–9 (SUMMARY)

- **Section 2:** Everything the agent needs (Business Context, Call Context, Conversation Strategy, Outcome Logic, Knowledge, Voice & Delivery, Research).
- **Section 3:** Ideal setup flow — 7 steps (Playbook, Business, Customize Behavior, Voice, Connect Number, Test, Review & Launch).
- **Section 4:** Agent control architecture — Mission, Business Brain, Conversation Strategy (scenario-based), Guardrails, Outcome Actions; Simple vs Advanced mode.
- **Section 5:** Research/enrichment — website scan, pre-call enrichment, post-call intelligence; safety and transparency.
- **Section 6:** Testing — scenario simulator, live test call, readiness scorecard (70% minimum to launch).
- **Section 7:** UX — dark theme, progressive disclosure, AI-assisted input, smart defaults, scenario-based navigation.
- **Section 8:** Add/Remove/Replace/Rebuild list.
- **Section 9:** Implementation phases (Foundation → Intelligence & Testing → Operational Power → Polish).

---

## SECTION 10 — CURSOR MASTER PROMPT

The full 12-phase Cursor master prompt is in **`docs/CURSOR_MASTER_PROMPT_FULL_SYSTEM.md`** (extracted for copy-paste). Phases:

1. Agent setup — playbook template system (Mission + guardrails)
2. Phone number — two-option redesign
3. Scenario preview in Go Live step
4. Campaign type presets
5. Calls — CSV export + detail drawer
6. Leads — inline quick-add + export
7. Knowledge — URL import + bulk CSV
8. Call Intelligence — performance metrics
9. Homepage — pricing + use-cases + footer
10. Dashboard — clickable checklist
11. Global enhancements (toasts, confirmations, shortcuts, agent quick actions, danger zone, test call handling)
12. Build + verify

**Do not modify:** Homepage hero static demo, sidebar structure, onboarding wizard, agent stepper structure, readiness scoring, billing, integrations, design tokens, accessibility, error boundaries, auto-save, lifecycle emails.

---

*End of design summary. Execute the Cursor prompt in order; `npm run build` after each phase.*
