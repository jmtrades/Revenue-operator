# RECALL TOUCH — COMPLETE STRATEGY, REDESIGN, AND EXECUTION BRIEF (V6)

**Date:** March 18, 2026
**Author:** Full-stack operator audit — product, engineering, design, GTM, finance, voice
**Status:** Decision-ready. Implementation-ready.

---

## SECTION 1 — EXECUTIVE VERDICT

### What Recall Touch Most Likely Is Today

A feature-rich but unfocused AI voice platform for service businesses. The codebase has 150+ page routes, 60+ dashboard pages, 31 homepage sections, 6 languages, 8 phase documents, and a voice layer that costs $0.148/min. It tries to do everything: voice AI receptionist, CRM, inbox, lead management, campaigns, compliance, governance, follow-up, analytics, agency tools, settlement processing, attestations, procurement — all at once.

**The honest diagnosis:** This is a product built by ambition, not by customers. There are more features than there are users. The breadth is impressive but commercially dangerous. No buyer can look at this and instantly understand what it does, why they need it, and what they should do first.

### What It Should Actually Become

**Recall Touch = The AI Follow-Up & Revenue Recovery System for Service Businesses.**

Not a voice-first product. Not a CRM. Not an inbox. Not a generic automation tool. The voice layer is a feature, not the product. The product is: **automated follow-up that recovers revenue you're already losing.** Voice answering is the entry hook. Follow-up is the retention engine. Revenue recovered is the metric that justifies the price.

### What Category It Should Own

**"AI Revenue Recovery"** — not "AI receptionist," not "AI voice agent," not "AI assistant."

The category must answer: "What money am I losing that this product gets back?" Every competitor answers "we answer your phones." Recall Touch should answer "we recover the revenue you're leaking from missed calls, no-shows, dead leads, and forgotten follow-ups."

### What It Absolutely Must Not Be

- A generic AI receptionist ($29-79/mo commodity)
- A developer voice platform (Vapi/Retell/Bland territory)
- A general-purpose CRM (Salesforce/HubSpot trap)
- A productivity tool (Notion/Asana dead zone)
- An "AI for everyone" product (death by vagueness)
- A 150-page-route monster that nobody can navigate

### Biggest Current Blocker

**Complexity without customers.** 150+ routes, 60+ dashboard pages, and zero paying users. The product needs to be 80% smaller at launch and 10x more focused on the thing that makes someone pay: proving it recovered revenue they would have lost.

### Biggest Current Opportunity

**Service businesses lose 35-60% of inbound calls.** Every missed call is a lost $200-12,000 job depending on industry. Recall Touch's follow-up engine — not just answering, but the automated recovery sequence afterward — is the thing no competitor does well. Lean into this hard.

### Strongest Realistic Path to Fast Revenue

B2B-first, single-location service businesses, selling the Business plan ($297/mo) through founder-led sales + agency/reseller channel. Target: dental, med spa, legal intake, HVAC, roofing — industries where a single recovered appointment pays for the annual subscription.

### Path to Million-Dollar Months

Realistic under these conditions:
- 3,360 customers at $297/mo average = $1M MRR
- Or 500 agency partners managing 7 clients each at $297 = $1M MRR
- Timeline: 18-24 months with strong execution, excellent retention, and agency channel traction
- Requires: gross margin >80% (achievable at Phase 2 voice costs of $0.058/min), churn <5%/mo, activation rate >60%

**What would have to be true:** Product must prove ROI within 14-day trial (recovered revenue visible in dashboard), agency reseller program must be live by month 6, and voice COGS must be at Phase 2 ($0.058/min) by month 3.

---

## SECTION 2 — BRUTAL CURRENT-STATE AUDIT

### Inferred Current State Assessment

| Area | Rating | Assessment |
|------|--------|------------|
| Positioning | 4/10 | "AI Revenue Closer" is better than "AI receptionist" but still unclear to a cold prospect |
| Homepage | 5/10 | 31 sections is way too many. Visitors bounce before understanding the product |
| Brand | 5/10 | Clean design system (teal + warm white) but lacks distinctive identity |
| Messaging | 4/10 | Leads with voice/AI technology, should lead with outcomes (revenue recovered) |
| Pricing | 7/10 | Well-structured tiers, but Solo at $49 may attract low-value users who churn |
| Onboarding | 5/10 | Multiple conflicting flows (activate, onboard, onboarding, setup, app/onboarding) |
| Dashboard | 3/10 | 60+ pages is overwhelming. No clear first-action. Users will feel lost |
| UX | 4/10 | Feature-complete but not task-complete. Too many options, not enough guidance |
| Trust | 4/10 | Previous fake claims removed. Now too sparse — "early access" isn't enough trust |
| Proof | 2/10 | Zero testimonials, zero case studies, zero external validation |
| Voice Layer | 6/10 | Well-architected technically but too expensive at $0.148/min |
| Feature Depth | 8/10 | Extremely deep — campaigns, compliance, governance, settlement, attestations |
| Segment Clarity | 3/10 | Tries to serve solo users, sales teams, businesses, agencies, and enterprises simultaneously |
| Competitive Similarity | 5/10 | Follow-up engine is unique. Voice answering is commodity. Homepage doesn't surface the difference |
| Retention Risk | 7/10 | If users activate follow-up workflows, retention should be strong. Risk: they never get that far |
| Support Burden | 8/10 | High complexity = high support burden per user |
| Margin Risk | 5/10 | Voice COGS at $0.148/min is dangerous. Phase 2 at $0.058/min fixes this |

### Top 25 Current Problems

