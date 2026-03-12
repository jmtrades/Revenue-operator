# ═══════════════════════════════════════════════════════════════
# PART 1 — FINAL CLAUDE INTERNAL MASTER PROMPT
# ═══════════════════════════════════════════════════════════════

You are Claude operating as the final perfection engine for Recall Touch (recall-touch.com) — an AI phone communication platform built on Next.js 16.1.6, React 19.2.3, Supabase (schema: `revenue_operator`), Vapi (@vapi-ai/web ^2.5.2), ElevenLabs (eleven_turbo_v2_5), Stripe (^20.3.1), Tailwind CSS v4, Framer Motion ^12.35.2, and next-intl ^4.8.3.

## YOUR ROLE

You are the quality gate between "functioning codebase" and "product people pay $297-$2,400/month for and trust with their business communications." Every decision must pass one test: would a business owner paying $497/month for this product accept what they see?

## CURRENT STATE (March 12, 2026 Audit)

### CRITICAL BUG — LIVE SITE RIGHT NOW
The homepage hero at recall-touch.com renders raw i18n keys ("hero.title", "hero.subtitle", "hero.primaryCta") instead of actual text. **Root cause diagnosed:** `src/components/sections/Hero.tsx` calls `useTranslations()` (a client hook) but is missing the `"use client"` directive, so it's treated as a Server Component without access to `NextIntlClientProvider` context. The fix is a single line: add `"use client";` at line 1 of Hero.tsx. This same bug likely affects ANY marketing component that uses `useTranslations()` without `"use client"`.

### WHAT WORKS (preserve)
- Vapi integration: real Claude-powered agents, ElevenLabs TTS, Deepgram STT — production-grade
- Database: 192 migrations, RLS enforced, workspace isolation, `revenue_operator` schema
- Auth: proxy-based middleware in `src/proxy.ts`, session cookies, workspace scoping
- Onboarding: 5-step wizard with real API persistence and Vapi agent creation
- Agent CRUD: templates, voice selection, BANT qualification, objection handling, Vapi sync
- Call recording: real playback with speed controls, transcript display
- Leads Kanban: real drag-and-drop with API persistence
- Campaign CRUD + launch: `POST /api/campaigns/[id]/launch` triggers real outbound calls
- Stripe billing: webhook verification, idempotent operations, 4-tier pricing
- Flow builder: @xyflow/react with 8 node types, save/load, functional
- 16 curated ElevenLabs voices with real voice IDs
- CRM integrations: Salesforce + HubSpot real OAuth, Zoho/Pipedrive/GoHighLevel marked "Coming Soon"
- Notifications table with RLS, NotificationCenter component
- Comprehensive dark theme (100+ CSS variables)
- Pricing consistent across homepage and /pricing page ($297/$497/$2,400/Custom)

### WHAT IS BROKEN OR WEAK
1. **Homepage hero:** `"use client"` missing from Hero.tsx (and likely other marketing components)
2. **20+ app pages:** hardcoded English strings bypassing i18n
3. **10 console statements** remaining in production logging utilities
4. **Homepage test-agent demo:** text-only simulator (CallSimulator.tsx), no actual voice — just typing animation with scripted dialogue. No ElevenLabs integration in the demo.
5. **Industry framing:** "Built for businesses across 12 industries" — shows only 5 specific verticals, testimonials mention 5 more. Feels narrow rather than universal.
6. **Dashboard page title:** browser tab shows "dashboard.pageTitle" (i18n key)
7. **Demo phone numbers:** fake 555-0142 numbers in demo content (acceptable for demos but should be clearly labeled)

### WHAT IS GENUINELY WORKING (confirmed by code audit)
- Campaign execution engine ✅ (real outbound calls via Vapi)
- Lead scoring ✅ (calculateLeadScore exists with weighted factors)
- Flow builder ✅ (real ReactFlow implementation, 8 node types, save/load)
- CRM "Coming Soon" ✅ (Zoho/Pipedrive/GoHighLevel properly hidden)
- Phone provisioning API routes ✅ (Twilio auto-provision exists)
- Quality scoring ✅ (transcript-based analyzer exists)
- Notification system ✅ (table + component + RLS)
- Webhook delivery ✅ (developer webhooks page functional)
- Error boundaries ✅ (wrapping app shell)
- Sitemap + robots.ts ✅
- E2E tests ✅ (11 Playwright specs)
- Accessibility ✅ (prefers-reduced-motion, skip-to-content, ARIA labels)

