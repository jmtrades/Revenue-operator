# RECALL TOUCH — FINAL STRATEGY MEMO

**Date:** March 17, 2026
**Classification:** Founder-level strategic document
**Status:** Decision-ready

---

## THE SITUATION

Recall Touch is a technically strong AI voice and follow-up platform wrapped in a marketing shell that will collapse under scrutiny. The codebase contains real engineering — multi-provider voice AI, lead management, workflow automation, Stripe billing, a functional onboarding wizard, and phone provisioning across 29 countries. The technology stack (ElevenLabs + Deepgram + Claude Sonnet + Vapi) is best-in-class.

But the company has zero external footprint. No reviews. No press. No verifiable customers. And the marketing site is built on fabricated testimonials, fake customer counts ("500+"), unsubstantiated revenue claims ("$2.1M+ recovered"), and misrepresented compliance badges (SOC 2 claimed but "in progress"). This is not a branding problem. It is an existential credibility risk that must be resolved before any growth effort begins.

The product is also trapped in the wrong competitive frame. "AI phone answering" is a commoditized category with 30+ competitors at $29-79/month. Recall Touch charges $297+/month while looking identical to cheaper alternatives. The real differentiator — automated follow-up, no-show recovery, reactivation, and revenue attribution — is buried behind the commodity message.

---

## THE STRATEGIC DECISION

### Category

Recall Touch is the **AI Revenue Closer** — the AI that closes every open revenue loop in a business: the missed call, the unsent follow-up, the unbooked appointment, the no-show, the unchased quote, the cold lead. Other tools answer phones. Recall Touch finishes the job.

### Entry Wedge

Single-location service businesses that depend on inbound calls: dental practices, HVAC/plumbing companies, legal intake offices, med spas, and roofing contractors. These businesses know the dollar value of a missed call, already pay $200-500/month for answering services, and can prove ROI within 7 days.

**Best single starting ICP: Dental practices.** Highest lifetime patient value ($3,000+), lowest support burden, largest addressable market (200K US practices), strongest case study narrative.

### Pricing

| Tier | Price | Minutes | Core |
|------|-------|---------|------|
| Solo | $49/mo | 100 | Answering + basic follow-up + booking |
| Business | $297/mo | 500 | Full follow-up engine + recovery + reactivation |
| Scale | $997/mo | 3,000 | Advanced analytics + API + multi-location |
| Enterprise | Custom | Custom | White-label + SSO + dedicated manager |

Business tier is the hero. One recovered dental patient ($3,000+) covers the entire year of service. The ROI argument is unassailable.

### Product Shape

One platform. Three modes (Business, Solo, Sales). Same engine underneath — contact timeline, follow-up workflows, communication channels, analytics, voice. Modes change what's visible, what's pre-configured, and what language is used.

**Business Mode at launch.** Solo Mode soft-launches at $49. Sales Mode is a waitlist/future product.

---

## THE 5 THINGS THAT MUST HAPPEN FIRST

In order of urgency:

1. **Remove all fabricated social proof.** Every fake testimonial, every "500+" claim, every "$2.1M" claim, every unearned badge. Today. Not next week.

2. **Fix pricing alignment.** The website and codebase must agree. Final tiers: Solo $49, Business $297, Scale $997, Enterprise Custom. Update both.

3. **Simplify onboarding to 3 steps.** Industry → Connect phone → You're live. AI auto-configures with industry defaults. The user hears their AI handle a call within 5 minutes of signing up.

4. **Build the revenue impact dashboard card.** "This month: X calls answered, Y leads captured, Z appointments booked, estimated value: $W." This single UI element is the most important retention feature in the product.

5. **Get 10 real customers.** Offer 30 days free to 10-20 hand-picked service businesses. Document everything. Create real case studies. Get real G2 reviews.

---

## THE COMPETITIVE POSITION

Recall Touch does not compete on call answering (commoditized). It competes on what happens after the call:

| Capability | AI Receptionists ($29-79/mo) | Recall Touch ($297/mo) |
|------------|------------------------------|------------------------|
| Answer calls | ✓ | ✓ |
| Capture leads | ✓ | ✓ |
| Automated follow-up sequence | ✗ | ✓ |
| Missed call recovery (SMS + callback) | ✗ | ✓ |
| Appointment booking from call | Basic | Real-time calendar sync |
| Appointment reminders | ✗ | ✓ (SMS sequence) |
| No-show recovery | ✗ | ✓ (text + call + rebook) |
| Quote chasing | ✗ | ✓ |
| Lead reactivation (30/60/90 day) | ✗ | ✓ |
| Revenue attribution analytics | ✗ | ✓ |

**The price is 4-10x higher because the value delivery is 10x broader.** An AI receptionist answers the phone. Recall Touch closes the revenue loop.

---

## THE FINANCIAL MODEL

### Unit Economics (Business Tier)

- Revenue: $297/month
- Voice COGS (400 min avg × $0.15): $60
- SMS COGS: $5
- Support: $60-80
- **Gross margin: $152-172 (51-58%)**

### Path to $1M MRR

~3,000 Business-equivalent customers. Realistic timeline: 18-24 months with strong execution.

**Month 3:** 50 customers → $15K MRR
**Month 6:** 200 customers → $60K MRR
**Month 12:** 600 customers → $180K MRR
**Month 18:** 1,500 customers → $450K MRR
**Month 24:** 3,000 customers → $900K-1M MRR

### Margin Protection

Voice minutes must never be unlimited. Outbound counts against the minute pool. SMS has soft limits. Annual plans are pushed aggressively (17% discount, 40-60% higher LTV). Support burden is managed through excellent self-serve, good defaults, and reliable AI.

---

## THE VOICE STRATEGY

Keep the current stack (ElevenLabs + Deepgram + Claude + Vapi) for the first 12 months. Quality > cost optimization when you have zero customers.

At $180K+ MRR: Replace Vapi with in-house call orchestration (saves $0.05/min, ~$45K/month at 1M minutes).

At $500K+ MRR: Evaluate in-house TTS for standard voices using open-source models. Keep ElevenLabs for premium/custom voices. Only deploy if quality passes A/B testing against ElevenLabs.

Never build in-house STT. Deepgram is cheap and excellent.

---

## WHAT TO CUT

- 40 directories of "intelligence" engines — over-engineered before PMF
- Governance, compliance, delivery assurance systems — enterprise features for later
- Pipeline view — Sales Mode feature, delay
- White-label — Enterprise feature, delay
- Multi-language marketing site — US-first
- "Docs" in main navigation — moved to footer
- "Anyone with a phone" targeting — not a segment
- Dashboard engineering vocabulary — replaced with business language

---

## THE SINGLE MOST IMPORTANT THING

**Trust.** Not features. Not pricing. Not design. Not voice quality. Trust.

Recall Touch has a 1/10 trust score today. Everything built on top of a foundation of fabricated proof will eventually collapse. Fix the trust first. Get real customers. Earn real proof. Build real credibility. Then scale.

The product is strong enough to earn trust through performance. Let it.
