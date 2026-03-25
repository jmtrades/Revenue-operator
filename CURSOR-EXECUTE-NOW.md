# CURSOR: STOP REWORKING. START BUILDING. EXECUTE THIS NOW.

## STATUS CHECK — What's Already Done (DO NOT TOUCH)

I've audited every file. These are **100% complete and spec-compliant**. Do NOT rework, refactor, or "align" any of these. They are done:

```
✅ Hero.tsx                — AnimatedCounter, RevenueLossTicker, CTAs, trust stats. DONE.
✅ HomepageTrustBar.tsx    — 4 metrics. DONE.
✅ ProblemStatement.tsx    — 6-industry selector, animated numbers, 3 pain cards. DONE.
✅ HowItWorks.tsx          — 3 steps, time badges, connector lines, setup timeline. DONE.
✅ HomepageTestCallCTA.tsx — Phone input, test call API. DONE.
✅ HomepageModeSelector.tsx — Solo/Sales/Business toggle. DONE.
✅ Features.tsx            — 6 feature cards with revenue badges. DONE.
✅ HomepageRoiCalculator.tsx — Industry dropdown, 2 sliders, ROI output. DONE.
✅ Industries.tsx          — Industry grid. DONE.
✅ MetricsSection.tsx      — 5 metric cards. DONE.
✅ TestimonialsSection.tsx — 6 testimonials, carousel, NO autoplay. DONE.
✅ CompetitorComparison.tsx — 11 rows × 4 columns. DONE.
✅ PricingPreview.tsx      — 4 tiers + toggle. DONE.
✅ EnterpriseComparisonCard.tsx — Enterprise messaging. DONE.
✅ HomepageFAQ.tsx         — 10 questions, accordion. DONE.
✅ SocialProof.tsx         — Security badges, email form. DONE.
✅ FinalCTA.tsx            — Red urgency, emerald CTA, trust row. DONE.
✅ Footer.tsx              — 4-column layout, badges. DONE.
✅ PricingContent.tsx      — Annual default, cost calculator, 21-row comparison. DONE.
✅ Onboarding page         — 5-step wizard, industry selection, agent config. DONE.
✅ Analytics page          — Revenue hero, KPIs, UsageBar, ROI summary. DONE.
✅ Recovery page           — Stats, pipeline, filters, call list. DONE.
✅ Templates page          — 8 templates with search & preview. DONE.
✅ page.tsx (homepage)     — 18 sections in correct order. DONE.
```

**The homepage is COMPLETE. Do not spend another second on it.**

---

## WHAT ACTUALLY NEEDS TO BE BUILT — 6 Stub Pages

These are currently stub/placeholder pages that need to become real, functional implementations. Build them in this exact order:

---

### TASK 1: `/dashboard/follow-ups/page.tsx` — Follow-Up Queue

**Current state:** Stub with minimal content.

**Build this:**
- "use client" page
- Fetch follow-ups from `GET /api/follow-ups` (or query sequence_enrollments where status = active)
- **Stats row at top:** Total active, Due today, Completed this week, Success rate
- **Table columns:** Contact name, Phone, Sequence name, Current step, Due date, Status, Actions
- **Status badges:** active (blue), paused (amber), completed (green), cancelled (red)
- **Actions:** Pause/Resume button, Skip step, Cancel enrollment
- **Empty state:** "No pending follow-ups. Create a sequence to get started." with link to /dashboard/campaigns/new
- **Filters:** All / Due Today / Overdue / Paused
- **Sort:** By due date (ascending)
- Use workspace context: `const { workspaceId } = useWorkspace();`
- Use the existing component patterns: PageHeader, StatCard, EmptyState from `@/components/ui/`
- Icons from lucide-react: Clock, Play, Pause, SkipForward, XCircle, MessageSquare, Mail, Phone
- Style: dark theme, var(--bg-surface) cards, var(--border-default) borders

---

### TASK 2: `/dashboard/pipeline/page.tsx` — Visual Deal Pipeline

**Current state:** Stub.

**Build this:**
- "use client" page with drag-and-drop Kanban board
- **5 columns:** New → Contacted → Qualified → Booked → Won/Lost
- Each column header: Column name + count + total estimated value
- **Cards inside columns:**
  - Lead name (bold)
  - Company name (secondary text)
  - Estimated value ($X,XXX)
  - Days in stage (badge)
  - Source icon (Phone, Web, Referral)
