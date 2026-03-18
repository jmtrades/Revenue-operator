# PHASE 5: PRICING, PACKAGING, COSTS & MARGIN LOGIC

**Date:** March 17, 2026

---

## 1. PRICING ARCHITECTURE

### Guiding Principles

1. **Price on value, not cost.** One recovered dental patient ($3,000+) justifies the entire year of service. Price relative to the revenue the product creates, not the infrastructure it consumes.
2. **Minutes are the billing unit.** Voice minutes are the primary variable cost and the primary value delivery mechanism. They're the right thing to meter.
3. **Never cut off a call.** If a customer exceeds their plan, calls continue at an overage rate. This protects the customer experience and generates high-margin overage revenue.
4. **Annual pricing for retention.** Offer 17% discount on annual plans. This improves cash flow, reduces churn, and locks in revenue.
5. **Follow-up and recovery features drive upgrade.** The most valuable features (no-show recovery, reactivation, unlimited follow-ups) gate to Business tier and above.

### Final Pricing Tiers

| | Solo | Business | Scale | Enterprise |
|---|---|---|---|---|
| **Monthly** | $49/mo | $297/mo | $997/mo | Custom |
| **Annual** | $39/mo ($468/yr) | $247/mo ($2,964/yr) | $847/mo ($10,164/yr) | Custom |
| **Voice minutes** | 100/mo | 500/mo | 3,000/mo | Custom |
| **AI agents** | 1 | 3 | 10 | Custom |
| **Phone numbers** | 1 | 3 | 10 | Custom |
| **Team seats** | 1 | 5 | Unlimited | Unlimited |
| **Active follow-ups** | 10 | Unlimited | Unlimited | Unlimited |
| **Appointment booking** | ✓ | ✓ | ✓ | ✓ |
| **Call transcripts** | ✓ | ✓ | ✓ | ✓ |
| **SMS follow-up** | ✓ | ✓ | ✓ | ✓ |
| **Missed call recovery** | ✓ | ✓ | ✓ | ✓ |
| **No-show recovery** | — | ✓ | ✓ | ✓ |
| **Reactivation campaigns** | — | ✓ | ✓ | ✓ |
| **Industry templates** | Basic | Full | Full + custom | Custom |
| **Analytics** | Basic | Revenue attribution | Advanced + benchmarks | Custom |
| **CRM integration** | — | Webhook | Native sync + API | Custom |
| **Priority support** | — | — | ✓ | ✓ |
| **Dedicated success manager** | — | — | — | ✓ |
| **White-label** | — | — | — | ✓ |
| **SSO** | — | — | — | ✓ |
| **Overage rate** | $0.30/min | $0.20/min | $0.12/min | Negotiated |

### Key Decisions Explained

**Appointment booking on ALL tiers (including Solo).** This was gated to $497+ on the old site. That was wrong. Booking is the highest-value, lowest-cost feature. It drives the strongest ROI perception. Gating it makes the cheapest tier feel useless and drives churn. Calendar API costs are negligible.

**Solo at $49/mo.** This tier exists for: individual operators, freelancers, micro-businesses testing the product, and as a gateway drug to Business. At 100 minutes/month, it's roughly 3-4 calls per day — enough for a solo plumber or consultant. The economics work: 100 min × $0.15 COGS = $15 COGS, $34 gross profit per Solo customer.

**Business at $297/mo.** This is the hero tier. The ICP — a dental practice, HVAC company, or law firm — will land here. 500 minutes is ~16 calls per day at 3 minutes average. It includes the full follow-up engine (no-show recovery, reactivation, unlimited follow-ups) which is the real differentiator.

**Scale at $997/mo (not $2,400).** The old website had Scale at $2,400 — too high. The jump from $497 to $2,400 (4.8x) was brutal and left a gap. $997 is 3.3x Business, which is aggressive but defensible for 6x the minutes, 3x the agents, and advanced analytics. Scale serves: multi-location businesses, high-volume practices, and businesses with 30+ calls/day.

**Enterprise is custom.** White-label, SSO, custom compliance, SLAs. This is the agency and large-group play. Priced per conversation or per location, negotiated.

### Overage Pricing Logic

Overages must be high enough to protect margin but not so high that they cause sticker shock and churn.

| Tier | Overage Rate | COGS per Minute | Overage Margin |
|------|-------------|-----------------|----------------|
| Solo | $0.30/min | ~$0.15 | ~50% |
| Business | $0.20/min | ~$0.15 | ~25% |
| Scale | $0.12/min | ~$0.12 | ~0% (volume play) |