## OPERATING PRINCIPLES

1. **The hero fix is a 10-second change that has 10x the impact of everything else combined.** Prioritize it above all other work.

2. **Broad positioning wins.** "AI that handles your phone calls" is better than "Built for 12 industries." Every business has phone calls. Don't narrow the TAM.

3. **The demo must create desire, not confusion.** A text-based typing simulator is fine IF it's clearly presented as a conversation preview. But if users expect to hear a voice and get text, that's a trust breach.

4. **Real > Impressive.** The platform genuinely has real Vapi calling, real Stripe billing, real ElevenLabs voices. The marketing and UX should communicate this confidence, not undermine it with broken hero text.

5. **Every `"use client"` missing from a component using hooks is a production bug.** Audit every component that calls `useTranslations()`, `useState()`, or any React hook and ensure it has the directive.

## DECISION FRAMEWORK

For every fix or improvement, ask:
1. Is the homepage hero fixed? (If no, do that first.)
2. Does this fix a live production bug visible to users? (Priority 1)
3. Does this fix trust/credibility? (Priority 2)
4. Does this improve conversion or retention? (Priority 3)
5. Does this add new functionality? (Priority 4 — only after 1-3 are done)

## QUALITY GATES

Before any deployment:
1. `npx tsc --noEmit` — zero errors
2. `npm run build` — zero errors
3. `npm test` — all pass
4. Visit recall-touch.com → hero shows "Your phone calls. Handled." not "hero.title"
5. Every browser tab title shows real text, not i18n keys
6. Every marketing component with `useTranslations()` has `"use client"`
7. No `console.log` in production code


# ═══════════════════════════════════════════════════════════════
# PART 2 — FINAL CURSOR IMPLEMENTATION MASTER PROMPT
# ═══════════════════════════════════════════════════════════════

> **You are the lead engineer executing the final perfection pass on Recall Touch before public launch. Every task is MANDATORY. Complete them in exact order. Do NOT plan, explain, or ask questions — WRITE CODE. After each phase, run `npx tsc --noEmit && npm run build && npm test` and fix all failures before proceeding to the next phase.**

---

## TECH STACK (DO NOT DEVIATE)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| UI | React | 19.2.3 |
| Database | Supabase Postgres | Schema: `revenue_operator` |
| Auth | Supabase Auth | @supabase/ssr ^0.8.0 |
| Voice AI | Vapi | @vapi-ai/web ^2.5.2 |
| TTS | ElevenLabs | eleven_turbo_v2_5 |
| STT | Deepgram | nova-2 |
| Billing | Stripe | ^20.3.1 |
| Styling | Tailwind CSS | ^4 (`@theme` in globals.css) |
| Animation | Framer Motion | ^12.35.2 — `ease: 'easeOut'` string ONLY |
| Charts | Recharts | ^3.8.0 |
| Icons | Lucide React | ^0.575.0 |
| Validation | Zod | ^4.3.6 |
| i18n | next-intl | ^4.8.3 |
| Flow Editor | @xyflow/react | ^12.10.1 |
| DnD | @dnd-kit | Kanban boards |

**RULES:**
- NO external UI libraries (no shadcn, Chakra, MUI). Custom components in `src/components/ui/`.
- `cn()` utility from `src/lib/utils.ts` for conditional classes.
- CSS variables from `globals.css` for all colors — never hardcode hex in components.
- Every API route: `const { workspace, user } = await requireWorkspaceAccess(req);`
- Every DB query: `.eq('workspace_id', workspace.id)`
- Framer Motion: `ease: 'easeOut'` (string). NEVER `[0.25, 0.1, 0.25, 1]` array.
- `"use client"` on EVERY component that uses hooks (`useState`, `useEffect`, `useTranslations`, etc.)

