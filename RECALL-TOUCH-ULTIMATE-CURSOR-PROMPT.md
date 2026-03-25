# RECALL TOUCH — ULTIMATE CURSOR IMPLEMENTATION PROMPT (V7)

You are the engineering team for Recall Touch. This is your COMPLETE specification — strategy, product architecture, outbound engine, inbound engine, follow-up engine, database schema, UI/UX, voice stack, billing, copy, and testing — in one document. Follow it exactly. Do not improvise. Do not add features not listed. Do not use placeholder data that looks real. Do not skip steps. Work in the exact order specified.

Read this entire document before writing a single line of code.

---

## PART 0: WHAT YOU ARE BUILDING AND WHY

### What Recall Touch Is

Recall Touch is an AI revenue recovery system for service businesses. It answers every inbound call, executes outbound campaigns, runs multi-step follow-up sequences across voice + SMS + email, books appointments, recovers no-shows, reactivates dead leads, chases quotes, and measures every dollar recovered — automatically.

**The product has TWO engines working together:**

1. **INBOUND ENGINE** — AI answers every call 24/7, captures leads, books appointments, routes emergencies, and triggers follow-up sequences based on call outcomes.

2. **OUTBOUND ENGINE** — AI initiates calls, runs campaigns, executes follow-up sequences, recovers no-shows, reactivates cold leads, chases unsigned quotes, and handles appointment reminders — all proactively, without waiting for the customer to call back.

The outbound engine is what separates Recall Touch from every AI receptionist on the market. Competitors answer calls. Recall Touch answers calls AND proactively chases revenue.

### The Category: AI Revenue Recovery

NOT an AI receptionist. NOT an answering service. NOT a CRM. NOT a dialer. The AI system that recovers every dollar of revenue a service business is currently losing.

**Why this category matters:** The AI receptionist market is terminally commoditized — 30+ competitors at $29-79/month. Competing on "answer every call" is a race to the bottom. Recall Touch's real differentiator is what happens AFTER the call and BEFORE the next call: automated outbound follow-up, no-show recovery, reactivation campaigns, quote chasing, and revenue attribution. No competitor under $1,000/month offers this. That's the wedge.

### The Competitive Landscape (March 2026)

| Competitor | Price | What They Do | What They DON'T Do |
|-----------|-------|-------------|-------------------|
| Dialzara | $29-99/mo | Answer calls, take messages | No follow-up, no outbound, no recovery |
| Rosie AI | $49-149/mo | Answer calls, CRM push | No automated sequences, no outbound campaigns |
| Goodcall | $59-249/mo | Answer calls, CRM integration, booking | No no-show recovery, no outbound, no reactivation |
| My AI Front Desk | $79-149/mo | Answer calls, scheduling | No follow-up engine, no outbound calling |
| Smith.ai | $95-800/mo | Hybrid AI+human, integrations | Human-dependent, no automated outbound sequences |
| Upfirst | $25-99/mo | Answer calls, missed call text back | Text back only, no multi-step outbound workflows |
| Bland AI | $0.09/min | Developer voice platform | Not for service businesses, no product UI |
| Synthflow | $29-1400/mo | No-code voice agent builder | Developer tool, no follow-up or outbound engine |

**Recall Touch's unfair advantage:** It's the ONLY platform under $1,000/month that combines:
- AI inbound call answering
- AI outbound calling (proactive follow-up, campaigns, recovery)
- Multi-step automated follow-up sequences (SMS + email + voice)
- No-show recovery with automatic rebooking
- Dead lead reactivation campaigns
- Quote/estimate chasing sequences
- Revenue attribution dashboard

### Entry Market

Single-location service businesses that depend on inbound calls:

1. **Dental practices** (BEST first ICP) — $3,000+ patient LTV, 200K US practices, chronic no-show problem
2. **HVAC / plumbing / electrical** — $300-800/job, high call volume, emergency-driven
3. **Legal intake** (PI, family, immigration) — $5,000-50,000/case, every missed lead is catastrophic
4. **Med spa / aesthetics** — $4,500 avg treatment value, high no-show rate, reactivation goldmine
5. **Roofing / restoration** — $12,000+ avg job, seasonal urgency, storm lead follow-up critical

### Tech Stack (Existing — Keep All)

Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, Supabase (PostgreSQL + Auth + RLS), Stripe (subscriptions + metered billing), Vapi (voice orchestration — Phase 1), Pipecat (voice orchestration — Phase 2), Deepgram Aura-2 (TTS default), Deepgram Nova-2 (STT), ElevenLabs Turbo v2.5 (TTS premium), Claude Haiku 4.5 (LLM routine), Claude Sonnet 4 (LLM complex), Twilio (telephony + SMS), ioredis, Framer Motion, Recharts, Lucide React icons.

### Voice Architecture (Phase 1 — Current)

```
INBOUND:
Caller → Twilio → Vapi → Deepgram Nova-2 (STT) → Claude Haiku/Sonnet (LLM) → Deepgram Aura-2 (TTS) → Twilio → Caller
                            ↓
                  Recall Touch backend (webhooks → lead capture → follow-up triggers → outbound engine)

OUTBOUND:
Recall Touch backend → Vapi createOutboundCall → Twilio → Callee
                            ↓
                  Deepgram Nova-2 (STT) → Claude Haiku/Sonnet (LLM) → Deepgram Aura-2 (TTS)
                            ↓
                  Call outcome → next workflow step / campaign update / analytics
```

**Phase 1 Cost per voice minute:** $0.099/min
- Deepgram Aura-2 TTS: $0.022/min (default) | ElevenLabs: $0.050/min (premium add-on)
- Deepgram Nova-2 STT: $0.004/min
- Claude Haiku 4.5: $0.009/min (routine, 80%) | Claude Sonnet: $0.030/min (complex, 20%)
- Blended LLM: $0.013/min
- Vapi orchestration: $0.050/min
- Twilio telephony: $0.014/min

**Phase 2 Target (Month 3):** $0.058/min — Replace Vapi with Pipecat ($0.005/min hosting)

---

## PART 1: EXECUTION ORDER

Complete each phase fully before moving to the next. The order is non-negotiable.