- **Drag-and-drop:** Use `@dnd-kit/core` (already installed) to move cards between columns
- When card is dropped in new column, PATCH lead status via API
- **Add lead button:** Opens modal with name, phone, company, estimated value
- **Column stats:** Shows conversion rate (leads entering vs leaving stage)
- Fetch data: `GET /api/leads` with status grouping
- Empty state per column: "No leads in this stage"
- If the API doesn't exist yet, use demo data (like recovery page does with DEMO_CALLS)
- Colors per column: New=blue, Contacted=purple, Qualified=amber, Booked=emerald, Won=green, Lost=red

---

### TASK 3: `/dashboard/leads/page.tsx` — Lead Management

**Current state:** Stub.

**Build this:**
- "use client" page with searchable, filterable lead table
- **Search bar:** Search by name, email, phone, company
- **Filter row:** Status (All/New/Contacted/Qualified/Won/Lost), Source (All/Phone/Web/Referral/Campaign), Date range
- **Table columns:** Name, Email, Phone, Company, Status, Score, Source, Created, Actions
- **Status badges:** Color-coded (same as pipeline columns)
- **Score:** 0-100 with color gradient (red < 30, amber 30-60, green > 60)
- **Click row:** Navigate to `/dashboard/leads/[id]`
- **Actions:** Quick actions dropdown (Send message, Schedule call, Add to campaign)
- **Bulk actions:** Select multiple → Add to campaign, Export, Delete
- **Pagination:** 25 per page, Previous/Next
- **"Add Lead" button:** Modal with name, email, phone, company, source, notes
- Fetch: `GET /api/leads?workspace_id={workspaceId}&page=1&limit=25&status=&search=`
- Empty state: "No leads yet. Your AI agent will capture leads from incoming calls." + CTA to make test call

---

### TASK 4: `/dashboard/revenue/page.tsx` — Revenue Details

**Current state:** Stub.

**Build this:**
- "use client" page — deeper revenue breakdown than the analytics overview
- **Date range selector:** This week / This month / Last 30 days / Last 90 days / Custom
- **Revenue summary cards:**
  - Total revenue recovered (large, emerald)
  - Revenue from inbound calls
  - Revenue from follow-up sequences
  - Revenue from outbound campaigns
  - Revenue from no-show recovery