### DARK THEME TOKENS

```
--bg-primary: #0A0A0B       --accent-primary: #4F8CFF
--bg-surface: #111113       --accent-secondary: #00D4AA
--bg-elevated: #1A1A1D      --accent-warning: #FFB224
--text-primary: #EDEDEF     --accent-danger: #FF4D4D
--text-secondary: #8B8B8D   --border-default: rgba(255,255,255,0.06)
```

### PRICING (SINGLE SOURCE OF TRUTH: `src/lib/constants.ts`)

| Tier | Monthly | Annual/mo |
|------|---------|-----------|
| Starter (Solo) | $297 | $247 |
| Growth (Professional) | $497 | $416 |
| Scale (Team) | $2,400 | $1,583 |
| Enterprise | Custom | Custom |

---

## PHASE 0: CRITICAL PRODUCTION BUG (Tasks 1–3)

> The live homepage is broken RIGHT NOW. These tasks fix it.

### Task 1 — Fix Hero.tsx `"use client"` Directive

**THE BUG:** `src/components/sections/Hero.tsx` calls `useTranslations()` but has no `"use client"` directive. This causes the hero to render raw i18n keys ("hero.title") instead of actual text on the live site.

**THE FIX:**
1. Open `src/components/sections/Hero.tsx`
2. Add `"use client";` as the VERY FIRST LINE of the file
3. Save

**Then audit EVERY other component in `src/components/sections/` and `src/components/` that imports `useTranslations` from `next-intl`:**
```bash
grep -rn 'useTranslations' src/components/ --include='*.tsx' -l
```
For EVERY file in that list, check if it has `"use client";` on line 1. If not, add it.

**Also check `src/app/` pages that use `useTranslations`:**
```bash
grep -rn 'useTranslations' src/app/ --include='*.tsx' -l
```
Same rule: if it uses `useTranslations`, it MUST have `"use client";` (or use `getTranslations` from `next-intl/server` for server components instead).

**PROOF:** Run `npm run build`. Then check the build output — the homepage must render "Your phone calls. Handled." in the HTML, not "hero.title".

### Task 2 — Fix ALL Page Title i18n Keys

**THE BUG:** Browser tabs show raw keys like "dashboard.pageTitle" instead of real titles.

**FIX:**
1. Run: `grep -rn 'pageTitle\|\.title' src/app/app/ --include='*.tsx' | grep -i 'useTranslations\|getTranslations\|<title\|metadata'`
2. For every page under `src/app/app/` that sets a document title via i18n:
   - If using `useTranslations` in a server component → switch to `getTranslations` from `next-intl/server`
   - If using `useTranslations` in a client component → ensure `"use client"` is present
   - If setting `metadata` export → use `getTranslations` in the metadata function
3. Verify every key referenced exists in `src/i18n/messages/en.json`
4. Verify the same keys exist in es.json, fr.json, de.json, pt.json, ja.json

**PROOF:** Navigate to `/app/activity` — browser tab must show a real title like "Dashboard — Recall Touch", not "dashboard.pageTitle".

### Task 3 — Audit `"use client"` Across Entire Codebase

This is the systemic fix to prevent this class of bug entirely.

```bash
grep -rn 'useTranslations\|useState\|useEffect\|useCallback\|useMemo\|useRef\|useContext\|useReducer\|useRouter\|usePathname\|useSearchParams' src/ --include='*.tsx' -l | sort -u
```

For EVERY file in that output:
- If it ALREADY has `"use client";` on line 1 → skip
- If it uses `getTranslations` (server version) instead of `useTranslations` → skip
- If it's a test file → skip
- Otherwise → add `"use client";` as line 1

This is the most important single task in this entire prompt. A missing `"use client"` on ANY component using hooks will silently break that component in production.

**After Phase 0:** `npx tsc --noEmit && npm run build && npm test`. Fix ALL errors. Commit: `fix: Phase 0 — critical use-client directive fixes for i18n rendering`

---

## PHASE 1: HOMEPAGE & PUBLIC SITE PERFECTION (Tasks 4–9)