**Phase 1:** Trust Cleanup (remove all fabricated content)
**Phase 2:** Design System (new visual language)
**Phase 3:** Onboarding Redesign (5-step wizard + industry packs)
**Phase 4:** Dashboard Redesign (revenue impact + needs attention + outbound activity)
**Phase 5:** Inbound Call Management (list + detail + transcript)
**Phase 6:** Follow-Up Engine (THE core differentiator — workflows + scheduler + triggers)
**Phase 7:** Outbound Engine (campaigns + power dialer + outbound sequences + outbound analytics)
**Phase 8:** Inbox Redesign (contact timeline split view)
**Phase 9:** Voice Selector (voice preview + configuration)
**Phase 10:** Billing & Usage Page
**Phase 11:** Homepage Redesign (10-section light-mode marketing page)
**Phase 12:** Settings Pages (AI Agent, Phone, Team, Outbound)
**Phase 13:** Analytics & Revenue Attribution

---

## PHASE 1: TRUST CLEANUP

This is the single most important phase. Everything else is meaningless if the site contains fabricated content. Do this FIRST.

### 1.1 Delete All Fabricated Testimonials

**File: `src/components/sections/TestimonialsSection.tsx`**

Replace the entire file content with:

```tsx
"use client";

import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";

export function TestimonialsSection() {
  return (
    <section className="marketing-section py-20 md:py-28" style={{ background: "var(--bg-primary, #FAFAF8)" }}>
      <Container>
        <AnimateOnScroll className="text-center">
          <SectionLabel>Early Access</SectionLabel>
          <h2
            className="font-bold max-w-2xl mx-auto"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              color: "var(--text-primary, #1A1A1A)",
            }}
          >
            Now accepting early customers
          </h2>
          <p
            className="text-base mt-3 max-w-lg mx-auto"
            style={{ color: "var(--text-secondary, #4A4A4A)" }}
          >
            We're onboarding service businesses one at a time to ensure every
            customer gets an exceptional experience. Start your 14-day free trial.
          </p>
          <a
            href="/activate"
            className="inline-flex mt-6 px-6 py-3 rounded-lg font-medium text-white transition-colors"
            style={{ background: "var(--accent-primary, #0D6E6E)" }}
          >
            Try it free for 14 days
          </a>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
```

**Files: All i18n JSON files** — Search and remove all fabricated names and testimonials.

### 1.2 Remove "500+" Customer Count Claims

Search the ENTIRE codebase for these patterns and remove or replace:
- `500+` (when referring to customers/businesses)
- `"Trusted by 500"` → Replace with nothing or "No credit card required · Cancel anytime"
- `$2.1M` and `2.1M` → Remove
- `revenue recovered` (when used as a marketing claim without data) → Remove
- `"Join 500+"` → Remove

**Specific files:**
- `src/components/sections/Hero.tsx` — Remove `500+ service businesses` span
- `src/components/sections/HomepageTrustBar.tsx` — Replace with: `Set up in 5 minutes · Works with your existing number · 14-day free trial`
- `src/components/PricingContent.tsx` — Remove "Trusted by 500+" line
- `src/app/demo/voice/page.tsx` — Remove all "500+" and "Join 500+" text

### 1.3 Fix SOC 2 Claims

Search entire codebase for `"SOC 2"`. Change all badge/certification displays to `"SOC 2 in progress"`. Remove `99.9% Uptime` from all locations until real monitoring exists.

### 1.4 Fix Navigation Links

**File: `src/lib/constants.ts`** — Replace `NAV_LINKS`:

```typescript
export const NAV_LINKS = [
  { href: ROUTES.PRODUCT, labelKey: "product" },
  { href: ROUTES.PRICING, labelKey: "pricing" },
  { href: ROUTES.DEMO, labelKey: "demo" },
] as const;
```

Remove "Docs" from main navigation. Docs moves to footer only.

### 1.5 Update Pricing Tiers

**File: `src/lib/constants.ts`** — Replace the entire `PRICING_TIERS` array:

```typescript
export const PRICING_TIERS = [
  {
    name: "Solo",
    priceMonthly: "$49",
    priceAnnual: "$39",
    period: "/mo",
    description: "For solo operators who need every call answered and every follow-up sent.",
    features: [
      "1 AI agent",
      "100 voice minutes/month",
      "10 active follow-ups",
      "Appointment booking",
      "Missed call recovery",
      "Call transcripts",
      "SMS follow-up",
      "Basic analytics",
    ],
    cta: "Try it free for 14 days",
    href: "/activate",
    popular: false,
  },
  {
    name: "Business",
    priceMonthly: "$297",
    priceAnnual: "$247",
    period: "/mo",
    description: "The complete revenue recovery system for service businesses.",
    features: [
      "3 AI agents",
      "500 voice minutes/month",
      "Unlimited follow-ups",
      "No-show recovery",
      "Outbound campaigns",
      "Reactivation sequences",
      "Industry templates",
      "SMS + email + voice follow-up",
      "Revenue analytics",
      "CRM webhook",
      "5 team seats",
    ],
    cta: "Try it free for 14 days",
    href: "/activate",
    popular: true,
  },
  {
    name: "Scale",
    priceMonthly: "$997",
    priceAnnual: "$847",
    period: "/mo",
    description: "For teams, high volume, multi-location, and agencies.",
    features: [
      "10 AI agents",
      "3,000 voice minutes/month",
      "Unlimited team seats",
      "Power dialer",
      "Advanced outbound campaigns",
      "Advanced analytics + benchmarks",
      "Custom workflows",
      "API access",
      "Native CRM sync",
      "Premium voice pack",
      "Priority support",
    ],
    cta: "Try it free for 14 days",
    href: "/activate",
    popular: false,
  },
  {
    name: "Enterprise",
    priceMonthly: "Custom",
    priceAnnual: "Custom",
    period: "",
    description: "White-label, SSO, custom compliance, dedicated manager, SLA.",
    features: [
      "White label",
      "Custom compliance",
      "SSO",
      "Dedicated success manager",
      "SLA",
    ],
    cta: "Talk to sales",
    href: "/contact",
    popular: false,
  },
] as const;
```

### 1.6 Update Billing Plans

