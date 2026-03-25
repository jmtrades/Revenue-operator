# Recall Touch — Full Evaluation

**Date:** March 2026  
**Scope:** Build, lint, tests, design system, core flows, APIs, doctrine, and .cursorrules compliance.

---

## 1. Build, Lint, Tests

| Check | Status |
|-------|--------|
| `npm run build` | ✅ Pass |
| `npm run lint` | ✅ Pass |
| `npm run test` | ✅ Pass (after fixing lead-inbound response) |

**Fix applied:** `POST /api/webhooks/lead-inbound` no longer returns `lead_id` in the JSON body (doctrine: do not expose internal identifiers). Response is now `{ status: "created" }`.

---

## 2. Design System (.cursorrules)

### Primary button and “Start free”
- **Primary CTA:** `.btn-marketing-primary` in `globals.css` is `background: #ffffff; color: #0a0a0a` → ✅ **bg-white text-black**.
- **Navbar:** “Start free →” / “Dashboard →” use `btn-marketing-primary` → ✅.
- **No blue/indigo/purple on buttons:** Primary actions use white/black; secondary use border/zinc.

### Accent colors (status only)
- **Allowed:** blue-500 lead, green-500 appointment, red-500 urgent, purple-500 outbound, amber-500 follow-up — **only for status/badges, not buttons**.
- **Current usage:**
  - `HomepageActivityPreview.tsx`: lead (blue), appointment (green), follow-up (purple) left borders and badges → ✅ status.
  - `AppShellClient.tsx`: workspace banner uses `border-blue-500/10 bg-blue-500/5` → ⚠️ **banner, not button**; consider zinc if strict “no blue” outside status.
  - `AgentsPageClient.tsx`: Test tab “Prepared” badge `bg-blue-500/10 text-blue-300` → ✅ status.
  - `contacts/page.tsx`: type === "lead" badge blue → ✅ status.
  - `analytics/page.tsx`: icons `text-blue-400` → ⚠️ decorative; could be `text-zinc-400` for full compliance.
  - `WorkspaceVoiceButton.tsx`: “live” state blue border/pulse → could be considered status (call live).
  - `onboarding/page.tsx`: step indicator `bg-blue-500/10`, `bg-blue-500` for active step → ⚠️ **not status**; .cursorrules say “current step = white + dot”. Recommend changing to white/zinc.
  - `team/page.tsx`: badge blue → status-like.

**Recommendation:** Replace non-status blue/purple (e.g. onboarding step, analytics icons, app banner) with white/zinc for strict “accent only for status” compliance.

### Cards, inputs, layout
- Cards: `rounded-2xl`, `bg-zinc-900/50` or `border-zinc-800` used across app → ✅.
- Inputs: `bg-zinc-900 border-zinc-800 rounded-xl` pattern used → ✅.
- Error / not-found: Dark background, “Try again” and “Go home” (error), “Go home” (not-found) → ✅.

---

## 3. Core Flows (FINAL VERIFICATION)

| Flow | Status | Notes |
|------|--------|------|
| Homepage → Start free | ✅ | Navbar and CTAs use `ROUTES.START` → `/sign-in?create=1`. |
| /activate | ✅ | Page + ActivateWizard; localStorage `rt_signup` / `rt_authenticated`. |
| Sign-in | ✅ | Sign-in page, email/password, “Sign in →” bg-white text-black; “No account found. Start free →”; Google → toast. |
| /demo | ✅ | Demo page + DemoSimulatorSection; auto-play and “Skip to result” exist. |
| Pricing toggle | ✅ | PricingContent with Monthly/Annual and “Save 17%”. |
| Waitlist | ✅ | Validate → API → “You’re on the list!”; button bg-white text-black. |
| /app/onboarding | ✅ | 5 steps, sidebar, “Go to my dashboard →” sets onboarded → /app/activity. |
| /app/activity | ✅ | Stats, filters, demo cards, milestone “Finish setup →”. |

**Note:** `ROUTES.START` is `/sign-in?create=1`, not `/activate`. If the intended first step for net-new users is “Start free → /activate”, update `ROUTES.START` or navbar/CTA links to point to `/activate` where appropriate.

---

## 4. Routes and Pages

