# RECALL TOUCH — CURSOR MASTER PROMPT

You are the engineering team for Recall Touch. This is your complete specification. Follow it exactly. Do not improvise. Do not add features not listed here. Do not use placeholder data that looks real. Do not skip steps. Work in the exact order specified.

---

## WHAT RECALL TOUCH IS

Recall Touch is an AI platform that answers business calls, executes follow-up sequences, books appointments, recovers no-shows, and reactivates cold leads — across voice, text, and email — automatically.

**Category:** AI Revenue Closer. Not an AI receptionist. Not an answering service. Not a CRM. The AI that closes every revenue loop in a business.

**Headline:** "Your phone rings. Then what?"

**Entry market:** Single-location service businesses (dental, HVAC, legal, med spa, roofing).

**Tech stack (existing, keep):** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase (Postgres + Auth + RLS), Stripe, Vapi (voice orchestration), ElevenLabs (TTS), Deepgram (STT), Claude Sonnet (LLM), ioredis, Framer Motion, Recharts, Lucide icons.

---

## EXECUTION ORDER

You MUST work in this exact order. Complete each phase fully before moving to the next.

### PHASE 1: TRUST CLEANUP (Do this FIRST, before anything else)

#### 1.1 Delete all fabricated testimonials

**File: `src/components/sections/TestimonialsSection.tsx`**

Replace the entire TESTIMONIALS array with an empty array. Replace the section content with a simple honest message:

```tsx
const TESTIMONIALS: readonly any[] = [];

export function TestimonialsSection() {
  return (
    <section className="marketing-section py-20 md:py-28" style={{ background: "var(--bg-primary)" }}>
      <Container>
        <AnimateOnScroll className="text-center">
          <SectionLabel>Early Access</SectionLabel>
          <h2 className="font-bold max-w-2xl mx-auto" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}>
            Now accepting early customers
          </h2>
          <p className="text-base mt-3 max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
            We're onboarding service businesses one at a time to ensure every customer gets an exceptional experience. Start your 14-day free trial.
          </p>
          <a href="/activate" className="inline-flex mt-6 px-6 py-3 rounded-lg font-medium text-white" style={{ background: "var(--accent-primary)" }}>
            Try it free for 14 days
          </a>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
```

**Files: `src/i18n/messages/en.json`, `es.json`, `fr.json`, `de.json`, `pt.json`, `ja.json`**

Find and replace ALL testimonial content in every language file. Search for every occurrence of "Amanda K", "Ryan D", "Mike R", "Dr. Sarah L", "James T", "Sarah Chen", "Dr. Michael Rodriguez", "Jennifer Walsh", "Priya Kapoor", "Tom Brewer", "Lisa Martinez" and replace with empty strings or remove the testimonial objects entirely.

**File: `src/app/demo/voice/page.tsx`**

Remove all testimonial sections and "500+" claims from this page. Search for "Trusted by 500" and "500+" and remove those elements.

#### 1.2 Remove "500+" customer count claims

Search the ENTIRE codebase for these patterns and remove or replace them:

- `500+` (when referring to customers/businesses)
- `"Trusted by 500"`
- `$2.1M`
- `2.1M`
- `revenue recovered` (when used as a marketing claim, not as a product feature description)

**Specific files to check:**
- `src/components/sections/Hero.tsx` — Remove the `<span><strong className="text-white/70">500+</strong> service businesses</span>` element
- `src/components/sections/HomepageTrustBar.tsx` — Remove the "500+" stat. Replace with: `Set up in 5 minutes · Works with your existing number · 14-day free trial`
- `src/components/PricingContent.tsx` — Remove "Trusted by 500+ service businesses · $2.1M+ revenue recovered"
- `src/app/demo/voice/page.tsx` — Remove "Trusted by 500+" heading and "Join 500+" text

#### 1.3 Fix SOC 2 claims

Search the entire codebase for `"SOC 2"` (exact string). In every location:
- If it appears as a badge/certification claim, change to `"SOC 2 in progress"` or remove entirely
- **Exception:** `src/components/PricingContent.tsx` already says "SOC 2 in progress" — keep that as-is

