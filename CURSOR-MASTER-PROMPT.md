# RECALL TOUCH — GLOBAL LAUNCH TRANSFORMATION PROMPT

> **You are the lead engineer shipping Recall Touch to production-grade, globally-ready status. Every task below is MANDATORY. Do NOT skip, stub, or mock anything. When a task says "create," you write real, working code. When it says "migrate," you write real SQL. When it says "test," you write real assertions. Complete every task in order within each phase before moving to the next phase. After each phase, commit with a message referencing the phase number.**

---

## TECH STACK (DO NOT DEVIATE)

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js (App Router) | 16.1.6 | `app/` directory, RSC + Client Components |
| UI | React | 19.2.3 | Strict mode enabled |
| Database | Supabase Postgres | — | Schema: `revenue_operator`, RLS enforced on every table |
| Auth | Supabase Auth | @supabase/ssr ^0.8.0 | Server-side cookie-based sessions |
| Voice AI | Vapi | @vapi-ai/web ^2.5.2 | Claude Sonnet 4 LLM backend |
| TTS | ElevenLabs | eleven_turbo_v2_5 | 16 curated voices in `src/lib/constants/curated-voices.ts` |
| STT | Deepgram | nova-2 | Via Vapi pipeline |
| Billing | Stripe | ^20.3.1 | Webhooks + idempotent operations |
| Styling | Tailwind CSS | ^4 | `@theme` inline in `globals.css`, dark-first |
| Animation | Framer Motion | ^12.35.2 | **CRITICAL**: `ease: 'easeOut'` string only, NEVER `[0.25, 0.1, 0.25, 1]` arrays |
| Charts | Recharts | ^3.8.0 | Dark-themed with CSS variable colors |
| Icons | Lucide React | ^0.575.0 | Only icon library allowed |
| Validation | Zod | ^4.3.6 | All API inputs validated |
| Toast | Sonner | — | Dark theme, bottom-right position |
| DnD | @dnd-kit | — | Kanban boards, sortable lists |
| Monitoring | @vercel/analytics ^2.0.0, @vercel/speed-insights ^2.0.0 | Already installed |

### COMPONENT RULES

- **NO external UI libraries** — no shadcn, no Chakra, no MUI, no Radix primitives directly. All UI components are custom-built in `src/components/ui/`.
- Use the `cn()` utility from `src/lib/utils.ts` (clsx + tailwind-merge) for conditional classes.
- Every component must support the dark theme tokens defined in `globals.css`.

### DARK THEME TOKENS (USE THESE EXACTLY)

```
Background:   #0A0A0B (--bg-primary)
Surface:      #111113 (--bg-surface)
Elevated:     #1A1A1D (--bg-elevated)
Accent Blue:  #4F8CFF (--accent-primary)
Accent Green: #00D4AA (--accent-secondary)
Warning:      #FFB224 (--accent-warning)
Danger:       #FF4D4D (--accent-danger)
Text Primary: #EDEDEF (--text-primary)
Text Muted:   #8B8B8D (--text-secondary)
Border:       rgba(255,255,255,0.06) (--border-default)
```

### AUTH PATTERN (EVERY API ROUTE MUST USE THIS)

```typescript
import { requireWorkspaceAccess } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { workspace, user } = await requireWorkspaceAccess(req);
  // workspace.id is the tenant isolation key
  // ALWAYS filter queries by workspace.id
}
```

### SUPABASE PATTERN

```typescript
// Server components / API routes:
import { createServerClient } from '@/lib/supabase/server';
const supabase = await createServerClient();

// Client components:
import { createBrowserClient } from '@/lib/supabase/client';
const supabase = createBrowserClient();

// ALL queries MUST include .eq('workspace_id', workspace.id)
// Schema is revenue_operator — use .schema('revenue_operator') when needed
```

### FRAMER MOTION PATTERN

```typescript
// CORRECT:
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
>

// WRONG — WILL CRASH:
// transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
```

### PRICING TIERS (SOURCE OF TRUTH)

| Tier | Monthly | Annual/mo | Inbound Min | Outbound Calls | SMS | Agents | Numbers |
|------|---------|-----------|-------------|----------------|-----|--------|---------|
| Starter (Solo) | $297 | $247 | 400 | 50 | 100 | 1 | 1 |
| Growth (Professional) | $497 | $416 | 1,500 | 500 | 500 | 3 | 3 |
| Scale (Team) | $2,400 | $1,583 | 5,000 | 2,000 | Unlimited | Unlimited | 10 |
| Enterprise | Custom | Custom | Custom | Custom | Custom | Custom | Custom |

