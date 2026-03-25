# RECALL TOUCH — V13 DEFINITIVE MASTER DOCUMENT

**27 Sections. Complete Strategy + Product Audit + Redesign + Cursor Implementation Brief.**

Written after reading every source file, debugging 16 consecutive Vercel deployment failures, verifying 529 tests, and confirming 0 TypeScript errors. This replaces all previous versions.

---

## SECTION 1 — EXECUTIVE VERDICT

**What it is today:** A technically complete AI revenue recovery system with 498 API routes, 10 campaign types, contact timeline, outbound settings, 3-mode UI, ROI calculator, PostHog + Sentry, 13 active crons, and a light-themed design system. The engineering is ahead of the marketing. The deployment is now live after fixing the middleware.ts Turbopack/Vercel incompatibility.

**Why the current framing is too weak:** The homepage sells "missed calls" and "voicemail." That is a feature every $29/mo AI receptionist offers. The outbound engine, campaign builder, setter workflows, revenue attribution, and mode system are invisible to prospects. A visitor scanning for 10 seconds sees an answering service, not a revenue operations platform.

**What it should become:** The AI Revenue Operations platform. The execution layer that turns every call, follow-up, and booking into measured, attributed revenue.

**Category to own:** AI Revenue Operations (AI RevOps). Distinct from receptionist (narrow), dialer (outbound-only), CRM (passive), marketing automation (email-centric).

**Must not be:** An "AI phone system." A "virtual receptionist." A "call answering tool." A "voice AI wrapper." None of these deserve $297/month or credibly serve high-value use cases.

**Biggest blocker:** Zero social proof. No customers, no logos, no case studies, no revenue-recovered screenshots from real users.

**Biggest opportunity:** Nobody owns AI RevOps. GoHighLevel is too complex. Smith.ai is too expensive. Bland/Vapi are developer tools. The gap: a system that answers + follows up + books + recovers + proves ROI, at software margins, usable by non-technical people in 2 minutes.

**Path to leadership:** Nail Business tier ($297/mo) for single-location service businesses. Prove ROI in week 1 via weekly digest. Expand to agencies via Scale. Self-hosted voice stack drives 98%+ margins that no API-dependent competitor can match.

**B2B-first, solo-first, or hybrid:** Hybrid with SMB gravity. Lead with Business ($297). Solo ($49) is self-serve on-ramp. Enterprise for agencies and multi-location.

---

## SECTION 2 — BRUTAL CURRENT-STATE AUDIT

### What Works

529 tests pass. 0 TypeScript errors. Dashboard shows revenue_recovered_cents as hero metric. Needs-attention queue exists. Campaign create wizard has 5 steps with 10 types. Contact timeline tracks calls, messages, bookings, workflows, campaigns. Outbound settings have calling hours, voicemail behavior, daily limits, suppression rules, DNC compliance. Follow-up engine is database-driven with cron batch processing every 5 minutes. Sessions use HMAC-SHA256 with 30-day TTL. Rate limiting via Upstash Redis. Weekly digest email fully implemented via Resend. Homepage has 10 sections with FAQPage JSON-LD. Features section says "Not Just Another AI Receptionist." Deployment is now LIVE on Vercel after deleting middleware.ts.

### Top 30 Problems

1. Zero social proof — no testimonials, logos, case studies, revenue screenshots
2. Outbound engine invisible on homepage — biggest differentiator gets zero real estate
3. No /results or /case-studies page
4. ROI calculator buried at section 5 — should be section 3
5. No video demo or product tour
6. Industries section shows only 5 + custom — looks vertical-only
7. Demo page only shows voice quality, not product UI
8. Pricing has no outcome framing — just feature checkmarks
9. No competitor comparison on homepage
10. Hero widget shows static fake numbers (labeled "example" but hollow without context)
11. No founder/team presence — anonymous product
12. Mode system not explained on homepage
13. Follow-ups page is thin — no sequence performance metrics
14. Analytics is data-heavy but insight-light
15. Enterprise tier is hollow — 5 generic bullets
16. No API documentation page
17. Blog has only 6 slugs — minimal SEO footprint
18. No referral/partner program
19. Speed-to-lead runs every 2 minutes (poll-based) — should be event-driven
20. 103 cron route files exist but only 13 active — dead code confusion
21. Calendar integration depth unclear — 2-way sync unverified
22. No mobile push notifications
23. No data export for customers
24. No cancellation survey or churn capture
25. No dunning emails for failed payments
26. Webhook-only CRM on Business — Scale gets native sync, creates support burden
27. No A/B testing infrastructure
28. No status page or uptime monitoring
29. Founder bandwidth is the real bottleneck
30. Value framing caps perceived market size — examples suggest small businesses only

