# RECALL TOUCH — FINAL AUDIT + STRATEGY MEMO

---

## WHAT RECALL TOUCH IS TODAY

A technically complete AI revenue recovery system deployed on Vercel with 498 API routes, 529 passing tests, 0 TypeScript errors, and a live production deployment. The codebase includes: inbound call handling (Vapi + Deepgram + Claude), outbound campaign engine with 10 types and a 5-step wizard, database-driven follow-up sequences with 5-minute cron execution, contact timeline with 5 event types, 3-mode UI (Solo/Sales/Business), ROI calculator with 3 interactive sliders, PostHog analytics, Sentry error tracking, Upstash Redis rate limiting, HMAC-SHA256 sessions, Stripe billing with 4 tiers, and a 10-section homepage with FAQPage JSON-LD.

The product is built. The deployment is live. Zero customers are using it.

---

## WHAT IS WRONG

### The product is invisible

The homepage sells "missed calls" and "voicemail." That positions Recall Touch alongside $29/month AI receptionist tools. The outbound engine, the campaign builder, the setter workflows, the revenue attribution dashboard, and the mode system — the actual differentiators — are not visible to any prospect scanning the site.

### The product is unproven

Zero social proof. No customer logos. No testimonials. No case studies. No screenshots of real revenue recovered. No founder photo. No team page. The product is anonymous. An enterprise buyer running diligence would close the tab in 10 seconds.

### The billing infrastructure has structural defects

The checkout endpoint returns HTTP 200 for all errors, making it impossible for the frontend to distinguish success from failure. The webhook handler relies on catching Postgres error code strings for idempotency. The billing status endpoint hardcodes plan minutes separately from billing-plans.ts. Trial end dates are calculated in three different places that can diverge. There are no dunning emails, no trial grace period, no cancellation survey, and no email verification on signup.

### The value framing caps perceived market size

The ROI calculator defaults to $650 average job value. Industry examples top out at HVAC ($46,800/year). These numbers are appropriate for small-business plumbing but make the product look irrelevant to legal intake ($4,000+ per case), real estate ($10,000+ per deal), multi-location dental groups ($500K+ annual revenue at risk), or any sales team running outbound at scale. The framing must support $2K to $50K+ monthly recovered revenue without looking absurd.

### The voice stack burns margin unnecessarily

Current COGS: $0.099/min from outsourced vendors (Vapi $0.035, Deepgram TTS $0.015, Deepgram STT $0.015, Claude $0.024, Twilio $0.010). At Business tier (500 min), that is $49.50 COGS on $297 revenue — 83% margin. Healthy, but Vapi alone costs $17.50/month per customer for orchestration that Pipecat (open source) does for free. At 1,000 customers, that is $17,500/month to Vapi.

---

## WHAT IT MUST BECOME

### Category: AI Revenue Operations

Not a receptionist (too narrow, $29/mo ceiling). Not a phone system (commodity). Not a CRM (passive). Not an automation tool (Zapier territory). AI Revenue Operations implies the full loop: capture, qualify, book, follow up, recover, attribute, prove ROI. It justifies $297/month. It spans inbound + outbound. It supports solo through enterprise.

### Positioning: outcome-led, not feature-led

Lead with "Recover the revenue you are losing." Not "AI answers your calls." The word "recover" implies money that belongs to the customer. It is worth $297/month. "Answer" implies a commodity feature worth $29/month.

### Audience: SMB gravity with upward expansion

Primary wedge: single-location service businesses at Business tier ($297/mo). Dental, HVAC, legal, med spa. Pain is acute ($297 is less than one missed appointment). Speed to value is fast (first call answered in minutes). Retention is high (weekly digest proves ROI). Expansion: agencies managing 10-50 clients. Each client is a $297 account. One agency partnership equals $3K-$15K MRR.

### Margin structure: own the stack

Phase 2 (Pipecat) alone drops COGS from $0.099 to $0.064/min — saving $17,500/month at 1,000 customers. Full self-hosted stack (Pipecat + Kokoro TTS + Canary STT + Llama 3 8B + Telnyx) drops COGS to $0.007/min — 98%+ margins. This is a 12-month build, not a 6-week sprint.

---

## WHY IT CAN WIN

1. Nobody owns AI Revenue Operations for service businesses.
2. The full loop (answer + follow up + book + recover + attribute) has no single competitor.
3. Self-hosted voice infrastructure creates margins competitors cannot match.
4. Revenue attribution data becomes the switching cost — once the weekly digest shows $4,200 recovered this month, the customer never leaves.
5. The codebase is real. 529 tests. 498 routes. The engineering is done. The gap is customers and proof.

---

## WHAT MUST HAPPEN FIRST

1. Fix the 10 structural billing/auth defects before any customer touches the product.
2. Get 1 real customer on the system. One. Not five. One dental office or HVAC company forwarding their actual phone number.
3. Capture their revenue-recovered data after 7 days. Put that number on the homepage.
4. That one proof point unlocks the next 10 customers, which unlocks the agency channel, which unlocks scale.

Everything else is secondary.
