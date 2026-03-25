# Cursor Master Prompt — RecallTouch Calling Hub Transformation

**Copy from "PROMPT START" to "PROMPT END" and paste into Cursor.**

---

## PROMPT START

# CURSOR MASTER PROMPT — RECALLTOUCH CALLING HUB TRANSFORMATION

Read this ENTIRE prompt before editing ANY file. Run `npm run build` first to confirm green. Execute each phase in order. Commit and push after each phase.

---

## PHASE 1: AGENT SETUP — PLAYBOOK TEMPLATE SYSTEM

### 1A: Playbook selector in Mission step (Step 1)

At the TOP of the Mission step, before any form fields, add a playbook template selector with 6 playbooks: Receptionist, Appointment Booker, Lead Qualifier, Outbound Caller, Customer Support, Custom. Each card: icon, label, short description. Selected state: `border-blue-500/40 bg-blue-500/[0.06]`. `applyPlaybook(defaults)` fills purpose, primaryGoal, greeting, targetAudience. Custom has empty defaults.

### 1B: "Never do" guardrails in Behavior step (Step 4)

At the TOP of the Behavior step add "What should your AI never do?" with 5 checkbox presets: Never discuss pricing or give specific quotes, Never schedule outside business hours, Never make promises about delivery or timelines, Never discuss competitors by name, Never share internal company information. Plus custom input (press Enter to add). Persist to `agent.rules.neverSay` (or `agent.neverSay`).

---

## PHASE 2: PHONE NUMBER — TWO-OPTION REDESIGN

Replace single-card phone setup with two cards. **Left:** "Get a new AI number" — blue icon, Recommended badge, area code input, "Get my number →" primary button, "Takes about 10 seconds." **Right:** "Use your existing number" — green icon, phone input, "Verify my number →" secondary, "We'll send a verification code." Both cards: `bg-[#161B22] border border-white/[0.08] rounded-2xl p-6`. After Option A success: show assigned number + "Your AI number is ready!". After Option B verify: show carrier forwarding instructions (iPhone/Android/Business) + "Test forwarding" link/button.

---

## PHASE 3: SCENARIO PREVIEW IN GO LIVE STEP

In Go Live step, above "Launch my AI", add "Preview — how your AI will respond" with 3 scenarios: (1) Someone calls to book an appointment — response from greeting + booking logic, (2) Someone asks about pricing — response from neverDo or FAQ, (3) Someone calls after hours — response from afterHours rules. Client-side generated text only; blue response boxes `bg-blue-500/[0.06] border-l-2 border-blue-500/30`.

---

## PHASE 4: CAMPAIGN TYPE PRESETS

In campaign creation panel, add type selector grid: Lead follow-up, Reactivation, Appointment reminder, Qualification. Each pre-fills campaign name/template/audience when selected. Selected state: `border-blue-500/40 bg-blue-500/[0.06]`.

---

## PHASE 5: CALLS — CSV EXPORT + DETAIL DRAWER

5A: "Export CSV" button in calls page header; implement GET /api/calls/export (workspace-scoped, CSV with Date,Phone,Duration,Status,Outcome,Summary).

5B: Clicking a call row opens right-side drawer (slide-out) with: caller info, date/time, duration, outcome, transcript, key moments, "Add to knowledge" button.

---

## PHASE 6: LEADS — INLINE QUICK-ADD + EXPORT

Inline form above leads table: Name, Phone, Email inputs + "+ Add" button. Add GET /api/leads/export for CSV export.

---

## PHASE 7: KNOWLEDGE — URL IMPORT + BULK CSV

7A: "Import from URL" button; POST /api/knowledge/import-url that fetches URL, strips HTML, calls Claude to extract Q&A pairs, returns entries for user to confirm/add.

7B: Bulk CSV upload — accept CSV with Question,Answer columns, parse and create entries.

---

## PHASE 8: CALL INTELLIGENCE — PERFORMANCE METRICS

Add "Performance overview" card: Calls analyzed, Insights extracted, Applied to agent, Avg quality. Plus "Common caller questions" section aggregating questions from analyzed transcripts.

---

## PHASE 9: HOMEPAGE — PRICING + USE-CASES + FOOTER

9A: Pricing section (3 tiers: Starter, Pro, Business) with feature lists and CTAs.

9B: Use-case cards: Inbound / Outbound / Booking with icons and descriptions.

9C: Footer with brand, nav links, copyright.

---

## PHASE 10: DASHBOARD — CLICKABLE CHECKLIST

Readiness checklist items must be clickable links to the relevant setup page when incomplete. Activity section empty state with helpful CTAs.

---

## PHASE 11: GLOBAL ENHANCEMENTS

11A: Toast system (sonner) — Toaster in layout; wire toast.success/error on save/launch/export.

11B: Shared ConfirmDialog for destructive actions (delete, revoke, cancel).

11C: Agent card quick actions — Edit / Test / Launch on each agent card.

11D: Settings danger zone — red-bordered section: Delete all data, Delete account (with confirmations).

11E: Keyboard shortcuts — Cmd+K (command palette), Cmd+1-4 (nav).

11F: Test call graceful handling — When Vapi/config missing, show: "Voice testing requires service configuration. You can skip this and launch, or contact support." + Skip to launch. No silent failure.

---

## PHASE 12: BUILD + VERIFY

`npm run build` and `npm run lint`. Zero errors. Verify checklist: playbook selector, guardrails, scenario preview, phone two-option, campaign presets, calls export+drawer, leads quick-add+export, knowledge URL+CSV, call intelligence metrics, homepage pricing+footer, clickable checklist, toasts, confirmations, agent quick actions, test call handling, build green.

---

## EXECUTION ORDER

Phases 1–12 in order. `npm run build` after EACH phase. Commit after each phase.

## DO NOT MODIFY

Homepage hero static demo, sidebar structure, onboarding wizard, agent stepper structure, readiness scoring, billing modal, integrations page, design tokens, accessibility, error boundaries, API fallbacks, mobile sidebar, SEO, HydrationGate, auto-save, lifecycle emails.

## PROMPT END
