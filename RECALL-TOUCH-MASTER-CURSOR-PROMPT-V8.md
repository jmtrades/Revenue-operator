# RECALL TOUCH — MASTER CURSOR PROMPT (V8)

You are the engineering team for Recall Touch. This is your COMPLETE specification — strategy, audit findings, bug fixes, product architecture, inbound engine, outbound engine, follow-up engine, database schema, API routes, UI/UX, voice stack, billing, SEO, copy, QA, and deployment — consolidated into one document from four prior documents (V6 Strategy, V7 Cursor Prompt, V7 Production Audit, and full codebase analysis of 250+ routes, 491 API endpoints, 201 migrations, and 70+ cron jobs).

Follow it exactly. Do not improvise. Do not add features not listed. Do not use placeholder data that looks real. Do not skip steps. Work in the exact order specified.

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

### Who It Is For

**Primary:** Single-location service businesses with 50-500+ inbound calls/month — dental, med spa, legal, HVAC, roofing, plumbing, real estate, and similar appointment-based businesses.

**Secondary:** Multi-location operators, agencies managing service businesses, and sales teams with high-ticket offerings.

**Tertiary:** Solo professionals, consultants, and self-employed individuals who lose revenue from inconsistent follow-up.

### Why It Wins

1. **No competitor does automated multi-step follow-up.** Every AI receptionist answers the call. Nobody owns what happens AFTER the call — the recovery sequence, the no-show chase, the reactivation campaign. This is the moat.
2. **Revenue attribution.** The dashboard shows exactly how much money the system recovered. This justifies the price and prevents churn.
3. **Industry-specific workflows.** Pre-built sequences for dental, legal, HVAC, med spa, and roofing that work on day one.

### Core Loop

Missed Call → AI Answers → Captures Lead → Books Appointment → Confirms via SMS → Reminds 24h + 1h Before → If No-Show: Recovery Sequence → If Attended: Review Request → If Cold Lead: Reactivation Campaign → Revenue Recovered (measured, displayed, proven)

---

## PART 1: CRITICAL BUGS — FIX BEFORE ANYTHING ELSE

These are confirmed bugs discovered during the production audit of the live codebase. Fix every one of these before building new features.

### BUG 1: Two Parallel Dashboard Systems
**Files:** `src/app/app/*` (40+ pages) AND `src/app/dashboard/*` (80+ pages)
**Problem:** Two completely separate dashboard systems exist. Users can land on either one. `/dashboard` shows "handoff lists" and "operational capsules." `/app` shows activity feeds.
**Fix:** Keep `/app/*` as canonical. Add redirects in `next.config.ts` for ALL `/dashboard/*` routes to their `/app/*` equivalents. Delete or archive all `/dashboard/*` page files after redirects are confirmed working.

### BUG 2: Root Metadata Says Wrong Category
**File:** `src/app/layout.tsx`
**Problem:** Title says "Recall Touch — AI Phone Calls, Handled" and description leads with technology, not outcomes.
**Fix:** Change title to: `Recall Touch — AI Revenue Recovery for Service Businesses`. Change description to: `Recover lost revenue from missed calls, no-shows, and broken follow-up. AI answers every call, books appointments, and runs automated recovery sequences. See results in your first week.`

### BUG 3: Dark Theme on App Dashboard
**File:** `src/app/layout.tsx`
**Problem:** `className="dark"` is set on the `<html>` element. Service business owners (dentists, HVAC techs, lawyers) use light interfaces. Dark theme feels like a developer tool.
**Fix:** Remove `className="dark"` from `<html>`. Set app background to warm white `#FAFAF8`. Ensure all app components render correctly in light mode.

### BUG 4: Fake Hero Counter and Revenue Ticker
**File:** `src/components/sections/Hero.tsx`
**Problem:** Animated counter shows "12,847 Calls Answered" — this is fabricated. Revenue loss ticker shows "$8/second" — not based on real data. Both destroy trust if inspected.
**Fix:** Remove animated counter entirely. Remove revenue loss ticker. Replace hero with outcome-focused headline: "Stop Losing Revenue to Missed Calls and Broken Follow-Up" and a dashboard mockup showing "Revenue Recovered: $4,217 this month."

### BUG 5: Billing Overage Rate Conflicts
**Files:** `src/lib/billing-plans.ts` vs `src/lib/billing/overage.ts` vs `src/lib/voice/billing.ts`
**Problem:** Three different files define different overage rates and included minutes:
- `billing-plans.ts`: Solo 100min/$0.30, Business 500min/$0.20, Scale 3000min/$0.12 ← CORRECT
- `billing/overage.ts`: Solo 400min/$0.12, Growth 1500min/$0.12 ← WRONG (uses old tier names AND wrong rates)
- `voice/billing.ts`: Matches billing-plans.ts ← CORRECT
**Fix:** Update `src/lib/billing/overage.ts` to import limits and rates from `src/lib/billing-plans.ts`. Remove hardcoded values. Replace "growth" with "business" and "team" with "scale" everywhere.

### BUG 6: Sitemap Includes Private Routes
**File:** `src/app/sitemap.ts`
**Problem:** Sitemap includes `/app/*` routes (private dashboard pages) that should never be indexed by search engines.
**Fix:** Remove ALL `/app/*`, `/dashboard/*`, `/admin/*`, and `/ops/*` entries. Only include public marketing pages: `/`, `/product`, `/pricing`, `/demo`, `/industries/*`, `/compare/*`, `/about`, `/blog/*`, `/contact`, `/privacy`, `/terms`.

### BUG 7: JSON-LD Pricing Error
**File:** `src/app/layout.tsx`
**Problem:** SoftwareApplication JSON-LD shows `lowPrice: 297`. Solo plan is $49.
**Fix:** Change to `lowPrice: 49`. Verify `highPrice: 997`.

### BUG 8: Organization JSON-LD Empty Social
**File:** `src/app/layout.tsx`
**Problem:** `sameAs: []` — no social profiles linked.
**Fix:** Add actual social profile URLs (Twitter/X, LinkedIn) or remove sameAs if no profiles exist yet.

### BUG 9: Session Cookie 1-Year TTL
**File:** `src/lib/auth/session.ts`
**Problem:** Session cookie expires in 1 year. Too long for a business product handling phone data.
**Fix:** Reduce to 30 days. Add session refresh on activity (sliding window).

### BUG 10: SESSION_SECRET Fallback Disables Auth
**File:** `src/lib/auth/session.ts`
**Problem:** If `SESSION_SECRET` env var is missing, auth silently falls back to a weak default, effectively disabling security.
**Fix:** In production (`NODE_ENV=production`), throw an error and halt startup if `SESSION_SECRET` is missing. Never silently degrade.

### BUG 11: CRON_SECRET in Query Parameters
**Problem:** Cron jobs authenticate via `?secret=CRON_SECRET` in the URL, which leaks in server logs and Vercel function logs.
**Fix:** Move to `Authorization: Bearer CRON_SECRET` header. Update all cron job route handlers to check the header instead.

### BUG 12: In-Memory Rate Limiting
**File:** `src/lib/rate-limit.ts`
**Problem:** Rate limiting uses in-memory sliding window. Each Vercel serverless instance has its own counter, so limits are per-instance not per-user. Effectively broken at scale.
**Fix:** Replace with Upstash Redis rate limiting (`@upstash/ratelimit`). Use sliding window algorithm with Redis backend.

### BUG 13: Two Separate Logging Systems
**Files:** `src/lib/logger.ts` AND `src/lib/observability/logger.ts`
**Problem:** Two loggers with different formats exist. Inconsistent log output.
**Fix:** Consolidate to one. Use `src/lib/logger.ts` as canonical. Delete or redirect the other.

### BUG 14: Billing Copy Uses Non-Standard Language
**File:** `src/lib/billing-copy.ts`
**Problem:** Uses "coverage" and "handling" instead of "subscription" and "plan." Stripe receipts will say "subscription." Users see conflicting terms.
**Fix:** Replace all user-facing billing language with standard terms: "plan," "subscription," "upgrade," "downgrade."