**File: `src/lib/billing-plans.ts`** — Replace the ENTIRE file:

```typescript
export type PlanSlug = "solo" | "business" | "scale" | "enterprise";

export interface BillingPlan {
  slug: PlanSlug;
  label: string;
  description: string;
  monthlyPrice: number; // cents
  annualPrice: number; // cents
  includedMinutes: number;
  overageRateCents: number;
  maxAgents: number;
  maxSeats: number;
  maxPhoneNumbers: number;
  outboundDailyLimit: number; // max outbound calls per day
  smsMonthlyCap: number; // max SMS per month
  features: {
    appointmentBooking: boolean;
    missedCallRecovery: boolean;
    noShowRecovery: boolean;
    reactivationCampaigns: boolean;
    outboundCampaigns: boolean;
    outboundPowerDialer: boolean;
    industryTemplates: boolean;
    smsEmail: boolean;
    voiceFollowUp: boolean;
    revenueAnalytics: boolean;
    advancedAnalytics: boolean;
    crmWebhook: boolean;
    nativeCrmSync: boolean;
    apiAccess: boolean;
    premiumVoices: boolean;
    prioritySupport: boolean;
    whiteLabel: boolean;
    sso: boolean;
  };
}

export const BILLING_PLANS: Record<PlanSlug, BillingPlan> = {
  solo: {
    slug: "solo",
    label: "Solo",
    description: "For solo operators",
    monthlyPrice: 4900,
    annualPrice: 3900,
    includedMinutes: 100,
    overageRateCents: 30,
    maxAgents: 1,
    maxSeats: 1,
    maxPhoneNumbers: 1,
    outboundDailyLimit: 10,
    smsMonthlyCap: 500,
    features: {
      appointmentBooking: true,
      missedCallRecovery: true,
      noShowRecovery: false,
      reactivationCampaigns: false,
      outboundCampaigns: false,
      outboundPowerDialer: false,
      industryTemplates: false,
      smsEmail: true,
      voiceFollowUp: false,
      revenueAnalytics: false,
      advancedAnalytics: false,
      crmWebhook: false,
      nativeCrmSync: false,
      apiAccess: false,
      premiumVoices: false,
      prioritySupport: false,
      whiteLabel: false,
      sso: false,
    },
  },
  business: {
    slug: "business",
    label: "Business",
    description: "The complete revenue recovery system",
    monthlyPrice: 29700,
    annualPrice: 24700,
    includedMinutes: 500,
    overageRateCents: 20,
    maxAgents: 3,
    maxSeats: 5,
    maxPhoneNumbers: 3,
    outboundDailyLimit: 100,
    smsMonthlyCap: 2000,
    features: {
      appointmentBooking: true,
      missedCallRecovery: true,
      noShowRecovery: true,
      reactivationCampaigns: true,
      outboundCampaigns: true,
      outboundPowerDialer: false,
      industryTemplates: true,
      smsEmail: true,
      voiceFollowUp: true,
      revenueAnalytics: true,
      advancedAnalytics: false,
      crmWebhook: true,
      nativeCrmSync: false,
      apiAccess: false,
      premiumVoices: false,
      prioritySupport: false,
      whiteLabel: false,
      sso: false,
    },
  },
  scale: {
    slug: "scale",
    label: "Scale",
    description: "For teams and high volume",
    monthlyPrice: 99700,
    annualPrice: 84700,
    includedMinutes: 3000,
    overageRateCents: 12,
    maxAgents: 10,
    maxSeats: -1,
    maxPhoneNumbers: 10,
    outboundDailyLimit: 500,
    smsMonthlyCap: 10000,
    features: {
      appointmentBooking: true,
      missedCallRecovery: true,
      noShowRecovery: true,
      reactivationCampaigns: true,
      outboundCampaigns: true,
      outboundPowerDialer: true,
      industryTemplates: true,
      smsEmail: true,
      voiceFollowUp: true,
      revenueAnalytics: true,
      advancedAnalytics: true,
      crmWebhook: true,
      nativeCrmSync: true,
      apiAccess: true,
      premiumVoices: true,
      prioritySupport: true,
      whiteLabel: false,
      sso: false,
    },
  },
  enterprise: {
    slug: "enterprise",
    label: "Enterprise",
    description: "Custom",
    monthlyPrice: 0,
    annualPrice: 0,
    includedMinutes: 0,
    overageRateCents: 0,
    maxAgents: -1,
    maxSeats: -1,
    maxPhoneNumbers: -1,
    outboundDailyLimit: -1,
    smsMonthlyCap: -1,
    features: {
      appointmentBooking: true,
      missedCallRecovery: true,
      noShowRecovery: true,
      reactivationCampaigns: true,
      outboundCampaigns: true,
      outboundPowerDialer: true,
      industryTemplates: true,
      smsEmail: true,
      voiceFollowUp: true,
      revenueAnalytics: true,
      advancedAnalytics: true,
      crmWebhook: true,
      nativeCrmSync: true,
      apiAccess: true,
      premiumVoices: true,
      prioritySupport: true,
      whiteLabel: true,
      sso: true,
    },
  },
};

export const DEFAULT_PLAN: PlanSlug = "business";
```

### 1.7 Remove Engineering Vocabulary From UI

Search the ENTIRE codebase for these strings in user-facing components and remove or replace with business language:
- "capsule data" → remove from UI entirely
- "retention intercept" → remove
- "reversion states" → remove
- "handoff" (operational) → "transfer" or "escalation"
- "delivery assurance" → remove
- "governance" → remove from UI
- "intelligence engine" → "AI settings"
- "operational realization" → remove
- "exposure engine" → remove
- "economic gravity" → remove
- "network formation" → remove
- "channel escalation" → "call transfer" or "routing"

Backend code for these systems can remain; NO user-facing component should reference them.

---

## PHASE 2: DESIGN SYSTEM

### 2.1 Create Design Tokens

**Create file: `src/lib/design-tokens.ts`**