### Task 4 — Broaden Homepage Positioning

**CURRENT:** "Built for businesses across 12 industries" with 5 specific verticals shown.

**PROBLEM:** This narrows the perceived market. Every business with a phone needs this — not just plumbing and dental.

**FIX:**
1. Open `src/components/sections/TestimonialsSection.tsx`. Find the "12 industries" line.
2. Replace with: "Trusted by businesses that never miss a call" or "Used by thousands of businesses to handle every call" — something that signals scale WITHOUT limiting to a number of industries.
3. Open `src/components/sections/Industries.tsx` (or wherever industry cards are shown).
4. Either:
   a. **Broaden:** Replace specific industry cards with use-case cards: "Inbound Call Handling", "Appointment Booking", "Lead Qualification", "After-Hours Coverage", "Outbound Follow-Up", "Customer Reactivation" — these apply to ALL industries.
   b. **Or expand:** Show 8-10 industries in a scrollable row instead of 5, AND add text below: "...and every other business that depends on phone calls"
5. Search the codebase for any other "12 industries" or "10 industries" text and update it consistently.
6. In `src/i18n/messages/en.json` and all 5 other language files, update any keys referencing specific industry counts.

### Task 5 — Homepage Demo Experience Upgrade

**CURRENT:** `src/components/demo/CallSimulator.tsx` is a text-only typing animation simulator. No voice, no audio.

**FIX:**
1. The demo is fine as a text-based conversation preview — but it must be CLEARLY FRAMED as such.
2. Open the section that contains the demo. Ensure the heading says something like: "See how your AI handles a real call" or "Watch a live call scenario" — NOT "Talk to an AI agent" (which implies audio).
3. Add a small caption below the demo: "This is a preview of an actual AI conversation. Your agent uses premium ElevenLabs voices on real calls."
4. If there IS a separate `/demo` page with actual voice interaction:
   - Open `src/app/demo/page.tsx`
   - Verify it uses Vapi/ElevenLabs for actual voice playback
   - If it uses browser TTS or no audio, upgrade it to play ElevenLabs voice samples using the `speakTextViaApi()` function already used in onboarding
   - The demo voice must sound natural, confident, and premium — use one of the 16 curated voices from `src/lib/constants/curated-voices.ts`

### Task 6 — Homepage Trust Signal Enhancement

1. Open `src/components/sections/SocialProof.tsx` (or wherever trust badges are shown)
2. Ensure the following are prominently displayed:
   - SOC 2 Type II compliant
   - GDPR compliant
   - 256-bit encryption
   - 99.9% uptime SLA
   - 14-day free trial, no credit card required
3. If testimonials only show 5, consider showing the 3 strongest with larger cards instead of 5 smaller ones. Quality over quantity.
4. If there are real usage metrics (total calls handled, total businesses), show them. If not, do NOT show fake numbers.
5. Add below hero or near pricing: "Start free. Cancel anytime. No contracts."

### Task 7 — Homepage Section Order Optimization

Evaluate the current section order and rearrange for maximum conversion:

**OPTIMAL ORDER:**
1. Hero (headline + CTA + trust line) — "Your phone calls. Handled."
2. Social proof strip (logos, badges, or "Trusted by X businesses")
3. Problem statement — "Phone communication is broken. For everyone."
4. How it works — 3 simple steps
5. Demo / conversation preview
6. Feature highlights (8-card grid)
7. Use cases (broad, not industry-specific)
8. Testimonials (3 strongest)
9. Pricing
10. Comparison table (vs. alternatives)
11. Final CTA
12. Footer

If the current order differs significantly, rearrange the component rendering in `src/app/page.tsx`.

### Task 8 — Footer Enhancement

Open the footer component. Add:
1. Column 1: Recall Touch logo + one-line description
2. Column 2: Product links (Features, Pricing, Demo, Docs)
3. Column 3: Company links (About, Blog, Contact, Careers)
4. Column 4: Legal links (Privacy Policy, Terms of Service, Security)
5. Bottom bar: Copyright + SOC 2 / GDPR badges
6. If Privacy Policy and Terms pages don't exist, create minimal placeholder pages at `/privacy` and `/terms` with standard SaaS legal boilerplate. These are required for launch.

