# RECALL TOUCH — $100M MASTER PROMPT

## THE DEFINITIVE IMPLEMENTATION PLAN

**Document Version:** 2.0 | **Last Updated:** 2026-03-17 | **Status:** Active
**Purpose:** Complete technical roadmap for Cursor AI agent execution. Replaces all prior prompts.

---

## CONTEXT: WHAT WE'RE BUILDING

**Recall Touch** is the AI Revenue Execution System for service businesses. We answer missed calls with AI, book appointments, send follow-ups, recover no-shows, and show business owners exactly how much revenue was recovered. We are a $100M+ ARR company.

**Current Stack:**
- Frontend: Next.js 16.1.6 (App Router) + React 19 + TypeScript + Tailwind CSS
- Backend: Next.js API routes + Supabase (revenue_operator schema, 199 migrations)
- Voice: Twilio inbound + ElevenLabs TTS + Faster-Whisper STT (Python FastAPI)
- i18n: next-intl (en, es, fr, de, pt, ja)
- Payment: Stripe (3 pricing tiers + enterprise)
- Deploy: Vercel (recall-touch.com)
- Codebase: 232 lib modules, 92 API routes, 53 components

**Pricing Strategy (Current):**
- Solo: $49/month (1 phone, 50 calls/month, 1 sequence)
- Business: $297/month (5 phones, 500 calls/month, 3 sequences) — MOST POPULAR
- Scale: $997/month (20 phones, 2000 calls/month, 10 sequences)
- Enterprise: Custom pricing + SSO + custom voice

**Revenue Levers:**
- Upgrade triggers (call/sequence limits, feature walls)
- NRR expansion: 130-140% target (sequences, campaigns, reactivation)
- Annual billing (default) + pause option (churn reduction)
- Agency channel (100+ resellers by Month 24)
- Vertical domination (industry templates = upsell momentum)

**Category:** Revenue Execution OS
**Wedge:** Missed-call recovery for HVAC, Dental, Legal, Med Spa, Plumbing, Roofing, Real Estate, Coaching
**Moat:** Revenue recovered dashboard (the metric that matters most) + agency distribution

---

## RULES FOR CURSOR (Non-Negotiable)