### BUG 15: No middleware.ts for Route Protection
**Problem:** No centralized route protection. Each layout independently checks auth. Missed checks = exposed routes.
**Fix:** Create `src/middleware.ts`:
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get('revenue_session')

  // Public routes — no auth needed
  const publicPaths = ['/', '/sign-in', '/sign-up', '/activate', '/pricing', '/product', '/demo', '/about', '/contact', '/industries', '/compare', '/blog', '/privacy', '/terms', '/api/auth', '/api/billing/webhook', '/api/vapi', '/api/twilio', '/accept-invite', '/reset-password', '/forgot-password']
  if (publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Protected routes — require auth
  if (pathname.startsWith('/app') || pathname.startsWith('/admin') || pathname.startsWith('/ops')) {
    if (!session) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)']
}
```

### BUG 16: Homepage Has 19 Sections
**File:** `src/app/page.tsx`
**Problem:** 19 sections rendered via dynamic imports. Target is 10.
**Fix:** Keep only these 10 in this order: Hero, ProblemStatement, HowItWorks (recovery loop), ROICalculator, IndustrySelector, Differentiation, Proof/EarlyAccess, PricingPreview, FAQ, FinalCTA. Remove: HomepageTrustBar, HomepageTestCallCTA, HomepageModeSelector, MetricsSection, CompetitorComparison, EnterpriseComparisonCard, SocialProof, and any others beyond the 10.

### BUG 17: Multiple Onboarding Paths
**Problem:** `/activate` (5-step wizard), `/onboarding` (5-step alternative), `/app/onboarding`, and governance onboarding all exist.
**Fix:** Keep ONLY `/activate`. Redirect `/onboarding` → `/activate`. Redirect `/app/onboarding` → `/activate`. Delete governance onboarding steps.

### BUG 18: Operational Vocabulary in UI
**Problem:** Dashboard shows "handoff list," "operational capsule," "retention intercept," "economic gravity," "capsule data." Users will not understand.
**Fix:** Replace all user-facing operational terms:
- "handoff list" → "needs attention"
- "operational capsule" → "activity summary"
- "retention intercept" → "follow-up"
- "economic gravity" → "revenue impact"
- "capsule data" → "call details"
- "protocol" → "workflow"
- "exposure" → "usage"
- "reliance" → "integrations"

### BUG 19: Two Sequence Engines
**Files:** `src/lib/sequences/engine.ts` AND `src/lib/sequences/follow-up-engine.ts`
**Problem:** Two separate sequence execution systems exist. They likely conflict.
**Fix:** Consolidate into one engine. Use `engine.ts` as the canonical implementation. Port any unique logic from `follow-up-engine.ts` into it. Delete the duplicate.

### BUG 20: Environment Validation Doesn't Halt
**File:** `src/instrumentation.ts`
**Problem:** Boot-time validation warns about missing env vars but doesn't halt. App can start without Stripe keys, Twilio keys, etc. and silently fail.
**Fix:** In production, make critical env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`) hard-fail. Throw at startup if missing.

---

## PART 2: TECH STACK

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js App Router | 16 |
| UI | React | 19 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 4 |
| Database | Supabase PostgreSQL + RLS | Latest |
| Auth | Supabase Auth + HMAC-SHA256 session cookies | Latest |
| Payments | Stripe Subscriptions + metered usage | Latest |
| Voice (Phase 1) | Vapi + Deepgram Aura-2 TTS + Deepgram Nova-2 STT + Claude Haiku 4.5 | Current |
| Voice (Phase 2) | Pipecat + Deepgram + Claude Haiku 4.5 | Target |
| Telephony | Twilio | Latest |
| LLM (routine) | Claude Haiku 4.5 | Current |
| LLM (complex) | Claude Sonnet 4 | Current |
| TTS (default) | Deepgram Aura-2 | Current |
| TTS (premium) | ElevenLabs | Current |
| STT | Deepgram Nova-2 | Current |
| Cache/Rate Limit | Upstash Redis (ioredis) | Latest |
| Animation | Framer Motion | Latest |
| Icons | Lucide React | Latest |
| Charts | Recharts | Latest |
| Forms | react-hook-form + Zod | Latest |

---

## PART 3: DESIGN SYSTEM

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#FAFAF8` | Page background (warm white, not cold white) |
| `--bg-card` | `#FFFFFF` | Card backgrounds |
| `--text-primary` | `#1A1A1A` | Headings, body text |
| `--text-secondary` | `#6B7280` | Supporting text, labels |
| `--brand` | `#0D6E6E` | Primary teal accent, buttons, links |
| `--brand-hover` | `#0A5A5A` | Button hover state |
| `--success` | `#16A34A` | Revenue recovered, positive metrics |
| `--warning` | `#F59E0B` | Approaching limits, needs attention |
| `--error` | `#DC2626` | Missed calls, failures, alerts |
| `--border` | `#E5E7EB` | Card borders, dividers |
| `--shadow` | `0 1px 3px rgba(0,0,0,0.05)` | Card shadow |

### Typography
- **Headings:** Inter Bold. H1: clamp(2.25rem, 4vw, 3.5rem). H2: clamp(1.75rem, 3vw, 2.5rem). H3: 1.25-1.5rem.
- **Body:** Inter Regular. 1rem (16px) base. 1.6 line-height.
- **Data/Metrics:** JetBrains Mono for numbers and metrics.

### Spacing
- 4px base unit. All spacing in multiples of 4: 8, 12, 16, 24, 32, 48, 64, 96.
- Section padding: 96px vertical (desktop), 48px (mobile).
- Card padding: 24px internal. 16px gap between cards.
- Max content width: 1200px centered.

### Cards
- White background, 1px border `#E5E7EB`, 4px border-radius, subtle shadow.
- Hover: slight shadow increase, no color change.
- No rounded-2xl. No excessive border-radius. Sharp and professional.

### Anti-Patterns (NEVER Do These)
1. No gradient mesh backgrounds — use flat warm white.
2. No floating abstract shapes or blobs — use real screenshots.
3. No bento grid layouts — use clean left-text/right-image or full-width.
4. No "powered by AI" badges everywhere.
5. No dark mode on app (light only).
6. No animated particle backgrounds.
7. No AI-generated testimonial headshots.
8. No feature grids with 20+ checkmarks.
9. No fake social proof ("Join 10,000+ businesses").
10. No emojis in professional UI.

---

## PART 4: PRICING & BILLING

### Plan Structure

| | Solo | Business (★) | Scale | Enterprise |
|---|------|-------------|-------|-----------|
| Monthly | $49/mo | $297/mo | $997/mo | Custom |
| Annual | $39/mo | $247/mo | $847/mo | Custom |
| Voice Minutes | 100/mo | 500/mo | 3,000/mo | Unlimited |
| Overage Rate | $0.30/min | $0.20/min | $0.12/min | Negotiated |
| AI Agents | 1 | 3 | 10 | Unlimited |
| Phone Numbers | 1 | 3 | 10 | Custom |
| Follow-up Workflows | 3 basic | Unlimited + packs | Unlimited + custom | Unlimited |
| Team Seats | 1 | 5 | Unlimited | Unlimited |
| No-Show Recovery | — | ✓ | ✓ | ✓ |
| Reactivation Campaigns | — | ✓ | ✓ | ✓ |
| Outbound Campaigns | — | ✓ (50/day) | ✓ (500/day) | Unlimited |
| SMS Monthly Cap | 200 | 2,000 | 10,000 | Custom |
| CRM Integration | — | Webhook | Native sync | Custom |
| Revenue Dashboard | Basic | Full | Advanced + benchmarks | Custom |
| Power Dialer | — | — | ✓ | ✓ |
| API Access | — | — | ✓ | ✓ |
| Premium Voices | — | — | ✓ (included) | ✓ |
| White-label | — | — | — | ✓ |

### Add-Ons
| Add-On | Price | Available On |
|--------|-------|-------------|
| Premium Voices (ElevenLabs) | $29/mo | Solo, Business |
| Custom Voice Clone | $499 setup + $49/mo | Business+ |
| Additional Phone Number | $15/mo each | All |
| HIPAA Compliance | $199/mo | Scale+ |

### Feature Gate Logic
```typescript
// src/lib/feature-gates.ts
export const FEATURE_GATES = {
  noShowRecovery: ['business', 'scale', 'enterprise'],
  reactivationCampaigns: ['business', 'scale', 'enterprise'],
  outboundCampaigns: ['business', 'scale', 'enterprise'],
  powerDialer: ['scale', 'enterprise'],
  apiAccess: ['scale', 'enterprise'],
  premiumVoices: ['scale', 'enterprise'], // or add-on
  whiteLabel: ['enterprise'],
  crmNativeSync: ['scale', 'enterprise'],
  advancedAnalytics: ['scale', 'enterprise'],
  customWorkflowBuilder: ['business', 'scale', 'enterprise'],
} as const

export function hasFeature(tier: BillingTier, feature: keyof typeof FEATURE_GATES): boolean {
  return FEATURE_GATES[feature].includes(tier)
}
```

### Billing Implementation
- Source of truth: `src/lib/billing-plans.ts` — ALL other files import from here.
- Usage tracking: `usage_events` table records every voice minute and SMS.
- Overage: Stripe metered billing on subscription, charged at period end.
- Trial: 14 days, full features, no credit card, tracked via `workspace.trial_ends_at`.
- Dunning: On `invoice.payment_failed`, email + in-app banner. 7-day grace. Then restrict.

### Unit Economics (Phase 2 Target)
| Tier | Revenue | COGS (at limit) | Gross Margin |
|------|---------|-----------------|-------------|
| Solo | $49 | $9.38 | 80.9% |
| Business | $297 | $34.95 | 88.2% |
| Scale | $997 | $191.80 | 80.8% |

