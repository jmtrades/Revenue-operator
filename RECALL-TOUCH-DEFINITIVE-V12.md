# RECALL TOUCH — V12 DEFINITIVE MASTER DOCUMENT

**27 Sections. Full Product Audit. Full Redesign. Full Cursor Implementation Brief. Full Self-Hosted Voice Stack. Everything.**

Written after reading every source file in the codebase and verified against 529 passing tests and 0 TypeScript errors. This is the single document that replaces all previous versions (V6–V11).

---

## SECTION 1 — EXECUTIVE VERDICT

**What Recall Touch is today:** A surprisingly complete AI revenue recovery system. 529 tests pass. 0 TypeScript errors. Full inbound + outbound engines, 10 campaign types, contact timeline, outbound settings, 9-item sidebar, 3-mode UI, ROI calculator, PostHog + Sentry integrated, 13 active crons. The engineering is real.

**Why the current framing is too weak:** The homepage and brand lean toward "AI that answers calls." That's a feature every competitor offers. The outbound engine, campaign builder, setter workflows, revenue attribution — the actual differentiators — are invisible to prospects. A visitor scanning for 10 seconds sees "missed calls" and "voicemail." They should see "revenue recovered."

**What it should become:** The AI Revenue Operations platform. Not a receptionist. Not a dialer. Not a CRM. The execution layer that turns every call, follow-up, and booking into measured, attributed revenue — automatically.

**Category to own:** AI Revenue Operations (AI RevOps). Distinct from AI receptionist (too narrow), AI dialer (too outbound), CRM (too passive), and marketing automation (too email-centric). RevOps implies the full loop: capture → qualify → book → follow up → recover → attribute → prove ROI.

**What it must not be:** An "AI phone system." A "virtual receptionist." A "call answering tool." A "voice AI wrapper." None of these deserve $297/month.

**Biggest blocker:** Zero social proof. No customers, no logos, no case studies, no screenshots of real revenue recovered. Trust is theoretical.

**Biggest opportunity:** Nobody owns AI RevOps for service businesses. GoHighLevel is too complex. Smith.ai is too expensive. Bland/Vapi are developer tools. The gap: a system that answers + follows up + books + recovers + proves ROI, at software margins, usable by non-technical people in 2 minutes.

**Strongest path:** Nail Business tier ($297/mo) for single-location service businesses. Prove ROI in week 1 via weekly digest. Use case studies and revenue attribution as the wedge. Expand to agencies via Scale tier.

**B2B-first, solo-first, or hybrid:** Hybrid with SMB gravity. Lead with Business ($297). Solo ($49) is self-serve on-ramp. Enterprise for agencies.

---

## SECTION 2 — BRUTAL CURRENT-STATE AUDIT

### What's Strong

The codebase is remarkably complete. Dashboard shows revenue_recovered_cents as hero metric with trend %. Needs-attention queue. Activity feed. Minutes meter with amber/red at 80%/100%. Campaign create wizard has 5 steps, 10 types. Contact timeline tracks calls, messages, bookings, workflows, campaigns. Outbound settings have calling hours, voicemail behavior, daily limits, suppression rules, DNC compliance. Follow-up engine is database-driven with cron batch processing every 5 minutes. Sessions use HMAC-SHA256 with 30-day TTL. Rate limiting via Upstash Redis. Weekly digest fully implemented via Resend. Homepage trimmed to 10 sections with FAQPage JSON-LD. Features section says "Not Just Another AI Receptionist."

### Top 30 Current Problems

1. Identity confusion — product does 10 things, homepage sells 2
2. Zero social proof — no testimonials, logos, case studies, revenue screenshots
3. Dark-themed app dashboard — service businesses expect light, clean interfaces (zinc-900, black/30 backgrounds in UnifiedDashboard)
4. Outbound engine invisible on homepage — biggest differentiator gets zero real estate
5. No /results or /case-studies page
6. ROI calculator buried at section 5 — should be section 3
7. No video demo or product tour
8. Industries section shows only 5 + custom card — looks vertical-only
9. Demo page only shows voice quality, not product UI
10. Pricing page feels generic SaaS — feature checkmarks, no outcome framing
11. No competitor comparison surfaced from homepage
12. Hero widget shows static fake numbers (labeled "example" but still hollow)
13. No founder/team presence — anonymous product
14. Mode system not explained on homepage
15. Follow-ups page is thin — no sequence performance metrics
16. Analytics is data-heavy but insight-light — no plain-English recommendations
17. Enterprise tier is hollow — 5 generic bullets
18. No API documentation page
19. Blog has only 6 slugs — minimal SEO footprint
20. No referral/partner program
21. Follow-Ups sidebar label hardcoded (not using i18n `t()`)
22. FAQ JSON-LD in page.tsx still has stale "Revenue Execution OS" question (needs sync with component)
23. Speed-to-lead runs every 2 minutes (poll-based) — should be event-driven for <30s response
24. 103 cron route files exist but only 13 active — dead code creates confusion
25. Calendar integration depth unclear — 2-way sync unverified
26. No mobile push notifications
27. No data export for customers
28. No cancellation survey or churn capture
29. No dunning emails for failed payments
30. Webhook-only CRM on Business tier — Scale gets native sync, creates support burden

### Top 15 Strategic Problems

