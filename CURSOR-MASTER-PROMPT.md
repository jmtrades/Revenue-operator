# RECALL TOUCH — FINAL LAUNCH PERFECTION PROMPT

> **You are the lead engineer executing the FINAL perfection pass before Recall Touch goes live to paying customers. Every task is MANDATORY. Complete them in exact order. Do NOT plan, explain, or narrate — WRITE CODE. After each phase, run `npx tsc --noEmit && npm run build && npm test` and fix all failures before proceeding. Commit and push after each phase.**

---

## TECH STACK (DO NOT DEVIATE)

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| Framework | Next.js (App Router) | 16.1.6 |
| UI | React | 19.2.3 |
| Database | Supabase Postgres | Schema: `revenue_operator` |
| Auth | Supabase Auth | @supabase/ssr ^0.8.0 |
| Voice AI | Vapi | @vapi-ai/web ^2.5.2 |
| TTS | ElevenLabs | eleven_turbo_v2_5 |
| STT | Deepgram | nova-2 |
| LLM | Claude Sonnet 4 | claude-sonnet-4-20250514 |
| Billing | Stripe | ^20.3.1 |
| Styling | Tailwind CSS v4 | `@theme` inline in globals.css |
| Animation | Framer Motion | ^12.35.2 — `ease: 'easeOut'` string ONLY, NEVER cubic-bezier arrays |
| Charts | Recharts | ^3.8.0 |
| Icons | Lucide React | ^0.575.0 |
| Validation | Zod | ^4.3.6 |
| i18n | next-intl | ^4.8.3 (6 locales: en, es, fr, de, pt, ja) |
| Flow Editor | @xyflow/react | ^12.10.1 |
| DnD | @dnd-kit | Kanban boards |
| Toasts | Sonner | ^2.0.7 |

**HARD RULES:**
- NO external UI libraries (no shadcn, Chakra, MUI). Custom components in `src/components/ui/` only.
- `cn()` utility from `src/lib/utils.ts` for conditional classes (clsx + tailwind-merge).
- `"use client"` on EVERY component that uses hooks, event handlers, or browser APIs.
- Every Framer Motion `ease` prop MUST be a string like `'easeOut'` — NEVER a cubic-bezier array.
- Pricing is canonical: Starter $297/mo, Growth $497/mo, Scale $2,400/mo, Enterprise Custom.
- Dark theme tokens: bg `#0A0A0B`, surface `#111113`, accent `#4F8CFF`, green `#00D4AA`.
- Every API route MUST call `requireWorkspaceAccess(req)` or validate session on line 1.
- All user-facing strings MUST use `useTranslations()` / `getTranslations()` — NEVER hardcode English.

---

## PHASE 0 — ELIMINATE LEGACY DUPLICATION & MOCK DATA (Critical Cleanup)

### Task 0.1: Remove Legacy `/dashboard/` Routes
The entire `src/app/dashboard/` directory (53 subdirectories, ~200+ files) is a LEGACY DUPLICATE of `src/app/app/`. The active product uses `/app/*` routes exclusively.

1. Verify no imports or links anywhere in `src/` reference `/dashboard/` routes (grep for `"/dashboard` and `href.*dashboard` excluding `nav.dashboard` i18n keys).
2. If any links point to `/dashboard/*`, redirect them to the equivalent `/app/*` route.
3. Delete the entire `src/app/dashboard/` directory.
4. Run `npx tsc --noEmit` — fix any broken imports.
5. Run `npm run build` — fix any build errors.

### Task 0.2: Replace Mock Data with Real API Connections

Six mock data files exist in `src/lib/mock/`: `campaigns.ts`, `compliance.ts`, `developer.ts`, `inbox.ts`, `knowledge.ts`, `team.ts`.

For each:

**Inbox** (`src/app/app/inbox/page.tsx`):
1. Remove import of `@/lib/mock/inbox` types as data source.
2. Create API endpoint `/api/inbox` if it doesn't already return real thread data.
3. Fetch threads from `/api/inbox` with workspace context.
4. If no threads exist, show proper empty state: "No messages yet. Threads will appear here as your agents handle calls and send follow-ups."
5. Keep the type definitions if useful, but data must come from API.