```typescript
export const colors = {
  background: '#FAFAF8',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F5F0',
  text: {
    primary: '#1A1A1A',
    secondary: '#4A4A4A',
    tertiary: '#8A8A8A',
    inverse: '#FFFFFF',
  },
  accent: {
    teal: '#0D6E6E',
    tealHover: '#0A5A5A',
    tealLight: '#E6F2F2',
    tealMuted: '#B8D8D8',
    amber: '#D4A853',
    amberLight: '#FDF5E6',
  },
  status: {
    success: '#16A34A',
    successLight: '#DCFCE7',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    error: '#DC2626',
    errorLight: '#FEE2E2',
    info: '#2563EB',
    infoLight: '#DBEAFE',
  },
  border: {
    default: '#E5E5E0',
    hover: '#D4D4CF',
    focus: '#0D6E6E',
  },
} as const;

export const typography = {
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  heading: {
    h1: { size: 'clamp(2rem, 4vw, 3.5rem)', weight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 },
    h2: { size: 'clamp(1.75rem, 3.5vw, 2.75rem)', weight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
    h3: { size: 'clamp(1.25rem, 2vw, 1.75rem)', weight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 },
    h4: { size: '1.125rem', weight: 600, letterSpacing: '0', lineHeight: 1.4 },
  },
  body: { size: '1rem', weight: 400, lineHeight: 1.6 },
  small: { size: '0.875rem', weight: 400, lineHeight: 1.5 },
  caption: { size: '0.75rem', weight: 500, lineHeight: 1.4 },
} as const;

export const spacing = {
  sectionPadding: { desktop: '80px 0', mobile: '48px 0' },
  contentMaxWidth: '1200px',
  cardPadding: '24px',
  cardRadius: '12px',
  buttonRadius: '8px',
  inputRadius: '8px',
} as const;
```

### 2.2 Update Tailwind Config

Add custom colors to `tailwind.config.ts`:
```
rt-bg: #FAFAF8, rt-surface: #FFFFFF, rt-surface-alt: #F5F5F0,
rt-text-primary: #1A1A1A, rt-text-secondary: #4A4A4A, rt-text-tertiary: #8A8A8A,
rt-teal: #0D6E6E, rt-teal-hover: #0A5A5A, rt-teal-light: #E6F2F2,
rt-amber: #D4A853, rt-amber-light: #FDF5E6,
rt-success: #16A34A, rt-warning: #D97706, rt-error: #DC2626, rt-info: #2563EB,
rt-border: #E5E5E0
```

### 2.3 Light Mode Marketing Site

All marketing pages MUST use:
- Background: `#FAFAF8` (warm white)
- Cards: `#FFFFFF` with `1px solid #E5E5E0` border
- Text: `#1A1A1A` headings, `#4A4A4A` body
- Accent: `#0D6E6E` (teal) for buttons, links, highlights
- NO dark backgrounds, NO gradient hero sections, NO purple/blue-purple accents

---

## PHASE 3: ONBOARDING REDESIGN

Replace ALL current onboarding flows with a single 5-step wizard at `/activate`.

### 3.1 Create Industry Packs

**Create directory: `src/lib/industry-packs/`**

**Create: `src/lib/industry-packs/types.ts`**

```typescript
export interface IndustryPack {
  id: string;
  name: string;
  icon: string;
  greeting: string;
  avgJobValue: number;
  appointmentTypes: { name: string; duration: number }[];
  knowledgeBase: {
    commonQuestions: { q: string; a: string }[];
    services: string[];
  };
  /** Inbound follow-up workflows triggered by call outcomes */
  inboundWorkflows: {
    name: string;
    trigger: 'missed_call' | 'appointment_booked' | 'no_show' | 'quote_sent' | 'days_inactive';
    triggerConfig?: Record<string, unknown>;
    steps: {
      channel: 'sms' | 'call' | 'email';
      delay: number;
      condition?: 'if_no_reply';
      template?: string;
      script?: string;
    }[];
  }[];
  /** Outbound campaign templates for proactive revenue recovery */
  outboundCampaigns: {
    name: string;
    type: 'reactivation' | 'no_show_recovery' | 'quote_chase' | 'review_request' | 'appointment_reminder';
    description: string;
    targetFilter: {
      days_not_contacted?: number;
      statuses?: string[];
      min_score?: number;
    };
    sequence: {
      channel: 'sms' | 'call' | 'email';
      delay: number;
      template: string;
    }[];
  }[];
}
```

**Create: `src/lib/industry-packs/dental.ts`**