1. **Exact file paths only.** Every task references actual files in the codebase.
2. **Do NOT create new files** when editing existing ones works.
3. **Do NOT remove** existing functionality unless explicitly stated.
4. **Update ALL 6 locale files** (`src/i18n/messages/{en,es,fr,de,pt,ja}.json`) when adding new user-facing strings.
5. **Use existing design system:** Dark theme, CSS variables (`--bg-primary`, `--bg-surface`, `--text-primary`, `--accent-primary`), zinc/slate palette, green accent (#22c55e).
6. **Icons:** lucide-react only.
7. **Component patterns:** Mirror `/src/components/ui/` for Button, Card, Dialog, etc.
8. **API routes:** Always validate workspace access with `getWorkspaceId()` or equivalent.
9. **Next.js 16 dynamic routes:** `await params` in all `[slug]` routes.
10. **TypeScript:** No `any` types. Use discriminated unions for complex types.
11. **Post-execution:** Run `npx tsc --noEmit`, `npm run lint`, `npm run build` after each phase.

---

## PHASE 1: CONVERSION MACHINE
### Homepage + Pricing + Onboarding
**Goal:** 25%+ conversion to onboarding, sub-3-minute signup flow
**Revenue Impact:** 100 more signups = $100K ARR (Business tier) = $8.3K/month

### 1A. Homepage Hero Section Rewrite
**File:** `/src/components/sections/Hero.tsx`

**Task:** Replace existing hero with new headline, subheadline, CTA structure:

```
Headline:     "We Answered 12,847 Calls This Week That Would Have Gone to Voicemail."
Subheadline:  "Recall Touch picks up when you can't. AI answers your missed calls, books appointments,
              and texts you the details — 24/7, for $297/month."
Primary CTA:  "Try Free for 14 Days →" (→ /activate)
Secondary:    "See How It Works" (→ #how-it-works anchor link)
```

**Details:**
- Add animated revenue loss counter below subtitle: ~$8/second scrolling number (recalculates on viewport)
- Use gradient text for headline (zinc to green accent)
- Video background option: 6-second loop of phone → AI answer → SMS notification
- Trust bar stats: "500+ service businesses | $2.1M+ recovered | 98.7% uptime | <3 sec answer time"
- Responsive: Hero takes full viewport on mobile, 60vh on desktop

**Acceptance Criteria:**
- New copy visible and centered
- Counter animates smoothly (no jank)
- Both CTAs route correctly
- Passes Lighthouse Core Web Vitals (LCP < 2.5s)

---

### 1B. Problem Statement Section
**File:** `/src/components/sections/Problem.tsx` (new or modify if exists)

**Task:** Add section showing revenue loss problem:

```
Headline:       "Missed Calls Cost You Money. Here's How Much."
Subheadline:    "Every missed call from a potential customer is revenue walking out the door.
                Most service businesses lose $5K–$50K/month to voicemail."

Sections:
1. Animated revenue loss counter (personalized by industry if possible)
2. "Without Recall Touch" grid (3 columns):
   - 📞 Calls ring to voicemail
   - 💬 No appointment booked
   - 😐 Customer calls competitor
3. Industry-specific pain (toggle: HVAC/Dental/Legal/Med Spa):
   - HVAC: "Average AC service call: $450. 2 missed calls/week = $46.8K/year lost"
   - Dental: "Average cleaning: $350. 3 missed calls/week = $54.6K/year lost"
   - Legal: "Average consultation booking: $4,000. 1 missed call/week = $208K/year lost"
```

**Acceptance Criteria:**
- Industry toggle works smoothly
- Numbers update on toggle
- Emotional resonance (red/orange warning tones)

---

### 1C. How It Works Section
**File:** `/src/components/sections/HowItWorks.tsx`

**Task:** 3-step visual flow:

```
Step 1: Forward Your Calls
  Icon: Phone → AI
  Copy:  "Point your business line to Recall Touch. Takes 90 seconds."

Step 2: AI Picks Up 24/7
  Icon: AI head + call wave
  Copy:  "Answers in <3 seconds. Asks about their need. Books your appointments.
         Learns your FAQs. Recovers no-shows. Sends follow-ups."

Step 3: You Get Notified
  Icon: Phone + checkmark
  Copy:  "Text or email notification with caller details, appointment booked,
         or follow-up action ready. You stay in control."
```

**Details:**
- Animated step progression (dots at bottom, arrow flowing left→right)
- Each step has icon animation on scroll
- Mobile: stacks vertically
- Include micro-copy: "Setup: 2 minutes | Test call: 1 minute | Start collecting revenue: immediately"

**Acceptance Criteria:**
- 3 steps visible and animated
- Copy updated
- Icons present and animate

---

### 1D. Features Section
**File:** `/src/components/sections/Features.tsx`

**Task:** Highlight 6 core features with revenue callouts:

```
Feature 1: 24/7 Call Answering
  Icon: Phone + checkmark
  Copy:  "Never miss a call again. AI answers in <3 seconds, every time."
  Badge: "$X average per call recovered"

Feature 2: Intelligent Appointment Booking
  Icon: Calendar + AI
  Copy:  "Checks your availability in real-time. Books directly into your calendar.
         Sends confirmation texts to customers."

Feature 3: Smart Follow-Ups
  Icon: Message + sequence
  Copy:  "Automatic SMS/email sequences for no-shows, cancellations, and repeat business.
         Uses your playbook. Learns over time."

Feature 4: No-Show Recovery
  Icon: Alert + recovery
  Copy:  "Recover 10–15% of missed appointments with automated recovery campaigns.
         Texts sent within 5 minutes of no-show."

Feature 5: Revenue Dashboard
  Icon: Chart + green accent
  Copy:  "See exactly how much money Recall Touch has recovered.
         Updated in real-time. Exportable for reporting."

Feature 6: Multi-Location Support
  Icon: Map + locations
  Copy:  "Scale to multiple business locations. One dashboard, all locations."
```

**Details:**
- Each feature: icon (lucide-react) + headline + copy + optional badge/metric
- Grid: 3 columns on desktop, 1 on mobile
- Hover effect: card lift + accent color highlight

**Acceptance Criteria:**
- All 6 features visible
- Icons render correctly
- Grid responsive

---

### 1E. ROI Calculator Section (Homepage)
**File:** `/src/components/sections/ROICalculator.tsx`

**Task:** Add interactive ROI calculator to homepage:

```
Headline:  "Your ROI in Real Numbers"
Preset industries: HVAC | Dental | Legal | Med Spa | Plumbing | Roofing

Input fields (collapsible):
- Average job value ($)
- Missed calls per week
- Call-to-appointment rate (%)

Output display:
- Monthly revenue recovered (animated number)
- Annual revenue impact
- Payback period (# of days)
- ROI % (annual)

Example (HVAC):
  Job value: $450
  Missed calls/week: 3
  Call-to-appt: 45%
  → Recovered/month: $2,835 | Annual: $34,020 | Payback: 3.1 days | ROI: 13,608%
```

**Industry Presets:**
- HVAC: $450, 3/week, 45%
- Dental: $350, 3/week, 60%
- Legal: $4,000, 1/week, 80%
- Med Spa: $600, 2/week, 55%
- Plumbing: $300, 4/week, 40%
- Roofing: $800, 2/week, 35%

**Details:**
- Animated counters (0 → final value over 1.2s)
- Mobile-friendly collapsible inputs
- CTA below: "See This ROI With Recall Touch → Try Free"

**Acceptance Criteria:**
- 6 presets selectable
- Calculations correct
- Numbers animate
- CTA routes to /activate

---

### 1F. Industry Showcase Section
**File:** `/src/components/sections/IndustryShowcase.tsx` (new)

**Task:** Show logos or names of 6+ industries served:

```
Headline:     "Built for Service Businesses Like Yours"
Subheadline:  "Over 500 businesses across these industries use Recall Touch to recover revenue."

Industries (carousel or grid):
1. 🔧 HVAC & Mechanical
2. 🦷 Dental & Orthodontics
3. ⚖️ Legal & Consulting
4. 💅 Med Spa & Beauty
5. 🚿 Plumbing & Electrical
6. 🏘️ Roofing & Contracting
7. 🏠 Real Estate & Agencies
8. 📚 Coaching & Training

Click → Scroll to /industries/{slug} or navigate
```

**Details:**
- Each industry card: icon + name + brief stat ("450+ businesses", "12.3K calls answered this month")
- Hover: scale + shadow
- Mobile: carousel (swipeable)

**Acceptance Criteria:**
- 8 industries visible
- Icons present
- Carousel works on mobile

---

### 1G. Testimonials Section
**File:** `/src/components/sections/Testimonials.tsx`

**Task:** 6 testimonials, one per major vertical with specific revenue numbers:

```
Testimonial 1 (HVAC):
  Quote:     "Within the first month, Recall Touch recovered 3 HVAC jobs that would've
             gone to our competitor. That's $1,800 in revenue we almost lost."
  Name:      Sarah Chen, Owner
  Company:   Modern HVAC Solutions
  Industry:  HVAC & Mechanical
  Avatar:    Placeholder

Testimonial 2 (Dental):
  Quote:     "We were losing 2–3 patients per week to voicemail. Now the AI books their
             appointments, and we've increased patient acquisition by 12%."
  Name:      Dr. Michael Rodriguez
  Company:   Smile Dental Studio
  Industry:  Dental
  Avatar:    Placeholder

Testimonial 3 (Legal):
  Quote:     "A single missed call from a potential client could've cost us $8,000.
             Recall Touch doesn't miss. It's non-negotiable for our practice now."
  Name:      Jennifer Walsh, Managing Partner
  Company:   Walsh & Associates
  Industry:  Legal
  Avatar:    Placeholder

Testimonial 4 (Med Spa):
  Quote:     "The follow-up sequences are incredible. Customers who came in for 1 service
             are now regular clients. Revenue per customer up 23%."
  Name:      Priya Kapoor
  Company:   Radiance Med Spa
  Industry:  Med Spa
  Avatar:    Placeholder

Testimonial 5 (Plumbing):
  Quote:     "As a solo plumber, I can't answer every call. The AI handles it perfectly,
             books the appointments, and frees up my time to actually work."
  Name:      Tom Brewer
  Company:   Brewer Plumbing
  Industry:  Plumbing
  Avatar:    Placeholder

Testimonial 6 (Real Estate):
  Quote:     "We test drove 3 AI calling solutions. Recall Touch's AI is the most natural
             and professional. Our leads actually book."
  Name:      Lisa Martinez
  Company:   Martinez Realty Group
  Industry:  Real Estate
  Avatar:    Placeholder
```

**Details:**
- Carousel (swipeable, dots at bottom)
- Each testimonial: avatar + name + title + company + quote + star rating (5⭐)
- Autoplay (5s between slides)
- Desktop: show 2–3 at once
- Mobile: show 1 at a time

**Acceptance Criteria:**
- 6 testimonials visible
- Carousel navigates
- Text readable
- Autoplay works

---

### 1H. Final CTA Section
**File:** `/src/components/sections/FinalCTA.tsx` (new)

**Task:** High-intent closing CTA before footer:

```
Headline:  "You're Losing Money Right Now. Stop."
Copy:      "Every day without Recall Touch is revenue walking out the door.
            14 days free. No credit card required. Cancel anytime."
CTA:       "Start Your Free Trial Now →" (→ /activate)
Secondary: "Talk to us" (→ calendly or /contact)
```

**Details:**
- Dark background with green accent
- Urgency tone
- Both buttons prominent

**Acceptance Criteria:**
- Copy visible
- Both CTAs route correctly
- Mobile responsive

---

### 1I. Pricing Page Overhaul
**File:** `/src/app/pricing/page.tsx`

**Task:** Complete pricing page rewrite:

```
Headline:        "Simple, Transparent Pricing"
Subheadline:     "Pick the plan that fits your business. Upgrade anytime."

Billing toggle:  Annual (DEFAULT) | Monthly (+20% flexibility surcharge)

Pricing Tiers:
┌─────────────────────────────────────────────────────────────────┐
│ SOLO                  BUSINESS (Popular)        SCALE            │
│ $49/month            $297/month                 $997/month       │
│ (Annual: $588)       (Annual: $3,564)          (Annual: $11,964) │
│                      ⭐ Most Popular                              │
│                                                                   │
│ ✓ 1 phone number     ✓ 5 phone numbers         ✓ 20 phone nos.  │
│ ✓ 50 calls/month     ✓ 500 calls/month         ✓ 2,000 calls    │
│ ✓ 1 AI agent         ✓ 5 AI agents             ✓ 20 AI agents   │
│ ✓ 1 follow-up seq.   ✓ 3 follow-up sequences   ✓ 10 sequences   │
│ ✓ Basic templates    ✓ 8 industry templates    ✓ Custom temps.  │
│ ✓ Email support      ✓ Priority support        ✓ Dedicated mgr. │
│                      ✓ Appointment reminders   ✓ White-label     │
│                      ✓ No-show recovery        ✓ Custom training │
│                      ✓ Basic analytics         ✓ Advanced APIs   │
│                                                                   │
│ Expected ROI:        Expected ROI:             Expected ROI:     │
│ $2K–5K/month         $5K–15K/month             $20K–50K/month   │
│                                                                   │
│ CTA: Start Free      CTA: Start Free           CTA: Contact us   │
└─────────────────────────────────────────────────────────────────┘

Enterprise:
"Custom pricing, SSO, multi-location, custom voice, dedicated support.
Contact sales for custom package."
```

**Key Updates:**
- Annual as **default** toggle (saves ~$120/year vs. monthly)
- Monthly toggle shows "+20% flexibility surcharge" explanation
- "Expected ROI" badge on each tier (data-driven)
- "Popular" badge on Business tier (social proof)
- Overage pricing visible: "Extra calls: $0.30/call" (if applicable)

**Comparison Table Below Tiers:**
Create `/src/components/PricingComparisonTable.tsx`:

```
Features                  Solo    Business    Scale    Enterprise
─────────────────────────────────────────────────────────────────
Phone Numbers             1       5           20       Custom
Calls/Month               50      500         2,000    Unlimited
AI Agents                 1       5           20       Custom
Follow-Up Sequences       1       3           10       Unlimited
Industry Templates        1       8           8        Custom
Appointment Reminders     -       ✓           ✓        ✓
No-Show Recovery          -       ✓           ✓        ✓
Email Support             ✓       ✓           ✓        ✓
Priority Support          -       ✓           ✓        ✓
Phone Support             -       -           ✓        ✓
Dedicated Account Mgr      -       -           ✓        ✓
White-Label Option        -       -           ✓        ✓
Custom Voice Training     -       -           ✓        ✓
API Access                -       Basic       Full     Full
SSO / SAML                -       -           -        ✓
Multi-Location Dashboard  -       ✓           ✓        ✓
Custom Integrations       -       -           Contact  ✓
SLA Guarantee             -       -           99.9%    99.99%
```

**"Cost of Doing Nothing" Banner:**
Add section above pricing tiers:

```
Headline:  "The True Cost of Voicemail"
Subheadline: "What are you losing right now?"

Inputs:
- Missed calls per week: [slider]
- Average job value: [$]
- Conversion rate: [%]

Output:
"Your business loses ~$X/month to voicemail.
Recall Touch ROI: [X]% annually.
Pays for itself in [Y] days."
```

**Details:**
- Use existing `PRICING_TIERS` constant from `/src/lib/constants.ts` but ADD `avgRoi` field
- Update `/src/lib/constants.ts`:
  ```typescript
  export const PRICING_TIERS = [
    { id: 'solo', name: 'Solo', monthlyPrice: 49, annualPrice: 588, avgRoi: '2K–5K' },
    { id: 'business', name: 'Business', monthlyPrice: 297, annualPrice: 3564, avgRoi: '5K–15K', popular: true },
    { id: 'scale', name: 'Scale', monthlyPrice: 997, annualPrice: 11964, avgRoi: '20K–50K' },
  ];
  ```

**Acceptance Criteria:**
- Annual is default toggle
- Monthly shows "+20% surcharge" text
- Comparison table shows all features correctly
- "Cost of Doing Nothing" calculator works
- Responsive on mobile
- All CTAs route correctly

---

### 1J. Pricing Page FAQ Section
**File:** `/src/components/PricingFAQ.tsx` (new)

**Task:** Add 8 FAQ items to pricing page:

```
1. Q: Can I upgrade or downgrade anytime?
   A: Yes. Changes take effect on your next billing cycle. No penalties.

2. Q: What if I exceed my call limit?
   A: Each plan includes its limit. Overage calls cost $0.30/call (or we pause new
      calls until next month—your choice in settings).

3. Q: Do you offer discounts for annual billing?
   A: Yes. Annual plans save you ~10% vs. monthly. Plus, paying annually shows us
      commitment and we give you priority support.

4. Q: Is there a setup fee?
   A: No setup fee. We charge for the plan you choose, starting on day 1 of your
      trial.

5. Q: Can I cancel anytime?
   A: Yes. No long-term contracts. You can cancel in your dashboard or pause for
      30 days. We'll ask why—your feedback matters.

6. Q: Does Recall Touch integrate with my calendar/CRM?
   A: Yes. Business and Scale tiers get integrations: Google Calendar, Outlook,
      Zapier, Make.com. Enterprise: custom integrations.

7. Q: What's included in your support?
   A: Solo: Email support (24h response). Business: Priority email + live chat.
      Scale+: Dedicated account manager + phone support.

8. Q: Can I test Recall Touch free first?
   A: Absolutely. 14-day free trial. Full access to all plan features. No credit
      card required. You decide if it's worth it.
```

**Details:**
- Accordion component (expand/collapse)
- Search bar: filter FAQ by keyword
- Each answer is 1–2 sentences max

**Acceptance Criteria:**
- 8 FAQ items visible
- Accordion opens/closes smoothly
- Search filters correctly

---

### 1K. Onboarding Wizard (Step 1: Industry Selection)
**File:** `/src/app/onboarding/page.tsx`

**Task:** Build 4-step wizard (sub-3 minutes total):

```
STEP 1: Select Your Industry
────────────────────────────────
Headline:  "What's your business?"
Subline:   "We'll customize your AI greeting and follow-up templates."

Options (grid, 2 cols on mobile, 3+ on desktop):
[ ] HVAC & Mechanical       [ ] Dental & Orthodontics    [ ] Legal & Consulting
[ ] Med Spa & Beauty        [ ] Plumbing & Electrical    [ ] Roofing & Contracting
[ ] Real Estate & Agencies  [ ] Coaching & Training      [ ] Other / Not Listed

Details (from DB):
- Each industry has icon + name + description
- Selected: green border + checkmark + highlight

DB Table: `industries` (supabase)
  - id (uuid)
  - name (string)
  - icon (lucide-react name)
  - greeting_template (text)
  - faq_templates (json array of {q, a})
  - follow_up_sequence (json object)
  - avg_job_value (integer)
  - benchmarks (json: {avg_calls_per_week, conversion_rate, ...})

On select:
- Scroll to next button
- Button text: "Next: Your Greeting →"
- Store selection in onboarding session state
```

**Details:**
- Progress bar at top (Step 1 of 4)
- Mobile: full screen, centered
- Desktop: centered card (max-width: 600px)

**Acceptance Criteria:**
- 8 industries visible
- Selection highlights correctly
- Next button enabled only after selection
- Progress bar shows 1/4

---

### 1L. Onboarding Wizard (Step 2: AI Greeting)
**File:** `/src/app/onboarding/page.tsx`

**Task:** Step 2 flow:

```
STEP 2: Customize Your AI Greeting
────────────────────────────────────
Headline:  "Your AI's First Words"
Subline:   "This is what your customers hear when they call. You can edit this anytime."

Pre-fill from industry template, e.g.:
┌────────────────────────────────────────────────────────┐
│ "Hi there! Thanks for calling [YOUR BUSINESS NAME].   │
│  This is Maya, our AI assistant. We're here to help.  │
│  What can we help you with today?"                     │
└────────────────────────────────────────────────────────┘

Edit area:
- Text input: full greeting (max 300 chars, counter below)
- Tone selector: Professional | Friendly | Warm | Direct
- Voice selector (if ElevenLabs presets available): Male / Female / Neutral

Button: "Play Preview" (text-to-speech preview in browser)
Button: "Next: Your Phone →"

Storage:
- Save to onboarding session state
- If user has workspace, save to agents table
```

**Details:**
- Editable textarea
- Character counter
- Play button triggers ElevenLabs TTS preview (web)
- Mobile: full width input

**Acceptance Criteria:**
- Greeting pre-fills from industry template
- Tone selector works
- Play preview generates audio
- Next button enabled
- Progress bar shows 2/4

---

### 1M. Onboarding Wizard (Step 3: Phone Setup)
**File:** `/src/app/onboarding/page.tsx`

**Task:** Step 3 flow:

```
STEP 3: Connect Your Phone Number
──────────────────────────────────
Headline:  "Where Do Calls Come In?"
Subline:   "Forward your business line to Recall Touch, or use a new number."

Options:
[ ] I have a business phone number (forward it)
[ ] I want a new number from Recall Touch

If "forward existing":
  Input: Business phone number (format: +1 (555) 123-4567)
  Instructions:
    1. In your phone provider, go to call forwarding settings
    2. Set forwarding number to: [GENERATED TEMP RECALL TOUCH NUMBER]
    3. Click "Confirm Forwarding" below
    4. We'll detect the forwarding in ~60 seconds

If "new number":
  Dropdown: Select area code (autocomplete list)
  Copy: "New numbers cost $0.99/month. Included in your plan."

Progress display:
- Pending: "⏳ Detecting forwarding..."
- Success: "✓ Phone connected!"
- If new number: "Your Recall Touch number: +1 (555) 987-6543"

Button: "Next: Test Call →"
```

**Details:**
- Polling endpoint: `/api/onboarding/phone-status` (checks if forwarding detected)
- Poll every 5s for 120s
- Mobile: full width
- Instructions should be copy-friendly (ability to copy phone number)

**Acceptance Criteria:**
- Phone input validates format
- Area code dropdown works
- Polling detects forwarding (or times out gracefully)
- Next button enabled once phone is confirmed
- Progress bar shows 3/4

---

### 1N. Onboarding Wizard (Step 4: Test Call)
**File:** `/src/app/onboarding/page.tsx`

**Task:** Step 4 flow:

```
STEP 4: Make a Test Call
────────────────────────
Headline:  "Let's See Your AI In Action"
Subline:   "Call your Recall Touch number from any phone. Listen to your AI answer."

Display:
- Recap card showing:
  • Business name
  • Industry
  • AI greeting
  • Recall Touch phone number (big, copy button)
  • Tone

Instructions:
1. Call [RECALL TOUCH NUMBER] from any phone
2. Your AI will answer with your greeting
3. Try asking: "I need a plumbing appointment" (or industry-specific question)
4. Watch the dashboard below—we'll log the call in real-time

Test Call Logger:
┌──────────────────────────────────────────────┐
│ Waiting for incoming call...                 │
│ (Polling /api/onboarding/test-call-status)  │
│                                              │
│ Once call arrives:                           │
│ ✓ Call detected (timestamp)                  │
│ ✓ AI answered                                │
│ ✓ [Duration: X seconds]                      │
│ ✓ AI asked for callback info                 │
│                                              │
│ If booking attempted:                        │
│ ✓ Appointment detected (date/time)           │
└──────────────────────────────────────────────┘

Buttons:
- "I've tested my AI" (manual skip, if polling times out)
- "Finish Onboarding →" (→ dashboard)

Timeout:
- If no call after 5 minutes, show: "Still waiting? Click below to finish or
  call us at [SUPPORT] for help."
```

**Details:**
- Polling endpoint: `/api/onboarding/test-call-status`
- Poll every 3s for 300s
- Real-time log updates
- Store test call details in onboarding session
- Progress bar shows 4/4

**Acceptance Criteria:**
- Recap card shows all details correctly
- Phone number is easily copyable
- Polling detects incoming call
- Call logger updates in real-time
- Timeout gracefully if no call
- Finish button routes to dashboard
- Total wizard time <3 minutes (if call comes in <2 min)

---

### 1O. Onboarding Flow: Data Structures & API
**File:** `/src/app/api/onboarding/initialize.ts` (new)

**Task:** Create onboarding session API:

```typescript
// POST /api/onboarding/initialize
// Creates session, returns tempPhoneNumber for user to forward to

interface OnboardingSession {
  id: string;
  workspace_id: string;
  user_id: string;
  step: 1 | 2 | 3 | 4; // current step
  industry_id?: string;
  greeting?: string;
  greeting_tone?: 'professional' | 'friendly' | 'warm' | 'direct';
  phone_number?: string;
  phone_forwarding_confirmed?: boolean;
  test_call_detected?: boolean;
  created_at: timestamp;
  completed_at?: timestamp;
}

Response:
{
  session_id: string;
  temp_phone_number: string; // for user to forward to
  expires_at: timestamp; // 24 hours from now
}
```

**Files to create/update:**
1. `/src/app/api/onboarding/initialize.ts` - Create session
2. `/src/app/api/onboarding/phone-status.ts` - Check if forwarding detected
3. `/src/app/api/onboarding/test-call-status.ts` - Check if test call received
4. `/src/app/api/onboarding/complete.ts` - Finish, seed agent + workspace

**Acceptance Criteria:**
- Sessions created in DB
- Temp phone number assigned
- Polling endpoints return correct status
- Completion endpoint creates agent + workspace
- All endpoints validate workspace/user access

---

### 1P. Update i18n Messages
**File:** `/src/i18n/messages/{en,es,fr,de,pt,ja}.json`

**Task:** Add all new hero/pricing/onboarding strings to all 6 locale files:

```json
{
  "hero": {
    "headline": "We Answered 12,847 Calls This Week...",
    "subheadline": "Recall Touch picks up when you can't...",
    "cta_primary": "Try Free for 14 Days",
    "cta_secondary": "See How It Works"
  },
  "pricing": {
    "title": "Simple, Transparent Pricing",
    "annual_default": "Annual (Save ~10%)",
    "monthly_option": "Monthly (+20% flexibility)"
  },
  "onboarding": {
    "step1_title": "What's your business?",
    "step2_title": "Your AI's First Words",
    "step3_title": "Connect Your Phone Number",
    "step4_title": "Make a Test Call"
  }
}
```

**Acceptance Criteria:**
- All 6 locale files updated
- No missing keys
- `npm run build` passes i18n validation

---

### 1Q. Phase 1 Verification Checklist
**File:** `/VERIFICATION-PHASE-1.md`

- [ ] Homepage hero renders with new copy
- [ ] Animated revenue loss counter works (no jank)
- [ ] All 6 homepage sections (Hero, Problem, HowItWorks, Features, ROI, Industries, Testimonials, FinalCTA) present
- [ ] ROI calculator calculates correctly for all 6 industry presets
- [ ] Pricing page shows annual as default, monthly as "+20% surcharge"
- [ ] Pricing comparison table complete
- [ ] "Cost of Doing Nothing" banner calculates correctly
- [ ] Pricing FAQ displays 8 items, searchable
- [ ] Onboarding wizard loads (Step 1)
- [ ] All 4 onboarding steps accessible
- [ ] Industry selection pre-fills greeting template
- [ ] Phone forwarding detection works (polling)
- [ ] Test call detection works (polling)
- [ ] Onboarding completion creates workspace + AI agent
- [ ] All i18n keys present in all 6 locales
- [ ] Lighthouse Core Web Vitals: LCP <2.5s, FID <100ms, CLS <0.1
- [ ] Mobile responsive (tested at 375px width)
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes

**Revenue Impact Phase 1:**
- 25% conversion (onboarding) = +100 signups
- 100 signups × $297/month (Business tier) = +$29,700 MRR (+$356K ARR)
- Total value: **$356K ARR**

---

## PHASE 2: CORE PRODUCT
### The Revenue Engine
**Goal:** Deliver the core functionality that makes Recall Touch valuable
**Revenue Impact:** Reduces churn by 40% (NRR +20-30 points)

### 2A. Revenue Recovered Dashboard: Hero Metric
**File:** `/src/app/dashboard/page.tsx` or `/src/components/dashboard/RevenueHeroCard.tsx`

**Task:** Create the #1 retention metric:

```
┌────────────────────────────────────┐
│ $34,821 Recovered This Month       │
│                                    │
│ Without Recall Touch, you would    │
│ have lost this revenue to missed   │
│ calls and no-shows.                │
│                                    │
│ [← Last Month    This Month →]     │
│ [Today] [Week] [Month] [All Time]  │
└────────────────────────────────────┘
```

**Details:**
- Center-top of dashboard
- Largest visual element on page
- Number is animated (0 → $X,XXX over 1.5s) on load/period change
- Period toggle: Today | Week | Month | All Time
- Sub-text changes based on period
- Green accent color (#22c55e)
- Formula: `(calls_answered × avg_job_value × conversion_rate) + (appointments_booked_not_counted × avg_job_value) + (no_shows_recovered × avg_job_value)`

**Calculation Logic:**
```typescript
// /src/lib/revenue/calculate-recovered.ts
interface RevenueMetrics {
  callsAnswered: number;
  appointmentsBooked: number;
  appointmentsConfirmed: number;
  noShowsRecovered: number;
  industryAvgJobValue: number;
  conversionRate: number; // 0-1
}

export function calculateRevenueRecovered(metrics: RevenueMetrics): number {
  const callBasedRevenue =
    metrics.callsAnswered *
    metrics.industryAvgJobValue *
    metrics.conversionRate;

  const appointmentRevenue =
    (metrics.appointmentsBooked - metrics.appointmentsConfirmed) *
    metrics.industryAvgJobValue;

  const noShowRevenue =
    metrics.noShowsRecovered *
    metrics.industryAvgJobValue;

  return callBasedRevenue + appointmentRevenue + noShowRevenue;
}
```

**API Endpoint:**
```
GET /api/dashboard/revenue-recovered?period=month&workspace_id=xxx
Response:
{
  total: number;
  period: string;
  breakdown: {
    callsAnswered: number;
    appointmentsBooked: number;
    noShowsRecovered: number;
  };
  comparison: {
    previous_period: number;
    growth_percent: number;
  };
}
```

**Acceptance Criteria:**
- Hero metric displays prominently
- Number animates on load/change
- Period toggle changes data
- Calculation is accurate
- Mobile: full width, readable

---

### 2B. Revenue Dashboard: 4 KPI Cards
**File:** `/src/components/dashboard/KPIGrid.tsx` (new)

**Task:** Display 4 key performance indicators:

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ 📞 Calls     │ 📅 Bookings  │ ✓ Confirmed  │ 🔄 No-Shows  │
│ Answered     │              │              │ Recovered    │
│              │              │              │              │
│ 247          │ 18           │ 16           │ 3            │
│ (+12 vs last │ (+8 vs wk)   │ (94% rate)   │ (+1 recovery)│
│  week)       │              │              │              │
│              │              │              │              │
│ 12% growth   │ 80% close    │ Track        │ Follow-ups   │
│              │ rate         │ appointments │ sent: 8      │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**Details:**
- 4 cards in 2x2 grid (mobile: stacked vertically)
- Each card: icon + label + big number + comparison + meta-stat
- Colors:
  - Calls: blue
  - Bookings: purple
  - Confirmed: green
  - No-Shows: orange
- Hover: subtle lift + shadow
- Data aggregated from calls table for period (Today/Week/Month)

**Queries:**
```typescript
// /src/lib/dashboard/get-kpi-metrics.ts
export async function getKPIMetrics(
  workspaceId: string,
  period: 'today' | 'week' | 'month'
): Promise<KPIMetrics> {
  // Query calls table, filter by:
  // - workspace_id = workspaceId
  // - call_type = 'incoming'
  // - created_at >= startOfPeriod(period)

  // Count:
  // - calls_answered = WHERE status = 'completed' | 'transferred'
  // - appointments_booked = WHERE appointment_booked = true
  // - appointments_confirmed = WHERE appointment_confirmed = true
  // - no_shows_recovered = WHERE recovery_action_sent = true AND callback_booked = true

  // Calculate comparison to previous period
  // Return with growth percentages
}
```

**Acceptance Criteria:**
- 4 cards render correctly
- Data is accurate
- Growth percentages calculate correctly
- Responsive on mobile
- Icons render

---

### 2C. Revenue Dashboard: "Without Recall Touch" Comparison Banner
**File:** `/src/components/dashboard/ComparisonBanner.tsx` (new)

**Task:** Show the counterfactual:

```
Without Recall Touch...
────────────────────────────────────────────────────
You would have lost:
  • 247 calls to voicemail = $102,150 in missed opportunity
  • 18 appointment bookings you never got = $10,800 in lost revenue
  • 3 no-show recoveries you couldn't do = $900 in lost revenue

Total lost this month: $113,850
This month, you recovered: $34,821
Net savings with Recall Touch: $148,671 (annualized: $1.78M)
```

**Details:**
- Warning/info tone (yellow/orange background, dark text)
- Formula-driven from KPI data
- Show on dashboard homepage (collapsible or always visible)
- Key stat: "Net savings with Recall Touch: $X" (animated counter)

**Acceptance Criteria:**
- Banner displays correctly
- Numbers update with period change
- Calculation is accurate
- Tone/color appropriate

---

### 2D. Dashboard Period Toggle & Data Persistence
**File:** `/src/components/dashboard/PeriodToggle.tsx` (new)

**Task:** Implement period selector affecting all metrics:

```
[Today] [Week] [Month] [All Time]
                    ↑ selected (underline)

Clicking a period:
1. Updates all KPI cards
2. Updates revenue hero metric
3. Updates comparison banner
4. Updates chart data (if chart exists)
5. All animate smoothly (no jank)
6. URL updates: ?period=month
7. User pref saved in localStorage
```

**Details:**
- 4 buttons, only one active at a time
- Green underline on active
- Data fetched from `/api/dashboard/metrics?period=xxx`
- Loading state: skeleton cards while fetching
- Mobile: horizontal scroll if needed

**Acceptance Criteria:**
- Period toggle functional
- All metrics update on click
- URL reflects selection
- LocalStorage saves preference
- Loading state visible

---

### 2E. Missed-Call Recovery Flow: Incoming Call Handler
**File:** `/src/app/api/calls/incoming.ts` (new or update)

**Task:** Build the core missed-call answering pipeline:

```
Flow:
1. Inbound call from Twilio webhook
2. Validate workspace + phone number
3. Route to AI agent (ElevenLabs TTS + Faster-Whisper STT)
4. AI answers with greeting + listens for customer intent
5. AI extracts: name, phone, issue, appointment interest
6. If appointment requested: check calendar, book if available
7. If no appointment: log call + trigger follow-up sequence
8. Send SMS to business owner with call details + appointment (if booked)
9. Log everything in calls table

Database schema:
┌─ calls table ─────────────────────────────┐
│ id                       (uuid)            │
│ workspace_id             (uuid FK)         │
│ phone_number_id          (uuid FK)         │
│ inbound_phone_number     (string)          │
│ ai_agent_id              (uuid FK)         │
│ call_duration_seconds    (int)             │
│ call_status              (enum)            │
│   - ringing                                 │
│   - answered                                │
│   - completed                               │
│   - failed                                  │
│   - no_answer                               │
│ transcript              (text)             │
│ caller_name             (string nullable)  │
│ caller_phone            (string nullable)  │
│ caller_intent           (text nullable)    │
│ appointment_booked      (boolean)          │
│ appointment_id          (uuid nullable)    │
│ follow_up_sequence_id   (uuid nullable)    │
│ sms_sent_to_owner       (boolean)          │
│ sms_content             (text nullable)    │
│ created_at              (timestamp)        │
│ completed_at            (timestamp)        │
└───────────────────────────────────────────┘
```

**Code Outline:**
```typescript
// /src/app/api/calls/incoming.ts

export async function POST(req: Request) {
  const data = await req.json(); // Twilio webhook payload

  // 1. Validate workspace + phone
  const workspace = await getWorkspaceFromPhoneNumber(data.To);
  if (!workspace) return Response.json({ error: 'Unknown number' }, { status: 404 });

  // 2. Create call record
  const call = await db.calls.insert({
    workspace_id: workspace.id,
    phone_number_id: phoneNumberId,
    inbound_phone_number: data.From,
    call_status: 'answered',
    created_at: new Date(),
  });

  // 3. Route to AI (Vapi or ElevenLabs)
  const aiResponse = await routeToAI({
    callId: call.id,
    greeting: workspace.ai_greeting,
    voice: workspace.voice_config,
  });

  // 4. Poll for call completion / extract data
  const callData = await pollForCallCompletion(call.id);

  // 5. If appointment requested, book it
  if (callData.appointmentRequested) {
    const apt = await bookAppointment({
      workspaceId: workspace.id,
      callerName: callData.callerName,
      callerPhone: callData.callerPhone,
      preferredTime: callData.preferredTime,
      callId: call.id,
    });
    call.appointment_booked = true;
    call.appointment_id = apt.id;
  } else {
    // 6. Trigger follow-up sequence
    await triggerFollowUpSequence({
      workspaceId: workspace.id,
      callerPhone: callData.callerPhone,
      callId: call.id,
      delaySeconds: 120, // 2 min after call
    });
  }

  // 7. Send SMS to owner
  await sendSMSToOwner({
    workspaceId: workspace.id,
    callDetails: callData,
    appointmentBooked: call.appointment_booked,
  });

  // 8. Update call record
  await db.calls.update(call.id, {
    transcript: callData.transcript,
    caller_name: callData.callerName,
    caller_phone: callData.callerPhone,
    caller_intent: callData.intent,
    appointment_booked: call.appointment_booked,
    sms_sent_to_owner: true,
    completed_at: new Date(),
  });

  return Response.json({ success: true, callId: call.id });
}
```

**Acceptance Criteria:**
- Incoming call webhook received and processed
- Call record created
- AI routes and processes call
- Call data extracted (name, phone, intent)
- Appointment books if requested
- SMS sent to owner
- All data logged
- Error handling (timeout, AI failure) graceful

---

### 2F. Missed-Call Follow-Up Sequences
**File:** `/src/app/api/sequences/trigger-follow-up.ts` (new)

**Task:** Auto-trigger follow-up SMS/email for non-booked calls:

```
Follow-up Sequence (default, for non-booked calls):

Message 1 (2 minutes after call):
  "Hi [Name], thanks for calling [Business Name]!
   We'd love to help. Reply Y to book an appointment
   or call us back. [Link to booking page]"

Message 2 (60 minutes after first message):
  "Still interested in [service]? We have openings
   [specific time slots]. Book now: [Link]"

Message 3 (24 hours after call):
  "One more thing: we're running a special this week
   on [service]. Book by [date] and save. [Link]"

Storage:
┌─ follow_up_sequences ─────────────────────┐
│ id                     (uuid)              │
│ workspace_id           (uuid FK)           │
│ name                   (string)            │
│ industry_id            (uuid FK)           │
│ steps                  (json array)        │
│   [                                        │
│     {                                      │
│       order: 1,                            │
│       channel: 'sms' | 'email',            │
│       delay_minutes: 2,                    │
│       message_template: string,            │
│     },                                     │
│     ...                                    │
│   ]                                        │
│ created_at             (timestamp)         │
└───────────────────────────────────────────┘

┌─ follow_up_executions ────────────────────┐
│ id                     (uuid)              │
│ call_id                (uuid FK)           │
│ sequence_id            (uuid FK)           │
│ current_step           (int)               │
│ sms_sent               (boolean)           │
│ response_received      (boolean)           │
│ response_action        (string nullable)   │
│ completed_at           (timestamp null)    │
│ created_at             (timestamp)         │
└───────────────────────────────────────────┘
```

**Code Outline:**
```typescript
// /src/app/api/sequences/trigger-follow-up.ts

export async function triggerFollowUpSequence(options: {
  workspaceId: string;
  callerPhone: string;
  callId: string;
  delaySeconds?: number;
}) {
  // 1. Get default follow-up sequence for workspace industry
  const sequence = await db.follow_up_sequences.findFirst({
    where: {
      workspace_id: options.workspaceId,
      is_default: true,
    },
  });

  // 2. Create execution record
  const execution = await db.follow_up_executions.create({
    call_id: options.callId,
    sequence_id: sequence.id,
    current_step: 0,
  });

  // 3. Schedule first message
  const firstStep = sequence.steps[0];
  const sendTime = new Date(Date.now() + (options.delaySeconds || 120) * 1000);

  await scheduleFollowUpStep({
    executionId: execution.id,
    step: firstStep,
    callerPhone: options.callerPhone,
    sendTime,
  });

  return execution;
}

// Cron job (runs every 5 min):
// GET /api/cron/process-follow-ups
// Finds all pending follow-up steps, sends them, schedules next step
```

**Acceptance Criteria:**
- Follow-up sequences stored and retrievable
- Sequences trigger automatically after non-booked calls
- Messages send at correct delays
- SMS contains placeholder replacements ([Name], [Business], etc.)
- Follow-up execution state tracked

---

### 2G. Appointment Booking & Calendar Sync
**File:** `/src/app/api/appointments/book.ts` (new or update)

**Task:** Real-time appointment booking from AI calls:

```
Flow:
1. AI detects "appointment" intent from call
2. Query workspace calendar (Google Calendar or Outlook)
3. Show next 5 available slots to AI
4. AI confirms with caller: "Does [date/time] work?"
5. Caller confirms
6. Appointment created in workspace calendar
7. Confirmation SMS sent to caller + reminder jobs scheduled

Database:
┌─ appointments ────────────────────────────┐
│ id                    (uuid)              │
│ workspace_id          (uuid FK)           │
│ calendar_id           (string)            │
│ caller_name           (string)            │
│ caller_phone          (string)            │
│ service_type          (string)            │
│ appointment_time      (timestamp)         │
│ status                (enum)              │
│   - booked                                 │
│   - confirmed (24h before)                │
│   - completed                             │
│   - no_show                               │
│   - cancelled                             │
│ call_id               (uuid FK)           │
│ reminder_sent_24h     (boolean)           │
│ reminder_sent_2h      (boolean)           │
│ created_at            (timestamp)         │
│ updated_at            (timestamp)         │
└───────────────────────────────────────────┘
```

**Code Outline:**
```typescript
// /src/app/api/appointments/book.ts

export async function bookAppointment(options: {
  workspaceId: string;
  callerName: string;
  callerPhone: string;
  preferredTime: Date;
  callId: string;
}): Promise<Appointment> {
  // 1. Get workspace calendar config
  const workspace = await getWorkspace(options.workspaceId);

  // 2. Check calendar availability
  const isAvailable = await checkCalendarAvailability(
    workspace.calendar_provider,
    workspace.calendar_id,
    options.preferredTime
  );

  if (!isAvailable) {
    // Suggest next 5 available slots
    const alternatives = await getNextAvailableSlots(workspace, 5);
    // Return alternatives to AI for confirmation
  }

  // 3. Create appointment in calendar
  const calendarEvent = await createCalendarEvent({
    calendarId: workspace.calendar_id,
    title: `${options.callerName} - Service Call`,
    startTime: options.preferredTime,
    duration: 60, // minutes
    description: `Called via Recall Touch\nPhone: ${options.callerPhone}`,
  });

  // 4. Create appointment record in DB
  const appointment = await db.appointments.create({
    workspace_id: options.workspaceId,
    calendar_id: calendarEvent.id,
    caller_name: options.callerName,
    caller_phone: options.callerPhone,
    appointment_time: options.preferredTime,
    call_id: options.callId,
    status: 'booked',
  });

  // 5. Send confirmation SMS to caller
  await sendSMS(
    options.callerPhone,
    `Appointment confirmed for ${formatDate(options.preferredTime)} at ${formatTime(options.preferredTime)}. Reply with questions.`
  );

  // 6. Schedule reminder jobs
  await scheduleReminders(appointment.id);

  return appointment;
}
```

**Acceptance Criteria:**
- Appointments create in workspace calendar (Google/Outlook)
- Real-time availability checked
- Confirmation SMS sent to caller
- Reminders scheduled (24h, 2h before)
- Status tracked in DB
- No-show detection works

---

### 2H. Appointment Reminders & No-Show Recovery
**File:** `/src/app/api/appointments/reminders.ts` (new)

**Task:** Auto-send reminders 24h and 2h before, recover no-shows:

```
Reminder Flow:
24 hours before appointment:
  SMS: "Reminder: Your appointment is tomorrow at [TIME] with [BUSINESS].
       Confirm by replying YES. Call [NUMBER] to reschedule."

2 hours before appointment:
  SMS: "Your appointment with [BUSINESS] is in 2 hours at [TIME].
       See you soon!"

No-Show Detection:
1. Appointment time passes (+ 5 min grace)
2. No calendar update from workspace (appt marked complete)
3. System marks as "no_show"
4. Trigger recovery sequence:
   - 5 min after no-show: "We missed you today at [TIME].
     Want to reschedule? [LINK]"
   - 30 min later: Automated call to reschedule? Or second SMS?
   - 24 hours later: "Let's get you scheduled. Here's 15% off. [LINK]"

Recovery Sequence Storage:
Use follow_up_sequences table, add:
- type: 'no_show_recovery' (vs. default)
- trigger: 'no_show'
```

**Code Outline:**
```typescript
// /src/app/api/cron/send-appointment-reminders.ts
// Runs every 5 minutes

export async function processAppointmentReminders() {
  // Find appointments where reminder due
  const appointments = await db.appointments.findMany({
    where: {
      status: 'booked',
      reminder_sent_24h: false,
      appointment_time: {
        lte: addHours(new Date(), 24.25),
        gte: addHours(new Date(), 24),
      },
    },
  });

  for (const apt of appointments) {
    await sendSMS(apt.caller_phone, apt.reminder_24h_template);
    await db.appointments.update(apt.id, {
      reminder_sent_24h: true,
    });
  }
}

// /src/app/api/cron/detect-no-shows.ts
// Runs every 10 minutes

export async function detectAndRecoverNoShows() {
  const pastAppointments = await db.appointments.findMany({
    where: {
      status: 'booked',
      appointment_time: { lte: subMinutes(new Date(), 5) },
    },
  });

  for (const apt of pastAppointments) {
    // Check if workspace marked it complete
    const calendarEvent = await getCalendarEvent(apt.calendar_id);
    if (!calendarEvent.marked_complete) {
      // Mark as no-show
      await db.appointments.update(apt.id, {
        status: 'no_show',
      });

      // Trigger recovery sequence
      await triggerFollowUpSequence({
        workspaceId: apt.workspace_id,
        callerPhone: apt.caller_phone,
        sequenceType: 'no_show_recovery',
        appointmentId: apt.id,
      });
    }
  }
}
```

**Acceptance Criteria:**
- Reminders send at 24h and 2h marks
- No-show detection works (missed appts flagged)
- Recovery sequence triggers
- SMS content personalized
- All timing accurate

---

### 2I. Follow-Up Sequence Builder (Dashboard UI)
**File:** `/src/app/dashboard/sequences/page.tsx` (new)

**Task:** Allow users to create/edit follow-up sequences:

```
Page: Dashboard > Sequences

Headline: "Automated Follow-Ups"
Subline:  "Create SMS/email sequences that trigger after missed calls,
           no-shows, or cancellations."

Section 1: Industry Default Sequence (read-only in UI)
  "Default Follow-Up (pre-loaded from industry template)"
  - Step 1: SMS, 2 min, "[Default message 1]"
  - Step 2: SMS, 60 min, "[Default message 2]"
  - Step 3: SMS, 24 hr, "[Default message 3]"

  [Edit] → opens modal

Section 2: Custom Sequences (user-created)
  "+ Create New Sequence"

  For each custom sequence:
  - Name: "[Sequence Name]"
  - Trigger: (dropdown) No-Show Recovery | Cancellation | New Lead
  - Status: Active / Inactive toggle
  - Steps:
    • Step 1: [Channel] [Delay] "[Message]" [Edit] [Delete]
    • Step 2: ...
  - [Edit] [Duplicate] [Delete]

Edit Modal:
  Form:
  - Sequence name
  - Trigger type (radio: default, no-show, cancellation, etc.)
  - Add step button

  For each step:
  - Channel dropdown: SMS | Email
  - Delay: [number] [unit: minutes/hours/days]
  - Message template: textarea with placeholders
    (autocomplete: {callerName}, {businessName}, {appointmentTime}, etc.)

  [Save Sequence] [Cancel]
```

**Database:**
```typescript
// Extend follow_up_sequences:
{
  id: string;
  workspace_id: string;
  name: string; // "Default" or custom name
  trigger_type: 'default' | 'no_show' | 'cancellation' | 'lead';
  is_active: boolean;
  steps: Array<{
    order: number;
    channel: 'sms' | 'email';
    delay_minutes: number;
    message_template: string;
  }>;
  created_at: timestamp;
  updated_at: timestamp;
}
```

**Acceptance Criteria:**
- Default sequence displays (read-only)
- Custom sequences can be created
- Trigger types selectable
- Steps add/edit/delete
- Message template editor works
- Sequences save to DB
- Changes immediately affect new calls

---

### 2J. SMS Notifications to Owner
**File:** `/src/app/api/notifications/sms-to-owner.ts` (new)

**Task:** Send SMS to owner when call answered:

```
SMS Content (examples):

If appointment booked:
  "📅 NEW APPOINTMENT via Recall Touch
   [Name]: [Service requested]
   Time: [Date/Time]
   Phone: [Number]
   [View in dashboard →] [Confirm] [Reschedule]"

If call not booked:
  "📞 MISSED CALL → AI ANSWERED
   [Name] called at [Time]
   Need: [Intent from AI]
   [Follow-up SMS queued]
   [Call Dashboard] [Add Note]"

If no-show detected:
  "❌ NO-SHOW: [Name]
   Was scheduled for [Date/Time]
   Recovery SMS sent to customer
   [View] [Reschedule]"
```

**Details:**
- Only send if owner has SMS enabled
- Include action buttons (links to dashboard)
- Don't overwhelm (rate limit: max 1 SMS per 5 min per appointment)
- Configurable notification settings

**Acceptance Criteria:**
- SMS sends to owner's phone
- Content includes key details
- Links route to dashboard
- Rate limiting works
- User can disable notifications

---

### 2K. Call Transcription & Logging
**File:** `/src/lib/voice/transcribe-call.ts` (update existing)

**Task:** Store full call transcripts and metadata:

```
Call record includes:
- Full transcript (AI response + caller words)
- Duration (seconds)
- Caller sentiment (positive, neutral, negative)
- Topics extracted (appointment request, pricing question, complaint)
- Caller contact info (if captured)
- Outcome (appointment booked, follow-up queued, escalated)

Example transcript:
```
AI: "Hi! Thanks for calling ABC Plumbing. This is Maya. How can we help?"
Caller: "Hi, my kitchen sink is backed up."
AI: "Oh no, that's frustrating. We specialize in drain clearing. Do you need
      same-day service?"
Caller: "Yeah, if possible."
AI: "Great. We have openings at 2 PM or 4 PM today. Which works better?"
Caller: "2 PM works."
AI: "Perfect. Can I get your name and number?"
Caller: "It's John, 555-1234."
AI: "Got it, John. You're all set for 2 PM. We'll see you then!"
```

Stored in calls.transcript field.

Metadata extracted:
```json
{
  "caller_name": "John",
  "caller_phone": "555-1234",
  "service_requested": "drain clearing",
  "sentiment": "positive",
  "topics": ["appointment_request", "same-day_service"],
  "outcome": "appointment_booked",
  "duration_seconds": 87
}
```
```

**Code:**
```typescript
// /src/lib/voice/transcribe-call.ts

export async function transcribeCall(callId: string) {
  const call = await getCall(callId);

  // Use Faster-Whisper to transcribe audio
  const transcript = await whisperTranscribe(call.audio_url);

  // Extract metadata using NLP
  const metadata = await extractCallMetadata(transcript);

  // Save to DB
  await db.calls.update(callId, {
    transcript,
    caller_name: metadata.callerName,
    caller_phone: metadata.callerPhone,
    caller_intent: metadata.intent,
    caller_sentiment: metadata.sentiment,
  });

  return { transcript, metadata };
}
```

**Acceptance Criteria:**
- Transcripts stored in DB
- Caller info extracted
- Sentiment analyzed
- Full record searchable from dashboard

---

### 2L. Phase 2 Verification Checklist
**File:** `/VERIFICATION-PHASE-2.md`

- [ ] Revenue recovered hero metric displays and animates
- [ ] Period toggle (Today/Week/Month/All Time) works and updates all metrics
- [ ] 4 KPI cards render correctly and calculate accurately
- [ ] "Without Recall Touch" comparison banner displays
- [ ] Incoming call webhook endpoint receives and processes calls
- [ ] AI routes call and extracts caller data
- [ ] Appointment books into workspace calendar (Google/Outlook)
- [ ] Confirmation SMS sent to caller
- [ ] Follow-up sequence auto-triggers for non-booked calls
- [ ] Follow-up SMS sends at 2min, 60min, 24hr marks
- [ ] Appointment reminders send at 24h and 2h
- [ ] No-show detected and recovery sequence triggered
- [ ] SMS notifications sent to owner with appointment details
- [ ] Call transcriptions stored and searchable
- [ ] Follow-up sequence builder UI functional
- [ ] Custom sequences can be created/edited/deleted
- [ ] All 6 locale files updated with new strings
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes

**Revenue Impact Phase 2:**
- 40% churn reduction (better retention of signups)
- 100 customers retained = +$29,700 MRR
- NRR expansion: 130% (sequences + no-show recovery)
- Total value: **+$500K ARR annualized**

---

## PHASE 3: RETENTION & EXPANSION
### Keep Them, Grow Them
**Goal:** 140%+ NRR, reduce churn below 3% annually
**Revenue Impact:** Every 1% churn reduction = +$360K ARR

### 3A. Weekly Email Digest
**File:** `/src/app/api/email/send-weekly-digest.ts` (new)

**Task:** Auto-send Friday 9 AM summary email:

```
Subject: "Your week on Recall Touch: $X recovered, Y appointments booked"

Content:
────────────────────────────────────────────────────────────────────
Hi [Owner Name],

Here's your week by the numbers:

📊 WEEKLY SUMMARY
Revenue Recovered:    $8,450 (↑12% vs last week)
Calls Answered:       89
Appointments Booked:  12
No-Shows Recovered:   2

🎯 TOP INSIGHTS
• Your Monday morning calls convert at 67% (best day!)
• "Pricing question" is your #1 inquiry (34% of calls)
• Customers in your area book appointments 15% more often

💡 ACTIONS THIS WEEK
→ You missed 3 calls when the system was offline. Consider upgrading
  to Scale plan for dedicated support + SLA guarantee.
→ Your follow-up sequences recovered 2 no-shows ($1,200 value).
  Try the "Upsell" template for repeat customers.

📱 UPCOMING
• Your trial expires in 5 days (if in trial)
• 2 appointments this week need confirmation reminders

[View Full Dashboard] [Reply to Give Feedback]

Best,
The Recall Touch Team
────────────────────────────────────────────────────────────────────
```

**Details:**
- Scheduled cron job every Friday at 9 AM (user's timezone)
- Data aggregated for the past 7 days
- Include growth metrics (vs. last week)
- Personalized insights + action items
- Include subtle upgrade suggestion (if on Solo/Business)
- Unsubscribe link at bottom

**Cron job:**
```json
{
  "schedule": "0 9 * * 5", // Friday 9 AM UTC (adjust for user TZ)
  "url": "https://recall-touch.com/api/cron/send-weekly-digest",
}
```

**Acceptance Criteria:**
- Email generates from template
- Data accurate for the week
- Sent at correct time (user timezone)
- Links route correctly
- Unsubscribe works
- Deliverability tested (Mailgun/SendGrid)

---

### 3B. Daily Morning Briefing (Optional Dashboard Widget)
**File:** `/src/components/dashboard/MorningBriefing.tsx` (new)

**Task:** Show brief stats when user logs in (morning):

```
Dashboard top banner (if user logs in 6-9 AM):

☀️ GOOD MORNING, [NAME]

Today's early stats:
• 0 calls answered (it's early!)
• 1 appointment confirmed
• Your best time to get calls: 10 AM–12 PM

Pro tip: Your Med Spa customers call most on Fridays.
Ensure you have coverage then.
```

**Details:**
- Only show 6–9 AM
- Pull from call history to show user patterns
- Timezone-aware
- Dismiss-able

**Acceptance Criteria:**
- Widget shows 6–9 AM only
- Data is helpful and personalized
- User can dismiss

---

### 3C. Upgrade Trigger System (Call Limit Wall)
**File:** `/src/lib/limits/check-usage-limits.ts` (new)

**Task:** Show upgrade prompt when user hits 90%+ of call limit:

```
Scenario:
User on Solo plan (50 calls/month). Today is day 20 of month.
They've used 45 calls.
→ 90% of limit reached

UI: Upgrade prompt appears at top of dashboard:

┌─────────────────────────────────────────────────────┐
│ ⚠️  You're running low on calls this month          │
│                                                     │
│ You've used 45 of 50 calls (90%).                   │
│ Based on your usage, you need the Business plan     │
│ (500 calls/month) for only $297/month more.         │
│                                                     │
│ Expected recovery with more capacity:              │
│ +$8,000–$15,000/month                               │
│                                                     │
│ [Upgrade Now] [Dismiss] [See Plans]                 │
└─────────────────────────────────────────────────────┘
```

**Code Outline:**
```typescript
// /src/lib/limits/check-usage-limits.ts

interface UsageCheck {
  planCallLimit: number;
  callsUsedThisMonth: number;
  percentageUsed: number;
  daysLeftInMonth: number;
  projectedTotalUsage: number;
  shouldPromptUpgrade: boolean;
  recommendedPlan: 'business' | 'scale' | 'enterprise' | null;
}

export async function checkCallLimitStatus(
  workspaceId: string
): Promise<UsageCheck> {
  const workspace = await getWorkspace(workspaceId);
  const plan = PRICING_TIERS.find(t => t.id === workspace.plan_id);

  const callsThisMonth = await countCallsThisMonth(workspaceId);
  const percentageUsed = (callsThisMonth / plan.monthlyCallLimit) * 100;
  const daysLeftInMonth = getDaysLeftInMonth();
  const dailyUsageRate = callsThisMonth / getDayOfMonth();
  const projectedUsage = dailyUsageRate * getDaysInMonth();

  return {
    planCallLimit: plan.monthlyCallLimit,
    callsUsedThisMonth,
    percentageUsed,
    daysLeftInMonth,
    projectedTotalUsage: projectedUsage,
    shouldPromptUpgrade: percentageUsed >= 90 || projectedUsage > plan.monthlyCallLimit,
    recommendedPlan: getRecommendedPlan(projectedUsage, workspace.industry_id),
  };
}
```

**Acceptance Criteria:**
- Usage limit checked on dashboard load
- Prompt shows at 90%+ usage
- Recommended plan calculated
- Upgrade button routes to /pricing?plan=business
- Dismissible

---

### 3D. Upgrade Trigger System (Sequence Limit Wall)
**File:** `/src/lib/limits/check-sequence-limits.ts` (new)

**Task:** Show upgrade prompt when user tries to create 4th+ sequence:

```
Scenario:
User on Business plan (3 sequences max). They click "Create Sequence".
→ Limit reached

UI: Modal appears:

┌─────────────────────────────────────────────────────┐
│ 🔒 Sequence Limit Reached                           │
│                                                     │
│ You have 3 active sequences (max for Business plan).│
│ To unlock more sequences, upgrade to Scale:         │
│                                                     │
│ Scale plan includes:                                │
│ • 10 automated sequences                            │
│ • 2,000 calls/month (vs. 500)                       │
│ • Advanced no-show recovery                         │
│ • Custom AI voice training                          │
│                                                     │
│ Cost: $997/month (vs. $297 for Business)           │
│ ROI: +$20K–$50K/month recovered (avg.)              │
│                                                     │
│ [Upgrade to Scale] [Cancel]                         │
└─────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- Modal appears when sequence limit hit
- Recommends correct plan
- Shows ROI impact
- Upgrade button routes to /pricing
- Can dismiss (but comes back on next attempt)

---

### 3E. Feature Preview: Reactivation Engine
**File:** `/src/components/dashboard/FeaturePreview.tsx` (new)

**Task:** Show "coming soon" feature to upgrade-prompt eligible users:

```
Scenario:
User has 5+ total calls in database. They're on Business plan.
→ Show feature preview banner:

┌─────────────────────────────────────────────────────┐
│ 🚀 Coming Soon: Reactivation Engine                 │
│                                                     │
│ Automatically re-engage past customers who          │
│ haven't called in 30+ days.                         │
│                                                     │
│ Estimated value: +$3K–$8K/month recovered          │
│                                                     │
│ Currently available on: Scale plan only             │
│                                                     │
│ [See How It Works] [Upgrade Now]                    │
└─────────────────────────────────────────────────────┘
```

**Logic:**
- Show if: (user.plan = 'business') AND (user.total_calls > 5) AND (user.no_reactivation_feature)
- Dismissible for 7 days
- Click "Upgrade Now" → /pricing?plan=scale

**Acceptance Criteria:**
- Preview banner shows to eligible users
- Dismissible
- Routes to correct pricing plan
- Reappears after 7 days

---

### 3F. Annual Billing Default + Pause Option
**File:** `/src/app/dashboard/billing/page.tsx` (update)

**Task:** Make annual billing default, add pause option:

```
Billing Page Section 1: Current Plan

You're on: Business Plan (Annual)
Renews: June 15, 2026
Monthly cost: $297
Annual discount: ~$357/year saved

Section 2: Billing Actions

[Switch to Monthly] [Upgrade Plan] [Pause 30 Days] [Manage Payment]

"Pause 30 Days" option:
- User can pause their subscription for 1 month
- AI still answers calls (reduced to 10 calls/month during pause)
- Phone numbers on hold (not disconnected)
- Resumes automatically on day 31
- Resets if user unpause early
- Great for businesses in off-season

Logic:
When user clicks "Pause 30 Days":
1. Modal: "Are you sure? During pause:
   - Your AI still answers calls (10/month max)
   - Phone numbers stay active
   - You'll resume on [date] at $297/month
   [Pause for 30 Days] [Keep Active]"
2. If confirmed: Set `subscription.paused_until = now + 30 days`
3. Reduce call limits for that workspace
4. Send "we'll see you soon" email
5. Schedule automatic resume email for day 28

Section 3: Cancellation
[Cancel Subscription] → Triggers intercept flow (see 3G)
```

**Acceptance Criteria:**
- Annual billing is default new plan
- Monthly shows as "+20% surcharge"
- Pause option visible
- Pause works and resumes automatically
- During pause, call limit reduced to 10/month
- Workspace stays intact

---

### 3G. Cancellation Intercept & Win-Back
**File:** `/src/app/api/cancel/intercept-cancellation.ts` (new)

**Task:** When user clicks "Cancel", show retention options:

```
UI: Modal after "Cancel" click

┌─────────────────────────────────────────────────────┐
│ We'd Love to Keep You 💚                            │
│                                                     │
│ Before you go, here's what you'll lose:            │
│                                                     │
│ 📊 This month you recovered:                        │
│ • $8,450 in missed calls                            │
│ • 12 appointments booked                            │
│ • 2 no-shows recovered                              │
│                                                     │
│ Your AI has learned:                                │
│ • 34 common customer questions                      │
│ • Your availability patterns                        │
│ • What works for your industry                      │
│                                                     │
│ That knowledge goes away if you cancel. 😢         │
│                                                     │
│ INSTEAD, TRY:                                       │
│ [Pause for 30 Days]  [Switch to Solo ($49)]        │
│ [Talk to Us]         [Cancel Anyway]                │
└─────────────────────────────────────────────────────┘
```

**Code Outline:**
```typescript
// /src/app/api/cancel/intercept-cancellation.ts

export async function previewCancellationImpact(workspaceId: string) {
  const workspace = await getWorkspace(workspaceId);
  const thisMonthMetrics = await getRevenueMetrics(workspaceId, 'month');
  const totalKnowledge = {
    faqs_learned: await countFAQsLearned(workspaceId),
    calls_processed: await countTotalCalls(workspaceId),
    days_of_learning: differenceInDays(new Date(), workspace.created_at),
  };

  return {
    monthlyRevenue: thisMonthMetrics.total,
    appointmentsBooked: thisMonthMetrics.appointmentsBooked,
    noShowsRecovered: thisMonthMetrics.noShowsRecovered,
    knowledge: totalKnowledge,
    alternatives: [
      { action: 'pause', label: 'Pause for 30 Days', emoji: '⏸️' },
      { action: 'downgrade', label: 'Switch to Solo ($49)', emoji: '💰' },
      { action: 'contact_support', label: 'Talk to Us', emoji: '💬' },
    ],
  };
}

// If user cancels anyway:
// 1. Flag workspace as "churned"
// 2. Send email: "We'll miss you. Here's 20% off if you return in 90 days."
// 3. Schedule win-back emails (day 7, day 30, day 60)
// 4. Don't delete workspace (data preserved)
```

**Acceptance Criteria:**
- Intercept modal shows before cancellation
- Revenue metrics accurate
- Alternative options presented
- User can pause, downgrade, or contact support
- Cancel still works if user chooses it
- Win-back campaign triggers on actual cancellation

---

### 3H. Competitive Benchmark Dashboard
**File:** `/src/components/dashboard/CompetitiveBenchmark.tsx` (new)

**Task:** Show user how they compare to industry average:

```
Dashboard widget: "Your Benchmark"

Headline: "How You Compare to Industry Average"

Metrics (user vs. average):
┌──────────────────────────────────────────────────────┐
│ Calls Answered    Your: 89  |  Avg: 45    (+98% ↑)  │
│ Conversion Rate   Your: 45% |  Avg: 38%   (+7% ↑)   │
│ Monthly Revenue   Your: $8.4K | Avg: $4.2K (+100% ↑)│
│                                                      │
│ You're in the top 15% of [HVAC] businesses!        │
│ Here's how to get to the top 10%:                   │
│ → Improve no-show recovery (you're at 2, avg is 5)  │
│ → Add customer follow-ups (you have 2, leaders: 4+) │
│                                                      │
│ [View Competitor Comparison] [See More Insights]    │
└──────────────────────────────────────────────────────┘
```

**Data Source:**
- Anonymized benchmarks table (aggregated from all workspaces by industry)
- Updates weekly
- Calculate percentile rank

**Acceptance Criteria:**
- Benchmarks calculated from DB
- User stats compared vs. industry average
- Percentile rank shown
- Suggestions for improvement
- Link to /compare page

---

### 3I. Shareable Revenue Cards
**File:** `/src/components/dashboard/ShareableCard.tsx` (new)

**Task:** Create shareable image cards user can post on social:

```
Card type 1: Monthly Revenue
┌────────────────────────────────┐
│ 💚 Recall Touch               │
│                                │
│ 📱 This month, I recovered:     │
│ $8,450 in revenue              │
│ from missed calls               │
│                                │
│ 🔄 12 appointments booked       │
│ 🚀 2 no-shows recovered         │
│                                │
│ My business runs 24/7 now.      │
│ Join us → recall-touch.com      │
│                                │
│ [Logo] [Share button]           │
└────────────────────────────────┘

Card type 2: Call Volume
"I've answered 89 calls this month
 with AI. Never missed again.
 #SmartBusiness #RevenueRecovery"

Card type 3: Success Story
"Stopped losing $X/month to voicemail.
 Here's what changed..."
```

**UI:**
```
Dashboard > Export / Share section:

[Generate Share Card]

Modal:
- Card type selector (Revenue | Calls | Story)
- Preview
- Download as PNG (for LinkedIn/Twitter)
- Share links (LinkedIn pre-populate)
```

**Acceptance Criteria:**
- Cards generate correctly
- Download works
- Share to social works
- Image quality good (1200x630px recommended)

---

### 3J. Phase 3 Verification Checklist
**File:** `/VERIFICATION-PHASE-3.md`

- [ ] Weekly digest email generates and sends Friday 9 AM
- [ ] Email includes revenue metrics, insights, upgrade suggestions
- [ ] Morning briefing widget shows only 6–9 AM
- [ ] Call limit wall shows at 90%+ usage
- [ ] Sequence limit shows modal when user hits limit
- [ ] Feature preview banners display for eligible users
- [ ] Annual billing is default toggle on /pricing
- [ ] Pause option works and resumes automatically
- [ ] Cancellation intercept modal shows before cancel
- [ ] Win-back campaign triggers on actual cancellation
- [ ] Competitive benchmark shows vs. industry average
- [ ] Shareable revenue cards generate and download
- [ ] All i18n strings in all 6 locales
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

**Revenue Impact Phase 3:**
- Email digest: +8% engagement (each 1% = $144K ARR)
- Upgrade triggers: 15% of eligible users upgrade (+$540K ARR)
- Pause option: 5% churn reduction (-3% to +2%)
- Benchmark competitive feature: +12% NRR expansion
- Total value: **+$800K ARR**

---

## PHASE 4: VERTICAL DOMINATION
### Industry-Specific Everything
**Goal:** 2x conversion on landing pages, 3x NRR within vertical
**Revenue Impact:** Each vertical = +$200K ARR minimum

### 4A. Industry Template Pack: Data Structure
**File:** `/src/lib/constants/industry-templates.ts` (new)

**Task:** Create canonical industry template data:

```typescript
export const INDUSTRY_TEMPLATES = {
  hvac: {
    id: 'hvac',
    name: 'HVAC & Mechanical',
    description: 'Heating, cooling, refrigeration services',
    icon: 'Wind', // lucide-react
    greetingTemplate: `Hi there! Thanks for calling [YOUR COMPANY].
                       This is Maya, your AI assistant. We help with AC, heating,
                       and repair services. What can we help with today?`,
    faqTemplates: [
      {
        q: 'How much does an AC service call cost?',
        a: 'Our standard service call is $150, plus any repairs. First-time customers
            get 10% off.'
      },
      {
        q: 'Do you do same-day service?',
        a: 'Yes! For calls before noon, we often have same-day availability.
            It depends on our schedule.'
      },
      {
        q: 'Do you offer maintenance plans?',
        a: 'We do. Monthly plans are $49/month and include inspections, filter changes,
            and priority service.'
      },
      {
        q: 'What areas do you service?',
        a: 'We cover [METRO AREA]. Service calls are free if you\'re outside
            our service area.'
      },
      {
        q: 'Are you available 24/7?',
        a: 'Our office hours are 7 AM–6 PM weekdays. We have emergency service
            available 24/7 for additional fee.'
      },
    ],
    followUpSequence: {
      defaultTrigger: 'non_booked_call',
      steps: [
        {
          order: 1,
          channel: 'sms',
          delay_minutes: 2,
          template: 'Thanks for calling [COMPANY]! We\'d love to help with your [SERVICE].
                     Reply YES to book, or call back at [PHONE]. [BOOKING_LINK]'
        },
        {
          order: 2,
          channel: 'sms',
          delay_minutes: 60,
          template: 'Still need HVAC service? We have openings [TIME SLOTS].
                     Book now: [LINK]'
        },
        {
          order: 3,
          channel: 'sms',
          delay_minutes: 1440, // 24 hr
          template: 'One more thing: we\'re running maintenance specials this week.
                     Save 15%. [LINK]'
        },
      ]
    },
    benchmarks: {
      avgJobValue: 450,
      avgCallsPerWeek: 3,
      conversionRate: 0.45,
      noShowRate: 0.12,
      avgRevenueRecovered: 2835, // per month
    }
  },
  // dental: { ... },
  // legal: { ... },
  // medspa: { ... },
  // plumbing: { ... },
  // roofing: { ... },
  // realestate: { ... },
  // coaching: { ... },
};
```

**Files to update:**
1. Create `/src/lib/constants/industry-templates.ts`
2. Load into `/src/lib/constants.ts` (export INDUSTRY_TEMPLATES)
3. Seed Supabase `industries` table with this data

**Acceptance Criteria:**
- All 8 industries have complete templates
- Greetings, FAQs, sequences defined
- Benchmarks provided
- Data loads into DB

---

### 4B. Industry Landing Pages (Part 1: Structure)
**File:** `/src/app/industries/[slug]/page.tsx` (new)

**Task:** Create dynamic industry landing pages:

```
Route: /industries/hvac, /industries/dental, /industries/legal, etc.

Page structure:
1. Hero section (industry-specific)
2. Pain points (vertical-specific)
3. ROI calculator (industry preset)
4. How it works (for this industry)
5. Testimonial (from that industry)
6. Competitor comparison (optional)
7. FAQ section
8. CTA: "Try Free for 14 Days"

Example: /industries/hvac

Hero:
  Headline: "Never Miss a Furnace or AC Call Again"
  Subline:  "AI that answers like you. Picks up every call. Books every job.
             For HVAC & mechanical services."
  CTA:      "Try Free" → /activate?industry=hvac

Pain points:
  📊 By the numbers:
  • HVAC businesses lose $8K–$50K/month to voicemail
  • 2–3 missed calls = 1 competitor winning your customer
  • After-hours calls? You lose them all.

ROI Calculator:
  (Pre-filled with HVAC benchmarks)
  Job value: $450
  Calls/week: 3
  Conversion: 45%
  → Monthly recovery: $2,835
```

**Code Structure:**
```typescript
// /src/app/industries/[slug]/page.tsx

interface IndustryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function IndustryPage({ params }: IndustryPageProps) {
  const { slug } = await params;
  const industry = INDUSTRY_TEMPLATES[slug];

  if (!industry) {
    notFound();
  }

  return (
    <div>
      <IndustryHero industry={industry} />
      <PainPoints industry={industry} />
      <IndustryROICalculator industry={industry} />
      <HowItWorksIndustry industry={industry} />
      <IndustryTestimonial industry={industry} />
      <IndustryFAQ industry={industry} />
      <FinalCTA />
    </div>
  );
}
```

**Acceptance Criteria:**
- Dynamic pages render for all 8 industries
- Route `/industries/[slug]` works
- Content customized per industry
- No 404s for valid industries
- 404 for invalid slugs

---

### 4C. Industry Landing Pages (Part 2: Content)
**File:** `/src/components/industries/IndustryHero.tsx` (new) + others

**Task:** Build industry-specific components:

```
Components to create:
1. IndustryHero.tsx - Dynamic headline + subline
2. PainPoints.tsx - Industry-specific pain stats
3. IndustryROICalculator.tsx - Pre-filled with benchmarks
4. HowItWorksIndustry.tsx - Industry-specific examples
5. IndustryTestimonial.tsx - Pull from that vertical
6. IndustryFAQ.tsx - Load from industry template
7. CompetitorComparison.tsx - Compare vs. Smith.ai, Ruby, etc.

Example: IndustryHero

Component receives: industry (from INDUSTRY_TEMPLATES[slug])

Output:
  Headline: "Never Miss a [HVAC] Call Again"
  Subline:  "AI that answers like you. Picks up every call. Books every job.
             For [HVAC & mechanical services]."

  Background: Maybe industry-specific color/image?
  HVAC: Blue + thermometer icon
  Dental: Teal + tooth icon
  Legal: Navy + scales icon
```

**Acceptance Criteria:**
- All 7 components build and render
- Content accurate per industry
- Images/icons appropriate
- Mobile responsive
- No console errors

---

### 4D. Vertical Landing Pages: ROI Calculators
**File:** `/src/components/industries/IndustryROICalculator.tsx`

**Task:** Per-industry ROI calculators with preset benchmarks:

```
HVAC calculator (example):

Headline: "What Will Missed HVAC Calls Cost You?"

Inputs:
- Your average AC/furnace service call: $450 (pre-filled)
- How many calls do you miss per week? [3] (pre-filled)
- What % of calls become jobs? [45%] (pre-filled)

Output:
"You're losing an average of $2,835/month
to missed calls. That's $34,020 per year.

With Recall Touch answering calls 24/7,
recovering 45% of what you'd have lost:

Recovered per month:   $2,835
Recovered per year:    $34,020
Recall Touch cost:     $297/month
Net annual gain:       $30,456
Payback period:        3.1 days
ROI:                   13,608%

Start your free trial now and stop leaving
money on the table."

CTA: "Start Free Trial →" (→ /activate?industry=hvac)
```

**Acceptance Criteria:**
- Calculator shows per industry
- Benchmarks pre-fill correctly
- Math is accurate
- Animation smooth
- Mobile responsive

---

### 4E. Competitor Comparison Pages
**File:** `/src/app/compare/[competitor]/page.tsx` (new)

**Task:** Create comparison pages: RT vs. Smith.ai, Ruby, GoHighLevel, Goodcall

```
Routes:
/compare/smith-ai
/compare/ruby
/compare/gohighlevel
/compare/goodcall

Example: /compare/smith-ai

Headline: "Recall Touch vs. Smith.ai"
Subline:  "Side-by-side comparison of AI call answering platforms"

Comparison table:
┌─────────────────────────────────────────────────────────┐
│ Feature          │ Recall Touch │ Smith.ai │ Winner      │
├─────────────────────────────────────────────────────────┤
│ Price            │ $297/mo      │ $1299/mo │ RT ✓        │
│ Calls/month      │ 500          │ Unlimited│ Smith.ai    │
│ Setup time       │ 2 min        │ 1 week   │ RT ✓        │
│ Appointment book │ Yes, live    │ Yes      │ RT ✓        │
│ No-show recovery │ Automated    │ Manual   │ RT ✓        │
│ Revenue tracking │ Yes, exact   │ No       │ RT ✓        │
│ Follow-ups       │ Automated    │ Manual   │ RT ✓        │
│ Support          │ Live chat    │ Email    │ RT ✓        │
│ ROI dashboard    │ Yes, detailed│ No       │ RT ✓        │
│ Industry template│ 8 included   │ None     │ RT ✓        │
└─────────────────────────────────────────────────────────┘

Key differentiators (RT):
1. Revenue recovered is THE metric (not just calls)
2. Fastest setup (2 min vs. 1 week for competitors)
3. No-show recovery automated (competitors: manual)
4. Industry templates included (competitors: you build from scratch)
5. 3x cheaper than Smith.ai, same or better features

Testimonial callout:
"We tried [Competitor]. Expensive, slow to set up,
no revenue tracking. Switched to Recall Touch.
Better results, 1/4 the cost." - [Name], [Industry]

CTA: "Try Recall Touch Free" → /activate
```

**Details:**
- Objective, factual comparison (no FUD)
- Credit strengths of competitors where true
- Focus on RT's unique: revenue tracking, speed, industry templates
- Mobile: table becomes cards
- Update regularly as competitors evolve

**Acceptance Criteria:**
- Comparison pages exist for 4 competitors
- Tables render correctly
- Claims factual and defensible
- Mobile responsive
- CTA routes correctly

---

### 4F. Industry-Specific Onboarding Flow (Modification)
**File:** `/src/app/onboarding/page.tsx` (update)

**Task:** If user arrives from `/industries/[slug]`, pre-select industry:

```
Logic:
1. User clicks CTA on /industries/hvac → /activate?industry=hvac
2. Onboarding wizard loads
3. Step 1: Industry selection → HVAC pre-selected (can still change)
4. Greeting, phone, test call flow as before
5. All templates from HVAC industry loaded

URL tracking:
- Read ?industry=slug from URL params
- Pre-fill onboarding.industry_id
- Show badge: "Optimized for HVAC"
```

**Acceptance Criteria:**
- Industry pre-selected from URL param
- User can still change
- All downstream templates load correctly
- Badge visible

---

### 4G. Multi-Industry Support: Dashboard Customization
**File:** `/src/app/dashboard/page.tsx` (update)

**Task:** Dashboard metrics, FAQs, suggestions change by industry:

```
If user is HVAC:
- Sample calls shown = HVAC-related
- ROI benchmarks = HVAC averages
- FAQ suggestions = HVAC questions
- Follow-up templates = HVAC-optimized
- Benchmark comparison = vs. HVAC average, not all

If user is Dental:
- Sample calls = Dental appointments
- ROI = Dental benchmarks
- Etc.
```

**Code:**
```typescript
// Dashboard reads workspace.industry_id
// Loads all templates and benchmarks from INDUSTRY_TEMPLATES[workspace.industry_id]
// Customizes all UI accordingly
```

**Acceptance Criteria:**
- Dashboard customizes by industry
- All industries supported
- No hardcoding of industry logic in components

---

### 4H. Phase 4 Verification Checklist
**File:** `/VERIFICATION-PHASE-4.md`

- [ ] Industry templates data structure complete (all 8 verticals)
- [ ] All 8 industries have: greeting, FAQs (3–5), follow-up sequence, benchmarks
- [ ] `/industries/[slug]` routes work for all 8 industries
- [ ] Industry landing pages render correctly
- [ ] Industry-specific ROI calculators pre-fill and calculate correctly
- [ ] Competitor comparison pages exist for Smith.ai, Ruby, GoHighLevel, Goodcall
- [ ] Comparison tables render and are mobile responsive
- [ ] Onboarding pre-selects industry from URL param
- [ ] Dashboard customizes by industry
- [ ] Testimonials pull from correct industry
- [ ] All i18n strings in all 6 locales
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

**Revenue Impact Phase 4:**
- 2x conversion lift on industry landing pages
- 8 verticals × $200K each = +$1.6M ARR
- 3x NRR within verticals (+40 points NRR)
- Total value: **+$1.6M ARR**

---

## PHASE 5: SCALE INFRASTRUCTURE
### Agency, Enterprise, Acquisition
**Goal:** 100+ agency partners by Month 24, enterprise deals, $100M ARR foundation
**Revenue Impact:** Agency channel = $10M+ ARR

### 5A. Agency Dashboard: Sub-Account Management
**File:** `/src/app/agency/dashboard/page.tsx` (new)

**Task:** Build agency reseller console:

```
Page: /agency/dashboard

Headline: "Your Client Accounts"
Subline:  "Manage Recall Touch for all your customers from one dashboard"

Section 1: Client Accounts Table
┌────────────────────────────────────────────────────────────┐
│ Client Name      │ Plan   │ Revenue /mo │ Users │ Status   │
├────────────────────────────────────────────────────────────┤
│ ABC HVAC Inc.    │ Scale  │ $997        │ 3     │ Active   │
│ Smile Dental     │ Business│ $297       │ 2     │ Active   │
│ Legal Associates │ Scale   │ $997       │ 5     │ Active   │
│ Park Med Spa     │ Solo    │ $49        │ 1     │ Paused   │
└────────────────────────────────────────────────────────────┘

Actions:
- Click client name → manage that workspace
- [+ Add New Client] button → invite wizard
- [Create Bulk Import] → CSV upload
- [View Billing] → see margin per client

Section 2: Agency Stats
- Total clients: 4
- Total revenue under management: $2,340/month
- Your margin: (price - wholesale cost) × clients
- Growth this month: +1 client

Section 3: Tools
[Export Reporting] [Bulk Onboarding] [White-Label Settings] [Invite Link]
```

**Database:**
```typescript
// Add to workspace:
{
  agency_partner_id: string (FK to agency partner workspace)
  agency_margin: number (%)
}

// New table: agency_partnerships
{
  id: string;
  agency_workspace_id: string;
  client_workspace_id: string;
  plan_id: string;
  cost_to_agency: number; // wholesale price
  agency_profit: number;
  created_at: timestamp;
}
```

**Acceptance Criteria:**
- Agency dashboard loads
- Client list displays correctly
- Can add new clients
- Margin calculated correctly
- Revenue tracking accurate

---

### 5B. Agency White-Label Basics
**File:** `/src/app/agency/settings/page.tsx` (new)

**Task:** Allow agencies to white-label UI:

```
Settings page: /agency/settings

Section: White-Label Customization

Logo Upload:
- Upload agency logo
- Use in: Email headers, PDF exports, dashboard (if enabled)
- Resolution: 200x60px recommended

Brand Colors:
- Primary color: [color picker]
- Accent color: [color picker]
- Apply to: Buttons, links, accents (if enabled)

Email Footer:
- Add custom footer text to emails: "[Agency Name] • [Website]"

Domain (Future):
- Custom domain support (e.g., myagency.recall-touch.com)
- Available on Enterprise tier

Toggle Options:
☑️ Use my logo in emails
☑️ Apply my brand colors
☑️ Add footer to all emails
☐ (Grayed out) Custom domain (available on Enterprise)

Note: White-labeling is available on Agency tier and above.
```

**Acceptance Criteria:**
- Logo upload works
- Color picker functional
- Colors apply to emails
- Settings save to DB
- Toggles control visibility

---

### 5C. Agency Margin Reporting
**File:** `/src/components/agency/MarginReporting.tsx` (new)

**Task:** Show agency profitability per client:

```
Report: Agency Margin Dashboard

Columns:
- Client name
- Plan (Solo/Business/Scale)
- Retail price
- Wholesale cost
- Margin per month
- Total margin (YTD)
- Growth (MoM)

Example:
┌───────────────────────────────────────────────────────────┐
│ Client: ABC HVAC                                          │
│ Plan: Scale ($997 retail)                                 │
│ Your cost: $500 (wholesale)                               │
│ Your margin: $497/month ($5,964 YTD)                      │
│ Client health: Active, 4 months, growing                  │
│                                                           │
│ [View Client Details] [Manage Plan]                       │
└───────────────────────────────────────────────────────────┘
```

**Wholesale Pricing:**
- Solo ($49 retail) → $20 wholesale (to agency)
- Business ($297 retail) → $150 wholesale
- Scale ($997 retail) → $500 wholesale
- Enterprise → Custom wholesale

**Acceptance Criteria:**
- Margin calculated correctly
- Reports exportable
- YTD totals accurate
- Multiple clients aggregated correctly

---

### 5D. Bulk Onboarding for Agencies
**File:** `/src/app/api/agency/bulk-onboard.ts` (new)

**Task:** CSV import for agencies to onboard clients in bulk:

```
Endpoint: POST /api/agency/bulk-onboard

CSV format:
business_name, industry, contact_email, phone_number, plan
ABC HVAC Inc., hvac, john@abchvac.com, 555-1234, Scale
Smile Dental, dental, smile@dentist.com, 555-5678, Business
Legal Associates, legal, contact@legal.com, 555-9999, Scale

Process:
1. Agency uploads CSV
2. Validates each row
3. Creates workspace for each client
4. Sends signup links to contact emails
5. Client completes onboarding (phone setup, test call)
6. Agency dashboard shows all clients

Returns:
{
  success: true,
  imported: 3,
  failed: 0,
  download_signup_links: [email, signup_link] pairs
}
```

**Acceptance Criteria:**
- CSV upload works
- Validates data
- Creates workspaces
- Sends invite emails
- Success report accurate

---

### 5E. Enterprise Features: SSO Preparation
**File:** `/src/app/api/auth/sso.ts` (new)

**Task:** Build SSO infrastructure (SAML/OpenID Connect):

```
Enterprise tier includes: SSO (SAML 2.0 or OpenID Connect)

Admin settings:
/dashboard/enterprise/sso

Setup:
1. Choose protocol: SAML 2.0 or OpenID Connect
2. Enter identity provider metadata URL (Okta, Azure AD, etc.)
3. Configure:
   - IdP Entity ID
   - SSO Login URL
   - Certificate
   - Claim mappings (email, name, groups)
4. Test login
5. Enable

When enabled:
- All users log in via company SSO
- Users created automatically on first login
- Email domain matching (optional)
```

**Code structure:**
```typescript
// /src/app/api/auth/sso.ts

interface SSOConfig {
  workspace_id: string;
  protocol: 'saml' | 'oidc';
  idp_entity_id: string;
  sso_login_url: string;
  certificate: string;
  enabled: boolean;
}

// Middleware to check if workspace has SSO enabled
// Redirect to IdP for login if SSO enabled
```

**Acceptance Criteria:**
- SSO config stored in DB
- SAML URL generation works
- Test flow completes
- Can enable/disable
- Documentation provided for IT teams

---

### 5F. Enterprise Features: Audit Logs
**File:** `/src/app/api/audit/log-event.ts` (new)

**Task:** Comprehensive audit logging for enterprise:

```
Audit log tracks:
- User logins (successful and failed)
- Workspace/account settings changes
- User additions/removals
- Permission changes
- Pricing/plan changes
- Payment method changes
- Data exports/downloads
- Sequence edits
- Phone number changes
- API key creation/rotation

Storage:
┌─ audit_logs ──────────────────────────────────┐
│ id           (uuid)                           │
│ workspace_id (uuid FK)                        │
│ user_id      (uuid FK)                        │
│ event_type   (string: 'login', 'setting_change', etc.)
│ resource     (string: 'workspace', 'sequence', etc.)
│ action       (string: 'create', 'update', 'delete')
│ changes      (json: {field: {old, new}})     │
│ ip_address   (string)                        │
│ user_agent   (string)                        │
│ timestamp    (timestamp)                     │
└───────────────────────────────────────────────┘

Dashboard:
/dashboard/enterprise/audit-logs

Display:
- Searchable, filterable log
- Time range selector
- Export as CSV (for compliance)
- Alert on suspicious activity (optional)
```

**Acceptance Criteria:**
- All events logged
- Data accurate
- Searchable and filterable
- Exportable
- Available to Enterprise customers only

---

### 5G. Enterprise Features: Multi-Location Management
**File:** `/src/app/dashboard/enterprise/multi-location/page.tsx` (new)

**Task:** Manage multiple business locations from one account:

```
UI: /dashboard/enterprise/multi-location

Headline: "Your Locations"
Subline:  "Manage AI call answering for all your locations centrally"

Structure:
┌──────────────────────────────────────────────────────┐
│ Location Name         │ Status │ Calls /mo │ Plan    │
├──────────────────────────────────────────────────────┤
│ New York, NY          │ Active │ 247      │ Scale   │
│ Los Angeles, CA       │ Active │ 156      │ Scale   │
│ Chicago, IL           │ Active │ 89       │ Business│
│ Dallas, TX            │ Paused │ 0        │ Solo    │
└──────────────────────────────────────────────────────┘

Actions:
- Click location name → manage settings for that location
- Phone numbers, greeting, sequences per location
- Consolidated reporting (all locations)
- Unified billing (one invoice)

Database:
Each location is a "sub-workspace" linked to enterprise workspace
```

**Acceptance Criteria:**
- Multiple locations manageable
- Unified dashboard with per-location drill-down
- Consolidated metrics
- Individual phone numbers per location
- One billing account

---

### 5H. Enterprise Features: Custom Voice Training
**File:** `/src/app/api/voice/train-custom-voice.ts` (new)

**Task:** Allow enterprises to train custom AI voice:

```
Feature: Custom Voice Training

How it works:
1. Upload 5–10 min of voice samples (entrepreneur's voice)
2. System trains ElevenLabs TTS clone
3. AI calls use trained voice (sounds like the business owner)

UI: /dashboard/enterprise/voice

Steps:
1. Upload audio files (MP3, WAV)
2. Label samples (e.g., "greeting", "technical", "friendly")
3. Review quality samples (system checks audio quality)
4. Train model (takes ~24 hours)
5. Test voice ("Listen to sample call using your voice")
6. Deploy to all calls

Result:
- All incoming calls answered with custom voice
- Increases perceived legitimacy
- Higher conversion rates (familiar voice)
```

**Acceptance Criteria:**
- Voice upload works
- Training initiated
- Trained voice used in calls
- Quality verified
- Can rollback to default

---

### 5I. API & Webhook Layer: Developer Docs
**File:** `/src/app/developers/docs/page.tsx` (new)

**Task:** Build API documentation:

```
/developers/docs - API Reference

Endpoints:

1. Calls
   GET /api/v1/calls
   POST /api/v1/calls
   GET /api/v1/calls/{id}

2. Appointments
   GET /api/v1/appointments
   POST /api/v1/appointments
   PATCH /api/v1/appointments/{id}

3. Sequences
   GET /api/v1/sequences
   POST /api/v1/sequences
   PATCH /api/v1/sequences/{id}

4. Webhooks
   POST /webhooks/call.answered
   POST /webhooks/appointment.booked
   POST /webhooks/no_show.detected

Auth:
- API key based (sb_api_...)
- OAuth 2.0 support

Rate limits:
- 100 requests/minute
- Burst: 1000/minute

SDK:
- npm install @recalltouch/sdk
- Python: pip install recalltouch
```

**Features:**
- Interactive API explorer (try endpoints)
- Code samples (JavaScript, Python, cURL)
- Webhook testing/replay
- API usage dashboard

**Acceptance Criteria:**
- All endpoints documented
- Code samples work
- Rate limiting enforced
- Webhook testing works

---

### 5J. API & Webhook Layer: OAuth 2.0
**File:** `/src/app/api/oauth/authorize.ts` (new)

**Task:** Build OAuth 2.0 for third-party integrations:

```
Third-party apps can:
1. Redirect user to /api/oauth/authorize
2. User approves scope (read calls, write appointments)
3. Redirect back with authorization code
4. Exchange code for access token
5. Use token to call API

Flow:
POST /api/oauth/authorize?
  client_id=xxx
  redirect_uri=https://app.example.com/callback
  scope=calls:read,appointments:write
  state=random

Response:
{
  code: "auth_code_xyz",
  state: "random"
}

Exchange:
POST /api/oauth/token {
  code: "auth_code_xyz",
  client_id: "xxx",
  client_secret: "secret",
  grant_type: "authorization_code"
}

Response:
{
  access_token: "token_xyz",
  refresh_token: "refresh_xyz",
  expires_in: 3600,
  token_type: "Bearer"
}
```

**Acceptance Criteria:**
- OAuth flow works end-to-end
- Scopes enforced
- Tokens expire correctly
- Refresh token works
- Documented

---

### 5K. Metrics Dashboard: Revenue & Churn Tracking
**File:** `/src/app/internal/metrics/page.tsx` (new - internal only)

**Task:** Build internal dashboard for company metrics:

```
/internal/metrics (admin-only)

Real-time SaaS metrics:

MRR (Monthly Recurring Revenue):
$487,650 (↑$18,450 this month, +3.9%)

ARR (Annualized Recurring Revenue):
$5,851,800 (target: $100M by Month 36)

Customers by Plan:
- Solo: 234 customers, $11,466 MRR
- Business: 892 customers, $265,224 MRR
- Scale: 145 customers, $144,565 MRR
- Enterprise: 8 customers, $66,395 MRR

Churn Rate (Monthly):
2.1% (target: <2%)

NRR (Net Revenue Retention):
135% (target: 140%)

CAC (Customer Acquisition Cost):
$450 (by channel)
- Organic: $200
- Paid ads: $600
- Agency: $150 (but high LTV)
- Direct sales: $800

LTV (Lifetime Value):
$12,340 (CAC payback: 4.2 months)

Growth Rate (MoM):
+3.9% (target: +5%)

Churn Drivers:
- Paused: 45 customers
- Downgraded: 23 customers
- Canceled: 18 customers

Trends:
- MRR growth chart (6-month history)
- NRR cohort analysis
- CAC by channel
- Industry breakdown (% MRR by vertical)
- Customer health (at-risk, healthy, growing)
```

**Data sources:**
- Stripe (charges, subscriptions)
- Supabase (call counts, metrics)
- Mix to calculate NRR, churn, etc.

**Acceptance Criteria:**
- All metrics calculate correctly
- Charts render
- Data updates daily
- Exportable for board reports
- Access control (admin-only)

---

### 5L. Acquisition-Ready Metrics Dashboard (Customer-Facing)
**File:** `/src/app/dashboard/investor-insights/page.tsx` (new)

**Task:** Show customers investment-grade metrics (NRR, cohorts, etc.):

```
/dashboard/investor-insights (available to Enterprise tier)

What this shows:
- NRR (proves Recall Touch is sticky)
- Customer cohort data
- Churn prediction
- Expansion opportunities

Display:
"Your Account Health"

Retention: 98% (vs. SaaS avg: 85%)
Expansion rate: +35% (monthly expansion revenue as % of MRR)
NRR: 135% (vs. SaaS avg: 105%)

Cohort: You've been with us 14 months
- Starting MRR: $297 (Solo)
- Current MRR: $997 (Scale) + follow-ups
- Expansion: +236%

At-risk indicators: None
Growth opportunities:
- Add 2nd location (+$297–$997)
- Use reactivation engine (coming: +$5K/month)
```

**Acceptance Criteria:**
- Metrics accurate
- Cohort analysis correct
- Predictions reasonable
- Customer finds it motivating
- Enterprise-tier access only

---

### 5M. Phase 5 Verification Checklist
**File:** `/VERIFICATION-PHASE-5.md`

- [ ] Agency dashboard functional (client management)
- [ ] Sub-account creation works
- [ ] White-label settings apply correctly
- [ ] Margin reporting accurate
- [ ] Bulk onboarding CSV import works
- [ ] SSO configuration endpoint functional
- [ ] Audit logging captures all events
- [ ] Multi-location management works
- [ ] Custom voice training initiated
- [ ] API documentation complete
- [ ] OAuth 2.0 flow works end-to-end
- [ ] Internal metrics dashboard accurate
- [ ] Customer metrics dashboard shows cohort data
- [ ] All i18n strings in all 6 locales
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

**Revenue Impact Phase 5:**
- Agency channel: 100+ partners × $5K ARR avg = $500K ARR
- Enterprise deals: 10 contracts × $200K ARR = $2M ARR
- API integrations: +15% expansion (partner revenue)
- Total value: **+$2.5M ARR + foundation for $100M**

---

## FINAL VERIFICATION: FULL SYSTEM CHECK

### Pre-Launch Checklist (All Phases Complete)

**Functionality:**
- [ ] Homepage converts to onboarding
- [ ] Onboarding completes in <3 minutes
- [ ] AI answers incoming calls
- [ ] Appointments book and integrate with calendar
- [ ] Revenue recovered metric displays prominently
- [ ] Upgrade triggers fire appropriately
- [ ] Cancellation intercept works
- [ ] All 8 industries have landing pages
- [ ] Agency dashboard functional
- [ ] Enterprise features available (SSO, audit logs, etc.)

**Performance:**
- [ ] Lighthouse Core Web Vitals: LCP <2.5s, FID <100ms, CLS <0.1
- [ ] API response times <200ms (p95)
- [ ] Dashboard loads <3s
- [ ] No N+1 queries

**Internationalization:**
- [ ] All 6 locales (en, es, fr, de, pt, ja) complete
- [ ] No missing translation keys
- [ ] Dates/numbers format correctly per locale

**Quality:**
- [ ] `npm run build` passes
- [ ] `npm run lint` passes (no errors or warnings)
- [ ] `npx tsc --noEmit` passes (no TypeScript errors)
- [ ] All routes tested (manual + automated)
- [ ] API endpoints validated (auth, data, errors)
- [ ] Database migrations clean
- [ ] No console errors or warnings

**Security:**
- [ ] All API endpoints validate workspace access
- [ ] No sensitive data in URLs or logs
- [ ] Stripe webhooks secure (signature verified)
- [ ] Rate limiting in place
- [ ] CSRF protection enabled

**Deployment:**
- [ ] Vercel build succeeds
- [ ] Environment variables set correctly
- [ ] Database migrations applied to prod
- [ ] Edge functions deployed
- [ ] Phone provider (Twilio) ready
- [ ] Email provider (Mailgun) ready
- [ ] Voice provider (ElevenLabs) ready

**Monitoring:**
- [ ] Sentry error tracking active
- [ ] Datadog/LogRocket session replay enabled
- [ ] Stripe webhook monitoring
- [ ] Call success/failure rates tracked
- [ ] Revenue metrics dashboard

---

## EXECUTION INSTRUCTIONS FOR CURSOR

1. **Complete phases in order.** Do not skip or reorder.
2. **After each phase,** run verification checklist. Fix any failures before moving to next phase.
3. **Update i18n files** whenever adding user-facing strings (all 6 locales).
4. **Use existing components** (`/src/components/ui/`) as patterns.
5. **Exact file paths only.** Every file mentioned above exists or must be created.
6. **Revenue-first mindset.** Every feature must justify its build time in terms of retention, expansion, or new revenue.
7. **Test on mobile.** Responsive design is non-negotiable.
8. **Code quality.** No `any` types, no hardcoded values, no console errors.

---

## SUMMARY: WHAT WE'RE BUILDING

**By end of Phase 1:** 25% conversion funnel (homepage → onboarding in 3 min)
**By end of Phase 2:** Revenue-obsessed retention engine (hero metric: $ recovered)
**By end of Phase 3:** NRR 140% (email, upgrades, pause, benchmarks)
**By end of Phase 4:** Vertical domination (8 industries, industry-specific landing pages, 3x NRR)
**By end of Phase 5:** Enterprise-ready, agency-scalable, acquisition-attractive platform

**Total Revenue Impact:** ~$5M ARR additional revenue from execution
**Path to $100M:** Vertical domination × agency channel × enterprise deals

This is the roadmap to $100M. Execute it, and Recall Touch wins.

---

**END OF MASTER PROMPT**

Document Version: 2.0 | Last verified: 2026-03-17