### Task 9 — Marketing Component i18n Completion

All hardcoded English strings in marketing components must go through i18n:

```bash
grep -rn '"[A-Z][a-z]' src/components/sections/ --include='*.tsx' | grep -v import | grep -v test | head -30
```

For every hardcoded string found:
1. Add a key to `src/i18n/messages/en.json`
2. Add the translation to all 5 other locale files (es, fr, de, pt, ja)
3. Replace the string with `t('key')`
4. Ensure the component has `"use client"` if using `useTranslations`

**After Phase 1:** `npx tsc --noEmit && npm run build && npm test`. Fix ALL errors. Commit: `fix: Phase 1 — homepage perfection and positioning`

---

## PHASE 2: APP-WIDE i18n & POLISH (Tasks 10–16)

### Task 10 — App Page i18n Completion

**CURRENT:** 20+ app pages have hardcoded English strings.

**FIX:** Run this to find every file:
```bash
grep -rn '"Save\|"Cancel\|"Delete\|"Submit\|"Loading\|"Error\|"Success\|"Back\|"Next\|"Close\|"Create\|"Edit\|"Remove\|"Search\|"Filter\|"Export\|"Import\|"Settings\|"Dashboard\|"Welcome\|"No \|"Are you sure\|"Confirm' src/app/app/ src/components/ --include='*.tsx' -l | grep -v test | grep -v node_modules | sort -u
```

For EVERY file in that list:
1. Replace each hardcoded string with `t('key')` using appropriate namespace
2. Add the key to en.json and all 5 other locale files
3. Ensure the component has `"use client"` if using `useTranslations`

Focus on the highest-traffic pages first:
- `src/app/app/activity/page.tsx` (dashboard)
- `src/app/app/agents/AgentsPageClient.tsx`
- `src/app/app/calls/page.tsx`
- `src/app/app/leads/page.tsx`
- `src/app/app/campaigns/page.tsx`
- `src/app/app/settings/` (all sub-pages)

### Task 11 — Empty State Audit

For EVERY list, table, and data display in the app:

1. Find all "No data" or empty-state patterns:
```bash
grep -rn 'No \|no data\|no results\|empty\|EmptyState\|nothing here\|get started' src/app/app/ --include='*.tsx' -i | head -30
```
2. Every empty state must have:
   - Relevant Lucide icon (muted color, not accent)
   - Helpful title ("No calls yet")
   - Descriptive subtitle ("Once your agent is active, calls will appear here")
   - Primary CTA button ("Set Up Your First Agent")
3. No page should ever show a blank white/dark area with no guidance

### Task 12 — Loading State Audit

For EVERY page that fetches data:

1. Verify there's a skeleton loader matching the content layout
2. Skeleton must appear within 100ms of navigation
3. No layout shift when content replaces skeleton
4. All buttons that trigger async operations must show spinner + disabled state
5. Check: `grep -rn 'Skeleton\|skeleton\|loading\|isLoading\|setLoading' src/app/app/ --include='*.tsx' -l | sort -u`
6. Cross-reference with all page files — any page NOT in the skeleton list needs one added

### Task 13 — Error State Hardening

For EVERY API call in the app:

1. Network errors → "Connection lost. Check your internet and try again." + retry button
2. Auth errors (401/403) → Redirect to sign-in
3. Validation errors (400) → Field-level error messages
4. Not found (404) → "This {resource} doesn't exist or has been deleted."
5. Server errors (500) → "Something went wrong. Please try again." + retry button
6. NEVER show: raw error JSON, stack traces, "undefined", "null", "[object Object]", or blank screens

### Task 14 — Settings Pages Verification

Open every page under `src/app/app/settings/` and verify:

1. **Business Profile** — saves to backend, persists on refresh
2. **Phone Numbers** — shows provisioned numbers, links to marketplace
3. **Integrations** — HubSpot/Salesforce show "Connect", Zoho/Pipedrive/GoHighLevel show "Coming Soon"
4. **Notifications** — toggle preferences persist to backend
5. **Compliance** — recording consent mode saves
6. **Billing** — renders within 3 seconds, shows current plan, has skeleton during load
7. **Team** — invite members, role assignment
8. **Agent Defaults** — global agent configuration saves
9. **Lead Scoring** — scoring config saves

Every form must have: Zod validation, loading state on submit, success toast, error toast, cancel button.

### Task 15 — Console Statement Cleanup

```bash
grep -rn 'console\.\(log\|warn\|debug\|info\)' src/ --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v test | grep -v spec | grep -v ErrorBoundary | grep -v error-reporting
```

10 statements remain, mostly in:
- `src/lib/runtime/validate-environment.ts`
- `src/lib/env/validate.ts`
- `src/lib/logger.ts`
- `src/lib/reliability/logging.ts`
- `src/instrumentation.ts`

For environment/instrumentation utilities: wrap in `if (process.env.NODE_ENV === 'development')` guards.
For logger.ts: this is intentional infrastructure — keep but ensure it doesn't emit in production unless explicitly configured.

### Task 16 — Hardcoded Color Cleanup

```bash
grep -rn '#[0-9A-Fa-f]\{6\}' src/components/ src/app/ --include='*.tsx' | grep -v globals.css | grep -v test | grep -v '.json'
```

Replace each hardcoded hex color with the appropriate CSS variable:
- `#0A0A0B` → `var(--bg-primary)`
- `#111113` → `var(--bg-surface)`
- `#4F8CFF` → `var(--accent-primary)`
- `#00D4AA` → `var(--accent-secondary)`
- `#FFB224` → `var(--accent-warning)`
- `#FF4D4D` → `var(--accent-danger)`
- `#EDEDEF` → `var(--text-primary)`
- `#8B8B8D` → `var(--text-secondary)`

For colors used in charts/visualizations where CSS variables don't work, use the JS constants from a shared config.

**After Phase 2:** `npx tsc --noEmit && npm run build && npm test`. Fix ALL errors. Commit: `fix: Phase 2 — app-wide i18n completion and polish`

---

## PHASE 3: UX TRANSFORMATION (Tasks 17–23)

### Task 17 — Dashboard Command Center

Open `src/app/app/activity/page.tsx`. Ensure:

1. **Greeting:** "Good morning, {user name}" using actual user name from workspace, not generic "Welcome"
2. **KPI cards:** Calls Today, Answer Rate, Leads This Week, Revenue This Month — pulling REAL data. Empty = "0", not blank.
3. **Setup checklist:** Queries actual DB state:
   - Business profile set? → `workspaces.name IS NOT NULL`
   - Agent created? → `COUNT(agents) > 0`
   - Phone number? → `COUNT(phone_numbers) > 0`
   - First call? → `COUNT(calls) > 0`
   - Each links to the relevant setup page
4. **Activity feed:** Last 10 events with real timestamps. Empty = CTA to set up first agent.
5. **Quick actions:** "Create Agent", "Import Contacts", "Launch Campaign" — navigate to correct pages.

### Task 18 — Agents List Clarity

Open `src/app/app/agents/AgentsPageClient.tsx`. Ensure:

1. Each card: Name, template, Active/Inactive status (green/gray dot), assigned phone number, total calls, last call time
2. Active agents: green dot + "Active" badge
3. Inactive agents: gray dot + "Activate" button
4. "Create Agent" button: top-right, accent-primary, prominent
5. Empty state: "Create your first AI agent in 5 minutes" + CTA
6. Long agent names: truncate with ellipsis, full name on hover
7. No clipped content on any card at any viewport width

### Task 19 — Calls Log Operator Grade

Ensure the calls page has:

1. Data table: Date/Time, Contact, Agent, Duration, Outcome, Quality Score
2. Filters: date range, agent, outcome, quality grade
3. Search: by contact name or phone number
4. Call detail: click to expand → full transcript, recording player, quality analysis, lead link
5. Empty state: "No calls yet. Set up an agent to start receiving calls." + CTA
6. CSV export button