---

## PART 5: VOICE ARCHITECTURE

### Phase 1 (Current): $0.099/min
| Component | Cost/min |
|-----------|----------|
| Vapi orchestration | $0.050 |
| Deepgram Aura-2 TTS | $0.022 |
| Deepgram Nova-2 STT | $0.004 |
| Claude Haiku 4.5 (80%) | $0.009 |
| Claude Sonnet 4 (20%) | $0.030 |
| Blended LLM | $0.013 |
| Twilio telephony | $0.014 |
| **Total** | **$0.099** |

### Phase 2 (Target — 90 days): $0.058/min
Replace Vapi ($0.050/min) with Pipecat ($0.005/min self-hosted).

### LLM Routing
- **Routine calls (80%):** Claude Haiku 4.5 — booking, FAQ, routing, message-taking.
- **Complex calls (20%):** Claude Sonnet 4 — complaints, negotiations, complex intake.
- **Classification:** Based on first 10 seconds of caller intent. Keywords: "complaint," "problem," "unhappy" → Sonnet. "Book," "schedule," "appointment," "how much" → Haiku.

### Quality Bar
- MOS ≥ 3.8 (out of 5.0)
- Latency ≤ 800ms (response after caller stops speaking)
- Call completion rate within 2% of the best option
- <40% of callers identify it as AI in blind test

### ElevenLabs: Premium Only
Default TTS is Deepgram Aura-2. ElevenLabs is a $29/mo add-on for Solo/Business, included on Scale.

---

## PART 6: INBOUND ENGINE

### Call Flow
```
Phone rings → Twilio routes to Vapi/Pipecat →
AI answers with business greeting →
Identifies caller intent (booking, inquiry, emergency, existing customer) →
If booking: checks calendar availability → offers slots → books → confirms via SMS →
If inquiry: captures name, phone, email, service needed, urgency → creates lead →
If emergency: transfers to designated number immediately →
If existing customer: looks up history → handles contextually →
Creates call_session record →
Triggers follow-up workflow based on outcome
```

### Call Outcomes
| Outcome | Follow-Up Triggered |
|---------|-------------------|
| `booked` | Appointment reminder sequence (24h + 1h SMS) |
| `lead_captured` | Speed-to-lead (5-min SMS) + qualification sequence |
| `transferred` | None (human handling) |
| `voicemail_left` | Missed call recovery SMS in 5 minutes |
| `no_answer` | Missed call recovery SMS in 5 minutes |
| `callback_requested` | Callback scheduling + reminder |
| `emergency_routed` | Alert to business owner |

### Agent Configuration
```typescript
interface AgentConfig {
  greeting: string           // "Thanks for calling [Business], this is our AI assistant..."
  businessName: string
  businessType: string       // dental, legal, hvac, etc.
  businessHours: BusinessHours
  afterHoursGreeting: string
  transferNumber: string     // For emergencies or human handoff
  bookingEnabled: boolean
  calendarIntegration: 'google' | 'outlook' | null
  voiceId: string           // Deepgram Aura-2 voice ID (default) or ElevenLabs
  language: 'en'            // English only at launch
  maxCallDuration: number   // Minutes, default 15
  industryPack: string      // Which industry workflows to load
}
```

---

## PART 7: OUTBOUND ENGINE

### Campaign Types
| Type | Trigger | Channel | Timing |
|------|---------|---------|--------|
| `speed_to_lead` | New lead captured | SMS → Call | SMS in 5 min, call in 15 min if no reply |
| `lead_qualification` | Lead captured, not yet qualified | Call | Within 24h during business hours |
| `appointment_reminder` | Booking confirmed | SMS | 24h + 1h before appointment |
| `appointment_setting` | Qualified lead, no booking | Call + SMS | Day 1, 3, 5 |
| `no_show_recovery` | Booking marked no-show | SMS → Call | SMS at +30min, call at +2h, SMS at +24h |
| `reactivation` | Contact inactive 30-90 days | SMS → Call | Day 1 SMS, Day 3 call, Day 7 SMS |
| `quote_chase` | Quote sent, not accepted | SMS → Call | Day 3, 5, 7 |
| `review_request` | Appointment completed | SMS | 2-4h after appointment |
| `cold_outreach` | Imported list | Call | Configurable schedule, business hours only |
| `custom` | User-defined trigger | Any | User-defined timing |

### Outbound Call Flow
```
Campaign enrolls contact →
Check suppression list (opt-out, recent contact, cooldown) →
Check daily outbound limit (tier-based) →
Check business hours (recipient's timezone) →
Initiate call via Twilio →
Vapi/Pipecat handles conversation with campaign-specific prompt →
Classify outcome: answered, voicemail, no_answer, busy, declined →
If voicemail: leave pre-configured message OR hang up (per config) →
Create call_session with direction='outbound' →
Update campaign enrollment status →
If positive outcome: mark as converted, stop sequence →
If negative/no response: schedule next step in sequence
```

### Campaign Builder UI (5-Step Wizard)
**Step 1: Campaign Type** — Select from 10 types above. Shows description and expected outcomes.
**Step 2: Audience** — Filter contacts by: status, tags, last activity date, industry, source. Show matched count. Allow CSV import for cold outreach.
**Step 3: Sequence** — Pre-loaded from campaign type template. Editable: steps (SMS/call/email), delays between steps, message templates with merge fields ({firstName}, {businessName}, {appointmentDate}, {serviceName}).
**Step 4: Schedule** — Start date/time. Business hours only (recipient timezone). Daily send limits. Throttle rate. Opt-out instructions.
**Step 5: Review & Launch** — Summary of audience size, sequence steps, schedule, estimated cost (minutes + SMS). Confirm and launch OR save as draft.

### Outbound Safety Layer
```typescript
interface OutboundSafetyConfig {
  maxCallsPerContactPerDay: 1       // Never call same person twice in a day
  maxCallsPerContactPerWeek: 3      // Max 3 attempts per week
  maxSmsPerContactPerDay: 2         // Max 2 SMS per day
  cooldownAfterOptOut: 'permanent'  // Never contact after opt-out
  cooldownAfterDecline: 7           // 7 days after "not interested"
  cooldownAfterConversion: 30       // 30 days after conversion
  businessHoursOnly: true           // 9 AM - 8 PM recipient local time
  respectDNC: true                  // Check against DNC registry
  maxConcurrentCalls: 5             // Per workspace, prevents abuse
  dailyOutboundLimit: {             // Per tier
    solo: 0,                        // No outbound on Solo
    business: 50,
    scale: 500,
    enterprise: 'unlimited'
  }
}
```

### Speed-to-Lead System
This is the highest-ROI outbound workflow. When a new lead is captured from an inbound call:
1. **Immediate:** Lead appears in dashboard with "New Lead" badge.
2. **5 minutes:** Automated SMS: "Hi {firstName}, thanks for calling {businessName}. We'd love to help with your {serviceName} needs. Can we schedule a time that works for you?"
3. **15 minutes:** If no reply, AI outbound call to qualify and book.
4. **2 hours:** If no answer, follow-up SMS with booking link.
5. **24 hours:** Final SMS: "Still interested in {serviceName}? We have availability this week."

### Outbound Analytics Dashboard
| Metric | Description |
|--------|------------|
| Campaigns Active | Count of running campaigns |
| Contacts Enrolled | Total contacts across active campaigns |
| Calls Made Today | Outbound calls initiated today |
| Connection Rate | % of outbound calls answered |
| Conversion Rate | % of enrolled contacts that converted (booked/purchased) |
| Revenue Attributed | Estimated revenue from outbound conversions |
| Cost Per Conversion | Voice + SMS cost per successful conversion |
| Opt-Out Rate | % of contacts who opted out (alert if >5%) |
| Best Performing Campaign | Highest conversion rate campaign |
| SMS Delivery Rate | % of SMS successfully delivered |

### Power Dialer (Scale+ Only)
- Sequential auto-dial through a contact list.
- Plays campaign prompt for each call.
- Agent sees contact card with history during call.
- Auto-logs outcome and moves to next contact.
- Pause/resume capability.
- Real-time stats: calls made, connected, converted.

---

## PART 8: FOLLOW-UP ENGINE (THE DIFFERENTIATOR)

### Pre-Built Sequences
| Sequence | Steps | Channels | Duration |
|----------|-------|----------|----------|
| Missed Call Recovery | 4 steps | SMS → SMS → Call → SMS | 24h total |
| Appointment Reminder | 2 steps | SMS → SMS | 24h + 1h before |
| No-Show Recovery | 3 steps | SMS → Call → SMS | 24h total |
| Quote Follow-Up | 3 steps | SMS → SMS → Call | 7 days |
| Dead Lead Reactivation | 3 steps | SMS → Call → SMS | 7 days |
| Review Request | 1 step | SMS | 2-4h after appointment |