```typescript
import type { IndustryPack } from './types';

export const dentalPack: IndustryPack = {
  id: 'dental',
  name: 'Dental Practice',
  icon: 'Heart',
  greeting: "Thank you for calling {business_name}, how can I help you today?",
  avgJobValue: 3200,
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
      { q: "What are your hours?", a: "Our office hours are {business_hours}. Would you like to schedule an appointment?" },
      { q: "Do you accept new patients?", a: "Absolutely! We'd love to welcome you. Would you like to schedule your first visit?" },
      { q: "How much does a cleaning cost?", a: "Cleaning costs depend on your insurance coverage. I can help schedule you and our office will verify your benefits beforehand." },
      { q: "I have a dental emergency", a: "I'm sorry to hear that. Let me check our earliest available emergency appointment for you right away." },
    ],
    services: ['Cleaning', 'Exam', 'X-ray', 'Crown', 'Root canal', 'Extraction', 'Whitening', 'Invisalign', 'Implant', 'Emergency'],
  },
  inboundWorkflows: [
    {
      name: 'Missed Call Recovery',
      trigger: 'missed_call',
      steps: [
        { channel: 'sms', delay: 300, template: "Hi {name}, we missed your call at {business_name}. Would you like to schedule an appointment? Reply YES or call us back at {business_phone}." },
        { channel: 'sms', delay: 14400, condition: 'if_no_reply', template: "Hi {name}, just following up from {business_name}. We have appointments available this week. Would any of these work? {available_times}" },
        { channel: 'call', delay: 86400, condition: 'if_no_reply', script: "Hi {name}, this is {business_name} following up on your call yesterday. We wanted to make sure we could help you with your dental needs. Do you have a moment to schedule?" },
      ],
    },
    {
      name: 'Appointment Reminder',
      trigger: 'appointment_booked',
      steps: [
        { channel: 'sms', delay: -86400, template: "Reminder: You have a {appointment_type} appointment at {business_name} tomorrow at {appointment_time}. Reply C to confirm or R to reschedule." },
        { channel: 'sms', delay: -3600, template: "Your appointment at {business_name} is in 1 hour at {appointment_time}. See you soon!" },
      ],
    },
    {
      name: 'No-Show Recovery',
      trigger: 'no_show',
      steps: [
        { channel: 'sms', delay: 1800, template: "Hi {name}, we missed you at your appointment today at {business_name}. Would you like to reschedule? We have openings this week." },
        { channel: 'call', delay: 14400, condition: 'if_no_reply', script: "Hi {name}, this is {business_name}. We noticed you couldn't make it to your appointment today. We'd love to get you rescheduled. Do you have a moment to pick a new time?" },
        { channel: 'sms', delay: 86400, condition: 'if_no_reply', template: "Hi {name}, just one more follow-up from {business_name}. Here's a link to self-schedule at your convenience: {booking_link}" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: '6-Month Reactivation',
      type: 'reactivation',
      description: 'Re-engage patients who haven\'t visited in 6+ months for their cleaning',
      targetFilter: { days_not_contacted: 180, statuses: ['completed', 'inactive'] },
      sequence: [
        { channel: 'sms', delay: 0, template: "Hi {name}, it's been a while since your last visit to {business_name}. It's time for your 6-month cleaning! Book here: {booking_link}" },
        { channel: 'call', delay: 259200, template: "Hi {name}, this is {business_name} calling to remind you it's time for your dental cleaning. We have openings this week. Can I book you in?" },
        { channel: 'sms', delay: 604800, template: "Last reminder, {name} — your dental health matters. {business_name} has availability this week. Schedule your cleaning: {booking_link}" },
      ],
    },
    {
      name: 'Quote Follow-Up',
      type: 'quote_chase',
      description: 'Follow up on treatment plans that haven\'t been accepted',
      targetFilter: { statuses: ['quote_sent'], days_not_contacted: 3 },
      sequence: [
        { channel: 'sms', delay: 0, template: "Hi {name}, just following up on the treatment plan we discussed. Any questions about the {service_type}? We're happy to help." },
        { channel: 'sms', delay: 172800, template: "Hi {name}, we want to make sure you have all the info you need about your {service_type}. Would you like to schedule?" },
        { channel: 'call', delay: 432000, template: "Hi {name}, this is {business_name}. I'm calling about the treatment plan we put together for you. Do you have a moment to discuss?" },
      ],
    },
    {
      name: 'Post-Visit Review Request',
      type: 'review_request',
      description: 'Ask for Google review after completed appointment',
      targetFilter: { statuses: ['completed'] },
      sequence: [
        { channel: 'sms', delay: 7200, template: "Thanks for visiting {business_name} today, {name}! If you had a great experience, we'd appreciate a quick review: {review_link}" },
      ],
    },
  ],
};
```

**Create similar packs for: `legal.ts`, `hvac.ts`, `medspa.ts`, `roofing.ts`, `general.ts`**

Each pack must include industry-specific greeting, FAQ, services, inbound workflows (missed call recovery, reminders, no-show recovery), and outbound campaigns (reactivation, quote chase, review request) with industry-appropriate messaging and job values.

**Create: `src/lib/industry-packs/index.ts`**

```typescript
import { dentalPack } from './dental';
import { legalPack } from './legal';
import { hvacPack } from './hvac';
import { medspaPack } from './medspa';
import { roofingPack } from './roofing';
import { generalPack } from './general';
import type { IndustryPack } from './types';

export const INDUSTRY_PACKS: Record<string, IndustryPack> = {
  dental: dentalPack,
  legal: legalPack,
  hvac: hvacPack,
  medspa: medspaPack,
  roofing: roofingPack,
  general: generalPack,
};

export type { IndustryPack } from './types';
```

### 3.2 Onboarding Wizard (Single Path: /activate)

**Create: `src/app/activate/page.tsx`**

5-step wizard. Each step is a full-screen centered card with progress indicator at top.

**Step 1:** "What best describes you?" → Solo / Service Business / Agency
**Step 2:** Business name + Industry + Location
**Step 3:** Phone number (provision via Twilio or forward existing)
**Step 4:** AI greeting (pre-filled from industry pack) + voice preview + business hours
**Step 5:** Calendar connect (Google/Outlook) + "You're live!" celebration

**On completion, auto-provision:**
1. Create workspace with industry pack
2. Provision Twilio phone number
3. Create Vapi assistant with industry settings
4. Deploy inbound workflows (missed call recovery, reminders, no-show recovery)
5. Deploy outbound campaign templates in DRAFT status
6. Set trial_ends_at = 14 days
7. Seed analytics_daily

### 3.3 Delete Old Onboarding

Redirect `/onboard/*`, `/app/onboarding`, `/dashboard/onboarding`, `/setup`, `/solo`, `/life`, `/org`, `/connect` → `/activate`. Delete `/declare`, `/example`.

---

## PHASE 4: DASHBOARD REDESIGN

### 4.1 Unified Dashboard (`/app/dashboard`)

Must answer three questions in 3 seconds: "How much did I recover?", "What needs attention?", "What is my AI doing?"

**Layout:**

```
┌──────────────────────────────────────────────────────────────────┐
│  Revenue Recovered This Month: $4,217 ↑12%                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Calls    │ │ Booked   │ │ Follow-  │ │ Minutes  │           │
│  │ Answered │ │ Appts    │ │ Ups Sent │ │ Used     │           │
│  │ 47       │ │ 12       │ │ 83       │ │ 234/500  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
├──────────────────────────────────┬───────────────────────────────┤
│  Needs Attention (7)             │  Today's Activity             │
│  • John M. — new lead, 2h ago   │  10:23a AI answered Sarah K.  │
│    [Call] [Text] [Dismiss]       │  → booked cleaning at 2 PM    │
│  • Maria G. — no-show, no reply │  10:15a Outbound to Mike R.   │
│    [Call] [Text] [Dismiss]       │  → voicemail left             │
│  • Robert K. — quote 3d ago     │  10:02a Follow-up SMS to      │
│    [Call] [Text] [Dismiss]       │  David L. — quote chase #2    │
├──────────────────────────────────┴───────────────────────────────┤
│  Active Outbound Campaigns                                       │
│  ┌──────────────────────┐ ┌──────────────────────┐              │
│  │ 6-Month Reactivation │ │ No-Show Recovery     │              │
│  │ 45 enrolled, 5 book  │ │ 8 enrolled, 2 rebook │              │
│  │ [Pause] [View]       │ │ [Pause] [View]       │              │
│  └──────────────────────┘ └──────────────────────┘              │
└──────────────────────────────────────────────────────────────────┘
```

