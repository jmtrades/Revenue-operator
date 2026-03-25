# Product Architecture Vision — Category-Leading AI Calling Hub

**Lead product architect vision for Recall Touch: setup flow, control architecture, intelligence system, and launch-readiness.**

This document rethinks the product so it becomes the **hub for calling**—premium, intelligent, operationally serious—while remaining a **Revenue Conversation Operator** (doctrine: `docs/RECALL_TOUCH_DOCTRINE.md`, constitution: `docs/RECALL_TOUCH_CONSTITUTION.md`). No prompt editors, no campaign builders; structured control and outcome reliability.

---

## SECTION 1 — FULL REDESIGN VISION

### North Star

Recall Touch should feel like **configuring a trained operator** that already understands:
- Your business and who you serve  
- The outcome you want from this agent  
- How to behave, what to never do, and when to hand off  
- How to use knowledge and (where enabled) safe research to stay relevant  

Setup should feel **goal-first, then context, then behavior, then tools, then test, then launch**—not forms-first or prompt-first.

### Vision in One Sentence

**A premium, goal-driven setup flow that collects the minimum necessary inputs in the right order, enriches context intelligently (including optional safe research), gives users clear control over mission/guardrails/outcomes, and gates launch on tested readiness—so the platform can handle many real call types (inbound, outbound, booking, qualification, support, reactivation, reminders) without script-writing or prompt-hacking.**

### Core Principles of the Redesign

1. **Outcome-first** — First question: “What should happen when this agent succeeds?” (e.g. appointment booked, lead qualified, message taken, call transferred). Everything else supports that.
2. **Audience-second** — “Who is this agent talking to?” (inbound caller, outbound lead, existing customer, cold lead). Drives tone, opener, and next-best action.
3. **Context over prompts** — Business context, FAQs, guardrails, and (optionally) research-derived context feed a **structured control layer**. The system composes behavior from these; the user does not write a master prompt.
4. **Control, not scripting** — Mission, use case, tone, qualification rules, objection handling, escalation, fallback, and success/failure logic are **structured controls** with smart defaults and optional depth.
5. **Test before launch** — Simulated scenarios, objection tests, and path previews build confidence. Readiness score and required checks gate “Launch.”
6. **Research as optional enrichment** — Where lawful and transparent, the system can use web research (company, location, public info) to improve agent context. User controls whether and where it’s used; no creepy or opaque use.
7. **One system, many workflows** — Same architecture supports receptionist, booking, qualification, follow-up, reactivation, reminders, support triage, routing. Reusable logic blocks and use-case presets; no rebuild from zero.
8. **Premium feel** — Calm, clear, high-trust UI. Progressive disclosure. No form dump. Confidence-building copy and states.

---

## SECTION 2 — EVERYTHING THE AGENT NEEDS TO WORK PERFECTLY

For the agent to perform reliably across real-world use cases, the following inputs and layers must exist. (Aligned with doctrine: no single “prompt box”; structured layers that feed Signal → State → Decision → Action → Proof.)

### A. Business context (structured)

| Input | Purpose |
|-------|--------|
| Business name, type, industry | Identification and positioning |
| What the business does / sells | Core value and offer |
| Where it operates (geo, timezone) | Hours, location, local relevance |
| Who it serves (ideal customer) | Fit/unfit, qualification |
| Brand voice (preset + optional refinement) | Tone, warmth, assertiveness |
| Offer structure (if relevant) | Services, packages, pricing rules (high-level) |
| Compliance boundaries | What must never be said or promised; regulatory constraints |

### B. Call context (per interaction)

| Input | Purpose |
|-------|--------|
| Inbound vs outbound | Opener, expectation, next-best action |
| Lead source | Context for relevance |
| Lead temperature / stage | How to pitch, how much to push |
| Campaign or objective (outbound) | Follow-up vs reactivation vs reminder vs qualification |
| Prior interactions | Continuity, avoid repetition |
| Next-best action (from state layer) | What the system recommends |
| Fallback action | If primary fails |

### C. Conversation strategy (control layer)