**File: `src/components/sections/Footer.tsx`**
Change `{ label: "SOC 2", icon: "🛡️" }` to `{ label: "256-bit encryption", icon: "🔒" }`

Remove `99.9% Uptime` from all footer and trust badge locations until a status page exists.

#### 1.4 Fix broken navigation links

**File: `src/lib/constants.ts`**

The `SOLUTIONS_LINKS` array points to `/industries/*` paths — verify these pages actually exist at those paths. If the pages exist at different paths, update the links. If the pages don't exist, remove the Solutions dropdown from navigation entirely and link directly to `/activate` with the label "Industries" until the pages are built.

Replace the NAV_LINKS to remove "Docs" from main navigation:

```typescript
export const NAV_LINKS = [
  { href: ROUTES.PRODUCT, labelKey: "product" },
  { href: ROUTES.PRICING, labelKey: "pricing" },
  { href: ROUTES.DEMO, labelKey: "demo" },
] as const;
```

Docs moves to the footer only.

#### 1.5 Update pricing tiers

**File: `src/lib/constants.ts`**

Replace the entire `PRICING_TIERS` array with:

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

**File: `src/lib/billing-plans.ts`**

Replace with:

```typescript
export type PlanSlug = "solo" | "business" | "scale" | "enterprise";

export interface BillingPlan {
  slug: PlanSlug;
  label: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  includedMinutes: number;
  overageRateCents: number; // cents per minute overage
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
    monthlyPrice: 4900, // cents
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

Update `src/lib/stripe-prices.ts` to map the new plan slugs (solo, business, scale) to the correct Stripe price IDs from environment variables.

#### 1.6 Update comparison features table

**File: `src/lib/constants.ts`**

Replace the `COMPARISON_FEATURES` array:

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

#### 1.7 Update FAQ

**File: `src/lib/constants.ts`**

Replace `PRICING_FAQ` with:

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

---

### PHASE 2: DESIGN SYSTEM

Before building any new UI, implement the new design system. This replaces the current dark-mode aesthetic.

#### 2.1 Create design tokens

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

#### 2.2 Update Tailwind config

Add these colors to `tailwind.config.ts` (or wherever Tailwind is configured) as custom colors so they're available as utility classes:

```
rt-bg, rt-surface, rt-surface-alt, rt-text-primary, rt-text-secondary, rt-text-tertiary,
rt-teal, rt-teal-hover, rt-teal-light, rt-amber, rt-amber-light,
rt-success, rt-warning, rt-error, rt-info, rt-border
```

#### 2.3 Marketing site uses LIGHT mode

All marketing pages (homepage, /pricing, /about, /demo, /industries/*, /compare, /results, /security) must use:
- Background: `#FAFAF8` (warm white)
- Cards: `#FFFFFF` with `1px solid #E5E5E0` border
- Text: `#1A1A1A` headings, `#4A4A4A` body
- Accent: `#0D6E6E` (teal) for buttons, links, highlights
- NO dark backgrounds on marketing pages
- NO gradient hero sections
- NO purple, blue-purple, or emerald green accents

The **app dashboard** can offer a dark mode toggle in Settings, but it defaults to light mode.

---

### PHASE 3: ONBOARDING REDESIGN

Replace the current 5-step onboarding with a 3-step wizard.

#### 3.1 Create industry packs

**Create directory: `src/lib/industry-packs/`**

**Create file: `src/lib/industry-packs/types.ts`**

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
    triggerConfig?: Record<string, any>;
    steps: {
      channel: 'sms' | 'call' | 'email';
      delay: number; // seconds, negative = before event (for reminders)
      condition?: 'if_no_reply';
      template?: string;
      script?: string;
    }[];
  }[];
}
```

**Create file: `src/lib/industry-packs/dental.ts`**

```typescript
import type { IndustryPack } from './types';