### Top 15 Strategic Problems

1. Category not claimed — first-mover advantage wasted by generic positioning
2. Outbound is the moat but hidden
3. Revenue attribution is the retention lock but unproven publicly
4. Solo ($49) may cannibalize Business ($297)
5. No agency/reseller channel
6. Support burden undefined — no SLA, no ticket system
7. Trial-to-paid nudges are generic
8. No retention playbook (no churn prediction, save offers, health scoring)
9. Multi-location is Scale-only — mid-market may not want $997
10. No marketplace for third-party industry packs
11. International voice untested despite 29 countries configured
12. No data export creates lock-in anxiety
13. Value framing suggests small deal sizes only — limits TAM perception
14. No security/compliance page for enterprise buyers
15. Pricing page doesn't justify the jump from $49 to $297

### Top 15 Conversion Problems

1. No proof above the fold
2. Two CTAs compete in hero
3. ROI calculator too far down
4. No product screenshots
5. Demo page doesn't show actual product
6. No urgency mechanism
7. CTA text too long ("Start Recovering Revenue — Free for 14 Days")
8. No exit intent capture
9. Trust signals are text-only — no badges/logos
10. No "who it's for" clarity in hero
11. Annual discount weak (17%)
12. No micro-commitment before trial
13. Comparison pages not linked from homepage
14. FAQ answers lack specific numbers
15. No outcome-based pricing framing

### Top 15 "Looks Generic/Narrow/Cheap" Problems

1. Homepage structure follows standard SaaS template
2. Pricing cards look like every AI tool
3. No unique visual signature
4. Hero widget feels like mockup, not product
5. Industries section too limited
6. No product screenshots make it feel unfinished
7. CTA copy is functional but not distinctive
8. Trust bar has no actual logos
9. Feature names are generic ("appointment booking," "missed call recovery")
10. Footer is standard
11. Blog section is thin
12. No comparison positioning on homepage
13. Examples cap deal sizes too low
14. Enterprise section is hollow
15. Overall feel is "one of many AI tools" not "category leader"

---

## SECTION 3 — CATEGORY CREATION

| Category | Clarity | Strength | Distinct | Premium | Enterprise | Expand | Winner? |
|----------|---------|----------|----------|---------|-----------|--------|---------|
| AI Revenue Operations | 8 | 9 | 9 | 9 | 9 | 9 | **Best** |
| AI Revenue Recovery | 9 | 8 | 7 | 8 | 7 | 6 | Good |
| AI Communication OS | 7 | 7 | 8 | 6 | 7 | 8 | Medium |
| AI Follow-Up Engine | 8 | 6 | 7 | 7 | 5 | 5 | Narrow |
| AI Business Phone | 9 | 5 | 4 | 5 | 4 | 4 | Weak |
| Revenue Automation OS | 7 | 8 | 8 | 7 | 8 | 8 | Close |
| AI Opportunity Engine | 7 | 8 | 8 | 8 | 8 | 7 | Strong |

**Winner: AI Revenue Operations.** Broad enough for inbound + outbound + follow-up + booking + recovery + attribution. Specific enough to promise measurable revenue outcomes. Positions above receptionists (narrow), below CRMs (passive), alongside sales engagement (but automated). Supports solo through enterprise without confusion. Does not cap deal sizes or perceived value.

---

## SECTION 4 — POSITIONING & MARKET FRAMING