| Control | Purpose |
|---------|--------|
| Opener style | How to start (warm, direct, contextual) |
| Rapport / discovery style | How to ask questions, how deep |
| Qualification style | What counts as qualified; what to ask |
| Objection handling | Preset + custom rules; never argue |
| Booking style | How to propose times, confirm, reschedule |
| Escalation rules | When and how to transfer or hand off |
| Follow-up / retry rules | What to do after no-answer, voicemail, “call back later” |
| Voicemail / gatekeeper rules | What to leave, how to get through |
| Not-interested / wrong-person handling | Graceful exit, no pressure |
| Off-topic handling | Redirect to scope or take message |
| Emotional adaptation | Calm when frustrated; confident when ready |

### D. Outcome logic (decision layer)

| Element | Purpose |
|---------|--------|
| Success definition | What counts as a “win” (e.g. booked, qualified, message taken) |
| Partial success | What to log and what to do next |
| Failure definition | No-answer, not interested, wrong number, etc. |
| Next action after each result | CRM update, follow-up task, re-engagement timing |
| What triggers human review | Escalation, high-value lead, complaint |
| What triggers follow-up | Time-based, event-based |

### E. Knowledge + context

| Element | Purpose |
|---------|--------|
| FAQs | Answers the agent can give |
| Pricing / services / policies | Approved claims only |
| Forbidden claims | Never say list (guardrails) |
| Scheduling logic | Availability, booking rules |
| Local details | Address, hours, contact |
| Structured business facts | Product/service details |
| Research-enriched context (optional) | Company, location, public info—user-controlled |
| Contact-level context | From CRM/state (e.g. name, history) |
| Historical context | Prior calls, messages, bookings |

### F. Voice + delivery

| Element | Purpose |
|---------|--------|
| Voice selection | Fit for use case and brand |
| Pace, clarity, naturalness | Delivery tuning |
| Assertiveness vs warmth | Tone calibration |
| Pronunciation / industry suitability | Quality and fit |

### G. Research / enrichment (optional, bounded)

| Element | Purpose |
|---------|--------|
| When research is used | Pre-call, setup, or never—user choice |
| What is researched | Company, location, public hours, reviews (high-level) |
| What is not researched | PII, non-public data; clear boundaries |
| Source and verification | Prefer authoritative; avoid hallucination |
| Transparency | User sees what was used; can disable |

---

## SECTION 3 — THE IDEAL SETUP FLOW

### Philosophy

- **Fast path to value:** User can go from “I want an agent that books appointments” to “test call in under 5 minutes” with smart defaults.
- **No admin dump:** No single screen with 50 fields. Steps are small, focused, and ordered by dependency.
- **Goal → context → behavior → tools → test → launch.**

### Step sequence (high level)

1. **Choose outcome and audience** (Mission)
   - Single question: “What should this agent achieve?” with presets: Book appointments, Qualify leads, Take messages & route, Follow up with leads, Reactivate leads, Remind about appointments, Support triage, Custom.
   - “Who is it talking to?” Inbound callers / Outbound leads / Existing customers. Optional: lead temperature or campaign type for outbound.
   - Output: **Mission + audience**. No long form yet.

2. **Business context** (Context)
   - “What does your business do?” — short natural language. AI extracts: name, what they do, who they serve, where (if relevant).
   - Optional: website URL → system suggests FAQs/hours (or “Import from URL”).
   - Optional: “Anything the agent must never say or promise?” — guardrails.
   - Output: **Structured business context + guardrails.**

3. **How it should sound and behave** (Voice & behavior)
   - Voice: choose from curated set (persona labels: “Professional,” “Warm,” “Direct,” etc.).
   - Greeting: one short opener; can be suggested from mission + context.
   - Tone: assertiveness/warmth slider or preset.
   - Behavior presets: “Never discuss pricing,” “Never schedule outside hours,” “Never promise delivery dates,” “Never discuss competitors,” “Never share internal info” + custom rules.
   - Output: **Voice ID, greeting, tone, never-say list.**