**Hero metric:** `SELECT SUM(estimated_revenue_cents) FROM bookings WHERE workspace_id = ? AND created_at >= period_start`

**Needs Attention:** Contacts where status = 'new' AND no outbound in 2h, OR no_show AND no reply in 4h, OR quote_sent AND no contact in 3d. Each item: name, reason, quick actions (Call triggers POST /api/outbound/call, Text opens SMS compose).

**Activity Feed:** Real-time via Supabase Realtime on call_sessions, messages, workflow_enrollments. Shows BOTH inbound and outbound events.

**Campaign Cards:** Active campaigns with enrollment/booking counts. "Create Campaign" link if none active.

### 4.2 Sidebar Navigation

```
Dashboard
─────────
Calls → /app/calls
Contacts → /app/contacts
Inbox → /app/inbox
Calendar → /app/calendar
─────────
Follow-Ups → /app/follow-ups
Campaigns → /app/campaigns
─────────
Analytics → /app/analytics
─────────
Settings → /app/settings
```

---

## PHASE 5: INBOUND CALL MANAGEMENT

### 5.1 Calls List (`/app/calls`)

Filterable table: Direction (↓/↑), Contact, Phone, Duration, Outcome, Agent, Timestamp. Filters: direction, outcome, date range, agent. Click row → detail.

### 5.2 Call Detail (`/app/calls/[id]`)

Left 2/3: audio player + transcript with timestamps. Right 1/3: contact card, call metadata (direction, duration, cost, campaign_id if outbound), captured data, quick actions (Call back, SMS, Add to workflow, Book).

---

## PHASE 6: FOLLOW-UP ENGINE

The heart of Recall Touch. Automates multi-step sequences triggered by call outcomes.

### 6.1 Database Schema

Already in `supabase/migrations/20260317_follow_up_engine.sql`. Tables: workflows, workflow_enrollments, usage_events, analytics_daily. Verify they match the schema in the "Core Data Model" section below.

### 6.2 Workflow Scheduler

Already in `src/lib/workflows/scheduler.ts`. Must handle: enrollment on trigger, cron step execution, SMS/email/voice channels, stop conditions (reply, book, opt-out), template rendering ({name}, {business_name}, {booking_link}, etc.), usage event tracking.

### 6.3 Follow-Ups UI (`/app/follow-ups`)

Two tabs: "Active" (contacts in workflows) and "Templates" (workflow definitions). Workflow Builder: name → trigger → steps (channel + delay + condition + template) → activate.

---

## PHASE 7: OUTBOUND ENGINE (FULL SPECIFICATION)

### 7.1 Architecture

```
TRIGGERS → SAFETY LAYER → CHANNELS → TRACKING

Triggers: workflow step, campaign batch, manual click, cron, API
Safety: suppression, rate limits, TCPA, business hours, circuit breaker
Channels: voice (Vapi/Pipecat), SMS (Twilio), email (SES/Resend)
Tracking: campaign analytics, usage events, outbound events log, revenue attribution
```

### 7.2 Outbound Call Execution

Already in `src/lib/outbound/execute-lead-call.ts`. Flow: validate → suppression check → rate limit check → business hours check → build campaign prompt → create assistant → insert call_session (direction='outbound') → initiate call → handle voicemail → update outcome → create usage_event → update analytics_daily.

### 7.3 Campaign Types

| Type | Description | Trigger |
|------|------------|---------|
| `lead_followup` | Follow up new leads | Auto (speed-to-lead) or manual |
| `lead_qualification` | Qualify leads via call | Manual/campaign |
| `appointment_reminder` | Remind appointments | Cron (24h + 1h before) |
| `appointment_setting` | Proactively book | Campaign batch |
| `no_show_recovery` | Recover no-shows | Trigger: no_show flag |
| `reactivation` | Re-engage cold leads | Campaign batch |
| `quote_chase` | Chase sent quotes | Trigger: quote_sent + 3d |
| `review_request` | Post-visit review | Trigger: appointment completed |
| `cold_outreach` | New prospect outreach (Scale+) | Campaign batch |
| `custom` | User-defined | Manual |

### 7.4 Campaign Builder UI (`/app/campaigns`)

**Campaign List:** table with name, type, status, contacts, calls, connected, booked, created. Status badges: draft=gray, active=green, paused=amber, completed=blue.

**Create Campaign (`/app/campaigns/create`):** 5-step wizard:

1. **Type** — Select campaign type card
2. **Audience** — Target filter builder: contact status, last contacted days, lead score, source, tags. Preview count + first 10 contacts.
3. **Sequence** — Build steps: channel + delay + condition + template. Pre-filled from type template. Voice calls show AI script. SMS shows template with variable preview. Timeline visualization.
4. **Schedule** — Start immediately or schedule. Business hours enforcement toggle. Daily limit. Stop conditions. Voicemail handling.
5. **Review** — Summary of all settings. "Save Draft" and "Launch" buttons. Cost estimate warning for large audiences.

### 7.5 Campaign Detail (`/app/campaigns/[id]`)

Header: name, type, status, actions (pause/resume/edit/duplicate). Metrics cards: enrolled, calls made, connected, responded, booked, revenue, cost. Funnel visualization. Contact list with per-contact status and outcomes.

### 7.6 Power Dialer (`/app/campaigns/dialer` — Scale+ Only)

Focused calling interface: current call panel (contact info, campaign, status, AI script, hang up/transfer), queue panel (next contacts with skip/remove/call now), call notes + disposition (booked/callback/not interested/VM), auto-advance to next call. Session stats: calls, connected, booked.

### 7.7 Safety Layer