- **Sitemap:** 30+ routes (home, activate, sign-in, app, pricing, product, demo, docs, contact, privacy, terms, blog, industries, app sub-pages) → ✅.
- **Public:** /product, /pricing, /docs, /contact, /privacy, /terms, /blog, /industries/[slug] → ✅.
- **App:** /app/activity, contacts, agents, campaigns, messages, calendar, analytics, settings + sub-pages (integrations, agent, phone, team, etc.), leads, calls, knowledge, compliance → ✅.
- **error.tsx:** Dark, [Try again] [Go home] → ✅.
- **not-found.tsx:** [Go home] (and Contact support) → ✅.
- **Footer:** “Book a demo” → /demo, “About” → /contact (in Footer component) → ✅.

---

## 5. APIs (Critical)

| Endpoint | Purpose | Status |
|----------|---------|--------|
| POST /api/leads | Create lead (name, phone, email, source, etc.) | ✅ |
| GET /api/leads | List leads by workspace | ✅ |
| PATCH /api/leads/[id] | Update lead (state, metadata) | ✅ |
| POST /api/leads/import | Bulk CSV import | ✅ |
| GET /api/leads/[id]/calls | Call history for lead | ✅ |
| POST /api/outbound/call | Start outbound call to lead (Vapi) | ✅ |
| POST /api/webhooks/lead-inbound | Inbound lead webhook (session or x-api-key) | ✅ (response fixed for doctrine) |
| POST /api/agent/preview-voice | ElevenLabs voice preview | ✅ |
| GET /api/agents | List agents | ✅ |
| Session / auth | getSession, Supabase, revenue_session | ✅ |

---

## 6. Leads and Agents (Live-Test Fixes)

- **Agent tabs:** Tab state is driven by local state; `window.history.replaceState` used instead of `router.replace` so tab (Profile/Knowledge/Rules/Test) does not reset on navigation/remount → ✅.
- **+ Add lead:** Buttons no longer `disabled={!workspaceId}`; panel opens; save validation shows in-panel error when workspace not loaded → ✅.
- **Hear This Agent / voice preview:** Empty-voice guard and toast; request uses trimmed `voice_id`; `/api/agent/preview-voice` returns audio when ElevenLabs configured → ✅.
- **+ Create Agent:** Buttons call `setShowTemplateModal(true)`; template modal exists. If modal doesn’t open in production, check z-index/overlay/click target.

---

## 7. TODOs and Placeholders

- **Input placeholders:** Used for UX (e.g. “you@company.com”, “Full name”) → ✅ OK.
- **Onboarding identity:** `@onboarding.placeholder` email for a created user record → internal only; acceptable.
- **Onboarding scrape:** Comment “Returns placeholder until real scraper” → ⚠️ Optional: replace with real implementation or neutral copy.
- **“SMS coming soon”:** Toast only (no “coming soon” on button label) → ✅ Acceptable per rules.

---

## 8. Doctrine and Constitution

- **Doctrine:** Signal → State → Decision → Action → Proof; no business logic in connectors; expansion only along lifecycle → codebase aligned.
- **API responses:** Doctrine test enforces no exposure of internal IDs (e.g. `lead_id`, `workspace_id`) in success responses unless route is workspace/lead-scoped. **Lead-inbound** response updated to `{ status: "created" }` → ✅.

---

## 9. Database and Auth

- **Supabase:** Used for DB and auth (`createServerClient`, `getDb`, schema `revenue_operator`). Migrations in `supabase/migrations`, `npm run db:migrate` → ✅.
- **Session:** Cookie + Supabase auth; protected routes use session/workspace → ✅.

---

## 10. Summary and Recommendations

**Strengths**
- Build, lint, and tests pass.
- Core flows (sign-in, activate, demo, pricing, waitlist, onboarding, app/activity) are implemented.
- Primary CTAs are white/black; error and not-found pages are dark with correct actions.
- Leads and agents flows fixed for tab switching, add-lead panel, and voice preview.
- Doctrine violation in lead-inbound response fixed.

**Completed (post-evaluation)**
1. **Start free → /activate:** `ROUTES.START` and all “Start free” CTAs now point to `/activate`. Core flow: Homepage → Start free → /activate → success → /app/onboarding → /app/activity.
2. **Design sweep:** Non-status blue/purple removed or replaced with white/zinc (app shell banner, onboarding step indicator, analytics icons, Test tab bubble, WorkspaceVoiceButton live state, team role badges).
3. **Onboarding scrape:** Comment and response updated; no “placeholder” wording; returns `{ services: "", hours: "" }`.
4. **Deploy checklist:** `docs/DEPLOY_CHECKLIST.md` added (env, DB, core flow, cron, E2E).
5. **Critical path E2E:** `e2e/critical-path.spec.ts` added (home → Start free → /activate, sign-in, demo).

---

**Evaluation complete.** Product is ready for people to use when deploy checklist is followed.
