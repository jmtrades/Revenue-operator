# PHASE 7: CURSOR IMPLEMENTATION BRIEF

**Date:** March 17, 2026
**Purpose:** Engineering-ready build plan for Recall Touch redesign

---

## 1. PRODUCT SURFACES TO BUILD

### Priority A: Launch-Critical (Weeks 1-4)

| Surface | Type | Description |
|---------|------|-------------|
| Homepage | Marketing page | Full redesign per Phase 3 spec |
| /pricing | Marketing page | New tiers (Solo/Business/Scale/Enterprise) + ROI calculator |
| /about | Marketing page | Founder info, company story, team |
| /security | Marketing page | Security practices, compliance status |
| /activate | Auth flow | Sign-up → Stripe checkout → onboarding |
| Onboarding wizard (3-step) | App flow | Industry → Connect phone → You're live |
| Dashboard (redesigned) | App page | Revenue impact card, needs attention, recent calls |
| Inbox (redesigned) | App page | Contact timeline with calls + SMS unified |
| Contacts list | App page | Lead list with status, value, last activity |
| Contact detail / timeline | App page | Full interaction history per contact |
| Follow-ups list | App page | Active sequences, templates, status |
| Settings: AI Agent | App page | Greeting, knowledge, capabilities |
| Settings: Phone | App page | Numbers, routing, hours |
| Settings: Voice | App page | Voice selection with preview |
| Settings: Billing | App page | Plan, usage, invoices |
| Settings: Team | App page | Members, roles, invites |

### Priority B: Soon After Launch (Weeks 5-8)

| Surface | Type | Description |
|---------|------|-------------|
| /industries/dental | Landing page | Dental-specific messaging and proof |
| /industries/hvac | Landing page | HVAC-specific messaging and proof |
| /industries/legal | Landing page | Legal-specific messaging and proof |
| /results | Marketing page | Case studies (once available) |
| /compare | Marketing page | vs. competitors |
| /demo | Marketing page | Interactive voice demo (already exists — polish) |
| Follow-up workflow editor | App page | Linear step builder for sequences |
| Analytics page | App page | Full reporting with charts |
| Calendar view | App page | Appointment calendar |

### Priority C: Delay (Month 3+)

| Surface | Type |
|---------|------|
| /product (feature deep-dive) | Marketing |
| /blog | Marketing |
| /integrations | Marketing |
| Pipeline view (Sales Mode) | App |
| Solo Mode dashboard variant | App |
| Mobile-optimized views | App |
| API documentation | Docs |
| White-label configuration | App |

### Priority D: Remove/Hide Now