### Workflow Enrollment Rules
- A contact can only be enrolled in ONE active workflow at a time (prevent spam).
- Stop conditions: contact replies, books appointment, opts out, or workflow completes.
- Suppression: if contact was contacted within 24h by ANY workflow, skip this step.
- Enrollment is automatic based on call outcomes (configurable per agent).

### Workflow Step Execution
```typescript
// Pseudo-code for workflow step executor (cron job)
async function executeWorkflowSteps() {
  const dueSteps = await db.query(`
    SELECT we.*, ws.* FROM workflow_enrollments we
    JOIN workflow_steps ws ON ws.id = we.current_step_id
    WHERE we.status = 'active'
    AND we.next_step_at <= NOW()
    AND we.contact_id NOT IN (SELECT contact_id FROM outbound_suppression WHERE expires_at > NOW())
  `)

  for (const step of dueSteps) {
    // Check stop conditions
    if (await contactReplied(step.contact_id) || await contactBooked(step.contact_id) || await contactOptedOut(step.contact_id)) {
      await markEnrollmentComplete(step.enrollment_id, 'stop_condition_met')
      continue
    }

    // Execute step by channel
    switch (step.channel) {
      case 'sms': await sendSms(step.contact_id, step.template, step.merge_fields); break
      case 'call': await initiateOutboundCall(step.contact_id, step.campaign_prompt); break
      case 'email': await sendEmail(step.contact_id, step.template, step.merge_fields); break
    }

    // Track usage
    await trackUsageEvent(step.workspace_id, step.channel, step.duration)

    // Advance to next step or complete
    const nextStep = await getNextStep(step.workflow_id, step.step_order)
    if (nextStep) {
      await advanceEnrollment(step.enrollment_id, nextStep.id, nextStep.delay)
    } else {
      await markEnrollmentComplete(step.enrollment_id, 'completed')
    }
  }
}
```

---

## PART 9: INDUSTRY PACKS

Each industry pack includes: inbound agent personality, business-specific vocabulary, follow-up templates, outbound campaign templates, and estimated job values for revenue attribution.

### Dental Pack
```typescript
export const dentalPack: IndustryPack = {
  id: 'dental',
  name: 'Dental Practice',
  agentPersonality: 'Warm, professional, reassuring. Uses dental terminology naturally.',
  commonServices: ['cleaning', 'filling', 'crown', 'extraction', 'whitening', 'implant', 'emergency'],
  avgJobValues: { cleaning: 300, filling: 450, crown: 1200, extraction: 400, whitening: 600, implant: 3200, emergency: 500 },
  inboundWorkflows: ['missed_call_recovery', 'appointment_reminder', 'no_show_recovery'],
  outboundCampaigns: ['reactivation_6month_cleaning', 'quote_chase_treatment_plan', 'review_request'],
  smsTemplates: {
    missedCall: "Hi {firstName}, we missed your call at {businessName}. We'd love to help! Can we schedule your visit? Reply YES or call us back at {phoneNumber}.",
    reminder24h: "Reminder: Your appointment at {businessName} is tomorrow at {appointmentTime}. Reply C to confirm or R to reschedule.",
    reminder1h: "Your appointment at {businessName} is in 1 hour at {address}. See you soon!",
    noShowRecovery: "We missed you today at {businessName}. No worries — would you like to reschedule? Reply YES and we'll find a time.",
    reactivation: "Hi {firstName}, it's been {daysSinceLastVisit} days since your last visit to {businessName}. Time for your next cleaning? Reply YES to book.",
    reviewRequest: "Thanks for visiting {businessName} today! If you had a great experience, would you mind leaving us a quick review? {reviewLink}",
    quotChase: "Hi {firstName}, following up on your treatment plan from {businessName}. We have availability this week if you'd like to get started. Reply YES to book."
  }
}
```

### Other Packs (Same Structure)
- **Legal Intake:** Services: consultation, case review, filing. Avg values: $5,000-$50,000/case. Urgency: "Every hour matters in legal situations."
- **HVAC:** Services: repair, maintenance, installation, emergency. Avg values: $150-$12,000. Emergency routing priority.
- **Med Spa:** Services: botox, filler, laser, facial, consultation. Avg values: $400-$4,500. Reactivation focus (6-8 week return cycles).
- **Roofing:** Services: inspection, repair, replacement, storm damage. Avg values: $500-$15,000. Storm lead follow-up campaign.
- **General:** Default pack for unspecified industries. Generic templates.

---

## PART 10: DATABASE SCHEMA

### Core Tables