1. **150+ routes with 0 customers.** Over-built, under-validated.
2. **31 homepage sections.** Nobody scrolls through 31 sections. Cut to 8-10.
3. **60+ dashboard pages.** Overwhelming. New user sees a wall of options.
4. **4 separate onboarding flows** (activate, onboard, onboarding, app/onboarding). Pick one.
5. **Two parallel dashboard systems** (/app/* and /dashboard/*). Confusing codebase, confusing UX.
6. **Voice COGS at $0.148/min.** Burns margin on every minute.
7. **Zero social proof.** No testimonials, no logos, no case studies. "Early access" alone doesn't build trust.
8. **Category confusion.** "AI Revenue Closer" — is it a sales tool? A voice tool? A CRM?
9. **Homepage leads with technology, not outcomes.** Visitors don't care about your AI stack; they care about revenue.
10. **Solo/Life/Org surface routes** are a distraction from the core business offering.
11. **Governance, attestations, procurement, settlement pages** — enterprise features nobody needs at launch.
12. **Compliance-heavy onboarding** (governance, domain, source, record) scares away SMBs.
13. **6-language i18n** before having English-speaking customers. Over-investment.
14. **Blog with no content.** Empty blog pages hurt SEO credibility.
15. **Docs page** before having a product people are using. Premature.
16. **Agency page** before having direct customers. Wrong sequence.
17. **ROI calculator on homepage** — useful but positioned too late in the scroll.
18. **No clear "what happens when I sign up" on homepage.** Missing the "see it in action" moment.
19. **Voicemail detection, AMD config, live call monitoring** — advanced features that add complexity before basics are proven.
20. **Lead scoring, call intelligence, knowledge base** — nice-to-haves shipping before must-haves are validated.
21. **29-country phone support** before having a single US customer. Over-invested in breadth.
22. **The product surface says "platform" but the price says "tool."** $49-$297 pricing feels like a tool. 60+ pages feels like a platform. Mismatch.
23. **No embedded demo or interactive preview** that shows the follow-up engine (the actual differentiator) in action.
24. **Follow-up engine exists in code but is invisible on the homepage.** The most valuable feature is buried.
25. **Compare/[competitor] pages** exist but likely have no content. Empty comparison pages hurt credibility.

### Top 10 Strategic Problems

1. Building for "everyone" instead of crushing one segment first
2. Voice-first positioning when follow-up is the actual moat
3. No proof engine (case studies, metrics, logos) feeding the sales cycle
4. Enterprise features (governance, compliance, settlements) consuming dev time before PMF
5. Agency channel built before direct sales motion is proven
6. Multiple onboarding paths creating maintenance burden and confusion
7. Two parallel dashboard systems (/app and /dashboard) creating code debt
8. Voice COGS making unit economics fragile at lower tiers
9. No clear activation metric — what does "success" look like in the first 48 hours?
10. No viral or referral loop designed into the product

### Top 10 Conversion Problems

1. Homepage doesn't answer "what is this" in the first 3 seconds
2. No visible ROI proof — no "$X recovered" stories
3. 31 homepage sections = scroll fatigue = bounce
4. CTA says "Start Free Trial" — better to say what they'll experience
5. No video demo showing the follow-up engine in action
6. Pricing page doesn't show ROI comparison (cost vs revenue recovered)
7. No industry-specific landing pages with tailored messaging
8. Demo page requires commitment before showing value
9. No "see a real call + follow-up sequence" walkthrough
10. Trust bar says "early access" which implies "not ready yet"

### Top 10 Trust Problems

1. Zero customer logos or testimonials
2. "SOC 2 in progress" is technically honest but sounds like "we haven't done it"
3. No published case studies or results
4. No founder story or team page with real people
5. No third-party reviews (G2, Capterra, etc.)
6. No press mentions or media coverage
7. "Early access" positioning undermines confidence in product maturity
8. No uptime or reliability data
9. No explicit data handling / privacy explanation for call recordings
10. Compare pages likely empty — clicking them reveals nothing

### Top 10 UX Problems

1. Dashboard is a wall of 60+ page links with no hierarchy
2. Multiple onboarding paths — which one should a new user follow?
3. No guided first-use experience ("set up your first follow-up in 5 minutes")
4. Settings split across /app/settings and /dashboard/settings
5. Leads, contacts, and conversations are separate pages that should be one unified timeline
6. Follow-up workflows are a feature but not surfaced as the primary dashboard action
7. Voice settings buried in settings instead of being part of agent setup
8. Analytics scattered across 8+ different pages
9. Mobile dashboard likely overwhelming given the desktop complexity
10. No "needs attention" priority queue — user has to hunt for what matters

### Top 10 Generic-Looking Problems

1. Homepage hero section looks like every AI SaaS landing page
2. Bento grid layout is the #1 overused AI product pattern in 2026
3. "How it works" 3-step section is the most generic pattern in SaaS
4. Feature list sections look like every competitor's feature list
5. Pricing cards are standard 3-column layout with checkmarks — no differentiation
6. "Trusted by" section with no actual logos feels template-y
7. FAQ section is standard accordion — no personality
8. Footer is standard 4-column SaaS footer
9. Dashboard sidebar navigation is standard SaaS sidebar
10. The whole site could be any AI SaaS product with the logo changed

---

## SECTION 3 — CATEGORY CREATION

### Category Options Evaluated

| Category | Clarity | Distinctiveness | Premium Feel | Consumer Clarity | Business Clarity | Enterprise Credibility | Expansion Flexibility | Memorability |
|----------|---------|-----------------|--------------|-----------------|------------------|----------------------|---------------------|--------------|
| AI Revenue Recovery | 9 | 9 | 8 | 7 | 9 | 7 | 7 | 8 |
| AI Revenue Closer | 6 | 7 | 7 | 5 | 7 | 5 | 6 | 7 |
| AI Follow-Up System | 8 | 7 | 6 | 8 | 8 | 6 | 7 | 7 |
| AI Revenue Operator | 7 | 8 | 8 | 5 | 8 | 8 | 8 | 7 |
| Revenue Automation Platform | 6 | 5 | 7 | 5 | 7 | 8 | 8 | 5 |
| AI Call & Follow-Up Engine | 7 | 6 | 6 | 7 | 8 | 5 | 5 | 6 |
| Autonomous Revenue System | 5 | 8 | 9 | 3 | 6 | 8 | 7 | 7 |
| AI Revenue Agent | 7 | 7 | 7 | 6 | 7 | 6 | 7 | 8 |

### Winner: "AI Revenue Recovery"

**Why this wins:**

1. **Instant comprehension.** "Revenue recovery" answers the question every business owner asks: "Am I losing money?" Yes, and this gets it back.
2. **Outcome-first.** It doesn't describe what the technology does (answers calls, sends texts). It describes the result (recovered revenue).
3. **Premium justification.** "Recovery" implies measurable ROI. If the system recovers $5,000/month, paying $297/month is obvious.
4. **Competitive separation.** No competitor owns "revenue recovery." They all say "AI receptionist" or "AI voice agent." Recall Touch can own a category they can't easily copy because it requires the follow-up engine they don't have.
5. **Expansion room.** Revenue recovery covers: missed calls, no-shows, dead leads, forgotten follow-ups, quote chasing, reactivation — all current features.
6. **Business clarity.** A dental practice owner instantly understands "AI revenue recovery" more than "AI revenue closer."

**Runner-up:** "AI Revenue Operator" — stronger for enterprise and agency positioning, but less clear for SMBs.

**How to use it:** "Recall Touch — AI Revenue Recovery for Service Businesses" as the category frame. The homepage headline should make the problem visceral, not just state the category.

---

## SECTION 4 — POSITIONING & MARKET FRAMING

### Strongest Broad-Market Positioning

"Every missed call, forgotten follow-up, and no-show is revenue walking out your door. Recall Touch recovers it automatically."

### Strongest Focused-Entry Positioning

"Service businesses lose $3,000-$20,000/month from missed calls and broken follow-up. Recall Touch answers every call, books appointments, and runs follow-up sequences that recover the revenue you're currently losing."

### Strongest Reason to Care

You are already losing money. Not theoretically — right now, today, there are missed calls sitting in your phone log that represent $500-$12,000 jobs you'll never get because nobody followed up.

### Strongest Reason to Pay

The system pays for itself. If Recall Touch recovers even one missed appointment per month, it's already ROI-positive. The Business plan costs $297/mo. A single recovered dental cleaning is $300. A single recovered HVAC service call is $450. A single recovered legal consultation is $500+.

### Strongest Message Hierarchy

1. **Lead with pain:** "How much revenue are you losing to missed calls and broken follow-up?"
2. **Quantify the problem:** "Service businesses miss 35-60% of inbound calls. Each is a $200-$12,000 job."
3. **Introduce the solution:** "Recall Touch answers every call, books appointments, and runs automated follow-up sequences."
4. **Prove the outcome:** "Average customer recovers $X,XXX/month in the first 30 days." (Build toward this with real data.)
5. **Make it easy:** "Set up in 5 minutes. See your first recovered lead in 24 hours."

### What to Lead With

- The revenue you're losing (pain)
- The specific recovery (missed calls → answered → booked → followed up)
- The measurable outcome (revenue recovered, appointments booked, leads saved)

### What to Avoid Leading With

- AI technology (nobody cares about your LLM)
- Voice quality (table stakes, not a differentiator message)
- Feature lists (don't compete on checkmarks)
- "AI receptionist" framing (commodity positioning)
- Number of integrations (nobody buys for integrations)

---

## SECTION 5 — ICP / SEGMENT STRATEGY

### Segment Analysis

| Segment | Pain Urgency | Ability to Pay | Speed to Value | Support Burden | Retention | Expansion | Best Angle |
|---------|-------------|----------------|----------------|----------------|-----------|-----------|------------|
| Solo users | 5/10 | 3/10 | 7/10 | 6/10 | 4/10 | 2/10 | Personal follow-up |
| Self-employed | 6/10 | 4/10 | 7/10 | 5/10 | 5/10 | 3/10 | Never miss a client |
| Creators | 3/10 | 3/10 | 4/10 | 7/10 | 3/10 | 2/10 | Don't target |
| Freelancers | 5/10 | 3/10 | 6/10 | 6/10 | 4/10 | 2/10 | Invoice + follow-up |
| Consultants | 7/10 | 7/10 | 8/10 | 3/10 | 7/10 | 5/10 | Booking + no-show |
| Sales teams | 8/10 | 8/10 | 6/10 | 5/10 | 6/10 | 7/10 | Speed-to-lead |
| Agencies | 7/10 | 6/10 | 5/10 | 8/10 | 7/10 | 9/10 | White-label resell |
| Service businesses | 9/10 | 7/10 | 9/10 | 4/10 | 8/10 | 6/10 | Revenue recovery |
| Dental practices | 10/10 | 9/10 | 9/10 | 3/10 | 9/10 | 6/10 | Missed appointment recovery |
| Med spas | 9/10 | 9/10 | 9/10 | 3/10 | 8/10 | 7/10 | No-show + reactivation |
| Legal intake | 9/10 | 10/10 | 8/10 | 4/10 | 8/10 | 5/10 | Lead capture urgency |
| HVAC/Roofing | 8/10 | 7/10 | 9/10 | 3/10 | 8/10 | 5/10 | Emergency call capture |
| Real estate | 7/10 | 6/10 | 7/10 | 5/10 | 5/10 | 6/10 | Speed-to-lead |
| Recruiting | 6/10 | 6/10 | 6/10 | 5/10 | 5/10 | 5/10 | Candidate follow-up |
| Education | 4/10 | 4/10 | 5/10 | 7/10 | 5/10 | 3/10 | Low priority |
| Multi-location | 8/10 | 9/10 | 6/10 | 6/10 | 9/10 | 9/10 | Scaled revenue recovery |

### Strategic Wedge Selection

**Best Immediate Wedge: Dental + Med Spa + Legal Intake**

Why: Highest pain urgency (10/10, 9/10, 9/10), highest ability to pay (9/10, 9/10, 10/10), fastest speed to value (9/10, 9/10, 8/10), and the ROI math is dead simple. A single recovered dental appointment ($300-$3,200) or legal consultation ($500-$8,000) pays for months of the product.

**Best Medium-Term Wedge: Home Services (HVAC, Roofing, Plumbing) + Agency Channel**

Why: Massive TAM, high job values ($450-$12,000), and agencies that serve these businesses are the fastest scale lever. One agency bringing 20 clients = 20 Business subscriptions = $5,940/mo.

**Best Long-Term Wedge: Multi-Location Operators + Enterprise**

Why: Highest ARPU ($997-custom), highest retention (9/10), highest expansion (9/10). But requires product maturity, case studies, and compliance certifications that don't exist yet.

**Most Dangerous Segment to Over-Focus on Too Early: Solo Users / Creators / Freelancers**

Why: Low ability to pay ($49/mo ceiling), high churn (4/10 retention), high support burden relative to revenue, and they dilute the brand from "serious revenue recovery system" to "personal productivity tool." Solo should exist as a tier but should not be the go-to-market focus.


---

## SECTION 6 — COMPETITOR WAR MAP

### Competitive Landscape by Category

**AI Receptionists (commodity zone — do NOT compete here):**
Dialzara ($29-99), Upfirst ($25-99), My AI Front Desk ($79-149), Rosie AI ($49-149). These are answering machines with AI. They take messages. They don't follow up, don't recover revenue, don't run sequences. Price ceiling: $149/mo. Margin: thin. Churn: high.

**Voice AI Platforms (developer tools — wrong market):**
Vapi ($0.05+/min), Retell ($0.07+/min), Bland AI ($0.09/min). These sell infrastructure to developers. No product UI, no workflows, no business logic. Recall Touch should USE these as components, not compete with them.

**Full-Service AI Voice Agents (closest competitors):**
Goodcall ($59-249), Smith.ai ($95-800). These answer calls AND have some business logic. Smith.ai uses human+AI hybrid (expensive, hard to scale). Goodcall has CRM integration and booking. Neither has multi-step automated follow-up sequences.

**Automation / CRM Tools (adjacent, not direct):**
GoHighLevel ($97-497), Keap/Infusionsoft ($249+), Salesforce. These do automation and CRM but don't answer phones. Different buying motion.

### What Is Commoditized

- Answering calls with AI voice (every competitor does this)
- Basic CRM integration (table stakes)
- Call transcription (commodity)
- Appointment booking from a call (Goodcall, Smith.ai, others do this)
- SMS text-back on missed calls (Upfirst, Allo, dozens of others)

### What Buyers Are Tired Of

- "We're an AI receptionist" — heard it 50 times
- Feature lists with checkmarks — they all look the same
- "Sounds just like a human!" — every voice AI company says this
- Demos that require a call with sales to see the product
- Pricing that requires contacting sales
- Tools that answer calls but don't do anything after the call ends

### Where Recall Touch Should NOT Compete Head-On

- Price wars with $29-99/mo AI receptionists (race to the bottom)
- Voice quality arms race with ElevenLabs (they'll always have more voices)
- Feature wars with GoHighLevel (they have 10x the feature surface)
- Enterprise CRM territory (Salesforce, HubSpot own this)

### Where Recall Touch Can Win

**The gap in the market: What happens AFTER the call.**

Every competitor focuses on the call itself. Nobody owns the follow-up sequence. Recall Touch's unfair advantage:

1. **Automated multi-step follow-up** — SMS + email + call sequences triggered by call outcomes
2. **No-show recovery** — automated rebooking sequence when appointments are missed
3. **Dead lead reactivation** — campaigns that re-engage leads who went cold 30-90 days ago
4. **Revenue attribution** — showing the business owner exactly how much revenue the system recovered
5. **Industry-specific workflows** — pre-built sequences for dental, legal, HVAC, etc. that work on day one

### Differentiation Framework

| Type | Recall Touch | Competitors |
|------|-------------|-------------|
| **Primary** | Automated follow-up engine that recovers revenue | Answer calls and take messages |
| **Premium** | Industry-specific workflows with proven recovery sequences | Generic templates or no templates |
| **Practical** | Revenue attribution dashboard — see exactly what you recovered | Call logs and transcripts |
| **Emotional** | "I stopped losing money the day I set this up" | "I don't miss calls anymore" |

---

## SECTION 7 — FINAL PRODUCT VISION

### What It Is

Recall Touch is an AI revenue recovery system for service businesses. It answers every call, books appointments, and then runs automated follow-up sequences that recover revenue from missed calls, no-shows, dead leads, and forgotten opportunities. It measures everything and shows the business owner exactly how much revenue it recovered.

### Who It Is For

**Primary:** Single-location service businesses with 50-500+ inbound calls/month — dental, med spa, legal, HVAC, roofing, plumbing, real estate, and similar appointment-based businesses.

**Secondary:** Multi-location operators, agencies managing service businesses, and sales teams with high-ticket offerings.

**Tertiary:** Solo professionals, consultants, and self-employed individuals who lose revenue from inconsistent follow-up.

### What It Does (The Core Loop)

1. **Captures** — Answers every inbound call, 24/7, with a natural AI voice. Captures caller intent, contact info, and urgency.
2. **Books** — Schedules appointments directly into the business's calendar. Confirms via SMS.
3. **Follows Up** — Runs automated multi-step sequences: missed call recovery (within 5 min), appointment reminders (24h + 1h before), no-show recovery (30 min after missed appointment), quote follow-up (3-5-7 day sequence), dead lead reactivation (30-60-90 day campaigns).
4. **Recovers** — Measures recovered appointments, booked revenue, and saved leads. Shows the ROI in a dashboard the owner checks every morning.

### Why It Is Hard to Replace

Once follow-up workflows are running and recovering revenue, turning it off means going back to losing that revenue. The switching cost isn't technical (any CRM can import contacts). The switching cost is operational — you'd have to rebuild all your recovery sequences, and you'd immediately start losing the money the system was recovering.

### Why Users Understand It Quickly

"It answers your calls and follows up until the job is booked." That's 11 words. Everyone who runs a service business understands this instantly because they know they're bad at follow-up and they know it costs them money.

### Why Buyers Pay Real Money

Because the ROI math is simple: if the system recovers one $300+ appointment per month, it's already paid for itself. Most businesses will recover 5-20 appointments per month, making the $297/mo Business plan a 3-10x return.

### How It Spans Solo + Sales + Business Without Becoming Messy

The product adapts by mode, not by feature set. Every mode uses the same core engine (call handling → follow-up → recovery → measurement). The difference is:
- **Solo:** Fewer workflows, personal follow-up focus, simpler dashboard
- **Business:** Industry templates, team handoffs, revenue attribution
- **Scale/Enterprise:** Multi-location, agency management, API, advanced analytics

The user selects their mode during onboarding. The product shows them only what's relevant.

---

## SECTION 8 — FULL PRODUCT ARCHITECTURE

### Module 1: AI Call Handling

**Purpose:** Answer every inbound call with a natural AI voice. Capture intent, route or handle, and create a structured record for follow-up.

**Why it matters:** This is the entry point. Without reliable call answering, nothing else works.

**Must-have version:** Answer calls, identify caller intent (booking, inquiry, emergency, existing customer), capture name + phone + reason, transfer to human if needed, send call summary to dashboard.

**Advanced version:** Outbound calls (follow-up, reminders, reactivation), voicemail detection with message-leaving, multi-language support, sentiment analysis, call coaching.

**Retention value:** 7/10 — businesses depend on reliable call answering within days.

**Monetization value:** 6/10 — included in base price, not directly monetized. But without it, no one signs up.

**Implementation complexity:** High (Vapi/Pipecat integration, voice config, Twilio).

**Cost risk:** Voice minutes are the primary COGS driver. Must reach Phase 2 ($0.058/min) fast.

### Module 2: Follow-Up Engine (THE DIFFERENTIATOR)

**Purpose:** Run automated multi-step recovery sequences triggered by call outcomes. This is the thing that makes Recall Touch different from every competitor.

**Why it matters:** THIS is the product. Call answering is the hook. Follow-up is the moat. Revenue recovery is the outcome.

**Must-have version:**
- Missed call recovery: SMS within 5 minutes ("We missed your call — can we book you?")
- Appointment reminder: SMS 24h + 1h before
- No-show recovery: SMS + call 30 min after missed appointment
- Quote follow-up: 3-5-7 day sequence
- Dead lead reactivation: 30-60-90 day re-engagement

**Advanced version:**
- Custom workflow builder (trigger → condition → action → delay → action)
- Multi-channel (SMS + email + voice call + WhatsApp)
- A/B testing on sequence variants
- Smart timing (send at optimal time based on past behavior)
- Conditional branching (if replied → stop, if booked → send confirmation, if no response → escalate)

**Retention value:** 10/10 — once workflows are recovering revenue, turning this off means losing money.

**Monetization value:** 9/10 — this justifies the entire subscription price.

**Implementation complexity:** Medium-High (BullMQ/cron, template rendering, SMS/email send, stop conditions).

**Cost risk:** Low — SMS at $0.01-0.03 each, email essentially free. Much cheaper than voice.

### Module 3: Revenue Attribution Dashboard

**Purpose:** Show the business owner exactly how much revenue Recall Touch recovered. This is the retention and expansion engine.

**Why it matters:** If the owner can see "$4,200 recovered this month" on their dashboard, they will never cancel. This is the most important screen in the entire product.

**Must-have version:**
- Recovered calls (calls that were about to be missed but were answered)
- Booked appointments from AI calls (count + estimated value)
- Recovered no-shows (rebookings from no-show sequences)
- Reactivated leads (old leads that re-engaged via campaign)
- Total estimated revenue impact

**Advanced version:**
- Revenue by source (which workflow recovered which dollars)
- Revenue by industry benchmark (your recovery rate vs. industry average)
- Trend over time (recovery improving or declining)
- ROI calculator (what you're paying vs. what you're recovering)

**Retention value:** 10/10 — the reason people stay.

**Monetization value:** 8/10 — makes upsell to higher tiers obvious ("you'd recover more with 500 minutes").

**Implementation complexity:** Medium (aggregation queries, call-outcome linkage, estimated job values from industry packs).

**Cost risk:** Zero — this is just data presentation.

### Module 4: Omnichannel Inbox

**Purpose:** Unified view of all conversations across call transcripts, SMS threads, and emails. One place to see every interaction with every lead/contact.

**Must-have version:** Chronological thread view per contact. Call transcripts inline. SMS history. Status indicators (new, replied, needs attention).

**Advanced version:** Assign to team member, internal notes, snooze/reminder, quick actions (book, follow-up, archive).

**Retention value:** 7/10 — becomes the daily "check-in" screen.

**Monetization value:** 5/10 — included in base, not directly monetized.

**Implementation complexity:** Medium.

**Cost risk:** Low.

### Module 5: Contact Timeline

**Purpose:** Per-contact history showing every touchpoint — calls, texts, emails, bookings, no-shows, follow-ups sent, outcomes.

**Must-have version:** Vertical timeline with event cards. Call summary, SMS sent/received, booking made/cancelled, follow-up sent.

**Advanced version:** Lead score overlay, next-action prediction, revenue attribution per contact.

**Retention value:** 8/10 — gives visibility that manual processes can't match.

**Monetization value:** 6/10 — justifies the tool's value in demos.

**Implementation complexity:** Medium (join across call_sessions, messages, bookings, workflow_enrollments).

**Cost risk:** Low.

### Module 6: Booking Engine

**Purpose:** AI books appointments directly into the business's calendar during the call.

**Must-have version:** Google Calendar + Outlook integration. Availability checking. Double-booking prevention. SMS confirmation to caller.

**Advanced version:** Custom booking pages, rescheduling via SMS, buffer time between appointments, multi-provider scheduling.

**Retention value:** 8/10 — replaces manual booking processes.

**Monetization value:** 7/10 — core feature that drives subscription value.

**Implementation complexity:** Medium (Google/Outlook OAuth, availability API, conflict detection).

**Cost risk:** Low.

### Module 7: No-Show Recovery

**Purpose:** Automatically re-engage when an appointment is missed. This is the second-highest-value workflow after missed call recovery.

**Must-have version:** Detect no-show (calendar event marked no-show or manual flag). Trigger SMS: "We noticed you couldn't make it — would you like to reschedule?" Follow up with a call if no response in 2 hours.

**Advanced version:** Configurable no-show policy (charge fee, require deposit next time), no-show analytics, pattern detection (frequent no-show contacts).

**Retention value:** 9/10 — directly recovers lost revenue.

**Monetization value:** 9/10 — Business+ tier feature.

**Implementation complexity:** Low-Medium (calendar webhook for no-show detection, trigger workflow enrollment).

**Cost risk:** Low (SMS-based primarily).

### Module 8: Lead Reactivation

**Purpose:** Re-engage leads who went cold 30-90+ days ago. Massive untapped revenue sitting in every business's contact list.

**Must-have version:** Select contacts with no activity in X days. Run a 3-touch SMS campaign: "Hi {name}, we wanted to check in — are you still looking for [service]?" Track responses.

**Advanced version:** AI-powered timing optimization, segmentation by lead source and past interest, phone call reactivation for high-value leads.

**Retention value:** 8/10 — creates ongoing value from the existing contact base.

**Monetization value:** 8/10 — Business+ tier feature.

**Implementation complexity:** Low (query contacts by last_activity, enroll in workflow).

**Cost risk:** Low.

### Module 9: Analytics & Reporting

**Purpose:** Show what's working, what's not, and where revenue is being recovered.

**Must-have version:** Call volume, answer rate, booking rate, follow-up response rate, revenue recovered, minutes used vs. limit.

**Advanced version:** Funnel visualization (calls → qualified → booked → attended → revenue), agent performance comparison, industry benchmarks, custom date ranges, exportable reports.

**Retention value:** 7/10. **Monetization value:** 6/10. **Complexity:** Medium. **Cost risk:** Low.

### Module 10: Team & Permissions

**Purpose:** Multi-user access for businesses with staff.

**Must-have version:** Invite team members, role-based access (admin, agent, viewer).

**Advanced version:** Activity log per user, assignment workflows, performance comparison.

**Retention value:** 8/10 (stickier with more users). **Monetization value:** 7/10 (seat-based expansion). **Complexity:** Medium. **Cost risk:** Low.

### Module 11: CRM Sync

**Purpose:** Bidirectional sync with existing CRM systems.

**Must-have version:** Push new contacts/leads to CRM. Pull existing contacts for follow-up targeting.

**Advanced version:** Field mapping, sync rules, conflict resolution, sync health monitoring.

**Retention value:** 7/10. **Monetization value:** 6/10 (webhook on Business, native on Scale). **Complexity:** Medium-High. **Cost risk:** Low.

### Module 12: Voice Settings

**Purpose:** Configure the AI voice experience.

**Must-have version:** Select voice, set greeting, set business hours, customize booking flow.

**Advanced version:** Premium voices, custom voice cloning, A/B testing, voice analytics.

**Retention value:** 6/10. **Monetization value:** 7/10 (premium voice add-on). **Complexity:** Low. **Cost risk:** Voice cloning uses ElevenLabs = cost.

---

## SECTION 9 — MODE SYSTEM DESIGN

### How Modes Work

During onboarding, the user answers one question: "What best describes you?" Three options:
1. **Solo** — "I'm an independent professional" → Solo mode
2. **Business** — "I run a service business" → Business mode
3. **Agency/Team** — "I manage multiple clients or locations" → Scale mode

The mode selection determines: default dashboard layout, pre-loaded templates, onboarding steps, and which features are visible vs. hidden. Users can switch modes in settings.

### Solo Mode

**Target user:** Independent consultant, therapist, freelancer, self-employed professional
**Onboarding flow:** Name → Phone number → Business type → Set greeting → Connect calendar → Done (3 minutes)
**Default templates:** Missed call recovery, appointment reminder, simple follow-up
**Dashboard structure:** Today's calls, upcoming appointments, recent follow-ups, monthly recovered revenue
**Core actions:** Review calls, check messages, adjust greeting
**Key metrics:** Calls answered, appointments booked, follow-ups sent
**Upgrade path:** "You've hit 100 minutes — upgrade to Business for 500 minutes and no-show recovery"
**Confusion risks:** Making it feel like a "business tool that doesn't apply to me." Keep it personal, simple, focused.

### Business Mode

**Target user:** Single-location service business (dental, HVAC, legal, med spa, etc.)
**Onboarding flow:** Business name → Industry (selector with templates) → Phone number → Connect calendar → Customize greeting → Set business hours → Done (5 minutes)
**Default templates:** Full industry pack (missed call, reminder, no-show, reactivation, quote follow-up)
**Dashboard structure:** Revenue recovered (hero metric), needs attention queue, today's calls, active follow-ups, upcoming appointments, weekly trend
**Core actions:** Check recovered revenue, handle needs-attention items, review call outcomes, adjust workflows
**Key metrics:** Revenue recovered, appointments booked, no-shows recovered, reactivation responses, call volume
**Upgrade path:** "You're using 3 agents — Scale gives you 10 plus API access and premium voices"
**Confusion risks:** Showing too many features at once. Progressively reveal: first week = calls + basic follow-up. Week 2 = no-show recovery. Week 3 = reactivation campaigns.

### Scale/Agency Mode

**Target user:** Multi-location operator, agency managing service businesses, high-volume operation
**Onboarding flow:** Organization name → Number of locations/clients → Industry focus → Connect first location → Import team → Done (10 minutes)
**Default templates:** Multi-location dashboard, client roster, per-location analytics
**Dashboard structure:** Portfolio overview (all locations/clients), revenue recovered across portfolio, per-location drill-down, team activity, usage vs. limits
**Core actions:** Monitor portfolio health, drill into underperforming locations, add new locations/clients, manage team
**Key metrics:** Total portfolio revenue recovered, per-location metrics, team utilization, minutes used/remaining
**Upgrade path:** Enterprise for white-label, custom compliance, SLA
**Confusion risks:** Information overload from managing multiple locations. Default to portfolio-level summary with drill-down.

---

## SECTION 10 — SOLO MODE DESIGN

### Emotional Job

"I never want to feel like I dropped the ball on a client or opportunity because I was too busy to follow up."

### Practical Job

Answer calls when I'm busy, remind me to follow up, chase things I'd forget, keep my schedule organized.

### Core Workflows

1. **Missed call → instant text-back** — "Hi, sorry I missed your call. Can I call you back at [time]?"
2. **New inquiry → capture + follow-up** — AI captures what they need, sends me a summary, follows up if I don't respond in 2 hours
3. **Appointment reminders** — SMS to clients 24h and 1h before
4. **Invoice follow-up** — "Just checking in on invoice #1234, sent [date]" (future)
5. **Relationship warming** — "It's been 60 days since your last session — would you like to schedule?" (future)

### Why People Pay

Because losing one client worth $500+ due to a missed follow-up costs more than a year of Solo subscription ($588/yr). The math is obvious.

### Why They Stay

Weekly email digest: "This week, Recall Touch answered 12 calls, sent 8 follow-ups, and helped you book 3 appointments." Seeing the activity proves the value.

### Why They Refer

"I have this thing that answers my calls and follows up automatically — you should try it." Simple, personal, word-of-mouth natural.

### What to Avoid

- Making it feel corporate or complex
- Showing dashboards with enterprise metrics
- Using "revenue recovery" language (too business-y for solo). Use "never miss an opportunity" instead
- Making setup require more than 5 minutes

---

## SECTION 11 — SALES MODE DESIGN

### Note on Sales Mode

Sales mode should NOT be a launch priority. It should be a v2 feature (Month 6+) after the core service-business motion is proven. Including it in the spec for completeness, but it should not consume engineering time before Business mode is generating revenue.

### Setter Workflows

- Speed-to-lead: AI answers inquiry calls, qualifies, and books setter call within 5 minutes
- Pre-call prep: AI sends setter a brief before the call (what they want, budget signals, urgency)
- No-show follow-up: If lead doesn't show to setter call, automated recovery sequence

### Closer Workflows

- Post-call follow-up: AI sends recap and next steps after closer call
- Proposal follow-up: 3-5-7 day sequence chasing unsigned proposals
- Ghosting recovery: "Haven't heard from you — still interested?" sequence at 7-14-21 days
- Deal won follow-up: Onboarding reminders, referral request

### Manager Workflows

- Pipeline visibility: See all active deals and their follow-up status
- Accountability: Which reps have stale leads? Who hasn't followed up?
- Revenue forecasting: Based on pipeline stage and follow-up engagement

### Why It Retains

Accountability and visibility. Managers see which reps are following up and which aren't. Reps have automated backup that ensures nothing falls through the cracks.

### Why It Beats Generic Sales Tools

Most CRMs track deals. They don't execute follow-up. Recall Touch actually sends the messages and makes the calls. The human's job is to close; the AI's job is everything that should happen between conversations.

---

## SECTION 12 — BUSINESS MODE DESIGN (PRIMARY FOCUS)

### The Core Business Loop

**Missed Call → AI Answers → Captures Lead → Books Appointment → Confirms via SMS → Reminds 24h + 1h Before → If No-Show: Recovery Sequence → If Attended: Review Request → If Cold Lead: Reactivation Campaign**

This loop is the entire product for a service business. Every feature should support this loop.

### Feature-by-Feature Design

**Missed Call Recovery (Highest value)**
- AI answers within 3 rings. Captures name, reason, urgency.
- If can book: books immediately. Sends SMS confirmation.
- If can't book: captures info, sends to dashboard, triggers follow-up sequence.
- After hours: custom greeting, captures message, sends SMS: "We got your message. We'll call you first thing at 8 AM."
- Metric: "X calls that would have been missed were answered and converted."

**Lead Capture**
- Every call creates a structured lead record: name, phone, email (if given), service needed, urgency, preferred time.
- AI extracts this from natural conversation — no IVR menus.
- Leads appear in dashboard immediately with status (new, contacted, booked, completed).

**Booking**
- Calendar integration (Google/Outlook) checks availability in real-time during the call.
- AI offers available slots: "I have openings Tuesday at 2 PM or Thursday at 10 AM — which works better?"
- Sends SMS confirmation with date, time, and address.
- Handles rescheduling via SMS reply.

**Reminders**
- 24h before: SMS with appointment details + "Reply C to confirm, R to reschedule"
- 1h before: SMS "Your appointment is in 1 hour at [address]"
- Configurable timing per business.

**No-Show Recovery**
- Triggered 30 minutes after missed appointment.
- SMS: "We missed you today. Would you like to reschedule?"
- If no response in 4h: follow-up call from AI.
- If no response in 24h: final SMS with link to self-book.
- Metric: "X no-shows recovered this month"

**Quote Chasing**
- After AI call where quote is discussed but not accepted:
  - Day 3: SMS "Just following up on your [service] quote. Any questions?"
  - Day 5: SMS "Wanted to make sure you got our quote. We have availability this week."
  - Day 7: Call from AI with personalized follow-up.

**Reactivation**
- Monthly campaign targeting contacts with no activity in 30-90 days.
- SMS: "Hi [name], it's been a while since your last [service]. Would you like to schedule?"
- Configurable by industry (dental: "Time for your 6-month cleaning")

**Review Requests**
- After completed appointment: SMS "Thanks for choosing [business]. Would you mind leaving us a review? [Google review link]"
- Timed 2-4 hours after appointment.

**CRM Sync**
- New leads push to existing CRM.
- Existing contacts pull for targeting.
- Webhook (Business) or native sync (Scale).

**Reporting**
- Daily digest email: calls, bookings, follow-ups, revenue impact.
- Weekly summary: trend data, top-performing workflows.
- Dashboard: revenue recovered (hero metric), funnel visualization.

### Best Industries for Business Mode

1. Dental (avg job: $300-3,200; high call volume; appointment-driven)
2. Med Spa (avg job: $400-4,500; high no-show rate; reactivation gold mine)
3. Legal Intake (avg case: $5,000-50,000; every lead is high-value; speed matters)
4. HVAC (avg job: $450; emergency calls; seasonal demand spikes)
5. Roofing (avg job: $8,000-12,000; storm lead follow-up critical)

### Hardest Industries

- Restaurants (low job value, high volume, different workflow needs)
- Retail (not appointment-based)
- Pure e-commerce (no phone calls)

### Best ROI Framing

"If Recall Touch recovers just ONE missed appointment per month, it pays for itself. Most businesses recover 5-20."

| Industry | Avg Job Value | Business Plan Cost | Jobs to Break Even | Typical Monthly Recovery |
|----------|--------------|-------------------|-------------------|------------------------|
| Dental | $1,200 | $297/mo | 0.25 jobs | 8-15 appointments |
| Legal | $5,000 | $297/mo | 0.06 cases | 3-8 consultations |
| HVAC | $450 | $297/mo | 0.66 jobs | 10-25 service calls |
| Med Spa | $800 | $297/mo | 0.37 visits | 5-12 treatments |
| Roofing | $8,000 | $297/mo | 0.04 jobs | 2-5 estimates |


---

## SECTION 13 — WEBSITE ARCHITECTURE

### Simplified Navigation

**Primary Nav (4 items max):**
- How It Works → `/product`
- Industries → `/industries` (dropdown: Dental, Legal, HVAC, Med Spa, Roofing, All)
- Pricing → `/pricing`
- [CTA Button] Try Free → `/activate`

**Secondary Nav (footer only):**
- About, Blog, Docs, Contact, Privacy, Terms, Compare

### Page Hierarchy (Launch-Critical = ★)

★ `/` — Homepage. The single most important page. Must convert cold traffic.
★ `/activate` — Signup wizard. 5 steps, 5 minutes.
★ `/pricing` — Pricing with ROI calculator.
★ `/product` — "How it works" with visual walkthrough of the recovery loop.
★ `/demo` — Interactive demo: hear a sample call + see the follow-up sequence.
★ `/industries/dental` — Dental-specific landing page (primary wedge).
★ `/industries/legal` — Legal intake landing page.
★ `/industries/hvac` — HVAC/home services landing page.
`/industries/medspa` — Med spa landing page.
`/industries/roofing` — Roofing landing page.
`/industries/[slug]` — Generic industry template.
`/compare/[competitor]` — vs. Dialzara, vs. Smith.ai, vs. Goodcall comparison pages.
`/about` — Team, mission, founder story.
`/blog` — SEO content (launch with 5-10 articles targeting "missed call recovery [industry]").
`/contact` — Contact form, chat, support email.
`/privacy` — Privacy policy.
`/terms` — Terms of service.

### Pages to HIDE or REMOVE at Launch

Remove or redirect: `/solo`, `/life`, `/org`, `/connect`, `/declare`, `/live`, `/example`, `/setup`, `/docs` (premature), `/blog/[slug]` (until content exists), `/public/settlement`, `/public/ack`, `/public/work`, `/wrapup`.

### User Flow Through the Site

**Cold visitor:** Homepage → sees pain + solution → clicks "See How It Works" → Product page with visual walkthrough → clicks "Try Free" → Activate wizard

**Researching visitor:** Homepage → Pricing → Industry page → Compare page → Activate

**Referral visitor:** Direct to `/activate` or industry landing page → Activate

**Agency visitor:** Homepage → scroll to "For Agencies" section → `/pricing` (Scale tier) → Contact or Activate

---

## SECTION 14 — HOMEPAGE REDESIGN FOR MAX CONVERSION

### Above-the-Fold Structure

**Layout:** Left text + right visual (mock dashboard showing revenue recovered)

**Headline:** "Stop Losing Revenue to Missed Calls and Broken Follow-Up"

**Subheadline:** "Recall Touch answers every call, books appointments, and runs automated follow-up that recovers the revenue you're currently losing. See results in your first week."

**Primary CTA:** "Start Recovering Revenue — Free for 14 Days"
**Secondary CTA:** "See How It Works" (scrolls to demo section)

**Trust micro-bar below CTA:** "No credit card required · 5-minute setup · Cancel anytime"

### Section-by-Section Homepage Design (10 sections, not 31)

**Section 1: Hero (above-fold)**
- Headline, subhead, dual CTA, trust bar
- Right side: animated dashboard mockup showing "Revenue Recovered: $4,217 this month" with a climbing counter
- Below hero: subtle logo bar of infrastructure partners (Twilio, Stripe, Deepgram — as "Built on trusted infrastructure")

**Section 2: Problem Statement**
- Headline: "Your Business Is Leaking Revenue Right Now"
- Three pain cards:
  - "35-60% of calls go unanswered after hours or when you're busy"
  - "80% of leads who don't hear back in 5 minutes go to a competitor"
  - "No-shows cost the average service business $2,000-$5,000/month"
- Each card with an industry-specific icon and a specific dollar figure
- CTA: "Calculate your revenue leak" → scrolls to ROI section

**Section 3: How It Works (Visual Loop)**
- NOT a generic 3-step "how it works." Instead, show the FULL recovery loop visually:
  - Step 1: Missed call → AI answers in <3 seconds (show phone ringing → AI picks up)
  - Step 2: Captures lead info + books appointment (show conversation excerpt)
  - Step 3: Confirms via SMS (show text message mockup)
  - Step 4: Reminds 24h + 1h before (show reminder notification)
  - Step 5: If no-show → recovery sequence (show automated SMS)
  - Step 6: Revenue recovered (show dashboard metric going up)
- This section should feel like watching the product work, not reading about features

**Section 4: Revenue Impact / ROI Calculator**
- Interactive calculator:
  - Input: "How many calls does your business get per month?" (slider: 50-500)
  - Input: "What's your average job value?" (slider: $200-$10,000)
  - Input: "What % of calls do you miss?" (slider: 10-60%)
  - Output: "You're leaving approximately $X,XXX on the table each month. Recall Touch could recover $X,XXX."
- Below calculator: "Business plan pays for itself if it recovers just ONE [industry] appointment per month."

**Section 5: Industry Selector**
- Headline: "Built for Service Businesses That Can't Afford to Miss a Call"
- Cards for top 5 industries: Dental, Legal, HVAC, Med Spa, Roofing
- Each card shows: industry icon, avg job value, typical monthly recovery, "See how it works for [industry] →"
- Links to industry-specific landing pages

**Section 6: What Makes Us Different**
- Two-column comparison:
  - Left: "AI Receptionists answer calls. That's it."
  - Right: "Recall Touch answers calls AND follows up until the revenue is recovered."
- Specific differentiators with icons:
  - Automated follow-up sequences (competitors: none)
  - No-show recovery (competitors: none)
  - Dead lead reactivation (competitors: none)
  - Revenue attribution dashboard (competitors: call logs)
  - Industry-specific workflows (competitors: generic templates)

**Section 7: Proof / Results**
- At launch (no customers): "Now Accepting Early Customers — Be Among the First to See Results"
- Target state (with customers): Customer quotes with specific numbers: "Recovered $4,200 in the first month" — Dr. Sarah K., Coastal Dental
- Interim: Show product screenshots with real UI demonstrating revenue recovered

**Section 8: Pricing Preview**
- Show 3 tiers with prices
- Highlight Business as recommended
- Below pricing: "Every plan includes a 14-day free trial with full features"
- CTA: "Start Free Trial" per tier

**Section 9: FAQ (6-8 questions)**
- "How quickly can I set up?" → "5 minutes. Connect your phone number, set your greeting, and you're live."
- "What if the AI can't handle a call?" → "It transfers to your team or takes a message. You're always in control."
- "How does the free trial work?" → "Full access for 14 days. No credit card. Cancel anytime."
- "Do callers know they're talking to AI?" → "Optional disclosure. Most callers can't tell the difference."
- "What happens after a call?" → "That's where the magic is. Automated follow-up sequences pursue every lead until it's booked."
- "How do I measure ROI?" → "Your dashboard shows exactly how much revenue was recovered. Most customers see ROI in the first week."

**Section 10: Final CTA**
- Headline: "Every Minute You Wait, Another Call Goes Unanswered"
- Subheadline: "Start your 14-day free trial. See recovered revenue in your first week."
- CTA: "Start Recovering Revenue — Free"
- Trust bar: "No credit card · 5-minute setup · Cancel anytime"

### 10 Headline Variants

1. "Stop Losing Revenue to Missed Calls and Broken Follow-Up"
2. "Your Missed Calls Are Costing You $3,000+ Every Month"
3. "Answer Every Call. Follow Up on Every Lead. Recover Every Dollar."
4. "The Revenue You're Losing Is the Revenue You Never Follow Up On"
5. "Missed Calls. No-Shows. Dead Leads. Recover It All Automatically."
6. "Never Lose Another Customer to a Missed Call or Forgotten Follow-Up"
7. "AI That Answers Your Calls and Chases Your Revenue"
8. "35% of Your Calls Go Unanswered. 100% of That Revenue Is Recoverable."
9. "The Follow-Up System That Pays for Itself in the First Week"
10. "What If Every Missed Call Became a Booked Appointment?"

### 10 Subheadline Variants

1. "Recall Touch answers every call, books appointments, and runs automated follow-up that recovers the revenue you're currently losing."
2. "AI-powered call answering, booking, and follow-up for service businesses that can't afford to miss a lead."
3. "Your AI revenue recovery system. Answers calls. Books appointments. Follows up automatically. Shows you exactly what it recovered."
4. "Stop losing $3,000-$20,000/month to unanswered calls and inconsistent follow-up. Recall Touch fixes both."
5. "An AI system that answers your phone, captures every lead, books appointments, and runs follow-up sequences until the job is booked."
6. "For dental, legal, HVAC, and service businesses that need every call answered and every lead followed up — automatically."
7. "Missed calls become booked appointments. No-shows become rescheduled visits. Dead leads become revenue. Automatically."
8. "The first AI system that doesn't just answer your calls — it follows up until the revenue is in your bank account."
9. "5-minute setup. AI answers 24/7. Automated follow-up recovers your lost revenue. See ROI in your first week."
10. "Combines AI call answering with automated recovery sequences to capture revenue other tools let walk out the door."

### 10 CTA Variants

1. "Start Recovering Revenue — Free for 14 Days"
2. "Try Free for 14 Days"
3. "See What You're Losing → Then Fix It"
4. "Get Started in 5 Minutes"
5. "Start Your Free Trial — No Credit Card"
6. "Answer Every Call Starting Today"
7. "Recover Revenue Automatically — Try Free"
8. "Start Free Trial"
9. "Set Up in 5 Minutes — Free"
10. "Stop Losing Revenue — Start Free"

---

## SECTION 15 — BRAND / VISUAL SYSTEM

### Typography System

- **Headings:** Inter (or similar geometric sans-serif). Bold weight. Large sizes with clamp() for responsiveness.
  - H1: clamp(2.25rem, 4vw, 3.5rem). Used only for homepage hero and page titles.
  - H2: clamp(1.75rem, 3vw, 2.5rem). Section headings.
  - H3: 1.25-1.5rem. Card titles and subsection heads.
- **Body:** Inter Regular. 1rem (16px) base. 1.6 line-height.
- **Mono/Data:** JetBrains Mono or similar for metrics, numbers, code-like elements.

### Color Logic

- **Background:** Warm white #FAFAF8 (not cold white — feels more premium and approachable)
- **Text Primary:** #1A1A1A (almost-black, softer than pure black)
- **Text Secondary:** #6B7280 (gray-500)
- **Accent/Brand:** Teal #0D6E6E (distinctive, professional, not the typical SaaS blue)
- **Success/Revenue:** #16A34A (green — used for revenue recovered, positive metrics)
- **Warning:** #F59E0B (amber — approaching limits, needs attention)
- **Error:** #DC2626 (red — missed calls, failed actions)
- **Cards:** White #FFFFFF with subtle border #E5E7EB and 1px shadow
- **Dark mode:** Not needed at launch. Light mode is correct for marketing site and service business audience.

### Spacing Rhythm

- 4px base unit. All spacing in multiples of 4: 8, 12, 16, 24, 32, 48, 64, 96.
- Section padding: 96px vertical (desktop), 48px (mobile).
- Card padding: 24px internal. 16px gap between cards.
- Max content width: 1200px centered.

### Card Treatment

- White background, 1px border (#E5E7EB), 4px border-radius, subtle shadow (0 1px 3px rgba(0,0,0,0.05))
- Hover: slight shadow increase, no color change
- No rounded-2xl. No excessive border-radius. Keep it sharp and professional.

### Iconography Style

- Lucide React icons (already in stack). Consistent 20px stroke width.
- Use sparingly — icons support text, never replace it.
- Industry icons should be simple and recognizable (tooth for dental, gavel for legal, wrench for HVAC).

### Screenshot Strategy

- Show real product UI, not abstract illustrations.
- Hero screenshot: Revenue recovered dashboard with real-looking numbers.
- Section screenshots: Call transcript, follow-up sequence, booking confirmation, analytics.
- Use browser-chrome mockup frames (not floating screenshots).

### How to Avoid Generic "AI-Made" Design

1. **No gradient mesh backgrounds.** Use flat warm white.
2. **No floating abstract shapes or blobs.** Use real screenshots and UI mockups.
3. **No bento grid layouts.** Use clean left-text/right-image or full-width sections.
4. **No "powered by AI" badges everywhere.** AI is the engine, not the brand.
5. **No dark mode hero with neon accents.** Light, warm, professional.
6. **No animated particle backgrounds.** Static or minimal motion only.
7. **No testimonial carousels with headshots of AI-generated people.** Only use real customer photos or no photos at all.
8. **No feature grids with 20+ checkmarks.** Show 5-6 key features with depth, not breadth.
9. **No "Join 10,000+ businesses" fake social proof.** Say "Now accepting early customers" — honest is premium.
10. **Typography-led design.** Let strong headlines and clear hierarchy do the work, not visual decoration.

---

## SECTION 16 — FULL APP UI/UX DESIGN

### Information Architecture (Simplified from 60+ to ~15 primary screens)

**Launch IA:**
```
Dashboard (home)
├── Revenue Recovered (hero card)
├── Needs Attention (priority queue)
├── Today's Activity (calls, follow-ups, bookings)
├── Quick Stats (calls, bookings, recovery rate)
│
Calls
├── Recent calls (list with outcomes)
├── Call detail (transcript + recording + lead card)
│
Contacts / Leads
├── All contacts (searchable list)
├── Contact detail (timeline: calls, texts, emails, bookings, follow-ups)
│
Follow-Ups
├── Active workflows (running sequences)
├── Workflow templates (browse/edit)
├── Create workflow (builder)
│
Inbox
├── All conversations (threaded by contact)
├── Conversation detail (SMS + email + call transcripts)
│
Calendar
├── Appointment list + calendar view
├── Booking settings
│
Analytics
├── Revenue recovered
├── Call volume + answer rate
├── Follow-up performance
├── Usage (minutes used / limit)
│
Settings
├── Business info
├── Phone number
├── Voice (select voice, greeting, hours)
├── Team (invite, roles)
├── Integrations (CRM, calendar)
├── Billing (plan, usage, invoices)
├── Notifications
```

### Dashboard Layout (The Most Important Screen)

**Hero metric (top):** Revenue Recovered This Month — large green number, trend arrow, comparison to last month.

**Needs Attention queue (below hero, left 2/3):**
- Items sorted by urgency: new leads not contacted, missed follow-ups, upcoming appointments needing confirmation
- Each item: contact name, reason, time since last action, quick-action buttons (call, text, dismiss)
- Max 10 items shown, "View all" link

**Today's Activity (below hero, right 1/3):**
- Chronological feed: "AI answered call from John M. — booked cleaning at 2 PM", "Follow-up SMS sent to Maria G. — no-show recovery", "Quote follow-up #2 sent to Robert K."
- Compact cards with timestamp and status icon

**Quick Stats bar (bottom of dashboard):**
- Calls today | Appointments booked | Follow-ups sent | Minutes remaining

### Onboarding Wizard (Single Path: /activate)

**Step 1: Who are you?**
- "What best describes you?" — Solo Professional / Service Business / Agency or Multi-Location
- Select → sets mode

**Step 2: Tell us about your business**
- Business name, industry (dropdown with icons), location (city/state for phone number provisioning)

**Step 3: Set up your phone**
- Choose: Get a new number (instant) or Port existing number (takes 2-4 weeks, use new number in the meantime)
- Preview number area code

**Step 4: Customize your AI**
- Greeting message (pre-filled from industry template): "Thanks for calling [Business Name], this is our AI assistant. How can I help you today?"
- Voice preview: play button to hear greeting in selected voice
- Business hours selector

**Step 5: Connect your calendar**
- Google Calendar or Outlook OAuth
- Skip option: "I'll set this up later"

**Step 6: You're live!**
- Celebration screen with confetti (subtle, not childish)
- "Your AI is now answering calls. Here's what to do next:"
  - Call your number to test it
  - Check your dashboard for your first call
  - Your follow-up workflows are already running
- CTA: "Go to Dashboard"

### Inbox Layout

**Two-panel:** Contact list on left (1/3 width), conversation thread on right (2/3 width).

Left panel:
- Search bar
- Filter: All / Unread / Needs Response
- Contact cards: name, last message preview, timestamp, unread badge

Right panel:
- Contact name + quick info (phone, last call, status)
- Threaded messages: SMS sent/received, call transcripts (collapsible), email (if any)
- Compose bar at bottom: text input + send button + "Schedule" option

### Contact Timeline Layout

Full-width vertical timeline per contact:
- Each event as a card: call (with play button + transcript toggle), SMS (with message text), email, booking (with details), follow-up (with workflow name + step), no-show, reactivation response
- Right sidebar: contact info, lead score, tags, assigned to, quick actions (call, text, book, add to workflow)

### Workflow Builder Layout

**Simple mode (default):** Template library → select template → customize triggers and messages → activate. No code, no complex logic. Just "when X happens, send Y after Z time."

**Advanced mode (toggle):** Visual node editor with drag-and-drop: trigger → delay → action → condition → branch. For power users and agencies.

### Analytics Layout

**Top:** Revenue recovered (large), trend chart (last 30 days)
**Middle:** Four metric cards: Calls answered, Appointments booked, Follow-ups sent, Recovery rate
**Bottom:** Two panels: call volume by day (bar chart), top-performing workflows (table)

### Mobile UX

- Dashboard: stacked cards (revenue → needs attention → today's activity)
- Calls: list view, tap to expand details
- Inbox: full-screen thread (like iMessage)
- Settings: standard mobile settings pattern (grouped rows with disclosure indicators)
- Bottom nav: Dashboard, Calls, Inbox, More

### What Would Make It Feel Premium

- Smooth transitions (300ms ease, Framer Motion for page transitions)
- Whitespace (don't pack everything tight — let elements breathe)
- Typography hierarchy (clear size differentiation between heading, body, meta)
- Real-time updates (calls appearing in feed without refresh)
- Empty states with helpful guidance ("No calls yet — call your number to test your AI")

### What Would Make It Feel Generic

- Sidebar with 20+ nav items
- Settings pages with 50 toggles
- Dashboards showing data nobody asked for
- Chartist/Recharts defaults without customization
- Loading spinners everywhere instead of skeleton screens
- Modals stacked on modals


---

## SECTION 17 — PRICING & PACKAGING

### Final Pricing Structure

| | Solo | Business (★ Recommended) | Scale | Enterprise |
|--|------|--------------------------|-------|-----------|
| **Monthly** | $49/mo | $297/mo | $997/mo | Custom |
| **Annual** | $39/mo ($468/yr) | $247/mo ($2,964/yr) | $847/mo ($10,164/yr) | Custom |
| **Voice Minutes** | 100/mo | 500/mo | 3,000/mo | Unlimited |
| **Overage** | $0.30/min | $0.20/min | $0.12/min | Negotiated |
| **AI Agents** | 1 | 3 | 10 | Unlimited |
| **Phone Numbers** | 1 | 3 | 10 | Custom |
| **Follow-up Workflows** | 3 basic | Unlimited + industry packs | Unlimited + custom | Unlimited |
| **Team Seats** | 1 | 5 | Unlimited | Unlimited |
| **No-Show Recovery** | — | ✓ | ✓ | ✓ |
| **Reactivation Campaigns** | — | ✓ | ✓ | ✓ |
| **CRM Integration** | — | Webhook | Native sync | Custom |
| **Revenue Dashboard** | Basic | Full | Advanced + benchmarks | Custom |
| **API Access** | — | — | ✓ | ✓ |
| **Premium Voices** | — | — | ✓ (included) | ✓ |
| **White-label** | — | — | — | ✓ |
| **HIPAA BAA** | — | — | — | ✓ |
| **SLA** | — | — | On request | ✓ |

### Add-Ons

| Add-On | Price | Available On |
|--------|-------|-------------|
| Premium Voices (ElevenLabs) | $29/mo | Solo, Business |
| Custom Voice Clone | $499 setup + $49/mo | Business+ |
| Additional Phone Number | $15/mo each | All tiers |
| HIPAA Compliance | $199/mo | Scale+ |
| Dedicated Success Manager | $499/mo | Scale+ |

### What Is Underpriced

- **Solo at $49/mo.** This is intentionally low to attract small operators, but these users have the highest churn and lowest expansion. Consider raising to $79/mo at Month 6 if data shows Solo users churn >8%/mo.
- **Scale at $997/mo for 3,000 minutes.** At Phase 2 COGS ($0.058/min), 3,000 minutes costs $174. The margin is excellent (82.5%), but if usage patterns show Scale users consistently using 2,500+ minutes, the ROI is strong and price could increase.
- **Overage rates.** $0.30/min on Solo is aggressive. $0.12/min on Scale is reasonable. These protect margin well.

### What Should NEVER Be Unlimited

- Voice minutes (always metered — this is the primary COGS driver)
- Outbound calls (prevent abuse — rate limit to 100/day on Business, 500/day on Scale)
- SMS messages (cost $0.01-0.03 each — cap at 500/mo on Solo, 2,000/mo on Business, 10,000/mo on Scale)
- Voice clones (expensive to host — always count-limited)

### What Should Be Premium

- Premium voices (ElevenLabs)
- Voice cloning
- API access
- White-label
- HIPAA compliance
- Advanced analytics/benchmarks
- Custom workflow builder (advanced mode)

### How to Raise ARPU Over Time

1. Usage growth (more calls = more minutes = either upsell or overage)
2. Seat expansion (add team members = upgrade tier)
3. Add-on adoption (premium voices, HIPAA, voice cloning)
4. Multi-location expansion (each location = separate subscription or Scale tier)
5. Agency channel (agencies pay Scale prices for client management)

---

## SECTION 18 — COST, MARGIN, AND UNIT ECONOMICS

### Per-Minute Cost Model (Phase 2 Target — achievable in 90 days)

| Component | Cost/min | Notes |
|-----------|----------|-------|
| Pipecat orchestration | $0.005 | Self-hosted, $50/mo server |
| Deepgram Aura-2 TTS | $0.022 | Standard voices |
| Claude Haiku 4.5 (80%) | $0.009 | Routine calls |
| Claude Sonnet (20%) | $0.030 | Complex calls only |
| **Blended LLM** | **$0.013** | Weighted average |
| Deepgram Nova-2 STT | $0.004 | Cheapest component |
| Twilio telephony | $0.014 | Inbound + outbound |
| **Total COGS/min** | **$0.058** | |

### Per-Message Cost Model

| Channel | Cost | Notes |
|---------|------|-------|
| SMS (US) | $0.0079 | Twilio, outbound |
| Email | ~$0.0001 | SES or similar, negligible |
| Voice (per min) | $0.058 | As above |

### Unit Economics by Tier

| Metric | Solo ($49) | Business ($297) | Scale ($997) |
|--------|-----------|-----------------|-------------|
| Included minutes | 100 | 500 | 3,000 |
| Voice COGS (at limit) | $5.80 | $29.00 | $174.00 |
| SMS COGS (~200/500/2000 msgs) | $1.58 | $3.95 | $15.80 |
| Infra (per-user share) | $2.00 | $2.00 | $2.00 |
| **Total COGS** | **$9.38** | **$34.95** | **$191.80** |
| **Gross Profit** | **$39.62** | **$262.05** | **$805.20** |
| **Gross Margin** | **80.9%** | **88.2%** | **80.8%** |

### Where Margin Gets Destroyed

1. **Heavy voice users who exceed included minutes.** Overage rates protect this ($0.12-0.30/min vs $0.058 COGS), but if users complain about overages and churn, you lose the customer entirely.
2. **Support-heavy users.** Solo users with low technical ability will file tickets. At $49/mo revenue, 2 support tickets/month makes them unprofitable.
3. **Low-activation users.** Users who sign up, don't set up follow-up workflows, don't see value, and churn in month 2. They consumed onboarding support cost but generated no ongoing value.
4. **Free trial abuse.** 14 days of full access with no credit card = risk of trial farming. Mitigate: require phone number verification, flag accounts that create multiple trials.

### Which Customer Profiles Are Dangerous

- **Solo users who don't connect a calendar.** They'll use the product as a glorified voicemail and churn.
- **Businesses with <20 calls/month.** Not enough volume to see meaningful value.
- **Price-sensitive buyers who chose Solo to save money but need Business features.** They'll churn before upgrading.
- **Agencies who sign up for Scale but don't onboard clients.** They'll churn before seeing value.

### Highest-Margin Path

**Business tier ($297/mo) with customers using 200-400 of their 500 included minutes.** COGS: $11.60-$23.20. Gross margin: 92-96%. These customers see value (enough call volume) but don't exhaust limits (no overage complaints). This is the ideal customer profile.

### Path to $1M+ Months

| Scenario | Customers | ARPU | MRR | Gross Margin | Gross Profit |
|----------|-----------|------|-----|-------------|-------------|
| Business-only | 3,367 | $297 | $1M | 88.2% | $882K |
| Blended (70% Biz, 20% Scale, 10% Solo) | 2,500 | $400 | $1M | 85.0% | $850K |
| Agency-heavy (500 agencies × 7 clients) | 3,500 | $285 | $1M | 87.0% | $870K |

Fastest path: 500 agency partners each managing 7 service businesses. Agency pays $997/mo Scale plan, manages 7 clients, each effectively at ~$142/mo. Agencies sell the service at $297-497/mo to their clients, keeping the spread. Win-win.

---

## SECTION 19 — GROWTH & GTM PLAN

### Phase 1: Founder-Led Sales (Month 1-6)

**Best wedge:** Dental practices in a single metro area.

**Why dental:**
- Average job value $300-3,200 (ROI math is obvious)
- High call volume (50-200/month)
- Chronic no-show problem (15-25% no-show rate industry-wide)
- Practice managers are the buyer (accessible, not behind gatekeepers)
- Concentrated in metro areas (can visit 20 practices in a day)

**Tactic:**
1. Build a list of 200 dental practices in one metro area.
2. Call each one. During the call, note how long it takes to answer, whether it goes to voicemail, how the follow-up feels.
3. Send a personalized email: "I called your practice at [time] on [date]. It took [X seconds / went to voicemail]. Here's what happened to that call. Want to see how our system handles it?"
4. Offer: "14-day free trial. We'll set it up for you in 10 minutes. If it doesn't recover at least $1,000 in the first month, we'll extend the trial."
5. Repeat for legal, HVAC, med spa.

**Target:** 50 paying customers in 6 months. ~$15K MRR.

### Phase 2: Proof + Content (Month 3-9)

Once 10-20 customers are generating data:
1. Publish case studies: "How [Dental Practice] recovered $4,200/month in missed appointments"
2. Publish comparison pages: "Recall Touch vs. Smith.ai", "Recall Touch vs. Dialzara"
3. SEO content: "Missed call recovery for dental practices", "How to reduce no-shows", "AI receptionist for [industry]"
4. Google Ads on high-intent keywords: "AI receptionist for dentists", "missed call recovery service"

### Phase 3: Agency/Reseller Channel (Month 6-12)

**Best agency targets:** Digital marketing agencies that serve service businesses. They already manage websites, ads, and SEO for dental/HVAC/legal clients. Adding Recall Touch as a managed service (billing $297-497/mo to their client, paying $142-$200 to Recall Touch) is pure margin for them.

**Agency program:**
- Agency signs up on Scale tier ($997/mo for 3,000 minutes)
- Gets white-label dashboard (future) or co-branded dashboard
- Manages up to 10 clients per Scale subscription
- Earns 20-30% margin on client billing
- Recall Touch provides onboarding support for first 3 clients

**Target:** 50 agency partners by Month 12, each managing 5 clients. = 250 effective customers, ~$50K MRR from agency channel alone.

### Phase 4: Expansion + Inbound (Month 9-18)

With 200+ customers and case studies:
- Increase Google Ads budget on proven keywords
- Launch LinkedIn campaigns targeting practice managers
- Attend industry conferences (dental, HVAC trade shows)
- Launch referral program: $100 credit per referred customer who activates
- Expand to additional industries based on data (which industries retain best, have highest ARPU)

### Fastest Route to $1M Months

**Assumption:** Product works. Retention is strong (>95%/mo). Average ARPU: $350/mo (mix of Business + Scale).

- Month 6: 50 customers, $15K MRR (founder-led)
- Month 9: 150 customers, $50K MRR (case studies + ads kicking in)
- Month 12: 400 customers, $140K MRR (agency channel contributing)
- Month 15: 800 customers, $280K MRR (compounding retention + growth)
- Month 18: 1,500 customers, $525K MRR (inbound flywheel)
- Month 22-24: 3,000 customers, $1M+ MRR

This requires: <5% monthly churn, >60% trial-to-paid conversion, $350+ average ARPU, and a functioning agency channel. Aggressive but realistic with excellent execution.

---

## SECTION 20 — RETENTION, STICKINESS, AND TRUST

### Habit Loops

1. **Morning check:** Business owner opens dashboard, sees "Revenue Recovered" number. Feels good. Checks needs-attention queue. Handles 2-3 items. This becomes a 5-minute daily habit.
2. **Weekly digest:** Email every Monday: "Last week, Recall Touch answered 47 calls, booked 12 appointments, recovered 3 no-shows, and saved an estimated $3,200." Opens email → visits dashboard → reinforces value.
3. **Recovery notification:** Push notification when a no-show is recovered: "Maria G. rebooked her appointment after your no-show recovery sequence." Immediate positive reinforcement.

### Dependency Loops

1. **Follow-up workflows running.** Turning off Recall Touch means all active follow-up sequences stop. Leads will go cold. No-shows won't be recovered. The business immediately starts losing money.
2. **Phone number in use.** Business has published the Recall Touch phone number on their website, Google Business Profile, and marketing materials. Switching requires updating all references.
3. **Historical data.** All call transcripts, contact histories, and revenue attribution data lives in Recall Touch. Moving to a competitor means losing this context.

### Operational Embeddedness

By month 3, the product is embedded in the business's daily operations:
- Phone calls route through Recall Touch
- Appointments book through Recall Touch's calendar integration
- Follow-up sequences are driving re-engagement
- Team members check the inbox daily
- Revenue attribution informs business decisions

### Switching Costs

- Rebuilding all follow-up workflows in a new system (5-20 hours of work)
- Losing contact timeline history
- Updating phone number on all marketing materials
- Retraining staff on new system
- Losing revenue during transition period (follow-ups stop)

### Churn Signals (Monitor These)

1. Dashboard not visited in 7+ days
2. Follow-up workflows paused or deleted
3. Call volume dropping (business may be seasonal or closing)
4. Support tickets about price or value
5. Failed payment + no response to dunning emails
6. Team seats removed

### Rescue Flows

1. **7-day inactivity:** Email: "Your follow-up engine has been working — here's what it did this week" (even if they didn't check)
2. **Workflow paused:** In-app banner: "Your no-show recovery workflow is paused. You may be missing recovery opportunities."
3. **Failed payment:** Email: "Your account is past due. Your AI is still answering calls — update your payment to keep it running."
4. **Cancel intent:** Survey: "What's the main reason? (a) Too expensive (b) Not seeing results (c) Switching to competitor (d) Business closed." If (a): offer 20% discount for 3 months. If (b): schedule a 15-minute call to review their setup. If (c): ask which competitor and why.

### Expansion Triggers

1. Hitting 80% of included minutes → "You're close to your limit. Upgrade to Business for 5x the minutes at a lower per-minute rate."
2. Adding a second location → "Scale tier supports 10 locations. Manage all of them from one dashboard."
3. Hiring staff → "Add your team. Business includes 5 seats."
4. Agency interest → "Want to offer this to your clients? Our agency program gives you white-label management."


---

## SECTION 21 — IN-HOUSE VOICE STRATEGY

### Should You Build It?

**Yes — but sequentially and only the parts that impact margin.** See PHASE-6-VOICE-STRATEGY.md (v2.0) for the detailed technical plan. Summary here.

### Current State and Problem

Voice COGS: $0.148/min. At 500 minutes/month (Business tier), that's $74 in COGS against $297 revenue = 75% margin. At 3,000 minutes (Scale tier), that's $444 against $997 = 55% margin. The Scale tier margin is dangerously thin.

### 90-Day Plan (Already Implemented in Code)

**Sprint 1 (Week 1-2): Swap TTS + LLM → $0.099/min**
- Default TTS: Deepgram Aura-2 ($0.022/min, down from ElevenLabs $0.050)
- Default LLM: Claude Haiku 4.5 ($0.009/min, down from Sonnet $0.030) for routine calls
- ElevenLabs = premium add-on only ($29/mo)
- Claude Sonnet = complex calls only (complaints, negotiations)
- Code changes: Already in `src/lib/vapi/client.ts` — `buildAssistantBody()` uses Haiku + Deepgram Aura-2 by default

**Sprint 2 (Month 1-3): Drop Vapi → $0.058/min**
- Replace Vapi ($0.050/min pure markup) with Pipecat (open-source, $0.005/min hosting)
- Pipecat + Twilio Media Streams + Deepgram STT + Deepgram Aura-2 TTS + Claude Haiku/Sonnet
- Engineering effort: 2-3 weeks
- Quality gate: MOS ≥ 3.8, latency ≤ 800ms, call completion within 2%

**Sprint 3 (Month 3-6): Further optimize → $0.043/min (stretch)**
- Evaluate Cartesia Sonic TTS ($0.012/min, 40ms TTFB)
- Evaluate GPT-4o-mini for simplest calls ($0.001/min)

### STT Strategy

**Keep Deepgram Nova-2 indefinitely.** At $0.004/min, it's essentially free relative to other costs. Building in-house STT would save $0.004/min and cost hundreds of thousands in R&D. Never worth it.

### TTS Strategy

**Phase 1 (now):** Deepgram Aura-2 as default. Quality is "very good" (MOS 4.0+), latency is 90ms. Good enough for business calls.

**Phase 2 (Month 3-6):** Evaluate Cartesia Sonic 3. If quality passes A/B test (MOS ≥ 3.8), switch. Saves another $0.010/min.

**Long-term (Month 6-12):** Evaluate self-hosted open-source TTS (Orpheus, Piper, XTTS v2). Only pursue if quality is indistinguishable from commercial APIs. GPU cost at scale: $0.005-$0.024/min depending on hardware.

**ElevenLabs role:** Premium-only. Customers who want the absolute best voice quality pay $29/mo add-on. Custom voice cloning: $499 setup + $49/mo, powered by ElevenLabs Professional Cloning.

### LLM Strategy

**Routine calls (80%):** Claude Haiku 4.5 — fast, cheap ($0.009/min), handles booking, FAQ, and routing.

**Complex calls (20%):** Claude Sonnet 4 — used for complaints, negotiations, complex intake, multi-turn reasoning.

**Future (Month 6+):** Evaluate GPT-4o-mini ($0.001/min) for the simplest interactions (hours inquiry, basic FAQ). If it handles these without quality degradation, route 30-40% of calls to it.

**Call complexity classification:** Based on first 10 seconds of caller intent. Keywords like "complaint," "problem," "speak to someone," "unhappy" → route to Sonnet. Keywords like "book," "schedule," "appointment," "how much" → route to Haiku.

### Cloning Strategy

- Launch at Month 6 as a premium feature
- $499 setup + $49/mo
- Uses ElevenLabs Professional Voice Cloning initially
- Requires voice consent recording from voice owner
- Consent stored in `voice_consents` table (already exists in schema)
- Long-term: evaluate XTTS v2 for in-house cloning (zero-shot capable)

### Quality Bar: "Good Enough to Win Commercially"

The voice does NOT need to be the best in the world. It needs to be good enough that callers stay on the line and book appointments. Specifically:

- MOS ≥ 3.8 (out of 5.0) — "sounds professional, natural enough"
- Latency ≤ 800ms (response time after caller stops speaking)
- Call completion rate within 2% of the best option
- <40% of callers identify it as AI in blind test (current ElevenLabs benchmark: <30%)

At MOS 3.8 and $0.058/min, the economics dominate. At MOS 4.5 and $0.148/min, the quality is marginally better but the margin is dangerously thin. Choose economics.

### Where Voice Creates Moat

1. **Business-optimized voice presets.** Voices tuned specifically for dental reception, legal intake, HVAC dispatch — not generic TTS. These presets include speech patterns, vocabulary, pacing, and warmth calibrated for each industry.
2. **Call handling intelligence.** The AI doesn't just speak — it handles the business logic (booking, lead capture, routing, message-taking). This is the moat, not the voice itself.
3. **Follow-up integration.** The call outcome directly triggers follow-up workflows. No other voice platform does this natively.

### Where Voice Is a Distraction

- Voice quality arms race with ElevenLabs (they'll always win on pure quality)
- Building custom voice models from scratch (years of R&D for marginal improvement)
- Supporting 50+ languages before English is profitable
- Custom emotion controls (nice-to-have, not commercially critical)

### Cost Per Useful Minute Target

**"Useful minute"** = a minute of call time that captures a lead, books an appointment, or progresses a relationship. Not every minute is useful (hold time, silence, confused callers).

Target: $0.058/min blended COGS on all minutes. On useful minutes (est. 60-70% of total), effective cost is $0.083-$0.097/min. At Business pricing ($297/500 min = $0.594/min revenue), that's 6-7x markup on useful minutes.

---

## SECTION 22 — WHAT TO CUT / HIDE / DELAY

### Remove Entirely

| What | Why |
|------|-----|
| `/solo`, `/life`, `/org` surface routes | Confusing. Mode selection should happen in onboarding wizard, not as separate pages |
| `/declare` page | No clear purpose for customers |
| `/public/settlement`, `/public/ack` | Enterprise feature nobody needs at launch |
| `/wrapup/[token]` | Internal/advanced feature, not customer-facing |
| `/example` page | Development artifact |
| `/ops/*` pages (4 pages) | Internal ops dashboard — should be admin-only, not in main routing |
| Governance onboarding (`/onboard/governance`, `/onboard/source`, etc.) | Enterprise compliance flow that scares away SMBs |
| Blog with no content | Empty blog hurts credibility. Remove until you have 5+ articles |

### Hide Until Needed

| What | Why |
|------|-----|
| Call Intelligence page | Advanced analytics — show after 100+ calls |
| Knowledge Base page | Advanced — most businesses don't need custom knowledge base at start |
| Compliance settings | Only show to HIPAA/regulated industry users |
| Lead Scoring settings | Advanced — hide until user has 50+ leads |
| Developer/Webhooks pages | Only show to Scale+ tier |
| Agency dashboard | Only show to Scale tier users who select "Agency" mode |
| Campaign builder | Show after user has been active 2+ weeks |
| A/B testing (voice) | Scale+ tier only |
| Advanced workflow builder | Business+ tier, behind "Advanced" toggle |
| Attestations, Procurement, Delegation, Exposure, Reliance pages | Enterprise features — hide completely until Enterprise tier |

### Delay to v2 (Month 6+)

| What | Why |
|------|-----|
| Sales Mode | Not the launch wedge. Build after Business mode is proven |
| White-label | Requires significant engineering. Delay until agency channel is validated |
| Custom voice cloning | ElevenLabs integration needed. Premium feature for Month 6 |
| Multi-language support (i18n) | English-first. Don't maintain 6 language files until there's international demand |
| 29-country phone support | US and Canada first. International expansion after $100K MRR |
| Docs/API documentation | Delay until Scale tier has paying customers who need API |
| Zoom integration | Nice-to-have, not critical |
| Advanced analytics/benchmarks | Month 3+ after you have enough data to benchmark |
| Settlement processing | Enterprise feature. Month 12+ |

### Simplify

| What | How |
|------|-----|
| 4 onboarding flows → 1 | Keep only `/activate` wizard. Remove `/onboard/*`, `/app/onboarding`, `/dashboard/onboarding` |
| 2 dashboard systems → 1 | Keep `/app/*` or `/dashboard/*`, not both. Redirect the other. |
| 60+ dashboard pages → 15 | See Section 16 IA. Hide everything not in the core loop |
| 31 homepage sections → 10 | See Section 14. Most sections are redundant |
| 8 settings subsections → 5 | Merge compliance into business, merge call-rules into agent, merge activity into notifications |

### Generic Patterns to Kill

1. Bento grid visual layouts → replace with focused screenshots
2. Animated counters claiming metrics that don't exist → replace with honest "early access" or real metrics
3. "How it works" 3-step pattern → replace with visual loop showing the full recovery cycle
4. Feature comparison table with 30 checkmarks → replace with 5 key differences
5. Trust badges without substance → replace with specific claims ("256-bit encryption, SOC 2 audit in progress Q2 2026")

### Expensive Traps to Avoid

1. **Building custom TTS models** before $500K MRR. Use commercial APIs.
2. **Maintaining 6 language files** for a product with 0 international customers.
3. **Building enterprise features** (governance, compliance, settlements) before having 50 SMB customers.
4. **Supporting 29 countries** before proving US market fit.
5. **Building a developer portal** before anyone has asked for API access.

---

## SECTION 23 — LAUNCH-READY PRIORITY STACK

### A. MUST FIX IMMEDIATELY (Week 1-2)

| Item | Why | Conversion Impact | Trust Impact | Retention Impact | Margin Impact |
|------|-----|-------------------|-------------|-----------------|---------------|
| Consolidate to single dashboard (/app OR /dashboard) | Two systems = confused users + double maintenance | Medium | High | High | — |
| Reduce homepage to 10 sections | 31 sections = bounce. Cut to problem → solution → proof → price → CTA | Very High | Medium | — | — |
| Single onboarding flow (/activate only) | 4 paths = confusion. One path = completion | Very High | Medium | High | — |
| Swap TTS to Deepgram Aura-2 | $0.028/min savings per call minute | — | — | — | Very High |
| Swap default LLM to Haiku | $0.021/min savings per call minute | — | — | — | Very High |
| Remove fake/empty pages | Empty blog, docs, compare pages hurt credibility | — | High | — | — |
| Add revenue recovered to dashboard hero | This is the #1 retention metric. Make it the first thing users see. | Medium | Medium | Very High | — |
| Fix BillingTier references across codebase | "growth"/"team" → "business"/"scale" consistency | — | — | Medium | — |

### B. SHOULD IMPROVE SOON (Week 3-6)

| Item | Why | Conversion | Trust | Retention | Margin |
|------|-----|-----------|-------|-----------|--------|
| Build 3 industry landing pages (dental, legal, HVAC) | Industry-specific conversion is 2-3x higher than generic | Very High | High | — | — |
| Add founder story / about page | Real person behind the product builds trust | — | Very High | — | — |
| Build interactive demo (hear a call + see follow-up sequence) | Prospects need to see the product working | Very High | High | — | — |
| Add ROI calculator prominently on homepage + pricing | Justifies the price before they see it | High | Medium | — | — |
| Implement Pipecat to replace Vapi | Saves $0.05/min = biggest single margin improvement | — | — | — | Very High |
| Hide 40+ dashboard pages behind progressive disclosure | New users should see 8-10 pages, not 60+ | Medium | — | High | — |
| Build weekly email digest | "Here's what Recall Touch did for you this week" = retention | — | — | Very High | — |
| Add needs-attention queue to dashboard | Tells user what to do next = engagement | — | — | High | — |

### C. CAN WAIT (Month 2-6)

| Item | Why |
|------|-----|
| API documentation and developer portal | Wait for Scale tier paying customers |
| Agency white-label dashboard | Wait for agency channel validation |
| Custom voice cloning | Premium feature, Month 6 |
| Advanced workflow builder (visual nodes) | After basic templates are proven |
| Multi-language support | After US market is proven |
| International phone numbers | After US market is proven |
| Sales Mode | After Business mode generates revenue |
| Blog content + SEO | Start writing Month 2, publish Month 3+ |
| Comparison pages | After you have real differentiation data |
| Advanced analytics / benchmarks | After enough customer data to benchmark |

### D. SHOULD BE HIDDEN/REMOVED NOW

| Item | Action |
|------|--------|
| Governance onboarding flow | Remove (redirect to /activate) |
| Settlement, attestation, procurement pages | Hide completely |
| Delegation, exposure, reliance, protocol pages | Hide completely |
| Blog with no content | Remove from nav, return 404 or redirect to homepage |
| Docs page | Remove from nav until API is documented |
| i18n language files (fr, de, es, pt, ja) | Remove from build — English only at launch |
| Surface routes (/solo, /life, /org) | Redirect to /activate |
| /ops/* admin pages | Move behind admin auth, not public routing |

---

## SECTION 24 — IMPLEMENTATION BRIEF FOR CURSOR

### 1. Product Surfaces to Build (Priority Order)

**P0 — Must ship for launch:**
- [ ] Unified dashboard with revenue recovered hero metric
- [ ] Single onboarding wizard (/activate, 6 steps)
- [ ] Call management (list + detail with transcript)
- [ ] Contact timeline (per-contact history)
- [ ] Basic inbox (SMS + call transcript threads)
- [ ] Follow-up workflow templates (5 industry packs: dental, legal, HVAC, med spa, general)
- [ ] Booking integration (Google Calendar)
- [ ] Revenue attribution dashboard
- [ ] Settings (business, phone, voice, billing, team)
- [ ] Homepage (10 sections, as designed in Section 14)
- [ ] Pricing page with ROI calculator
- [ ] /activate signup wizard

**P1 — Ship within 30 days:**
- [ ] Industry landing pages (dental, legal, HVAC)
- [ ] Interactive demo page
- [ ] No-show recovery workflow
- [ ] Reactivation campaign workflow
- [ ] Weekly email digest
- [ ] Needs-attention queue on dashboard
- [ ] Outlook Calendar integration

**P2 — Ship within 90 days:**
- [ ] Custom workflow builder (basic mode)
- [ ] CRM sync (Salesforce, HubSpot webhook)
- [ ] Advanced analytics
- [ ] Compare pages (vs. Smith.ai, vs. Dialzara, vs. Goodcall)
- [ ] Agency management dashboard

### 2. Page/Component Priorities

**Delete or redirect:** /solo, /life, /org, /declare, /example, /wrapup, /public/settlement, /public/ack, /ops/* (move to admin), governance onboarding steps, duplicate dashboard system

**Consolidate:** Pick either /app/* OR /dashboard/* as the canonical dashboard. Redirect the other.

**Simplify homepage:** Keep: Hero, Problem, HowItWorks (loop), ROI Calculator, Industries, Differentiation, Proof/Early Access, Pricing Preview, FAQ, Final CTA. Remove the other 21 sections.

### 3. Core Data Model

```
workspaces (business account)
├── agents (AI voice agents, 1-10+ per workspace)
├── contacts (all people who've interacted)
│   ├── call_sessions (calls with this contact)
│   ├── messages (SMS/email sent/received)
│   ├── bookings (appointments)
│   └── workflow_enrollments (active follow-up sequences)
├── workflows (follow-up sequence definitions)
│   └── workflow_steps (individual steps in sequence)
├── usage_events (voice minutes, SMS, etc. for billing)
├── analytics_daily (pre-aggregated daily metrics)
├── team_members (users with workspace access)
└── integrations (CRM, calendar connections)
```

### 4. Backend/System Requirements

- **Voice:** Vapi (Phase 1) → Pipecat (Phase 2). See PHASE-6-VOICE-STRATEGY.md v2.0
- **Workflow engine:** BullMQ or Vercel Cron for scheduled step execution. See `src/lib/workflows/scheduler.ts`
- **SMS:** Twilio Messaging API
- **Email:** Amazon SES or Resend
- **Calendar:** Google Calendar API + Microsoft Graph API
- **Billing:** Stripe Subscriptions + metered usage for overages
- **Database:** Supabase PostgreSQL with RLS
- **Auth:** Supabase Auth
- **Hosting:** Vercel (Next.js) + one dedicated server for Pipecat voice orchestration

### 5. Frontend/UX Requirements

- Consolidate to single dashboard system (15 primary screens per Section 16)
- Progressive disclosure: new users see core screens only; advanced features unlock over time
- Mobile-responsive (bottom nav: Dashboard, Calls, Inbox, More)
- Skeleton loading states (no spinners)
- Real-time updates via Supabase Realtime for call feed and inbox
- Framer Motion for page transitions (subtle, 200-300ms)

### 6. Billing/Pricing Logic

- `src/lib/billing-plans.ts`: Solo/Business/Scale/Enterprise with correct limits
- `src/lib/voice/billing.ts`: Tier-specific overage rates (Solo $0.30, Business $0.20, Scale $0.12)
- `src/lib/stripe-prices.ts`: ENV-based Stripe price ID resolution
- Usage tracking: `usage_events` table records every voice minute and SMS
- Overage billing: Stripe metered billing on subscription, charged at period end
- Trial: 14 days, full features, no credit card, tracked via `workspace.trial_ends_at`

### 7. Analytics/KPI Requirements

**Dashboard metrics (real-time):**
- Revenue recovered (estimated, based on call outcomes × industry avg job value)
- Calls answered / missed
- Appointments booked
- Follow-ups sent / responded
- No-shows recovered
- Minutes used / remaining

**Internal metrics (admin dashboard):**
- MRR, customer count, churn rate
- Trial → paid conversion rate
- Activation rate (% who complete setup within 48 hours)
- Revenue per customer
- Voice COGS per minute (actual, tracked)
- Support tickets per customer

### 8. Rollout Order

| Week | Focus |
|------|-------|
| 1-2 | Consolidate dashboard, reduce homepage to 10 sections, single onboarding, TTS+LLM swap |
| 3-4 | Revenue dashboard hero metric, needs-attention queue, hide 40+ pages |
| 5-6 | Industry landing pages, interactive demo, Pipecat migration begins |
| 7-8 | No-show recovery workflow, reactivation campaign, weekly digest |
| 9-10 | Pipecat goes live (Vapi removed), CRM webhook integration |
| 11-12 | Advanced analytics, compare pages, agency dashboard |

---

## SECTION 25 — FINAL HOMEPAGE COPY + WIREFRAME

### Final Hero

**Headline:** Stop Losing Revenue to Missed Calls and Broken Follow-Up

**Subheadline:** Recall Touch answers every call, books appointments, and runs automated follow-up that recovers the revenue you're currently losing. See results in your first week.

**Primary CTA:** Start Recovering Revenue — Free for 14 Days

**Secondary CTA:** See How It Works ↓

**Trust bar:** No credit card required · 5-minute setup · Cancel anytime

**Visual:** Dashboard mockup on right showing "Revenue Recovered This Month: $4,217" with upward trend line

### Section-by-Section Wireframe with Copy

**[Section 1 — Hero]** (described above)

**[Section 2 — Problem]**
Headline: "Your Business Is Leaking Revenue Right Now"
Card 1: "35-60% of calls go unanswered" + missed call icon
Card 2: "80% of leads go to a competitor if you don't respond in 5 minutes" + clock icon
Card 3: "No-shows cost $2,000-$5,000/month on average" + calendar-x icon

**[Section 3 — How It Works: The Recovery Loop]**
Headline: "From Missed Call to Recovered Revenue in 6 Steps"
Visual flow (horizontal on desktop, vertical on mobile):
→ Missed call → AI answers in <3 sec → Captures lead + books apt → Confirms via SMS → Reminds 24h + 1h before → No-show? Auto-recovery → Revenue recovered ✓

**[Section 4 — ROI Calculator]**
Headline: "Calculate Your Revenue Leak"
Three sliders: Monthly calls (50-500), Average job value ($200-$10,000), Missed call % (10-60%)
Output: "You're leaving ~$X,XXX/month on the table. Recall Touch could recover $X,XXX."
Below: "The Business plan pays for itself with just ONE recovered [job type]."

**[Section 5 — Industries]**
Headline: "Built for Service Businesses That Can't Afford to Miss a Call"
5 industry cards: Dental ($300-3,200/job), Legal ($5,000-50,000/case), HVAC ($450/call), Med Spa ($400-4,500/visit), Roofing ($8,000-12,000/job)
Each links to industry landing page

**[Section 6 — Differentiation]**
Headline: "Not Just Another AI Receptionist"
Two-column:
Left (Others): "Answer calls. Take messages. That's it."
Right (Recall Touch): "Answer calls. Book appointments. Follow up automatically. Recover no-shows. Reactivate dead leads. Show you exactly what it recovered."

**[Section 7 — Proof]**
Pre-customers: "Now Accepting Early Customers — See Results in Your First Week"
Product screenshots showing real dashboard UI
Post-customers: Customer quotes with specific numbers

**[Section 8 — Pricing]**
3 tier cards (Solo $49 / Business $297 / Scale $997)
Below: "Every plan includes a 14-day free trial with full features. No credit card."

**[Section 9 — FAQ]**
6 questions (per Section 14 detail)

**[Section 10 — Final CTA]**
Headline: "Every Minute You Wait, Another Call Goes Unanswered"
CTA: "Start Recovering Revenue — Free for 14 Days"
Trust: "No credit card · 5-minute setup · Cancel anytime"

### Footer

Two rows:
Row 1: Logo | Product (How It Works, Pricing, Demo, Industries) | Company (About, Blog, Contact) | Legal (Privacy, Terms)
Row 2: © 2026 Recall Touch · SOC 2 audit in progress · 256-bit encryption · GDPR-ready

---

## SECTION 26 — FINAL DECISION STACK

1. **Single best category:** AI Revenue Recovery

2. **Single best homepage message:** "Stop Losing Revenue to Missed Calls and Broken Follow-Up"

3. **Single best wedge:** Dental practices in a single metro area, selling Business plan ($297/mo) through founder-led sales with a 14-day free trial and a promise: "If it doesn't recover $1,000 in the first month, we'll extend your trial."

4. **Single best product shape:** Call answering → Follow-up engine → Revenue attribution dashboard. The follow-up engine is the product. The call answering is the hook. The revenue dashboard is the retention mechanism.

5. **Single best pricing structure:** Solo $49 / Business $297 (recommended) / Scale $997 / Enterprise Custom. Metered voice minutes with tier-specific overage rates. 14-day free trial, no credit card.

6. **Single best trust improvement:** Get 5 real customers using the product and publish their results. One honest case study with real numbers beats any amount of design polish or trust badges.

7. **Single best margin-protection move:** Complete the Pipecat migration to eliminate Vapi's $0.05/min markup. This single change saves $50,000 per million minutes and improves gross margin by 5-8 percentage points.

8. **Single biggest thing making it look generic today:** Leading with AI/voice technology instead of revenue recovery outcomes. The homepage should make the visitor feel the pain of lost revenue before ever mentioning AI.

9. **Single biggest blocker to scale:** Zero social proof. No testimonials, no case studies, no logos, no reviews. Until the first 10 customers are generating visible results, growth will be limited to founder-led sales. Everything else (SEO, ads, agency channel) requires proof.

10. **Single clearest path to fast million-dollar months:** Get 50 dental/legal/HVAC customers in 6 months through founder-led sales. Use their results to build case studies. Launch agency reseller program at Month 6. Each agency brings 5-10 clients. 200 agencies × 7 clients × $297 average = $415K MRR from agency channel alone. Combined with direct customers: $1M+ MRR by Month 22-24.

---

*End of V6 Complete Strategy Brief. 26 sections. Zero fluff. Implementation-ready.*
