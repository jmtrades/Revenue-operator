# RECALL TOUCH — CURSOR IMPLEMENTATION PROMPT V2

## DO NOT SKIP. DO NOT SUMMARIZE. EXECUTE EVERY TASK IN ORDER.

**Stack:** Next.js 16.1.6 (App Router), React 19, TypeScript, Supabase (`revenue_operator` schema), Stripe, Twilio, ElevenLabs, Vapi, Tailwind CSS, next-intl (6 locales: en/es/fr/de/pt/ja)
**Deploy:** Vercel (production at recall-touch.com)
**Voice Server:** Python FastAPI at `services/voice-server/` (Fish Speech TTS + Faster-Whisper STT)
**Database:** Supabase with 199 migrations, RLS enabled

---

## CONTEXT: WHAT RECALL TOUCH IS

Recall Touch is the **AI Revenue Execution System** for service businesses. It answers missed calls with AI, books appointments, sends follow-ups, recovers no-shows, reactivates dormant customers, and shows the business owner exactly how much revenue was recovered.

**Category:** Revenue Execution OS
**Wedge:** Missed-call recovery for service businesses (HVAC, dental, legal, med spa, plumbing, roofing)
**Pricing:** Solo $49/mo | Business $297/mo (★ MOST POPULAR) | Scale $997/mo | Enterprise custom
**Target:** $300K MRR by Month 12

---

## MASTER TASK LIST — EXECUTE ALL TODAY

You will complete **8 major workstreams** in the order listed. Each workstream has specific deliverables with acceptance criteria. Do NOT move to the next workstream until the current one is fully complete and tested.

After ALL workstreams: run `npx tsc --noEmit` and fix any TypeScript errors. Run `npm run lint` and fix any lint errors. Run `npm run build` and confirm zero build errors.

---

## WORKSTREAM 1: HOMEPAGE REWRITE FOR MAXIMUM CONVERSION

**Goal:** Rewrite the homepage so a visitor knows within 5 seconds what Recall Touch does, what it costs, and why they should start a free trial.

### 1A. Rewrite Hero Section (`src/components/sections/Hero.tsx`)

**Current:** Uses generic i18n keys. Needs to be rewritten with revenue-first, conversion-optimized copy.

Update the `en.json` hero keys AND the Hero component:

**New headline:** "We Answered 12,847 Calls This Week That Would Have Gone to Voicemail."
**New subtitle:** "Recall Touch picks up when you can't. AI answers your missed calls, books appointments, and texts you the details — 24/7, for $297/month."
**Primary CTA:** "Try Free for 14 Days →" → links to `/activate`
**Secondary CTA:** "See How It Works" → links to `#how-it-works` anchor
**Trust checkmarks:** "✓ Keep your existing number" · "✓ Live in 10 minutes" · "✓ No credit card required"

Update ALL 6 locale files (`en.json`, `es.json`, `fr.json`, `de.json`, `pt.json`, `ja.json`) with translated versions of the new hero copy.

### 1B. Rewrite the Trust Bar (`src/components/sections/HomepageTrustBar.tsx`)

Replace current content with:
- "Trusted by 500+ service businesses"
- "$2.1M+ revenue recovered"
- "98.7% uptime"
- "Answers in under 3 seconds"

Style: horizontal row of stats with subtle separators, muted text on dark background. Mobile: 2×2 grid.

### 1C. Rewrite Problem Statement (`src/components/sections/ProblemStatement.tsx`)

New copy:
**Heading:** "Right Now, You're Losing Money"
**Body:** "The average service business misses 30% of inbound calls. At $450/job, that's $13,500/month walking out the door. Your competitors answer in 3 seconds. You answer in 3 hours. That $5,000 HVAC job? It went to the plumber who picked up first."

Add an animated counter that ticks up showing estimated missed revenue industry-wide ($X lost per minute). Use a `useEffect` interval that increments by ~$8 every second (representing $480/minute in aggregate missed revenue across service businesses).

### 1D. Enhance How It Works (`src/components/sections/HowItWorks.tsx`)

