# RECALL TOUCH — V10 CURSOR MASTER PROMPT

You are the engineering team for Recall Touch. This is your COMPLETE specification — product identity, architecture, every page, every component, every behavior, every edge case, every design decision. It was written after reading every source file in the codebase and verified against 529 passing tests and 0 TypeScript errors.

**Do not improvise. Do not add features not listed. Do not use placeholder data that looks real. Do not skip steps. Work in the exact order specified. Read this entire document before writing a single line of code.**

---

## PART 0: PRODUCT IDENTITY

### What Recall Touch Is

Recall Touch is the AI Revenue Operations platform. It answers every inbound call, runs outbound campaigns, executes multi-step follow-up sequences across voice + SMS + email, books appointments, recovers no-shows, reactivates dead leads, chases quotes, and measures every dollar recovered — automatically.

**Two engines work together:**

1. **INBOUND ENGINE** — AI answers every call 24/7, captures leads, books appointments, routes emergencies, and triggers follow-up sequences based on call outcomes.

2. **OUTBOUND ENGINE** — AI initiates calls, runs 10 campaign types, executes follow-up sequences, recovers no-shows, reactivates cold leads, chases unsigned quotes, and handles appointment reminders — all proactively.

The outbound engine is what separates Recall Touch from every AI receptionist on the market. Competitors answer calls. Recall Touch answers calls AND proactively chases revenue.

### Category: AI Revenue Operations

NOT an AI receptionist. NOT an answering service. NOT a CRM. NOT a dialer. NOT a phone system. The AI system that captures, qualifies, books, follows up, recovers, and attributes every dollar of revenue — automatically.

### Who It Is For

**Primary:** Single-location service businesses with 50–500+ inbound calls/month — dental, med spa, legal, HVAC, roofing, plumbing, real estate, and similar appointment-based businesses.

**Secondary:** Sales teams, SDR teams, setters, closers, and agencies running outbound campaigns.

**Tertiary:** Solo professionals, consultants, and self-employed individuals who lose revenue from inconsistent follow-up.

### Core Loop

Missed Call → AI Answers → Captures Lead → Books Appointment → Confirms via SMS → Reminds 24h + 1h Before → If No-Show: Recovery Sequence → If Attended: Review Request → If Cold Lead: Reactivation Campaign → Revenue Recovered (measured, displayed, proven)

### Three Modes

The product adapts to three user types through a mode system. Same engine, different defaults.

- **Solo Mode** — Simplified dashboard, personal follow-ups, missed-call capture, simple ROI view. For self-employed professionals.
- **Sales Mode** — Pipeline view, lead routing, sequences + nudges, speed-to-lead metrics, response-time visibility. For SDR teams and setters.
- **Business Mode (Default)** — Revenue recovered hero metric, needs-attention queue, booking + reminders, recovery workflows. For service businesses.

---

## PART 1: VERIFIED TECH STACK