**Knowledge** (`src/app/app/knowledge/page.tsx`):
1. If knowledge page reads from `@/lib/mock/knowledge`, replace with `/api/knowledge` fetch.
2. Ensure CRUD operations (add/edit/delete knowledge entries) persist to Supabase.
3. Empty state: "No knowledge entries yet. Add FAQs, documents, or URLs to help your agents answer questions accurately."

**Team** (`src/app/app/team/page.tsx` or equivalent):
1. Replace mock team data with `/api/workspace/team` or `/api/team` endpoint.
2. Ensure invite flow creates real records.
3. Empty state: "You're the only team member. Invite colleagues to collaborate."

**Campaigns** (`src/app/app/campaigns/page.tsx`):
1. If campaign templates or sample campaigns come from `@/lib/mock/campaigns`, replace with API data.
2. Templates can remain as constants (they're not user data), but sample campaigns must be empty for new workspaces.
3. Empty state: "No campaigns yet. Create your first outbound campaign to re-engage leads or book appointments."

**Compliance & Developer**:
1. Check if these pages use mock data. If so, connect to real API endpoints.
2. Developer webhooks page should only show webhooks the user has actually created.

After all replacements, delete every file in `src/lib/mock/` that is no longer imported anywhere.

### Task 0.3: Remove Stale "Coming Soon" for Google Sign-In
Google OAuth button exists on `/sign-in` page. In `src/app/sign-in/SignInForm.tsx`:
1. If Google OAuth is not actually configured in Supabase (check `/api/auth/google`), keep the toast but change copy to: "Google sign-in is being configured. Use email and password for now."
2. If Google OAuth IS configured and working, remove the "coming soon" toast and let it work.

**After Phase 0:** `npx tsc --noEmit && npm run build && npm test` — fix all failures.
```bash
git add -A && git commit -m "feat: Phase 0 — remove legacy dashboard routes, replace mock data, clean stale states" && git push origin main
```

---

## PHASE 1 — COMPLETE i18n COVERAGE (Every User-Facing String)

### Task 1.1: Audit and Migrate All Hardcoded English Strings

The following files contain hardcoded English strings that MUST be replaced with `t()` calls:

**`src/app/app/calls/page.tsx`:**
- `"Request timed out. Try again."` → `t("calls.errors.timeout")`
- `"Could not load calls for this workspace."` → `t("calls.errors.loadFailed")`
- `toast.error("Export failed. Try again.")` → `toast.error(t("calls.errors.exportFailed"))`
- `toast.success("Calls exported. Check your downloads.")` → `toast.success(t("calls.toast.exportSuccess"))`
- `"No calls yet"` → `t("calls.empty.title")`
- Every filter label, column header, and action button text.

**`src/app/app/leads/page.tsx`:**
- All toast messages (success/error for lead updates, moves, deletes).
- Kanban column headers if hardcoded.
- Filter labels and dropdown options.
- Empty state text.

**`src/app/app/campaigns/page.tsx`:**
- `TYPE_OPTIONS` array labels (lead follow-up, appointment reminder, reactivation, cold outreach, review request, custom).
- `SOURCE_OPTIONS` array labels.
- All toast messages.
- Status labels (Draft, Active, Paused, Completed).

**`src/app/app/settings/phone/page.tsx`:**
- Phone formatting and validation messages.
- Provider labels and descriptions.

**`src/app/app/appointments/page.tsx`:**
- `"Today"`, `"Tomorrow"` date labels — use `date-fns` locale-aware formatting or i18n keys.
- Status labels (Confirmed, Pending, Cancelled, Completed).

**`src/app/app/call-intelligence/page.tsx`:**
- Quality bucket labels (Excellent, Good, Needs Review, Flagged).
- Insight category labels.
- Chart axis labels.

**`src/app/app/agents/AgentsPageClient.tsx`:**
- All step labels, FAQ default text, greeting templates, BANT question labels, objection handling defaults.
- Every string in the 6-step wizard that a user sees.

**`src/app/app/calls/live/page.tsx`:**
- "Listen in — coming soon", "Whisper — coming soon", "Barge in — coming soon" → use i18n keys.

**`src/app/app/calendar/page.tsx`:**
- "Two-way sync with Outlook Calendar (coming soon)." → i18n key.

**`src/app/app/settings/integrations/page.tsx`:**
- CRM names/descriptions can stay as constants, but "Coming soon" label → i18n key.

### Task 1.2: Add All New Keys to ALL 6 Locale Files

For EVERY new key added in Task 1.1, add the corresponding translated value to:
- `src/i18n/messages/en.json`
- `src/i18n/messages/es.json`
- `src/i18n/messages/fr.json`
- `src/i18n/messages/de.json`
- `src/i18n/messages/pt.json`
- `src/i18n/messages/ja.json`

Translations must be real (not copy-pasted English). Use accurate translations for each language:
- Spanish: natural Latin American Spanish
- French: standard French
- German: standard German (watch for longer text in UI)
- Portuguese: Brazilian Portuguese
- Japanese: polite/formal register

### Task 1.3: Verify All Toast Messages Use i18n

Search the entire `src/` directory for `toast.error(`, `toast.success(`, `toast.info(`, `toast.warning(`. Every single one must use a `t()` call, not a hardcoded string. Fix every instance.

**After Phase 1:** `npx tsc --noEmit && npm run build && npm test` — fix all failures.
```bash
git add -A && git commit -m "feat: Phase 1 — complete i18n coverage for all user-facing strings" && git push origin main
```

---

## PHASE 2 — PRODUCT UX HARDENING (Every Page Must Be Launch-Quality)

### Task 2.1: Dashboard Perfection (`src/app/app/activity/page.tsx`)

1. Verify KPI cards show real data from API, not zeros or placeholders for new accounts.
2. For new accounts with zero data, show an onboarding checklist instead of empty charts:
   - [ ] Set up your first agent
   - [ ] Connect a phone number
   - [ ] Make a test call
   - [ ] Add knowledge base entries
   - [ ] Invite team members
   Each item links to the relevant page. Completed items show checkmarks.
3. For accounts with data, verify charts render correctly with real call data.
4. Ensure the date range picker works and updates charts.
5. Ensure the activity timeline shows real recent events.

### Task 2.2: Agents Page — Component Split (`src/app/app/agents/`)

The AgentsPageClient.tsx is 4,338 lines. This is too large. Split it:

1. Extract agent list view into `src/app/app/agents/components/AgentList.tsx`.
2. Extract agent detail/edit panel into `src/app/app/agents/components/AgentDetail.tsx`.
3. Extract the 6-step setup wizard section into `src/app/app/agents/components/AgentSetupSteps.tsx`.
4. Extract voice selection into `src/app/app/agents/components/VoiceSelector.tsx`.
5. Keep AgentsPageClient.tsx as the orchestrator (<500 lines).

For the agent setup experience:
6. Each of the 6 steps (Identity, Voice, Knowledge, Behavior, Test, Go Live) must have:
   - Clear progress indicator showing completion status.
   - Validation that prevents advancing with missing required fields.
   - Helpful placeholder text and guidance copy (via i18n) for every field.
   - Save on every field blur — don't require explicit save button clicks.
7. The "Test" step must actually work:
   - If it's a chat-based test, ensure the test panel connects to the agent configuration.
   - If the test panel is broken or shows errors, fix it.
   - Show clear feedback: "Your agent responded correctly" or "Something went wrong — check your configuration."
8. The "Go Live" step must show a readiness checklist:
   - Agent name set ✓/✗
   - Voice selected ✓/✗
   - Phone number assigned ✓/✗
   - Knowledge base has entries ✓/✗
   - Test call completed ✓/✗
   Block activation until all required items pass.

### Task 2.3: Calls Page Perfection (`src/app/app/calls/page.tsx`)

1. Verify call detail drawer shows: recording player (with AudioPlayer component), full transcript, AI-generated summary, call outcome, duration, sentiment, caller info.
2. Verify the recording player works (play/pause/seek) when audio URL exists.
3. Verify export to CSV includes all visible columns.
4. For calls with no recording (e.g., missed calls), show appropriate state instead of broken player.
5. Verify pagination works correctly with real data.

### Task 2.4: Leads Page — Component Split (`src/app/app/leads/page.tsx` — 1,462 lines)

1. Split into components:
   - `src/app/app/leads/components/LeadsList.tsx` — table view
   - `src/app/app/leads/components/LeadsKanban.tsx` — kanban board
   - `src/app/app/leads/components/LeadDetail.tsx` — detail panel/drawer
2. Verify Kanban drag-and-drop updates lead status via API (not just local state).
3. Verify lead detail panel shows: all contact info, call history, notes, CRM sync status.
4. Verify search works across name, phone, email.
5. Empty state: "No leads yet. Leads will appear here automatically as your agents qualify callers."

### Task 2.5: Campaigns Page Perfection

1. Verify campaign creation flow: name → type → audience filter → sequence builder → schedule → launch.
2. Verify sequence builder lets you add touchpoints (Call, SMS, Email, Wait) and reorder them.
3. Verify audience filters actually filter leads from the database.
4. Verify campaign stats update in real-time (or near-real-time) after launch.
5. Empty state: "No campaigns yet. Create an outbound campaign to automatically follow up with leads."

### Task 2.6: Inbox Perfection

1. After replacing mock data (Phase 0), verify inbox shows real message threads.
2. Verify reply functionality sends real SMS/email via the appropriate channel.
3. Verify thread grouping by contact works correctly.
4. Verify unread count updates when messages are read.
5. Verify channel filter (Phone, SMS, Email, WhatsApp) works.
6. Empty state: "No messages yet. Conversations will appear here as your agents interact with callers."

### Task 2.7: Appointments Perfection

1. Verify calendar view renders appointments on correct dates.
2. Verify list view shows all appointment details (contact, time, type, status, source agent).
3. Verify status changes (confirm, cancel, complete) persist via API.
4. Verify clicking an appointment shows full details with link to the related call/lead.
5. Empty state: "No appointments yet. Your agents will book appointments here automatically."

### Task 2.8: Knowledge Base Perfection

1. After replacing mock data (Phase 0), verify CRUD operations persist to Supabase.
2. Verify FAQ entries are correctly passed to agent system prompts when the agent is active.
3. Verify document upload works (if supported).
4. Verify URL ingestion works (if supported — endpoint `/api/agent/seed-knowledge`).
5. Show clear indication of which agents use which knowledge entries.
6. Empty state: "No knowledge entries. Add FAQs, documents, or URLs so your agents can answer questions accurately."

### Task 2.9: Call Intelligence Perfection (`src/app/app/call-intelligence/page.tsx` — 937 lines)

1. Verify quality scoring displays correct colors (Excellent green #00D4AA, Good blue #4F8CFF, Review orange #FFB224, Flagged red #FF4D4D).
2. Verify line chart shows real call quality trends over time.
3. Verify insight cards show actionable AI-generated insights from call data.
4. If no calls exist, show empty state: "Call intelligence will appear here after your agents handle calls. You'll see quality scores, trends, and AI-generated insights."
5. Split into sub-components if over 500 lines.

### Task 2.10: Settings Pages Perfection

**Phone Settings** (`src/app/app/settings/phone/page.tsx` — 894 lines):
1. Verify phone number provisioning flow works: search available numbers → select → provision via Twilio API.
2. Verify "Add personal number" flow works with call forwarding setup.
3. Verify number assignment to agents works.
4. Show clear status for each number: Active, Pending, Failed.
5. Split into sub-components (<500 lines per file).

**Integration Settings** (`src/app/app/settings/integrations/page.tsx`):
1. For active integrations (Salesforce, HubSpot, Google Contacts, Microsoft 365): verify OAuth connect flow works.
2. For "coming soon" integrations (Zoho, Pipedrive, GoHighLevel): show clean "Coming soon" badge with optional "Get notified" action.
3. Verify connected integrations show sync status (last synced, records synced, errors).
4. Verify disconnect flow works cleanly.

**Business Settings, Billing, Compliance, Lead Scoring Config:**
1. Verify each settings page loads, saves, and persists changes.
2. Verify refresh after save shows the saved values.
3. Every form must have proper validation with error messages (via i18n).

### Task 2.11: Team & Billing

1. Verify team invite flow sends real invitation (email or link).
2. Verify role assignment works (owner, admin, operator, closer, auditor, compliance).
3. Verify billing page shows current plan, usage, and upgrade/downgrade options.
4. Verify Stripe checkout integration works for plan changes.
5. If trial is active, show clear trial status with days remaining.

**After Phase 2:** `npx tsc --noEmit && npm run build && npm test` — fix all failures.
```bash
git add -A && git commit -m "feat: Phase 2 — product UX hardening, component splits, empty states, real data" && git push origin main
```

---

## PHASE 3 — ONBOARDING & ACTIVATION (Speed to First Value)

### Task 3.1: Onboarding Wizard Polish (`src/app/activate/ActivateWizard.tsx`)

The 5-step activation wizard (Business → Agent → Customize → Test → Activate) must be flawless:

1. **Step 1 (Business):** Validate business name (required), phone (valid format), industry (required). Show inline validation errors immediately, not on submit.
2. **Step 2 (Agent):** Template selection must show clear descriptions of what each template does. Highlight the recommended template for the selected industry.
3. **Step 3 (Customize):** Voice preview must play audio samples. Greeting field must have a smart default based on business name and template. Hours selector must be intuitive.
4. **Step 4 (Test):** The test experience must actually simulate a conversation with the configured agent. If the test panel doesn't work, this is a LAUNCH BLOCKER — fix it. Show the user exactly what their agent will say and do.
5. **Step 5 (Activate):** Show a summary of everything configured. One-click "Activate Agent" button. After activation, redirect to dashboard with success state.

Split ActivateWizard.tsx (1,042 lines) into step components:
- `src/app/activate/steps/BusinessStep.tsx`
- `src/app/activate/steps/AgentStep.tsx`
- `src/app/activate/steps/CustomizeStep.tsx`
- `src/app/activate/steps/TestStep.tsx`
- `src/app/activate/steps/ActivateStep.tsx`

### Task 3.2: Post-Onboarding Dashboard State

When a user completes onboarding and lands on the dashboard for the first time:
1. Show a congratulations banner: "Your agent is live! Here's what happens next."
2. Show the onboarding checklist from Task 2.1 with the first items already checked.
3. Provide a "Make a test call" CTA that walks them through calling their own number.
4. After the first real call comes in, replace the onboarding state with the real dashboard.

### Task 3.3: Empty → First Value Transitions

For EVERY page that starts empty for new users, the empty state must:
1. Explain what will appear there.
2. Provide a single clear action to get started.
3. Link to the relevant setup page or documentation.
4. Use the EmptyState component from `src/components/ui/EmptyState.tsx` consistently.
5. Never show a blank white screen, a spinner that never resolves, or raw "No data" text.

**After Phase 3:** `npx tsc --noEmit && npm run build && npm test` — fix all failures.
```bash
git add -A && git commit -m "feat: Phase 3 — onboarding perfection, post-activation states, empty state consistency" && git push origin main
```

---

## PHASE 4 — VISUAL SYSTEM, MOBILE & PERFORMANCE

### Task 4.1: Dark Theme Token Audit

Open `src/app/globals.css` and verify ALL theme tokens:
- `--bg`: `#0A0A0B`
- `--surface`: `#111113`
- `--surface-hover`: `#1A1A1D`
- `--accent`: `#4F8CFF`
- `--accent-hover`: `#6BA0FF`
- `--green` / `--success`: `#00D4AA`
- `--red` / `--error`: `#FF4D4D`
- `--orange` / `--warning`: `#FFB224`
- `--text-primary`: `#FAFAFA`
- `--text-secondary`: `#A0A0A0`
- `--border`: `#2A2A2D`

Search the entire `src/` for any hardcoded color values (#hex or rgb) that should use CSS variables instead. Replace them.

### Task 4.2: Mobile Responsiveness Audit

Test every major page at 375px width (iPhone SE). For each page:
1. No horizontal overflow/scroll.
2. No text truncation that hides meaning.
3. Tables convert to card layouts on mobile.
4. Navigation collapses to hamburger menu.
5. Modals/drawers are full-screen on mobile.
6. Touch targets are at least 44x44px.
7. Forms are usable with mobile keyboard.

Pages to verify at 375px:
- Homepage (all sections)
- `/pricing`
- `/sign-in`
- `/activate` (all 5 steps)
- `/app/activity` (dashboard)
- `/app/agents` (list + detail)
- `/app/calls` (list + detail drawer)
- `/app/leads` (list + kanban)
- `/app/campaigns`
- `/app/inbox`
- `/app/appointments`
- `/app/settings/*`

### Task 4.3: Framer Motion Audit

Search entire `src/` for:
1. Any `ease:` prop with an array value `[0.x, 0.x, 0.x, 0.x]` — replace with `'easeOut'` or `'easeInOut'`.
2. Any `cubic-bezier` string — replace with named easing.
3. Verify all `motion.div`, `motion.section`, etc. have reasonable animation durations (0.2–0.6s, never >1s for UI elements).
4. Verify `AnimatePresence` is used for exit animations where elements unmount.

### Task 4.4: Performance Quick Wins

1. Verify all images use `next/image` with proper `width`, `height`, and `loading="lazy"`.
2. Verify heavy components (charts, flow builder, agent detail) use `dynamic(() => import(...), { ssr: false })`.
3. Verify API calls in pages use proper caching/deduplication (not fetching the same data twice).
4. Remove any unused imports across the codebase.

### Task 4.5: Console Cleanup

The remaining `console.log` calls are in logger utilities and are acceptable. However:
1. Search for any `console.warn` in `src/` that isn't in a logger utility — remove them.
2. Search for any `console.debug` — remove all.
3. Verify `console.error` calls are in proper error handlers, not leftover debug code.

**After Phase 4:** `npx tsc --noEmit && npm run build && npm test` — fix all failures.
```bash
git add -A && git commit -m "feat: Phase 4 — visual system, mobile responsiveness, performance, cleanup" && git push origin main
```

---

## PHASE 5 — TRUST, SECURITY & PRODUCTION HARDENING

### Task 5.1: API Auth Verification

Check EVERY API route in `src/app/api/` (453 routes). Every non-public route must:
1. Call `getSession(req)` or `requireWorkspaceAccess(req)` on line 1.
2. Return 401 if no valid session.
3. Return 403 if user doesn't have workspace access.

Public exceptions (no auth needed):
- `/api/auth/signup`, `/api/auth/signin`, `/api/auth/google/*`
- `/api/webhooks/*` (Twilio, Vapi, Stripe — these use their own signature verification)
- `/api/cron/*` (these should verify a cron secret header)

For webhook routes, verify each has proper signature verification:
- Twilio: `validateRequest()` or `X-Twilio-Signature` check
- Vapi: verify webhook secret header
- Stripe: `stripe.webhooks.constructEvent()` with signing secret

For cron routes, verify each checks `Authorization: Bearer ${CRON_SECRET}` header.

### Task 5.2: Input Validation

For every API route that accepts POST/PUT/PATCH body:
1. Verify request body is validated with Zod schema.
2. Verify validation errors return 400 with descriptive messages.
3. Verify no SQL injection vectors (all queries use parameterized Supabase client, never raw string concatenation).

### Task 5.3: Error Boundaries

1. Verify `src/components/ErrorBoundary.tsx` wraps the app layout.
2. Verify each major page has a try/catch in its data fetching.
3. Verify API errors display user-friendly messages (via i18n), not raw error objects.
4. Verify network failures show retry options, not blank screens.

### Task 5.4: Rate Limiting Check

Verify the following critical endpoints have rate limiting (either in proxy.ts, API middleware, or per-route):
- `/api/auth/signin` — max 5 attempts per minute per IP
- `/api/auth/signup` — max 3 per minute per IP
- `/api/phone/provision` — max 1 per minute per workspace
- `/api/calls` POST (outbound call initiation) — per workspace limit

If rate limiting doesn't exist, add basic rate limiting using a simple in-memory Map with TTL, or document it as a post-launch infrastructure task with a TODO comment.

### Task 5.5: SEO & Meta Tags

Verify every public page has:
1. `<title>` tag with format "Page Name — Recall Touch"
2. `<meta name="description">` with unique, relevant description
3. `<meta property="og:title">` and `<meta property="og:description">` for social sharing
4. `<meta property="og:image">` pointing to a real OG image (create one at `/public/og-image.png` if missing — 1200x630px with Recall Touch logo and tagline)

Check: `/`, `/pricing`, `/product`, `/demo`, `/docs`, `/privacy`, `/terms`, `/sign-in`, `/activate`, `/industries/*`, `/blog/*`.

### Task 5.6: Legal Pages Verification

Verify `/privacy` and `/terms` pages:
1. Have real, comprehensive content (not placeholder).
2. Reference "Recall Touch" by name.
3. Include effective date.
4. Cover: data collection, cookies, third-party services (Supabase, Stripe, Vapi, Twilio, ElevenLabs), GDPR rights, CCPA rights, data retention, contact information.
5. Footer links to both pages work from every page.

**After Phase 5:** `npx tsc --noEmit && npm run build && npm test` — fix all failures.
```bash
git add -A && git commit -m "feat: Phase 5 — security hardening, auth verification, input validation, SEO" && git push origin main
```

---

## PHASE 6 — FINAL VERIFICATION & LAUNCH READINESS

### Task 6.1: Full Application Smoke Test

Manually verify the following critical user flows work end-to-end:

1. **New User Flow:** Visit homepage → Click "Start Free Trial" → Complete 5-step activation wizard → Land on dashboard with agent active.
2. **Returning User Flow:** Visit `/sign-in` → Enter credentials → Land on dashboard → Navigate to agents → See configured agents.
3. **Agent Creation:** Dashboard → Agents → "New Agent" → Complete all 6 steps → Agent appears in list with "Active" status.
4. **Phone Provisioning:** Settings → Phone → Search for number → Provision → Number appears as "Active" → Assign to agent.
5. **Lead Management:** Leads page → View kanban → Drag lead between columns → Verify status updates persist.
6. **Campaign Creation:** Campaigns → New → Configure → Save as draft → Launch → Verify status changes.

For each flow, verify:
- No console errors in browser.
- No 500 errors from API.
- All saves persist after page refresh.
- All states render correctly.

### Task 6.2: Full Build Verification

Run the complete test and build suite:
```bash
npx tsc --noEmit
npm run build
npm test
npm run test:e2e
```

Fix ANY failures. Zero errors, zero warnings in build output.

### Task 6.3: Final Cleanup

1. Remove any files in `src/lib/mock/` that are no longer imported.
2. Remove any components in `src/components/` that are not imported anywhere.
3. Remove any API routes that are duplicated or unused.
4. Verify no `.env.example` or `.env.local.example` files contain real secrets.

### Task 6.4: Deployment Verification

1. Run `npm run build` one final time — must complete with zero errors.
2. Run `npm test` — all tests must pass.
3. Commit everything:
```bash
git add -A && git commit -m "feat: Phase 6 — final verification, cleanup, launch ready" && git push origin main
```
4. Run `git log --oneline -10` and paste the output as proof of all phase commits.

---

## EXECUTION RULES (READ THESE BEFORE STARTING)

1. **DO NOT PLAN.** Open files, make changes, save. Move to next task.
2. **DO NOT NARRATE.** Do not say "I will now..." — just do it.
3. **DO NOT ASK QUESTIONS.** Make the best decision and code it.
4. **DO NOT SKIP TASKS.** Every task is mandatory. If blocked, document why in a code comment and move on.
5. **DO NOT STOP BETWEEN PHASES.** Complete all 7 phases in one session.
6. **COMMIT AFTER EACH PHASE.** Use the exact commit messages specified above.
7. **FIX ALL TYPECHECK/BUILD/TEST FAILURES** before moving to the next phase.
8. **PRESERVE WHAT WORKS.** Do not break existing functionality. If something works correctly, leave it alone.
9. **USE i18n FOR EVERYTHING.** Every string a user can see must use `t()` from `useTranslations()`.
10. **TEST YOUR CHANGES.** After each phase, verify the app still loads and critical pages render.

**START NOW. Phase 0, Task 0.1. Go.**