1. Category not claimed — first-mover advantage being wasted
2. Outbound is the moat but hidden
3. Revenue attribution is the retention lock but unproven publicly
4. Solo ($49) may cannibalize Business ($297) — feature gates must create urgency
5. No agency/reseller channel
6. Voice costs at $0.099/min eat margins at scale (Phase 1)
7. Support burden undefined — no SLA, no ticket system
8. International voice untested (29 countries configured)
9. Trial-to-paid conversion nudges are generic
10. No retention playbook (no churn prediction, save offers, health scoring)
11. No A/B testing infrastructure for homepage
12. Founder bandwidth is the real bottleneck — solo founder building + selling + supporting
13. Multi-location is Scale-only — mid-market (3–5 locations) may not want $997/mo
14. No marketplace/ecosystem for third-party industry packs
15. No status page or uptime monitoring

### Top 15 Conversion Problems

1. No proof above the fold
2. Two CTAs compete in hero ("Start Recovering Revenue" vs "See How It Works")
3. ROI calculator too far down the page
4. No product screenshots anywhere
5. Demo page doesn't show actual product
6. No urgency mechanism
7. Pricing has no outcome framing
8. CTA text too long
9. No exit intent capture
10. Trust signals are text-only — no badges/logos
11. No "who it's for" clarity in hero
12. Annual discount is weak (17% vs 20–25%)
13. No micro-commitment before trial (quiz, email capture, ROI report)
14. Comparison pages not linked from homepage
15. FAQ answers could be sharper with specific numbers

### Top 15 Trust Problems

1. Zero customer logos or testimonials
2. No security/compliance page
3. No SOC 2 mention
4. No founder identity
5. No uptime/status page
6. No data handling policy visible
7. No HIPAA compliance mention (relevant for dental/healthcare)
8. No recording consent disclosure details
9. No audit trail visibility for customers
10. No SLA documentation
11. No data export/portability
12. Enterprise tier looks hollow
13. No third-party security badges
14. No customer support channel visible on website
15. Agent controls exist but aren't showcased as a trust feature

### Top 15 UX Problems