**Scale overage is essentially at-cost.** This is intentional. Scale customers pay $997/month for 3,000 minutes. They're high-volume, high-commitment, low-churn. The base fee provides margin; overages are a fairness mechanism, not a profit center.

**Business overage at $0.20/min** is the sweet spot. It's lower than Solo (they're paying more base) but still generates margin. A Business customer who uses 700 minutes pays $297 + $40 overage = $337. That's 13% above plan, which feels fair.

---

## 2. PACKAGING LOGIC

### What Separates the Tiers

**Solo → Business upgrade trigger:** "I need more than 10 follow-ups" or "I need no-show recovery" or "I need more than 100 minutes."

**Business → Scale upgrade trigger:** "I need more than 500 minutes" or "I need API access" or "I have multiple locations" or "I need advanced analytics."

**Scale → Enterprise trigger:** "I need white-label" or "I need SSO" or "I need a dedicated manager" or "I need custom compliance."

### Add-Ons (Available on Any Tier)

| Add-On | Price | Notes |
|--------|-------|-------|
| Premium voices | $29/mo | Access to extended voice library |
| HIPAA compliance + BAA | $99/mo | Required for healthcare. Real BAA, not a checkbox. |
| Additional phone number | $15/mo each | Beyond plan included |
| Additional AI agent | $49/mo each | Beyond plan included |
| Onboarding call | $149 one-time | 30-min setup call with a human. Included free on Scale+. |
| Custom voice creation | $499 one-time + $49/mo | Professional voice clone for brand voice |

---

## 3. WHAT SHOULD NEVER BE UNLIMITED

| Resource | Why Not Unlimited |
|----------|-------------------|
| Voice minutes | Direct COGS. Every minute costs $0.12-0.17 across the provider stack. Unlimited minutes on a $297 plan would attract heavy users who destroy margin. |
| AI agents | Each agent has configuration overhead and potential for misuse. |
| Phone numbers | Each number has a monthly carrier cost ($1-3/mo). |
| SMS volume | SMS costs $0.01-0.02 per segment. High-volume SMS campaigns could cost $50-200/month per customer in COGS. Consider soft limits: 500 SMS on Business, 2,000 on Scale. |
| Outbound call minutes | Outbound costs more than inbound (Recall Touch initiates). Should count against the same minute pool or have a separate (smaller) allocation. |
| Storage for call recordings | Audio files at ~1MB/min × 500 min = 500MB/month per Business customer. Not expensive but not zero. Retain for 90 days by default; extended retention as a paid feature. |

### What CAN Be Unlimited (at Appropriate Tiers)

| Resource | Tier | Why |
|----------|------|-----|
| Follow-up sequences | Business+ | The workflow engine cost is compute, not per-message (SMS/voice costs are already metered). Unlimited sequences drive the behavior that makes the product sticky. |
| Contacts/leads | All tiers | Storage cost is negligible. More contacts = more value = more retention. |
| Team seats | Scale+ | Seats don't consume COGS. More users = more embedded = lower churn. |
| Transcripts | All tiers | Already generated as part of the call. No incremental cost to show them. |
| Calendar integrations | All tiers | API cost is negligible. Integrations increase stickiness. |

---

## 4. WHAT SHOULD BE PREMIUM

| Feature | Gate | Why |
|---------|------|-----|
| No-show recovery | Business+ | High-value feature. Solo users don't have appointment-heavy workflows. |
| Reactivation campaigns | Business+ | Requires volume and a real customer base. Not relevant for Solo. |
| Advanced analytics | Scale+ | Benchmarks, trends, team comparison. Costs compute and differentiates Scale. |
| API access | Scale+ | Self-serve API usage attracts developers who build on top of the platform — high-value, high-retention. |
| Native CRM sync | Scale+ | Real two-way CRM integration is expensive to build and maintain. |
| White-label | Enterprise | Custom branding, subdomain, removal of Recall Touch branding. High-touch, high-value. |
| Custom voice | Add-on | Voice cloning requires one-time setup and ongoing TTS costs at premium model rates. |
| HIPAA | Add-on | Real compliance cost (audit, BAA, data handling). Should not be cross-subsidized by non-healthcare customers. |

---

## 5. COST MODEL

### Per-Minute COGS Breakdown