Overage: Starter $0.25/min, Growth $0.18/min, Scale $0.12/min.
14-day free trial on all non-Enterprise tiers.

---

## EXISTING CODEBASE FACTS (DO NOT RECREATE WHAT EXISTS)

The following already exist and are working. Do NOT rewrite, duplicate, or remove them:

- **19 app routes**: activity, agents, analytics, appointments, billing, calendar, call-intelligence, calls, campaigns, compliance, contacts, developer, inbox, knowledge, leads, messages, onboarding, settings, team
- **400+ API routes** with consistent `requireWorkspaceAccess()` auth
- **80+ cron job endpoints** under `/api/cron/`
- **200+ Supabase migrations** in `supabase/migrations/`
- **279 test files** across the codebase
- **16 curated ElevenLabs voices** with real voice IDs
- **Skeleton loaders** on every page (using `src/components/ui/Skeleton.tsx`)
- **Empty states** (using `src/components/ui/EmptyState.tsx`)
- **Command palette** (⌘K) with 12 pages + 4 actions
- **Keyboard shortcuts modal** (? key trigger)
- **Realtime subscriptions** on dashboard, leads, and active calls
- **Stripe billing** with webhook verification and idempotent operations
- **CSP headers, HSTS, security headers** in `next.config.ts`
- **Call quality scoring** with 4-tier color-coded badges
- **Analytics AI summary card** with Sparkles icon
- **Breadcrumbs, PageTransition, UpgradeBanner** components
- **Mobile responsive shell** with hamburger menu + bottom nav
- **Onboarding flow** (5 steps, 6 templates + custom)
- **Drag-and-drop Kanban** on leads page

---

## PHASE 1: INTERNATIONALIZATION & GLOBAL READINESS (Tasks 1–8)

> The app is currently hardcoded to USD and English only. `src/lib/currency.ts` literally warns on non-USD. There is no i18n framework, no locale detection, no currency conversion. This phase makes the platform ready for global customers.

### Task 1 — Install and Configure next-intl

```bash
npm install next-intl
```

Create `/src/i18n/`:
- `request.ts` — locale detection from Accept-Language header, cookie, or user preference
- `routing.ts` — locale-prefixed routing config (en, es, fr, de, pt, ja as initial locales)
- `messages/en.json` — extract ALL hardcoded English strings from every page and component into this file. This is the source of truth. Minimum 500 keys covering: navigation labels, page titles, button text, form labels, error messages, toast messages, empty states, onboarding steps, pricing text, status labels, and placeholder text.
- `messages/es.json` — complete Spanish translation
- `messages/fr.json` — complete French translation
- `messages/de.json` — complete German translation
- `messages/pt.json` — complete Portuguese translation
- `messages/ja.json` — complete Japanese translation

Create `src/middleware.ts`:
```typescript
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/', '/(en|es|fr|de|pt|ja)/:path*']
};
```

**PROOF**: After completion, `cat src/i18n/messages/en.json | wc -l` must show 500+ lines. `cat src/i18n/messages/es.json | wc -l` must show comparable line count.

### Task 2 — Replace All Hardcoded Strings with t() Calls

In EVERY `.tsx` file under `src/app/` and `src/components/`:
- Import `useTranslations` from `next-intl`
- Replace every hardcoded English string with `t('key.path')`
- For server components, use `getTranslations` instead
- DO NOT leave any English strings hardcoded in JSX. Grep for common patterns: `"Save"`, `"Cancel"`, `"Delete"`, `"Loading"`, `"No results"`, `"Error"`, etc.

**PROOF**: `grep -r '"Save\|"Cancel\|"Delete\|"Submit\|"Loading\|"Error\|"Success\|"No ' src/app/ src/components/ --include='*.tsx' | grep -v 'import\|//\|\.test\.' | wc -l` must return 0.

### Task 3 — Multi-Currency Support

Replace `src/lib/currency.ts` entirely. The new implementation must:

1. Support USD, EUR, GBP, CAD, AUD, JPY, BRL, MXN at minimum
2. Store workspace currency preference in the `workspaces` table (add `currency` column, default `'USD'`)
3. Create `formatCurrency(amount: number, currency: string, locale: string): string` using `Intl.NumberFormat`
4. Create `convertCurrency(amount: number, from: string, to: string): number` with a rates table
5. Create a Supabase migration: `ALTER TABLE revenue_operator.workspaces ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';`
6. Create API route `GET /api/workspace/currency` and `PATCH /api/workspace/currency`
7. Update ALL places that display money amounts to use `formatCurrency()` — grep for `$`, `USD`, `toFixed`, `toLocaleString` across the codebase

