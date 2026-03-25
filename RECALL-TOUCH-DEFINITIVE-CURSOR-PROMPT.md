# RECALL TOUCH — THE DEFINITIVE CURSOR MASTER PROMPT

You are the engineering team for Recall Touch. This is your COMPLETE specification — strategy, product, design, code, database, copy, and testing — in one document. Follow it exactly. Do not improvise. Do not add features not listed. Do not use placeholder data that looks real. Do not skip steps. Work in the exact order specified.

Read this entire document before writing a single line of code.

---

## PART 0: WHAT YOU ARE BUILDING AND WHY

### What Recall Touch Is

Recall Touch is an AI platform that answers business calls, executes follow-up sequences, books appointments, recovers no-shows, and reactivates cold leads — across voice, text, and email — automatically.

### The Category: AI Revenue Closer

NOT an AI receptionist. NOT an answering service. NOT a CRM. The AI that closes every revenue loop in a business.

**Why this category matters:** The AI receptionist market is terminally commoditized — 30+ competitors at $29-79/month (Dialzara $29, Rosie $49, My AI Front Desk $79, Goodcall $59-$199). Competing on "answer every call" is a race to the bottom. Recall Touch's real differentiator is what happens AFTER the call: automated follow-up, no-show recovery, reactivation campaigns, and revenue attribution. No competitor under $300/month offers this. That's the wedge.

### The Competitive Landscape (March 2026)

| Competitor | Price | What They Do | What They DON'T Do |
|-----------|-------|-------------|-------------------|
| Dialzara | $29-99/mo | Answer calls, take messages | No follow-up, no recovery, no booking from call |
| Rosie AI | $49-149/mo | Answer calls, CRM push, home services focus | No automated follow-up sequences |
| Goodcall | $59-249/mo | Answer calls, CRM integration, booking | No no-show recovery, no reactivation |
| My AI Front Desk | $79-149/mo | Answer calls, appointment scheduling | No follow-up engine, no revenue tracking |
| Smith.ai | $95-800/mo | Hybrid AI+human, 5000+ integrations | Human-dependent, no automated sequences |
| Upfirst | $25-99/mo | Answer calls, missed call text back | Text back only, no multi-step workflows |
| Allo | $32/user | AI scheduling, missed call text | No voice AI, no recovery campaigns |
| ServiceAgent | Usage-based | AI operations for service businesses | Newer, less proven |
| Bland AI | $0.09/min | Developer voice platform, outbound focus | Not for service businesses, no product UI |
| Synthflow | $29-1400/mo | No-code voice agent builder | Developer tool, no follow-up engine |
| Retell AI | $0.07+/min | Developer voice platform | Infrastructure, not a product |
| Vapi | $0.05+/min | Voice orchestration API | Pure infrastructure |

**Recall Touch's unfair advantage:** It's the ONLY platform under $1,000/month that combines AI call answering + multi-step automated follow-up sequences + no-show recovery + lead reactivation + revenue attribution. The price ($297/mo for Business) is justified because it replaces 3-4 separate tools.

### Entry Market

Single-location service businesses that depend on inbound calls:

1. **Dental practices** (BEST first ICP) — Highest LTV ($3,000+/patient), lowest support burden, 200K US practices, strongest case study narrative
2. **HVAC / plumbing / electrical** — $300-800/job, high call volume, pain is immediate
3. **Legal intake** (PI, family, immigration) — $5,000-50,000/case, missed intake call is catastrophic
4. **Med spa / aesthetics** — $4,500 avg treatment value, appointment-driven, high no-show rate
5. **Roofing / restoration** — $12,000+ avg job, seasonal urgency, insurance-driven

### Headline

"Your phone rings. Then what?"

### Tech Stack (Existing — Keep All)

Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, Supabase (PostgreSQL + Auth + RLS), Stripe (subscriptions + metered billing), Vapi (voice orchestration), ElevenLabs Turbo v2.5 (TTS), Deepgram Nova-2 (STT), Claude Sonnet 4 (LLM), ioredis, Framer Motion, Recharts, Lucide React icons, next-intl (i18n).

### Voice Architecture

```
Caller → Twilio (telephony) → Vapi (orchestration) → Deepgram Nova-2 (STT) → Claude Sonnet (LLM) → ElevenLabs Turbo v2.5 (TTS) → Twilio → Caller
                                       ↓
                             Recall Touch backend (webhooks, data capture, follow-up triggers, analytics)
```

**Cost per voice minute:** ~$0.13-0.17
- ElevenLabs TTS: $0.04-0.08
- Deepgram STT: $0.01-0.02
- Claude Sonnet LLM: $0.02-0.06
- Vapi orchestration: $0.05
- Twilio telephony: $0.01-0.02

---

## PART 1: EXECUTION ORDER

Complete each phase fully before moving to the next. The order is non-negotiable.

**Phase 1:** Trust Cleanup (remove all fabricated content)
**Phase 2:** Design System (new visual language)
**Phase 3:** Onboarding Redesign (3-step wizard + industry packs)
**Phase 4:** Dashboard Redesign (revenue impact, needs attention, recent calls)
**Phase 5:** Inbox Redesign (contact timeline split view)
**Phase 6:** Follow-Up Engine (THE core differentiator — database + scheduler + triggers + UI)
**Phase 7:** Voice Selector (voice preview + configuration)
**Phase 8:** Billing & Usage Page
**Phase 9:** Homepage Redesign (13-section light-mode marketing page)
**Phase 10:** /about Page
**Phase 11:** Settings Pages (AI Agent, Phone, Team)

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
            customer gets an exceptional experience. Start your 14-day free
            trial.
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

**Files: `src/i18n/messages/en.json`, `es.json`, `fr.json`, `de.json`, `pt.json`, `ja.json`**

Search ALL i18n files for every occurrence of these fabricated names and remove or replace:
- "Amanda K", "Ryan D", "Mike R", "Dr. Sarah L", "James T"
- "Sarah Chen", "Dr. Michael Rodriguez", "Jennifer Walsh", "Priya Kapoor", "Tom Brewer", "Lisa Martinez"
- "Modern HVAC Solutions", "Smile Dental Studio", "Walsh Legal Group"

