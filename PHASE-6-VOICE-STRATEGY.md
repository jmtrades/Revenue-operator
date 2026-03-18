# PHASE 6: VOICE COST REDUCTION STRATEGY (REVISED)

**Date:** March 17, 2026
**Revision:** v2.0 — Accelerated timeline. $0.13-0.17/min COGS is unsustainable.

---

## 1. STRATEGIC VERDICT

**Current COGS of $0.13-0.17/min is too expensive. We need to reach $0.05-0.06/min within 90 days.**

The original plan called for 12-36 months of gradual optimization. That timeline is wrong. Three changes — swapping TTS provider, using a smaller LLM for routine calls, and dropping Vapi — can cut COGS by 65% in under 3 months. The quality tradeoff is minimal because the alternatives have caught up:

1. **Immediate (Week 1-2):** Swap ElevenLabs → Deepgram Aura-2 TTS for standard voices. Swap Claude Sonnet → Claude Haiku 4.5 for routine calls (booking, FAQ, routing). Keep Sonnet for complex calls only.
2. **Short-term (Month 1-3):** Replace Vapi with Pipecat (open-source) + Twilio Media Streams. Eliminates the $0.05/min orchestration markup entirely.
3. **Medium-term (Month 3-6):** Evaluate Cartesia Sonic as a potential further TTS cost reduction. Explore GPT-4o-mini as an even cheaper LLM for simple interactions.
4. **Long-term (Month 6-12):** ElevenLabs becomes "Premium Voices" add-on only. Standard voices run entirely on Deepgram Aura-2 or Cartesia.

**The goal: $0.05/min blended COGS. That's 3-4x cheaper than any managed voice-agent platform (Vapi $0.15, Bland $0.09, Synthflow $0.12).**

---

## 2. FULL ARCHITECTURE (Current → 90-Day Target)

### Current Architecture (TODAY — $0.15/min)

```
Caller → Twilio ($0.014) → Vapi ($0.05) → Deepgram STT ($0.004) → Claude Sonnet ($0.03) → ElevenLabs TTS ($0.05) → Twilio → Caller
```

**Total COGS: ~$0.148/min**
**Problem: Vapi markup ($0.05) + ElevenLabs ($0.05) + Claude Sonnet ($0.03) = $0.13 of the $0.148 is three components we can optimize.**

### Phase 1 Target (Week 1-2 — $0.095/min)

```
Caller → Twilio ($0.014) → Vapi ($0.05) → Deepgram STT ($0.004) → Claude Haiku ($0.009) → Deepgram Aura-2 TTS ($0.022) → Twilio → Caller
```

**Total COGS: ~$0.099/min (33% reduction)**
**Changes: Swap TTS to Deepgram Aura-2, swap LLM to Claude Haiku 4.5 for routine calls**
**Quality impact: Minimal — Aura-2 is <200ms latency, Haiku handles booking/FAQ fine**

### Phase 2 Target (Month 1-3 — $0.05/min)

```
Caller → Twilio ($0.014) → Pipecat ($0.005 hosting) → Deepgram STT ($0.004) → LLM Router → Deepgram Aura-2 TTS ($0.022) → Twilio → Caller
                                     ↓                                           ↓
                           Recall Touch backend                        Haiku (routine, $0.009)
                           (direct WebSocket control)                  Sonnet (complex, $0.03) [~20% of calls]
```

**Blended LLM cost: ~$0.013/min (80% Haiku + 20% Sonnet)**
**Total COGS: ~$0.058/min (61% reduction from today)**

### Phase 3 Target (Month 3-6 — $0.04/min, stretch goal)

```
Same as Phase 2, but:
- Cartesia Sonic TTS ($0.012/min) replaces Deepgram Aura-2 if quality passes A/B test
- GPT-4o-mini ($0.001/min) for simple FAQ/routing calls (~40% of volume)
```

**Blended COGS: ~$0.038-0.045/min**

---

## 3. STT PLAN

### Current: Deepgram Nova-2

**Keep Deepgram.** It's the best real-time STT available:
- ~$0.01-0.02/min cost
- <300ms latency
- 95%+ accuracy on telephony audio
- Language support for when Recall Touch goes international

**STT is NOT a cost problem.** At $0.01-0.02/min, it's the cheapest component in the stack. Building in-house STT would save $0.01/min and cost millions in R&D. Not worth it. Ever.