**PROOF**: `grep -rn 'toFixed\|\\$\\$\|\\${\|USD' src/app/ src/components/ --include='*.tsx' | grep -v currency.ts | grep -v constants.ts | grep -v test | wc -l` should approach 0.

### Task 4 — Locale-Aware Date/Time Formatting

Create `src/lib/date-format.ts`:
```typescript
export function formatDate(date: Date | string, locale: string, style: 'short' | 'medium' | 'long' = 'medium'): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: style
  }).format(new Date(date));
}

export function formatTime(date: Date | string, locale: string, hour12?: boolean): string {
  return new Intl.DateTimeFormat(locale, {
    timeStyle: 'short',
    hour12: hour12 ?? (locale.startsWith('en'))
  }).format(new Date(date));
}

export function formatRelativeTime(date: Date | string, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diff = Date.now() - new Date(date).getTime();
  // Implement proper unit selection (seconds, minutes, hours, days, weeks, months)
}
```

Replace ALL instances of `.toLocaleDateString()`, `.toLocaleTimeString()`, `format(date, ...)`, and manual date formatting across the codebase with these functions.

### Task 5 — Language Switcher Component

Create `src/components/ui/LanguageSwitcher.tsx`:
- Globe icon (from Lucide) that opens a dropdown
- Shows current locale with flag emoji and language name
- Lists all available locales
- Persists selection to cookie and user preference in Supabase
- Place it in the app shell sidebar footer (in `AppShellClient.tsx`) and in the marketing site header

### Task 6 — RTL Preparation

In `src/app/layout.tsx`:
- Set `dir` attribute dynamically based on locale
- Add `[dir="rtl"]` CSS overrides in `globals.css` for flex-direction, text-align, margin/padding directional properties
- Create `src/lib/rtl.ts` with `isRTL(locale: string): boolean` helper

This is preparation — Arabic/Hebrew locales can be added later, but the infrastructure must exist now.

### Task 7 — Phone Number Country Selector

Create `src/components/ui/PhoneInput.tsx`:
- Country code dropdown with flag emojis and dial codes
- Auto-format number based on selected country
- Validate with a basic regex per country pattern
- Use this component everywhere phone numbers are entered: contacts, leads, agent phone fields, onboarding

### Task 8 — Timezone-Aware Scheduling

Update `src/lib/constants.ts` to include a comprehensive timezone list grouped by region.
- All cron jobs, campaign schedules, and appointment times must store and display in the workspace's configured timezone
- Add `timezone` column to `workspaces` table if not present (default `'America/New_York'`)
- Create `PATCH /api/workspace/timezone` endpoint
- Add timezone selector to Settings > Business page
- All time displays should show the workspace timezone, with hover tooltip showing UTC

---

## PHASE 2: SELF-SERVE PHONE PROVISIONING & VOICE SYSTEM (Tasks 9–16)

> Currently there is NO way for users to acquire phone numbers through the app. The phone settings page exists but number provisioning is incomplete. Users cannot self-serve buy, port, or manage phone numbers.

### Task 9 — Phone Number Marketplace Page

Create `src/app/app/settings/phone/marketplace/page.tsx`:

1. Search interface: country selector, state/region selector (for US/CA), area code search, toll-free toggle
2. Results grid showing available numbers with: number formatted, type (local/toll-free/mobile), monthly cost, setup fee, capabilities (voice, SMS, MMS)
3. "Get This Number" button on each result
4. API route `GET /api/phone/available?country=US&state=CA&areaCode=415&type=local` that queries Vapi's number search API (or Twilio if Vapi delegates)
5. API route `POST /api/phone/provision` that:
   - Provisions the number through Vapi/Twilio API
   - Creates a record in `revenue_operator.phone_numbers` table
   - Associates it with the workspace
   - Creates a Stripe metered billing item for the monthly cost
   - Returns the provisioned number details

**Migration**:
```sql
CREATE TABLE IF NOT EXISTS revenue_operator.phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL UNIQUE,
  friendly_name TEXT,
  country_code TEXT NOT NULL DEFAULT 'US',
  number_type TEXT NOT NULL DEFAULT 'local' CHECK (number_type IN ('local', 'toll_free', 'mobile')),
  capabilities JSONB NOT NULL DEFAULT '{"voice": true, "sms": true, "mms": false}',
  provider TEXT NOT NULL DEFAULT 'vapi',
  provider_sid TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'released', 'porting')),
  monthly_cost_cents INTEGER NOT NULL DEFAULT 150,
  assigned_agent_id UUID REFERENCES revenue_operator.agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE revenue_operator.phone_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON revenue_operator.phone_numbers
  FOR ALL USING (workspace_id = (SELECT id FROM revenue_operator.workspaces WHERE id = workspace_id));

CREATE INDEX idx_phone_numbers_workspace ON revenue_operator.phone_numbers(workspace_id);
```