Remove the entire testimonial objects. Do not replace with other fake names.

**File: `src/app/demo/voice/page.tsx`**

Remove all testimonial sections and "500+" claims from this page.

### 1.2 Remove "500+" Customer Count Claims

Search the ENTIRE codebase (`grep -r` across all `.tsx`, `.ts`, `.json` files) for these patterns and remove or replace:

- `500+` (when referring to customers/businesses)
- `"Trusted by 500"`
- `$2.1M` and `2.1M`
- `revenue recovered` (when used as a marketing claim)
- `"Join 500+"`

**Specific files to fix:**

**`src/components/sections/Hero.tsx`** — Find and remove the `<span>` containing `<strong className="text-white/70">500+</strong> service businesses</span>`. Replace with nothing — the hero should have the headline, subheadline, and CTAs only.

**`src/components/sections/HomepageTrustBar.tsx`** — Remove the "500+" stat. Replace the entire content with: `Set up in 5 minutes · Works with your existing number · 14-day free trial`

**`src/components/PricingContent.tsx`** — Remove "Trusted by 500+ service businesses · $2.1M+ revenue recovered". Replace with nothing or with "No credit card required · Cancel anytime".

**`src/app/demo/voice/page.tsx`** — Remove "Trusted by 500+" heading and "Join 500+" text.

### 1.3 Fix SOC 2 Claims

Search entire codebase for the string `"SOC 2"`. In every location:

- If displayed as a badge/certification claim → change to `"SOC 2 in progress"` or remove entirely
- **Exception:** `src/components/PricingContent.tsx` already says "SOC 2 in progress" — keep as-is

**`src/components/sections/Footer.tsx`** — Change:
```
{ label: "SOC 2", icon: "🛡️" }
```
to:
```
{ label: "256-bit encryption", icon: "🔒" }
```

Remove `99.9% Uptime` from all footer and trust badge locations until a real status page exists with monitoring data.

### 1.4 Fix Broken Navigation Links

**File: `src/lib/constants.ts`**

The `SOLUTIONS_LINKS` array currently points to `/industries/*` paths. Verify these pages actually exist. If they 404, update the links to correct paths or remove the Solutions dropdown and link directly to `/activate` with label "Industries" until the pages are built.

Replace `NAV_LINKS`:

```typescript
export const NAV_LINKS = [
  { href: ROUTES.PRODUCT, labelKey: "product" },
  { href: ROUTES.PRICING, labelKey: "pricing" },
  { href: ROUTES.DEMO, labelKey: "demo" },
] as const;
```

Remove "Docs" from main navigation. Docs moves to footer only.

### 1.5 Update Pricing Tiers

**File: `src/lib/constants.ts`**