**Optimization opportunity:** Deepgram offers endpointing configuration (detecting when the speaker has finished talking). Tuning this for business phone conversations — where there are natural pauses during name spelling, thinking about schedules, etc. — can reduce false turn-taking and improve conversation flow.

### Recommendation: Keep Deepgram indefinitely. Negotiate volume pricing at 500K+ min/month.

---

## 4. TTS PLAN

### Current: ElevenLabs Turbo v2.5

**Best-in-class quality.** The voices are natural, expressive, and pass the "would a caller know this is AI?" test more often than any alternative. But it's the most expensive component at $0.04-0.08/min.

### Short-Term (0-12 months): Keep ElevenLabs Exclusively

No changes. Product quality > cost optimization at this stage. Negotiate volume pricing:
- 100K min/month: ~$0.05/min
- 500K min/month: ~$0.03-0.04/min
- 1M+ min/month: Negotiate custom

### Medium-Term (12-24 months): Introduce Standard Voice Tier

Build an in-house TTS pipeline using open-source models for "standard" voices:

**Candidate models:**
- **Piper TTS** — Fast, lightweight, good quality for English. Can run on CPU. ~$0.002/min at scale.
- **XTTS v2 (Coqui)** — Higher quality, supports cloning, needs GPU. ~$0.005-0.01/min at scale.
- **Parler-TTS** — Controllable TTS with style prompting. Promising but newer.

**Strategy:**
- Offer 6 "standard" voices powered by in-house TTS (included in all plans)
- Offer "premium" voices powered by ElevenLabs (add-on at $29/mo)
- Offer "custom/cloned" voices powered by ElevenLabs (add-on at $49/mo + $499 setup)

**Quality gate:** In-house voices must score within 10% of ElevenLabs on Mean Opinion Score (MOS) tests with real callers before going live. If they don't pass, delay until they do. Deploying inferior voices to save $0.03/min is not worth the conversion and retention damage.

### Long-Term (24-36 months): In-House as Default, ElevenLabs as Premium

If in-house TTS quality reaches parity (which is trending toward inevitable as open-source models improve), the cost savings are significant:

| Volume | ElevenLabs Cost | In-House Cost | Monthly Savings |
|--------|----------------|---------------|-----------------|
| 500K min/mo | $20,000 | $2,500 | $17,500 |
| 1M min/mo | $35,000 | $5,000 | $30,000 |
| 5M min/mo | $150,000 | $25,000 | $125,000 |

At $1M MRR with ~2M voice minutes per month, the TTS savings alone could be $50,000-70,000/month — directly improving gross margin by 5-7%.

---

## 5. CLONING PLAN

### What Voice Cloning Enables

1. **Brand voice:** A dental practice records their actual receptionist's voice, and the AI speaks in that voice. Callers experience continuity.
2. **Founder voice:** A solo consultant uses their own voice for AI calls. Feels personal, not robotic.
3. **Signature voices:** Recall Touch creates proprietary "signature" voices designed specifically for business phone conversations — warm, professional, trustworthy tones not available anywhere else.

### Product Offering

| Feature | Price | Technology | Timeline |
|---------|-------|-----------|----------|
| Standard voices (6) | Included | In-house TTS (later) or ElevenLabs | Launch |
| Premium voices (12+) | $29/mo add-on | ElevenLabs | Launch |
| Custom voice clone | $499 setup + $49/mo | ElevenLabs Professional Voice Cloning | Month 6 |
| Business signature voices | Included (Business+) | In-house (designed for business calls) | Month 18 |

### Trust, Safety, and Consent for Cloning