4. **What it needs to know** (Knowledge)
   - Add FAQs (manual, from URL import, or from bulk CSV). Minimum 3 for launch.
   - Optional: services list, pricing summary (approved wording only).
   - Optional: “Use safe web research to enrich context” toggle + what to research (company, location, public info).
   - Output: **Knowledge base + research policy.**

5. **Calls and handoffs** (Calls & escalation)
   - When to transfer (keywords, intent, or “always for X”).
   - After-hours: take message, forward, or closed message.
   - Emergency or escalation number if needed.
   - Output: **Transfer rules, after-hours mode, escalation.**

6. **Preview and test** (Test)
   - “Preview how your AI will respond” — 3 scenarios: booking, pricing question, after-hours. Client-side generated from config (no API).
   - Test call: real browser call with current config. Optional: try objection scenarios (e.g. “I’m not interested,” “Call back later”).
   - Warnings: missing knowledge, conflicting rules, weak greeting.
   - Output: **User confidence; optional “tested_at” flag.**

7. **Readiness and launch** (Launch)
   - Readiness score: required (e.g. business name, greeting, voice, 3+ FAQs, phone or test path) + optional (transfer rules, after-hours, research).
   - Checklist: each item clickable to fix. “Launch my AI” gated on minimum score (e.g. 40% or 60%) and critical items.
   - Post-launch: “Your AI is live. Here’s how to forward your number / run outbound.”

### Progress model

- **Stepper:** 7 steps with labels (Mission → Context → Voice & behavior → Knowledge → Calls & escalation → Test → Launch).
- **Persistence:** Save on blur or step change; no “Save” wall.
- **Back/Next:** Free navigation; validation on “Next” or “Launch.”
- **Preview panel (optional):** Side panel or collapsible “Your agent summary” so user always sees mission, greeting, and key guardrails.

### Simple vs advanced

- **Simple:** Presets everywhere. “Appointment Booker” pre-fills mission, suggested greeting, and behavior presets. User only confirms or tweaks.
- **Advanced:** Same steps, but expandable sections: custom qualification criteria, custom objection responses, custom transfer rules, research toggles, voice tuning. No extra “modes”—just progressive disclosure inside each step.

---

## SECTION 4 — THE IDEAL AGENT CONTROL ARCHITECTURE

### Principle

Control is **structured**, not a single prompt. The runtime (conversation engine) receives:
- Mission + audience
- Business context (structured)
- Greeting + voice + tone
- Guardrails (never-say, always-transfer)
- Knowledge base (+ optional research context)
- Transfer and after-hours rules
- Success/failure definitions

The system **composes** behavior from these. No raw “system prompt” edited by the user.

### Control layers (data model)

1. **Mission layer**
   - `primary_goal`: book_appointments | qualify_leads | answer_route | follow_up | support | custom
   - `audience`: inbound | outbound | both; optional campaign_type for outbound
   - `outcome_success`: what counts as success (e.g. “appointment booked”)
   - `outcome_fallback`: what to do on partial success or failure

2. **Context layer**
   - `business_context`: { name, what_we_do, who_we_serve, geo, timezone, … }
   - `guardrails`: { never_say: string[], always_transfer: string[], compliance_notes?: string }

3. **Voice & delivery layer**
   - `voice_id`, `greeting`, `tone` (assertiveness/warmth), `pace` if needed

4. **Knowledge layer**
   - `knowledge_base`: { faq: { q, a }[], services?: string[], pricing_approved?: string }
   - `research_policy`: { enabled: boolean, what: string[] (e.g. company, location), sources?: string[] }

5. **Rules layer**
   - `transfer_rules`: when to transfer (phrase, intent, or always for X)
   - `after_hours_mode`: messages | forward | closed
   - `escalation`: number or instructions

6. **Outcome logic layer** (can be implicit from primary_goal)
   - For each outcome type: what to log, what to update in CRM, what to trigger next (follow-up, re-engagement).

### Scenario matrices (advanced)

