# Recall Touch v8 — Phase Progress

Status of phases from the definitive Cursor master prompt (v8).

---

## Phase 0: Fix broken routes — DONE

- **`/activate`**: Form shows immediately; no blocking "Loading…". Session check runs in background. Submit shows inline "Preparing checkout…" / "Opening secure checkout…" instead of full-page spinner.
- **`/sign-in`**: When auth not configured, shows "Coming soon" with CTA to `/activate`. No blank or "Sign-in is not configured."
- **`/docs#changelog`** and **`/docs#api`**: Sections added on `/docs` so footer links work.
- **"Book a demo"**: `ROUTES.BOOK_DEMO` now points to `/contact` (was mailto).
- `/demo`, `/product`, `/pricing`, `/contact`, `/privacy`, `/terms` verified with content.

---

## Phase 1: Homepage copy improvements — DONE

- **Problem section**: Expanded to three cards — Inbound ("Calls go unanswered"), Outbound ("Follow-up never happens"), Human tax ("Hiring doesn't fix it") with stats per spec.
- **Features**: "Tracks everything" replaced with "Shows your ROI"; added 9th card "Never gives up" (5+ follow-ups). Grid set to 3 columns for 9 cards.
- **Pricing**: Micro-ROI line under each tier (Starter, Professional, Business, Enterprise) per spec.
- **Trust**: Social proof copy updated to "Trusted by 200+ businesses across home services, healthcare, insurance, real estate, and legal."
- Hero and pricing toggle unchanged; both already working.

---

## Phase 2: Auth + database — ALREADY IN PLACE

Existing implementation:

- **Supabase**: Auth (magic link, Google OAuth), database, storage. `getClientOrNull()` used where env may be missing.
- **Tables**: `workspaces` (business), `agents`, `campaigns`, `appointments`, `messages`, `team_members`, `leads`, plus operational/continuity tables. See `supabase/migrations/v7_app_tables.sql` and related migrations.
- **RLS**: `v7_rls.sql` — `workspace_owner_check(workspace_id)` policies on agents, campaigns, appointments, messages, team_members.
- **Auth flow**: `/sign-in` (magic link + Google), `/auth/callback`, session check. `/activate` starts trial and redirects to `/connect?workspace_id=...`.
- **API**: `/api/workspaces`, `/api/agents`, `/api/agents/[id]`, `/api/campaigns`, `/api/leads`, `/api/trial/start`, billing, onboarding, etc.

No Phase 2 code changes required for current scope.

---

## Phase 3: Onboarding — PARTIALLY IN PLACE

- **`/activate`**: Collects email + industry, calls `POST /api/trial/start`, redirects to Stripe checkout or `/connect`.
- **`/connect`**: Post-checkout; Twilio auto-provision, phone number display, forwarding instructions.
- **`/onboard`**: Multi-step flow (identity, domain, governance, send, etc.) with execution-state banner and append-outcome APIs.
- **APIs**: `/api/onboard/*`, `/api/integrations/twilio/auto-provision`, `/api/onboarding/*`, etc.

The v8 spec’s exact 5-step wizard (Who are you → Your AI Agent → Teach your AI → Get your number → Test it) is not implemented verbatim; the current flow is activate → checkout → connect → optional onboard steps. To align fully with the spec would require a dedicated 5-step onboarding UI and wiring to Twilio/Vapi.

---

## Phase 4: Inbound call handling — DONE

- **Post-call** (`/api/inbound/post-call`): Accepts optional `summary`; stores `recording_url`, `transcript_text`, `summary` on `call_sessions`. Emergency keyword detection (emergency, urgent, burst, leak, flood, fire, etc.) inserts `call_analysis` with `outcome: "urgent"` so activity feed shows URGENT card.
- **Migration** `call_sessions_summary_recording.sql`: Adds `summary` and `recording_url` to `call_sessions`.
- Twilio voice webhook and voice outcome API already create sessions and lead records; post-call confirmation SMS already enqueued when `send_confirmation_sms` is true.

---

## Phase 5: Activity feed — DONE

- **Dashboard Activity** (`/dashboard/activity`): Card-based feed with filters (All, Needs action, Leads, Appointments, Urgent, Outbound, Spam), card types with accent colors, expand for summary/transcript and actions (Call back, View details, Mark done). Polling every 15s and refetch on window focus for fresher data.
- **API** `/api/calls`: Returns call_sessions with leads and call_analysis; activity page derives card type from outcome/summary/transcript.
- Card accent CSS variables already in `globals.css` (--card-lead, --card-appointment, --card-emergency, etc.).

---

## Phase 6: Messaging — ALREADY IN PLACE

- **Send** `POST /api/messages/send`: Creates conversation if needed, queues outbound_messages, sends via Twilio in `delivery/provider.ts`, records in messages.
- **Dashboard Messages** (`/dashboard/messages`): Inbox/outbox tabs, conversation list, thread view, reply input. Links to Record and Templates.
- **Conversations** `GET /api/conversations`, `GET /api/conversations/[id]/messages`: List by workspace (via leads), messages by conversation or lead id.
- Post-call confirmation SMS enqueued from post-call route when `send_confirmation_sms` is true.

---

## Phase 7: Contacts + calendar — ALREADY IN PLACE

- **Contacts** `/dashboard/contacts`: List with search; `/api/contacts`, `/api/contacts/[id]`. Lead record detail at `/dashboard/record/lead/[id]` with timeline (calls, messages).
- **Calendar** `/api/workspaces/[id]/calendar-events` exists; dashboard has calendar-related flows. Full calendar view can be added later.

---

## Phase 8: Outbound + campaigns — ALREADY IN PLACE

- **Campaigns** `/dashboard/campaigns`, `/dashboard/campaigns/new`; `/api/campaigns`, `/api/campaigns/[id]`. Voice outcome API and action intents drive outbound execution.
- Campaign builder and execution engine exist; Vapi outbound wiring is provider-specific.

---

## Phase 9: Agent builder — ALREADY IN PLACE

- **Agents** `/dashboard/agents`, `/dashboard/agents/[id]`; `/api/agents`, `/api/agents/[id]`, test-call route. Onboarding and onboarding/agent API for creating agents.
- Template picker, wizard, and flow builder can be expanded on top of current CRUD.

---

## Phase 10: Analytics + compliance — ENHANCED

- **Analytics** `/api/analytics/summary`: Now filters call_sessions by last 7 days for `calls_last_7_days`. Dashboard analytics page shows calls, appointments, upcoming.
- Compliance export (PDF) and audit trail exist in enterprise/operational routes; full compliance record export can be extended as needed.

---

## Phase 11: Settings + billing — ALREADY IN PLACE

- **Settings** `/dashboard/settings`: Business context, coverage flags, Zoom, Twilio, team handoff, absence statements, billing status, etc. `/api/workspaces/[id]/settings`.
- **Billing** Stripe checkout, webhook, portal; trial start; dashboard billing page.

---

## Phase 12: Polish — PARTIAL

- Activity feed uses `LoadingState` with message "Loading activity." (no raw "Loading" or blank). Empty state and error states present.
- Mobile responsiveness, PWA, a11y audit, E2E tests, and deploy checklist can be done as final pass.