| Component | Cost Estimate | Notes |
|-----------|--------------|-------|
| ElevenLabs TTS | $0.04-0.08/min | Depends on plan. At scale (100K+ min/mo), negotiable to $0.03-0.05 |
| Deepgram STT | $0.01-0.02/min | Nova-2. Volume pricing available. |
| Claude Sonnet (LLM) | $0.02-0.06/min | Highly variable. Short calls with simple booking = low tokens. Complex conversations = higher. Average ~$0.03/min. |
| Vapi orchestration | $0.05/min | Platform fee. May be negotiable at volume. |
| Twilio telephony | $0.01-0.02/min | Inbound. Outbound adds carrier costs. |
| **Total COGS per voice minute** | **$0.13-0.17** | **Average: ~$0.15/min** |

### Per-Customer COGS by Tier

| Tier | Base Price | Avg Minutes Used | Voice COGS | SMS COGS (~$0.01/msg) | Email COGS | Storage | Total COGS | Gross Margin |
|------|-----------|-----------------|------------|----------------------|------------|---------|------------|-------------|
| Solo $49 | $49 | 60 min | $9 | $1 (100 msgs) | ~$0 | ~$0 | ~$10 | ~80% |
| Business $297 | $297 | 400 min | $60 | $5 (500 msgs) | ~$0 | ~$0.50 | ~$66 | ~78% |
| Scale $997 | $997 | 2,200 min | $330 | $20 (2K msgs) | ~$1 | ~$2 | ~$353 | ~65% |

**Blended gross margin target: 70-78%.** This is strong for an AI-native SaaS product (industry average is 50-60%).

### Fixed Infrastructure Costs (Monthly)

| Component | Estimated Cost | Notes |
|-----------|---------------|-------|
| Vercel hosting | $200-500 | Scales with traffic |
| Supabase (database) | $100-500 | Scales with data volume |
| Redis (caching) | $50-100 | |
| Monitoring/observability | $100-200 | |
| Email sending (Resend, etc.) | $50-100 | |
| Domain + CDN | $20-50 | |
| **Total fixed infra** | **$520-1,450/mo** | Negligible once past 20 customers |

### Support Costs

This is the hidden margin killer. Voice AI products generate more support than typical SaaS because:

- AI says something wrong on a call → urgent support ticket
- Call quality issues → troubleshooting ticket
- Integration problems → setup support
- Billing confusion from overages → billing ticket
- "The AI booked wrong time" → escalation

**Estimated support burden:**
- Solo customers: 0.5 tickets/month average
- Business customers: 2 tickets/month average
- Scale customers: 4 tickets/month average (but dedicated success on enterprise)

**At $30-50/ticket fully loaded cost:**
- Solo: $15-25/month support cost → $49 - $10 COGS - $20 support = $19 margin (39%)
- Business: $60-100/month support cost → $297 - $66 COGS - $80 support = $151 margin (51%)
- Scale: $120-200/month support cost → $997 - $353 COGS - $160 support = $484 margin (49%)

**Support-inclusive margins are still healthy** but significantly lower than COGS-only margins. This is why:
1. Self-serve must be excellent (reduce ticket volume)
2. Industry templates must be good (reduce setup issues)
3. The AI must be reliable (reduce "AI said something wrong" tickets)
4. Billing must be transparent (reduce billing confusion)

---

## 6. MARGIN PROTECTION RULES

### Rule 1: Never Offer Unlimited Voice Minutes

Every minute costs money. Unlimited minutes attracts the worst customers (high usage, low willingness to upgrade, high support burden). Even at Scale ($997/mo for 3,000 min), there's a cap.

### Rule 2: Outbound Minutes Count Against the Pool

If outbound follow-up calls are free and unlimited, a single Business customer running aggressive reactivation campaigns could consume 2,000+ minutes of outbound calls, destroying the economics of their $297 plan. All voice communication — inbound and outbound — must count against the minute allocation.

### Rule 3: SMS Has a Soft Limit

Include a reasonable SMS allocation per tier (Solo: 200, Business: 1,000, Scale: 5,000). SMS at $0.01/segment is cheap, but a customer running mass text campaigns could send 10,000+ messages. Soft limit with notification at 80%, then small per-message charge ($0.02/msg) beyond the limit.

### Rule 4: Monitor the 90th Percentile Customer

The customer who uses the most resources on each tier is the margin canary. If the top 10% of Business customers consistently use 450+ of their 500 minutes, the plan minutes are set too high. If they consistently use only 200, the plan is overallocated and could be tightened or the price raised.

### Rule 5: Annual Plans Are the Margin Play

At 17% annual discount: Business drops from $297 to $247/month. But annual commitment eliminates the monthly churn risk. The LTV of an annual customer at $247/month × 12 = $2,964 vs. a monthly customer who churns at month 4 = $1,188. Annual is always more profitable.