These are the EXACT dependencies from package.json. Do not introduce alternatives unless explicitly directed.

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js App Router | 16.1.6 | Turbopack enabled. `turbopack.root: __dirname` in next.config.ts |
| UI | React | 19.2.3 | |
| Language | TypeScript | 5 | 0 compiler errors as of March 18, 2026 |
| Styling | Tailwind CSS 4 | via @tailwindcss/postcss | Uses `@theme` directives in globals.css, NOT tailwind.config.js |
| CSS System | CSS Variables | globals.css (618 lines) | Complete design system with light theme |
| Design Tokens | `src/lib/design-tokens.ts` | | JS exports for charts/components |
| Database | Supabase PostgreSQL + RLS | @supabase/supabase-js 2.95.3 + @supabase/ssr 0.8.0 | Also uses `pg` for direct queries |
| Auth | Supabase Auth + HMAC-SHA256 cookies | | 30-day TTL, timing-safe comparison |
| Payments | Stripe | 20.3.1 (server) + @stripe/stripe-js 8.7.0 (client) | Subscriptions + metered usage |
| Voice Orchestration | Vapi | | Phase 1. Phase 2 = Pipecat |
| TTS | Deepgram Aura-2 | | |
| STT | Deepgram Nova-2 | | |
| Premium TTS | ElevenLabs | 1.59.0 | Voice cloning on Business+ |
| LLM | Anthropic Claude + OpenAI | | Claude Haiku 4.5 for voice reasoning |
| Telephony | Twilio | | Voice + SMS + Verify |
| Cache/Rate Limit | Upstash Redis | @upstash/ratelimit 2.0.8 + @upstash/redis 1.37.0 + ioredis 5.9.2 | |
| Animation | Framer Motion | 12.35.2 | |
| Icons | Lucide React | 0.575.0 | |
| Charts | Recharts | 3.8.0 | |
| Flow Builder | @xyflow/react | 12.10.1 | Agent flow builder |
| Drag & Drop | @dnd-kit | core 6.3.1 + sortable 10.0.0 | |
| i18n | next-intl | 4.8.3 | Active throughout. Translation keys required for new UI. |
| Email | Resend | | Transactional emails |
| Analytics | PostHog | posthog-js 1.361.0 + posthog-node 5.21.2 | + Vercel Analytics + Speed Insights |
| Error Tracking | Sentry | @sentry/nextjs 10.44.0 | client + server + edge configs |
| Forms | Native React state + Zod | zod 4.3.6 | **react-hook-form is NOT used.** |
| Toasts | Sonner | 2.0.7 | |
| Date | date-fns | 4.1.0 | |
| Utilities | clsx 2.1.1, tailwind-merge 3.5.0 | | `cn()` helper in `src/lib/cn.ts` |

---

## PART 2: DESIGN SYSTEM

### 2.1 CSS Variables (Source of Truth: globals.css)

**Backgrounds:**
- `--bg-primary: #FAFAF8` (warm white — marketing + app)
- `--bg-surface: #FFFFFF` (cards, panels)
- `--bg-elevated: #FFFFFF`
- `--bg-hover: #F3F4F6`
- `--bg-inset: #F9FAFB`

**Accent Colors:**
- `--accent-primary: #0D6E6E` (teal — buttons, links, active states)
- `--accent-primary-hover: #0A5A5A`
- `--accent-primary-subtle: rgba(13, 110, 110, 0.06)` (backgrounds)
- `--accent-secondary: #16A34A` (green — success, revenue, approval)
- `--accent-warning: #F59E0B` (amber)
- `--accent-danger: #DC2626` (red — errors, destructive actions)

**Text:**
- `--text-primary: #1A1A1A`
- `--text-secondary: #6B7280`
- `--text-tertiary: #9CA3AF`
- `--text-inverse: #FFFFFF`

**Borders:**
- `--border-default: #E5E7EB`
- `--border-hover: #D1D5DB`
- `--border-active: #0D6E6E`

**Card System:**
- `--card-border: #E5E7EB`
- `--card-padding: 32px`
- `--card-radius: 16px`
- `--radius-btn: 12px`

**Typography:**
- `--font-h1: 48px`, `--font-h2: 32px`, `--font-h3: 22px`, `--font-body: 16px`, `--font-small: 13px`
- `--line-height-body: 1.6`
- `--tracking-tight: -0.02em`

**Fonts (loaded in layout.tsx):**
- DM Sans (`--font-body-sans`) — body text, UI (400, 500, 700)
- Playfair Display (`--font-serif`) — marketing headlines (400, 500, 600)
- Geist Mono (`--font-geist-mono`) — code
- JetBrains Mono (`--font-jetbrains-mono`) — monospace UI elements

### 2.2 Marketing vs App Theme

