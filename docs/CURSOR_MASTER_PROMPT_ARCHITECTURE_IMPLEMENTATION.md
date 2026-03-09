# Cursor Master Prompt — Architecture Implementation

**Copy-paste this entire prompt into Cursor to implement the Product Architecture Vision.**

---

## PROMPT START (copy from here)

You are implementing the **Product Architecture Vision** for Recall Touch as defined in `docs/PRODUCT_ARCHITECTURE_VISION.md`. Your job is to align the codebase with that vision: ideal setup flow, structured agent control, preview and readiness, test-call handling, and premium UX—without violating the doctrine (`docs/RECALL_TOUCH_DOCTRINE.md`) or constitution (`docs/RECALL_TOUCH_CONSTITUTION.md`).

### MANDATORY: INSPECT FIRST

Before making any edits:

1. **Map the current agent setup flow**
   - Read `src/app/app/agents/AgentsPageClient.tsx`: identify all steps (Mission/Identity, Voice, Knowledge, Behavior, Test, Go Live). List step IDs, order, and what data each step reads/writes.
   - Locate where `agent` state is defined (useState, shape: name, template, purpose, primaryGoal, greeting, voice, faq, neverSay, transfer rules, afterHoursMode, vapiAgentId, etc.).
   - Find where agent is persisted (PATCH /api/agents/[id], create-vapi, etc.) and what the backend expects.

2. **Map readiness and launch**
   - Read `src/lib/readiness.ts`: how `calculateReadiness` works and what items/hrefs it returns.
   - Find where readiness is used: `src/app/app/activity/page.tsx`, `AgentsPageClient.tsx` (Go Live step). Confirm checklist items are clickable and link to the correct setup section.
   - Find "Launch my AI" / onActivate: what gates it (e.g. allowActivate, canActivate) and how.

3. **Map knowledge and context**
   - Knowledge: `src/app/app/knowledge/page.tsx`, `/api/knowledge/import-url`, bulk CSV. How entries are stored and how they feed the agent (if at all in this codebase).
   - Business context: where is business name, address, website, timezone stored? (e.g. workspace, onboarding, settings/business.) How does the agent get “what the business does” or “who we serve”?

4. **Map phone and test call**
   - `src/app/app/settings/phone/page.tsx`: two-option flow (new number / existing number). Confirm it matches the vision (Option A blue accent, Option B green, success copy, forwarding instructions).
   - In AgentsPageClient, find TestTab / startTestCall: when it fails (no assistantId, no publicKey), what message is shown? Ensure it shows: "Test calls require voice service configuration. Contact support or skip to launch." and a "Skip to launch →" button that calls onSkipToLaunch (Go Live step).

5. **Map campaigns and calls**
   - Campaigns: `src/app/app/campaigns/page.tsx` — campaign type presets (followup, reactivation, reminder, qualification) and how they pre-fill form.
   - Calls: `src/app/app/calls/page.tsx` — Export CSV, detail drawer (duration, outcome), "Add to knowledge" (sessionStorage + navigate to knowledge; knowledge page reads and adds draft entry + toast).

6. **Map design system**
   - Primary button: `bg-white text-black`. No blue/indigo/purple on buttons. Accent colors only for status (e.g. lead=blue, appointment=green). Cards: `bg-zinc-900/50` or equivalent, `border border-zinc-800`, `rounded-2xl`. Inputs: `bg-zinc-900 border border-zinc-800 rounded-xl`. Ensure any new UI follows this.

### IMPLEMENTATION PHASES

Execute in order. Run `npm run build` and `npm run lint` after each phase; fix all errors before proceeding.

---

**PHASE 1 — ALIGN STEP SEQUENCE AND LABELS**

- Ensure the agent setup has exactly these conceptual steps in this order: (1) Mission, (2) Voice, (3) Knowledge, (4) Behavior, (5) Test, (6) Go Live. If the current code uses different names (e.g. Identity for Mission), keep the code names but ensure labels and descriptions match the vision: Mission = outcome + audience + playbooks; Behavior = guardrails + transfer + after-hours; Test = preview + test call; Go Live = readiness + launch.
- In the Mission step, ensure the first thing the user sees is outcome/audience (or playbook selector that implies outcome). Current TEMPLATES (receptionist, appointment_setter, lead_qualifier, follow_up, support, scratch) and PLAYBOOK_ICONS are already present; do not remove them. Ensure "Start with a playbook" is the prominent block and applyTemplate correctly fills purpose, primaryGoal, greeting (and for scratch/custom, only template id).
- Do not add a free-form "prompt" box. All control remains structured (mission, guardrails, knowledge, rules).

**Deliverable:** Step order and labels match vision; Mission step leads with playbooks; no new prompt editor. Build + lint pass.

---

**PHASE 2 — BUSINESS CONTEXT AND GUARDRAILS**

- **Business context:** Identify where business name, website, address, timezone, "what we do," "who we serve" are stored. If there is no single "business context" block in the agent flow, add an optional section (e.g. in Mission or a dedicated "Context" step) that at minimum: (1) Shows business name and optional "What does your business do?" short text, (2) Persists to agent or workspace so the runtime can use it. Reuse existing workspace/onboarding fields if they exist; otherwise add minimal fields to the agent (e.g. `businessContext: string`, `targetAudience: string`) and persist them in PATCH /api/agents/[id] and in create-vapi payload if the backend accepts them.
- **Guardrails:** In the Behavior step, "What should your AI never do?" must be at the top with the 5 presets (Never discuss pricing, Never schedule outside hours, Never promise delivery dates, Never discuss competitors, Never share internal info) plus custom rule input. Data is already `agent.neverSay` (array). Ensure the UI is prominent and the copy is clear. Do not add a generic "system prompt" or "custom instructions" free-text box; only structured never-say and transfer rules.