Three steps with icons:
1. **"Forward Your Phone" (60 seconds)** — "Keep your existing number. Just forward missed calls to your Recall Touch line."
2. **"AI Answers Instantly"** — "Our AI picks up, introduces your business by name, qualifies the caller, and tries to book an appointment on the spot."
3. **"You Get a Text + Booked Appointment"** — "Caller info, transcript, and a booked appointment — delivered to your phone in seconds."

Each step should have a number badge (1, 2, 3), a title, description, and a subtle icon from lucide-react.

### 1E. Enhance ROI Calculator (`src/components/sections/HomepageRoiCalculator.tsx`)

The calculator already exists. Enhance it:
- Add industry dropdown (HVAC, Dental, Legal, Med Spa, Plumbing, Roofing, Other) that pre-fills the average job value
- Industry defaults: HVAC $450, Dental $350, Legal $4000, Med Spa $600, Plumbing $300, Roofing $800, Other $500
- Show: "Estimated monthly recovery: $XX,XXX" in large green text
- Show: "That's XX times your $297/month subscription" below it
- Add CTA below calculator: "Start recovering this revenue →" linking to `/activate`
- Gate the full detailed report behind email capture (add email input + "Send My Full Report" button that posts to `/api/leads` — create this endpoint if it doesn't exist)

### 1F. Enhance Testimonials (`src/components/sections/TestimonialsSection.tsx`)

Add 6 testimonials (these are projected/sample — clearly structured as realistic examples):

1. "Recall Touch answered 127 calls we would have missed last month. 34 became booked appointments. That's $11,900 we almost lost." — **Mike R., HVAC contractor, Phoenix AZ**
2. "Our no-show rate dropped from 22% to 6%. The reminder sequences are worth the subscription alone." — **Dr. Sarah M., Dental practice, Austin TX**
3. "I was missing after-hours calls from accident victims. Now Recall Touch captures every one. It's paid for itself 50 times over." — **James L., Personal injury attorney, Miami FL**
4. "We recovered $23,400 in the first 60 days. I don't know why I waited so long." — **Lisa K., Med spa owner, Los Angeles CA**
5. "Setup took literally 8 minutes. My AI was answering calls before I finished my coffee." — **Tony D., Plumbing company, Chicago IL**
6. "I used to lose sleep wondering what calls I missed on the job site. That anxiety is gone." — **Carlos R., Roofing contractor, Dallas TX**

Display as a horizontal carousel on desktop, vertical stack on mobile. Each card: quote, name, business type, city.

### 1G. Rewrite Final CTA (`src/components/sections/FinalCTA.tsx`)

**Heading:** "You're Losing Money Right Now. Stop."
**Subheading:** "Every missed call is a lost customer. Every forgotten follow-up is lost revenue. Start recovering it in 10 minutes."
**CTA button:** "Start Free Trial — No Credit Card Required" → `/activate`
**Below button:** "Or call (555) 123-4567 to hear your AI receptionist"

Full-width dark section with high-contrast green CTA button.

### 1H. Update Homepage Section Order (`src/app/page.tsx`)

Reorder the homepage sections to this exact sequence:
1. Navbar
2. Hero
3. HomepageTrustBar
4. ProblemStatement (the "you're losing money" section)
5. HowItWorks
6. Features
7. HomepageRoiCalculator
8. Industries
9. TestimonialsSection
10. HomepageModeSelector
11. PricingPreview
12. HomepageFAQ
13. FinalCTA
14. Footer

Remove: MetricsSection, SocialProof, EnterpriseComparisonCard, HomepageTestCallCTA, HomepageActivityPreview/Section (these are redundant with the new structure).

---

## WORKSTREAM 2: PRICING PAGE OVERHAUL

**Goal:** Make the pricing page convert visitors to trial signups with zero confusion.

### 2A. Update Pricing Tiers (`src/lib/constants.ts`)

The `PRICING_TIERS` array should be updated to:

```typescript
export const PRICING_TIERS = [
  {
    name: "Solo",
    priceMonthly: "$49",
    priceAnnual: "$39",
    period: "/mo",
    description: "Your personal revenue assistant. For solo operators.",
    features: [
      "1 AI agent",
      "100 calls/month",
      "3 active follow-up sequences",
      "Appointment booking + calendar sync",
      "Call transcripts & recordings",
      "Basic revenue analytics",
      "SMS notifications",
    ],
    overage: "$0.75/call overage",
    avgRoi: "8x average ROI",
    cta: "Start free",
    href: "/activate",
    popular: false,
  },
  {
    name: "Business",
    priceMonthly: "$297",
    priceAnnual: "$247",
    period: "/mo",
    description: "The complete Revenue Execution System for service businesses.",
    features: [
      "3 AI agents",
      "500 calls/month",
      "Unlimited follow-up sequences",
      "No-show recovery engine",
      "Reactivation campaigns",
      "Industry-specific templates",
      "SMS + email channels",
      "Full revenue analytics dashboard",
      "CRM webhook integration",
      "Quote follow-up automation",
    ],
    overage: "$0.40/call overage",
    avgRoi: "14x average ROI",
    cta: "Start free",
    href: "/activate",
    popular: true,
  },
  {
    name: "Scale",
    priceMonthly: "$997",
    priceAnnual: "$847",
    period: "/mo",
    description: "For teams, multi-location, and high-volume operations.",
    features: [
      "10 AI agents",
      "3,000 calls/month",
      "Everything in Business, plus:",
      "Unlimited team seats",
      "Advanced analytics + benchmarks",
      "Custom workflow builder",
      "Full API access",
      "Native CRM sync (bi-directional)",
      "Premium voice pack (20+ voices)",
      "Priority support + quarterly review",
    ],
    overage: "$0.25/call overage",
    avgRoi: "22x average ROI",
    cta: "Start free",
    href: "/activate",
    popular: false,
  },
  {
    name: "Enterprise",
    priceMonthly: "Custom",
    priceAnnual: "Custom",
    period: "",
    description: "For franchises, agencies, and multi-location operations.",
    features: [
      "Unlimited AI agents",
      "Custom call volume",
      "White-label option",
      "Dedicated account manager",
      "SLA + uptime guarantee",
      "SSO / SAML",
      "Custom integrations",
      "Custom voice cloning",
      "On-premises voice option",
    ],
    overage: "Custom",
    avgRoi: "Talk to sales",
    cta: "Talk to sales",
    href: "/demo",
    popular: false,
  },
];
```

### 2B. Update PricingContent Component (`src/components/PricingContent.tsx`)

Add to each tier card:
- The `overage` text (small, muted, below the features list)
- The `avgRoi` badge (green pill/badge above the price: "14x average ROI")
- Annual/monthly toggle (already exists — ensure annual is the DEFAULT selected state)
- Below the pricing grid, add a **"Cost of Doing Nothing" section**:
  - "The average service business loses $8,400/month to missed calls. Recall Touch Business costs $297/month. That's a 28x return. Every month you wait costs real money."

### 2C. Add Comparison Table Below Tiers

Add a `COMPARISON_FEATURES` table that shows feature availability across tiers. If `COMPARISON_FEATURES` already exists in constants.ts, update it. If not, create it:

| Feature | Solo | Business | Scale | Enterprise |
|---------|------|----------|-------|------------|
| AI call answering | ✓ | ✓ | ✓ | ✓ |
| Appointment booking | ✓ | ✓ | ✓ | ✓ |
| Call transcripts | ✓ | ✓ | ✓ | ✓ |
| Follow-up sequences | 3 | Unlimited | Unlimited | Unlimited |
| No-show recovery | — | ✓ | ✓ | ✓ |
| Reactivation campaigns | — | ✓ | ✓ | ✓ |
| Industry templates | — | ✓ | ✓ | ✓ |
| Revenue analytics | Basic | Full | Advanced | Custom |
| CRM integration | — | Webhook | Bi-directional | Custom |
| Team seats | 1 | 1 | Unlimited | Unlimited |
| API access | — | — | ✓ | ✓ |
| Custom workflows | — | — | ✓ | ✓ |
| White-label | — | — | — | ✓ |
| Dedicated support | — | — | Quarterly | Dedicated AM |
| SLA | — | — | — | ✓ |

Render this as a responsive comparison table with sticky headers.

### 2D. Add FAQ to Pricing Page

Below the comparison table, add 8 FAQ items using the existing `AccordionItem` component:

1. **"How does the 14-day free trial work?"** — Full access to your plan's features. No credit card required to start. You'll only be charged after the trial if you choose to continue.
2. **"What happens if I go over my call limit?"** — You're never cut off. Overage calls are billed at the per-call rate for your plan. If you consistently exceed your limit, we'll suggest the tier that saves you money.
3. **"Can I change plans anytime?"** — Yes. Upgrade instantly, downgrade at end of billing cycle. No lock-in contracts.
4. **"Do I need to change my phone number?"** — No. You keep your existing business number. Just forward missed calls to your Recall Touch line.
5. **"Is there a setup fee?"** — No. Zero setup fee. You can be live in under 10 minutes.
6. **"What counts as a 'call'?"** — One inbound or outbound voice interaction handled by your AI agent. Reminders, SMS, and emails do not count against your call limit.
7. **"Do you offer annual billing?"** — Yes. Save ~17% with annual billing ($247/mo instead of $297/mo on Business). Annual subscribers also get priority onboarding.
8. **"What if Recall Touch doesn't work for my business?"** — Cancel anytime during your trial with zero charge. After that, cancel anytime — no penalties, no contracts.

---

## WORKSTREAM 3: ONBOARDING FLOW — SUB-3-MINUTE TIME-TO-VALUE

**Goal:** New user signs up → selects industry → AI agent is configured → makes test call in under 3 minutes.

### 3A. Rewrite Onboarding Page (`src/app/onboarding/page.tsx`)

Replace with a multi-step wizard. Use React state to manage steps. No page navigations between steps — single page, animated transitions.

**Step 1: "What kind of business do you run?"**
- Grid of 8 industry cards with icons (lucide-react):
  - HVAC & Plumbing (Wrench)
  - Dental (Heart)
  - Legal (Scale)
  - Med Spa & Beauty (Sparkles)
  - Roofing & Restoration (Home)
  - Real Estate (Building)
  - Coaching & Consulting (Users)
  - Other (Grid)
- Each card is clickable. Selecting one highlights it and auto-advances to Step 2 after 500ms.
- Save selection to workspace `industry` field via `PATCH /api/workspaces/[id]`

**Step 2: "Let's set up your AI receptionist"**
- Pre-fill business name from workspace (or prompt to enter)
- Show the auto-generated AI greeting based on industry template:
  - HVAC: "Thank you for calling [Business Name]. This is our AI assistant. How can I help you today? I can schedule a service appointment, provide an estimate, or take a message for our team."
  - Dental: "Thank you for calling [Business Name]. I can help you schedule an appointment, answer questions about our services, or connect you with our team."
  - Legal: "Thank you for calling the law office of [Business Name]. I can help schedule a consultation, take details about your case, or transfer you to an attorney."
  - (Similar for each industry)
- Allow editing the greeting in a textarea
- "Next" button to advance

**Step 3: "Connect your phone"**
- Two options:
  1. "Get a new Recall Touch number" → calls `/api/phone/provision` to get a Twilio number
  2. "Forward your existing number" → shows instructions for call forwarding (AT&T, Verizon, T-Mobile) + the Recall Touch number to forward to
- Show the provisioned/assigned number prominently
- "Next" button

**Step 4: "Make a test call"**
- Large phone number displayed: "Call [your Recall Touch number] now to hear your AI"
- Animated phone icon with pulse effect
- Below: "Your AI will answer with your custom greeting and demonstrate appointment booking"
- After test call detected (poll `/api/calls?workspace_id=X&limit=1` every 3 seconds), show:
  - ✓ "Your AI answered!"
  - Call transcript preview
  - "Go to Dashboard →" button linking to `/dashboard`
- If no call after 60 seconds, show: "Haven't called yet? No worries — you can test anytime. Go to Dashboard →"

### 3B. Create Industry Template Seeding

Create or update the endpoint `POST /api/industry-templates/seed` that:
1. Takes `workspace_id` and `industry` as parameters
2. Looks up the industry template (from a `INDUSTRY_TEMPLATES` constant or `industry_templates` table)
3. Creates a default AI agent with:
   - Industry-specific greeting
   - Industry-specific FAQ responses (3-5 per industry)
   - Industry-specific follow-up sequence (missed call → SMS in 2min → email in 1hr)
4. Returns the created agent ID

Call this endpoint after Step 1 of onboarding completes.

### 3C. Create Industry Templates Data

Create `src/lib/industry-templates.ts`:

```typescript
export const INDUSTRY_TEMPLATES = {
  hvac: {
    name: "HVAC & Plumbing",
    greeting: "Thank you for calling {businessName}. This is our AI assistant. I can schedule a service appointment, provide an estimate, or take a message for our team. How can I help?",
    faq: [
      { q: "What are your hours?", a: "Our office hours are Monday through Friday, 8 AM to 6 PM. For emergencies, we offer 24/7 service." },
      { q: "Do you offer free estimates?", a: "Yes, we offer free estimates for most services. I can schedule one for you right now." },
      { q: "What's your service area?", a: "We serve the greater metro area and surrounding communities within 30 miles." },
    ],
    avgJobValue: 450,
    followUpSequence: [
      { channel: "sms", delayMinutes: 2, template: "Hi {callerName}, thanks for calling {businessName}! I have your info and our team will follow up shortly. Need to book now? {bookingLink}" },
      { channel: "sms", delayMinutes: 60, template: "Just following up from your call to {businessName}. We'd love to help. Book a time that works: {bookingLink}" },
    ],
  },
  dental: {
    name: "Dental",
    greeting: "Thank you for calling {businessName}. I can help you schedule an appointment, answer questions about our services, or connect you with our team. What can I help with today?",
    faq: [
      { q: "Do you accept my insurance?", a: "We accept most major dental insurance plans. I can take your insurance details and our team will verify your coverage before your appointment." },
      { q: "Are you accepting new patients?", a: "Yes, we're accepting new patients! I'd be happy to schedule your first visit." },
      { q: "What are your hours?", a: "We're open Monday through Friday, 8 AM to 5 PM, and Saturdays by appointment." },
    ],
    avgJobValue: 350,
    followUpSequence: [
      { channel: "sms", delayMinutes: 2, template: "Hi {callerName}, thanks for calling {businessName}! Book your appointment online: {bookingLink}" },
      { channel: "sms", delayMinutes: 1440, template: "Hi {callerName}, just a reminder — we'd love to see you at {businessName}. Book here: {bookingLink}" },
    ],
  },
  legal: {
    name: "Legal",
    greeting: "Thank you for calling the law office of {businessName}. I can help schedule a consultation, take details about your situation, or transfer you to an attorney. How can I assist you?",
    faq: [
      { q: "Do you offer free consultations?", a: "Yes, we offer a free initial consultation to discuss your case and determine how we can help." },
      { q: "What areas of law do you practice?", a: "Our attorneys handle a range of cases. I'd be happy to take some details about your situation and have the right attorney follow up." },
    ],
    avgJobValue: 4000,
    followUpSequence: [
      { channel: "sms", delayMinutes: 2, template: "Thank you for contacting {businessName}. An attorney will review your inquiry and follow up shortly. For immediate scheduling: {bookingLink}" },
    ],
  },
  medspa: {
    name: "Med Spa & Beauty",
    greeting: "Thank you for calling {businessName}. I can help you book a treatment, answer questions about our services, or check availability. How can I help?",
    faq: [
      { q: "What treatments do you offer?", a: "We offer a full range of aesthetic treatments. I can take your interest and have our team provide a personalized recommendation." },
      { q: "Do you offer consultations?", a: "Yes, we offer complimentary consultations for new clients." },
    ],
    avgJobValue: 600,
    followUpSequence: [
      { channel: "sms", delayMinutes: 2, template: "Thanks for calling {businessName}! Book your appointment: {bookingLink}" },
      { channel: "sms", delayMinutes: 1440, template: "Hi {callerName}, we'd love to welcome you to {businessName}. Special offer for new clients — book here: {bookingLink}" },
    ],
  },
  roofing: {
    name: "Roofing & Restoration",
    greeting: "Thank you for calling {businessName}. I can help schedule an inspection, get you a free estimate, or take a message for our team. What do you need?",
    faq: [
      { q: "Do you offer free inspections?", a: "Yes, we offer free roof inspections and estimates. I can schedule one for you." },
      { q: "Do you work with insurance?", a: "Absolutely. We work directly with all major insurance companies and can help with the claims process." },
    ],
    avgJobValue: 800,
    followUpSequence: [
      { channel: "sms", delayMinutes: 2, template: "Hi {callerName}, thanks for reaching out to {businessName}! Schedule your free inspection: {bookingLink}" },
    ],
  },
  realestate: {
    name: "Real Estate",
    greeting: "Thank you for calling {businessName}. I can help with property inquiries, schedule a showing, or connect you with an agent. How can I help?",
    faq: [
      { q: "Do you have listings in my area?", a: "I'd be happy to take your details and have an agent send you relevant listings for your area and budget." },
    ],
    avgJobValue: 8000,
    followUpSequence: [
      { channel: "sms", delayMinutes: 1, template: "Hi {callerName}, thanks for your interest! An agent from {businessName} will reach out shortly. In the meantime, browse listings: {bookingLink}" },
    ],
  },
  coaching: {
    name: "Coaching & Consulting",
    greeting: "Thank you for calling {businessName}. I can help you book a discovery call, learn about our programs, or answer questions. How can I help?",
    faq: [
      { q: "How do I get started?", a: "The first step is a free discovery call. I can book one for you right now." },
    ],
    avgJobValue: 2000,
    followUpSequence: [
      { channel: "sms", delayMinutes: 2, template: "Thanks for your interest in {businessName}! Book your free discovery call: {bookingLink}" },
    ],
  },
  other: {
    name: "Other",
    greeting: "Thank you for calling {businessName}. How can I help you today?",
    faq: [],
    avgJobValue: 500,
    followUpSequence: [
      { channel: "sms", delayMinutes: 2, template: "Thanks for calling {businessName}! We'll follow up shortly." },
    ],
  },
};
```

---

## WORKSTREAM 4: REVENUE RECOVERED DASHBOARD

**Goal:** When a business owner logs in, the FIRST thing they see is a big, bold number: "$X,XXX recovered this week."

### 4A. Create Revenue Recovery API

Create `src/app/api/dashboard/revenue-recovered/route.ts`:

- Accepts `workspace_id` and optional `period` (today/week/month/all) query params
- Queries completed calls + booked appointments from `conversations` and `events` tables
- Calculates estimated revenue using: (answered calls × industry avg job value × 0.35 recovery rate)
- Also calculates: calls answered, appointments booked, no-shows recovered, follow-ups sent
- Returns:
```json
{
  "revenue_recovered": 4200,
  "calls_answered": 127,
  "appointments_booked": 34,
  "no_shows_recovered": 8,
  "follow_ups_sent": 256,
  "period": "month",
  "comparison": {
    "revenue_change_pct": 12,
    "calls_change_pct": 8
  }
}
```

### 4B. Create Revenue Dashboard Hero Component

Create `src/components/dashboard/RevenueHero.tsx`:

- Large number: "$4,200" in bold green (#22c55e), 48px+ font
- Label below: "Revenue recovered this month"
- Period toggle: Today | This Week | This Month
- Below the hero number, show 4 metric cards in a row:
  1. Calls Answered: 127 (with trend arrow)
  2. Appointments Booked: 34
  3. No-Shows Recovered: 8
  4. Follow-Ups Sent: 256
- Bottom banner: "Without Recall Touch, you would have lost approximately $4,200 this month"

### 4C. Integrate into Dashboard

Update `src/app/dashboard/page.tsx`:
- Add the `RevenueHero` component at the TOP of the dashboard, above all existing content
- It should be the first and most prominent element
- On mobile, it should be full-width with the 4 metric cards stacking to 2×2

---

## WORKSTREAM 5: MISSED-CALL RECOVERY FLOW (CORE PRODUCT)

**Goal:** When a call goes to voicemail, Recall Touch answers instead, captures info, and books an appointment.

### 5A. Verify Inbound Call Webhook

Verify that `src/app/api/webhooks/twilio/route.ts` (or equivalent) handles the Twilio webhook for incoming calls:
1. Receives incoming call event from Twilio
2. Looks up the workspace by the called phone number
3. Connects the caller to the AI agent (via Vapi or direct ElevenLabs)
4. AI agent greets with the industry-specific greeting
5. Captures: caller name, phone, reason for call, urgency
6. Attempts to book appointment (if calendar connected)
7. Sends SMS to business owner with call summary
8. Creates `conversation` record and `event` records in database

If any of these steps are missing or broken, implement them. The end-to-end flow must work.

### 5B. Create SMS Notification on Missed Call

Create or update the post-call webhook handler so that after every AI-answered call:
1. Sends an SMS to the business owner's phone (from workspace settings):
   - "📞 Recall Touch just answered a call from [Caller Name] ([Phone]). Reason: [Reason]. [Outcome: Appointment booked for Tues 2pm / Message taken / Caller will call back]. View details: [dashboard link]"
2. Creates a push notification event (for future mobile app)
3. Logs the notification in the `events` table

### 5C. Create Follow-Up Sequence Trigger

After a missed call is answered by AI:
1. If appointment was NOT booked during the call:
   - 2 minutes later: Send SMS to CALLER with booking link
   - 60 minutes later: Send second SMS reminder
   - 24 hours later: Send final SMS
2. If appointment WAS booked:
   - 24 hours before: Send reminder SMS
   - 2 hours before: Send reminder SMS
3. Track all follow-up sends in `events` table with `event_type: 'follow_up_sent'`

Create `src/lib/sequences/missed-call-sequence.ts` with this logic if it doesn't exist.

---

## WORKSTREAM 6: WEEKLY EMAIL DIGEST

**Goal:** Every Monday at 8 AM local time, every active workspace receives an email showing their weekly revenue recovered.

### 6A. Create/Update Weekly Digest Cron

Verify `src/app/api/cron/weekly-digest/route.ts` exists and works:
- Queries all active workspaces
- For each workspace, calculates:
  - Calls answered this week
  - Appointments booked
  - Revenue recovered (estimated)
  - No-shows recovered
  - Week-over-week comparison
- Sends HTML email via SendGrid/Resend/SES with:
  - Subject: "Your Recall Touch Weekly Report: $X,XXX Recovered"
  - Hero number: Revenue recovered
  - 4 metrics in a grid
  - Call to action: "View your full dashboard →"
  - Bottom: "Share your results: [Twitter share link] [LinkedIn share link]"

### 6B. Add Shareable Revenue Card

Create `src/app/api/reports/share-card/route.ts`:
- Generates an OG image (using `@vercel/og` or canvas) showing:
  - "Recall Touch recovered $4,200 for [Business Name] this month"
  - Business name, metric, Recall Touch branding
- Returns as PNG image
- Used in social share links and email

---

## WORKSTREAM 7: UPGRADE TRIGGERS & EXPANSION REVENUE

**Goal:** Every usage limit creates an upgrade prompt that shows the user exactly why upgrading pays for itself.

### 7A. Create Upgrade Trigger Component

Create `src/components/UpgradeTrigger.tsx`:

Props: `type: 'calls' | 'sequences' | 'features' | 'team'`, `currentUsage: number`, `limit: number`, `currentPlan: string`, `nextPlan: string`, `nextPlanPrice: string`

Renders a banner/modal:
- "You've used [95] of your [100] included calls this month."
- "Businesses on [Business] recover an average of $4,200/month — that's 14x the subscription cost."
- "[Upgrade to Business — $297/mo →]"

Variations:
- **Call limit (90%+ used):** Show calls used/limit + revenue recovered per call to anchor value
- **Sequence limit (3/3 active):** "You have 47 dormant contacts worth an estimated $14,100. Upgrade to activate the Reactivation Engine."
- **Feature gate (CRM sync, advanced analytics):** Show the feature in read-only/preview mode with upgrade overlay
- **Team invite attempt:** "Team features are available on Business+. Add unlimited team members for $297/mo."

### 7B. Wire Upgrade Triggers Into Product

Add the `UpgradeTrigger` component to:
1. Dashboard page — when call usage exceeds 80% of plan limit
2. Sequences page — when user hits sequence limit
3. Contacts page — when user tries to access reactivation engine on Solo
4. Settings > Team — when user tries to invite on Solo
5. Analytics page — when user tries to access benchmarks on Business

Check plan limits from workspace/subscription data. Query current usage from API.

### 7C. Create Overage Upgrade Nudge API

Create `src/app/api/billing/upgrade-nudge/route.ts`:
- Called when a workspace exceeds plan limits
- Calculates: "You spent $X in overages last month. Upgrading to [Plan] saves you $Y/month."
- Returns the nudge message and recommended plan
- Front-end displays this as a persistent but dismissable banner

---

## WORKSTREAM 8: ANNUAL BILLING DEFAULT + CANCELLATION FLOW

### 8A. Set Annual as Default on Pricing Page

In `PricingContent.tsx`, change the billing toggle default state:
- `const [annual, setAnnual] = useState(true)` (annual is default)
- Label monthly as "Monthly (pay more for flexibility)"
- Label annual as "Annual (save 17% — 2 months free)" with a green "SAVE" badge

### 8B. Create Cancellation Intercept

When a user clicks "Cancel subscription" in settings/billing:

1. Show a modal BEFORE processing cancellation:
   - "Over the past [X months], Recall Touch recovered [$XX,XXX] in revenue for your business."
   - "Your AI has learned [XXX] contact preferences over [X months]. This intelligence took [X months] to build and cannot be transferred."
   - "If you cancel, missed calls will go to voicemail again starting immediately."
   - Three options:
     - "Pause for 30 days (keep your data)" — pauses subscription, keeps workspace
     - "Downgrade to Solo ($49/mo)" — keeps basic coverage
     - "I still want to cancel" — proceeds to cancellation

2. If they click "I still want to cancel":
   - Ask: "What's the main reason you're leaving?" (dropdown: too expensive / not enough calls / switching to competitor / business closed / other)
   - Process cancellation
   - Show: "Your account will remain active until [end of billing period]. You can reactivate anytime."

Create `src/components/CancellationIntercept.tsx` for the modal.

---

## POST-COMPLETION: VERIFICATION CHECKLIST

After all 8 workstreams are complete, run these verifications:

```bash
# TypeScript — zero errors
npx tsc --noEmit

# Lint — zero errors
npm run lint

# Build — zero errors
npm run build

# Tests — all passing
npm run test
```

Fix ANY errors before considering the work complete.

### Manual Verification:
1. Visit homepage → hero shows new revenue-first headline
2. Scroll homepage → all sections in correct order
3. Visit /pricing → annual is default, all 4 tiers display correctly, comparison table renders
4. Click "Start free" → onboarding wizard loads with industry selection
5. Select an industry → AI greeting auto-populates
6. Dashboard → Revenue recovered hero is the first/largest element
7. Upgrade triggers appear when usage limits are simulated

---

## RULES FOR CURSOR

1. **Do NOT create new files when you should be editing existing ones.** Check if the file exists first.
2. **Do NOT remove existing functionality** unless explicitly told to in this prompt.
3. **Update ALL 6 locale files** (en, es, fr, de, pt, ja) when changing any i18n strings.
4. **Use the existing design system.** Dark theme, CSS variables (`var(--bg-primary)`, `var(--text-primary)`, etc.), zinc/slate palette, green accent (#22c55e).
5. **Use lucide-react for all icons.** Already installed.
6. **Use the existing component patterns.** Check `src/components/ui/` for Container, AccordionItem, SectionLabel, etc.
7. **All API routes must validate workspace access.** Use existing `requireWorkspaceAccess` or equivalent auth middleware.
8. **Promise-based dynamic route params** — Next.js 16 requires `await params` in dynamic routes. Never destructure params synchronously.
9. **Do NOT touch Stripe webhook handlers** unless specifically required by a task.
10. **Commit frequently.** After each workstream, verify the build passes.

---

## PRIORITY IF TIME IS SHORT

If you cannot complete all 8 workstreams, prioritize in this order:
1. **Workstream 1** (Homepage) — highest conversion impact
2. **Workstream 4** (Revenue Dashboard) — highest retention impact
3. **Workstream 3** (Onboarding) — highest activation impact
4. **Workstream 2** (Pricing) — highest ARPU impact
5. **Workstream 5** (Missed-call flow) — core product
6. **Workstream 7** (Upgrade triggers) — expansion revenue
7. **Workstream 8** (Annual billing + cancellation) — retention
8. **Workstream 6** (Weekly digest) — retention

---

*This prompt was generated from the Recall Touch Master Strategy V5 (28 sections) and V5 Second-Pass Refinement. Every task maps to a specific revenue-driving strategy element. Ship it.*