**Lead with:** "Recover the revenue you are losing" — not "AI answers your calls." The word "recover" implies money that belongs to you. Worth $297+/mo. "Answer" implies a feature worth $29/mo.

**Message hierarchy:**
1. What: AI Revenue Operations — answers, follows up, books, recovers, proves ROI
2. Why: Every missed call, broken follow-up, and no-show is revenue you earned but failed to collect
3. How: Connect your number, AI answers 24/7, sequences follow up, revenue shows in your dashboard
4. Trust: 529 tests, HMAC sessions, per-contact suppression, human escalation on demand

**Avoid leading with:** "AI receptionist," "phone system," "answering service," any specific industry, or any metric that caps perceived value (avoid "average job value $650" — instead show ranges that include $5K+ deal sizes).

**Making broad scope believable:** Three modes (Solo/Sales/Business) + industry packs. Homepage shows mode selector with concrete previews. Use cases span from solo consultants to multi-location dental groups to sales teams. Revenue examples should range from $2K/mo recovery to $50K+/mo for larger operations.

---

## SECTION 5 — ICP / SEGMENT STRATEGY

| Segment | Pain | Pay | Speed | Support | Retain | Expand | Strategy |
|---------|------|-----|-------|---------|--------|--------|----------|
| Service businesses (dental, HVAC, legal, med spa) | 10 | 9 | 9 | 5 | 9 | 8 | **Immediate wedge** |
| Agencies managing clients | 7 | 9 | 6 | 7 | 9 | 10 | **Scale play** |
| Sales teams / SDR teams | 8 | 8 | 7 | 6 | 7 | 9 | **Medium-term** |
| Multi-location operators | 8 | 9 | 6 | 7 | 9 | 9 | Enterprise bridge |
| Real estate agents/teams | 8 | 7 | 8 | 4 | 7 | 6 | Vertical wedge |
| Clinics / healthcare | 9 | 8 | 8 | 6 | 9 | 7 | Premium vertical |
| Home services (plumbing, roofing) | 9 | 7 | 9 | 4 | 8 | 5 | High urgency |
| Recruiting / staffing | 7 | 7 | 6 | 5 | 6 | 7 | Expansion |
| Solo operators / consultants | 7 | 4 | 8 | 3 | 6 | 4 | Self-serve on-ramp |
| Creators / freelancers | 6 | 3 | 7 | 2 | 5 | 3 | Low priority |

**Best immediate wedge:** Single-location service businesses at Business ($297/mo).
**Best medium-term:** Sales teams using outbound for speed-to-lead and setter workflows.
**Best long-term:** Agencies managing 10-50 clients ($297/mo each = $3K-$15K MRR per agency).
**Most dangerous to over-focus on:** Solo at $49/mo — high volume, low revenue, high support.

**Deal-size framing:** Do NOT show examples that cap at "$650 average job." Show ranges: "Businesses recovering $2K-$50K+/month in revenue that was walking out the door." This makes the product credible for legal intake ($4K+ per case), real estate ($10K+ per deal), and multi-location operations.

---

## SECTION 6 — COMPETITOR WAR MAP

| Competitor | Category | Pricing | Vulnerability |
|-----------|----------|---------|---------------|
| Smith.ai | AI + human receptionist | $97-$1,125/mo, $3.25-$9.50/call | 10x more expensive at volume. No follow-up. No outbound. No revenue attribution. |
| Ruby | Live receptionist | $245-$1,695/mo, $1.50-$2.50/min | Pure human cost model. 5x pricier for fewer minutes. |
| Vapi / Bland AI / Retell | Voice AI infrastructure | $0.09-$0.31/min | Developer tools, not products. No dashboard. No workflows. |
| GoHighLevel | All-in-one agency | $97-$497/mo | Too complex. Setup takes weeks. No native AI voice calling. |
| SalesLoft / Outreach | Sales engagement | $100-$165/user/mo | Enterprise pricing. No AI calling. Email-centric. |
| Calendly / Acuity | Booking | Free-$20/user | Single feature. No calls. No recovery. |
| Jobber / Housecall Pro | Field service CRM | $49-$249/mo | CRM logs activity. Does not execute. No AI. |