### Task 10 — Phone Number Management Dashboard

Update `src/app/app/settings/phone/page.tsx` to be a full management dashboard:

1. List all workspace phone numbers with: number, friendly name, assigned agent, status, monthly cost, capabilities badges
2. For each number, action menu: Edit Name, Assign to Agent, Release Number, View Call History
3. "Get New Number" button linking to marketplace
4. "Port Existing Number" button opening a port-in wizard
5. Summary stats: total numbers, total monthly cost, numbers by type
6. If workspace has 0 numbers, show a compelling empty state directing to marketplace

### Task 11 — Number Assignment to Agents

Update the agent creation/edit flow (`src/app/app/agents/`):
1. Add "Phone Number" field to agent configuration
2. Dropdown listing available workspace numbers (unassigned ones)
3. When an agent is assigned a number, update `phone_numbers.assigned_agent_id`
4. Show the assigned number prominently on the agent card
5. Prevent deleting a phone number that's assigned to an active agent

### Task 12 — Port-In Number Wizard

Create `src/app/app/settings/phone/port/page.tsx`:
- Step 1: Enter the number to port and current carrier
- Step 2: Upload LOA (Letter of Authorization) — use file upload to Supabase Storage
- Step 3: Enter account number and PIN from current carrier
- Step 4: Review and submit
- Step 5: Confirmation with estimated timeline
- API route `POST /api/phone/port-request` that creates a port request record and triggers notification to admin
- Port request status tracking (submitted, in_review, approved, in_progress, completed, rejected)

### Task 13 — Voice Preview & Testing Console

Create `src/app/app/agents/[id]/voice-test/page.tsx` (or modal within agent edit):

1. List all 16 curated voices from `src/lib/constants/curated-voices.ts`
2. For each voice: play a 10-second preview sample (store samples in Supabase Storage or use ElevenLabs preview API)
3. "Test with my script" textarea where user types a sample script, clicks "Generate Preview", and hears the selected voice read it
4. A/B comparison mode: select two voices, hear the same script in both, pick the winner
5. Voice characteristics display: accent, gender, tone, speed rating, best-for tags
6. "Apply to Agent" button that sets the selected voice on the current agent

### Task 14 — Call Quality Monitoring Dashboard Enhancement

Enhance `src/app/app/call-intelligence/page.tsx`:

1. Add a "Quality Trends" chart showing quality score distribution over time (line chart, 7/30/90 day)
2. Add "Common Issues" section that aggregates the most frequent quality deductions across all calls
3. Add "Agent Leaderboard" showing agents ranked by average quality score
4. Add "Flagged Calls" quick-filter tab showing only calls scored below 60
5. Add call recording playback with waveform visualization (use a `<audio>` element with a canvas waveform)
6. Add ability to leave internal notes/annotations on specific calls for team review

### Task 15 — Voicemail Detection & Handling

Create `src/lib/vapi/voicemail-detection.ts`:
1. Configure Vapi's AMD (Answering Machine Detection) on all outbound calls
2. When voicemail detected, options: leave a pre-recorded message, hang up, or retry later
3. Per-agent voicemail message configuration in agent settings
4. Track voicemail outcomes in call records
5. Add "Voicemail Drop" template library in agent configuration (3-5 pre-written templates per use case)

### Task 16 — Call Recording Consent & Compliance

Create `src/lib/compliance/recording-consent.ts`:
1. Configurable per-workspace: one-party, two-party, or no recording consent
2. Auto-play consent announcement at call start for two-party jurisdictions
3. Consent preference stored per workspace in settings
4. State/country-based automatic determination of consent requirements
5. Recording pause/resume capability during sensitive information exchange
6. Add recording consent configuration to Settings > Compliance page

---

## PHASE 3: CRM & INTEGRATIONS HARDENING (Tasks 17–24)

> The app has connector infrastructure but the actual CRM sync flows need to be robust, real-time, and bidirectional.

### Task 17 — CRM Integration Hub Page

Create `src/app/app/settings/integrations/page.tsx` as a proper integration marketplace:

1. Grid of integration cards: Salesforce, HubSpot, Zoho CRM, Pipedrive, GoHighLevel, Google Contacts, Microsoft 365
2. Each card shows: logo, name, description, connection status (connected/disconnected), last sync time
3. "Connect" button initiates OAuth flow for each CRM
4. "Configure" button (when connected) opens mapping configuration
5. Global sync status indicator showing last sync, records synced, errors