- **Objection → response:** Preset list (e.g. “Too expensive” → “I understand. Can I have someone send options?”) + custom pairs. Stored as structured rules, not free text.
- **Qualification:** Criteria (e.g. budget, timeline, authority) as structured fields; agent asks and maps answers to next-best action.
- **Booking:** Logic for proposing times, confirming, rescheduling; tied to calendar/availability where integrated.

### Explainability

- “Why the agent will act this way”: short explanations per section (e.g. “Because you chose Appointment Booker and added these FAQs, the agent will…”). Shown in Preview/Test step.
- No exposed “prompt”; user sees **outcomes of their choices**, not raw text.

### Live vs draft

- Edits apply to **draft** until user clicks “Launch” or “Save and sync.” After launch, changes can be “Save (draft)” vs “Publish” if we support versioning later; for v1, “Save” = persist and sync to voice provider.

---

## SECTION 5 — THE IDEAL RESEARCH / ENRICHMENT SYSTEM

### Purpose

- Improve agent relevance when business context is thin (e.g. user only pasted a URL).
- Pre-call or pre-campaign: enrich lead/company context where lawful and transparent.
- Never replace user-provided facts; only **add** public, verifiable context.

### When research is used

1. **Setup:** Optional “Enrich from web” for business: pull public hours, address, top-level service descriptions, or FAQ-like content from company site. User approves or edits before saving.
2. **Pre-call (outbound):** Optional “Research this lead/company before calling” — public company info, location, recent news (high-level). Stored as context for that call only; user can disable per campaign or globally.
3. **Knowledge:** “Import from URL” already exists; optional extension: “Also suggest answers from public pages” with user approval.

### What is researched

- Company: name, tagline, public description, industry.
- Location: address, timezone, public hours if found.
- Public FAQs, services, or menu (for suggestion only; user confirms).
- Lead/company for outbound: company name, domain, industry—no PII.

### What is not researched

- Private or authenticated data.
- Social profiles (unless explicitly allowed and compliant).
- Anything that could be used to infer sensitive attributes without consent.

### Safety and transparency

- User must **opt in** to research (per agent or per campaign).
- “What we use” summary visible (e.g. “Company name, location, public hours”).
- Research results shown in UI where they affect behavior (e.g. “We found these hours; confirm or edit”).
- Clear boundary: “We only use public, non-personal data.”

### Implementation note

- Research can be a **backend service**: given URL or company name, return structured snippet (hours, address, summary). Frontend shows in Context or Knowledge step; user confirms. No research in live call path unless pre-call context was explicitly requested and stored.

---

## SECTION 6 — THE IDEAL TESTING / SIMULATION / READINESS SYSTEM

### Testing layer

1. **Scenario preview (client-side)**
   - “Someone calls to book” / “Someone asks about pricing” / “Someone calls after hours” — generate response from current config (greeting, FAQs, guardrails, after-hours). No API call. Builds confidence.

2. **Live test call**
   - User clicks “Start test call”; uses real voice and current config. Optional: suggest phrases to try (“I’d like to book,” “What are your prices?”).
   - If voice/config not ready: clear message “Test calls require voice service configuration. Contact support or skip to launch.” + “Skip to launch” so user isn’t stuck.

3. **Simulated scenarios (optional future)**
   - “Simulate: not interested” / “wrong person” / “call back later” — bot plays that role; user hears how agent responds. Can be Phase 2.

### Readiness model

- **Required for launch (examples):** Business name, greeting, voice, ≥3 FAQs, at least one of: phone connected or test-only mode.
- **Recommended:** Transfer or after-hours set, guardrails set, test call completed.
- **Score:** Weighted sum of required + recommended. Display: “Your AI is X% ready.” Checklist items are **clickable** (link to the step/section to fix).
- **Gating:** “Launch my AI” disabled until required items are met (and optionally until score ≥ threshold). Copy: “Complete the required items above to activate.”

### Warnings

- Missing knowledge for common questions (e.g. pricing, hours).
- Conflicting rules (e.g. “never discuss pricing” but FAQ has pricing).
- Weak or empty greeting.
- No transfer path when “transfer” is selected.

