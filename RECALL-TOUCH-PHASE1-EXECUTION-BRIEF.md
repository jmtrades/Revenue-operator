# RECALL TOUCH — PHASE 1 EXECUTION BRIEF

You have the Master Cursor Prompt (V8). That is the complete spec. THIS document is your execution order — what to build RIGHT NOW, in what sequence, with exact file paths and code-level instructions. Do these tasks in order. Do not skip ahead. Mark each done before moving to the next.

This brief accounts for the actual current state of the codebase as of March 18, 2026. Several bugs from the original audit have already been fixed. This document only contains work that STILL NEEDS TO BE DONE.

---

## WHAT'S ALREADY DONE (DO NOT REDO)

These items from the V8 Master Prompt are already implemented correctly. Do not touch them:

- ✅ Root metadata says "Recall Touch — AI Revenue Recovery for Service Businesses"
- ✅ Meta description leads with outcomes, not technology
- ✅ JSON-LD lowPrice is "49", highPrice is "997"
- ✅ No `className="dark"` on `<html>` element — uses CSS variables
- ✅ Sitemap excludes all /app/* private routes
- ✅ middleware.ts exists at project root, guards /app, /admin, /ops routes
- ✅ Session cookie TTL is 30 days with HMAC-SHA256 signing
- ✅ Cron routes use Authorization header (not query params)
- ✅ Rate limiting uses Upstash Redis (not in-memory)
- ✅ Billing copy uses standard terms ("subscription", "plan")
- ✅ Hero headline says "Stop Losing Revenue to Missed Calls And Broken Follow-Up"

---

## SPRINT 1: CLEANUP & CONSOLIDATION (Week 1-2)

### TASK 1.1 — Redirect All Dashboard Routes

**Problem:** `src/app/dashboard/` still has 54 subdirectories (activation, activity, admin, agents, analytics, approvals, assurance, attestations, billing, calendar, calls, campaigns, compliance, connection, contacts, context, coverage, delegation, domains, escalations, follow-ups, import, integrations, leads, live, messages, onboarding, pipeline, policies, preferences, presence, procurement, record, recovery, reports, retention, revenue, settings, team, templates, value, plus root layout/page/loading).

**Action:** Add permanent redirects in `next.config.ts` for every /dashboard/* path. Map each to its /app/* equivalent or to /app if no equivalent exists.

**File:** `next.config.ts`

Add these redirects to the existing redirects array:
```typescript
// Dashboard consolidation — redirect ALL /dashboard/* to /app/*
{ source: '/dashboard', destination: '/app', permanent: true },
{ source: '/dashboard/activity', destination: '/app/activity', permanent: true },
{ source: '/dashboard/analytics', destination: '/app/analytics', permanent: true },
{ source: '/dashboard/analytics/:path*', destination: '/app/analytics', permanent: true },
{ source: '/dashboard/billing', destination: '/app/settings/billing', permanent: true },
{ source: '/dashboard/billing/:path*', destination: '/app/settings/billing', permanent: true },
{ source: '/dashboard/calendar', destination: '/app/calendar', permanent: true },
{ source: '/dashboard/calls', destination: '/app/calls', permanent: true },
{ source: '/dashboard/calls/:path*', destination: '/app/calls', permanent: true },
{ source: '/dashboard/campaigns', destination: '/app/campaigns', permanent: true },
{ source: '/dashboard/campaigns/:path*', destination: '/app/campaigns', permanent: true },
{ source: '/dashboard/contacts', destination: '/app/contacts', permanent: true },
{ source: '/dashboard/contacts/:path*', destination: '/app/contacts', permanent: true },
{ source: '/dashboard/follow-ups', destination: '/app/follow-ups', permanent: true },
{ source: '/dashboard/follow-ups/:path*', destination: '/app/follow-ups', permanent: true },
{ source: '/dashboard/integrations', destination: '/app/settings/integrations', permanent: true },
{ source: '/dashboard/leads', destination: '/app/contacts', permanent: true },
{ source: '/dashboard/leads/:path*', destination: '/app/contacts', permanent: true },
{ source: '/dashboard/messages', destination: '/app/inbox', permanent: true },
{ source: '/dashboard/messages/:path*', destination: '/app/inbox', permanent: true },
{ source: '/dashboard/onboarding', destination: '/activate', permanent: true },
{ source: '/dashboard/pipeline', destination: '/app/contacts', permanent: true },
{ source: '/dashboard/reports', destination: '/app/analytics', permanent: true },
{ source: '/dashboard/revenue', destination: '/app/analytics', permanent: true },
{ source: '/dashboard/settings', destination: '/app/settings', permanent: true },
{ source: '/dashboard/settings/:path*', destination: '/app/settings', permanent: true },
{ source: '/dashboard/team', destination: '/app/settings/team', permanent: true },
{ source: '/dashboard/templates', destination: '/app/follow-ups', permanent: true },
// Enterprise/operational pages → redirect to /app root
{ source: '/dashboard/admin', destination: '/app', permanent: true },
{ source: '/dashboard/admin/:path*', destination: '/app', permanent: true },
{ source: '/dashboard/approvals', destination: '/app', permanent: true },
{ source: '/dashboard/assurance', destination: '/app', permanent: true },
{ source: '/dashboard/attestations', destination: '/app', permanent: true },
{ source: '/dashboard/compliance', destination: '/app', permanent: true },
{ source: '/dashboard/connection', destination: '/app', permanent: true },
{ source: '/dashboard/context', destination: '/app', permanent: true },
{ source: '/dashboard/coverage', destination: '/app', permanent: true },
{ source: '/dashboard/delegation', destination: '/app', permanent: true },
{ source: '/dashboard/domains', destination: '/app', permanent: true },
{ source: '/dashboard/escalations', destination: '/app', permanent: true },
{ source: '/dashboard/import', destination: '/app/contacts', permanent: true },
{ source: '/dashboard/live', destination: '/app', permanent: true },
{ source: '/dashboard/policies', destination: '/app', permanent: true },
{ source: '/dashboard/preferences', destination: '/app/settings', permanent: true },
{ source: '/dashboard/presence', destination: '/app', permanent: true },
{ source: '/dashboard/procurement', destination: '/app', permanent: true },
{ source: '/dashboard/record', destination: '/app', permanent: true },
{ source: '/dashboard/recovery', destination: '/app', permanent: true },
{ source: '/dashboard/retention', destination: '/app', permanent: true },
{ source: '/dashboard/value', destination: '/app', permanent: true },
// Catch-all for anything not explicitly mapped
{ source: '/dashboard/:path*', destination: '/app', permanent: true },
```

After adding redirects: **DO NOT delete the /dashboard directory yet.** The redirects handle routing. We'll archive the files in a later sprint once we confirm no internal links reference them.

### TASK 1.2 — Reduce Homepage to 10 Sections

**Problem:** Homepage currently renders ~15 sections. It should have exactly 10.

**File:** `src/app/page.tsx`

**Keep these 10 sections in this exact order:**
1. `Navbar`
2. `Hero`
3. `ProblemStatement`
4. `HowItWorks`
5. `HomepageRoiCalculator`
6. `Industries`
7. `Features` (rename to "Differentiation" — update heading inside component to "Not Just Another AI Receptionist")
8. `PricingPreview`
9. `HomepageFAQ`
10. `FinalCTA`
11. `Footer`

**Remove these sections from the rendered output:**
- `MetricsSection` — remove import and JSX
- `CompetitorComparison` — remove import and JSX (fold key points into Features/Differentiation section)
- `TestimonialsSection` — remove import and JSX (no real testimonials exist; replace with "Early Access" messaging inside Proof section when we build it)
- `SocialProof` — remove import and JSX (no real proof exists; fake proof damages trust)

**Do not delete the component files** — just remove them from page.tsx imports and rendering.

### TASK 1.3 — Fix Hero Static Fake Data

**Problem:** Hero displays `<HeroRevenueWidget />` with hardcoded fake numbers: $12,840 revenue, 127 calls, 34 appointments, 412 follow-ups. These are not real data and will be inspected by savvy buyers.

**File:** `src/components/sections/Hero.tsx` and the HeroRevenueWidget component (find its file)

**Fix:** Replace the revenue widget with a dashboard MOCKUP that is clearly presented as an illustration:
- Keep the visual design of the widget
- Change the numbers to be clearly labeled as illustrative: add a small caption "Example dashboard" or "Illustration" at the bottom of the widget
- OR replace the widget entirely with a static screenshot/illustration of the dashboard showing "Revenue Recovered: $4,217 this month" with a small "Example" label

**The principle:** If a number looks like real data but isn't, it damages trust. If it's clearly labeled as an example/illustration, it builds aspiration.

### TASK 1.4 — Hide Enterprise/Operational Pages from Navigation

**Problem:** The /app sidebar likely shows links to enterprise features that SMB users don't need: attestations, procurement, delegation, compliance, assurance, coverage, protocol, exposure, reliance, escalations, etc.

**Action:** Audit the /app sidebar navigation component. Find the nav config. Remove or hide all items that are NOT in this list:

**Visible sidebar items (9 only):**
1. Dashboard (home)
2. Calls
3. Contacts
4. Inbox
5. Calendar
6. Follow-Ups
7. Campaigns
8. Analytics
9. Settings

**Everything else** should be hidden from the sidebar. Do not delete the pages — just remove them from the navigation. They can remain accessible via direct URL for admin users.

**Find the sidebar nav config.** It's likely in one of:
- `src/app/app/layout.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/navigation/`
- `src/config/navigation.ts`

### TASK 1.5 — Replace Operational Vocabulary

**Action:** Do a global search-and-replace across ALL user-facing files (components, pages, not lib/backend) for these terms. Only change user-facing strings (labels, headings, descriptions), NOT variable names or database columns.

| Find | Replace With |
|------|-------------|
| "handoff list" | "needs attention" |
| "Handoff List" | "Needs Attention" |
| "operational capsule" | "activity summary" |
| "Operational Capsule" | "Activity Summary" |
| "capsule data" | "call details" |
| "Capsule Data" | "Call Details" |
| "retention intercept" | "follow-up" |
| "Retention Intercept" | "Follow-Up" |
| "economic gravity" | "revenue impact" |
| "Economic Gravity" | "Revenue Impact" |
| "protocol" (as a nav item or heading) | "workflow" |
| "Protocol" (as a nav item or heading) | "Workflow" |
| "exposure" (as a nav item or heading) | "usage" |
| "Exposure" (as a nav item or heading) | "Usage" |
| "reliance" (as a nav item or heading) | "integrations" |
| "Reliance" (as a nav item or heading) | "Integrations" |
| "proof capsule" | "progress report" |
| "Proof Capsule" | "Progress Report" |

**Be careful:** Only replace in user-facing strings. Do NOT rename database columns, API routes, or internal function names in this pass.

### TASK 1.6 — Add sameAs to Organization JSON-LD

**File:** `src/app/layout.tsx`

**Problem:** Organization JSON-LD schema has no `sameAs` field for social profiles.

**Fix:** Add sameAs with any existing social profiles. If none exist yet, add a comment placeholder:
```typescript
// In the Organization JSON-LD object:
"sameAs": [
  // Add social profile URLs when they exist:
  // "https://twitter.com/recalltouch",
  // "https://linkedin.com/company/recalltouch",
]
```

If social profiles DO exist, add the actual URLs.

---

## SPRINT 2: DASHBOARD REBUILD (Week 3-4)

### TASK 2.1 — Build Revenue Recovered Hero Metric

**Location:** `src/app/app/page.tsx` (or the main dashboard page)

This is the most important visual in the entire product. When a user opens /app, the first thing they see must be:

```
Revenue Recovered This Month
$4,217 ↑ 23%
Based on 12 recovered appointments at estimated industry values

[Needs Attention: 3 items]    [Today: 7 calls, 2 bookings]
```

**Implementation:**
1. Query `analytics_daily` for current month, sum `revenue_attributed`
2. Query previous month for comparison (% change)
3. Display large green number (JetBrains Mono, 48px) with trend arrow
4. Below: small text explaining the calculation
5. If no data yet: show "Your first revenue data will appear after your first call"

### TASK 2.2 — Build Needs Attention Queue

Below the revenue hero, left 2/3 of the page.

**Data sources:**
- `contacts` where `status = 'new'` and `created_at > NOW() - INTERVAL '48 hours'` → "New lead — not yet contacted"
- `bookings` where `status = 'confirmed'` and `scheduled_at` between now and +24h and `reminder_24h_sent = false` → "Appointment tomorrow — no reminder sent"
- `bookings` where `status = 'no_show'` and `updated_at > NOW() - INTERVAL '24 hours'` → "No-show — recovery not started"
- `workflow_enrollments` where `status = 'active'` and `next_step_at < NOW()` → "Follow-up overdue"

**Each item shows:** Contact name, reason, time since event, two action buttons (primary action + dismiss).

**Max 10 items.** "View all" link to a filtered contacts/activity page.

### TASK 2.3 — Build Today's Activity Feed

Right 1/3 of dashboard, below revenue hero.

**Data source:** Recent `call_sessions`, `messages`, `bookings`, `workflow_enrollments` from today, ordered by created_at DESC.

**Format:** Compact cards with timestamp:
- "AI answered call from John M. — booked cleaning at 2 PM" (9:15 AM)
- "Follow-up SMS sent to Maria G. — no-show recovery" (10:30 AM)
- "Quote follow-up #2 sent to Robert K." (11:00 AM)

**Real-time:** Subscribe to Supabase Realtime on `call_sessions` and `messages` tables for the workspace. New items appear at top without refresh.

### TASK 2.4 — Build Quick Stats Bar

Bottom of dashboard. Four metric cards in a row:

1. **Calls Today** — count from `call_sessions` where date = today
2. **Appointments Booked** — count from `bookings` created today
3. **Follow-Ups Sent** — count from `messages` where direction=outbound and date = today
4. **Minutes Remaining** — from `usage_events` sum for current billing period vs plan limit. Show as progress bar (green < 60%, amber 60-80%, red > 80%)

### TASK 2.5 — Build New User Empty State

If workspace has 0 call_sessions, show instead of the normal dashboard:

```
Your AI is live and ready.
Call your number to hear it in action:

[  (555) 123-4567  ]  ← big, tappable, teal background

Once you receive your first call, your dashboard
will light up with activity and revenue tracking.

[Call Your Number Now]  ← big teal button that opens tel: link on mobile
```

### TASK 2.6 — Build Mobile Bottom Navigation

**Problem:** Mobile users see a hamburger menu sidebar. Should have bottom nav.

**Create:** `src/components/layout/MobileBottomNav.tsx`

```
Dashboard | Calls | Inbox | More
```

- Show only on screens < 768px
- "More" opens a sheet/drawer with: Contacts, Calendar, Follow-Ups, Campaigns, Analytics, Settings
- Active state: teal icon + label. Inactive: gray.
- Fixed to bottom of viewport, above any keyboard.

Add this component to `src/app/app/layout.tsx` (render only on mobile via media query or Tailwind `md:hidden`).

---

## SPRINT 3: OUTBOUND ENGINE + CAMPAIGNS (Week 5-6)

### TASK 3.1 — Build Campaign Builder (5-Step Wizard)

**Create:** `src/app/app/campaigns/create/page.tsx`

A full-page wizard with 5 steps. Use a stepper component at the top showing progress. Each step saves to local state; final step POSTs to `/api/campaigns`.

**Step 1 — Campaign Type:**
Radio cards for each type: Speed-to-Lead, Lead Qualification, Appointment Setting, No-Show Recovery, Reactivation, Quote Chase, Review Request, Cold Outreach, Custom.

Each card shows: icon, name, 1-line description, expected outcome.

**Step 2 — Audience:**
Filter builder:
- Status dropdown (new, contacted, qualified, booked, inactive, lost)
- Tags multi-select
- Last activity date range
- Source dropdown (inbound_call, manual, csv_import)
- Show matched contact count in real-time as filters change
- "Import CSV" button for cold outreach type

**Step 3 — Sequence:**
Pre-loaded from campaign type template (from industry pack). Editable:
- Each step: channel (SMS/Call/Email), delay from previous step, message template
- Merge field buttons: {firstName}, {businessName}, {appointmentDate}, {serviceName}
- Add step / remove step buttons
- Preview rendered message with sample data

**Step 4 — Schedule:**
- Start date/time picker
- Business hours toggle (9 AM - 8 PM recipient timezone, ON by default)
- Daily send limit (pre-filled from tier: Business=50, Scale=500)
- Throttle: contacts per hour
- Required: opt-out instructions in first SMS

**Step 5 — Review & Launch:**
Summary card showing:
- Campaign type and name
- Audience: X contacts matched
- Sequence: X steps over X days
- Schedule: starts [date] during [hours]
- Estimated cost: ~X voice minutes + ~X SMS
- [Save as Draft] [Launch Campaign] buttons

### TASK 3.2 — Build No-Show Detection Cron

**Create:** `src/app/api/cron/no-show-detection/route.ts`

```typescript
// Runs every 5 minutes
// Finds bookings where:
//   status = 'confirmed'
//   scheduled_at < NOW() - INTERVAL '30 minutes'
//   No check-in recorded (no completed status update)
// For each:
//   Update booking status to 'no_show'
//   If workspace has no_show_recovery workflow active:
//     Enroll contact in no-show recovery sequence
//   Create analytics event
```

### TASK 3.3 — Build Appointment Reminder Cron

**Create:** `src/app/api/cron/appointment-reminders/route.ts`

```typescript
// Runs every 15 minutes
// Finds bookings where:
//   status = 'confirmed'
//   reminder_24h_sent = false AND scheduled_at BETWEEN NOW() + 23h AND NOW() + 25h
//   → Send 24h reminder SMS, set reminder_24h_sent = true
//
//   reminder_1h_sent = false AND scheduled_at BETWEEN NOW() + 45min AND NOW() + 75min
//   → Send 1h reminder SMS, set reminder_1h_sent = true
```

### TASK 3.4 — Build Outbound Settings Page

**Create:** `src/app/app/settings/outbound/page.tsx`

Settings form with sections:
1. **Calling Hours:** Business hours picker (default: 9 AM - 8 PM, recipient timezone)
2. **Voicemail Behavior:** Radio: "Leave a message" / "Hang up silently"
3. **Daily Outbound Limit:** Number input (shows tier max: Business=50, Scale=500)
4. **Suppression Rules:**
   - Cooldown after opt-out: permanent (not editable)
   - Cooldown after decline: 7 days (editable)
   - Cooldown after conversion: 30 days (editable)
   - Max calls per contact per day: 1 (editable)
   - Max calls per contact per week: 3 (editable)
5. **DNC Compliance:** Toggle for DNC registry check (default ON)

Save to `workspace.outbound_config` JSONB column (add column if needed).

### TASK 3.5 — Build Outbound Analytics Section

**Add to:** `src/app/app/analytics/page.tsx` (new tab or section)

Metrics cards:
- Campaigns Active (count)
- Outbound Calls Today (count)
- Connection Rate (% answered)
- Conversion Rate (% enrolled → converted)
- Revenue from Outbound (sum)
- Opt-Out Rate (alert if >5%)

Chart: Outbound calls per day (last 30 days bar chart).

Table: Campaign performance (name, type, enrolled, completed, converted, revenue).

---

## SPRINT 4: FOLLOW-UP ENGINE + RETENTION (Week 7-8)

### TASK 4.1 — Consolidate Sequence Engines

**Problem:** Two sequence engines exist:
- `src/lib/sequences/engine.ts` — lead-focused, state-vector driven, hardcoded steps
- `src/lib/sequences/follow-up-engine.ts` — contact-enrollment based, database-driven, cron batch processing

**Action:** Keep `follow-up-engine.ts` as the canonical engine. It's more flexible (database-driven sequences, enrollment model, cron batch processing). Port any unique logic from `engine.ts`:
- The `chooseSequence()` logic (select sequence by deal state) → add as a helper function in follow-up-engine.ts
- The sequence type categorization (attendance, revival, followup) → map to campaign types
- Deprecate `engine.ts` — add a comment at top: `// DEPRECATED: Use follow-up-engine.ts instead. This file is kept for reference only.`
- Update all imports across the codebase to use follow-up-engine.ts

### TASK 4.2 — Wire Pre-Built Workflow Templates

**Create:** `src/lib/industry-packs/index.ts` and individual pack files

When a workspace completes onboarding with an industry selection, auto-create these workflows:

| Industry | Auto-Created Workflows |
|----------|----------------------|
| Dental | Missed Call Recovery, Appointment Reminder, No-Show Recovery, 6-Month Reactivation, Review Request |
| Legal | Missed Call Recovery (urgency variant), Appointment Reminder, Quote Chase (retainer follow-up) |
| HVAC | Missed Call Recovery, Appointment Reminder, No-Show Recovery, Quote Chase (estimate follow-up) |
| Med Spa | Missed Call Recovery, Appointment Reminder, No-Show Recovery, 6-Week Reactivation, Review Request |
| Roofing | Missed Call Recovery, Quote Chase (estimate follow-up), Storm Lead Follow-Up |
| General | Missed Call Recovery, Appointment Reminder, No-Show Recovery |

Each workflow is created with steps and templates from the industry pack definitions.

### TASK 4.3 — Build Revenue Attribution

**When a booking is created from any source, set `attribution_source`:**
- Created during inbound call → `'inbound_call'`
- Created from outbound call → `'outbound_call'`
- Created after SMS follow-up reply → `'sms_followup'`
- Created from no-show recovery → `'no_show_recovery'`
- Created from reactivation campaign → `'reactivation'`
- Created from quote chase → `'quote_chase'`

**When a booking is completed, calculate estimated value:**
- Use `booking.service_type` + industry pack `avgJobValues` to estimate dollar value
- Add to `booking.estimated_value`
- Add to `contact.total_revenue_attributed`
- Add to `analytics_daily.revenue_attributed` for the date

This is what powers the "Revenue Recovered" hero metric on the dashboard.

### TASK 4.4 — Build Weekly Email Digest

**Create:** `src/app/api/cron/weekly-digest/route.ts`

Runs Monday 8 AM (workspace timezone). For each active workspace:

**Email content:**
```
Subject: Your Recall Touch Week in Review

Hi {ownerName},

Here's what Recall Touch did for {businessName} last week:

📞 {callsAnswered} calls answered
📅 {bookingsCreated} appointments booked
🔄 {followupsSent} follow-ups sent
💰 ${revenueRecovered} estimated revenue recovered

{topItem — e.g., "Your no-show recovery sequence brought back 3 patients this week."}

[View Your Dashboard →]
```

**Use:** Resend, Amazon SES, or whatever email service is already configured. Check for existing email utility files first.

### TASK 4.5 — Build Contact Timeline

**Enhance:** `src/app/app/contacts/[id]/page.tsx`

Full-width vertical timeline showing ALL touchpoints with this contact:
- Call events (inbound/outbound with transcript toggle and play button)
- SMS messages (sent/received with content)
- Bookings (created, confirmed, completed, no-show, cancelled)
- Workflow enrollments (enrolled, step executed, completed, stopped)
- Campaign enrollments (enrolled, step executed, converted, opted-out)
- Notes (manual notes added by team)

Each event: icon, timestamp, description, expandable detail.

Right sidebar: contact info card (name, phone, email, status, tags, source, total revenue attributed, opt-out status).

---

## SPRINT 5: HOMEPAGE + MARKETING (Week 9-10)

### TASK 5.1 — Build Interactive ROI Calculator

**Enhance:** `src/components/sections/HomepageRoiCalculator.tsx`

Three range sliders:
1. "Monthly calls your business receives" — range 50-500, step 10
2. "Average job/appointment value" — range $200-$10,000, step $100
3. "Estimated % of calls you miss" — range 10-60%, step 5

**Calculation:**
```
missedCalls = monthlyBalls * (missedPercent / 100)
recoverableCalls = missedCalls * 0.35  // 35% recovery rate (conservative)
monthlyRecovery = recoverableCalls * avgJobValue
annualRecovery = monthlyRecovery * 12
```

**Display:**
```
You're leaving ~$X,XXX/month on the table.
Recall Touch could recover ~$X,XXX/month.
That's $XX,XXX/year in recovered revenue.

The Business plan ($297/mo) pays for itself if it
recovers just ONE $XXX appointment per month.
```

Numbers should animate on slider change (smooth transition, not jarring).

### TASK 5.2 — Build 3 Industry Landing Pages

**Create:**
- `src/app/industries/dental/page.tsx`
- `src/app/industries/legal/page.tsx`
- `src/app/industries/hvac/page.tsx`

**Each page structure (unique content per industry, NOT template-swapped thin pages):**
1. Hero with industry-specific headline and pain point
2. Industry-specific problem stats (e.g., dental: "15-25% no-show rate industry-wide")
3. How Recall Touch works for THIS industry (specific workflows)
4. ROI math (industry avg job value × recovery rate)
5. Pre-built workflows included (list the specific ones)
6. Pricing with industry context
7. CTA: "Start Recovering Revenue for Your {Industry}"

**Dental headline:** "Dental Practices Lose $2,000-$5,000/Month to No-Shows Alone"
**Legal headline:** "Every Missed Legal Inquiry Is a $5,000-$50,000 Case Walking Out the Door"
**HVAC headline:** "When the AC Breaks at 2 AM, Your Competitor Answers the Call"

### TASK 5.3 — Add FAQPage Structured Data

**File:** `src/app/page.tsx` (or layout for homepage)

Add JSON-LD for FAQPage schema with all 6 FAQ questions from the homepage FAQ component. This enables rich results in Google search.

---

## SPRINT 6: ANALYTICS + MONITORING (Week 9-10)

### TASK 6.1 — Integrate PostHog

**Install:** `npm install posthog-js posthog-node`

**Create:** `src/lib/analytics/posthog.ts`

Track these events (client-side):
```
signup_started, signup_completed, onboarding_step_completed,
dashboard_visited, revenue_viewed, analytics_viewed,
campaign_created, campaign_launched,
upgrade_clicked, plan_changed,
contact_created, contact_imported
```

Track these events (server-side, in API routes):
```
first_call_received, first_outbound_call,
booking_created, booking_completed, booking_no_show, booking_recovered,
workflow_activated, trial_expired, subscription_cancelled
```

### TASK 6.2 — Integrate Sentry

**Install:** `npm install @sentry/nextjs`

**Run:** `npx @sentry/wizard@latest -i nextjs`

Configure to capture: unhandled exceptions, API 500 errors, voice call failures, Stripe webhook failures, cron job failures.

### TASK 6.3 — Build Usage Warning System

When a workspace hits 80% of their plan's included minutes:
1. Send email: "You've used 80% of your {planName} minutes this month"
2. Show in-app banner on dashboard: "You've used {used}/{total} minutes. [Upgrade for more →]"

When they hit 100%: "You've exceeded your included minutes. Additional usage will be billed at ${overageRate}/min."

---

## SPRINT 7: POLISH + QA (Week 11-12)

### TASK 7.1 — Run All 50 QA Test Cases

See V8 Master Prompt Part 18. Go through each one systematically. Log pass/fail. Fix any failures before proceeding.

**Priority order:**
1. Billing flows (tests 26-32, 37-41) — billing bugs are trust-killers
2. Auth flows (tests 1-10) — security gaps are launch-blockers
3. Outbound calling (tests 11-17) — the differentiator must work
4. Workflow execution (tests 18-25) — the retention mechanism
5. UI/UX (tests 44-50) — polish

### TASK 7.2 — Test All 25 Edge Cases

See V8 Master Prompt Part 19. Test each one. Fix any that fail.

### TASK 7.3 — Verify All 20 Fallback Behaviors

See V8 Master Prompt Part 20. Simulate each failure condition. Verify graceful degradation.

### TASK 7.4 — Build Save Offer on Cancellation

When user clicks "Cancel Subscription" in billing settings, before sending to Stripe portal:

Show a modal:
```
Before you go — what's the main reason?

( ) Too expensive
( ) Not seeing results
( ) Switching to a competitor
( ) Business closed/paused
( ) Other: [text field]

[Continue to Cancel]  [Never mind, keep my plan]
```

If "Too expensive": offer 20% discount for 3 months.
If "Not seeing results": offer a 15-minute setup review call.

Track the response in PostHog: `cancellation_reason` event.

---

## SEQUENCE SUMMARY

| Week | Sprint | Key Deliverables |
|------|--------|-----------------|
| 1-2 | Sprint 1 | Dashboard redirects, homepage 10 sections, hero fix, sidebar cleanup, vocabulary fix |
| 3-4 | Sprint 2 | Revenue hero metric, needs-attention queue, activity feed, quick stats, empty state, mobile nav |
| 5-6 | Sprint 3 | Campaign builder, no-show detection, appointment reminders, outbound settings, outbound analytics |
| 7-8 | Sprint 4 | Sequence consolidation, workflow templates, revenue attribution, weekly digest, contact timeline |
| 9-10 | Sprint 5+6 | ROI calculator, 3 industry pages, FAQPage schema, PostHog, Sentry, usage warnings |
| 11-12 | Sprint 7 | 50 QA tests, 25 edge cases, 20 fallback checks, save offer on cancel |

---

## RULES FOR THIS EXECUTION

1. **Fix before build.** Complete Sprint 1 (cleanup) before starting Sprint 2 (new features).
2. **Test each task.** After completing each task, verify it works in dev. Don't batch "fix later."
3. **No new bugs.** Every redirect must be tested. Every removed section must not break the page. Every vocabulary change must not break variable references.
4. **No fake data.** If we show numbers, they come from the database or are clearly labeled as examples.
5. **Billing is sacred.** Triple-check any billing-related changes against `billing-plans.ts` as the source of truth.
6. **Mobile matters.** Test every new UI on mobile viewport (375px width) before marking done.

---

*End of Phase 1 Execution Brief. 7 sprints. 12 weeks. Work in order. Ship in order.*