```sql
-- Workspaces (business accounts)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  industry TEXT,
  mode TEXT CHECK (mode IN ('solo', 'business', 'scale')) DEFAULT 'business',
  billing_tier TEXT CHECK (billing_tier IN ('solo', 'business', 'scale', 'enterprise')) DEFAULT 'solo',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
  onboarding_completed BOOLEAN DEFAULT false,
  phone_number TEXT,
  twilio_phone_sid TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  business_hours JSONB DEFAULT '{"mon":{"open":"09:00","close":"17:00"},"tue":{"open":"09:00","close":"17:00"},"wed":{"open":"09:00","close":"17:00"},"thu":{"open":"09:00","close":"17:00"},"fri":{"open":"09:00","close":"17:00"}}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agents (AI voice agents per workspace)
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'AI Assistant',
  greeting TEXT NOT NULL,
  after_hours_greeting TEXT,
  voice_id TEXT NOT NULL DEFAULT 'deepgram-aura-asteria',
  voice_provider TEXT CHECK (voice_provider IN ('deepgram', 'elevenlabs')) DEFAULT 'deepgram',
  llm_model TEXT DEFAULT 'claude-haiku-4-5',
  transfer_number TEXT,
  industry_pack TEXT DEFAULT 'general',
  vapi_agent_id TEXT,
  max_call_duration INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  source TEXT, -- 'inbound_call', 'manual', 'csv_import', 'crm_sync'
  status TEXT CHECK (status IN ('new', 'contacted', 'qualified', 'booked', 'completed', 'lost', 'inactive')) DEFAULT 'new',
  tags TEXT[] DEFAULT '{}',
  opt_out BOOLEAN DEFAULT false,
  opt_out_at TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  total_calls INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  total_revenue_attributed NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, phone)
);

-- Call Sessions
CREATE TABLE call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id),
  contact_id UUID REFERENCES contacts(id),
  direction TEXT CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
  status TEXT CHECK (status IN ('ringing', 'in_progress', 'completed', 'failed', 'no_answer', 'voicemail', 'busy')) DEFAULT 'ringing',
  outcome TEXT, -- 'booked', 'lead_captured', 'transferred', 'voicemail_left', 'callback_requested', 'emergency_routed', 'declined', 'qualified', 'not_interested'
  caller_phone TEXT,
  duration_seconds INTEGER DEFAULT 0,
  duration_minutes NUMERIC(8,2) DEFAULT 0,
  transcript TEXT,
  summary TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  recording_url TEXT,
  vapi_call_id TEXT,
  twilio_call_sid TEXT,
  voice_cost NUMERIC(8,4),
  llm_model_used TEXT,
  tts_provider TEXT,
  campaign_id UUID REFERENCES campaigns(id),
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id),
  call_session_id UUID REFERENCES call_sessions(id),
  service_type TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT CHECK (status IN ('confirmed', 'cancelled', 'no_show', 'completed', 'rescheduled')) DEFAULT 'confirmed',
  confirmed_via TEXT, -- 'sms', 'call', 'manual'
  reminder_24h_sent BOOLEAN DEFAULT false,
  reminder_1h_sent BOOLEAN DEFAULT false,
  estimated_value NUMERIC(10,2),
  attribution_source TEXT, -- 'inbound_call', 'outbound_call', 'sms_followup', 'reactivation', 'no_show_recovery'
  calendar_event_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages (SMS / Email)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id),
  direction TEXT CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
  channel TEXT CHECK (channel IN ('sms', 'email')) NOT NULL,
  content TEXT NOT NULL,
  status TEXT CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'received')) DEFAULT 'queued',
  twilio_message_sid TEXT,
  workflow_enrollment_id UUID REFERENCES workflow_enrollments(id),
  campaign_id UUID REFERENCES campaigns(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflows (follow-up sequence definitions)
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'missed_call_recovery', 'appointment_reminder', 'no_show_recovery', 'quote_chase', 'reactivation', 'review_request', 'custom'
  trigger_event TEXT NOT NULL, -- 'call_outcome:voicemail_left', 'call_outcome:lead_captured', 'booking:confirmed', 'booking:no_show', etc.
  is_active BOOLEAN DEFAULT true,
  is_template BOOLEAN DEFAULT false,
  industry_pack TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Steps
CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  channel TEXT CHECK (channel IN ('sms', 'call', 'email')) NOT NULL,
  delay_minutes INTEGER NOT NULL DEFAULT 0, -- Delay from previous step
  template TEXT NOT NULL, -- Message template with {mergeFields}
  campaign_prompt TEXT, -- For outbound call steps
  stop_on_reply BOOLEAN DEFAULT true,
  stop_on_booking BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Enrollments
CREATE TABLE workflow_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  contact_id UUID NOT NULL REFERENCES contacts(id),
  status TEXT CHECK (status IN ('active', 'completed', 'stopped', 'failed')) DEFAULT 'active',
  current_step_id UUID REFERENCES workflow_steps(id),
  next_step_at TIMESTAMPTZ,
  stop_reason TEXT, -- 'completed', 'replied', 'booked', 'opted_out', 'manual', 'error'
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Campaigns (outbound)
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'speed_to_lead', 'lead_qualification', 'appointment_reminder', 'no_show_recovery', 'reactivation', 'quote_chase', 'review_request', 'cold_outreach', 'custom'
  status TEXT CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')) DEFAULT 'draft',
  audience_filter JSONB NOT NULL DEFAULT '{}', -- Contact filter criteria
  sequence JSONB NOT NULL DEFAULT '[]', -- Array of steps
  schedule JSONB DEFAULT '{}', -- Start time, business hours, throttle
  stats JSONB DEFAULT '{"enrolled":0,"completed":0,"converted":0,"opted_out":0}',
  daily_limit INTEGER DEFAULT 50,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Enrollments
CREATE TABLE campaign_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id),
  status TEXT CHECK (status IN ('pending', 'active', 'completed', 'converted', 'opted_out', 'failed')) DEFAULT 'pending',
  current_step INTEGER DEFAULT 0,
  next_step_at TIMESTAMPTZ,
  outcome TEXT,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Usage Events (for billing)
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  event_type TEXT NOT NULL, -- 'voice_minute', 'sms_sent', 'sms_received', 'outbound_call'
  quantity NUMERIC(10,4) NOT NULL,
  unit_cost NUMERIC(8,4),
  call_session_id UUID REFERENCES call_sessions(id),
  message_id UUID REFERENCES messages(id),
  billing_period_start DATE,
  billing_period_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Daily (pre-aggregated)
CREATE TABLE analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  date DATE NOT NULL,
  calls_inbound INTEGER DEFAULT 0,
  calls_outbound INTEGER DEFAULT 0,
  calls_answered INTEGER DEFAULT 0,
  calls_missed INTEGER DEFAULT 0,
  bookings_created INTEGER DEFAULT 0,
  bookings_completed INTEGER DEFAULT 0,
  bookings_no_show INTEGER DEFAULT 0,
  no_shows_recovered INTEGER DEFAULT 0,
  leads_captured INTEGER DEFAULT 0,
  leads_reactivated INTEGER DEFAULT 0,
  followups_sent INTEGER DEFAULT 0,
  followups_replied INTEGER DEFAULT 0,
  revenue_attributed NUMERIC(10,2) DEFAULT 0,
  voice_minutes_used NUMERIC(10,2) DEFAULT 0,
  sms_sent INTEGER DEFAULT 0,
  sms_received INTEGER DEFAULT 0,
  UNIQUE(workspace_id, date)
);

-- Outbound Suppression
CREATE TABLE outbound_suppression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  contact_id UUID NOT NULL REFERENCES contacts(id),
  reason TEXT NOT NULL, -- 'recent_contact', 'opt_out', 'decline_cooldown', 'conversion_cooldown'
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook Events (outbound events to customers)
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Members
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('owner', 'admin', 'viewer')) DEFAULT 'viewer',
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(workspace_id, user_id)
);

-- Integrations
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google_calendar', 'outlook', 'salesforce', 'hubspot', 'slack'
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes
```sql
CREATE INDEX idx_contacts_workspace_phone ON contacts(workspace_id, phone);
CREATE INDEX idx_contacts_workspace_status ON contacts(workspace_id, status);
CREATE INDEX idx_contacts_last_activity ON contacts(workspace_id, last_activity_at);
CREATE INDEX idx_call_sessions_workspace ON call_sessions(workspace_id, created_at DESC);
CREATE INDEX idx_call_sessions_contact ON call_sessions(contact_id, created_at DESC);
CREATE INDEX idx_bookings_workspace_date ON bookings(workspace_id, scheduled_at);
CREATE INDEX idx_bookings_status ON bookings(workspace_id, status);
CREATE INDEX idx_messages_contact ON messages(contact_id, created_at DESC);
CREATE INDEX idx_workflow_enrollments_active ON workflow_enrollments(status, next_step_at) WHERE status = 'active';
CREATE INDEX idx_campaign_enrollments_active ON campaign_enrollments(status, next_step_at) WHERE status = 'active';
CREATE INDEX idx_usage_events_workspace_period ON usage_events(workspace_id, billing_period_start, billing_period_end);
CREATE INDEX idx_analytics_daily_workspace ON analytics_daily(workspace_id, date DESC);
CREATE INDEX idx_suppression_contact ON outbound_suppression(workspace_id, contact_id, expires_at);
```

---

## PART 11: APP INFORMATION ARCHITECTURE

### Simplified from 120+ pages to 15 primary screens

```
/app (Dashboard)
├── Revenue Recovered (hero card — large green number)
├── Needs Attention (priority queue)
├── Today's Activity (chronological feed)
├── Quick Stats (calls, bookings, recovery rate, minutes remaining)

/app/calls
├── Recent calls list (filterable: all, inbound, outbound, missed)
├── Call detail → transcript + recording + lead card + outcome

/app/contacts
├── All contacts (searchable, filterable by status/tags/source)
├── Contact detail → timeline (calls, SMS, emails, bookings, workflows)

/app/inbox
├── Conversations threaded by contact (two-panel: list | thread)
├── SMS + email + call transcripts unified

/app/calendar
├── Appointment list + calendar view
├── Booking settings

/app/follow-ups
├── Active enrollments (running sequences)
├── Workflow templates (browse/edit/create)

/app/campaigns
├── Campaign list (draft, active, completed)
├── Create campaign → 5-step wizard
├── Campaign detail → enrolled contacts, stats, timeline

/app/analytics
├── Revenue recovered (hero + trend chart)
├── Call metrics (volume, answer rate, outcomes)
├── Follow-up performance (sent, replied, converted)
├── Outbound metrics (connection rate, conversion rate)
├── Usage (minutes, SMS, outbound calls vs limits)