Show these in Test or Launch step; do not block unless they are critical (e.g. empty greeting blocks launch).

---

## SECTION 7 — THE IDEAL UX / UI DIRECTION

### Feel

- **Premium:** Plenty of whitespace, clear hierarchy, subtle borders, no visual clutter. Dark theme with zinc/white accents (already in use); keep consistency.
- **Calm:** No alarmist copy. Use “Set guardrails” not “Warning: configure or else.”
- **Guided:** One primary action per step. “Continue” or “Save and continue.” Secondary: “Back,” “Skip for now” where appropriate.
- **Trust-building:** “Preview how your AI will respond,” “Your agent will…,” readiness checklist with clear criteria.
- **Fast:** Auto-save, smart defaults, minimal required fields. Progress indicator (e.g. step 3 of 7).

### Structure

- **Stepper:** Horizontal on desktop; vertical or accordion on mobile. Current step highlighted; completed steps clickable.
- **Cards per step:** One main card per step. Optional side panel: “Your agent summary” (mission, greeting, guardrails summary).
- **Forms:** One logical group per section. Labels above fields; helper text below where needed. Primary button at bottom of card.
- **Presets:** Use cards or buttons for “Choose a playbook” (Receptionist, Appointment Booker, etc.); selected state clear (e.g. border + light background).
- **Empty states:** “No FAQs yet. Add at least 3 so your agent can answer questions.” CTA: “Add entry” or “Import from URL.”

### Microcopy

- **Mission:** “What should this agent achieve?” / “Who is it talking to?”
- **Context:** “What does your business do?” / “Anything the agent must never say?”
- **Knowledge:** “What should your agent know?” / “Add FAQs, services, or approved answers.”
- **Test:** “Preview how your AI will respond.” / “Run a test call to try it live.”
- **Launch:** “Your AI is X% ready.” / “Launch my AI” (primary) when ready.

### States

- **Loading:** Skeleton or spinner for async (e.g. loading agent, syncing).
- **Success:** Short confirmation (“Saved,” “Agent is live”) + optional toast.
- **Error:** Inline or toast; “Try again” or “Skip to launch” where applicable.
- **Disabled:** Clear why (e.g. “Complete greeting and voice to continue”).

---

## SECTION 8 — WHAT SHOULD BE ADDED / REMOVED / REPLACED / REBUILT

### Add

- **Structured mission + audience** as first step (outcome and “who”) with presets; keep playbook selector but ensure it sets mission/audience.
- **Business context step** with short natural-language input + optional AI extraction (name, what we do, who we serve); optional “Import from URL” for FAQs.
- **Explicit guardrails step or block** inside Behavior: “What should your AI never do?” with presets + custom rules; persist to `never_say` / transfer rules.
- **Preview section** in Go Live: “Preview — how your AI will respond” for 3 scenarios (booking, pricing, after-hours) with client-side generated text and blue response boxes.
- **Readiness checklist** with clickable items linking to the right step/section; minimum score or required items to enable “Launch my AI.”
- **Test call failure handling:** Clear message when voice/config missing + “Skip to launch” so users aren’t stuck.
- **Optional research layer:** Toggle “Use safe web research to enrich context” and “What to research” (company, location); backend service that returns structured snippet; user confirms in UI. (Can be Phase 2.)
- **Campaign/use-case presets** in campaign creation (already added: follow-up, reactivation, reminder, qualification).
- **Call drawer:** Duration and outcome (already added); “Add to knowledge” wired to knowledge page with toast (already added).
- **Knowledge:** Bulk CSV upload (already added); keep URL import.
- **Call Intelligence:** “Common caller questions” section (already added).

### Remove

- **Nothing that violates doctrine.** Do not add: prompt editors, campaign builders, workflow builders, or general “ask the AI anything.”
- **Redundant or confusing copy** (e.g. duplicate “Welcome back,” vague “Coming soon” where we have a real flow).
- **Single giant form** for agent config; keep or refactor into the 7-step flow above.

### Replace