export const dentalPack: IndustryPack = {
  id: 'dental',
  name: 'Dental Practice',
  icon: 'Heart', // Lucide icon
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

**Create similar packs for:** `hvac.ts`, `legal.ts`, `medspa.ts`, `roofing.ts`, `general.ts`

HVAC: avgJobValue 450, services include Repair/Maintenance/Installation/Emergency, workflows include Quote Follow-Up.
Legal: avgJobValue 8000, services include Consultation/Case Review/Filing, workflows include Intake Follow-Up.
Med Spa: avgJobValue 4500, services include Botox/Filler/Facial/Laser/Consultation, workflows include Reactivation (60-day).
Roofing: avgJobValue 12000, services include Inspection/Repair/Replacement/Storm Damage/Insurance Claim.
General: avgJobValue 500, generic services and workflows.

**Create index file: `src/lib/industry-packs/index.ts`**

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

#### 3.2 Build 3-step onboarding

Replace the existing onboarding at `src/app/onboarding/` with a 3-step wizard.

**Step 1: Your Business**
- Full-screen page, no sidebar, progress bar showing "Step 1 of 3"
- Business name input (required)
- Industry selection as 6 large clickable cards: Dental, HVAC & Plumbing, Legal, Med Spa, Roofing, Other
- Each card: icon (from Lucide) + industry name + one-line description
- Website URL input (optional) with helper: "We'll pull your business info automatically"
- If website provided: call `/api/onboarding/scrape` to extract business hours, services, address
- On "Continue →": create workspace, load industry pack, create AI agent with defaults
- Use the design tokens for colors: #FAFAF8 background, #0D6E6E accent on selected card

**Step 2: Connect Your Phone**
- Three large option cards:
  - **"Forward your existing number"** — show carrier-specific forwarding instructions
  - **"Get a new number"** — area code picker → instant provisioning from available numbers
  - **"I'll do this later"** — skip to dashboard. Show a persistent banner in dashboard: "Connect your phone to start receiving calls"
- On selection: provision number, link to workspace/agent, test connectivity

**Step 3: You're Live**
- Celebration screen with confetti animation (subtle, brief)
- Large display of the phone number: "Your AI is live on (555) 123-4567"
- Three action buttons:
  - **Primary (large, teal):** "Call your number now" — `tel:` link that opens phone dialer
  - **Secondary:** "Listen to a sample call" — play an audio recording of the AI handling an industry-appropriate call
  - **Tertiary:** "Go to your dashboard →"
- Below: "Your AI is configured for {industry} with {N} pre-built follow-up workflows. Customize anytime in Settings."

---

### PHASE 4: DASHBOARD REDESIGN

Replace the current dashboard at `src/app/dashboard/page.tsx`.

#### 4.1 Revenue Impact Card component

**Create: `src/components/dashboard/RevenueImpactCard.tsx`**

```
Layout:
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

- Numbers are large (text-3xl font-bold) and prominent
- "Est. value" = count of (leads captured + appointments booked) × workspace.avg_job_value
- Trend calculated by comparing current period to same-length previous period
- Time period selector: Today / This Week / This Month
- Teal left border accent on the card
- Queries: calls table for answered count, contacts with status filter for leads, appointments for bookings

#### 4.2 Needs Attention List component

**Create: `src/components/dashboard/NeedsAttentionList.tsx`**

Shows items that require human action:
- Contacts with status 'new' and no follow-up enrollment (needs manual outreach)
- Workflow enrollments that are paused or need review
- Calls with outcome 'transferred' that haven't been resolved
- Appointments that need rescheduling

Each item: urgency dot (🔴 overdue >2h, 🟡 pending), contact name, description, time since created. Click → navigate to contact detail.

Maximum 5 items shown. "View all →" link if more exist.

#### 4.3 Recent Calls List component

**Create: `src/components/dashboard/RecentCallsList.tsx`**

Table showing last 10 calls: time, contact name (or "Unknown"), outcome badge, duration. Each row is clickable → navigates to contact timeline/inbox.

Outcome badges: "Appointment booked" (green), "Lead captured" (blue), "Message taken" (gray), "Question answered" (gray), "Transferred" (amber), "Spam" (red).

#### 4.4 Dashboard page layout

**Rewrite: `src/app/dashboard/page.tsx`**

```tsx
// IMPORTANT: Remove ALL references to capsule data, handoffs, reversion states,
// retention intercept, or any other engineering-vocabulary UI elements.

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <RevenueImpactCard />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NeedsAttentionList />
        <TodaysActivity /> {/* Calls today, follow-ups sent, appointments booked, next upcoming */}
      </div>
      <RecentCallsList />
    </div>
  );
}
```

Remove every import and reference to the old dashboard components that use engineering terminology.

---

### PHASE 5: INBOX REDESIGN

#### 5.1 Conversation list + contact timeline split view

**Create or rewrite: `src/app/dashboard/inbox/page.tsx`** (or wherever inbox lives)

Two-panel layout:
- Left panel (35% width, scrollable): List of contacts with recent activity, sorted by last_activity_at DESC
- Right panel (65% width, scrollable): Selected contact's full timeline

**Left panel item:**
- Contact name (or phone number if no name)
- Last message/call preview (truncated to 1 line)
- Channel icon: 📞 for call, 💬 for SMS, ✉️ for email
- Relative time ("2 min ago", "1 hour ago")
- Urgency dot: red if action needed, blue if unread, none if read

**Right panel (Contact Timeline):**
- Header: contact name, phone, email, status badge, estimated value
- Chronological stream of ALL interactions:
  - Call entries: time, duration, direction, outcome badge, "▶ Play recording" button, expandable transcript, AI summary
  - SMS entries: time, direction, message content, delivery status
  - Email entries: time, direction, subject, preview/full body
- Bottom action bar: [Reply via SMS] [Call back] [Add note] [Start follow-up] [Mark resolved]

**Filters at top:** All | Unread | Action needed | Calls only | Texts only

#### 5.2 Inline SMS reply

At the bottom of the right panel, a text input: "Type a message..." with a Send button. Sending creates a message record and sends via Twilio/SMS provider.

---

### PHASE 6: FOLLOW-UP ENGINE

This is the most critical backend feature. It is what makes Recall Touch different from every competitor.

#### 6.1 Database tables

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

-- RLS policies (apply to all new tables)
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

-- Policy: users can only access their workspace's data
CREATE POLICY "workspace_isolation" ON workflows FOR ALL USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));
CREATE POLICY "workspace_isolation" ON workflow_steps FOR ALL USING (workflow_id IN (SELECT id FROM workflows WHERE workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid())));
CREATE POLICY "workspace_isolation" ON workflow_enrollments FOR ALL USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));
CREATE POLICY "workspace_isolation" ON usage_events FOR ALL USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));
CREATE POLICY "workspace_isolation" ON analytics_daily FOR ALL USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));
```