Enforced on EVERY outbound action:
1. **Suppression:** `shouldSuppressOutbound()` — no duplicate within cooldown (24h calls, 4h SMS)
2. **Rate limit:** workspace tier outboundDailyLimit check
3. **Business hours:** workspace outbound_hours config. SMS: 8am-9pm local.
4. **TCPA:** opt_out flag, STOP keyword handling, opt-out footer on all SMS
5. **Circuit breaker:** >20% error rate in last hour → pause + alert

### 7.8 Speed-to-Lead

Cron every 60s: find new inbound calls with interested/callback outcome, no follow-up within 5min → send immediate SMS → schedule AI callback at 5min → enroll in workflow → update analytics.

### 7.9 Pre-Built Campaign Templates

Deployed during onboarding from industry packs:

1. **No-Show Recovery:** 30min SMS → 4h AI Call → 24h SMS with booking link
2. **Lead Reactivation:** Day 0 SMS → Day 3 AI Call → Day 7 SMS
3. **Quote Chase:** Day 3 SMS → Day 5 SMS → Day 7 AI Call
4. **Appointment Reminders:** -24h SMS (confirm/reschedule) → -1h SMS
5. **Review Request:** 2h post-completion SMS with review link
6. **Cold Outreach (Scale+):** AI Call → Day 1 SMS → Day 3 Email

### 7.10 Outbound Analytics

In Analytics page → "Outbound" tab: total outbound calls, connection rate, booking rate, revenue from outbound, cost, ROI. Charts: calls by day (stacked by outcome), campaign comparison, channel mix, best time-of-day heatmap.

---

## PHASE 8: INBOX REDESIGN

Two-panel: contact list (left 1/3), unified conversation thread (right 2/3). Thread shows SMS, call transcripts (collapsible), emails, workflow actions. Compose bar with channel selector.

---

## PHASE 9: VOICE SELECTOR

Voice settings: agent config, voice grid with play buttons (standard: Deepgram Aura-2, premium: ElevenLabs), call behavior (max duration, silence timeout, transfer number, recording disclosure), outbound voice settings (calling hours, voicemail detection, voicemail template).

---

## PHASE 10: BILLING & USAGE

Current plan card + usage meters (voice minutes, SMS, outbound calls/day, seats) + current period charges (base + overage) + invoice history. Both inbound and outbound minutes from same pool. Show inbound vs outbound breakdown in usage details.

---

## PHASE 11: HOMEPAGE (10 SECTIONS)

1. **Hero:** "Stop Losing Revenue to Missed Calls and Broken Follow-Up" + dashboard mockup + dual CTA + trust bar
2. **Problem:** 4 pain cards (missed calls, slow follow-up, no-shows, dead leads)
3. **How It Works:** Full recovery loop visualization (inbound + outbound)
4. **ROI Calculator:** Sliders for calls, job value, miss rate → revenue leak estimate
5. **Industries:** 5 cards (dental, legal, HVAC, med spa, roofing)
6. **Differentiation:** "Not just an AI receptionist" — side-by-side with outbound features highlighted
7. **Proof:** Early access messaging (replace with real customer data when available)
8. **Pricing:** 3 tiers with outbound features on Business+
9. **FAQ:** 8 questions including "Can the AI make outbound calls?" and "How is this different?"
10. **Final CTA:** Urgency headline + free trial CTA + trust bar

---

## PHASE 12: SETTINGS

Settings structure: Business Info, Phone Numbers, AI Voice, **Outbound Settings** (calling hours, daily limit, voicemail behavior, voicemail template, caller ID, TCPA opt-out management, suppression cooldown), Follow-Up Settings (stop conditions, SMS footer, email sender, send window), Team, Integrations, Billing, Notifications.

---

## PHASE 13: ANALYTICS & REVENUE ATTRIBUTION

Three tabs: Overview | Inbound | Outbound. Revenue attribution: every booking records `attribution_source` (inbound / outbound_call / follow_up_sms / follow_up_email / reactivation / manual / self_book). Dashboard revenue = SUM(bookings.estimated_revenue_cents) for period.

---

## CORE DATA MODEL

```sql
workspaces (id, name, industry, billing_tier, billing_period_start/end, stripe_customer_id, stripe_subscription_id, trial_ends_at, mode, business_hours, outbound_hours, outbound_daily_limit, voicemail_behavior, voicemail_template, suppression_cooldown_hours, created_at)

agents (id, workspace_id FK, name, vapi_assistant_id, system_prompt, greeting, voice_id, voice_provider, language, max_duration_seconds, is_active, created_at)

contacts (id, workspace_id FK, name, phone, email, status, lead_score, source, tags, last_activity_at, opt_out, opt_out_at, assigned_to, metadata, created_at)

call_sessions (id, workspace_id FK, agent_id FK, contact_id FK, direction, phone_number, vapi_call_id, status, outcome, duration_seconds, transcript, recording_url, cost_cents, campaign_id FK, campaign_type, voicemail_detected, voicemail_left, call_started_at, call_ended_at, created_at)

messages (id, workspace_id FK, contact_id FK, channel, direction, from_number, to_number, body, status, workflow_enrollment_id FK, campaign_id FK, cost_cents, created_at)

bookings (id, workspace_id FK, contact_id FK, appointment_type, scheduled_at, duration_minutes, status, confirmation_sent, reminder_24h_sent, reminder_1h_sent, attribution_source, estimated_revenue_cents, calendar_event_id, notes, created_at)

campaigns (id, workspace_id FK, agent_id FK, name, type, status, target_filter JSONB, sequence JSONB, schedule JSONB, voicemail_behavior, voicemail_template, stop_conditions JSONB, total_contacts, called, connected, responded, appointments_booked, revenue_recovered_cents, cost_cents, created_at, launched_at, completed_at)

workflows (id, workspace_id FK, name, trigger, trigger_config JSONB, is_active, steps JSONB, industry_pack, created_at, updated_at)

workflow_enrollments (id, workflow_id FK, contact_id FK, workspace_id FK, current_step, status, stop_reason, enrolled_at, next_step_due_at, completed_at, last_step_executed_at)

usage_events (id, workspace_id FK, event_type, quantity, cost_cents, metadata JSONB, created_at)

analytics_daily (id, workspace_id FK, date, calls_inbound, calls_outbound, calls_answered, calls_missed, appointments_booked, no_shows, no_shows_recovered, follow_ups_sent, follow_ups_replied, sms_sent, emails_sent, outbound_calls_made, outbound_calls_connected, revenue_recovered_cents, voice_minutes_used, UNIQUE(workspace_id, date))

voice_usage (id, workspace_id FK, voice_id, audio_duration_ms, cost_cents, call_session_id FK, tts_model, direction, created_at)

outbound_suppression (id, workspace_id FK, counterparty_identifier, suppression_key, suppressed_until, created_at, UNIQUE(workspace_id, counterparty_identifier, suppression_key))

outbound_events_log (id, workspace_id FK, event_type, payload JSONB, webhook_url, status, attempts, last_attempt_at, created_at)

follow_up_sequences (id, workspace_id FK, ...) — legacy, kept for compat
sequence_steps, sequence_enrollments — legacy
team_members (id, workspace_id FK, user_id FK, role, invited_at, accepted_at)
integrations (id, workspace_id FK, type, credentials JSONB, is_active, last_sync_at, created_at)
```