- **Agent “Mission” step:** Evolve from template-only to **outcome + audience** first, then playbook presets that pre-fill from that. Keep 6 playbooks (Receptionist, Appointment Booker, Lead Qualifier, Outbound Caller, Customer Support, Custom).
- **Behavior step:** Already has “What should your AI never do?”; ensure it’s prominent and saved to `never_say`. Keep transfer and after-hours in same or adjacent step.
- **Go Live step:** Ensure Preview section and readiness checklist are above the fold; “Launch my AI” gated on readiness.

### Rebuild

- **Do not rebuild:** Core architecture (Signal → State → Decision → Action → Proof), billing, auth, onboarding shell, design tokens, or telephony integration. **Rebuild only** the setup/control UX and flow so they match this vision: goal-first, structured control, preview, test, readiness-gated launch.

---

## SECTION 9 — IMPLEMENTATION STRATEGY

### Phase order

1. **Inspect and map** — Understand current agent setup (AgentsPageClient, steps, persistence, create-vapi, readiness). Map where mission, context, guardrails, knowledge, transfer, test, launch live.
2. **Unify step sequence** — Align to: Mission (outcome + audience + playbooks) → Context (business + guardrails) → Voice & behavior (voice, greeting, never-say) → Knowledge (FAQs, URL import, bulk CSV) → Calls & escalation (transfer, after-hours) → Test (preview + test call) → Launch (readiness + launch). Rename or reorder existing steps if needed; preserve data model.
3. **Mission and context** — Ensure Mission step captures outcome and audience; playbooks pre-fill. Add or refine Context (business description + guardrails) so it’s explicit and saved.
4. **Preview and readiness** — Harden “Preview — how your AI will respond” (3 scenarios, client-side). Ensure readiness score and checklist drive “Launch” enablement; fix any missing links.
5. **Test call UX** — Already added “Test calls require voice service configuration…” and “Skip to launch.” Ensure all error paths show a clear message, not silent failure.
6. **Research (optional Phase 2)** — Add research policy to agent config; backend endpoint that fetches public company/location summary; UI to enable and confirm. No research in live call until explicitly designed.
7. **Polish** — Copy pass, empty states, loading states, toasts for save/sync. Ensure no blue buttons except where used for status/selection per design system.
8. **Verify** — Full flow: sign up → onboarding → agent setup (all 7 steps) → test → launch. Build and lint green.

### Safety

- Do not change doctrine or architecture layers. All new behavior must feed into existing Signal/State/Decision/Action/Proof pipeline where applicable.
- Preserve API contracts (create-vapi, workspace config, knowledge import-url, etc.) unless the prompt explicitly requests an API change.
- Keep mobile and accessibility in mind; no removal of focus management or keyboard shortcuts.

---

## SECTION 10 — FINAL CURSOR MASTER PROMPT

**Full prompt (copy-paste ready):** `docs/CURSOR_MASTER_PROMPT_ARCHITECTURE_IMPLEMENTATION.md`

That file contains the implementation-grade Cursor master prompt. It will:

1. Instruct Cursor to inspect the codebase (agents, onboarding, readiness, knowledge, calls, campaigns, settings/phone).
2. Map current setup flow and data model (agent, knowledge_base, rules, etc.).
3. Create a phased implementation plan that matches Section 9.
4. Rebuild the setup flow to match the ideal 7-step sequence (Mission → Context → Voice & behavior → Knowledge → Calls & escalation → Test → Launch) without removing existing functionality that works.
5. Ensure structured control (mission, guardrails, knowledge, transfer, after-hours) is the source of truth; no new prompt box.
6. Implement or refine: preview section, readiness checklist with clickable items, test call graceful failure + skip to launch.
7. Add or refine: business context step, guardrails prominence, research policy (optional/Phase 2).
8. Improve UX to premium standard: copy, spacing, presets, empty states, toasts.
9. Preserve: doctrine, constitution, architecture, billing, auth, design system (white primary, zinc, no blue buttons except status).
10. Run `npm run build` and `npm run lint` after each phase; fix all errors.

End of document.