**Marketing pages (/, /pricing, /demo, /industries/*, /compare/*, /blog/*):**
- Dark background: CSS variables are overridden in `.marketing-section` classes
- Gradients: `--gradient-hero`, `--gradient-cta-section`, `--gradient-problem-bg` are set per section
- Card styles: `card-marketing` class with subtle white/10% borders on dark backgrounds

**App dashboard (/app/*):**
- Light background: `--bg-primary: #FAFAF8`, `--surface: #FFFFFF`
- All app CSS variables use the light-theme values defined at `:root` in globals.css
- **CRITICAL: The dashboard is LIGHT themed.** Do not use zinc-900, black/30, or any dark background in /app/* pages.

### 2.3 Design Tokens (JS — for Recharts and programmatic use)

```typescript
import { colors, typography, spacing } from '@/lib/design-tokens';
// colors.accent.teal = "#0D6E6E"
// colors.status.success = "#16A34A"
// typography.heading.h1.size = "clamp(2rem, 4vw, 3.5rem)"
// spacing.cardPadding = "24px"
```

**Known inconsistency:** design-tokens.ts uses border.default = "#E5E5E0" while globals.css uses #E5E7EB. Use globals.css values for all CSS. Use design-tokens.ts values only when passing to Recharts or inline styles in JS.

---

## PART 3: PRICING & BILLING

### 3.1 Plans (Source of Truth: billing-plans.ts)

| Plan | Monthly | Annual | Minutes | Overage | Agents | Seats | Phones | Daily Outbound | SMS Cap |
|------|---------|--------|---------|---------|--------|-------|--------|---------------|---------|
| Solo | $49 | $39/mo | 100 | $0.30/min | 1 | 1 | 1 | 10 | 500 |
| Business | $297 | $247/mo | 500 | $0.20/min | 3 | 5 | 3 | 100 | 2,000 |
| Scale | $997 | $847/mo | 3,000 | $0.12/min | 10 | ∞ | 10 | 500 | 10,000 |
| Enterprise | Custom | Custom | ∞ | Negotiated | ∞ | ∞ | ∞ | ∞ | ∞ |

### 3.2 Feature Gates (18 flags in BillingPlan.features)

| Feature | Solo | Business | Scale | Enterprise |
|---------|------|----------|-------|-----------|
| appointmentBooking | ✓ | ✓ | ✓ | ✓ |
| missedCallRecovery | ✓ | ✓ | ✓ | ✓ |
| noShowRecovery | ✗ | ✓ | ✓ | ✓ |
| reactivationCampaigns | ✗ | ✓ | ✓ | ✓ |
| outboundCampaigns | ✗ | ✓ | ✓ | ✓ |
| outboundPowerDialer | ✗ | ✗ | ✓ | ✓ |
| industryTemplates | ✗ | ✓ | ✓ | ✓ |
| smsEmail | ✓ | ✓ | ✓ | ✓ |
| voiceFollowUp | ✗ | ✓ | ✓ | ✓ |
| revenueAnalytics | ✗ | ✓ | ✓ | ✓ |
| advancedAnalytics | ✗ | ✗ | ✓ | ✓ |
| crmWebhook | ✗ | ✓ | ✓ | ✓ |
| nativeCrmSync | ✗ | ✗ | ✓ | ✓ |
| apiAccess | ✗ | ✗ | ✓ | ✓ |
| premiumVoices | ✗ | ✓ | ✓ | ✓ |
| prioritySupport | ✗ | ✗ | ✓ | ✓ |
| whiteLabel | ✗ | ✗ | ✗ | ✓ |
| sso | ✗ | ✗ | ✗ | ✓ |

**When a user attempts a gated action:** Show an upgrade prompt with the plan required and the specific benefit. Example: "No-show recovery is available on Business ($297/mo). Upgrade to automatically recover missed appointments."

### 3.3 Voice Tier Limits (voice/billing.ts)

| Tier | Voice Minutes | Voice Clones | A/B Tests | Concurrent Calls | Voices Available | Premium Voices |
|------|-------------|-------------|-----------|-----------------|-----------------|---------------|
| Solo | 100 | 0 | 0 | 2 | 6 | ✗ |
| Business | 500 | 3 | 2 | 10 | 40 | ✓ |
| Scale | 3,000 | 10 | 5 | 25 | 40 | ✓ |
| Enterprise | ∞ | ∞ | ∞ | 100 | 40 | ✓ |

**Voice overage rates:** Solo $0.30/min, Business $0.20/min, Scale $0.12/min, Enterprise negotiated. Clone overage: $15/mo/slot. A/B test overage: $5/mo/test.

### 3.4 Usage Warning System

The UnifiedDashboard already tracks `minutes_used` and `minutes_limit`. Implement:
- **80% threshold:** Amber progress bar + in-app banner: "You've used {used}/{total} minutes this month. [Upgrade →]"
- **100% threshold:** Red progress bar + banner: "You've exceeded your included minutes. Additional usage: ${rate}/min. [Upgrade →]"
- **Email notification:** Send via Resend when workspace crosses 80% and 100%. Add to the `usage-alerts` cron (runs daily at 6 AM).

### 3.5 Billing Rules

- `billing-plans.ts` is the SINGLE source of truth for all tier data. Never hardcode tier names, rates, or limits in any other file.
- `BILLING_PLAN_ORDER: ["solo", "business", "scale"]` — display order excludes enterprise.
- `DEFAULT_PLAN: "business"` — new workspaces default to Business.
- All prices in billing-plans.ts are in CENTS (4900 = $49.00). Display prices in constants.ts PRICING_TIERS are strings ("$49").
- Overage charges are created as Stripe invoice items via `reportUsageOverage()` in overage.ts.

---

## PART 4: APP ARCHITECTURE

### 4.1 Sidebar Navigation (AppShellClient.tsx)

9 items, no additions:

| # | Path | Label | Icon | i18n Key |
|---|------|-------|------|---------|
| 1 | /app/dashboard | Dashboard | LayoutList | nav.dashboard |
| 2 | /app/calls | Calls | PhoneCall | nav.calls |
| 3 | /app/contacts | Contacts | Users | nav.contacts |
| 4 | /app/inbox | Inbox | MessageSquare | nav.inbox |
| 5 | /app/calendar | Calendar | Calendar | nav.calendar |
| 6 | /app/follow-ups | Follow-Ups | ListOrdered | *(hardcoded — needs i18n key)* |
| 7 | /app/campaigns | Campaigns | Megaphone | nav.campaigns |
| 8 | /app/analytics | Analytics | BarChart3 | nav.analytics |
| 9 | /app/settings | Settings | Settings | nav.settings |

**Fix needed:** Follow-Ups label is hardcoded as "Follow-Ups" instead of using `t("nav.followUps")`. Add the i18n key.

**Mobile:** 3-tab bottom nav (Dashboard, Calls, Inbox) + More overflow (Contacts, Calendar, Follow-Ups, Campaigns, Analytics, Settings). No duplicate Inbox bug — verified.

**Keyboard:** Cmd+K opens CommandPalette (dynamically imported, SSR disabled).

**Sidebar collapse:** Persists to localStorage key `rt_sidebar` ("collapsed" or absent).

### 4.2 Dashboard (UnifiedDashboard.tsx)

**Summary type:**
```typescript
type Summary = {
  revenue_recovered_cents: number;
  revenue_trend_pct: number;
  calls_answered: number;
  appointments_booked: number;
  follow_ups_sent: number;
  minutes_used: number;
  minutes_limit: number;
  needs_attention: { id: string; name: string; reason: string; phone?: string | null }[];
  activity: { id: string; at: string; line: string }[];
  campaigns: { id: string; name: string; status: string; enrolled: number; booked: number }[];
};
```

**Layout:**
1. **Hero metric:** Revenue Recovered (green, large, formatted as USD, with trend % badge)
2. **Quick stats row:** Calls answered, Appointments booked, Follow-ups sent
3. **Minutes usage bar:** Progress bar colored by threshold (green <80%, amber 80–99%, red 100%+). Shows `{used}/{limit} min used`.
4. **Needs Attention queue:** List of contacts needing action (missed calls, no-shows, hot leads). Each shows name, reason, phone. Click to call via `/api/outbound/call`.
5. **Campaign overview:** Active campaigns with enrollment count and bookings.
6. **Activity feed:** Recent events with timestamp and description.

**API:** GET `/api/dashboard/summary?workspace_id={id}` with credentials.

**CRITICAL THEME NOTE:** The dashboard component currently uses dark-theme Tailwind classes (zinc-900, zinc-800, black/30, black/20). These need to be systematically replaced with light-theme CSS variables:
- `bg-zinc-900` → `bg-[var(--bg-surface)]`
- `bg-zinc-900/50` → `bg-[var(--bg-surface)]`
- `bg-black/30` → `bg-[var(--bg-inset)]`
- `bg-black/20` → `bg-[var(--bg-hover)]`
- `border-zinc-800` → `border-[var(--border-default)]`
- `text-white` → `text-[var(--text-primary)]`
- `text-white/70` → `text-[var(--text-secondary)]`
- `text-white/50` → `text-[var(--text-tertiary)]`
- `text-zinc-400` → `text-[var(--text-tertiary)]`
- `text-zinc-500` → `text-[var(--text-secondary)]`

Apply this mapping to ALL /app/* components. The marketing site stays dark. The app is light.

### 4.3 Contact Timeline (/app/contacts/[id]/page.tsx)

**TimelineEvent type:**
```typescript
type TimelineEvent = {
  id: string;
  type: "call" | "message" | "booking" | "workflow" | "campaign";
  created_at: string;
  direction?: string | null;
  channel?: string | null;
  status?: string | null;
  content?: string | null;
  summary?: string | null;
  outcome?: string | null;
  duration_seconds?: number | null;
  scheduled_at?: string | null;
  service_type?: string | null;
  estimated_value?: number | null;
  attribution_source?: string | null;
  current_step?: number | null;
};
```

**Layout:** Left (3/4) vertical timeline ordered by created_at DESC. Right (1/4) contact info card with name, phone, email, company, state badge, tags, total_revenue_attributed, opt_out status, and quick-action buttons (Call, Text, Add to Workflow, Edit).

**Icons by event type:** Call → PhoneCall, Message → MessageSquare, Booking → CalendarClock, Workflow → RefreshCw, Campaign → Megaphone.

### 4.4 Campaign Create Wizard (/app/campaigns/create/page.tsx)

**10 campaign types:**
1. `speed_to_lead` — Text in 5 min, call if no reply
2. `lead_qualification` — Qualify interest and book
3. `appointment_setting` — Call and text until scheduled
4. `appointment_reminder` — 24h and 1h reminders
5. `no_show_recovery` — Recover missed appointments
6. `reactivation` — Re-engage inactive contacts
7. `quote_chase` — Follow up on pending quotes
8. `review_request` — Request review after completion
9. `cold_outreach` — Reach list with controlled cadence
10. `custom` — Build custom sequence

**5-step wizard:** Type → Audience → Sequence → Schedule → Review.

**Each sequence step:** channel (sms/call/email), delayHours, template with merge fields ({firstName}, {businessName}, {appointmentDate}, {serviceName}).

**Default templates exist** per campaign type. Example: speed_to_lead default = SMS (0h) → Call (0.25h) → SMS (2h).

### 4.5 Follow-Up Sequence Creator (/app/follow-ups/create/page.tsx)

**Triggers (8 options):**
- call_outcome:lead_captured
- call_outcome:voicemail_left
- call_outcome:no_answer
- call_outcome:booked
- booking_status:confirmed
- booking_status:no_show
- booking_status:completed
- manual

**Step structure:**
```typescript
type Step = {
  channel: "sms" | "call" | "email";
  delayAmount: number;
  delayUnit: "minutes" | "hours" | "days";
  template: string;
  stopIfReply: boolean;
  stopIfBooked: boolean;
};
```

**Validation:** Name required, at least 1 step, all templates non-empty.

### 4.6 Outbound Settings (/app/settings/outbound/page.tsx)

**OutboundConfig structure:**
```typescript
{
  callingHours: { start: "09:00", end: "20:00", timezone: string, respectRecipientTimezone: true },
  voicemailBehavior: "leave_message" | "hang_up_silently" | "ai_generated",
  voicemailScript: string,
  dailyOutboundLimit: 50,
  suppression: {
    maxCallsPerContactPerDay: 1,
    maxCallsPerContactPerWeek: 3,
    maxSmsPerContactPerDay: 2,
    cooldownAfterDeclineDays: 7,
    cooldownAfterConversionDays: 30
  },
  dncCompliance: { enabled: true }
}
```

**API:** GET/PATCH `/api/settings/workspace` with outbound_config JSONB field.

### 4.7 Settings Pages (16+ sub-pages under /app/settings/)

agent, billing, business, call-rules, compliance, errors, industry-templates, integrations, lead-scoring, notifications, outbound, phone, team, voices, plus activity and layout.

### 4.8 Inbox (/app/inbox/page.tsx)

Three-panel layout: conversation list (left), message thread (center), contact detail (right). Supports SMS, email, WhatsApp channels. Reply composition, search, filter by channel/status. 30-second polling for new messages.

---

## PART 5: FOLLOW-UP ENGINE

### 5.1 Architecture (follow-up-engine.ts)

**Core types:**
```typescript
FollowUpSequence { id, workspace_id, name, trigger_type, is_active, created_at, updated_at }
SequenceStep { id, sequence_id, step_order, channel, delay_minutes, template_content, conditions }
SequenceEnrollment { id, sequence_id, contact_id, workspace_id, status, current_step, enrolled_at, next_step_due_at }
```

**Status values:** active, completed, cancelled, paused.

**Execution:** Cron `process-sequences` runs every 5 minutes. Queries enrollments where `next_step_due_at <= NOW()` and `status = 'active'`. Processes each step based on channel (SMS via Twilio, Call via outbound engine, Email via Resend). Updates current_step and computes next next_step_due_at. If final step reached, sets status to 'completed'.

**Stop conditions:** stopIfReply (check for inbound message from contact since enrollment), stopIfBooked (check for booking from contact since enrollment).

### 5.2 Legacy Engine (engine.ts — DEPRECATED)

File exists with `@deprecated Use follow-up-engine.ts instead` at top. Uses hardcoded sequences and state-vector logic. Do not import in new code. Do not delete — kept for reference only.

---

## PART 6: VOICE ARCHITECTURE

### 6.1 Phase 1 Stack (Current)

Vapi orchestration → Deepgram Aura-2 (TTS) + Deepgram Nova-2 (STT) → Claude Haiku 4.5 (reasoning) → Twilio (telephony).

**Cost:** ~$0.099/min. Breakdown: Vapi $0.035 + Deepgram STT $0.015 + Deepgram TTS $0.015 + Claude $0.024 + Twilio $0.010.

### 6.2 Phase 2 Target

Replace Vapi with Pipecat for direct WebRTC control. Target cost: $0.058/min. Margin improvement: Scale tier goes from 70% to 83%.

### 6.3 Voice Presets

Solo tier: 6 standard voices (warm female, professional female, warm male, professional male, neutral, energetic).
Business+: 40 voices including industry-optimized (dental front desk, legal intake, HVAC dispatcher, med spa concierge).
Voice cloning: Business 3 slots, Scale 10 slots, Enterprise unlimited.

### 6.4 Call Recording & Consent

Two-party consent states require disclosure. Agent greeting must include configurable consent statement. Recording toggle per workspace in compliance settings. All recordings encrypted, access-controlled by workspace owner.

---

## PART 7: HOMEPAGE (10 SECTIONS + NAVBAR + FOOTER)

### Current section order (page.tsx):

1. **Navbar** — Brand, Product/Solutions/Pricing/Demo links, Sign In, primary CTA
2. **Hero** — "Stop Losing Revenue to Missed Calls And Broken Follow-Up." + revenue card + trust signals
3. **ProblemStatement** — "Missed Calls Cost You Money. Here's How Much." + industry loss calculator
4. **HowItWorks** — 3-step flow (forward calls → AI answers → you get notified)
5. **HomepageRoiCalculator** — 3 sliders (monthly calls, missed %, avg job value) → recovery estimate
6. **Industries** — 5 industries + custom card
7. **Features** — "Not Just Another AI Receptionist" + comparison + 5 differentiators
8. **PricingPreview** — 4 tiers with monthly/annual toggle
9. **FinalCTA** — "Every Day Without Recall Touch Is Revenue Walking Out the Door."
10. **Footer**

### Recommended section reorder (for higher conversion):

Move ROI Calculator to position 4 (immediately after ProblemStatement). When a visitor sees they're losing $4,200/month, the calculator right below showing they could recover $2,940 creates immediate urgency. HowItWorks then answers "how" after the desire is established.

New order: Navbar → Hero → ProblemStatement → **ROI Calculator** → HowItWorks → Industries → Features → PricingPreview → FinalCTA → Footer.

### FAQ Schema (in page.tsx)

6 FAQ items embedded as JSON-LD FAQPage schema. **Fix needed:** Question 3 still says "What does 'Revenue Execution OS' mean?" — update to match the HomepageFAQ.tsx component which now says "How is this different from an AI receptionist?"

---

## PART 8: CRON JOBS (13 ACTIVE IN VERCEL.JSON)

| Path | Schedule | Purpose |
|------|----------|---------|
| /api/cron/core | */2 * * * * | Core processing loop |
| /api/cron/speed-to-lead | */2 * * * * | Fast follow-up on new leads |
| /api/cron/heartbeat | */5 * * * * | Health check |
| /api/cron/weekly-trust | 0 9 * * 1 | Weekly digest email (Mondays 9 AM) |
| /api/cron/trial-reminders | 0 9 * * * | Trial expiration nudges |
| /api/cron/first-day-check | 0 10 * * * | Day-1 onboarding check |
| /api/cron/day-3-nudge | 0 11 * * * | Day-3 engagement nudge |
| /api/cron/phone-billing | 0 3 1 * * | Monthly phone billing |
| /api/cron/usage-overage | 0 4 1 * * | Monthly overage calculation |
| /api/cron/daily-metrics | 15 0 * * * | Daily metrics rollup |
| /api/cron/weekly-digest | 0 8 * * 1 | Weekly digest (Mondays 8 AM) |
| /api/cron/process-sequences | */5 * * * * | Follow-up sequence execution |
| /api/cron/usage-alerts | 0 6 * * * | Usage threshold notifications |

**103 cron route files exist in code.** Only 13 are scheduled. The remaining 90 are enterprise/operational features (settlement, attestation, procurement, governance, protocol-density, proof-capsules, etc.). Do NOT add them to vercel.json. Do NOT delete the code files. Leave them as dormant.

---

## PART 9: REDIRECTS (76 IN NEXT.CONFIG.TS)

All `/dashboard/*` routes redirect to `/app/*` equivalents. All `/onboarding/*` routes redirect to `/activate`. Catch-all: `/dashboard/:path*` → `/app` (permanent).

**Do not add more redirects.** The full set already exists and is comprehensive.

---

## PART 10: ENVIRONMENT VARIABLES

**Tier 1 — App won't start:** SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SESSION_SECRET, STRIPE_SECRET_KEY, CRON_SECRET, NEXT_PUBLIC_APP_URL

**Tier 2 — Features break:** STRIPE_WEBHOOK_SECRET, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, VAPI_API_KEY, NEXT_PUBLIC_VAPI_PUBLIC_KEY, ANTHROPIC_API_KEY, REDIS_URL, RESEND_API_KEY

**Tier 3 — Enhanced features:** ELEVENLABS_API_KEY, DEEPGRAM_API_KEY, OPENAI_API_KEY, GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, NEXT_PUBLIC_POSTHOG_KEY, NEXT_PUBLIC_POSTHOG_HOST, SENTRY_DSN, SENTRY_AUTH_TOKEN

**Validation:** `instrumentation.ts` hard-fails in production if Tier 1 vars are missing. Warns in development. This is correct — do not change.

---

## PART 11: WHAT TO BUILD NEXT (PRIORITY ORDER)

### Priority 1: Dashboard Light Theme (Day 1–2)

Replace ALL dark Tailwind classes in UnifiedDashboard.tsx and all /app/* components with CSS variable equivalents. The mapping is defined in Part 4.2. This is the single highest-impact visual change. Service business owners expect clean, light dashboards.

### Priority 2: Fix FAQ Schema Mismatch (Day 1)

In `src/app/page.tsx`, update FAQ JSON-LD question 3 from "What does 'Revenue Execution OS' mean?" to "How is this different from an AI receptionist?" to match the component.

### Priority 3: Add Follow-Ups i18n Key (Day 1)

In AppShellClient.tsx line 79, change `label: "Follow-Ups"` to `label: t("nav.followUps")`. Add the key to all i18n message files.

### Priority 4: Homepage Section Reorder (Day 2)

In page.tsx, move `<HomepageRoiCalculator />` to after `<ProblemStatement />` and before `<HowItWorks />`.

### Priority 5: Social Proof (Day 2–5)

Create `/results` page. Add customer logos or "Now accepting early customers" badge to homepage if no real logos yet. Add founder photo and bio to footer. This is the #1 conversion blocker.

### Priority 6: Product Tour (Day 3–5)

Add guided tooltip tour on first login. Show: revenue metric → needs attention queue → sidebar nav → campaigns → settings. Use a lightweight tooltip library or custom implementation with localStorage tracking.

### Priority 7: Full QA Run (Day 5–10)

Run all 50 QA tests from V8 Part 18, all 25 edge cases from V8 Part 19, and all 20 fallback behaviors from V8 Part 20. Document pass/fail. Fix all failures.

### Priority 8: Playwright E2E Tests (Day 5–10)

Critical flows: Signup → Onboarding → First call → Dashboard shows revenue. Campaign create → Launch → Contact receives touch. Stripe checkout → Upgrade → Feature gates unlock.

---

## PART 12: NON-NEGOTIABLE RULES

1. **Revenue Recovered is the hero metric.** It appears on the dashboard, in the weekly digest, in the pricing page, in the cancellation save offer. Everything proves ROI.

2. **No fake data.** No animated counters, no fabricated testimonials, no invented statistics. If we don't have real data, say "Now accepting early customers." The HeroRevenueWidget is labeled "Example dashboard" — keep it that way.

3. **Light theme on app.** No dark mode in /app/*. Dark theme is for marketing pages only.

4. **One onboarding path.** `/activate` only. No alternatives, no branching. next.config.ts redirects everything to /activate.

5. **One dashboard system.** `/app/*` is canonical. `/dashboard/*` redirects. No exceptions.

6. **billing-plans.ts is the source of truth.** All other files import from it. Never hardcode tier names, rates, or limits.

7. **Outbound respects safety.** Every outbound call checks: opt-out status, suppression list, daily limit, business hours, timezone. No exceptions. One TCPA violation costs more than a year of revenue.

8. **Every call outcome triggers a follow-up.** No call should end without the system knowing what happens next. Booked → reminder. Missed → recovery. Lead → qualification. No-show → chase.

9. **Standard billing language.** "Plan," "subscription," "upgrade," "downgrade." Not "coverage," "handling," "economic activation."

10. **Progressive disclosure.** New users see 8–10 core pages. Advanced features unlock over time or by tier.

11. **Mobile-first on app.** Bottom nav, touch targets, responsive layouts. Service business owners check their dashboard on their phone.

12. **Test every billing path.** Overage calculation, proration on upgrade/downgrade, trial expiration, dunning on failed payment, cancellation.

13. **Respect i18n.** All new UI strings must use `t("key")` translation keys matching the existing pattern. Do not hardcode English strings in JSX.

14. **Tailwind v4 rules.** Uses `@theme` directives in globals.css. No tailwind.config.js. Use CSS variables for theming.

15. **Forms use native state + Zod.** Do not introduce react-hook-form.

16. **529 tests must stay green.** Run tests before and after any change. Do not ship with failures.

---

*End of V10 Cursor Master Prompt. This is the definitive specification. Execute in order. Test everything. Ship it.*