### Task 18 — Contact/Lead Field Mapping Engine

Create `src/lib/integrations/field-mapper.ts`:
1. Visual field mapping interface: left column (Recall Touch fields), right column (CRM fields), drag lines between them
2. Default mappings for each CRM (pre-configured for common fields)
3. Custom field support — map any Recall Touch custom field to any CRM custom field
4. Transformation rules: format phone numbers, map status values, concatenate fields
5. Test mapping with sample data before activating
6. Store mapping config in `revenue_operator.integration_configs` table

### Task 19 — Bidirectional Sync Engine

Create `src/lib/integrations/sync-engine.ts`:
1. Real-time webhook receivers for each CRM (changes in CRM → update Recall Touch)
2. Outbound sync: when a lead/contact changes in Recall Touch, push to CRM
3. Conflict resolution: last-write-wins with audit trail, or manual review queue
4. Sync queue with retry logic (exponential backoff, max 5 retries)
5. Sync history log viewable in Settings > Integrations > Sync Log
6. Batch sync capability for initial import (paginated, rate-limited)

### Task 20 — Calendar Integration Hardening

Ensure `src/app/app/calendar/` is fully functional:
1. Two-way sync with Google Calendar and Microsoft Outlook
2. Availability detection: when booking appointments, check agent's real calendar for conflicts
3. Automatic calendar event creation when appointments are booked via AI agent
4. Calendar event includes: contact name, phone, call summary, AI agent name, recording link
5. Reschedule and cancel operations sync back to external calendar
6. Buffer time configuration between appointments (e.g., 15-minute gaps)

### Task 21 — Webhook System for External Integrations

Create `src/app/app/developer/webhooks/page.tsx`:
1. Create/manage webhook endpoints with: URL, events to subscribe, secret for signature verification
2. Event types: call.started, call.completed, call.failed, lead.created, lead.updated, lead.converted, appointment.booked, appointment.completed, campaign.completed, payment.received
3. Webhook delivery log with: timestamp, event, response status, response time, payload (expandable)
4. Retry failed deliveries manually or automatically
5. Test webhook button that sends a sample payload
6. API route `POST /api/developer/webhooks` for CRUD operations

### Task 22 — Zapier/Make Integration Triggers

Create `src/app/api/integrations/zapier/` routes:
1. Authentication endpoint for Zapier OAuth
2. Trigger endpoints that Zapier can poll: new_call, new_lead, new_appointment, call_completed
3. Action endpoints that Zapier can invoke: create_lead, update_lead, trigger_campaign, create_appointment
4. Proper pagination, deduplication keys, and sample data for Zapier's UI
5. Document the available triggers and actions in the Developer docs page

### Task 23 — Email Integration

Create `src/lib/integrations/email.ts`:
1. Workspace email configuration (SMTP settings or SendGrid/Resend API key)
2. Email templates for: appointment confirmation, appointment reminder, follow-up after call, missed call notification, campaign summary
3. Template editor with variable interpolation: `{{contact.name}}`, `{{appointment.date}}`, `{{agent.name}}`
4. Email send queue with delivery tracking
5. Add email actions to campaign sequences (currently only calls and SMS)

### Task 24 — Slack/Teams Notifications

Create `src/lib/integrations/slack.ts`:
1. Slack app installation flow (OAuth)
2. Configurable notifications: new lead alerts, call completion summaries, daily digest, appointment reminders, quality alerts (flagged calls)
3. Channel selector for each notification type
4. Rich message formatting with call details, lead info, and quick action buttons
5. Same functionality for Microsoft Teams via incoming webhook

---

## PHASE 4: AGENT INTELLIGENCE & UX TRANSFORMATION (Tasks 25–35)

> This phase transforms the agent setup from configuration to intelligence, and polishes every user-facing surface to launch-grade quality.

### Task 25 — Agent Setup Wizard Rethink

Replace the current agent creation flow with a guided wizard at `src/app/app/agents/new/page.tsx`:

Step 1 — **Purpose**: "What will this agent do?" — Card selection: Answer Calls, Make Calls, Both. Shows relevant templates below.

Step 2 — **Personality**: Choose voice (with inline preview), set speaking speed, choose conversation style (professional, friendly, casual, authoritative), set language.

Step 3 — **Knowledge**: Upload or link knowledge base documents. Show a progress indicator as documents are processed. Quick-add: business hours, FAQs, product catalog, pricing.

Step 4 — **Rules**: Define what the agent should and shouldn't do. Pre-populated based on template. Objection handling configuration with suggested responses. BANT qualification toggle with field configuration.