**Mandatory requirements:**
1. **Voice consent verification.** The person whose voice is cloned must record a consent statement: "I, [name], authorize Recall Touch to create and use a synthetic version of my voice for business phone communication."
2. **Identity verification.** The voice owner must be the account holder or provide written authorization.
3. **Caller disclosure option.** Offer (but don't require) a configurable disclaimer: "This call may be handled by an AI assistant." Some jurisdictions require this; offer it as a toggle.
4. **No impersonation.** Cannot clone a voice without the voice owner's consent. No cloning of public figures, celebrities, or non-consenting third parties.
5. **Revocation.** Voice clones can be deleted at any time by the voice owner.

---

## 6. QUALITY EVALUATION FRAMEWORK

### Voice Quality Metrics

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Mean Opinion Score (MOS) | ≥4.0/5.0 | Human evaluation panel (quarterly) |
| Latency (time to first audio byte) | <500ms | Automated monitoring |
| Word Error Rate (conversation) | <5% | Compare transcript to audio |
| Natural pause handling | No interruptions | Call review, customer feedback |
| Caller satisfaction | ≥4.2/5.0 post-call survey | Optional post-call text survey |
| "Did you know this was AI?" test | <40% identify as AI | Blind test with real callers |

### Quality Gates for In-House TTS Deployment

Before any in-house TTS voice goes live in production:

1. **A/B test with 100 real calls:** Split traffic between ElevenLabs and in-house. Compare caller satisfaction, call completion rates, and booking rates. If in-house degrades any metric by >5%, it does not ship.

2. **Internal review panel:** 5 people rate 20 sample calls on naturalness, warmth, clarity, and professionalism. Average score must be ≥4.0/5.0.

3. **Founder test:** The founder calls the in-house voice and asks: "Would I be comfortable with this voice representing MY business to MY customers?" If the answer is no, it doesn't ship.

---

## 7. COST MODEL (REVISED — Accelerated)

### TODAY: $0.148/min (Per 1M Voice Minutes = $148,000)

| Component | $/min | Per 1M min | % of Total |
|-----------|-------|-----------|-----------|
| Vapi orchestration | $0.050 | $50,000 | 34% |
| ElevenLabs TTS | $0.050 | $50,000 | 34% |
| Claude Sonnet LLM | $0.030 | $30,000 | 20% |
| Deepgram STT | $0.004 | $4,000 | 3% |
| Twilio telephony | $0.014 | $14,000 | 9% |
| **Total** | **$0.148** | **$148,000** | |

### PHASE 1 (Week 1-2): $0.099/min → 33% savings

| Component | $/min | Per 1M min | Change |
|-----------|-------|-----------|--------|
| Vapi orchestration | $0.050 | $50,000 | unchanged |
| Deepgram Aura-2 TTS | $0.022 | $22,000 | **-$28K** (was ElevenLabs) |
| Claude Haiku 4.5 (routine) | $0.009 | $9,000 | **-$21K** (was Sonnet) |
| Deepgram STT | $0.004 | $4,000 | unchanged |
| Twilio telephony | $0.014 | $14,000 | unchanged |
| **Total** | **$0.099** | **$99,000** | **-$49K/mo** |

### PHASE 2 (Month 1-3): $0.058/min → 61% savings

| Component | $/min | Per 1M min | Change |
|-----------|-------|-----------|--------|
| Pipecat (self-hosted) | $0.005 | $5,000 | **-$45K** (replaces Vapi) |
| Deepgram Aura-2 TTS | $0.022 | $22,000 | unchanged |
| LLM Router (80% Haiku, 20% Sonnet) | $0.013 | $13,000 | +$4K (Sonnet for complex) |
| Deepgram STT | $0.004 | $4,000 | unchanged |
| Twilio telephony | $0.014 | $14,000 | unchanged |
| **Total** | **$0.058** | **$58,000** | **-$90K/mo** |

### PHASE 3 (Month 3-6): $0.042/min → 72% savings (stretch)

| Component | $/min | Per 1M min | Change |
|-----------|-------|-----------|--------|
| Pipecat (self-hosted) | $0.005 | $5,000 | unchanged |
| Cartesia Sonic TTS | $0.012 | $12,000 | **-$10K** (if quality passes) |
| LLM Router (40% GPT-4o-mini, 40% Haiku, 20% Sonnet) | $0.008 | $8,000 | **-$5K** |
| Deepgram STT | $0.004 | $4,000 | unchanged |
| Twilio telephony | $0.014 | $14,000 | unchanged |
| **Total** | **$0.043** | **$43,000** | **-$105K/mo** |

### MARGIN IMPACT AT SCALE

| Scenario | COGS/min | Business plan (500 min) COGS | Gross margin |
|----------|----------|------------------------------|-------------|
| Today | $0.148 | $74/mo | 75.1% |
| Phase 1 | $0.099 | $49.50/mo | 83.3% |
| Phase 2 | $0.058 | $29/mo | 90.2% |
| Phase 3 | $0.043 | $21.50/mo | 92.8% |

At $1M MRR (~2.5M min/mo), Phase 2 alone saves **$225K/month** vs. today. That's the difference between 75% and 90% gross margin.

---

## 8. PRODUCTIZATION INSIDE RECALL TOUCH

### How Voice Appears in the Product

**During onboarding:** "Choose a voice for your AI." Six voice cards, each with a play button. The user hears a sample greeting in their selected voice. Default selection based on industry (dental gets a warm female voice, roofing gets a confident male voice — configurable).

**In Settings → Voice:** Full voice selection, preview with custom greeting, advanced tuning (speed, warmth), premium/custom voice upgrade path.

**On calls:** The voice IS the product. The quality of the voice directly determines whether callers trust the AI, stay on the line, and book appointments. Every investment in voice quality is an investment in conversion rate and customer retention.

**Business-Optimized Voice Presets:**

Rather than generic voice names, create presets designed for business contexts:

| Preset | Personality | Best For |
|--------|------------|----------|
| "Professional" | Clear, confident, moderate pace | Legal, financial, consulting |
| "Warm" | Friendly, empathetic, slightly slower | Healthcare, dental, therapy |
| "Energetic" | Upbeat, quick, enthusiastic | Sales, real estate, coaching |
| "Calm" | Soothing, patient, reassuring | Medical, emergency services |
| "Efficient" | Direct, clear, fast-paced | High-volume, scheduling-focused |
| "Approachable" | Casual, conversational, relaxed | Home services, general business |

---

## 9. TRUST AND SAFETY

### Compliance Requirements

1. **TCPA compliance:** All outbound calls and texts must comply with Telephone Consumer Protection Act. Opt-in for marketing messages. Opt-out honored immediately.
2. **Call recording disclosure:** "This call may be recorded for quality purposes" played at call start where required by state law. Configurable per jurisdiction.
3. **AI disclosure:** Configurable per customer preference and jurisdiction. Some states (California) are moving toward requiring AI disclosure in phone calls.
4. **Data retention:** Call recordings retained per plan settings (90 days default). Customer can configure shorter retention. HIPAA customers have specific retention requirements.

### Voice-Specific Safety

1. **No voice cloning without consent** (covered in Section 5).
2. **No deepfake use cases.** Recall Touch voices cannot be used to impersonate individuals or create fraudulent communications.
3. **Abuse monitoring.** Flag accounts that generate high volumes of outbound calls to unusual numbers or that receive high complaint rates.
4. **Quality monitoring.** Random sample of calls reviewed for: AI hallucination, inappropriate responses, failed conversation handling, caller frustration signals.

---

## 10. BUILD ORDER (ACCELERATED)

### Sprint 1 (Week 1-2): TTS + LLM Swap → $0.099/min

- [ ] Add Deepgram Aura-2 TTS provider to voice abstraction layer
- [ ] A/B test Deepgram Aura-2 vs ElevenLabs on 50 internal calls — check MOS ≥ 3.8
- [ ] If passes: swap default TTS to Deepgram Aura-2 for standard voices
- [ ] Keep ElevenLabs as "Premium Voices" add-on ($29/mo)
- [ ] Add LLM routing: classify calls as simple (booking, FAQ, hours) vs complex (complaints, negotiation)
- [ ] Route simple calls (est. 80%) → Claude Haiku 4.5 ($1/$5 per M tokens)
- [ ] Route complex calls (est. 20%) → Claude Sonnet ($3/$15 per M tokens)
- [ ] Update Vapi assistant config to support model switching per call type
- [ ] **Savings: ~$0.05/min immediately**

### Sprint 2 (Month 1-3): Drop Vapi → $0.058/min

- [ ] Set up Pipecat framework (Python, open-source, MIT license)
- [ ] Integrate Pipecat with Twilio Media Streams (WebSocket bridge)
- [ ] Wire Deepgram STT streaming into Pipecat pipeline
- [ ] Wire Deepgram Aura-2 TTS streaming into Pipecat pipeline
- [ ] Wire Claude API (Haiku + Sonnet routing) into Pipecat pipeline
- [ ] Implement function calling: book_appointment, capture_lead, send_sms, transfer_call
- [ ] Shadow-run Pipecat alongside Vapi for 2 weeks (same calls, compare quality)
- [ ] Quality gate: latency ≤ 800ms, MOS ≥ 3.8, call completion rate within 2%
- [ ] If passes: migrate 100% traffic off Vapi. Cancel Vapi subscription.
- [ ] **Savings: ~$0.05/min on top of Sprint 1**

### Sprint 3 (Month 3-6): Further Optimization → $0.043/min (stretch)

- [ ] Evaluate Cartesia Sonic 3 TTS — 40ms TTFB, ~$0.012/min
- [ ] A/B test Cartesia vs Deepgram Aura-2 on 100 real calls
- [ ] Evaluate GPT-4o-mini ($0.15/$0.60 per M tokens) for simple FAQ/routing
- [ ] If Cartesia passes quality gate: switch standard voices to Cartesia
- [ ] If GPT-4o-mini passes quality gate: route 40% simplest calls to it
- [ ] Launch voice cloning as premium feature (ElevenLabs Professional Cloning, $499 + $49/mo)

### Sprint 4 (Month 6-12): Optimize + Scale

- [ ] Evaluate self-hosted open-source TTS (Orpheus, Piper, XTTS v2) for even lower cost
- [ ] GPU cost at scale: H100 at $0.024/min, A100 at $0.032/min, CPU-based at $0.005/min
- [ ] Negotiate volume pricing with Deepgram for STT + TTS bundle
- [ ] Implement real-time cost dashboard per workspace (actual COGS visibility)
- [ ] Fine-tune a small LLM specifically for appointment booking conversations

---

## 11. FINAL RECOMMENDATION (REVISED)

**$0.15/min COGS is not viable.** Waiting 12 months to optimize is leaving money on the table — and makes unit economics fragile at every pricing tier.

**Week 1-2: Swap TTS and LLM.** Deepgram Aura-2 delivers sub-200ms latency at $0.022/min vs ElevenLabs at $0.05/min. Claude Haiku 4.5 handles 80% of calls (booking, FAQ, routing) at 1/3 the cost of Sonnet. These are drop-in changes that don't require new infrastructure. Combined savings: ~$0.05/min.

**Month 1-3: Drop Vapi.** Pipecat is open-source, battle-tested, and has native Twilio Media Streams integration. The $0.05/min Vapi markup is the single biggest line item, and it's pure middleware cost. Pipecat + a $50/mo server replaces it entirely. Engineering cost: ~2-3 weeks of focused work.

**Never build in-house STT.** Deepgram at $0.004/min is essentially free. Not worth touching.

**ElevenLabs becomes a premium upsell, not the default.** Standard voices run on Deepgram Aura-2 (or Cartesia Sonic after evaluation). ElevenLabs is reserved for premium/cloned voices at $29/mo add-on. This preserves the quality option for customers who want it while dramatically reducing default COGS.

**Quality gates remain non-negotiable.** Every provider swap must pass: MOS ≥ 3.8, latency ≤ 800ms, call completion rate within 2% of current. If a cheaper option degrades quality, we don't ship it.

**Target state: $0.058/min within 90 days.** That's 61% cheaper than today and makes every pricing tier highly profitable — even Solo at $49/mo has 88% gross margin on included minutes.

### Provider Comparison (2026 pricing, verified)

| Provider | Type | Cost | Latency | Quality |
|----------|------|------|---------|---------|
| ElevenLabs Turbo v2.5 | TTS | $0.050/min | ~75ms | Excellent (MOS 4.5+) |
| Deepgram Aura-2 | TTS | $0.022/min | ~90ms | Very Good (MOS 4.0+) |
| Cartesia Sonic 3 | TTS | $0.012/min | ~40ms | Good-Very Good (MOS 3.8+) |
| Claude Sonnet 4 | LLM | $0.030/min | ~200ms | Excellent |
| Claude Haiku 4.5 | LLM | $0.009/min | ~100ms | Very Good (fine for routine) |
| GPT-4o-mini | LLM | $0.001/min | ~150ms | Good (FAQ/routing only) |
| Deepgram Nova-2 | STT | $0.004/min | <300ms | Excellent |
| Vapi | Orchestration | $0.050/min | N/A | N/A (pure markup) |
| Pipecat (self-hosted) | Orchestration | $0.005/min | N/A | N/A (open source) |

---

*End of Phase 6 v2. Accelerated timeline: 90 days to $0.058/min.*