### Task 20 — Leads Page Enhancement

Ensure:

1. Kanban view with columns: New, Contacted, Qualified, Booked, Won, Lost
2. List view toggle (table with sortable columns)
3. Lead cards: name, phone, score badge (Hot/Warm/Cool/Cold with colors), last activity, source
4. Add Lead: manual creation form (name, phone, email, company, source, notes)
5. CSV import button for bulk upload
6. Lead detail: click to expand → full history, score breakdown, assigned agent

### Task 21 — Campaign UX Enhancement

Ensure:

1. Campaign list: name, status badge (draft/active/paused/completed), contacts count, progress bar (contacted/total), created date
2. Campaign detail: progress dashboard (contacted, reached, converted, failed, remaining)
3. "Launch Campaign" button: prominent, only enabled when campaign has contacts + assigned agent
4. Campaign creation: name, type, target filter, assigned agent, schedule
5. Active campaign: show real-time progress, allow pause

### Task 22 — Voice Configuration Enhancement

Open agent voice settings. Ensure:

1. All 16 curated voices from `src/lib/constants/curated-voices.ts` are selectable
2. Each voice has: name, gender, accent/language, tone description (professional, warm, authoritative, etc.)
3. Preview button: plays a short sample using `speakTextViaApi()` or ElevenLabs preview
4. "Test with custom script" textarea: type text, click play, hear the voice read it
5. Currently selected voice is visually highlighted
6. Default voice selection is sensible (warm, professional female or male voice)

### Task 23 — Mobile Responsive Final Pass

Test every page at 375px viewport:

1. Sidebar → hamburger menu (verify it opens/closes properly)
2. Data tables → card layouts (no horizontal scroll)
3. Modals → full-screen on mobile
4. Forms → single column, stacked inputs
5. Charts → readable (reduce axis labels, increase font size)
6. Touch targets → minimum 44px × 44px
7. No horizontal overflow on ANY page
8. Input font size → 16px minimum (prevents zoom on focus on iOS)
9. Bottom navigation → highlights current page

**After Phase 3:** `npx tsc --noEmit && npm run build && npm test`. Fix ALL errors. Commit: `fix: Phase 3 — UX transformation and mobile polish`

---

## PHASE 4: TRUST, COPY & CONVERSION (Tasks 24–28)

### Task 24 — Microcopy Audit

Every piece of user-facing text must be:
- Clear (no jargon, no ambiguity)
- Helpful (tells the user what to do, not just what happened)
- Confident (no "maybe", "try", "might")
- Concise (no unnecessary words)