#### 6.2 Workflow scheduler

**Create: `src/lib/workflows/scheduler.ts`**

This runs as a background job (via BullMQ, Vercel Cron, or pg_cron — use whichever fits the current infrastructure).

```
Every 60 seconds:
1. Query workflow_enrollments WHERE status = 'active' AND next_step_at <= NOW()
2. For each due enrollment:
   a. Load the workflow and current step
   b. Check stop conditions:
      - Has the contact replied to any message since enrollment? → stop (reason: replied)
      - Has an appointment been booked for this contact since enrollment? → stop (reason: booked)
      - Has the contact opted out? → stop (reason: opted_out)
   c. If not stopped, execute the step:
      - SMS: Render template with variables ({name}, {business_name}, {booking_link}, {appointment_time}), send via SMS provider, create message record, create usage_event
      - Call: Initiate outbound call via Vapi/voice provider with the script, create call record, create usage_event
      - Email: Send via email provider, create message record, create usage_event
   d. Update enrollment: increment current_step, calculate next_step_at based on next step's delay
   e. If no more steps: mark enrollment as completed
```

**Variable rendering:**

```typescript
function renderTemplate(template: string, contact: Contact, workspace: Workspace, appointment?: Appointment): string {
  return template
    .replace(/\{name\}/g, contact.name || 'there')
    .replace(/\{business_name\}/g, workspace.name)
    .replace(/\{business\}/g, workspace.name)
    .replace(/\{booking_link\}/g, `https://recall-touch.com/book/${workspace.id}`)
    .replace(/\{appointment_time\}/g, appointment ? formatDateTime(appointment.scheduled_at, workspace.timezone) : '');
}
```

#### 6.3 Trigger integration

When specific events occur, check if a matching workflow exists and enroll the contact:

- **Call ends with outcome 'missed' or duration < 15 seconds** → Check for 'missed_call' workflow → Enroll contact
- **Appointment created** → Check for 'appointment_booked' workflow → Enroll contact
- **Appointment status changed to 'no_show'** → Check for 'no_show' workflow → Enroll contact
- **Manual trigger** → User clicks "Start follow-up" on a contact → Show workflow picker → Enroll

**Important:** A contact should not be enrolled in the same workflow twice simultaneously. Check the UNIQUE constraint on (workflow_id, contact_id). If already enrolled, skip.

#### 6.4 Follow-ups UI

**Create: `src/app/dashboard/follow-ups/page.tsx`**

List view showing all workflows:
- Card per workflow: name, trigger type badge, step summary ("SMS → Call → SMS"), active enrollments count, success rate (completed with reason 'replied' or 'booked' / total completed)
- [Edit] [Pause/Resume] [View enrolled contacts] buttons per card
- [+ New follow-up] button at top

**Create: `src/components/followups/WorkflowEditor.tsx`**

Linear step editor:
- Trigger selector dropdown
- List of step cards, each showing: step number, channel (SMS/Call/Email dropdown), delay input (with unit: seconds/minutes/hours/days), condition dropdown (after trigger/after previous/if no reply), message template textarea with variable insertion dropdown
- "Add step" button at bottom
- Stop conditions section: checkboxes for "Stop when contact replies", "Stop when appointment booked", "Stop on opt-out"
- Save / Cancel buttons

---

### PHASE 7: VOICE SELECTOR

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

Each card:
- Voice name
- Play sample button (▶) — plays a 5-second sample clip
- One-word personality description
- Selected indicator (checkmark, teal border)

Below the grid:
- "Preview with your greeting ▶" button — calls ElevenLabs TTS API with the selected voice and the workspace's configured greeting, plays the result
- Speed slider (0.8x - 1.2x)
- Warmth slider (maps to ElevenLabs stability/similarity parameters)
- "Premium voices" upsell: "Unlock 12+ additional voices for $29/mo →" (link to billing upgrade)

Map each voice name to an ElevenLabs voice_id. Store these mappings in a config file, not hardcoded in the component.

---

### PHASE 8: BILLING & USAGE PAGE

**Rewrite: `src/app/dashboard/billing/page.tsx`** (or wherever billing lives)

Layout:
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

- Usage meter is a visual progress bar
- At 80% usage, bar turns amber. At 100%, turns red with "Overage rates now apply" notice.
- "Change plan" opens a modal showing all tiers with current plan highlighted
- "Switch to annual" shows savings calculation
- "Cancel plan" is a text link at the bottom, not prominent
- On cancel click: show a modal with revenue impact summary ("Recall Touch has captured X leads and booked Y appointments for your business") + options to downgrade or pause instead

Usage data comes from the `usage_events` table, summed for the current billing period.

---

### PHASE 9: HOMEPAGE REDESIGN

Rewrite `src/app/page.tsx` completely.

**CRITICAL DESIGN RULES:**
- Light background (#FAFAF8) — NOT dark mode
- Teal (#0D6E6E) accent — NOT emerald, NOT purple, NOT blue
- Clean, generous whitespace
- Real product screenshots (take actual screenshots of the dashboard once built)
- NO fabricated stats, testimonials, or customer counts
- NO abstract blob shapes, floating 3D elements, or particle animations
- NO gradient hero backgrounds

**Section order:**

1. **Hero** — 60/40 split. Left: headline "Your phone rings. Then what?", subheadline, two CTAs ("Try it free for 14 days" primary teal button, "Hear it handle a call →" secondary text link), three micro-badges below CTAs ("No credit card required", "Live in 5 minutes", "Cancel anytime"). Right: animated call conversation UI showing AI handling a call in real-time.

2. **Trust bar** — Thin strip: "Set up in 5 minutes · Works with your existing number · 14-day free trial"

3. **Problem statement** — "Every missed follow-up is lost revenue." Three cards: "The call goes to voicemail" (80% hang up, 93% never call back — cite source), "The lead goes cold" (51% never contacted, 42-hour avg response), "The appointment doesn't happen" (no confirmation, no reminder, no recovery). Sources must be real and cited.

4. **Solution** — "Recall Touch closes every loop." One paragraph explaining the product. Product screenshot showing the dashboard with the revenue impact card.

5. **How it works** — Three steps with icons: Connect your phone (2 min) → Your AI configures itself (industry defaults) → Every call handled, every follow-up sent.

6. **Interactive demo** — "Hear it handle a real call." Embed the existing interactive voice demo or provide the phone number to call.

7. **Features** — "What Recall Touch does that answering services don't." Six cards: Answers every call 24/7, Follows up automatically, Books appointments, Recovers no-shows, Reactivates cold leads, Shows your ROI.

8. **Industries** — "Built for businesses that depend on every call." Cards for Dental, HVAC, Legal, Med Spa, Roofing, each with a one-line hook and link to industry page.

9. **Social proof** — "Now accepting early customers." Honest framing. When real testimonials exist, add them here. Until then, show the interactive demo as proof.

10. **Pricing preview** — Show three tiers (Solo, Business, Scale) with the primary features and CTAs. Link to full /pricing page.

11. **FAQ** — 6 questions from the PRICING_FAQ array.

12. **Final CTA** — "Every day without Recall Touch is revenue you're not recovering." Two CTAs: "Try it free for 14 days" + "Or hear it handle a call first →"

---

### PHASE 10: CREATE /ABOUT PAGE

**Create: `src/app/about/page.tsx`**

This page MUST contain real information. Do NOT use placeholder names or fake bios. The founder must provide:
- Real name(s)
- Real photo(s) (or honest placeholder: "Photo coming soon")
- Real bio (2-3 sentences each)
- Real email contact
- The story of why Recall Touch was built (even 2-3 paragraphs)

If the founder has not provided this information, create the page structure with clearly marked [FOUNDER: Add your name here], [FOUNDER: Add your photo here], [FOUNDER: Add your story here] placeholders. Do NOT make up names, photos, or stories.

---

### PHASE 11: SETTINGS PAGES

#### AI Agent Settings

Rewrite the AI agent configuration page:

- **Greeting:** Text input with character count. "Preview how it sounds ▶" button (calls TTS API with selected voice and plays audio).
- **Knowledge base:** Structured form:
  - Services list (tag input — type and press Enter to add)
  - Business hours (day-by-day open/close time selectors)
  - FAQ (add question + answer pairs)
  - Policies (free-text area for additional info: cancellation policy, pricing notes, etc.)
- **Capabilities:** Toggle switches:
  - ✅ Answer questions about the business
  - ✅ Book appointments
  - ✅ Capture lead information
  - ✅ Send follow-up text after call
  - ✅ Transfer to human for urgent calls
  - ✅ Handle after-hours calls
- **Test your AI:** "Call [number] to test" button. Always accessible.

#### Phone Settings

- List of phone numbers with status (active/inactive)
- Add number button (provisions new number)
- Call routing rules: business hours → AI agent, after hours → AI agent (or voicemail, or forward to human)
- Business hours editor (same as knowledge base hours, synced)

#### Team Settings

- Member list: name, email, role, last active
- Invite button: email input + role selector (admin/member)
- Role descriptions: Owner (full access), Admin (everything except billing), Member (view only)
- Remove member button with confirmation

---

## GLOBAL RULES

### Code Quality

- TypeScript strict mode. No `any` types except where explicitly necessary.
- All database queries use parameterized inputs. No SQL injection vectors.
- All API routes validate input with Zod schemas.
- All user-facing strings come from i18n files (already using next-intl).
- All new components have proper accessibility: semantic HTML, ARIA labels, keyboard navigation.
- Error boundaries on all page components.
- Loading states on all async operations.

### Empty States

Every page MUST have a useful empty state. Never show "No data" or a blank screen.

- Dashboard (no calls yet): "Your AI is ready. Call [number] to make your first test call."
- Inbox (no conversations): "No conversations yet. Once calls come in, every conversation appears here."
- Contacts (no contacts): "No contacts yet. Your first caller becomes your first lead."
- Follow-ups (no workflows): "Your {industry} templates are ready. [Activate missed call recovery →]"
- Analytics (no data): "Analytics will appear once your AI starts handling calls."
- Calendar (no appointments): "No appointments yet. Your AI will book them automatically."

### Performance

- Marketing pages: target <2s LCP. Use next/image for all images. Lazy-load below-fold sections.
- Dashboard: target <1s to interactive. Prefetch dashboard data on auth.
- Inbox: virtual scroll for conversation list if >100 contacts.
- Voice preview: cache audio samples. Don't re-generate on every page visit.

### Security

- All tables have RLS enabled with workspace_id isolation.
- API routes verify authentication and workspace membership before any database query.
- Stripe webhooks verified with signing secret.
- Voice webhooks verified with provider signature.
- File uploads (if any) scanned and size-limited.
- Rate limiting on auth endpoints, API endpoints, and voice webhook handlers.

### What NOT to Build

Do NOT build any of the following. They are explicitly excluded from this scope:

- Pipeline view (Sales Mode — future)
- White-label configuration (Enterprise — future)
- Mobile native app (future)
- API documentation (future)
- Advanced CRM sync (future — webhook only for now)
- Multi-language marketing pages (US English only for launch)
- Governance system
- Compliance tracking system
- Delivery assurance system
- Continuity infrastructure
- Human safety constraints system (use simple AI prompt guardrails instead)
- Any system with "intelligence" in the directory name — consolidate all AI behavior into agent system prompts

### What to Remove

If any of these exist in the codebase, remove them from the user-facing UI. Backend code can stay for now but should not be referenced by any visible component:

- References to "capsule data"
- References to "retention intercept"
- References to "reversion states"
- References to "handoff" (in the operational/engineering sense)
- References to "delivery assurance"
- References to "governance"
- Any UI showing "500+" or "$2.1M" claims
- Any fake testimonial content
- Any "SOC 2" claim that doesn't say "in progress"
- Any "99.9% uptime" claim

---

## TESTING CHECKLIST

After all phases are complete, verify:

1. ☐ Homepage loads with warm-white design, no dark hero, no fake testimonials
2. ☐ No occurrence of "500+" customer claims anywhere on the site
3. ☐ No occurrence of "$2.1M" anywhere on the site
4. ☐ SOC 2 displays as "in progress" everywhere
5. ☐ Pricing shows Solo $49, Business $297, Scale $997, Enterprise Custom
6. ☐ Annual pricing visible and functional
7. ☐ Navigation links all resolve (no 404s)
8. ☐ Onboarding completes in 3 steps
9. ☐ Industry pack loads correct defaults on selection
10. ☐ Dashboard shows Revenue Impact Card with real data (or zeros, not fake data)
11. ☐ Inbox shows unified contact timeline (calls + SMS)
12. ☐ Follow-up workflows can be created and edited
13. ☐ Workflow scheduler processes due enrollments
14. ☐ Voice selector plays samples and previews greeting
15. ☐ Billing page shows usage meters and overage calculation
16. ☐ /about page exists with real or clearly-marked placeholder content
17. ☐ Empty states display on all pages when no data exists
18. ☐ All new tables have RLS policies
19. ☐ Stripe price IDs match new plan slugs
20. ☐ No engineering vocabulary visible in any user-facing UI