Step 5 — **Phone & Schedule**: Assign phone number (from provisioned numbers), set active hours, set timezone, configure voicemail behavior.

Step 6 — **Test**: Live test call simulator. User calls a test number or clicks "Simulate Inbound Call" to hear the agent in action. Show real-time transcript during test.

Step 7 — **Launch**: Review summary card, toggle agent to active, show estimated monthly cost.

Each step must have: progress indicator, back/next navigation, "Save Draft" capability, and form validation preventing progression with missing required fields.

### Task 26 — Agent Performance Analytics

Create `src/app/app/agents/[id]/analytics/page.tsx`:

1. Agent-specific KPIs: calls handled, avg duration, success rate, quality score, customer satisfaction
2. Trend charts: daily call volume, quality over time, success rate trend
3. Comparison with other agents in the workspace
4. Top performing scripts/responses (based on outcomes)
5. Common caller intents and how the agent handled them
6. Recommendations engine: "This agent's success rate drops on Fridays — consider adjusting the script"

### Task 27 — Conversation Flow Builder

Create `src/app/app/agents/[id]/flow-builder/page.tsx`:

1. Visual node-based flow editor (use `@xyflow/react` — install it)
2. Node types: Start, Greeting, Question, Branch (if/else), Transfer, Book Appointment, End Call, Custom Action
3. Drag-and-drop nodes onto canvas, connect with edges
4. Each node has configuration: what the agent says, expected responses, timeout behavior
5. Branch nodes support conditions: caller said X, time of day, caller history, custom variable
6. Export flow as JSON stored in agent configuration
7. Preview mode: step through the flow with simulated responses

```bash
npm install @xyflow/react
```

### Task 28 — Real-Time Call Monitoring Dashboard

Create `src/app/app/calls/live/page.tsx`:

1. Show all currently active calls across the workspace in real-time
2. Each active call card: caller number, agent name, duration timer, live sentiment indicator, live transcript scroll
3. Supervisor controls: Listen In (silent), Whisper (speak to agent only), Barge In (join call)
4. Powered by Supabase Realtime — subscribe to `active_calls` channel
5. Call queue visualization: calls waiting, avg wait time, longest wait
6. Emergency takeover button for urgent situations

### Task 29 — Campaign Builder Enhancement

Enhance `src/app/app/campaigns/`:

1. Visual sequence builder: drag-and-drop timeline of touchpoints (call, SMS, email, wait)
2. Branch logic: if call answered → path A, if voicemail → path B, if no answer → retry
3. A/B testing: split contacts into groups with different scripts, track which performs better
4. Campaign scheduling: one-time, recurring, trigger-based (new lead enters pipeline)
5. Real-time campaign progress dashboard: contacted, reached, converted, failed, remaining
6. Automatic pause on negative signal (contact requests removal, complaint detected)
7. Campaign ROI calculator: cost of calls/SMS vs. revenue from conversions

### Task 30 — Smart Lead Scoring

Create `src/lib/leads/scoring.ts`:

1. Configurable scoring model with weighted factors:
   - Engagement: calls answered (10pts), replied to SMS (5pts), clicked link (3pts)
   - Qualification: BANT score (0-25pts each for Budget, Authority, Need, Timeline)
   - Behavior: visited pricing page (15pts), requested demo (20pts), opened email (5pts)
   - Recency: last interaction < 24h (10pts), < 7d (5pts), > 30d (-10pts)
2. Auto-calculate score on every lead interaction update
3. Visual score display on lead cards (circular progress, color-coded)
4. Sort/filter leads by score on the leads page
5. Auto-assign lead temperature: Hot (80+), Warm (50-79), Cool (25-49), Cold (<25)
6. Score history chart on individual lead detail page

### Task 31 — Notification Center

Create `src/components/ui/NotificationCenter.tsx`:

1. Bell icon in the app shell header with unread badge count
2. Dropdown panel showing recent notifications grouped by type
3. Notification types: new lead, call completed, appointment booked, campaign milestone, quality alert, billing event, system update
4. Mark as read, mark all as read, notification preferences link
5. Real-time via Supabase Realtime subscription
6. Store in `revenue_operator.notifications` table with RLS

**Migration**:
```sql
CREATE TABLE IF NOT EXISTS revenue_operator.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE revenue_operator.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_notifications" ON revenue_operator.notifications
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX idx_notifications_user_unread ON revenue_operator.notifications(user_id, read) WHERE read = false;
```

### Task 32 — Onboarding Checklist Enhancement

Update the dashboard onboarding checklist in `src/app/app/activity/page.tsx`:

1. Dynamic checklist that tracks ACTUAL completion (not just clicks):
   - [ ] Set up your business profile → check if workspace has name, address, phone
   - [ ] Configure your first AI agent → check if workspace has ≥1 agent
   - [ ] Get a phone number → check if workspace has ≥1 provisioned number
   - [ ] Make a test call → check if workspace has ≥1 completed call
   - [ ] Import your contacts → check if workspace has ≥10 contacts
   - [ ] Set up your calendar → check if calendar integration is connected
   - [ ] Launch your first campaign → check if workspace has ≥1 campaign
   - [ ] Invite your team → check if workspace has ≥2 members
2. Progress bar showing completion percentage
3. Each item links to the relevant page
4. Dismiss checklist permanently when all items complete or user clicks "I know what I'm doing"
5. Celebration animation (confetti) when checklist reaches 100%

### Task 33 — Settings Consolidation & Polish

Audit every settings page under `src/app/app/settings/` and ensure:

1. Every form has: proper validation (Zod), loading state on submit, success toast, error toast with specific message
2. Every setting persists to the backend (no localStorage-only settings)
3. Settings pages: Business Profile, Phone Numbers, AI Agent Defaults, Integrations, Notifications, Call Rules, Compliance, Billing, Team Management
4. Add "Danger Zone" section to Business Profile settings: delete workspace (with confirmation modal, type workspace name to confirm)
5. Add audit log for all settings changes in Settings > Activity Log

### Task 34 — Performance Optimization Pass

1. Audit every page for unnecessary re-renders using React DevTools profiler patterns:
   - Wrap expensive computations in `useMemo`
   - Wrap callback props in `useCallback`
   - Use `React.memo` on list item components (agent cards, lead cards, call cards)
2. Implement route-based code splitting — ensure dynamic imports for heavy pages:
   ```typescript
   const FlowBuilder = dynamic(() => import('./FlowBuilder'), {
     loading: () => <Skeleton className="h-[600px]" />,
     ssr: false
   });
   ```
3. Image optimization: ensure all images use `next/image` with proper `width`, `height`, and `priority` on above-fold images
4. API response caching: add `Cache-Control` headers to read-only API routes (GET endpoints for static data like voices, templates)
5. Database query optimization: add missing indexes for common queries (check EXPLAIN ANALYZE on the 10 most-hit endpoints)
6. Lighthouse audit: achieve 90+ on Performance, Accessibility, Best Practices, SEO on both marketing site and app pages

### Task 35 — Comprehensive Error Boundary & Recovery System

1. Create `src/components/ErrorBoundary.tsx` — a reusable error boundary component with:
   - Friendly error UI (not a blank page) matching dark theme
   - "Try Again" button that resets the error boundary
   - "Report Issue" button that captures error details and sends to a logging endpoint
   - Different messaging for: network errors, auth errors, data errors, unknown errors
2. Wrap every page-level component in an error boundary
3. Create `src/lib/error-reporting.ts`:
   - Capture unhandled promise rejections
   - Capture React error boundaries
   - Send to `POST /api/errors/report` with: error message, stack trace, user agent, page URL, user ID (no PII)
   - Store in `revenue_operator.error_reports` table for admin review
4. Create an admin error dashboard at `src/app/app/settings/errors/page.tsx` showing recent errors grouped by type

---

## PHASE 5: LAUNCH READINESS & POLISH (Tasks 36–42)

### Task 36 — SEO & Marketing Site Polish

1. Verify every marketing page (`/`, `/pricing`, `/about`, `/docs`, `/blog` if exists) has:
   - Unique `<title>` and `<meta name="description">` with target keywords
   - OpenGraph tags (og:title, og:description, og:image, og:url)
   - Twitter Card tags (twitter:card, twitter:title, twitter:description, twitter:image)
   - Canonical URL
   - Structured data (JSON-LD) for: Organization, Product, FAQ, Pricing
2. Create `src/app/sitemap.ts` that generates a dynamic sitemap including all marketing pages
3. Create `src/app/robots.ts` with proper allow/disallow rules
4. Ensure all marketing pages score 95+ on Lighthouse SEO
5. Add breadcrumb structured data to docs pages

### Task 37 — Accessibility Audit & Fix

Run an accessibility audit on every page and fix all issues:

1. Every interactive element must have a visible focus indicator (2px solid accent blue outline)
2. Every image must have descriptive alt text
3. Every form input must have an associated `<label>` (not just placeholder)
4. Color contrast: all text must meet WCAG AA contrast ratios against dark backgrounds
5. Keyboard navigation: every action must be reachable via Tab/Shift+Tab, activated via Enter/Space
6. ARIA labels on all icon-only buttons
7. Skip to main content link (already exists — verify it works on every page)
8. Screen reader announcements for dynamic content changes (toast notifications, real-time updates)
9. Reduced motion: respect `prefers-reduced-motion` media query — disable Framer Motion animations