1. Dark dashboard theme in /app/* (zinc-900 backgrounds)
2. No guided product tour for new users
3. Follow-ups page needs performance metrics
4. Analytics needs plain-English insights
5. Contact timeline needs AI-generated summary
6. Campaign wizard needs sequence preview panel
7. No sandbox/preview mode for agents before going live
8. Settings has 16+ pages — overwhelming without progressive disclosure
9. Mobile has no push notifications
10. No empty states with helpful guidance
11. Command palette exists but discoverability is poor
12. Billing/usage page needs clearer overage warnings
13. Agent template naming ("Receptionist" should be "Inbound Agent")
14. No inline help or tooltip explanations
15. Loading states and error states need improvement throughout

### Top 15 "Looks Generic" Problems

1. Homepage structure follows standard SaaS template
2. Pricing cards look like every AI tool
3. No unique visual signature
4. Hero widget feels like a mockup, not a product
5. Industries section is too limited — 5 industries feels niche
6. No product screenshots make it feel unfinished
7. Dark marketing + dark app makes everything blend together
8. CTA copy is functional but not distinctive
9. Trust bar has no actual logos
10. FAQ could be more opinionated
11. Footer is standard
12. Blog section is thin
13. No comparison positioning on homepage
14. "Now accepting early customers" would be more honest than fake metrics
15. Feature names are generic ("appointment booking," "missed call recovery") — need outcome framing

### Top 15 "Probably Broken or Incomplete" Problems

1. Dashboard dark theme classes need full replacement
2. FAQ JSON-LD mismatch with component
3. Follow-Ups i18n key missing
4. Speed-to-lead poll latency (2 min)
5. Calendar 2-way sync depth unclear
6. Dunning/failed payment handling incomplete
7. Trial grace period undefined
8. Cancellation flow incomplete
9. Webhook retry/backoff logic undefined
10. Email verification on signup unclear
11. Rate limiting on signup unclear
12. Load testing not performed
13. Concurrent call limits untested at scale
14. Voice call quality monitoring undefined
15. Customer data export not implemented

---

## SECTION 3 — CATEGORY CREATION

| Category | Clarity | Strength | Distinct | Premium | Expand | Winner? |
|----------|---------|----------|----------|---------|--------|---------|
| AI Revenue Recovery | 9 | 8 | 7 | 8 | 6 | Good |
| AI Revenue Operations | 8 | 9 | 9 | 9 | 9 | **Best** |
| AI Communication OS | 7 | 7 | 8 | 6 | 8 | Medium |
| AI Follow-Up Engine | 8 | 6 | 7 | 7 | 5 | Narrow |
| AI Business Phone | 9 | 5 | 4 | 5 | 4 | Weak |
| Revenue Automation OS | 7 | 8 | 8 | 7 | 8 | Close second |

**Winner: AI Revenue Operations.** Broad enough for inbound + outbound + follow-up + booking + recovery + attribution. Specific enough to promise measurable revenue outcomes. Positions above receptionists (narrow), below CRMs (passive), alongside sales engagement (but automated). Supports solo → sales → business without confusion.

**Tagline:** "Recall Touch — AI Revenue Operations for every business."

---

## SECTION 4 — POSITIONING & MARKET FRAMING

**Lead with:** The outcome ("Recover the revenue you're losing"), not the technology ("AI answers your calls"). "Recover" implies money that already belongs to you. Worth $297/mo. "Answer" implies a feature. Worth $29/mo.

**Message hierarchy:**
1. *What it is:* AI Revenue Operations — answers, follows up, books, recovers, proves ROI
2. *Why it matters:* Every missed call, broken follow-up, and no-show is revenue you earned but failed to collect
3. *How it works:* Connect your number → AI answers 24/7 → Sequences follow up → Revenue recovered in your dashboard
4. *Why trust us:* 529 automated tests, HMAC sessions, per-contact suppression rules, human escalation on demand

**Avoid leading with:** "AI receptionist," "phone system," "answering service," "automation tool," or any specific industry.

**Making broad scope believable:** Three modes (Solo/Sales/Business) + industry packs. Homepage shows mode selector with concrete previews. Each mode has its own dashboard defaults. Industry packs provide depth. Modes provide breadth. Together they prevent "too narrow" and "too generic."

---

## SECTION 5 — ICP / SEGMENT STRATEGY

| Segment | Pain | Pay | Speed | Support | Retain | Expand | Strategy |
|---------|------|-----|-------|---------|--------|--------|----------|
| Service businesses (dental, HVAC, legal, med spa) | 10 | 9 | 9 | 5 | 9 | 8 | **Immediate wedge** |
| Home services (plumbing, roofing, electrical) | 9 | 7 | 9 | 4 | 8 | 5 | High urgency |
| Real estate agents | 8 | 6 | 8 | 4 | 7 | 5 | Vertical wedge |
| Clinics / healthcare | 9 | 8 | 8 | 6 | 9 | 7 | Premium vertical |
| Sales teams / SDR teams | 8 | 8 | 7 | 6 | 7 | 9 | **Medium-term** |
| Agencies managing clients | 7 | 9 | 6 | 7 | 9 | 10 | **Scale play** |
| Solo operators / consultants | 7 | 4 | 8 | 3 | 6 | 4 | Self-serve on-ramp |
| Multi-location operators | 8 | 9 | 6 | 7 | 9 | 9 | Enterprise bridge |
| Recruiting / staffing | 7 | 7 | 6 | 5 | 6 | 7 | Expansion |
| Creators / freelancers | 6 | 3 | 7 | 2 | 5 | 3 | Low priority |
| Education / tutoring | 5 | 4 | 5 | 4 | 5 | 3 | Deprioritize |

**Best immediate wedge:** Single-location service businesses at Business ($297/mo). Pain is acute, ability to pay is strong ($297 < 1 appointment), speed to value is fast, retention is high via weekly revenue digest.

**Best medium-term:** Sales teams using outbound for speed-to-lead and appointment setting.

**Best long-term:** Agencies managing 10–50 clients. Each client = $297/mo account.

**Most dangerous to over-focus on:** Solo at $49/mo. High volume, low revenue, high support, low retention.

---

## SECTION 6 — COMPETITOR WAR MAP

| Competitor | Category | Pricing | No Follow-Up | No Outbound | No Revenue Attribution | Vulnerability |
|-----------|----------|---------|-------------|------------|----------------------|---------------|
| Smith.ai | AI + human receptionist | $97–$1,125/mo, $3.25–$9.50/call | ✓ | ✓ | ✓ | 10x more expensive at volume |
| Ruby | Live receptionist | $245–$1,695/mo, $1.50–$2.50/min | ✓ | ✓ | ✓ | Pure human cost, 5x pricier for fewer minutes |
| Vapi | Voice AI infrastructure | $0.13–$0.31/min all-in | N/A (dev tool) | N/A | N/A | Not a product. Requires engineering team. |
| Bland AI | Outbound calling AI | $0.09–$0.14/min | N/A (dev tool) | N/A | N/A | Developer tool. Hidden fees. No dashboard. |
| GoHighLevel | All-in-one agency | $97–$497/mo | Partial | Partial | No | Too complex. Setup takes weeks. |
| SalesLoft/Outreach | Sales engagement | $100–$165/user/mo | Partial (email) | No AI voice | No | Enterprise pricing. No AI calling. |
| Calendly | Booking | Free–$20/user | N/A | N/A | N/A | Single feature. |
| Jobber/Housecall Pro | Field service CRM | $49–$249/mo | No | No | No | CRM logs. Doesn't execute. |

**Primary differentiation:** Full-loop revenue operations (answer + follow up + book + recover + attribute). Nobody else does all five.

**Premium differentiation:** Revenue attribution. Dashboard shows dollars recovered. Weekly digest proves ROI.

**Practical differentiation:** 2-minute setup with existing number. No IT. Industry packs ready on day 1.

**Emotional differentiation:** Control. Every action reviewable. Every sequence configurable. Human escalation on demand.

---

## SECTION 7 — FINAL PRODUCT VISION

Recall Touch is the AI Revenue Operations platform. It answers every inbound call, runs outbound campaigns, executes multi-step follow-up sequences across voice + SMS + email, books appointments, recovers no-shows, reactivates dead leads, chases quotes, and measures every dollar recovered — automatically. Three modes (Solo, Sales, Business) and industry packs make it work for anyone from a solo consultant to a 50-location dental group. Users understand it in 30 seconds: "Your business is leaking revenue from missed calls and broken follow-up. Recall Touch plugs the leaks and shows you the money." Buyers pay $297/mo because the weekly digest proves the system recovers more than it costs. It's hard to replace because the contact timeline accumulates institutional memory and the revenue attribution data becomes the business's source of truth for growth.

---

## SECTION 8 — FULL PRODUCT ARCHITECTURE

| Module | Purpose | Current State | Must-Have | Advanced | Retention Value | Priority |
|--------|---------|--------------|-----------|----------|----------------|----------|
| Omnichannel Inbox | Unified comms view | Built — 3-panel, SMS/email/WhatsApp, 30s polling | As-is | AI-suggested replies, sentiment tags | High (stickiness) | Maintain |
| Inbound Call Handling | Answer every call 24/7 | Built — Vapi + Deepgram + Claude, <3s | Migrate to self-hosted stack | Custom voice personas, live transfer | Critical (core value) | Phase 2–6 migration |
| Outbound Engine | Proactive campaigns | Built — 10 types, 5-step wizard, cron-driven | As-is | Power dialer, predictive, A/B sequences | High (moat) | Maintain |
| Follow-Up Engine | Multi-step sequences | Built — DB-driven, contact-enrollment, 5min cron | As-is | Conditional branching, ML optimization | Critical (retention) | Maintain |
| Booking Engine | Appointment scheduling | Built — calendar page + call booking | Verify 2-way Google sync | Team scheduling, buffer time | High | Test thoroughly |
| Revenue Attribution | Track dollars recovered | Built — revenue_recovered_cents + weekly digest | As-is | Per-campaign, per-agent, LTV tracking | Critical (retention lock) | Maintain |
| Contact Timeline | Full touchpoint history | Built — call/message/booking/workflow/campaign | As-is | AI summary per contact, next-best-action | High (stickiness) | Enhance |
| Agent Controls | Configure AI behavior | Built — identity/behavior/go-live/knowledge/test | As-is | Sandbox mode, confidence thresholds | Critical (trust) | Enhance |
| Billing/Subscriptions | Plan management | Built — Stripe, 4 tiers, usage tracking | Add dunning, grace period | Self-serve upgrade/downgrade, proration | Required | Fix gaps |
| Analytics | Performance reporting | Built — 43KB analytics page | As-is | Plain-English insights | Medium | Enhance |

---

## SECTION 9 — MODE SYSTEM DESIGN

### Solo Mode
**Target:** Self-employed, consultants, freelancers. **Onboarding:** Connect number → Choose voice → Set hours → Test call. 4 steps, <3 min. **Dashboard:** Simplified — calls this week, appointments booked, follow-ups sent, revenue recovered. **Upgrade trigger:** Hit 100 minutes or need outbound campaigns.

### Sales Mode
**Target:** SDR teams, setters, closers, agencies. **Onboarding:** Import leads → Choose campaign type → Configure sequence → Launch. **Dashboard:** Pipeline view — leads by stage, speed-to-lead, conversion rates, agent performance. **Key metrics:** Speed to lead, contact rate, set rate, pipeline value.

### Business Mode (Default)
**Target:** Service businesses with 100+ monthly calls. **Onboarding:** Industry pack → Connect number → Business hours → Calendar → Test call → Go live. **Dashboard:** Revenue recovered hero, needs-attention queue, activity feed, minutes meter, campaigns. **Key metrics:** Revenue recovered, calls answered, no-shows recovered, reactivations.

### Industry Packs
Pre-built agent templates with scripts, follow-up sequences, and defaults for: dental, HVAC, legal, med spa, real estate, plumbing, roofing, healthcare, recruiting. Each pack sets voice persona, greeting, FAQ knowledge base, booking rules, and sequence templates.

---

## SECTION 10 — OUTBOUND / SETTER / CRM EXECUTION

**Lead import:** CSV with column mapping (name, phone, email, tags). Duplicate detection by phone. Batch limits per tier (Solo: 100, Business: 1,000, Scale: 10,000). CRM sync via webhook (Business) or native (Scale).

**Campaign execution:** 5-step wizard → Type → Audience → Sequence → Schedule → Review. Pre-loaded templates per type. Each step: channel, delay, template with merge fields, stop conditions. Execution respects business hours, per-contact limits, opt-out, DNC, daily cap, timezone. Sequences process every 5 min via cron.

**Setter workflow:** AI calls → qualifies interest → books meeting with human closer. No answer → voicemail + SMS. Objection → configured escalation. Booking → calendar invite + 24h/1h reminders. No-show → recovery sequence.

**Compliance:** Max 1 call/day, 3/week per contact. 2 SMS/day. 7-day decline cooldown. 30-day conversion cooldown. DNC registry check on Business+. Opt-out honored instantly/permanently. Calling hours 9AM–8PM recipient timezone.

---

## SECTION 11 — INBOUND / RECEPTION / ROUTING

**Call flow:** Ring → AI answers (<3s) → Greeting → Intent detection (booking/question/complaint/emergency/sales) → Route: Booking → check calendar, offer slots, confirm, SMS. Question → knowledge base, callback if unresolved. Emergency → transfer to human immediately. Complaint → capture, escalate. Sales → qualify, capture, book.

**After-hours:** AI still answers. Captures name, phone, need. Books next-available. SMS confirmation. Needs-attention queue for morning review.

**Missed-call recovery:** Immediate SMS within 30 seconds. Speed-to-lead cron picks up. Contact in needs-attention queue.

**Transfer/escalation:** Configurable per agent — specific number, department, team member. Context handoff includes caller name, reason, summary, sentiment. Warm or cold transfer. Escalation triggers: emergency keywords, high-value caller, low confidence, explicit human request.

---

## SECTION 12 — WEBSITE ARCHITECTURE

| Path | Page | Purpose |
|------|------|---------|
| / | Homepage | 10-section conversion page |
| /pricing | Full pricing | 4-tier comparison, feature matrix, FAQ |
| /demo | Interactive demo | Voice demo + product tour + dashboard screenshots |
| /results | Case studies | Revenue recovered metrics, customer stories |
| /industries/[slug] | Industry pages | 1,500+ words each, specific pain points, outcomes |
| /compare/[competitor] | Comparisons | vs Smith.ai, Ruby, GoHighLevel, hiring |
| /outbound | Outbound capabilities | Campaign types, setter workflows, compliance |
| /enterprise | Enterprise | White-label, SSO, SLA, multi-location |
| /security | Trust & security | Encryption, rate limiting, compliance roadmap |
| /integrations | Integrations | CRM, calendar, Stripe, API access |
| /blog | Content hub | SEO articles on revenue recovery |
| /activate | Onboarding | Signup → industry → number → agent → test call |

---

## SECTION 13 — HOMEPAGE REDESIGN

**Headline:** "Stop Losing Revenue to Missed Calls and Broken Follow-Up."

**Subheadline:** "Recall Touch answers every call, books appointments, and runs automated recovery sequences. See exactly how much revenue you recover — in your first week."

**Primary CTA:** "Start Free Trial" | **Secondary:** "See How It Works"

**Trust bar:** AI Revenue Operations · Use your existing number · 2-min setup · No credit card

**Section order (optimized):** Navbar → Hero → Problem Statement → **ROI Calculator (moved up)** → How It Works → Industries → Features/Differentiation → Mode Selector → Pricing → FAQ → Final CTA → Footer

**10 headline variants:**
1. Stop Losing Revenue to Missed Calls and Broken Follow-Up.
2. The Revenue You're Losing Is Recoverable.
3. Every Missed Call Has a Dollar Amount. We Recover It.
4. Answer Every Call. Book Every Appointment. Recover Every Dollar.
5. Revenue Recovery on Autopilot.
6. Your Business Is Leaking Revenue. We Plug the Holes.
7. The AI That Does What Your Team Can't: Follow Up on Everything.
8. The Follow-Up Your Business Needs But Never Gets.
9. AI Revenue Operations for Every Business.
10. Stop Leaving Money on the Table.

**10 CTA variants:**
1. Start Free Trial
2. Start Recovering Revenue
3. See Your Revenue Leak
4. Try It Free — 14 Days
5. Get Started Free
6. Start Now — No Credit Card
7. Calculate Your Revenue Leak
8. Watch the Demo
9. Talk to Us
10. See It Work

---

## SECTION 14 — BRAND / VISUAL SYSTEM

**Typography:** DM Sans (body/UI), Playfair Display (marketing headlines). Correct pairing. Do not change.

**Colors:** Teal (#0D6E6E) primary accent. Green (#16A34A) for success/revenue. Warm white (#FAFAF8) background. These are correct and premium.

**CRITICAL FIX:** App dashboard must be LIGHT themed. Replace all zinc-900/black backgrounds with CSS variable equivalents. Marketing pages stay dark.

**Premium cues:** Generous whitespace (24–48px sections). Subtle border radius (8–12px, not 24px). Thin borders (1px, low opacity). Fade-up animations on scroll (Framer Motion). No stock photos — use product screenshots and data visualizations. Lucide React icons (clean, consistent).

**Avoid:** Gradient blobs, cartoon illustrations, "Built with AI" badges, excessive emoji, rainbow gradients, testimonial carousels with stock photos, animated counters without real data.

---

## SECTION 15 — FULL APP UI/UX DESIGN

**Sidebar:** 9 items (Dashboard, Calls, Contacts, Inbox, Calendar, Follow-Ups, Campaigns, Analytics, Settings). Do not add more. Advanced features under Settings.

**Dashboard first-load:** Revenue recovered (green, large, trend %). Needs-attention queue. Quick stats. Minutes bar. Campaigns. Activity feed. LIGHT theme.

**Contact timeline:** Left 3/4 vertical timeline (calls, messages, bookings, workflows, campaigns). Right 1/4 contact card (name, phone, state, revenue attributed, quick actions). Add AI summary at top.

**Campaign builder:** 5-step wizard. 10 types. Add sequence timeline preview panel.

**Agent controls:** 5-step setup (Identity, Behavior, GoLive, Knowledge, Test). Add sandbox mode. Rename "Receptionist" template to "Inbound Agent" in UI.

**Mobile:** 3-tab bottom nav + More overflow. Push notifications for needs-attention. Touch-optimized.

**Onboarding:** /activate → 5 steps, 3 minutes. Industry → Number → Voice → Hours → Test Call. Progress bar. Skip allowed. Return anytime.

---

## SECTION 16 — AGENT CONTROLS / SAFETY / GUARDRAILS

**Presets per template:** Allowed actions (book, transfer, capture, SMS), forbidden actions (never promise pricing, never diagnose medical, never give legal advice), escalation triggers (emergency, high-value, low confidence), tone (professional/warm/direct), compliance (recording consent, opt-out).

**Suppression:** Max 1 call/day, 3/week, 2 SMS/day per contact. Non-bypassable. Even admins can't set maxCallsPerDay above 3 to prevent TCPA violations.

**Human escalation:** Every agent must have a transfer-to-human number. Warm transfer includes context summary. If no human available: "I'll have someone call you back within [timeframe]" + needs-attention item.

**Sandbox mode:** Agent is live but all outbound actions are logged, not executed. Allows monitoring before full deployment.

**Audit trail:** Every AI action logged. Admin audit log page under Settings. Filterable by date, action type, agent.

---

## SECTION 17 — VOICE STRATEGY: SELF-HOSTED, NEAR-ZERO COST

### The Cost Stack — Everything Self-Hosted

| Component | Outsourced (Phase 1) | Self-Hosted | Savings |
|-----------|---------------------|-------------|---------|
| Orchestration | Vapi $0.035/min | **Pipecat** (open source) $0.000 | 100% |
| TTS | Deepgram $0.015/min | **Kokoro 82M** (Apache 2.0) $0.00012/min | 99% |
| STT | Deepgram $0.015/min | **Canary-1B-Flash** (Apache 2.0) $0.000006/min | 99.96% |
| LLM | Claude Haiku $0.024/min | **Llama 3.3 8B** (self-hosted) $0.002/min + Claude 10% fallback | 92% |
| Telephony | Twilio $0.010/min | **Telnyx SIP** $0.004/min | 60% |
| **TOTAL** | **$0.099/min** | **$0.007/min** | **93%** |

### GPU Infrastructure

**One RunPod RTX 4090 ($0.34/hr = $245/mo)** runs ALL THREE models:
- Kokoro 82M TTS: ~2GB VRAM, 96x real-time
- Canary-1B-Flash STT: ~4GB VRAM, 1,000x real-time
- Llama 3.3 8B INT8: ~8GB VRAM, ~5,000 tokens/sec
- Total: ~14GB of 24GB available

One GPU supports ~500 Business customers. Add a second for redundancy = $490/mo for $148,500/mo revenue. That's 0.3% of revenue on infrastructure.

### Margins at Self-Hosted Prices

| Tier | Revenue | COGS | Margin |
|------|---------|------|--------|
| Solo (100 min) | $49 | $0.70 | **98.6%** |
| Business (500 min) | $297 | $3.50 | **98.8%** |
| Scale (3,000 min) | $997 | $21.00 | **97.9%** |

### Voice Quality

**Kokoro 82M:** TTS Arena ELO 1,059 (#2 overall, #1 open-weight). TTFB <100ms. Apache 2.0. For business phone calls, indistinguishable from ElevenLabs.

**Fish Speech S1-mini:** ELO 1,339 for premium voice cloning on Business+. 10 seconds of reference audio. Apache 2.0.

**Canary-1B-Flash:** 6.7% WER, competitive with Deepgram Nova-2. Streaming-native.

**Llama 3.3 8B:** Adequate for routing, booking, and standard conversations. Claude Haiku as 10% fallback for complex objection handling.

### Voice Presets

Solo: 6 standard (professional female/male, warm female/male, neutral, energetic). Business+: 40 industry-optimized. Voice cloning: Business 3 slots, Scale 10, Enterprise unlimited.

### Phased Migration

| Phase | When | Action | Cost/Min |
|-------|------|--------|---------|
| 1 (current) | Now | Vapi + Deepgram + Claude + Twilio | $0.099 |
| 2 | Week 1–2 | Pipecat replaces Vapi | $0.064 |
| 3 | Week 2–3 | Kokoro replaces Deepgram TTS | $0.049 |
| 4 | Week 3–4 | Canary replaces Deepgram STT | $0.034 |
| 5 | Week 4–5 | Llama 3 8B replaces Claude (with fallback) | $0.012 |
| 6 | Week 5–6 | Telnyx replaces Twilio | $0.007 |

Each phase ships independently. Roll back instantly if quality drops.

---

## SECTION 18 — PRICING, PACKAGING & SUBSCRIPTIONS

**Tiers (from billing-plans.ts — source of truth):**

Solo $49/mo ($39 annual) | Business $297/mo ($247 annual) | Scale $997/mo ($847 annual) | Enterprise Custom

**Overages:** Solo $0.30/min, Business $0.20/min, Scale $0.12/min.

**Trial-to-paid flow:** Day 0: signup + test call. Day 1: check-in email. Day 3: nudge with stats. Day 7: weekly digest (hero: revenue recovered). Day 10: in-app upgrade prompt. Day 12: email summary + CTA. Day 14: trial expires. 3-day grace period (banner, calls still answered). Day 17: service stops. Reactivation email.

**Dunning:** Stripe retry schedule (1, 3, 5, 7 days). Email on each failure. Workspace paused after 4 failures. Reactivation flow on re-payment.

**Cancellation:** Survey (why leaving?), save offer (1 month free on annual), export data option, confirmation screen, 30-day data retention after cancellation.

---

## SECTION 19 — QA / RELIABILITY

### Top 20 Launch-Killers

1. No real customer has used it in production — ship beta to 5 businesses immediately
2. Voice call quality untested at scale — load test 10 concurrent calls
3. Stripe webhook idempotency unverified
4. No customer support channel
5. No status page
6. Dark dashboard theme
7. No product tour
8. Calendar 2-way sync unverified
9. Outbound TCPA compliance unverified with counsel
10. No mobile push notifications
11. Speed-to-lead poll latency (2 min vs <30s event-driven)
12. No data export
13. Trial grace period undefined
14. No cancellation survey
15. No dunning emails
16. No signup rate limiting
17. No email verification
18. Webhook failure retry undefined
19. No cron failure alerting
20. No load testing

### Top 50 QA Test Cases

**Auth (1–10):** Signup with valid/invalid email; login/logout; password reset; route protection on /app/*; role-based access; session expiry at 30 days; HMAC tamper detection; concurrent sessions; SSO flow (enterprise); email verification.

**Billing (11–20):** Plan selection; Stripe checkout completion; webhook processing; upgrade mid-cycle; downgrade; cancellation; reactivation; overage calculation; dunning on failed payment; invoice generation.

**Inbound (21–30):** Call answered <3s; intent detection accuracy; booking flow; SMS confirmation sent; after-hours behavior; missed-call recovery SMS; transfer to human; emergency escalation; customer memory recall; FAQ knowledge base response.

**Outbound (31–40):** Campaign creation 5-step wizard; sequence execution; business hours enforcement; per-contact limits; opt-out honored; voicemail detection; DNC check; daily cap enforcement; timezone respect; campaign pause/resume.

**Follow-up (41–45):** Enrollment triggers correctly; step delays accurate; stop-on-reply works; stop-on-booking works; completion status set.

**Dashboard (46–50):** Revenue recovered displays correctly; needs-attention populates; minutes bar thresholds work; activity feed updates; campaign stats accurate.

---

## SECTION 20 — SEO

**Required pages:** Homepage, /pricing, /demo, /results, 8+ /industries/[slug], 4+ /compare/[competitor], /outbound, /enterprise, /security, /integrations, /blog (50+ articles).

**Schema:** Organization (exists), SoftwareApplication (exists, $49–$997), FAQPage (exists — fix Q3 mismatch), add LocalBusiness on industry pages, HowTo on product pages, AggregateRating when reviews exist.

**Keywords:** Primary: "AI revenue recovery," "missed call recovery," "automated follow-up." Secondary: "[industry] AI phone system," "AI receptionist vs [competitor]." Long-tail: "best AI for dental offices," "automated no-show recovery HVAC."

**Internal linking:** Every industry page links to pricing + demo. Every comparison page links to /results + /pricing. Every blog post links to relevant industry page + CTA. Homepage links to top 3 industries + /pricing + /demo.

---

## SECTION 21 — ANALYTICS

**Track (PostHog):** Page views, CTA clicks, signup started/completed, onboarding step completion (each of 5), first call received, first appointment booked, first revenue attributed, trial day 7 milestone, upgrade clicked, plan changed, campaign created/launched, contact imported, feature adoption (each sidebar item first use), cancellation initiated/completed/saved.

**Executive dashboard:** Weekly: new signups, trial→paid rate, MRR, churn rate, ARPU, total revenue recovered. Monthly: cohort retention, NRR, LTV, feature adoption heatmap.

---

## SECTION 22 — COST & MARGIN

**Self-hosted voice at $0.007/min:** Solo 100 min = $0.70 COGS, 98.6% margin. Business 500 min = $3.50 COGS, 98.8% margin. Scale 3,000 min = $21 COGS, 97.9% margin.

**Fixed infrastructure:** 2× RTX 4090 GPU ($490/mo) + Pipecat server (~$50/mo) = $540/mo total. Supports ~500 Business customers.

**Variable costs:** Telnyx telephony ($0.004/min), Telnyx SMS ($0.004/segment), Resend email ($20/mo for 50K emails), Supabase ($25/mo), Vercel ($20/mo), Upstash Redis ($10/mo), PostHog (free tier to 1M events), Sentry (free tier).

**Dangerous profiles:** Scale-tier customers consistently using 3,000+ minutes. They generate the most support tickets, integration requests, and compliance risk. Highest-margin path: large number of Business customers using 200–400 min/mo.

---

## SECTION 23 — GROWTH & GTM

**Fastest to first revenue:** Founder-led sales to 10 service businesses in one metro. Personal outreach. Offer: "14 days free. If we recover more than the plan costs, you'll want to stay." Close on weekly digest.

**Agency expansion:** Partners managing 5+ businesses get dashboard + 15% revenue share.

**Case study engine:** Every 60-day customer gets a personalized case study from their revenue_recovered data.

**Category signal:** Publish "The State of Missed Revenue in Service Businesses" report with real data from customers.

---

## SECTION 24 — WHAT TO CUT / HIDE / DELAY

**Cut:** 90 dead enterprise cron routes. Move to /deprecated or delete.

**Hide:** Flow builder (too complex for launch — Scale+ only). API docs (build but don't surface until Scale has customers). Multi-location (gate behind Scale).

**Delay:** Native mobile app (responsive web works). WhatsApp (not launch differentiator). Two-way CRM sync (webhook sufficient for Business). Custom voice cloning on Solo.

**Simplify:** Enterprise tier — either build a real enterprise page or replace with "For teams with 10+ locations: Talk to us."

**Rebuild:** Dashboard theme — systematic dark→light replacement across all /app/* components.

---

## SECTION 25 — IMPLEMENTATION BRIEF FOR CURSOR

### Priority 1: Launch-Ready (Week 1–2)

1. Dashboard dark→light theme migration (ALL /app/* components)
2. Fix FAQ JSON-LD mismatch in page.tsx
3. Fix Follow-Ups i18n key in AppShellClient.tsx
4. Homepage section reorder (ROI Calculator to position 3)
5. Add founder photo/bio to footer
6. Email verification on signup
7. Dunning emails for failed payments
8. Trial grace period (3 days)
9. Cancellation survey
10. Guided product tour (first login tooltips)

### Priority 2: Voice Migration (Week 2–6)

1. Create `services/voice/` directory structure
2. Deploy Pipecat pipeline server (Docker on RunPod)
3. Deploy Kokoro 82M TTS service
4. Deploy Canary-1B-Flash STT service
5. Deploy Llama 3.3 8B via vLLM (INT8)
6. Implement confidence routing (Llama 90% / Claude fallback 10%)
7. Migrate telephony from Twilio to Telnyx SIP
8. Generate 6 standard voice presets
9. A/B test self-hosted vs outsourced quality
10. Full rollout when quality verified

### Priority 3: Conversion (Week 2–4, parallel)

1. Ship to 5 real service businesses
2. Capture revenue-recovered screenshots
3. Create /results page
4. Add proof to homepage
5. Interactive product tour on demo page
6. Expand industries section to 8+
7. Create /security trust page
8. Create /outbound capabilities page
9. A/B test headline variants
10. Expand blog to 15+ articles

### Priority 4: Scale (Month 2–3)

1. Agency partner dashboard
2. Event-driven speed-to-lead (replace 2-min poll)
3. Push notifications
4. Data export
5. Case study auto-generation
6. Status page
7. Load testing
8. Customer health scoring
9. API documentation
10. Referral program

### Core Data Model (Supabase PostgreSQL)

`workspaces` → `contacts` → `call_sessions` + `messages` + `bookings` + `workflow_enrollments` + `campaign_enrollments`. `agents` (per workspace). `sequences` → `sequence_steps` + `sequence_enrollments`. `campaigns` → `campaign_steps`. `usage_records` (minutes, SMS, per billing period). `stripe_subscriptions`. All with workspace_id foreign key and RLS policies.

### Backend Requirements

- Pipecat voice server (Python, Docker, GPU)
- 13 active crons (unchanged)
- Follow-up engine processing every 5 min
- Stripe webhooks for subscription lifecycle
- Telnyx webhooks for call events
- Resend for transactional email
- PostHog for analytics events
- Sentry for error tracking

### Frontend Requirements

- Next.js 16.1.6 App Router
- All /app/* pages use light theme CSS variables
- i18n via next-intl for all user-facing strings
- Forms: native React state + Zod (NO react-hook-form)
- Tailwind CSS 4 with @theme directives (NO tailwind.config.js)
- Framer Motion for animations
- Lucide React for icons
- Recharts for charts
- Sonner for toasts

---

## SECTION 26 — FINAL HOMEPAGE COPY

**Hero:** "Stop Losing Revenue to Missed Calls and Broken Follow-Up." / "Recall Touch answers every call, books appointments, and runs automated recovery sequences. See exactly how much revenue you recover — in your first week." / CTA: "Start Free Trial" / Trust: AI Revenue Operations · Use your existing number · 2-min setup · No credit card

**Problem:** "Missed Calls Cost You Money. Here's How Much." / Interactive industry calculator showing annual loss.

**ROI Calculator:** "See How Much Revenue You Can Recover." / 3 sliders → recovery estimate → "Business plan pays for itself at Xx."

**How It Works:** "Get Live in Three Steps." / Forward calls (90s) → AI picks up 24/7 (<3s) → You get notified (instant).

**Industries:** "Built for How You Actually Work." / 8+ industry cards.

**Differentiation:** "Not Just Another AI Receptionist." / Comparison + 5 differentiators.

**Mode Selector:** "Pick the Lens That Matches How You Work." / Solo, Sales, Business tabs.

**Pricing:** 4 tiers with outcome framing.

**FAQ:** 10 questions starting with "How is this different from an AI receptionist?"

**Final CTA:** "Every Day Without Recall Touch Is Revenue Walking Out the Door." / "Start Your Free Trial Now"

---

## SECTION 27 — FINAL DECISION STACK

| # | Decision | Answer |
|---|----------|--------|
| 1 | Best category | AI Revenue Operations |
| 2 | Best homepage message | Stop Losing Revenue to Missed Calls and Broken Follow-Up |
| 3 | Best wedge | Single-location service businesses at $297/mo |
| 4 | Best product shape | Inbound + Outbound + Follow-Up + Booking + Recovery + Attribution in one platform with 3 modes |
| 5 | Best pricing | Solo $49 / Business $297 / Scale $997 / Enterprise Custom (correct as-is) |
| 6 | Best trust improvement | Ship to 5 real customers this week. Get revenue-recovered screenshots. Put them on the homepage. |
| 7 | Best margin-protection move | Self-hosted voice stack: Pipecat + Kokoro + Canary + Llama 3 8B + Telnyx. $0.007/min total. 98%+ margins. |
| 8 | Biggest thing making it generic | Dark-themed dashboard. Service businesses expect light, clean, professional interfaces. |
| 9 | Biggest blocker to scale | Zero social proof. No customers, no logos, no screenshots of real revenue recovered. |
| 10 | Clearest path to #1 | Own "AI Revenue Operations" as a category. Prove it with revenue data from real customers. Build agency channel. Let compounding attribution data make the product impossible to leave. |

---

*End of V12. Everything is here. Own the stack. Own the margin. Own the category. Ship it.*