**Primary differentiation:** Full-loop revenue operations (answer + follow up + book + recover + attribute). Nobody else does all five.
**Premium differentiation:** Revenue attribution — dashboard shows dollars recovered.
**Practical differentiation:** 2-minute setup. Industry packs. No IT needed.
**Emotional differentiation:** Control. Every action reviewable. Human escalation on demand.

---

## SECTION 7 — FINAL PRODUCT VISION

Recall Touch is the AI Revenue Operations platform. It answers every inbound call, runs outbound campaigns, executes multi-step follow-up sequences across voice + SMS + email, books appointments, recovers no-shows, reactivates dead leads, chases quotes, and measures every dollar recovered — automatically. Three modes (Solo, Sales, Business) and industry packs make it work for anyone from a solo consultant to a 50-location dental group to a 20-person sales team. The weekly digest proves ROI. The contact timeline accumulates institutional memory. The revenue attribution data becomes the source of truth for growth. Self-hosted voice infrastructure (Pipecat + Kokoro + Canary + Llama 3 8B) delivers 98%+ margins that no API-dependent competitor can match.

---

## SECTION 8 — FULL PRODUCT ARCHITECTURE

| Module | Purpose | Status | Must-Have | Advanced | Priority |
|--------|---------|--------|-----------|----------|----------|
| Omnichannel Inbox | Unified comms | Built (3-panel, SMS/email/WhatsApp) | As-is | AI-suggested replies | Maintain |
| Inbound Call Handling | Answer 24/7 | Built (Vapi + Deepgram + Claude) | Migrate to self-hosted | Custom voice personas | Phase 2-6 |
| Outbound Engine | Proactive campaigns | Built (10 types, 5-step wizard) | As-is | Power dialer, A/B sequences | Maintain |
| Follow-Up Engine | Multi-step sequences | Built (DB-driven, 5min cron) | As-is | Conditional branching | Maintain |
| Booking Engine | Appointment scheduling | Built (calendar page) | Verify 2-way sync | Team scheduling | Test |
| Revenue Attribution | Track $ recovered | Built (hero metric + digest) | As-is | Per-campaign attribution | Maintain |
| Contact Timeline | Full history | Built (5 event types) | As-is | AI summary per contact | Enhance |
| Agent Controls | Configure AI behavior | Built (5-step setup) | As-is | Sandbox mode | Enhance |
| Billing/Subscriptions | Plan management | Built (Stripe, 4 tiers) | Add dunning, grace period | Self-serve upgrade | Fix gaps |
| Analytics | Performance reporting | Built (43KB page) | As-is | Plain-English insights | Enhance |

---

## SECTION 9 — MODE SYSTEM

**Solo Mode:** Target self-employed. Onboarding: connect number, choose voice, set hours, test call (4 steps, <3 min). Dashboard: calls, appointments, follow-ups, revenue recovered. Upgrade trigger: hit 100 minutes or need outbound.

**Sales Mode:** Target SDR teams/setters. Onboarding: import leads, choose campaign, configure sequence, launch. Dashboard: pipeline view, speed-to-lead, conversion rates. Key metrics: contact rate, set rate, pipeline value.

**Business Mode (Default):** Target service businesses 100+ calls/mo. Onboarding: industry pack, connect number, hours, calendar, test call. Dashboard: revenue recovered hero, needs-attention, activity, campaigns. Key metrics: revenue recovered, no-shows recovered, reactivations.

---

## SECTION 10 — OUTBOUND EXECUTION

Lead import: CSV with column mapping, duplicate detection by phone, batch limits per tier. CRM sync via webhook (Business) or native (Scale). Campaign wizard: Type (10 options) -> Audience -> Sequence -> Schedule -> Review. Each step: channel, delay, template with merge fields, stop conditions. Execution respects business hours, per-contact limits, opt-out, DNC, daily cap, timezone. Sequences process every 5 min. Setter workflow: AI calls, qualifies, books with human closer. No answer -> voicemail + SMS. Compliance: max 1 call/day, 3/week per contact. 2 SMS/day. 7-day decline cooldown. 30-day conversion cooldown.