| Surface | Action |
|---------|--------|
| All fabricated testimonials | DELETE from codebase |
| "500+ businesses" claims | DELETE from all pages |
| "$2.1M+ revenue recovered" | DELETE |
| SOC 2 badge (change to "in progress") | EDIT |
| 99.9% uptime SLA | REMOVE until status page exists |
| Solutions nav dropdown (broken links) | FIX to point to /industries/* |
| "Docs" from main navigation | MOVE to footer |
| Dashboard: capsule data, retention intercept, reversion states | REPLACE with business language |
| 40+ intelligence engine directories | SIMPLIFY — consolidate to simple AI prompt management |
| Governance, compliance, delivery assurance systems | HIDE from UI |

---

## 2. CORE DATA MODEL

### Primary Entities

```sql
-- Workspaces (multi-tenant root)
workspaces
  id: uuid (PK)
  name: text
  industry: enum (dental, hvac, legal, medspa, roofing, healthcare, coaching, other)
  mode: enum (solo, business, sales) -- default: business
  website_url: text?
  phone: text?
  address: text?
  timezone: text (default: America/New_York)
  avg_job_value: decimal -- for revenue attribution
  business_hours: jsonb -- {mon: {open: "09:00", close: "17:00"}, ...}
  stripe_customer_id: text
  stripe_subscription_id: text
  plan: enum (solo, business, scale, enterprise)
  billing_interval: enum (monthly, annual)
  trial_ends_at: timestamptz?
  created_at: timestamptz

-- Users
users
  id: uuid (PK, from Supabase Auth)
  email: text
  name: text
  workspace_id: uuid (FK → workspaces)
  role: enum (owner, admin, member)
  notification_prefs: jsonb
  created_at: timestamptz

-- AI Agents
agents
  id: uuid (PK)
  workspace_id: uuid (FK)
  name: text
  greeting: text
  system_prompt: text -- generated from industry pack + customization
  voice_id: text -- reference to voice provider voice
  voice_provider: enum (elevenlabs, in_house)
  capabilities: jsonb -- {book: true, capture: true, transfer: true, text: true}
  knowledge_base: jsonb -- {services: [], hours: {}, faq: [], policies: []}
  industry_pack: text? -- reference to pack config
  is_active: boolean
  created_at: timestamptz

-- Phone Numbers
phone_numbers
  id: uuid (PK)
  workspace_id: uuid (FK)
  agent_id: uuid (FK → agents)
  number: text (E.164)
  provider: text (twilio)
  provider_sid: text
  is_active: boolean
  created_at: timestamptz

-- Contacts
contacts
  id: uuid (PK)
  workspace_id: uuid (FK)
  name: text?
  phone: text?
  email: text?
  status: enum (new, contacted, qualified, booked, completed, lost, archived)
  estimated_value: decimal? -- from workspace avg_job_value or manually set
  tags: text[]
  notes: text?
  ai_summary: text? -- AI-generated relationship summary
  source: enum (inbound_call, missed_call, outbound, manual, import)
  created_at: timestamptz
  last_activity_at: timestamptz

-- Calls
calls
  id: uuid (PK)
  workspace_id: uuid (FK)
  contact_id: uuid (FK → contacts)
  agent_id: uuid (FK → agents)
  phone_number_id: uuid (FK → phone_numbers)
  direction: enum (inbound, outbound)
  status: enum (completed, missed, voicemail, transferred, failed)
  duration_seconds: int
  recording_url: text?
  transcript: text?
  ai_summary: text?
  outcome: enum (appointment_booked, lead_captured, message_taken, question_answered, transferred, no_action, spam)
  cost_cents: int -- tracked for billing
  provider_call_id: text
  started_at: timestamptz
  ended_at: timestamptz

-- Messages (SMS + Email unified)
messages
  id: uuid (PK)
  workspace_id: uuid (FK)
  contact_id: uuid (FK → contacts)
  channel: enum (sms, email)
  direction: enum (inbound, outbound)
  content: text
  subject: text? -- email only
  status: enum (sent, delivered, failed, received)
  triggered_by: enum (manual, workflow, system)
  workflow_step_id: uuid? -- FK to workflow step that triggered this
  cost_cents: int
  sent_at: timestamptz

-- Appointments
appointments
  id: uuid (PK)
  workspace_id: uuid (FK)
  contact_id: uuid (FK → contacts)
  call_id: uuid? -- the call that created this appointment
  service_type: text?
  scheduled_at: timestamptz
  duration_minutes: int (default: 30)
  status: enum (confirmed, completed, no_show, cancelled, rescheduled)
  reminder_sent: boolean (default: false)
  confirmation_sent: boolean (default: false)
  calendar_event_id: text? -- Google/Outlook event ID
  created_at: timestamptz

-- Follow-Up Workflows (templates)
workflows
  id: uuid (PK)
  workspace_id: uuid (FK)
  name: text
  trigger: enum (missed_call, appointment_booked, no_show, quote_sent, manual, contact_created, days_inactive)
  trigger_config: jsonb -- e.g., {days_inactive: 60}
  is_active: boolean
  is_template: boolean -- true for industry-pack defaults
  created_at: timestamptz

-- Workflow Steps
workflow_steps
  id: uuid (PK)
  workflow_id: uuid (FK)
  step_order: int
  channel: enum (sms, call, email)
  delay_seconds: int -- seconds after trigger or previous step
  delay_condition: enum (after_trigger, after_previous, if_no_reply)
  message_template: text -- with {name}, {business}, {booking_link} variables
  call_script: text? -- for outbound call steps
  created_at: timestamptz

-- Workflow Enrollments (contacts in active workflows)
workflow_enrollments
  id: uuid (PK)
  workflow_id: uuid (FK)
  contact_id: uuid (FK)
  current_step: int
  status: enum (active, completed, paused, stopped)
  stop_reason: enum (replied, booked, opted_out, manual, completed)?
  enrolled_at: timestamptz
  last_step_at: timestamptz
  next_step_at: timestamptz

-- Usage Tracking
usage_events
  id: uuid (PK)
  workspace_id: uuid (FK)
  event_type: enum (voice_minute, sms_sent, sms_received, email_sent, api_call)
  quantity: decimal -- e.g., 3.5 minutes
  cost_cents: int
  reference_id: uuid? -- FK to call, message, etc.
  recorded_at: timestamptz

-- Billing / Invoices (supplement Stripe)
billing_periods
  id: uuid (PK)
  workspace_id: uuid (FK)
  period_start: date
  period_end: date
  plan: text
  base_amount_cents: int
  overage_amount_cents: int
  total_minutes_used: decimal
  included_minutes: decimal
  overage_minutes: decimal
  overage_rate_cents: int
  stripe_invoice_id: text?
```

### Key Indexes

```sql
CREATE INDEX idx_calls_workspace_date ON calls (workspace_id, started_at DESC);
CREATE INDEX idx_contacts_workspace_activity ON contacts (workspace_id, last_activity_at DESC);
CREATE INDEX idx_messages_contact ON messages (contact_id, sent_at DESC);
CREATE INDEX idx_workflow_enrollments_next ON workflow_enrollments (status, next_step_at) WHERE status = 'active';
CREATE INDEX idx_usage_workspace_period ON usage_events (workspace_id, recorded_at);
CREATE INDEX idx_appointments_workspace_date ON appointments (workspace_id, scheduled_at);
```

### Row-Level Security

All tables use workspace_id-based RLS. Users can only access data in their workspace. The workspace_id comes from the authenticated user's workspace membership.

---

## 3. BACKEND / SYSTEM REQUIREMENTS

### Workflow Execution Engine

**The most critical backend component.** This is the engine that executes follow-up sequences.

```
Architecture:
┌─────────────────────────────────────────────┐
│  Workflow Scheduler (cron-based)              │
│  Runs every 60 seconds                       │
│  Queries: workflow_enrollments               │
│    WHERE status = 'active'                   │
│    AND next_step_at <= NOW()                 │
│                                              │
│  For each due enrollment:                    │
│    1. Load workflow step                     │
│    2. Check stop conditions (replied? booked?)│
│    3. Execute action (send SMS, make call)   │
│    4. Update enrollment (next step, time)    │
│    5. Record usage event                     │
│    6. If final step → mark completed         │
└─────────────────────────────────────────────┘
```

**Implementation:** Use a reliable job scheduler. Options:
- Supabase Edge Functions with pg_cron (simplest, stays in-stack)
- Vercel Cron Jobs (if on Vercel)
- BullMQ with Redis (most robust, already have Redis)

**Recommendation:** BullMQ + Redis. It handles retries, dead-letter queues, concurrency control, and delayed jobs natively. The workflow scheduler adds due enrollments to the BullMQ queue, and workers process them.

### Voice Call Webhook Handler

Vapi (and later, in-house orchestrator) sends webhooks for call events:

```
POST /api/webhooks/voice
Events:
  - call.started → Create call record, look up or create contact
  - call.transcript.partial → Stream transcript (optional, for real-time)
  - call.function.called → Handle tool calls (book appointment, capture lead, send SMS)
  - call.ended → Finalize call record, generate summary, trigger workflows
  - call.recording.ready → Store recording URL
```

**Critical:** The function calling handler must be fast (<2s response). When the AI decides to book an appointment mid-call, the backend must check calendar availability, create the appointment, and confirm — all within the conversational pause.

### Analytics Aggregation

**Real-time aggregation is not needed.** Use materialized views or scheduled aggregation:

```sql
-- Daily aggregation job (runs at midnight)
INSERT INTO analytics_daily (workspace_id, date, calls_answered, leads_captured, appointments_booked, estimated_revenue, minutes_used)
SELECT
  workspace_id,
  DATE(started_at),
  COUNT(*),
  COUNT(*) FILTER (WHERE outcome = 'lead_captured'),
  COUNT(*) FILTER (WHERE outcome = 'appointment_booked'),
  COUNT(*) FILTER (WHERE outcome IN ('lead_captured', 'appointment_booked')) * w.avg_job_value,
  SUM(duration_seconds) / 60.0
FROM calls c
JOIN workspaces w ON c.workspace_id = w.id
WHERE DATE(started_at) = CURRENT_DATE - 1
GROUP BY workspace_id, DATE(started_at);
```

The dashboard reads from analytics_daily for historical data and queries calls/contacts directly for today's real-time numbers.

### Billing Meter Events

Every billable action must create a usage_event:

| Event | When | Quantity |
|-------|------|----------|
| voice_minute | Call ends | Duration in minutes (rounded up to nearest 0.1) |
| sms_sent | SMS delivered | 1 per segment |
| sms_received | SMS received | 1 per segment |
| email_sent | Email delivered | 1 |

**End-of-period billing calculation:**

```
total_minutes = SUM(voice_minute events in period)
included_minutes = plan.included_minutes
overage_minutes = MAX(0, total_minutes - included_minutes)
overage_charge = overage_minutes * plan.overage_rate
total_charge = plan.base_price + overage_charge
```

Report to Stripe as metered usage. Stripe generates the invoice.

---

## 4. FRONTEND REQUIREMENTS

### Tech Stack (Keep Existing)

- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion (for onboarding and marketing page animations)
- Recharts (for analytics charts)
- Lucide React (icons)

### Component Architecture

```
src/
  components/
    ui/           # Primitives: Button, Card, Input, Badge, Dialog, Tooltip
    layout/       # Sidebar, TopBar, MobileNav, PageContainer
    marketing/    # Hero, PricingCard, TestimonialCard, ComparisonTable, ROICalculator
    dashboard/    # RevenueImpactCard, NeedsAttentionList, RecentCallsList
    inbox/        # ConversationList, ContactTimeline, MessageBubble, TranscriptView
    contacts/     # ContactCard, ContactDetail, StatusBadge
    followups/    # WorkflowCard, WorkflowEditor, StepCard, EnrollmentList
    analytics/    # MetricCard, CallsByHourChart, FollowUpPerformance
    settings/     # VoiceSelector, AgentConfig, PhoneConfig, BillingUsage
    onboarding/   # IndustrySelector, PhoneConnect, GoLive
```

### Design System Constants

```typescript
// colors.ts
export const colors = {
  background: '#FAFAF8',       // Warm white
  surface: '#FFFFFF',          // Cards
  surfaceAlt: '#F5F5F0',      // Alternating section backgrounds
  text: {
    primary: '#1A1A1A',       // Headings
    secondary: '#4A4A4A',     // Body
    tertiary: '#8A8A8A',      // Captions
  },
  accent: {
    teal: '#0D6E6E',          // Primary accent
    tealLight: '#E6F2F2',     // Teal background
    amber: '#D4A853',         // Premium/highlight
  },
  status: {
    success: '#16A34A',
    warning: '#D97706',
    error: '#DC2626',
    info: '#2563EB',
  },
  border: '#E5E5E0',
};

// spacing, typography, etc.
export const borderRadius = '12px';  // Not 24px
export const fontFamily = 'Inter, system-ui, sans-serif';
```

---

## 5. INDUSTRY PACK CONFIGURATION FORMAT

```typescript
// src/lib/industry-packs/dental.ts
export const dentalPack: IndustryPack = {
  id: 'dental',
  name: 'Dental Practice',
  greeting: "Thank you for calling {business_name}, how can I help you today?",
  avgJobValue: 3200,  // Default estimated patient value
  appointmentTypes: [
    { name: 'Cleaning', duration: 60 },
    { name: 'Exam', duration: 30 },
    { name: 'Crown', duration: 90 },
    { name: 'Emergency', duration: 45 },
    { name: 'Consultation', duration: 30 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "Do you accept insurance?", a: "We accept most major dental insurance plans. Can I get your insurance information to verify your coverage?" },
      { q: "What are your hours?", a: "Our hours are {business_hours}. Would you like to schedule an appointment?" },
      // ... more FAQ
    ],
  },
  workflows: [
    {
      name: 'Missed Call Recovery',
      trigger: 'missed_call',
      steps: [
        { channel: 'sms', delay: 60, template: "Hi {name}, we missed your call to {business_name}. How can we help? Reply here or we'll call you back." },
        { channel: 'call', delay: 7200, condition: 'if_no_reply', script: "Hi, this is {business_name} returning your call from earlier. How can we help?" },
        { channel: 'sms', delay: 86400, condition: 'if_no_reply', template: "Hi {name}, just following up. Book a time that works for you: {booking_link}" },
      ],
    },
    {
      name: 'Appointment Reminder',
      trigger: 'appointment_booked',
      steps: [
        { channel: 'sms', delay: 0, template: "Your appointment at {business_name} is confirmed for {appointment_time}. Reply C to confirm or R to reschedule." },
        { channel: 'sms', delay: -86400, template: "Reminder: Your appointment at {business_name} is tomorrow at {appointment_time}. Reply R to reschedule." },
        { channel: 'sms', delay: -7200, template: "Your appointment at {business_name} is in 2 hours at {appointment_time}. See you soon!" },
      ],
    },
    {
      name: 'No-Show Recovery',
      trigger: 'no_show',
      steps: [
        { channel: 'sms', delay: 1800, template: "Hi {name}, we missed you at your appointment today. Would you like to reschedule? Reply YES or call us." },
        { channel: 'call', delay: 86400, condition: 'if_no_reply', script: "Hi {name}, this is {business_name}. We noticed you couldn't make your appointment yesterday. Can we reschedule?" },
        { channel: 'sms', delay: 172800, condition: 'if_no_reply', template: "Hi {name}, we'd love to get you rescheduled. Book a new time here: {booking_link}" },
      ],
    },
  ],
};
```

### Industry Packs to Build at Launch

1. `dental.ts`
2. `hvac.ts`
3. `legal.ts`
4. `medspa.ts`
5. `roofing.ts`
6. `general.ts` (catch-all for "Other")

---

## 6. ROLLOUT ORDER

### Week 1: Trust Cleanup + Pricing Fix

**Engineering tasks:**
1. Remove all hardcoded fake testimonials from `TestimonialsSection.tsx` and i18n files
2. Remove "500+" claims from Hero, TrustBar, demo page, pricing page
3. Remove "$2.1M+" from pricing page
4. Change SOC 2 badge text to "SOC 2 in progress" in all locations
5. Remove "99.9% uptime" claim
6. Fix SOLUTIONS_LINKS to point to `/industries/*` paths (not `/solutions/*`)
7. Update PRICING_TIERS in constants.ts to final pricing: Solo $49, Business $297, Scale $997
8. Update Stripe price IDs to match new tiers
9. Add annual pricing option to pricing page and checkout

### Week 2: Onboarding Redesign

**Engineering tasks:**
1. Simplify onboarding from 5 steps to 3 (Industry+BizInfo → Phone → Live)
2. Build industry pack auto-loading on industry selection
3. Build "Call your number to test" screen as final onboarding step
4. Auto-generate AI agent with industry defaults (no manual config required in onboarding)
5. Add skip option for phone setup ("Show me the dashboard first")

### Week 3: Dashboard + Inbox Redesign

**Engineering tasks:**
1. Build RevenueImpactCard component (calls, leads, appointments, estimated value, trend)
2. Build NeedsAttentionList (items requiring human action)
3. Build RecentCallsList
4. Redesign dashboard page with new layout (remove capsule/handoff/reversion UI)
5. Build unified contact timeline in inbox (calls + SMS + email chronological)
6. Build conversation list panel (left) + detail panel (right) layout
7. Add inline SMS reply from inbox

### Week 4: Follow-Up Engine + Settings

**Engineering tasks:**
1. Build workflow_enrollments processor (BullMQ scheduler)
2. Build follow-up list view (active workflows, status, metrics)
3. Build basic linear workflow editor (trigger → steps → stop conditions)
4. Pre-populate industry pack workflows as templates
5. Build voice selector with preview in Settings
6. Build billing/usage page showing current period usage and overages
7. Create /about page with real founder information

### Weeks 5-8: Marketing Pages + Polish

1. Build /industries/dental, /industries/hvac, /industries/legal landing pages
2. Build /compare page with competitor comparison
3. Build /results page (placeholder with beta metrics, ready for real case studies)
4. Build ROI calculator component for pricing page
5. Homepage full redesign (new layout, new copy, new visual direction)
6. Implement light-mode design system (warm white, teal accent)
7. Build analytics page with charts (calls by hour, follow-up performance, usage)
8. Build calendar view for appointments

---

## 7. LAUNCH-FIRST PRIORITIES (The Absolute Minimum to Start Selling)

If you can only build 10 things before going to market:

1. **Remove fake social proof** (1 day)
2. **Fix pricing to Solo/Business/Scale** (1 day)
3. **3-step onboarding with industry packs** (3 days)
4. **Revenue impact dashboard card** (2 days)
5. **Unified contact timeline in inbox** (3 days)
6. **Missed call recovery workflow** (3 days — the core differentiator)
7. **Appointment reminder workflow** (2 days)
8. **Voice selector with preview** (1 day)
9. **Billing/usage page with overage tracking** (2 days)
10. **Real /about page** (1 day)

**Total: ~19 engineering days.** With one strong full-stack engineer, this is 4 weeks of focused work. With two, it's 2-3 weeks.

After these 10 items ship, you have a product that:
- Looks honest (no fake proof)
- Gets users live in 5 minutes (simplified onboarding)
- Demonstrates value immediately (revenue impact card)
- Differentiates from competitors (follow-up automation, not just answering)
- Has transparent billing (usage visibility)
- Has a human face (about page)

Everything else is optimization. These 10 things are the launch.

---

*End of Phase 7. Moving to Phase 8.*