/app/settings
├── Business info
├── Phone number
├── Voice (select voice, greeting, hours)
├── Outbound (calling hours, voicemail behavior, suppression config)
├── Team (invite, roles)
├── Integrations (CRM, calendar)
├── Billing (plan, usage meter, invoices, upgrade)
├── Notifications
```

### Sidebar Navigation (9 items)
```
🏠 Dashboard
📞 Calls
👥 Contacts
💬 Inbox
📅 Calendar
🔄 Follow-Ups
📣 Campaigns
📊 Analytics
⚙️ Settings
```

### Mobile: Bottom Nav
```
Dashboard | Calls | Inbox | More (→ Contacts, Calendar, Follow-Ups, Campaigns, Analytics, Settings)
```

---

## PART 12: DASHBOARD DESIGN (MOST IMPORTANT SCREEN)

### Layout

**Hero Metric (top, full-width):**
- "Revenue Recovered This Month" — large green number (JetBrains Mono, 48px)
- Trend arrow (up/down) + comparison to last month
- Small text: "Based on {X} recovered appointments at estimated industry values"

**Needs Attention Queue (below hero, left 2/3):**
- Items sorted by urgency:
  - New leads not yet contacted (highest priority)
  - Missed follow-ups
  - Upcoming appointments needing confirmation
  - No-shows not yet recovered
- Each item: contact name, reason, time since event, quick-action buttons (Call, Text, Dismiss)
- Max 10 items shown, "View all" link

**Today's Activity Feed (below hero, right 1/3):**
- Chronological: "AI answered call from John M. — booked cleaning at 2 PM"
- Compact cards with timestamp and status icon
- Auto-updates via Supabase Realtime

**Quick Stats Bar (bottom):**
- Calls today | Appointments booked | Follow-ups sent | Minutes remaining (with progress bar)

### Empty State (New User, First Visit)
"Your AI is live and ready. Call your number to hear it in action: {phoneNumber}. Once you receive your first call, your dashboard will light up with activity and revenue tracking."
[Big teal button: "Call Your Number Now"]

---

## PART 13: ONBOARDING (SINGLE PATH: /activate)

**Step 1: Who are you?**
- Three cards: "Solo Professional" / "Service Business" / "Agency or Multi-Location"
- Selection sets mode (solo/business/scale)

**Step 2: Tell us about your business**
- Business name (required)
- Industry (dropdown with icons: Dental, Legal, HVAC, Med Spa, Roofing, Other)
- City/State (for phone number area code)

**Step 3: Set up your phone**
- Auto-provision a local number matching their area code
- Show the number: "Your AI will answer at: (555) 123-4567"
- Option: "I want to port my existing number" (starts porting, uses new number in meantime)

**Step 4: Customize your AI**
- Greeting (pre-filled from industry template): "Thanks for calling {businessName}, this is our AI assistant. How can I help you today?"
- Voice preview: play button to hear greeting
- Business hours selector (visual grid)

**Step 5: Connect your calendar** (optional)
- Google Calendar or Outlook OAuth
- Skip option: "I'll set this up later"

**Step 6: You're live!**
- Subtle confetti animation
- "Your AI is now answering calls. Here's what to do next:"
  1. Call your number to test it
  2. Check your dashboard for your first call
  3. Your follow-up workflows are already running
- [Button: "Go to Dashboard"]

---

## PART 14: HOMEPAGE (10 SECTIONS, EXACT COPY)

### Section 1 — Hero
**Headline:** Stop Losing Revenue to Missed Calls and Broken Follow-Up
**Subheadline:** Recall Touch answers every call, books appointments, and runs automated follow-up that recovers the revenue you're currently losing. See results in your first week.
**Primary CTA:** Start Recovering Revenue — Free for 14 Days
**Secondary CTA:** See How It Works ↓
**Trust bar:** No credit card required · 5-minute setup · Cancel anytime
**Visual:** Dashboard mockup showing "Revenue Recovered This Month: $4,217" with upward trend line

### Section 2 — Problem Statement
**Headline:** Your Business Is Leaking Revenue Right Now
- Card 1: "35-60% of calls go unanswered after hours or when you're busy"
- Card 2: "80% of leads go to a competitor if you don't respond in 5 minutes"
- Card 3: "No-shows cost the average service business $2,000-$5,000/month"

### Section 3 — How It Works (Recovery Loop)
**Headline:** From Missed Call to Recovered Revenue in 6 Steps
Visual flow: Missed call → AI answers in <3 sec → Captures lead + books apt → Confirms via SMS → Reminds 24h + 1h before → No-show? Auto-recovery → Revenue recovered ✓

### Section 4 — ROI Calculator
**Headline:** Calculate Your Revenue Leak
Three sliders: Monthly calls (50-500), Average job value ($200-$10,000), Missed call % (10-60%)
Output: "You're leaving ~$X,XXX/month on the table. Recall Touch could recover $X,XXX."

### Section 5 — Industry Selector
**Headline:** Built for Service Businesses That Can't Afford to Miss a Call
5 cards: Dental ($300-3,200/job), Legal ($5K-50K/case), HVAC ($450/call), Med Spa ($400-4,500/visit), Roofing ($8K-12K/job)

### Section 6 — Differentiation
**Headline:** Not Just Another AI Receptionist
Left: "AI Receptionists answer calls. Take messages. That's it."
Right: "Recall Touch answers calls AND follows up until the revenue is recovered."
Differentiators: Automated follow-up sequences, No-show recovery, Dead lead reactivation, Revenue attribution dashboard, Industry-specific workflows

### Section 7 — Proof / Early Access
Pre-customers: "Now Accepting Early Customers — See Results in Your First Week"
Product screenshots showing real dashboard UI
Post-customers: Replace with real customer quotes and specific numbers

### Section 8 — Pricing Preview
3 tier cards: Solo $49 / Business $297 (recommended) / Scale $997
"Every plan includes a 14-day free trial with full features. No credit card."

### Section 9 — FAQ (6 Questions)
1. "How quickly can I set up?" → 5 minutes.
2. "What if the AI can't handle a call?" → Transfers to your team.
3. "How does the free trial work?" → Full access, 14 days, no credit card.
4. "Do callers know they're talking to AI?" → Optional disclosure.
5. "What happens after a call?" → Automated follow-up sequences.
6. "How do I measure ROI?" → Dashboard shows recovered revenue.

### Section 10 — Final CTA
**Headline:** Every Minute You Wait, Another Call Goes Unanswered
**CTA:** Start Recovering Revenue — Free for 14 Days
**Trust:** No credit card · 5-minute setup · Cancel anytime

---

## PART 15: SEO REQUIREMENTS

### Title Tag Formula
`[Primary Keyword] — Recall Touch` (max 60 chars)

### Meta Description Formula
`[Benefit statement with keyword]` (max 155 chars)

### Required Structured Data
1. **SoftwareApplication** — name, operatingSystem, applicationCategory, offers (lowPrice: 49, highPrice: 997)
2. **Organization** — name, url, logo, sameAs (social profiles)
3. **FAQPage** — on homepage, all 6 FAQ questions as structured data
4. **BreadcrumbList** — on all marketing pages

### Page-Specific SEO
| Page | Title | Target Keyword |
|------|-------|---------------|
| `/` | Recall Touch — AI Revenue Recovery for Service Businesses | AI revenue recovery |
| `/product` | How AI Revenue Recovery Works — Recall Touch | how AI revenue recovery works |
| `/pricing` | Pricing — AI Phone System for Service Businesses | AI phone system pricing |
| `/industries/dental` | AI Receptionist for Dental Offices — Recall Touch | AI receptionist dental |
| `/industries/legal` | AI Receptionist for Law Firms — Recall Touch | AI receptionist law firm |
| `/industries/hvac` | AI Answering Service for HVAC — Recall Touch | AI answering service HVAC |

### Technical SEO
- Remove `/app/*` from sitemap
- Add FAQPage schema to homepage
- Fix JSON-LD lowPrice to 49
- Add canonical URLs to all pages
- Ensure all images have descriptive alt text
- Add breadcrumbs component
- Set up 301 redirects for all removed/consolidated routes

---

## PART 16: ANALYTICS & MONITORING REQUIREMENTS

### Product Analytics (PostHog)
Track these events:
```
signup_started, signup_completed, onboarding_step_{1-6}_completed,
first_call_received, first_outbound_call, first_sms_sent,
campaign_created, campaign_launched, campaign_paused, campaign_completed,
workflow_activated, workflow_paused,
dashboard_visited, revenue_viewed, analytics_viewed,
upgrade_clicked, plan_changed, trial_expired,
contact_created, contact_imported, contact_opted_out,
booking_created, booking_completed, booking_no_show, booking_recovered,
settings_updated, team_member_invited
```

### Error Tracking (Sentry)
Capture: unhandled exceptions, API errors >500, voice call failures, Stripe webhook failures, cron job failures, workflow step failures.

### Activation Funnel
Visitor → Signup → Onboarding Complete → Phone Provisioned → First Call → First Follow-Up → First Revenue Attributed → Trial-to-Paid → Month 2 Retained

### Business Metrics (Admin Dashboard)
MRR, customer count, trial conversion, activation rate, churn rate, ARPU, voice COGS/min, support tickets/customer.

### Monitoring Alerts
| Check | Alert Threshold |
|-------|----------------|
| Voice COGS per minute | >$0.15/min |
| Inbound call answer rate | <90% |
| Outbound call connection rate | <30% |
| Workflow step failure rate | >10% |
| SMS delivery rate | <95% |
| Stripe webhook latency | >30 seconds |
| API P95 response time | >2 seconds |
| Database connection count | >80% of pool |
| Cron job execution | Any failure |
| Error rate by endpoint | >1% |

---

## PART 17: SECURITY CHECKLIST

### Already Done (Confirmed in Codebase)
- [x] HSTS with preload, 1-year max-age
- [x] CSP configured
- [x] X-Frame-Options: DENY
- [x] X-Content-Type-Options: nosniff
- [x] Stripe webhook signature verification
- [x] HMAC-SHA256 session cookies
- [x] Zod input validation on API routes
- [x] Secret redaction in logging

### Must Fix (From Audit)
- [ ] Add middleware.ts for centralized route protection
- [ ] Reduce session cookie TTL to 30 days
- [ ] Hard-fail on missing SESSION_SECRET in production
- [ ] Move CRON_SECRET from query params to Authorization header
- [ ] Replace in-memory rate limiting with Upstash Redis
- [ ] Add CAPTCHA on signup (Turnstile or reCAPTCHA)
- [ ] Add IP-based abuse detection on outbound calling
- [ ] Add MFA option for workspace owners

### Data Handling
- Call recordings: encrypted at rest, auto-delete after 90 days (configurable)
- SMS content: stored in messages table, encrypted columns for PII
- PCI: no card data touches our servers (Stripe handles everything)
- HIPAA: BAA available as $199/mo add-on on Scale+ tier

---

## PART 18: QA TEST CASES (TOP 50)

1. Sign up email/password → workspace created, trial set, phone provisioned
2. Sign up Google OAuth → workspace created, session cookie set
3. Complete /activate all 5 steps without error
4. Access /onboarding → redirects to /activate
5. Login valid credentials → session cookie, redirect to /app
6. Login wrong password → friendly error, no info leak
7. Forgot password → email sent, reset flow works
8. Access /app/* without session → redirect to /sign-in
9. Access /dashboard/* → redirect to /app/* equivalent
10. Access /admin/* without admin role → 403 or redirect
11. Create campaign (Business tier) → audience, sequence, launch
12. Create campaign (Solo tier) → feature gate blocks with upgrade prompt
13. Launch outbound campaign → contacts enrolled, calls initiated
14. Outbound call → call_session created with direction=outbound
15. Outbound call to opted-out contact → blocked
16. Outbound call exceeding daily limit → rate limit error
17. Outbound call outside business hours → deferred
18. Inbound call → AI answers, transcript saved, lead created
19. Inbound call → follow-up workflow auto-enrolled
20. Missed call → recovery SMS sent within 5 minutes
21. No-show detection → booking marked no_show, recovery triggered
22. Appointment reminder → SMS at -24h and -1h
23. SMS STOP keyword → contact.opt_out set, all sequences stopped
24. Workflow step execution → correct channel, template rendered, usage tracked
25. Workflow stop condition → enrollment stopped on reply/book/opt-out
26. Upgrade Solo → Business → Stripe updated, features unlocked
27. Downgrade Scale → Business → Stripe updated, features restricted
28. Cancel subscription → Stripe cancellation, access revoked at period end
29. Trial expires → access restricted, upgrade prompt
30. Payment fails → dunning flow, grace period, restriction
31. Voice minute overage → correct charge at period end
32. SMS overage → tracked in usage_events
33. Invite team member → email sent, /accept-invite works, role assigned
34. Remove team member → access revoked immediately
35. Phone number provision → Twilio number acquired, agent created
36. Google Calendar connect → OAuth completes, availability checked
37. Stripe webhook (checkout.session.completed) → billing updated
38. Stripe webhook (invoice.payment_failed) → dunning triggered
39. Stripe webhook (subscription.deleted) → access revoked
40. Duplicate Stripe webhook → idempotency (no double processing)
41. API call invalid JSON → 400 with friendly message
42. API call missing required fields → validation error
43. API call wrong workspace → 403 forbidden
44. Concurrent signup same email → no duplicate workspaces
45. Contact timeline → calls, SMS, bookings, workflows all appear
46. Revenue attribution → booking.attribution_source correctly set
47. Dashboard load time → <2 seconds
48. Mobile dashboard → responsive, readable, touch targets
49. Browser back from onboarding → state preserved
50. Empty campaign (0 contacts) → friendly message, not error

---

## PART 19: EDGE CASES (TOP 25)

1. User closes browser during onboarding, returns later → resume, not restart
2. Two tabs during onboarding → no duplicate workspaces
3. Outbound call to voicemail → detect, leave message or hang up per config
4. Outbound to disconnected number → mark contact, no immediate retry
5. Inbound during active outbound to same contact → no duplicate records
6. Campaign with 0 matching contacts → friendly message
7. Workflow step SMS delivery fails → retry or skip to next step
8. Stripe webhook arrives before checkout redirect → handle out-of-order
9. Mid-cycle upgrade → proration calculated correctly
10. Overage at 11:59 PM last day of billing → still calculated
11. Admin deletes workspace while member logged in → graceful handling
12. Phone porting takes 2-4 weeks → interim number works
13. Google Calendar OAuth token expires → refresh works, booking doesn't silently fail
14. Twilio webhook but Vapi down → queue or graceful handling
15. Workflow with 0 steps → validate and prevent
16. Contact with no phone in SMS workflow → skip SMS steps
17. Contact replies at 3 AM → handler updates enrollment outside business hours
18. Multiple campaigns targeting same contact → suppression prevents spam
19. Delete contact in active workflow → cascade-cancel enrollments
20. Database connection pool exhaustion → limits and backoff
21. ElevenLabs 429 rate limit → fall back to Deepgram Aura-2
22. Supabase Auth down → session fallback cookie works
23. Phone number format variations → normalize to E.164
24. Campaign delay of 0 → execute immediately, no infinite recurse
25. Solo plan with admin override for Business features → gates check both

---

## PART 20: FALLBACK BEHAVIORS (TOP 20)

1. Vapi outage → queue for callback, voicemail message
2. ElevenLabs outage → fall back to Deepgram Aura-2
3. Claude API outage → scripted responses for booking/FAQ
4. Twilio outage → queue outbound, retry when service returns
5. Stripe outage → allow existing sessions, queue billing ops
6. Database failure → return cached dashboard data with stale indicator
7. Cron job failure → alert, retry next interval, log skipped items
8. Webhook delivery failure → exponential backoff retry
9. SMS delivery failure → mark failed, skip to next workflow step
10. Email delivery failure → retry once, then mark failed
11. Outbound call failure → mark failed, retry per campaign config
12. Phone provisioning failure → error with manual fallback
13. Calendar sync failure → disable availability booking, allow manual
14. CRM webhook failure → queue for retry, show sync status
15. Analytics rollup failure → show last known data with timestamp
16. Session cookie corrupted → redirect to sign-in, clear cookie
17. Workspace not found → redirect to onboarding
18. Feature gate check failure → default to deny (restrictive)
19. Image/asset CDN failure → show alt text
20. Search returns 0 results → empty state with reset action

---

## PART 21: CRON JOBS

| Job | Schedule | Purpose |
|-----|----------|---------|
| `workflow-step-executor` | Every 1 min | Execute due workflow steps |
| `campaign-step-executor` | Every 1 min | Execute due campaign steps |
| `speed-to-lead` | Every 1 min | Send 5-min SMS for new leads |
| `no-show-detection` | Every 5 min | Check bookings 30+ min past scheduled, no check-in |
| `appointment-reminders` | Every 15 min | Send 24h and 1h reminders |
| `analytics-daily-rollup` | Every 1 hour | Aggregate daily metrics |
| `usage-sync` | Every 1 hour | Sync voice minutes from Vapi/Twilio to usage_events |
| `suppression-cleanup` | Every 6 hours | Remove expired suppression entries |
| `trial-expiration` | Daily at midnight | Check expired trials, restrict access |
| `dunning-followup` | Daily at 9 AM | Send reminders for failed payments |
| `weekly-digest` | Monday 8 AM | Send weekly email digest to workspace owners |
| `reactivation-scan` | Daily at 10 AM | Identify contacts inactive 30-90 days, enroll eligible ones |
| `stale-lead-alert` | Daily at 9 AM | Flag new leads not contacted within 24h |

### Cron Authentication
All cron routes use `Authorization: Bearer ${CRON_SECRET}` header (NOT query params).
```typescript
// Cron route handler pattern
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... execute job
}
```

---

## PART 22: API ROUTES (KEY ENDPOINTS)

### Auth
- `POST /api/auth/signup` — Create account + workspace
- `POST /api/auth/login` — Email/password login
- `POST /api/auth/logout` — Clear session
- `GET /api/auth/session` — Validate current session
- `POST /api/auth/forgot-password` — Send reset email
- `POST /api/auth/reset-password` — Reset with token
- `GET /api/auth/google` — Google OAuth initiate
- `GET /api/auth/google/callback` — Google OAuth callback

### Calls
- `GET /api/calls` — List calls (paginated, filterable)
- `GET /api/calls/[id]` — Call detail with transcript
- `POST /api/vapi/webhook` — Vapi call events (start, end, transcript)
- `POST /api/twilio/voice` — Twilio voice webhook
- `POST /api/twilio/sms` — Twilio SMS webhook (inbound)

### Contacts
- `GET /api/contacts` — List contacts (paginated, searchable, filterable)
- `POST /api/contacts` — Create contact
- `GET /api/contacts/[id]` — Contact detail
- `PATCH /api/contacts/[id]` — Update contact
- `DELETE /api/contacts/[id]` — Delete contact (cascade workflow enrollments)
- `POST /api/contacts/import` — CSV import
- `GET /api/contacts/[id]/timeline` — Full timeline (calls, SMS, bookings, workflows)

### Campaigns
- `GET /api/campaigns` — List campaigns
- `POST /api/campaigns` — Create campaign
- `GET /api/campaigns/[id]` — Campaign detail with stats
- `PATCH /api/campaigns/[id]` — Update campaign
- `POST /api/campaigns/[id]/launch` — Launch campaign
- `POST /api/campaigns/[id]/pause` — Pause campaign
- `POST /api/campaigns/[id]/resume` — Resume campaign
- `DELETE /api/campaigns/[id]` — Delete campaign

### Workflows
- `GET /api/workflows` — List workflows
- `POST /api/workflows` — Create workflow
- `PATCH /api/workflows/[id]` — Update workflow
- `POST /api/workflows/[id]/activate` — Activate workflow
- `POST /api/workflows/[id]/deactivate` — Deactivate

### Bookings
- `GET /api/bookings` — List bookings
- `POST /api/bookings` — Create booking
- `PATCH /api/bookings/[id]` — Update booking (status change)
- `GET /api/bookings/availability` — Check calendar availability

### Billing
- `POST /api/billing/checkout` — Create Stripe checkout session
- `POST /api/billing/portal` — Create Stripe customer portal link
- `POST /api/billing/webhook` — Stripe webhook handler
- `GET /api/billing/usage` — Current period usage
- `GET /api/billing/invoices` — Invoice history

### Analytics
- `GET /api/analytics/dashboard` — Dashboard metrics (revenue, calls, bookings)
- `GET /api/analytics/revenue` — Revenue attribution breakdown
- `GET /api/analytics/calls` — Call volume and outcome stats
- `GET /api/analytics/campaigns` — Campaign performance
- `GET /api/analytics/usage` — Minutes/SMS usage vs limits

### Settings
- `GET /api/settings/workspace` — Get workspace settings
- `PATCH /api/settings/workspace` — Update workspace settings
- `GET /api/settings/agent` — Get agent configuration
- `PATCH /api/settings/agent` — Update agent configuration
- `POST /api/settings/phone/provision` — Provision phone number
- `POST /api/settings/team/invite` — Invite team member
- `DELETE /api/settings/team/[userId]` — Remove team member

### Cron Jobs (All use Authorization header)
- `GET /api/cron/workflow-executor` — Execute due workflow steps
- `GET /api/cron/campaign-executor` — Execute due campaign steps
- `GET /api/cron/speed-to-lead` — Process speed-to-lead queue
- `GET /api/cron/no-show-detection` — Detect no-shows
- `GET /api/cron/appointment-reminders` — Send reminders
- `GET /api/cron/analytics-rollup` — Aggregate daily metrics
- `GET /api/cron/usage-sync` — Sync usage from Vapi/Twilio
- `GET /api/cron/trial-expiration` — Check expired trials
- `GET /api/cron/weekly-digest` — Send weekly email digests
- `GET /api/cron/reactivation-scan` — Identify dormant contacts

---

## PART 23: BUILD PHASES (EXACT ORDER)

### Phase 1: Trust + Billing + SEO Fixes (Week 1-2)
- [ ] Fix BUG 1: Consolidate to single dashboard (/app only), redirect /dashboard/*
- [ ] Fix BUG 2: Update root metadata to AI Revenue Recovery
- [ ] Fix BUG 3: Remove dark theme, switch to light
- [ ] Fix BUG 4: Remove fake hero counter and revenue ticker
- [ ] Fix BUG 5: Reconcile billing overage rates
- [ ] Fix BUG 6: Remove private routes from sitemap
- [ ] Fix BUG 7: Fix JSON-LD lowPrice to 49
- [ ] Fix BUG 8: Add social profiles to Organization schema
- [ ] Fix BUG 11: Move CRON_SECRET to Authorization header
- [ ] Fix BUG 14: Replace billing copy with standard terms
- [ ] Fix BUG 16: Reduce homepage to 10 sections
- [ ] Fix BUG 17: Consolidate to single onboarding (/activate)
- [ ] Fix BUG 18: Replace operational vocabulary in UI

### Phase 2: Security + Infrastructure (Week 2-3)
- [ ] Fix BUG 9: Reduce session TTL to 30 days
- [ ] Fix BUG 10: Hard-fail on missing SESSION_SECRET
- [ ] Fix BUG 12: Replace in-memory rate limiting with Upstash Redis
- [ ] Fix BUG 13: Consolidate to single logging system
- [ ] Fix BUG 15: Create middleware.ts for route protection
- [ ] Fix BUG 19: Consolidate sequence engines
- [ ] Fix BUG 20: Hard-fail on missing critical env vars
- [ ] Add Sentry error tracking
- [ ] Add PostHog product analytics
- [ ] Add CAPTCHA on signup

### Phase 3: Dashboard + Core UX (Week 3-4)
- [ ] Build revenue recovered hero metric on dashboard
- [ ] Build needs-attention queue
- [ ] Build today's activity feed with Supabase Realtime
- [ ] Build quick stats bar with usage meters
- [ ] Simplify sidebar to 9 items
- [ ] Build empty states with guidance for new users
- [ ] Build skeleton loading states matching page layouts
- [ ] Add bottom nav for mobile

### Phase 4: Outbound Engine + Campaigns (Week 5-6)
- [ ] Build campaign builder UI (5-step wizard)
- [ ] Build campaign list page with status filters
- [ ] Build campaign detail page with stats
- [ ] Implement outbound safety layer (suppression, limits, hours)
- [ ] Build no-show detection cron job
- [ ] Build appointment reminder cron job
- [ ] Build outbound settings page
- [ ] Wire speed-to-lead cron to new leads
- [ ] Build outbound analytics section

### Phase 5: Follow-Up Engine + Workflows (Week 7-8)
- [ ] Wire all 6 pre-built workflow templates
- [ ] Build workflow management page (activate/deactivate/edit)
- [ ] Implement workflow step executor cron
- [ ] Build revenue attribution on bookings
- [ ] Build weekly email digest system
- [ ] Build reactivation scan cron
- [ ] Build contact timeline (unified view)

### Phase 6: Homepage + Marketing (Week 9-10)
- [ ] Build 10-section homepage per Part 14 copy
- [ ] Build interactive ROI calculator
- [ ] Build industry selector with landing page links
- [ ] Build pricing page with ROI comparison
- [ ] Build 3 industry landing pages (dental, legal, HVAC)
- [ ] Build interactive demo page (hear a call + see follow-up)
- [ ] Add FAQPage structured data

### Phase 7: Voice Migration + Polish (Week 11-12)
- [ ] Begin Pipecat migration (replace Vapi)
- [ ] Build power dialer (Scale tier)
- [ ] Build advanced campaign analytics
- [ ] Build usage warning notifications (80% of limits)
- [ ] Build churn risk detection (7-day inactivity alerts)
- [ ] Build save offer on cancellation flow
- [ ] Build status page (uptime monitoring)
- [ ] QA: Run all 50 test cases
- [ ] QA: Test all 25 edge cases
- [ ] QA: Verify all 20 fallback behaviors

---

## PART 24: PAGES TO REMOVE / HIDE / REDIRECT

### Remove Entirely
- `/solo`, `/life`, `/org` → redirect to `/activate`
- `/declare`, `/example`, `/wrapup` → delete
- `/public/settlement`, `/public/ack` → delete
- `/ops/*` → move behind admin auth
- All governance onboarding steps → delete
- Blog pages with no content → return 404
- Compare pages with no content → return 404

### Redirect
- ALL `/dashboard/*` → `/app/*` equivalents via next.config.ts redirects
- `/onboarding` → `/activate`
- `/app/onboarding` → `/activate`

### Hide Until Ready
- Call Intelligence → until 100+ calls
- Knowledge Base → until content management built
- Lead Scoring → until 50+ leads
- Compliance Settings → unless HIPAA industry selected
- Agency Dashboard → unless Scale mode
- Developer/Webhooks → Scale+ only
- A/B Testing → Scale+ only
- Settlement/Attestation/Procurement → remove from navigation entirely
- i18n language files → English only at launch

---

## PART 25: 12 NON-NEGOTIABLE RULES

1. **Revenue Recovered is the hero metric.** It appears on the dashboard, in the weekly digest, in the pricing page, in the cancellation save offer. Everything proves ROI.

2. **No fake data.** No animated counters, no fabricated testimonials, no invented statistics. If we don't have real data, say "Now accepting early customers." Honest is premium.

3. **Light theme only on app.** No dark mode. Service business owners use light interfaces. Dark feels like developer tooling.

4. **One onboarding path.** `/activate` only. No alternatives, no branching, no governance steps. 6 steps, 5 minutes, done.

5. **One dashboard system.** `/app/*` is canonical. `/dashboard/*` redirects. No exceptions.

6. **Billing-plans.ts is the source of truth.** All other files import from it. Never hardcode tier names, rates, or limits anywhere else.

7. **Outbound respects safety.** Every outbound call checks: opt-out status, suppression list, daily limit, business hours. No exceptions. One TCPA violation costs more than a year of revenue.

8. **Every call outcome triggers a follow-up.** No call should end without the system knowing what happens next. Booked → reminder. Missed → recovery. Lead → qualification. No-show → chase.

9. **Standard billing language.** "Plan," "subscription," "upgrade," "downgrade." Not "coverage," "handling," "economic activation."

10. **Progressive disclosure.** New users see 8-10 core pages. Advanced features unlock over time or by tier. Never show 60+ pages to a new user.

11. **Mobile-first on app.** Bottom nav, touch targets, responsive layouts. Service business owners check their dashboard on their phone between appointments.

12. **Test every billing path.** Overage calculation, proration on upgrade/downgrade, trial expiration, dunning on failed payment, cancellation. Billing bugs destroy trust instantly.

---

*End of V8 Master Cursor Prompt. Strategy + Audit + Implementation + Outbound in one document. Zero fluff. Execute in order.*