---

## SECTION 11 — INBOUND EXECUTION

Call flow: Ring -> AI answers (<3s) -> Greeting -> Intent detection (booking/question/complaint/emergency/sales) -> Route. After-hours: AI still answers, captures, books next-available, SMS confirmation, needs-attention queue. Missed-call recovery: immediate SMS within 30s, speed-to-lead triggers. Transfer: configurable per agent, warm or cold, context handoff includes caller name, reason, summary, sentiment.

---

## SECTION 12 — WEBSITE ARCHITECTURE

/, /pricing, /demo, /results, /industries/[slug] (8+), /compare/[competitor] (4+), /outbound, /enterprise, /security, /integrations, /blog (50+ articles), /activate, /sign-in, /solo, /sales, /business.

---

## SECTION 13 — HOMEPAGE

**Headline:** "Stop Losing Revenue to Missed Calls and Broken Follow-Up."
**Subheadline:** "Recall Touch answers every call, books appointments, and runs automated recovery sequences. See exactly how much revenue you recover — in your first week."
**Primary CTA:** "Start Free Trial"
**Trust bar:** AI Revenue Operations. Use your existing number. 2-min setup. No credit card.

**Optimized section order:** Navbar -> Hero -> Problem Statement -> ROI Calculator (MOVED UP) -> How It Works -> Industries (8+) -> Features/Differentiation -> Mode Selector -> Pricing -> FAQ -> Final CTA -> Footer.

**10 headline variants:** (1) Stop Losing Revenue to Missed Calls and Broken Follow-Up. (2) The Revenue You Are Losing Is Recoverable. (3) Every Missed Call Has a Dollar Amount. We Recover It. (4) Answer Every Call. Book Every Appointment. Recover Every Dollar. (5) Revenue Recovery on Autopilot. (6) Your Business Is Leaking Revenue. We Plug the Holes. (7) The AI That Does What Your Team Cannot: Follow Up on Everything. (8) AI Revenue Operations for Every Business. (9) The Follow-Up Your Business Needs But Never Gets. (10) Stop Leaving Money on the Table.

---

## SECTION 14 — BRAND/VISUAL SYSTEM

Typography: DM Sans (body), Playfair Display (marketing headlines). Correct pairing. Colors: Teal #0D6E6E (primary), Green #16A34A (success/revenue), Warm white #FAFAF8 (background). App is LIGHT themed. Marketing pages are dark. Premium cues: generous whitespace, subtle borders, fade-up animations (Framer Motion), Lucide icons. Avoid: gradient blobs, cartoon illustrations, "Built with AI" badges, stock photos, animated counters without real data.

---

## SECTION 15 — APP UI/UX