### Task 38 — Loading & Empty State Polish

Audit every page and ensure:

1. Every page has a skeleton loader that matches the actual content layout (not generic spinners)
2. Every list/table has an empty state with: illustration or icon, descriptive message, primary CTA button
3. Error states are distinct from empty states (error = red accent, retry button; empty = muted, create button)
4. Optimistic UI updates: when user creates/updates/deletes, update UI immediately before server confirms
5. Loading states for all buttons that trigger async operations (spinner inside button, button disabled)
6. Infinite scroll or pagination on all list views with 50+ potential items

### Task 39 — Mobile Experience Polish

Test every page at 375px width and fix all issues:

1. All tables must become card views on mobile (no horizontal scroll on data tables)
2. All modals must be full-screen on mobile with a close button in the top-right
3. Bottom navigation must highlight the current page
4. Touch targets must be minimum 44px × 44px
5. No content clipping or overflow on any page
6. Drag-and-drop (Kanban boards) must work with touch events
7. Charts must be readable on mobile with appropriate font sizes
8. Form inputs must not zoom on focus (set font-size to 16px minimum on mobile)

### Task 40 — End-to-End Test Suite

Create `__tests__/e2e/` with critical user journey tests using the existing test framework:

1. `onboarding-flow.test.ts` — Complete onboarding: sign up → business setup → agent creation → phone number → first test call
2. `lead-lifecycle.test.ts` — Create lead → update status → qualify → convert → won
3. `campaign-flow.test.ts` — Create campaign → add contacts → launch → track results
4. `billing-flow.test.ts` — Select plan → enter payment → verify subscription → upgrade → cancel
5. `agent-management.test.ts` — Create agent → configure voice → assign number → activate → view analytics
6. `call-flow.test.ts` — Initiate test call → verify transcript → check quality score → view in call intelligence

Each test must: assert API responses, verify database state changes, and check UI updates.

### Task 41 — Documentation Site Upgrade

Enhance `src/app/docs/page.tsx`:

1. Add search functionality (filter docs sections by keyword)
2. Add code examples with syntax highlighting for every API endpoint
3. Add "Copy" button on all code blocks
4. Add a "Quick Start" guide as the first section with a 5-minute setup flow
5. Add API reference section documenting every public endpoint: method, path, auth requirement, request/response schema, example
6. Add SDK examples (curl, JavaScript, Python) for common operations
7. Add changelog section showing recent platform updates
8. Add "Was this helpful?" feedback widget at the bottom of each section

### Task 42 — Pre-Launch Smoke Test & Hardening

This is the final verification task. Do ALL of the following:

1. Run `npx tsc --noEmit` — must exit with 0 errors
2. Run `next build` — must complete without errors
3. Run all tests — must pass
4. Verify every API route returns proper error responses for: missing auth (401), wrong workspace (403), invalid input (400), not found (404)
5. Verify all Supabase RLS policies work: create a test that tries to access workspace A's data with workspace B's credentials — must be blocked
6. Verify Stripe webhook signature verification rejects tampered payloads
7. Verify CSP headers are present on all responses
8. Verify no console.error or console.warn messages appear during normal app usage
9. Run `npm audit` and fix any high/critical vulnerabilities
10. Verify all environment variables are documented in `.env.example` with descriptions

**PROOF**: Paste the full output of `npx tsc --noEmit && echo "TYPECHECK PASSED" && npm run build && echo "BUILD PASSED" && npm test && echo "TESTS PASSED"`.

---

## EXECUTION RULES

1. **Complete every task in order within each phase.** Do not skip ahead.
2. **After each phase**, run `npx tsc --noEmit` and `npm run build`. Fix any errors before proceeding.
3. **Every new database table/column requires a migration file** in `supabase/migrations/`. Name format: `XXX_description.sql` where XXX is the next sequential number.
4. **Every migration must include RLS policies.** No exceptions.
5. **Every API route must use `requireWorkspaceAccess(req)`** and filter by `workspace.id`.
6. **Never use `any` type in TypeScript.** Use proper types or `unknown` with type guards.
7. **Never use `console.log` in production code.** Use proper error handling and logging.
8. **Every user-facing string must go through the i18n system** (after Phase 1 is complete).
9. **Test every feature you build.** Add at least one test file per major feature.
10. **Commit after each phase** with message: `feat: Phase N — [description]`
11. **Do not modify existing working features** unless explicitly required by a task.
12. **When in doubt, read the existing code first.** Match patterns already established in the codebase.