### Rule 6: Onboarding Fee for High-Touch Customers

Business and Scale customers who request onboarding calls cost $50-100 per call in human time. Charge $149 for an onboarding call (waived on Scale+). This filters tire-kickers and covers the real cost of human onboarding.

---

## 7. DANGEROUS CUSTOMER PROFILES

| Profile | Why Dangerous | How to Manage |
|---------|--------------|---------------|
| **High-volume call center** on Business plan | Will exceed 500 min in week 1, generate huge overages, create billing disputes | Detect usage pattern, proactively recommend Scale, set up usage alerts |
| **Tech-savvy user trying to build a business on top of your API** on Solo | Treats Recall Touch as infrastructure, high support burden, low willingness to pay more | API only on Scale+. Solo is not a platform tier. |
| **Agency signing up on Business for 10 client accounts** | Uses 1 Business plan to serve multiple businesses, each generating call volume | Multi-business requires Scale or Enterprise. Detect multiple agent configs. |
| **Healthcare practice without HIPAA add-on** | Regulatory risk to Recall Touch if PHI is handled without BAA | Require HIPAA add-on during onboarding if industry = healthcare/dental |
| **"AI enthusiast" with no real business** | Signs up, tests extensively, generates support tickets, never converts to paid | Free trial is 14 days. After that, must pay. No perpetual free tier. |
| **International customer expecting local support** | Different time zones, different telephony regulations, higher support cost | US-first. International is enterprise-only for now. |

---

## 8. HIGHEST-MARGIN PATH

**The highest margin per customer is Business tier, annual, with moderate usage.**

- Business annual: $247/month committed for 12 months = $2,964/year
- Average usage: 350 min/month × $0.15 COGS = $52.50/month COGS
- SMS: ~$5/month
- Support: ~$60/month (lower for annual, more committed customers)
- **Monthly margin: $247 - $52.50 - $5 - $60 = $129.50 (52%)**
- **Annual value: $1,554 margin per customer**

To reach $100K MRR: ~330 Business annual customers (or ~200 Business + 50 Scale mix)
To reach $1M MRR: ~3,300 Business annual customers (or ~1,500 Business + 500 Scale mix)

---

## 9. PATH TO $1M+ MONTHS

### The Math

$1M MRR requires some combination of:

| Scenario | Solo | Business | Scale | Enterprise | Monthly Revenue |
|----------|------|----------|-------|-----------|----------------|
| Balanced | 500 ($49) | 2,000 ($297) | 200 ($997) | 20 ($5,000) | $918,900 |
| Business-heavy | 200 ($49) | 3,000 ($297) | 100 ($997) | 10 ($5,000) | $1,050,500 |
| Scale-heavy | 100 ($49) | 1,500 ($297) | 500 ($997) | 30 ($5,000) | $1,098,400 |

**Realistic path: Business-heavy scenario at ~3,000 Business customers.**

### Timeline (Aggressive but Realistic)

**Month 1-3:** 50 customers. $15K MRR. Proving product-market fit. All founder-sold.

**Month 4-6:** 200 customers. $60K MRR. Outbound sales working. First sales hire. First case studies driving inbound.

**Month 7-12:** 600 customers. $180K MRR. Inbound engine running. 2-3 sales reps. Industry-specific landing pages converting. Agency/reseller channel starting.

**Month 13-18:** 1,500 customers. $450K MRR. Multiple sales reps. Content marketing driving organic. Agency channel contributing 20% of new revenue.

**Month 19-24:** 3,000 customers. $900K-$1M MRR. Full go-to-market machine. Multiple channels. International starting to contribute.

**Key dependency:** This timeline assumes the product works, customers see measurable ROI, and case studies/proof compound over time. If the product doesn't deliver measurable results by month 3, the entire timeline collapses.

### Revenue Mix Target at $1M MRR

- Solo: 5-10% of revenue (high volume, low ARPU, gateway)
- Business: 60-65% of revenue (core revenue engine)
- Scale: 20-25% of revenue (high ARPU, power users)
- Enterprise: 5-10% of revenue (large contracts, agency/white-label)

### Expansion Revenue

- Business → Scale upgrades: driven by minute growth and feature needs
- Add-on revenue (HIPAA, premium voices, custom voice, extra numbers): 10-15% of base revenue
- Overages: 5-10% of base revenue (target low — high overages drive churn)
- Annual upsell: reduces churn, improves LTV by 40-60%

---

*End of Phase 5. Moving to Phase 6.*