Replace the entire `PRICING_TIERS` array:

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
    description: "The complete revenue closer for a single-location business.",
    features: [
      "3 AI agents",
      "500 voice minutes/month",
      "Unlimited follow-ups",
      "No-show recovery",
      "Reactivation campaigns",
      "Industry templates",
      "SMS + email",
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
    description: "For teams, high volume, and multi-location businesses.",
    features: [
      "10 AI agents",
      "3,000 voice minutes/month",
      "Unlimited team seats",
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

**File: `src/lib/billing-plans.ts`**

Replace the ENTIRE file:

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
  features: {
    appointmentBooking: boolean;
    missedCallRecovery: boolean;
    noShowRecovery: boolean;
    reactivationCampaigns: boolean;
    industryTemplates: boolean;
    smsEmail: boolean;
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
    features: {
      appointmentBooking: true,
      missedCallRecovery: true,
      noShowRecovery: false,
      reactivationCampaigns: false,
      industryTemplates: false,
      smsEmail: true,
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
    description: "The complete revenue closer",
    monthlyPrice: 29700,
    annualPrice: 24700,
    includedMinutes: 500,
    overageRateCents: 20,
    maxAgents: 3,
    maxSeats: 5,
    maxPhoneNumbers: 3,
    features: {
      appointmentBooking: true,
      missedCallRecovery: true,
      noShowRecovery: true,
      reactivationCampaigns: true,
      industryTemplates: true,
      smsEmail: true,
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
    maxSeats: -1, // unlimited
    maxPhoneNumbers: 10,
    features: {
      appointmentBooking: true,
      missedCallRecovery: true,
      noShowRecovery: true,
      reactivationCampaigns: true,
      industryTemplates: true,
      smsEmail: true,
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
    features: {
      appointmentBooking: true,
      missedCallRecovery: true,
      noShowRecovery: true,
      reactivationCampaigns: true,
      industryTemplates: true,
      smsEmail: true,
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

Update `src/lib/stripe-prices.ts` to map new plan slugs (solo, business, scale) to correct Stripe price IDs from environment variables.

### 1.7 Update Comparison Features

**File: `src/lib/constants.ts`**

Replace `COMPARISON_FEATURES`:

```typescript
export const COMPARISON_FEATURES = [
  { category: "Core", name: "Voice minutes / month", solo: "100", business: "500", scale: "3,000", enterprise: "Custom" },
  { category: "Core", name: "AI agents", solo: "1", business: "3", scale: "10", enterprise: "Custom" },
  { category: "Core", name: "Follow-ups", solo: "10 active", business: "Unlimited", scale: "Unlimited", enterprise: "Unlimited" },
  { category: "Core", name: "Team seats", solo: "1", business: "5", scale: "Unlimited", enterprise: "Unlimited" },
  { category: "Core", name: "Phone numbers", solo: "1", business: "3", scale: "10", enterprise: "Custom" },
  { category: "Features", name: "Appointment booking", solo: "✓", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Missed call recovery", solo: "✓", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "No-show recovery", solo: "—", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Reactivation campaigns", solo: "—", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Industry templates", solo: "—", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Revenue analytics", solo: "—", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Advanced analytics", solo: "—", business: "—", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "CRM webhook", solo: "—", business: "✓", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Native CRM sync", solo: "—", business: "—", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "API access", solo: "—", business: "—", scale: "✓", enterprise: "✓" },
  { category: "Features", name: "Premium voices", solo: "—", business: "—", scale: "✓", enterprise: "✓" },
  { category: "Support", name: "Priority support", solo: "—", business: "—", scale: "✓", enterprise: "✓" },
  { category: "Pricing", name: "Overage rate", solo: "$0.30/min", business: "$0.20/min", scale: "$0.12/min", enterprise: "Negotiated" },
] as const;
```

### 1.8 Update FAQ

**File: `src/lib/constants.ts`**

Replace `PRICING_FAQ`:

```typescript
export const PRICING_FAQ = [
  { q: "How does the free trial work?", a: "14 days, full features on your selected plan, no credit card required. Connect your phone number and your AI starts handling calls immediately." },
  { q: "What if I exceed my included minutes?", a: "Your calls never get cut off. Overage minutes are billed at your plan's per-minute rate. We alert you as you approach your limit." },
  { q: "Can I keep my existing phone number?", a: "Yes. Forward your existing number to your Recall Touch number. Your callers won't notice any difference." },
  { q: "What voices are available?", a: "6 natural-sounding voices included on all plans. Premium voices available as an add-on for $29/month." },
  { q: "Is there a contract?", a: "No. Month-to-month. Cancel anytime from your dashboard. Annual plans available at a 17% discount." },
  { q: "Do you support HIPAA?", a: "HIPAA-compliant configuration with BAA is available as an add-on for healthcare practices. Contact us for details." },
  { q: "What integrations are available?", a: "Google Calendar and Outlook on all plans. CRM webhook on Business+. Native CRM sync and API on Scale+." },
  { q: "How is this different from an AI answering service?", a: "AI answering services answer your phone. Recall Touch answers, then follows up, books appointments, sends reminders, recovers no-shows, and reactivates cold leads. The answering is just the beginning." },
  { q: "What happens after hours?", a: "Your AI answers 24/7 following your configured after-hours rules — take messages, offer booking, or handle specific call types." },
  { q: "How fast is setup?", a: "About 5 minutes. Select your industry, connect your phone, and your AI is live with pre-built knowledge and follow-up workflows." },
] as const;
```

### 1.9 Remove Engineering Vocabulary From UI

Search the ENTIRE codebase for these strings in user-facing components and remove or replace with business language:

- "capsule data" → remove from UI entirely
- "retention intercept" → remove from UI entirely
- "reversion states" → remove from UI entirely
- "handoff" (in operational/engineering sense) → "transfer" or "escalation"
- "delivery assurance" → remove from UI entirely
- "governance" → remove from UI entirely
- "intelligence engine" → "AI settings" or just "settings"
- "operational realization" → remove
- "exposure engine" → remove
- "economic gravity" → remove
- "confidence ceiling" → remove
- "network formation" → remove
- "channel escalation" → "call transfer" or "routing"

The backend code for these systems can remain, but NO user-facing component should reference them.

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

Add these as custom colors in `tailwind.config.ts` (or wherever Tailwind 4 is configured):

```
rt-bg: #FAFAF8, rt-surface: #FFFFFF, rt-surface-alt: #F5F5F0,
rt-text-primary: #1A1A1A, rt-text-secondary: #4A4A4A, rt-text-tertiary: #8A8A8A,
rt-teal: #0D6E6E, rt-teal-hover: #0A5A5A, rt-teal-light: #E6F2F2,
rt-amber: #D4A853, rt-amber-light: #FDF5E6,
rt-success: #16A34A, rt-warning: #D97706, rt-error: #DC2626, rt-info: #2563EB,
rt-border: #E5E5E0
```

### 2.3 Marketing Site Uses LIGHT Mode

All marketing pages (homepage, /pricing, /about, /demo, /industries/*, /compare, /results, /security) MUST use:
- Background: `#FAFAF8` (warm white)
- Cards: `#FFFFFF` with `1px solid #E5E5E0` border
- Text: `#1A1A1A` headings, `#4A4A4A` body
- Accent: `#0D6E6E` (teal) for buttons, links, highlights
- NO dark backgrounds on marketing pages
- NO gradient hero sections
- NO purple, blue-purple, or emerald green accents

The app dashboard can offer a dark mode toggle in Settings, but defaults to light.

---

## PHASE 3: ONBOARDING REDESIGN

Replace the current multi-step onboarding with a 3-step wizard.

### 3.1 Create Industry Packs

**Create directory: `src/lib/industry-packs/`**

**Create: `src/lib/industry-packs/types.ts`**

```typescript
export interface IndustryPack {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  greeting: string;
  avgJobValue: number;
  appointmentTypes: { name: string; duration: number }[];
  knowledgeBase: {
    commonQuestions: { q: string; a: string }[];
    services: string[];
  };
  workflows: {
    name: string;
    trigger: 'missed_call' | 'appointment_booked' | 'no_show' | 'quote_sent' | 'days_inactive';
    triggerConfig?: Record<string, unknown>;
    steps: {
      channel: 'sms' | 'call' | 'email';
      delay: number; // seconds. negative = before event (reminders)
      condition?: 'if_no_reply';
      template?: string;
      script?: string;
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
    services: ['Cleaning', 'Exam', 'X-rays', 'Crown', 'Filling', 'Root canal', 'Whitening', 'Emergency care', 'Consultation'],
  },
  workflows: [
    {
      name: 'Missed Call Recovery',
      trigger: 'missed_call',
      steps: [
        { channel: 'sms', delay: 60, template: "Hi {name}, we missed your call to {business_name}. How can we help? Reply here or we'll call you back shortly." },
        { channel: 'call', delay: 7200, condition: 'if_no_reply', script: "Hi, this is {business_name} returning your call from earlier today. How can we help you?" },
        { channel: 'sms', delay: 86400, condition: 'if_no_reply', template: "Hi {name}, just following up from {business_name}. You can book an appointment anytime here: {booking_link}" },
      ],
    },
    {
      name: 'Appointment Reminder',
      trigger: 'appointment_booked',
      steps: [
        { channel: 'sms', delay: 0, template: "Your appointment at {business_name} is confirmed for {appointment_time}. Reply C to confirm or R to reschedule." },
        { channel: 'sms', delay: -86400, template: "Reminder: Your appointment at {business_name} is tomorrow at {appointment_time}. Reply R if you need to reschedule." },
        { channel: 'sms', delay: -7200, template: "Your appointment at {business_name} is in 2 hours. See you soon!" },
      ],
    },
    {
      name: 'No-Show Recovery',
      trigger: 'no_show',
      steps: [
        { channel: 'sms', delay: 1800, template: "Hi {name}, we missed you at your appointment today at {business_name}. Would you like to reschedule? Reply YES or call us." },
        { channel: 'call', delay: 86400, condition: 'if_no_reply', script: "Hi {name}, this is {business_name}. We noticed you couldn't make your appointment. Would you like to reschedule?" },
        { channel: 'sms', delay: 172800, condition: 'if_no_reply', template: "Hi {name}, we'd love to see you. Book a new time: {booking_link}" },
      ],
    },
  ],
};
```

**Create similar packs:**
- `hvac.ts` — avgJobValue: 450, services: Repair/Maintenance/Installation/Emergency/Inspection, workflows include Quote Follow-Up
- `legal.ts` — avgJobValue: 8000, services: Consultation/Case Review/Filing, workflows include Intake Follow-Up
- `medspa.ts` — avgJobValue: 4500, services: Botox/Filler/Facial/Laser/Consultation, workflows include Reactivation (60-day)
- `roofing.ts` — avgJobValue: 12000, services: Inspection/Repair/Replacement/Storm Damage/Insurance Claim
- `general.ts` — avgJobValue: 500, generic services and workflows

**Create: `src/lib/industry-packs/index.ts`**

```typescript
import { dentalPack } from './dental';
import { hvacPack } from './hvac';
import { legalPack } from './legal';
import { medspaPack } from './medspa';
import { roofingPack } from './roofing';
import { generalPack } from './general';
import type { IndustryPack } from './types';

export const industryPacks: Record<string, IndustryPack> = {
  dental: dentalPack,
  hvac: hvacPack,
  legal: legalPack,
  medspa: medspaPack,
  roofing: roofingPack,
  other: generalPack,
};

export type IndustryId = keyof typeof industryPacks;
export type { IndustryPack };
```

### 3.2 Build 3-Step Onboarding Wizard

Replace the existing onboarding at `src/app/onboarding/` (or wherever it lives in the app router).

**Step 1: Your Business**
- Full-screen page, no sidebar, progress bar "Step 1 of 3"
- Business name input (required)
- Industry selection as 6 large clickable cards: Dental, HVAC & Plumbing, Legal, Med Spa, Roofing, Other
- Each card: Lucide icon + industry name + one-line description ("Recover missed patients", "Capture every service call", etc.)
- Website URL input (optional) with helper: "We'll pull your business info automatically"
- If website provided: call `/api/onboarding/scrape` to extract business hours, services, address
- On "Continue →": create workspace, load industry pack, create AI agent with defaults
- Colors: #FAFAF8 background, #0D6E6E accent on selected card border, #FFFFFF card backgrounds

**Step 2: Connect Your Phone**
- Three large option cards:
  - **"Forward your existing number"** — show carrier-specific forwarding instructions
  - **"Get a new number"** — area code picker → instant number provisioning
  - **"I'll do this later"** — skip to dashboard. Show persistent banner: "Connect your phone to start receiving calls"
- On selection: provision number via Twilio, link to workspace/agent, test connectivity

**Step 3: You're Live**
- Celebration screen with subtle confetti animation (Framer Motion, brief)
- Large display: "Your AI is live on (555) 123-4567"
- Three action buttons:
  - **Primary (large, teal):** "Call your number now" — `tel:` link that opens phone dialer
  - **Secondary:** "Listen to a sample call" — play audio recording of AI handling industry-appropriate call
  - **Tertiary:** "Go to your dashboard →"
- Below: "Your AI is configured for {industry} with {N} pre-built follow-up workflows. Customize anytime in Settings."

---

## PHASE 4: DASHBOARD REDESIGN

Replace the current dashboard at `src/app/app/activity/page.tsx` (or `src/app/dashboard/page.tsx` depending on routing).

### 4.1 Revenue Impact Card

**Create: `src/components/dashboard/RevenueImpactCard.tsx`**

```
┌─────────────────────────────────────────────────────┐
│  This month ▾                                        │
│                                                      │
│  ┌──────────┬──────────┬──────────┬──────────┐      │
│  │   127    │    34    │    18    │  $9,200  │      │
│  │  Calls   │  Leads   │  Appts   │   Est.   │      │
│  │ answered │ captured │  booked  │  value   │      │
│  └──────────┴──────────┴──────────┴──────────┘      │
│  ↑ 12% vs last month                                │
└─────────────────────────────────────────────────────┘
```

- Numbers: text-3xl font-bold, prominent
- "Est. value" = (leads captured + appointments booked) × workspace.avg_job_value
- Time period selector: Today / This Week / This Month
- Teal left border accent
- Trend: compare current period to same-length previous period

### 4.2 Needs Attention List

**Create: `src/components/dashboard/NeedsAttentionList.tsx`**

Items requiring human action:
- Contacts with status 'new' and no follow-up enrollment
- Workflow enrollments paused or needing review
- Calls with outcome 'transferred' not yet resolved
- Appointments needing rescheduling

Each item: urgency dot (🔴 overdue >2h, 🟡 pending), contact name, description, time. Click → navigate to contact. Max 5 items, "View all →" link.

### 4.3 Recent Calls List

**Create: `src/components/dashboard/RecentCallsList.tsx`**

Table of last 10 calls: time, contact name (or "Unknown"), outcome badge, duration. Clickable rows → contact timeline.

Outcome badges: "Appointment booked" (green), "Lead captured" (blue), "Message taken" (gray), "Question answered" (gray), "Transferred" (amber), "Spam" (red).

### 4.4 Dashboard Page Layout

```tsx
export default function DashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <RevenueImpactCard />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NeedsAttentionList />
        <TodaysActivity />
      </div>
      <RecentCallsList />
    </div>
  );
}
```

Remove ALL references to capsule data, handoffs, reversion states, retention intercept, or any engineering-vocabulary UI elements from the dashboard.

---

## PHASE 5: INBOX REDESIGN

### 5.1 Contact Timeline Split View

**Rewrite: `src/app/app/inbox/page.tsx`**

Two-panel layout:

**Left panel (35%, scrollable):** Contacts with recent activity, sorted by last_activity_at DESC
- Contact name (or phone number)
- Last message/call preview (1 line truncated)
- Channel icon: 📞 call, 💬 SMS, ✉️ email
- Relative time ("2 min ago")
- Urgency dot: red = action needed, blue = unread, none = read

**Right panel (65%, scrollable):** Selected contact's full timeline
- Header: name, phone, email, status badge, estimated value
- Chronological stream of ALL interactions:
  - Calls: time, duration, direction, outcome badge, "▶ Play" button, expandable transcript, AI summary
  - SMS: time, direction, message content, delivery status
  - Email: time, direction, subject, body
- Bottom action bar: [Reply via SMS] [Call back] [Add note] [Start follow-up] [Mark resolved]

**Filters:** All | Unread | Action needed | Calls only | Texts only

### 5.2 Inline SMS Reply

Text input at bottom of right panel: "Type a message..." + Send button. Creates message record and sends via Twilio.

---

## PHASE 6: FOLLOW-UP ENGINE

**This is the most critical backend feature. It is what makes Recall Touch different from every competitor at every price point.** None of Dialzara ($29), Rosie ($49), Goodcall ($59-249), My AI Front Desk ($79-149), or even Smith.ai ($95-800) offer automated multi-step follow-up sequences. This is the moat.

### 6.1 Database Tables

Run these Supabase migrations:

```sql
-- Workflows (follow-up sequence templates)
CREATE TABLE IF NOT EXISTS workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger text NOT NULL CHECK (trigger IN ('missed_call', 'appointment_booked', 'no_show', 'quote_sent', 'manual', 'contact_created', 'days_inactive')),
  trigger_config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  is_template boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  step_order int NOT NULL,
  channel text NOT NULL CHECK (channel IN ('sms', 'call', 'email')),
  delay_seconds int NOT NULL,
  delay_condition text DEFAULT 'after_trigger' CHECK (delay_condition IN ('after_trigger', 'after_previous', 'if_no_reply')),
  message_template text,
  call_script text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(workflow_id, step_order)
);

CREATE TABLE IF NOT EXISTS workflow_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  current_step int DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'stopped')),
  stop_reason text CHECK (stop_reason IN ('replied', 'booked', 'opted_out', 'manual', 'completed')),
  enrolled_at timestamptz DEFAULT now(),
  last_step_at timestamptz,
  next_step_at timestamptz,
  UNIQUE(workflow_id, contact_id)
);

-- Usage tracking
CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('voice_minute', 'sms_sent', 'sms_received', 'email_sent')),
  quantity decimal NOT NULL,
  cost_cents int DEFAULT 0,
  reference_id uuid,
  recorded_at timestamptz DEFAULT now()
);

-- Analytics aggregation
CREATE TABLE IF NOT EXISTS analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  date date NOT NULL,
  calls_answered int DEFAULT 0,
  leads_captured int DEFAULT 0,
  appointments_booked int DEFAULT 0,
  estimated_revenue decimal DEFAULT 0,
  minutes_used decimal DEFAULT 0,
  follow_ups_sent int DEFAULT 0,
  no_shows_recovered int DEFAULT 0,
  UNIQUE(workspace_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_enrollments_active ON workflow_enrollments (status, next_step_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_usage_events_workspace ON usage_events (workspace_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_workspace ON analytics_daily (workspace_id, date DESC);

-- Enable RLS on all new tables
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

-- Workspace isolation policies
CREATE POLICY "workspace_isolation" ON workflows FOR ALL USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));
CREATE POLICY "workspace_isolation" ON workflow_steps FOR ALL USING (workflow_id IN (SELECT id FROM workflows WHERE workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())));
CREATE POLICY "workspace_isolation" ON workflow_enrollments FOR ALL USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));
CREATE POLICY "workspace_isolation" ON usage_events FOR ALL USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));
CREATE POLICY "workspace_isolation" ON analytics_daily FOR ALL USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));
```

### 6.2 Workflow Scheduler

**Create: `src/lib/workflows/scheduler.ts`**

This runs as a background job (BullMQ, Vercel Cron, or pg_cron — use whichever fits current infrastructure).

```
Every 60 seconds:
1. Query workflow_enrollments WHERE status = 'active' AND next_step_at <= NOW()
2. For each due enrollment:
   a. Load the workflow and current step
   b. Check stop conditions:
      - Has the contact replied since enrollment? → stop (reason: replied)
      - Has an appointment been booked since enrollment? → stop (reason: booked)
      - Has the contact opted out? → stop (reason: opted_out)
   c. If not stopped, execute the step:
      - SMS: Render template with variables, send via SMS provider, create usage_event
      - Call: Initiate outbound call via Vapi with script, create usage_event
      - Email: Send via email provider, create usage_event
   d. Update enrollment: increment current_step, calculate next_step_at
   e. If no more steps: mark completed
```

**Variable rendering function:**

```typescript
function renderTemplate(
  template: string,
  contact: Contact,
  workspace: Workspace,
  appointment?: Appointment
): string {
  return template
    .replace(/\{name\}/g, contact.name || 'there')
    .replace(/\{business_name\}/g, workspace.name)
    .replace(/\{business\}/g, workspace.name)
    .replace(/\{booking_link\}/g, `https://recall-touch.com/book/${workspace.id}`)
    .replace(/\{appointment_time\}/g,
      appointment ? formatDateTime(appointment.scheduled_at, workspace.timezone) : ''
    );
}
```

### 6.3 Trigger Integration

When events occur, check for matching workflows and enroll the contact:

- **Call ends with outcome 'missed' or duration < 15 seconds** → 'missed_call' workflow → Enroll
- **Appointment created** → 'appointment_booked' workflow → Enroll
- **Appointment status → 'no_show'** → 'no_show' workflow → Enroll
- **Manual trigger** → User clicks "Start follow-up" → Show picker → Enroll

A contact MUST NOT be enrolled in the same workflow twice simultaneously. Check UNIQUE constraint.

### 6.4 Follow-Ups UI

**Create: `src/app/app/follow-ups/page.tsx`** (or within the app router structure)

List of workflow cards: name, trigger badge, step summary ("SMS → Call → SMS"), active enrollments count, success rate.
[Edit] [Pause/Resume] [View enrolled] buttons per card.
[+ New follow-up] button at top.

**Create: `src/components/followups/WorkflowEditor.tsx`**

Linear step editor (NOT a flowchart — a simple vertical list of steps):
- Trigger selector dropdown
- Step cards: step number, channel dropdown (SMS/Call/Email), delay input (with unit selector), condition dropdown, message template textarea with variable insertion
- "Add step" button at bottom
- Stop conditions: checkboxes for "Stop when contact replies", "Stop when appointment booked", "Stop on opt-out"
- Save / Cancel buttons

---

## PHASE 7: VOICE SELECTOR

**Create: `src/components/settings/VoiceSelector.tsx`**

Grid of 6 voice cards:

```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│Rachel│ │ James│ │ Sofia│ │Marcus│ │  Amy │ │ David│
│  ▶   │ │  ▶   │ │  ▶   │ │  ▶   │ │  ▶   │ │  ▶   │
│ Pro  │ │ Warm │ │Bright│ │ Calm │ │Frndly│ │ Auth │
│  ✓   │ │      │ │      │ │      │ │      │ │      │
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
```

Each card: voice name, play sample ▶ (5-second clip), personality descriptor, selected indicator (teal border + checkmark).

Below grid:
- "Preview with your greeting ▶" button — TTS API with selected voice + workspace greeting
- Speed slider (0.8x - 1.2x)
- Warmth slider (maps to ElevenLabs stability/similarity parameters)
- "Premium voices" upsell: "Unlock 12+ additional voices for $29/mo →"

Map voice names to ElevenLabs voice_ids in a config file, NOT hardcoded in the component.

---

## PHASE 8: BILLING & USAGE PAGE

**Rewrite: `src/app/app/settings/billing/page.tsx`**

```
Current plan: Business ($297/mo)      [Change plan] [Switch to annual — save 17%]
Next billing date: April 1, 2026
Payment method: Visa ····4242         [Update payment]

THIS PERIOD USAGE
Voice minutes: 312 / 500   [████████░░] 62%
AI agents: 2 / 3
Team members: 2 / 5
SMS sent: 234

Estimated overage: $0.00
Overage rate: $0.20/min after 500 min included

BILLING HISTORY
Mar 1   Business plan   $297.00   ✓ Paid   [Download]
Feb 1   Business plan   $297.00   ✓ Paid   [Download]
Jan 1   Business plan   $341.40   ✓ Paid   [Download]
        ($297.00 + $44.40 overage — 222 extra min × $0.20)

[Cancel plan]
```

- Visual progress bar for usage
- At 80%: bar turns amber. At 100%: red with "Overage rates now apply"
- "Change plan" opens modal with all tiers
- "Switch to annual" shows savings
- "Cancel plan" is a text link, not prominent
- Cancel modal: revenue impact summary + downgrade/pause options

---

## PHASE 9: HOMEPAGE REDESIGN

**Rewrite: `src/app/page.tsx` completely.**

### CRITICAL DESIGN RULES
- Light background (#FAFAF8) — NOT dark
- Teal (#0D6E6E) accent — NOT emerald, NOT purple, NOT blue
- Clean whitespace, generous spacing
- Real product screenshots (once dashboard is built)
- NO fabricated stats, testimonials, customer counts
- NO abstract blobs, floating 3D elements, particle animations
- NO gradient hero backgrounds

### Section Order (13 sections)

**1. Hero** — 60/40 split layout.
- Left: headline "Your phone rings. Then what?", subheadline "Recall Touch answers your calls, follows up on every lead, books appointments, recovers no-shows, and closes every loop — automatically, 24/7, across voice, text, and email.", two CTAs ("Try it free for 14 days" teal button, "Hear it handle a call →" text link), three micro-badges ("No credit card required", "Live in 5 minutes", "Cancel anytime")
- Right: animated call conversation UI showing AI handling a call (text appearing in real-time)

**2. Trust bar** — Thin strip: "Set up in 5 minutes · Works with your existing number · 14-day free trial"

**3. Problem statement** — "Every missed follow-up is lost revenue."
Three cards with REAL cited statistics:
- "The call goes to voicemail" — "80% of callers sent to voicemail won't leave a message. 85% of people whose calls are missed won't call back." (Source: Forbes / BrightLocal)
- "The lead goes cold" — "The average business takes 42 hours to respond to a lead. 78% of buyers go with whoever responds first." (Source: Lead Response Management Study / InsideSales.com)
- "The appointment doesn't happen" — "No-show rates for service businesses range from 10-30%. Each no-show costs the average practice $200+." (Source: Medical Group Management Association / industry surveys)

NOTE: These statistics must be verifiable. If you cannot verify a specific stat, use a range or softer language like "studies show" rather than citing a specific number.

**4. Solution** — "Recall Touch closes every loop."
One paragraph explaining the product. Product screenshot of the dashboard with Revenue Impact Card.

**5. How it works** — Three steps:
1. Connect your phone (2 minutes)
2. Your AI configures itself (industry-specific defaults)
3. Every call handled, every follow-up sent

**6. Interactive demo** — "Hear it handle a real call." Embed existing voice demo or provide phone number.

**7. Features** — "What Recall Touch does that answering services don't."
Six cards:
1. Answers every call 24/7
2. Follows up automatically (SMS → Call → SMS sequences)
3. Books appointments (real-time calendar sync)
4. Recovers no-shows (automated outreach)
5. Reactivates cold leads (30/60/90 day campaigns)
6. Shows your ROI (revenue attribution dashboard)

**8. Competitive comparison** — "Other tools answer the phone. Recall Touch finishes the job."
Two-column comparison:

| Capability | AI Answering Services ($29-79/mo) | Recall Touch ($297/mo) |
|---|---|---|
| Answer calls 24/7 | ✓ | ✓ |
| Capture lead info | ✓ | ✓ |
| Automated follow-up sequences | ✗ | ✓ |
| Missed call recovery (SMS + callback) | ✗ | ✓ |
| Appointment booking from call | Basic | Real-time calendar sync |
| Appointment reminders | ✗ | ✓ |
| No-show recovery | ✗ | ✓ |
| Lead reactivation campaigns | ✗ | ✓ |
| Revenue attribution | ✗ | ✓ |

**9. Industries** — "Built for businesses that depend on every call."
Cards: Dental ("Recover missed patients, fill empty chairs"), HVAC ("Capture every service call, chase every quote"), Legal ("Never miss an intake call worth $5,000-50,000"), Med Spa ("Reactivate lapsed clients, reduce no-shows"), Roofing ("Close storm leads before competitors do"). Each links to industry page.

**10. Social proof** — "Now accepting early customers." Honest framing. When real testimonials exist, add them here. Until then: the interactive demo IS the proof.

**11. Pricing preview** — Three tiers (Solo $49, Business $297, Scale $997) with primary features and CTAs. Link to full /pricing page.

**12. FAQ** — 6 questions from the PRICING_FAQ constant.

**13. Final CTA** — "Every day without Recall Touch is revenue you're not recovering." Two CTAs: "Try it free for 14 days" + "Or hear it handle a call first →"

---

## PHASE 10: /ABOUT PAGE

**Create: `src/app/about/page.tsx`**

This page MUST contain real information. Do NOT use placeholder names or fake bios.

Structure:
- "Why we built Recall Touch" — The story of the founder and the problem they experienced
- Team section with real name(s) and real photo(s)
- Contact information

If the founder has not provided this info, use clearly marked placeholders:
```
[FOUNDER: Add your name here]
[FOUNDER: Add your photo here]
[FOUNDER: Write 2-3 paragraphs about why you built Recall Touch]
[FOUNDER: Add your email]
```

Do NOT make up names, photos, or stories.

---

## PHASE 11: SETTINGS PAGES

### AI Agent Settings

**Rewrite: `src/app/app/settings/agent/page.tsx`**

- **Greeting:** Text input with character count. "Preview how it sounds ▶" button (TTS API call).
- **Knowledge base:** Structured form:
  - Services list (tag input — type and Enter to add)
  - Business hours (day-by-day open/close time selectors)
  - FAQ (add q+a pairs)
  - Policies (free-text area)
- **Capabilities:** Toggle switches:
  - ✅ Answer questions about the business
  - ✅ Book appointments
  - ✅ Capture lead information
  - ✅ Send follow-up text after call
  - ✅ Transfer to human for urgent calls
  - ✅ Handle after-hours calls
- **Test your AI:** "Call [number] to test" button. Always accessible.

### Phone Settings

**`src/app/app/settings/phone/page.tsx`**

- Phone number list with status (active/inactive)
- Add number button (provision new)
- Call routing: business hours → AI agent, after hours → AI agent / voicemail / forward
- Business hours editor (synced with knowledge base hours)

### Team Settings

**`src/app/app/settings/team/page.tsx`**

- Member list: name, email, role, last active
- Invite: email + role selector (admin/member)
- Role descriptions: Owner (full access), Admin (everything except billing), Member (view only)
- Remove member with confirmation

---

## GLOBAL RULES

### Code Quality
- TypeScript strict mode. No `any` types except explicitly necessary.
- All database queries: parameterized inputs. No SQL injection.
- All API routes: validate with Zod schemas.
- All user-facing strings: i18n files (next-intl already set up).
- All new components: semantic HTML, ARIA labels, keyboard navigation.
- Error boundaries on all page components.
- Loading states on all async operations.

### Empty States

Every page MUST have a useful empty state. Never show "No data" or blank screen.

- **Dashboard** (no calls): "Your AI is ready. Call [number] to make your first test call."
- **Inbox** (no conversations): "No conversations yet. Once calls come in, every conversation appears here."
- **Contacts** (no contacts): "No contacts yet. Your first caller becomes your first lead."
- **Follow-ups** (no workflows): "Your {industry} templates are ready. [Activate missed call recovery →]"
- **Analytics** (no data): "Analytics will appear once your AI starts handling calls."
- **Calendar** (no appointments): "No appointments yet. Your AI will book them automatically."

### Performance
- Marketing pages: target <2s LCP. next/image for all images. Lazy-load below fold.
- Dashboard: target <1s to interactive. Prefetch on auth.
- Inbox: virtual scroll if >100 contacts.
- Voice preview: cache audio samples.

### Security
- All tables: RLS with workspace_id isolation.
- API routes: verify auth + workspace membership.
- Stripe webhooks: verified with signing secret.
- Voice webhooks: verified with provider signature.
- Rate limiting on auth, API, and webhook endpoints.

### What NOT to Build

Do NOT build ANY of the following:
- Pipeline view (Sales Mode — future)
- White-label configuration (Enterprise — future)
- Mobile native app
- API documentation
- Advanced CRM sync (webhook only for now)
- Multi-language marketing pages (US English only)
- Governance system, compliance tracking system, delivery assurance system
- Continuity infrastructure
- Human safety constraints system (use simple AI prompt guardrails)
- Any system with "intelligence" in the directory name

### What to Remove From UI

If any of these exist in user-facing components, remove them:
- References to "capsule data"
- References to "retention intercept"
- References to "reversion states"
- References to "handoff" (engineering sense)
- References to "delivery assurance"
- References to "governance"
- Any "500+" or "$2.1M" claims
- Any fake testimonial content
- Any "SOC 2" without "in progress"
- Any "99.9% uptime" claim

---

## CORE DATA MODEL

For reference — these are the primary entities the application uses. Existing tables should be updated to match; new tables (workflows, workflow_steps, workflow_enrollments, usage_events, analytics_daily) are created in Phase 6.

```sql
-- Workspaces (multi-tenant root)
workspaces: id, name, industry (dental|hvac|legal|medspa|roofing|healthcare|coaching|other),
  mode (solo|business|sales), website_url, phone, address, timezone, avg_job_value,
  business_hours (jsonb), stripe_customer_id, stripe_subscription_id,
  plan (solo|business|scale|enterprise), billing_interval (monthly|annual), trial_ends_at

-- Users: id (Supabase Auth), email, name, workspace_id (FK), role (owner|admin|member)

-- Agents: id, workspace_id (FK), name, greeting, system_prompt, voice_id, voice_provider,
  capabilities (jsonb), knowledge_base (jsonb), industry_pack, is_active

-- Phone Numbers: id, workspace_id (FK), agent_id (FK), number (E.164), provider, provider_sid

-- Contacts: id, workspace_id (FK), name, phone, email, status (new|contacted|qualified|booked|completed|lost|archived),
  estimated_value, tags, notes, ai_summary, source, last_activity_at

-- Calls: id, workspace_id (FK), contact_id (FK), agent_id (FK), phone_number_id (FK),
  direction (inbound|outbound), started_at, ended_at, duration_seconds, outcome,
  recording_url, transcript, ai_summary

-- Messages: id, workspace_id (FK), contact_id (FK), channel (sms|email), direction,
  content, sent_at, delivered_at, status

-- Appointments: id, workspace_id (FK), contact_id (FK), type, scheduled_at, duration_minutes,
  status (confirmed|pending|cancelled|completed|no_show), source
```

---

## PRICING ECONOMICS (for context)

This section is NOT code — it's context for understanding pricing decisions.

### Cost Per Minute Breakdown
| Component | Cost/min |
|-----------|---------|
| ElevenLabs TTS | $0.04-0.08 |
| Deepgram STT | $0.01-0.02 |
| Claude Sonnet LLM | $0.02-0.06 |
| Vapi orchestration | $0.05 |
| Twilio telephony | $0.01-0.02 |
| **Total COGS/min** | **$0.13-0.17** |

### Margin by Tier
| Tier | Revenue | Avg COGS (at avg usage) | Gross Margin |
|------|---------|------------------------|-------------|
| Solo $49 | $49/mo | $10-15 (70 min avg) | ~70-80% |
| Business $297 | $297/mo | $60-68 (400 min avg) | ~77-80% |
| Scale $997 | $997/mo | $300-350 (2200 min avg) | ~65-70% |

### Overage Pricing
| Tier | Overage Rate | COGS/min | Margin |
|------|-------------|---------|--------|
| Solo | $0.30/min | ~$0.15 | ~50% |
| Business | $0.20/min | ~$0.15 | ~25% |
| Scale | $0.12/min | ~$0.12 | ~0% (volume play) |

---

## ADD-ONS (Available on Any Tier)

| Add-On | Price | Notes |
|--------|-------|-------|
| Premium voices | $29/mo | Extended voice library access |
| HIPAA compliance + BAA | $99/mo | Real BAA for healthcare |
| Additional phone number | $15/mo each | Beyond plan included |
| Additional AI agent | $49/mo each | Beyond plan included |
| Onboarding call | $149 one-time | 30-min setup with human. Free on Scale+. |
| Custom voice creation | $499 one-time + $49/mo | Professional voice clone |

---

## TESTING CHECKLIST

After ALL phases complete, verify every item:

1. ☐ Homepage loads with warm-white (#FAFAF8) design, no dark hero, no fake testimonials
2. ☐ No occurrence of "500+" customer claims anywhere in the entire codebase
3. ☐ No occurrence of "$2.1M" anywhere in the entire codebase
4. ☐ No fabricated names (Sarah Chen, Dr. Michael Rodriguez, etc.) anywhere
5. ☐ SOC 2 displays as "in progress" or removed everywhere
6. ☐ No "99.9% uptime" claims
7. ☐ Pricing shows Solo $49, Business $297, Scale $997, Enterprise Custom
8. ☐ Annual pricing calculated and displayed correctly (17% discount)
9. ☐ All navigation links resolve (no 404s)
10. ☐ Onboarding completes in 3 steps
11. ☐ Industry pack loads correct defaults on selection (dental, hvac, legal, medspa, roofing, other)
12. ☐ Dashboard shows Revenue Impact Card with real data (or zeros, NOT fake data)
13. ☐ Inbox shows unified contact timeline (calls + SMS + email)
14. ☐ Follow-up workflows can be created, edited, paused, resumed
15. ☐ Workflow scheduler processes due enrollments (test with mock data)
16. ☐ Voice selector plays samples and previews greeting with selected voice
17. ☐ Billing page shows usage meters with progress bars and overage calculation
18. ☐ /about page exists with real or clearly-marked placeholder content
19. ☐ Empty states display on ALL pages when no data exists
20. ☐ All new tables (workflows, workflow_steps, workflow_enrollments, usage_events, analytics_daily) have RLS policies
21. ☐ Stripe price IDs map to new plan slugs (solo, business, scale)
22. ☐ No engineering vocabulary visible in any user-facing UI
23. ☐ All marketing pages use light mode (#FAFAF8 bg, #0D6E6E accent)
24. ☐ Footer shows "256-bit encryption" not "SOC 2" badge
25. ☐ `billing-plans.ts` uses new PlanSlug type: "solo" | "business" | "scale" | "enterprise"
26. ☐ Competitive comparison section on homepage renders correctly
27. ☐ Problem statement section uses real, verifiable statistics with citations
28. ☐ "Try it free for 14 days" is the primary CTA everywhere (not "Start free trial" or "Get started")
29. ☐ "Hear it handle a call →" secondary CTA links to demo/voice
30. ☐ App builds with zero TypeScript errors

---

## END OF PROMPT

This is the complete specification. There is nothing else to reference. Build this exactly as specified, phase by phase, in order. If something is ambiguous, choose the simpler interpretation. If a file path doesn't exist, create it in the most logical location within the existing Next.js App Router structure. If a component is referenced that doesn't exist yet, create it.

The goal: A product that is honest, commercially sharp, technically sound, and differentiated from every competitor in the market. The follow-up engine is the moat. The trust cleanup is the foundation. The design system is the credibility. Build all three.