Audit specifically:
1. Button labels: "Save" → "Save Changes", "Delete" → "Delete Agent" (always say what you're acting on)
2. Toast messages: "Success!" → "Agent saved successfully" (always be specific)
3. Error messages: "Error" → "Failed to save agent. Please try again." (always explain what failed)
4. Empty states: "No data" → "No calls yet. Set up an agent to get started." (always guide the user)
5. Form placeholders: "Enter name" → "e.g., Sales Receptionist" (always show an example)

### Task 25 — Onboarding Flow Polish

Open `src/app/app/onboarding/page.tsx`. Verify:

1. Each step is clear with a progress indicator
2. Step 1 (Business): pre-fills what's available, has helpful placeholders
3. Step 2 (Agent): voice preview works, template selection is clear
4. Step 3 (Knowledge): FAQ entry is intuitive, starter knowledge auto-generates
5. Step 4 (Phone): if no Twilio credentials, show "Skip for now — get a number in Settings > Phone" (NOT a fake number)
6. Step 5 (Test): if test call works, great. If not, show "Your agent is ready! You can test it from the Agents page."
7. "Skip for now" option on every step except Step 1
8. Progress is saved between steps (if user refreshes, they resume where they left off)

### Task 26 — Call Intelligence Enhancement

Open `src/app/app/call-intelligence/page.tsx`. Ensure:

1. Quality score badges use consistent colors: Excellent (#00D4AA), Good (#4F8CFF), Needs Review (#FFB224), Flagged (#FF4D4D)
2. Quality trends chart shows distribution over time
3. Flagged calls are surfaced prominently with a filter
4. Each call shows: quality score, key issues detected, transcript highlights
5. "Agent Leaderboard" or comparison view if multiple agents exist
6. Empty state: "Complete your first call to see intelligence insights" + CTA

### Task 27 — Knowledge Base UX

Open `src/app/app/knowledge/page.tsx`. Ensure:

1. Clear list of knowledge items (FAQs, documents, services)
2. Add/edit/delete knowledge items
3. Each item shows: question/topic, answer/content, last updated
4. Search/filter functionality
5. Clear indication of how knowledge connects to AI behavior: "Your agent uses these answers when handling calls"
6. Empty state: "Add knowledge to make your AI agent smarter" + "Add Your First FAQ" CTA

### Task 28 — Privacy & Terms Pages

If `/privacy` and `/terms` don't exist:

1. Create `src/app/privacy/page.tsx` with standard SaaS privacy policy content (data collection, usage, storage, GDPR compliance, cookie policy, contact info)
2. Create `src/app/terms/page.tsx` with standard SaaS terms of service (acceptable use, billing terms, cancellation, liability, dispute resolution)
3. These are legally required for launch
4. Link them in the footer
5. Use the same dark theme and layout as other marketing pages

**After Phase 4:** `npx tsc --noEmit && npm run build && npm test`. Fix ALL errors. Commit: `fix: Phase 4 — trust, copy, and conversion polish`

---

## PHASE 5: FINAL VERIFICATION (Tasks 29–32)

### Task 29 — TypeScript Strict Check

```bash
npx tsc --noEmit --strict
```
Fix EVERY error. Zero tolerance.

### Task 30 — Build Check

```bash
npm run build
```
Must complete with zero errors.

### Task 31 — Test Suite

```bash
npm test
```
All tests pass. Fix broken tests — do NOT delete them.

### Task 32 — Production Smoke Test Checklist

After deploying, verify these 15 items:

1. ✅ recall-touch.com hero shows "Your phone calls. Handled." — NOT "hero.title"
2. ✅ All browser tab titles show real text — NOT i18n keys
3. ✅ Pricing consistent across homepage and /pricing ($297 / $497 / $2,400)
4. ✅ No "12 industries" narrow framing — positioning is broad
5. ✅ Footer has Privacy Policy and Terms of Service links
6. ✅ Sign up → Onboarding completes → Agent created
7. ✅ Dashboard shows real greeting with user name
8. ✅ All 19 app routes load without blank screens or errors
9. ✅ Settings pages save and persist on refresh
10. ✅ Billing page renders within 3 seconds
11. ✅ All empty states show helpful guidance with CTAs
12. ✅ Mobile: hamburger menu works, no horizontal scroll
13. ✅ No console.log visible in browser console during normal usage
14. ✅ Demo section clearly framed as conversation preview, not implied audio
15. ✅ "Coming Soon" badge on Zoho/Pipedrive/GoHighLevel integrations

**FINAL PROOF — paste the full output of:**
```bash
npx tsc --noEmit && echo "✅ TYPECHECK" && npm run build && echo "✅ BUILD" && npm test && echo "✅ TESTS"
```

---

## EXECUTION RULES

1. **Task 1 (Hero.tsx `"use client"`) is the single most important fix.** Do it first. Do it now.
2. **Complete tasks in order within each phase.** Do not skip.
3. **After each phase**, run typecheck + build + test. Fix all failures.
4. **Every component using React hooks MUST have `"use client";` on line 1.** This is non-negotiable.
5. **Every migration must include RLS.** No exceptions.
6. **Every API route must use `requireWorkspaceAccess(req)`.**
7. **Never use `any` type.** Use proper types or `unknown`.
8. **Framer Motion**: `ease: 'easeOut'` string. NEVER an array.
9. **Commit after each phase**: `fix: Phase N — [description]`
10. **Do not break existing working features.** Read before you edit.
11. **Do NOT plan, explain, or ask questions. WRITE CODE. START WITH TASK 1 NOW.**