- **Revenue chart:** Line chart (recharts) showing daily revenue over selected period
  - X-axis: dates, Y-axis: dollars
  - Tooltip shows date + amount
  - Use emerald (#22C55E) for the line color
- **Revenue by source table:** Source name, Revenue, % of total, Calls/leads, Avg value
- **Top performing days:** List of 5 highest-revenue days with breakdown
- **Export button:** Download CSV of revenue data
- Fetch: `GET /api/analytics/revenue-recovered?period=30d`
- If API doesn't return enough data, show demo data with realistic numbers
- Use recharts LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer

---

### TASK 5: `/dashboard/settings/billing/page.tsx` — Billing & Subscription

**Current state:** Stub.

**Build this:**
- "use client" page
- **Current plan card:**
  - Plan name + tier badge (Solo/Business/Scale)
  - Monthly/Annual billing indicator
  - Price per month
  - Renewal date
  - "Change Plan" button → links to pricing or creates Stripe portal session
- **Usage this period:**
  - Calls: X / Y used (progress bar with percentage)
  - Phone numbers: X / Y
  - AI Agents: X / Y
  - Sequences: X / Y
  - Color coding: green < 60%, amber 60-80%, red > 80%
- **Payment method:**
  - Card ending in XXXX, expires MM/YY
  - "Update payment method" → Stripe customer portal
- **Billing history table:**
  - Date, Description, Amount, Status (Paid/Pending/Failed), Invoice link
  - Fetch from: `GET /api/billing/invoices` or Stripe directly
- **Danger zone (bottom):**
  - "Cancel subscription" link → /dashboard/billing/cancel
  - Red text, subtle, not prominent
- Use StatCard, Badge components from ui/

---

### TASK 6: `/dashboard/settings/integrations/page.tsx` — Integrations Hub

**Current state:** Stub.

**Build this:**
- "use client" page
- **Grid of integration cards (3-column on desktop, 1 on mobile):**

  1. **Google Calendar** — Calendar icon — "Sync appointments automatically"
     - Status: Connected (green) / Not connected (gray)
     - Connect button → triggers OAuth flow via `GET /api/integrations/google/auth`
     - If connected: shows email, "Disconnect" button

  2. **Twilio** — Phone icon — "Phone number provisioning and SMS"
     - Status: Connected (shows SID) / Not configured
     - Shows: Active phone numbers count
     - Link to /dashboard/settings/phone

  3. **Slack** — MessageSquare icon — "Get notifications in Slack"
     - Connect button → OAuth flow
     - If connected: shows channel, "Test notification" button

  4. **Zapier** — Zap icon — "Connect to 5,000+ apps"
     - Shows webhook URL for Zapier triggers
     - Copy URL button
     - "View Zapier templates" external link

  5. **CRM Webhook** — ArrowUpRight icon — "Send leads to your CRM"
     - Webhook URL input field
     - Events checklist: new_lead, appointment_created, call_completed
     - "Test webhook" button
     - Save button

  6. **Email (Resend)** — Mail icon — "Transactional emails and digests"
     - Status: configured / not configured
     - From email address shown
     - "Send test email" button

- Each card: icon, name, description, status badge, action button
- Card styling: var(--bg-surface), var(--border-default), rounded-xl

---

### TASK 7: `/dashboard/settings/phone/page.tsx` — Phone Number Management

**Current state:** Stub.

**Build this:**
- "use client" page
- **Phone numbers list:**
  - Table: Number, Label, Status (active/inactive), Monthly cost, Provisioned date, Actions
  - Status badge: green for active, gray for inactive
  - Actions: Set as default, Rename, Release number
- **"Add Phone Number" button:**
  - Opens modal/flow
  - Country selector (from SUPPORTED_PHONE_COUNTRIES in constants)
  - Area code preference (optional)
  - "Provision Number" button → POST /api/onboarding/number or equivalent
  - Shows monthly cost ($3-5/month depending on country)
  - Loading state while Twilio provisions
- **Forwarding configuration:**
  - For each number: where to forward when AI can't handle
  - Fallback phone number input
  - Ring timeout (seconds) slider
- **Call routing rules link:** Points to /dashboard/settings/call-rules
- Empty state: "No phone numbers yet. Add one to start receiving calls." + Add button

---

## RULES FOR ALL TASKS

1. **NO setInterval.** Use IntersectionObserver or requestAnimationFrame for animations.
2. **ALL icons from lucide-react.** No other icon library.
3. **Use workspace context:** `const { workspaceId } = useWorkspace();`
4. **Dark theme only:** var(--bg-surface) for cards, var(--border-default) for borders, var(--text-primary/secondary/tertiary) for text.
5. **If API doesn't exist yet:** Use demo/mock data like the recovery page does with DEMO_CALLS and DEMO_STATS. Show a subtle "Demo data" badge.
6. **TypeScript strict:** No `any`, no `@ts-ignore`. Proper interfaces for all data.
7. **Unused variables:** Prefix with `_` (e.g., `const _t = useTranslations(...)`)
8. **Apostrophes in JSX:** Always `&apos;` never `'`
9. **Framer Motion** for animations: AnimateOnScroll, fadeUpVariants.
10. **After EACH page is built:** Run `npx tsc --noEmit` and `npx eslint src/app/dashboard/[page-path]` to verify zero errors.

---

## EXECUTION ORDER

```
1. follow-ups/page.tsx     (simplest — table with filters)
2. leads/page.tsx          (table + search + CRUD)
3. pipeline/page.tsx       (Kanban with dnd-kit)
4. revenue/page.tsx        (charts with recharts)
5. settings/billing/page.tsx (plan + usage + invoices)
6. settings/integrations/page.tsx (card grid)
7. settings/phone/page.tsx (table + provisioning)
```

**Do them in order. One at a time. Verify each before moving to the next.**

**Do NOT:**
- Go back and "rework" homepage sections that are already done
- "Align" components that already match the spec
- Refactor working code for style preferences
- Add new homepage sections that weren't requested

**DO:**
- Build each page completely (not partially)
- Include demo/mock data so the page looks real even without API data
- Test with tsc and eslint after each page
- Move to the next task immediately after completing one

---

## AFTER ALL 7 TASKS ARE DONE

Run the full verification:
```bash
npx tsc --noEmit                    # Must be 0 errors
npx eslint src/app/dashboard/       # Must be 0 errors (warnings OK)
```

Then report what you built with file paths and line counts.

**GO. Build Task 1 now.**