---

## API ROUTES

### Existing (verify):
```
POST /api/outbound/call, GET/POST /api/campaigns, PATCH /api/campaigns/[id], POST /api/campaigns/[id]/launch
GET/POST/PATCH/DELETE /api/sequences/[id], POST /api/sequences/[id]/enroll, GET/POST/PUT /api/sequences/[id]/steps
```

### New:
```
GET /api/campaigns/[id] — detail + metrics
POST /api/campaigns/[id]/pause, POST /api/campaigns/[id]/resume
GET /api/campaigns/[id]/contacts — enrolled contacts with status
POST /api/campaigns/[id]/contacts — add contacts manually
GET /api/analytics/overview, GET /api/analytics/inbound, GET /api/analytics/outbound, GET /api/analytics/revenue
GET/PATCH /api/contacts/[id], POST /api/contacts/[id]/call, POST /api/contacts/[id]/sms, POST /api/contacts/[id]/enroll
GET/POST /api/bookings, PATCH /api/bookings/[id]
GET /api/inbox, GET /api/inbox/[contactId]
GET /api/dashboard/needs-attention, POST /api/dashboard/dismiss, GET /api/dashboard/activity-feed
GET/PUT /api/settings/outbound, GET /api/settings/opt-outs, DELETE /api/settings/opt-outs/[phone]
```

### Cron:
```
/api/cron/speed-to-lead — every 60s
/api/cron/campaign-process — every 5min
/api/cron/process-sequences — every 5min
/api/cron/appointment-reminders — every 15min (NEW: send 24h + 1h reminders)
/api/cron/analytics-daily-rollup — every 1h
/api/cron/no-show-detection — every 15min (NEW: detect no-shows, trigger recovery)
```

---

## FEATURE GATES

| Feature | Solo | Business | Scale | Enterprise |
|---------|------|----------|-------|-----------|
| Inbound answering | ✓ | ✓ | ✓ | ✓ |
| SMS follow-up | ✓ | ✓ | ✓ | ✓ |
| Outbound AI calls (manual) | 10/day | 100/day | 500/day | Unlimited |
| Outbound campaigns | — | ✓ | ✓ | ✓ |
| Power dialer | — | — | ✓ | ✓ |
| No-show recovery | — | ✓ | ✓ | ✓ |
| Reactivation campaigns | — | ✓ | ✓ | ✓ |
| Quote chase | — | ✓ | ✓ | ✓ |
| Cold outreach | — | — | ✓ | ✓ |
| Voice follow-up calls | — | ✓ | ✓ | ✓ |
| A/B testing | — | — | ✓ | ✓ |

---

## VOICE COST STRATEGY

Phase 1 (current): Deepgram Aura-2 TTS + Claude Haiku default = $0.099/min
Phase 2 (month 3): Replace Vapi with Pipecat = $0.058/min
Both inbound and outbound minutes from same pool. Tier overage rates: Solo $0.30, Business $0.20, Scale $0.12.

---

## PAGES TO DELETE/HIDE/REDIRECT

Delete: `/solo`, `/life`, `/org`, `/declare`, `/example`, `/public/settlement`, `/public/ack`, `/wrapup`, `/ops/*` → admin only
Hide: governance, attestations, procurement, call intelligence (show after 100+ calls), knowledge base, lead scoring (after 50+ leads), A/B testing (Scale+), agency dashboard (Scale mode)
Redirect: all `/onboard/*`, `/app/onboarding`, `/dashboard/onboarding`, `/setup`, `/connect` → `/activate`
Consolidate: `/app/*` canonical. Redirect all `/dashboard/*`.

---

## ROLLOUT ORDER

| Week | Focus |
|------|-------|
| 1-2 | Trust cleanup, design tokens, consolidate dashboard, single onboarding, homepage to 10 sections |
| 3-4 | Revenue hero metric, needs-attention queue, call list/detail, workflow scheduler |
| 5-6 | Campaign builder, outbound call integration, campaign templates, safety layer |
| 7-8 | Inbox, contact timeline, booking integration, appointment reminders |
| 9-10 | Analytics, revenue attribution, outbound analytics tab, billing page, outbound settings |
| 11-12 | 10-section homepage, industry landing pages, power dialer (Scale) |

---

## NON-NEGOTIABLE RULES

1. Every outbound action passes safety layer. No exceptions.
2. Inbound + outbound minutes from same voice pool. Track direction separately, bill together.
3. Every SMS includes opt-out footer. Every STOP sets opt_out = true.
4. Every booking records attribution_source. Dashboard revenue must be accurate.
5. No fabricated contacts or data for demos.
6. Outbound campaigns require Business+. Solo gets manual only (10/day). Gate in API and UI.
7. Power dialer requires Scale+. Show upgrade prompt for lower tiers.
8. Industry pack templates are editable starting points, saved per-workspace.
9. Business language in UI. "Follow-up sequence" not "workflow enrollment."
10. Dashboard loads in <2 seconds. Use analytics_daily pre-aggregated table.

---

*End of Ultimate Cursor Prompt V7. Single source of truth. Build exactly as written.*