**Deliverable:** Business context (minimal) and guardrails are explicit and saved. Build + lint pass.

---

**PHASE 3 — PREVIEW AND READINESS**

- **Preview:** In the Go Live step, the section "Preview — how your AI will respond" must show 3 scenarios: (1) Someone calls to book an appointment, (2) Someone asks about pricing, (3) Someone calls after hours. Each scenario has a short label and a response box (e.g. `bg-blue-500/[0.06] border border-blue-500/[0.1] rounded-lg p-3`). The response text is computed client-side from `agent.primaryGoal`, `agent.greeting`, `agent.faq`, `agent.neverSay`, `agent.afterHoursMode`—no API call. Logic already exists in GoLiveStepContent; verify it matches and that the heading is "Preview — how your AI will respond."
- **Readiness:** Use `calculateReadiness(workspace, agent)` from `src/lib/readiness.ts`. Ensure the Go Live step shows a readiness progress bar and a checklist of items (business, use cases, agent, voice, greeting, knowledge, behavior, phone, tested, launched) with each item linking to the correct href (e.g. /app/settings/business, /app/agents, /app/settings/phone). "Launch my AI" must be disabled when `!allowActivate` (e.g. readiness &lt; 40% or missing required fields). Copy: "Complete the required items above to activate (at least 40% readiness)." if not ready.

**Deliverable:** Preview section and readiness checklist are correct and gating. Build + lint pass.

---

**PHASE 4 — TEST CALL AND LAUNCH UX**

- **Test call failure:** In the Test step (TestTab), when startTestCall fails because assistantId is null or publicKey is missing, the error message must be exactly: "Test calls require voice service configuration. Contact support or skip to launch." When that error is shown, a "Skip to launch →" button must be visible and must call `onSkipToLaunch` (which navigates to the Go Live step). Implemented in AgentsPageClient TestTab; verify and fix if any path still shows a generic error without the skip option.
- **Launch:** Ensure "Launch my AI" button is the primary CTA in Go Live, and that after a successful launch the user sees clear success feedback (e.g. toast "Your AI agent is live!" and optional confetti). No silent success.

**Deliverable:** Test failure message and Skip to launch work; Launch success is visible. Build + lint pass.

---

**PHASE 5 — UX POLISH AND COPY**

- **Copy pass:** Replace any vague or duplicate copy. Ensure: "What should this agent achieve?" or equivalent in Mission; "What should your AI never do?" in Behavior; "Preview — how your AI will respond" in Go Live; "Your AI is X% ready" and "Launch my AI" in Go Live.
- **Empty states:** Where lists are empty (e.g. no FAQs), show a short message and a CTA ("Add entry," "Import from URL," "Bulk upload (CSV)").
- **Toasts:** Use sonner for save success, sync success, export success, and errors. Already used in leads, calls, knowledge; ensure agent save/sync and launch also use toast where appropriate.
- **Design system:** No blue/indigo/purple on buttons; primary = white. Use blue only for status (e.g. selected playbook card, lead badge) or preview response boxes as specified. Cards and inputs use zinc/black theme.

**Deliverable:** Copy and empty states updated; toasts consistent; design system respected. Build + lint pass.

---

**PHASE 6 — VERIFY END-TO-END**

- Run the full flow: Homepage → Sign in or Activate → Onboarding (if any) → App → Agents → Create or edit agent. Complete Mission (playbook), Voice, Knowledge (at least 3 FAQs), Behavior (at least one guardrail), Test (preview visible; test call or skip), Go Live (readiness visible, Launch enabled when ready). Then Settings → Phone: confirm two-option flow and success copy. Then Calls: Export CSV, open a call, check drawer has duration/outcome and "Add to knowledge" goes to knowledge with draft + toast. Then Knowledge: Import from URL and Bulk upload CSV work. Then Campaigns: type presets pre-fill form.
- Run `npm run build` and `npm run lint`. Fix any errors. Ensure no TypeScript or ESLint failures.

**Deliverable:** Full flow works; build and lint green.

---

### DO NOT

- Add a prompt editor, workflow builder, or campaign builder. Constitution forbids them.
- Bypass the existing architecture (Signal → State → Decision → Action → Proof). Agent config is input to the conversation/runtime layer; do not change core pipeline.
- Remove or break existing features: phone two-option flow, playbooks, guardrails, knowledge URL import, bulk CSV, campaign presets, call drawer, Add to knowledge, Call Intelligence common questions, readiness checklist, Cmd+K / Cmd+1–4 shortcuts, danger zone in settings.
- Change billing, auth, or design tokens without explicit requirement.
- Introduce blue/indigo/purple primary buttons.

### PRESERVE

- Doctrine and constitution. All capabilities must stay within allowed boundaries (continuing conversations, clarifying intent, scheduling, protecting attendance, recovering opportunities, maintaining relationships).
- Current agent data model and API contracts unless you are explicitly adding new fields (e.g. businessContext) in a backward-compatible way.
- Mobile and accessibility: focus management, keyboard support, aria where needed.

---

Execute the phases in order. After each phase, run `npm run build` and `npm run lint` and fix all issues. Report at the end: what was changed, what was added, and confirmation that build and lint pass.

## PROMPT END (copy to here)