Sidebar: 9 items (Dashboard, Calls, Contacts, Inbox, Calendar, Follow-Ups, Campaigns, Analytics, Settings). Mobile: 3 tabs + overflow. Dashboard: revenue recovered hero, needs-attention queue, quick stats, minutes meter, campaigns, activity feed. All /app/* uses light theme CSS variables. Contact timeline: left 3/4 vertical timeline, right 1/4 contact card with AI summary. Campaign builder: 5-step wizard with sequence preview. Agent controls: 5-step setup with sandbox mode. Rename "Receptionist" template to "Inbound Agent" in UI.

---

## SECTION 16 — AGENT CONTROLS/GUARDRAILS

Presets per template: allowed/forbidden actions, escalation triggers, tone, compliance. Suppression: max 1 call/day, 3/week, non-bypassable. Human escalation: every agent has transfer-to-human number, warm/cold with context. Sandbox mode: live but actions logged, not executed. Audit trail: admin log under Settings, filterable by date/action/agent.

---

## SECTION 17 — VOICE STRATEGY

Self-hosted stack at $0.007/min: Pipecat (free) + Kokoro 82M TTS ($0.00012/min, Apache 2.0, TTS Arena #2) + Canary-1B-Flash STT ($0.000006/min, Apache 2.0) + Llama 3.3 8B ($0.002/min, 90% of calls) + Claude Haiku fallback (10%) + Telnyx SIP ($0.004/min). One RTX 4090 ($245/mo) supports ~500 Business customers. Margins: Solo 98.6%, Business 98.8%, Scale 97.9%. 6-phase migration, each independently deployable.

---

## SECTION 18 — PRICING

Solo $49/mo (100 min, $0.30 overage). Business $297/mo (500 min, $0.20 overage). Scale $997/mo (3,000 min, $0.12 overage). Enterprise custom. Trial: 14 days, no credit card. Grace: 3 days after expiration. Dunning: Stripe retry + email on each failure, pause after 4. Cancellation: survey + save offer + data export. Annual discount: increase to 20%. Value framing: remove any examples that cap deal sizes. Show ranges ($2K-$50K+/mo recovered).

---

## SECTION 19 — QA/RELIABILITY

Top 20 launch-killers: (1) No real customer in production. (2) Voice quality untested at scale. (3) Stripe webhook idempotency unverified. (4) No customer support channel. (5) No status page. (6) No product tour. (7) Calendar 2-way sync unverified. (8) Outbound TCPA compliance unverified with counsel. (9) No mobile push notifications. (10) Speed-to-lead poll latency. (11) No data export. (12) Trial grace period. (13) No cancellation survey. (14) No dunning emails. (15) No signup rate limiting. (16) No email verification. (17) Webhook retry logic. (18) No cron failure alerting. (19) No load testing. (20) No guided onboarding tour.

---

## SECTION 20 — SEO

Required pages: 8+ /industries/[slug] with 1500+ words each, 4+ /compare/[competitor], /outbound, /enterprise, /security, /integrations, 50+ /blog posts. Schema: Organization (exists), SoftwareApplication (exists), FAQPage (fix Q3 mismatch), add LocalBusiness on industry pages, HowTo on product pages. Keywords: "AI revenue recovery," "missed call recovery," "automated follow-up," "[industry] AI phone system."

---

## SECTION 21 — ANALYTICS

Track via PostHog: signup started/completed, onboarding steps (each of 5), first call received, first appointment booked, first revenue attributed, trial day 7, upgrade clicked, plan changed, campaign created/launched, contact imported, feature first use (each sidebar item), cancellation initiated/completed/saved. Executive dashboard: weekly MRR, trial-to-paid rate, churn, ARPU, total revenue recovered.

---

## SECTION 22 — COST/MARGIN

Self-hosted voice: $0.007/min. Solo 100 min = $0.70 COGS (98.6% margin). Business 500 min = $3.50 (98.8%). Scale 3,000 min = $21 (97.9%). Fixed infra: 2x RTX 4090 ($490/mo) for ~500 Business customers. Dangerous profiles: Scale customers using 3,000+ min consistently (most support tickets). Highest-margin path: large number of Business customers using 200-400 min/mo.

---

## SECTION 23 — GTM

Fastest to first revenue: founder-led sales to 10 service businesses in one metro. Offer: "14 days free. If we recover more than the plan costs, you stay." Close on weekly digest. Agency expansion: partner dashboard + 15% revenue share. Case study engine: every 60-day customer gets personalized case study from revenue_recovered data. Category signal: publish "State of Missed Revenue in Service Businesses" report.

---

## SECTION 24 — CUT/HIDE/DELAY

Cut: 90 dead enterprise cron routes (move to /deprecated). Hide: flow builder (Scale+ only), API docs (until Scale has customers), multi-location (gate behind Scale). Delay: native mobile app, WhatsApp, two-way CRM sync (webhook sufficient for Business), custom voice cloning on Solo. Simplify: Enterprise tier (either real enterprise page or replace with "Talk to us"). Rebuild: nothing needed — codebase is solid.

---

## SECTION 25 — CURSOR IMPLEMENTATION BRIEF

**Priority 1 (Week 1-2):** (1) Create /results page with proof structure. (2) Homepage section reorder (ROI calc to position 3). (3) Expand industries to 8+. (4) Add founder photo/bio. (5) Email verification on signup. (6) Dunning emails. (7) Trial grace period (3 days). (8) Cancellation survey. (9) Product tour (first-login tooltips). (10) Fix FAQ JSON-LD mismatch in page.tsx.

**Priority 2 — Voice Migration (Week 2-6):** (1) Pipecat pipeline server. (2) Kokoro TTS service. (3) Canary STT service. (4) Llama 3.3 8B via vLLM. (5) Confidence routing (90% Llama / 10% Claude). (6) Telnyx migration. (7) Voice presets (6 standard). (8) Quality A/B testing.

**Priority 3 — Conversion (Week 2-4, parallel):** (1) Ship to 5 real businesses. (2) Revenue-recovered screenshots. (3) /security trust page. (4) /outbound capabilities page. (5) Blog to 15+ articles. (6) 3 new industry pages. (7) A/B test headlines. (8) Competitor comparison cards on homepage.

**Data model:** workspaces -> contacts -> call_sessions + messages + bookings + workflow_enrollments + campaign_enrollments. agents (per workspace). sequences -> sequence_steps + sequence_enrollments. campaigns -> campaign_steps. usage_records. stripe_subscriptions. All with workspace_id FK + RLS.

**Build rules:** Next.js 16.1.6 App Router. React 19.2.3. TypeScript 5. Tailwind CSS 4 (@theme in globals.css). Supabase PostgreSQL + RLS. Stripe. Framer Motion. Lucide React. Recharts. next-intl. Resend. PostHog. Sentry. Forms: native state + Zod (NO react-hook-form). NO middleware.ts (auth guard is in app/layout.tsx). billing-plans.ts is the single source of truth. 529 tests must stay green.

---

## SECTION 26 — HOMEPAGE COPY

**Hero:** "Stop Losing Revenue to Missed Calls and Broken Follow-Up." / "Recall Touch answers every call, books appointments, and runs automated recovery sequences. See exactly how much revenue you recover — in your first week." / CTA: "Start Free Trial" / Trust: AI Revenue Operations. Use your existing number. 2-min setup. No credit card.

**Problem:** "Every Missed Call Has a Dollar Amount. Here Is Yours." / Interactive calculator.

**ROI Calculator:** "See How Much Revenue You Can Recover." / 3 sliders -> recovery estimate.

**How It Works:** "Get Live in Three Steps." / Forward calls (90s) -> AI picks up 24/7 (<3s) -> You get notified (instant).

**Industries:** "Built for How You Actually Work." / 8+ industry cards.

**Differentiation:** "Not Just Another AI Receptionist." / Comparison + 5 differentiators.

**Mode Selector:** "Pick the Lens That Matches How You Work." / Solo, Sales, Business tabs.

**Pricing:** 4 tiers with outcome framing. No deal-size caps in examples.

**FAQ:** 10 questions. Lead with "How is this different from an AI receptionist?"

**Final CTA:** "Every Day Without Recall Touch Is Revenue Walking Out the Door." / "Start Your Free Trial Now"

---

## SECTION 27 — FINAL DECISION STACK

| # | Decision | Answer |
|---|----------|--------|
| 1 | Best category | AI Revenue Operations |
| 2 | Best homepage message | Stop Losing Revenue to Missed Calls and Broken Follow-Up |
| 3 | Best wedge | Single-location service businesses at $297/mo |
| 4 | Best product shape | Inbound + Outbound + Follow-Up + Booking + Recovery + Attribution, 3 modes |
| 5 | Best pricing | Solo $49 / Business $297 / Scale $997 / Enterprise Custom |
| 6 | Best trust improvement | Ship to 5 real customers. Get revenue screenshots. Put them on the homepage. |
| 7 | Best margin move | Self-hosted voice: $0.007/min. 98%+ margins. |
| 8 | Biggest generic signal | No social proof. Anonymous product. No founder presence. |
| 9 | Biggest blocker to scale | Zero paying customers using it in production. |
| 10 | Path to #1 | Own AI RevOps. Prove it with real revenue data. Build agency channel. Let compounding attribution data make it impossible to leave. |

---

*End of V13. Deployment is live. 529 tests pass. 0 TypeScript errors. The product is built. The category is unclaimed. Execute.*
