# RECALL TOUCH — IN-HOUSE VOICE STACK: STRATEGY, ARCHITECTURE & IMPLEMENTATION PLAN

**Classification:** Internal Strategic Document — Founder Eyes Only
**Date:** March 2026
**Prepared for:** Junior, Founder — Recall Touch
**Version:** 1.0

---

## SECTION 1 — BLUNT STRATEGIC VERDICT

### Should Recall Touch Build Its Own Voice Stack?

**Yes. Unequivocally yes.** But with ruthless sequencing. Not all at once.

### Why

Voice is the highest-margin, highest-lock-in feature in phone-based AI. Every competitor in this space — Bland AI, Synthflow, Vapi, Retell, Air AI — is reselling the same handful of voice providers (ElevenLabs, PlayHT, Deepgram, OpenAI Whisper). They are all thin orchestration layers on top of shared commodity infrastructure. That means:

1. **They all sound the same.** A Bland AI call and a Synthflow call use the same ElevenLabs voices. Zero differentiation.
2. **Their margins are structurally capped.** They pay $0.04–0.08/min just for TTS, then add STT, LLM, and telephony. At $0.09–0.14/min total pricing, their gross margins are 30–45%. Recall Touch paying these same vendors while charging $49–$997/mo subscriptions means voice usage directly eats into margin at scale.
3. **They have no control over quality, uptime, or roadmap.** When ElevenLabs changes their API, pricing, or voice quality — every reseller eats it simultaneously.
4. **Open-source TTS has crossed the production threshold.** Orpheus TTS (March 2025) achieves ~130ms TTFB on optimized infra, supports emotion tags, and runs 25+ concurrent streams per H100 GPU. This was not possible 12 months ago.

### The Real Upside

- **Cost per voice-minute drops from ~$0.08–0.12 (external) to ~$0.01–0.03 (self-hosted)** at moderate scale (10K+ minutes/month)
- **Gross margin on voice features goes from 30–45% to 75–90%**
- **Recall Touch becomes the only player in the SMB phone AI space with genuinely proprietary voices** — every competitor is using the same ElevenLabs/PlayHT toolkit
- **Custom voice cloning becomes a premium upsell** ($997+ tier) with near-zero marginal cost instead of a margin-destroying pass-through
- **Full control over latency, quality, uptime, and feature roadmap** — no dependency on vendor decisions

### The Real Risk

- **Engineering distraction.** Building a voice stack takes 3–6 months of focused work. If it derails product shipping, it's a net negative.
- **Quality gap during transition.** Self-hosted TTS will sound slightly worse than ElevenLabs for the first 2–4 months. This is acceptable for business calls (phone audio is already compressed to 8kHz mu-law) but must be managed.
- **GPU infrastructure costs upfront.** Need $200–500/month in GPU compute before hitting the break-even point where it's cheaper than external APIs.
- **Maintenance burden.** Models need updating, inference servers need monitoring, edge cases need handling.

### What "Winning" Looks Like

Recall Touch owns a voice system that:
- Sounds indistinguishable from a human receptionist on phone calls (not podcast-quality — phone-quality)
- Responds in under 300ms end-to-end (user stops talking → assistant starts speaking)
- Costs $0.01–0.02/min at scale (vs $0.08–0.12 external)
- Supports 40+ preset voices optimized for service businesses
- Offers voice cloning as a premium feature with zero per-use cost
- Runs entirely on infrastructure Recall Touch controls

### What "Failure" Looks Like

- Spending 6+ months building something that sounds noticeably worse than ElevenLabs
- Shipping a voice system with >500ms latency that makes calls feel robotic
- Running GPU infrastructure that costs more than just paying ElevenLabs
- Breaking existing call flows during migration

### Real Moat or Fake Moat?

**Real moat, but only if executed well.** The moat is not "we have a TTS model" — anyone can run Orpheus. The moat is:
1. **Voices trained and optimized specifically for service-business phone calls** — not generic TTS
2. **End-to-end latency optimization** across the full STT→LLM→TTS pipeline — not just model speed
3. **Industry-specific voice presets** (HVAC receptionist, dental coordinator, legal intake) that no generic platform offers
4. **Voice cloning as a product feature** with proper consent, versioning, and business workflow integration
5. **Cost structure** that allows generous voice minutes in subscription tiers while maintaining margin

### Where In-House Can Beat External Providers

- **Phone-call realism** — optimized for 8kHz telephony, not studio quality
- **Business-specific vocabulary** — "HVAC," "root canal," "deductible" pronounced correctly
- **Latency** — direct inference with no API round-trip overhead
- **Cost at scale** — GPU amortization beats per-minute API fees above ~10K minutes/month
- **Consistency** — same voice, same quality, no vendor changes breaking things
- **Customization** — emotion tags, pacing adjustments, industry presets baked in

### Where It Likely Won't Beat Them Initially

- **Raw audio quality in ideal conditions** — ElevenLabs Turbo v2.5 at 48kHz sounds better than Orpheus at 24kHz in a quiet room on speakers. But on a phone call through Twilio's mu-law codec at 8kHz, the difference is negligible.
- **Voice cloning from tiny samples** — ElevenLabs can clone from 30 seconds. Open-source needs 2–5 minutes for comparable quality.
- **Multilingual quality** — English is excellent in Orpheus. Spanish, French, German lag slightly behind.

---

## SECTION 2 — "BETTER THAN COMPETITORS" DEFINITION

### The Wrong Definition of "Better"

"Better" does NOT mean:
- Higher MOS score on a synthetic benchmark
- Sounds better in a YouTube demo with studio headphones
- More voices in a catalog
- Supports more languages

### The Right Definition of "Better" for Recall Touch

"Better" means **higher conversion rate on business phone calls at lower cost per minute.**

Specifically:

| Dimension | Weight | What Matters |
|-----------|--------|-------------|
| **Phone-call realism** | 25% | Sounds human through Twilio's 8kHz mu-law codec, not just in browser demos |
| **End-to-end latency** | 20% | Total time from user-stops-talking to assistant-starts-speaking < 300ms |
| **Business conversion** | 15% | Callers book appointments, leave info, don't hang up prematurely |
| **Cost per minute** | 15% | Blended cost including GPU, telephony, STT, TTS < $0.03 at scale |
| **Controllability** | 10% | Emotion, pacing, pronunciation customizable per industry |
| **Voice consistency** | 5% | Same voice sounds the same across 1,000 calls — no drift |
| **Data ownership** | 5% | All call recordings, transcripts, and voice models owned by Recall Touch |
| **Brand control** | 5% | Custom voices that can't be replicated by competitors |

### Comparison Matrix

| Feature | ElevenLabs | Bland AI | Vapi | Recall Touch (Target) |
|---------|-----------|----------|------|----------------------|
| TTS quality (phone) | 8/10 | 7/10 (resold) | 7/10 (resold) | 7.5/10 → 8.5/10 |
| End-to-end latency | ~400ms | ~500ms | ~350ms | **<300ms** |
| Cost/min (blended) | $0.04–0.08 | $0.09–0.14 | $0.15–0.33 | **$0.01–0.03** |
| Voice cloning | Yes ($) | Via EL ($) | Via EL ($) | **Yes (included)** |
| Emotion control | Limited | None | None | **Native (Orpheus tags)** |
| Industry presets | None | None | None | **10+ presets** |
| Custom pronunciation | No | No | No | **Yes** |
| Data ownership | No | No | No | **Full** |
| Margin on voice | 0% (cost) | 30–45% | 30–45% | **75–90%** |

---

## SECTION 3 — FULL VOICE STACK ARCHITECTURE

### Layer-by-Layer Design

```
┌─────────────────────────────────────────────────────────┐
│                    PHONE / BROWSER                       │
│  Twilio Media Streams ←→ WebSocket ←→ Browser WebRTC    │
└─────────────────────┬───────────────────┬───────────────┘
                      │                   │
┌─────────────────────▼───────────────────▼───────────────┐
│              AUDIO TRANSPORT LAYER                       │
│  mu-law ↔ PCM conversion | Resampling (8k↔16k↔24k)     │
│  Jitter buffer | Echo cancellation reference             │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              VOICE ACTIVITY DETECTION (VAD)              │
│  Silero VAD (16kHz) | Speech probability | Timestamps    │
│  Endpointing: 0.6s silence = end-of-turn               │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              SPEECH-TO-TEXT (STT)                        │
│  Faster-Whisper (CTranslate2) | Model: base or small    │
│  Streaming chunked (500ms buffers) | VAD-filtered        │
│  Language detection | Confidence scoring                 │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              TURN-TAKING / ORCHESTRATION                 │
│  State machine: LISTENING → PROCESSING → SPEAKING        │
│  Barge-in detection | Backchannel insertion               │
│  Partial transcript buffering | Silence timer             │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              LLM / DIALOGUE LAYER                        │
│  Claude/GPT-4o via API | System prompt + transcript      │
│  Tool calls: book_appointment, capture_lead, send_sms    │
│  Response streaming (token-by-token for faster TTFB)     │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              TEXT-TO-SPEECH (TTS)                        │
│  Orpheus TTS 3B (primary) → Fish Speech (fallback)      │
│  SNAC codec for streaming | Emotion tags                 │
│  24kHz output → resample to 8kHz for Twilio              │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              POST-PROCESSING                             │
│  Normalization | Noise gate | Comfort noise injection    │
│  Telephony EQ (boost 300–3400Hz band)                    │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              OBSERVABILITY & LOGGING                     │
│  Per-call metrics: TTFB, STT confidence, duration        │
│  Transcript storage | Recording (if consented)           │
│  Error rates | Abandonment tracking                      │
└─────────────────────────────────────────────────────────┘
```

### Build Priority

**Build in-house first (Month 1–2):**
- TTS inference (Orpheus) — this is where the margin lives
- VAD (Silero — drop-in, no training needed)
- Audio transport (mu-law ↔ PCM, already built)
- Twilio WebSocket integration (already built)

**Build in-house second (Month 2–3):**
- STT inference (Faster-Whisper — drop-in, no training needed)
- Turn-taking state machine (already built, needs refinement)
- Post-processing pipeline

**Build later (Month 4–6):**
- Voice cloning pipeline
- Custom pronunciation layer
- Training/fine-tuning pipeline

**Do NOT build too early:**
- Custom STT model training (Whisper base is good enough for 6+ months)
- Custom LLM (use Claude/GPT-4o — not worth building)
- Browser WebRTC (Twilio handles this via their SDK)

---

## SECTION 4 — STT STRATEGY

### Model Approach

**Primary:** Faster-Whisper (CTranslate2 backend) — `base` model for phone calls, `small` model for premium tiers.

**Why Faster-Whisper:**
- 4x faster than OpenAI's Whisper implementation, same accuracy
- Runs on CPU (int8 quantization) for cost efficiency — no GPU required for STT
- Built-in VAD filtering reduces unnecessary transcription
- Beam search with configurable width for accuracy/speed tradeoff

### Streaming vs Chunked

**Chunked with smart buffering.** Pure streaming STT adds complexity without meaningful latency improvement for phone calls. The approach:

1. Silero VAD runs continuously on incoming audio
2. Audio accumulates in 500ms buffers
3. When VAD detects speech → buffer is transcribed
4. When VAD detects 600ms silence → end-of-turn, final transcription sent
5. Partial transcripts emitted every 500ms during speech for UI display

This gives effective latency of ~300–500ms from speech-end to transcript-available, which is within budget since LLM inference adds 200–500ms anyway.

### Latency Targets

| Metric | Target | Acceptable | Reject |
|--------|--------|-----------|--------|
| Speech-to-transcript | <500ms | <800ms | >1000ms |
| VAD endpointing | <600ms | <800ms | >1200ms |
| Transcription throughput | >10x realtime | >5x realtime | <3x realtime |

### Accuracy Targets

- **Word Error Rate (WER):** <15% on phone audio (8kHz, background noise). This is achievable with Whisper base.
- **Key entity accuracy:** >95% for names, phone numbers, dates, times. These are what matter for booking.
- **Business vocabulary:** "HVAC," "root canal," "deductible," common business names must transcribe correctly.

### Handling Telephony Audio

Phone audio is challenging: 8kHz sample rate, mu-law compression, background noise, cell phone artifacts. Strategy:

1. **Upsample to 16kHz** before feeding Whisper (it was trained on 16kHz)
2. **Enable Whisper's built-in VAD filter** to skip silence segments
3. **Use language hint** ("en" for US calls) to avoid wasting compute on language detection
4. **Set beam_size=5, best_of=3** for accuracy without excessive latency

### Cost and Hardware

Faster-Whisper `base` on CPU (int8): processes ~7–10x realtime. Meaning 1 CPU core handles 7–10 concurrent call streams. At $0.02/hr per CPU core on cloud providers, STT cost is approximately **$0.001/min** — essentially free compared to TTS.

---

## SECTION 5 — TTS STRATEGY

### Model Approach

**Primary: Orpheus TTS 3B** — The best open-source TTS as of early 2026.

Key properties:
- Built on Llama 3B architecture — benefits from LLM optimization tooling (vLLM, TensorRT-LLM)
- SNAC codec for token-to-audio conversion — enables true streaming
- Native emotion tags: `<happy>`, `<sad>`, `<empathetic>`, `<laugh>`, `<sigh>`
- 8 built-in speaker profiles, expandable via fine-tuning
- ~130ms TTFB on H100, ~200ms on A100 with optimized inference
- 25+ concurrent streams per H100 GPU

**Fallback: Fish Speech v1.5** for multilingual calls and voice cloning reference.

**Edge/High-Concurrency: Kokoro 82M** for scenarios where GPU is saturated — runs on CPU.

### Real-Time Streaming Architecture

```
Text input → Orpheus tokenizer → vLLM/TensorRT inference (streaming) →
  → Token buffer (7 tokens = 1 SNAC frame) →
  → SNAC decoder (GPU) →
  → Float32 PCM (24kHz) →
  → Resample to 8kHz →
  → PCM to mu-law →
  → Base64 encode →
  → Twilio Media Stream WebSocket
```

Each SNAC frame produces ~10ms of audio. With 7 tokens per frame and ~83 tokens/second generation rate, audio streams in near-realtime with 100–200ms initial buffering.

### Latency Targets

| Metric | Target | Acceptable | Reject |
|--------|--------|-----------|--------|
| TTS TTFB (text→first audio byte) | <200ms | <350ms | >500ms |
| Full sentence generation | <2s for 20 words | <3s | >4s |
| Streaming chunk interval | 40ms | 60ms | >100ms |

### Making It Sound Human

The difference between "good TTS" and "sounds like a real person on the phone" comes down to:

1. **Sentence chunking.** Don't synthesize entire paragraphs. Break at natural clause boundaries (commas, periods, conjunctions). Synthesize each chunk separately with appropriate prosody continuation.

2. **Emotion-aware synthesis.** Use Orpheus emotion tags based on content: apology → `<empathetic>`, good news → `<happy>`, scheduling → neutral, urgency → no tag (professional).

3. **Speed variation.** Real people speed up on filler phrases ("let me check that for you") and slow down on important information (dates, times, prices). Implement per-clause speed modulation.

4. **Pause insertion.** Insert 200–400ms pauses after questions. Insert 100ms pauses at commas. Insert 50ms micro-pauses between clauses. These make speech feel natural.

5. **Telephony EQ.** Phone speakers have limited frequency response. Boost 1–3kHz for clarity. Roll off below 300Hz and above 3400Hz. This actually makes TTS sound *more* natural on phone because it matches what the listener expects.

6. **Comfort noise.** Pure digital silence between phrases sounds uncanny on phone calls. Inject very low-level pink noise (~-50dB) during pauses to simulate room tone.

### Inference Cost

Orpheus 3B on A100 80GB (FP16): ~25 concurrent realtime streams.
A100 80GB cloud cost: ~$1.50/hr (VastAI/TensorDock pricing).
Cost per concurrent stream: $0.06/hr = **$0.001/min per stream**.
With typical 30% utilization (calls aren't 100% TTS), effective cost: **~$0.003/min**.

Compare to ElevenLabs: **$0.04–0.08/min**. That's a 13–27x cost reduction.

---

## SECTION 6 — VOICE CLONING / SPEAKER SYSTEM

### Strategy: Zero-Shot First, Fine-Tuning for Premium

**Phase 1 (Launch):** Zero-shot cloning via Orpheus/Fish Speech speaker conditioning. Customer uploads 30–120 seconds of audio. System extracts speaker embedding and uses it for conditioning. Quality: 70–80% similarity. Good enough for "sounds like me" but not "indistinguishable from me."

**Phase 2 (3 months):** Fine-tuning pipeline for premium voices. Customer uploads 5–30 minutes of clean audio. System fine-tunes Orpheus LoRA adapter (~100MB) on the voice. Quality: 90–95% similarity. Near-indistinguishable on phone.

**Phase 3 (6 months):** Self-service voice studio. Record directly in browser. Real-time quality feedback. Guided recording prompts optimized for cloning.

### Data Requirements Per Quality Tier

| Tier | Audio Required | Quality | Use Case | Tier Availability |
|------|---------------|---------|----------|-------------------|
| Instant Clone | 30 seconds | 70% match | "Sounds similar" | Business ($297+) |
| Standard Clone | 5 minutes | 80% match | Receptionist voice | Business ($297+) |
| Premium Clone | 30 minutes | 90% match | Founder/brand voice | Scale ($997+) |
| Studio Clone | 2+ hours | 95%+ match | Enterprise voice | Enterprise only |

### Voice Types

1. **Brand Voice:** The business's signature voice. Used for all outbound and inbound calls. One per workspace. Included in Scale tier.
2. **Founder Voice:** Clone of the actual business owner. Used for VIP callbacks and personal follow-ups. Premium upsell.
3. **Receptionist Voice:** Chosen from preset library or cloned from existing receptionist. Primary phone voice.
4. **Department Voices:** Different voices for sales, support, billing. Enterprise feature.

### Consent & Ownership

**Non-negotiable requirements:**
1. Voice owner must explicitly consent via signed digital agreement
2. Audio samples stored encrypted at rest (AES-256)
3. Voice models tagged with ownership metadata
4. Deletion request removes model within 72 hours
5. Voice models never shared between workspaces
6. Admin audit log for all voice creation/usage
7. Watermarking: subtle spectral watermark embedded in all cloned voice output (traceable if misused)

### Abuse Prevention

- No cloning of public figures without enterprise review
- Rate-limited voice creation (max 3 voices/month per workspace)
- Automated similarity check against known public figure voice prints
- Flagging system for reports of unauthorized voice use
- Immediate suspension capability per-voice

---

## SECTION 7 — REALTIME ORCHESTRATION

### Latency Budget

Total end-to-end target: **<800ms** from user-stops-talking to assistant-starts-speaking.

| Phase | Budget | Notes |
|-------|--------|-------|
| VAD endpointing | 300ms | Detect 600ms silence, minus 300ms lookahead |
| Audio → STT | 200ms | 500ms buffer, but overlaps with VAD |
| STT transcription | 150ms | Faster-Whisper base on CPU |
| LLM inference (TTFT) | 200ms | Claude Haiku or GPT-4o-mini streaming |
| TTS TTFB | 150ms | Orpheus streaming, first SNAC frame |
| Audio transport | 50ms | WebSocket + Twilio relay |
| **Total** | **~750ms** | Well within 800ms budget |

### Turn-Taking State Machine

```
         ┌──────────┐
         │   IDLE   │ ← conversation start
         └────┬─────┘
              │ audio detected
         ┌────▼─────┐
    ┌───►│ LISTENING│◄──────────────┐
    │    └────┬─────┘               │
    │         │ 600ms silence       │ barge-in detected
    │    ┌────▼──────┐              │
    │    │PROCESSING │──────────────┤
    │    └────┬──────┘              │
    │         │ TTS ready           │
    │    ┌────▼─────┐               │
    └────┤ SPEAKING │───────────────┘
         └──────────┘
```

### Barge-In Handling

When user starts speaking while assistant is speaking:
1. **Immediately stop TTS audio output** (cancel remaining chunks)
2. **Transition to LISTENING state**
3. **Discard any buffered but unsent TTS audio**
4. **Begin transcribing the new user speech**
5. **Track barge-in count** — if >3 barge-ins in one call, the assistant is being too verbose. Shorten responses.

### Sentence Streaming for Lower Perceived Latency

Don't wait for the full LLM response before starting TTS. Instead:

1. LLM streams tokens
2. Accumulate until sentence boundary (`.`, `!`, `?`, or natural clause break at `,` after 15+ words)
3. Send partial sentence to TTS immediately
4. Start streaming TTS audio while LLM continues generating
5. Queue next TTS chunk when next sentence boundary is reached

This reduces perceived latency by 300–500ms because TTS starts generating while the LLM is still producing the rest of the response.

---

## SECTION 8 — WHAT MAKES VOICES SOUND HUMAN

### The Seven Pillars of Realism

**1. Prosody (most important).** Real humans vary pitch, rhythm, and stress continuously. Robotic TTS has flat prosody — same pitch contour for questions and statements. Orpheus handles this well due to its LLM backbone learning prosodic patterns from training data. The key is to NOT over-constrain it with high stability settings. Lower stability (0.35–0.5) = more natural variation.

**2. Pause Placement.** Humans pause to think, for emphasis, and at grammatical boundaries. They don't pause uniformly. The system must insert:
- 200–400ms after questions (thinking pause)
- 100–200ms at commas
- 300–500ms at periods
- 50–100ms micro-pauses between clause boundaries
- Occasional 500ms+ "processing" pauses that signal the assistant is looking something up

**3. Speaking Rate Variation.** Average American English: 150 wpm. But within a single utterance, rate varies: slower for important info (dates, prices, instructions), faster for filler phrases and transitions. Target: 130–160 wpm with ±20% variation within utterances.

**4. Turn Timing.** The gap between when a user stops talking and the assistant starts should be 300–800ms. Too fast (<200ms) feels like the system wasn't listening. Too slow (>1200ms) feels like lag. The sweet spot is ~500ms — roughly human conversational latency.

**5. Filler Management.** Real receptionists use fillers: "Let me check on that," "Sure thing," "One moment." These buy processing time and feel natural. The LLM should be prompted to include these, and TTS should render them with appropriate casual tone.

**6. Breathing Simulation.** Orpheus's breathiness parameter adds subtle breath sounds between phrases. Set to 0.15–0.25 for professional voices, 0.25–0.35 for casual voices. This single parameter dramatically improves perceived naturalness.

**7. Telephony Reality.** On a phone call, listeners expect:
- Slightly compressed audio quality
- Background room tone (not digital silence)
- Natural telephone EQ (boosted midrange)
- Occasional small artifacts
Counter-intuitively, overly clean TTS sounds *more* artificial on phone than slightly imperfect TTS. Don't over-process.

### Quality Bar for Shipping

**Must pass before launch:**
- 5 out of 5 internal team members cannot reliably distinguish AI from human receptionist in a blind 30-second phone call test
- Abandonment rate within first 10 seconds is <5% (callers don't hang up because it sounds robotic)
- No pronunciation errors on the top 200 business terms across target industries
- No uncanny artifacts (metallic ring, word-splicing, sudden pitch jumps) in 100 consecutive test calls

---

## SECTION 9 — BUSINESS-OPTIMIZED VOICE PRESETS

### Preset 1: Warm Receptionist

- **Tone:** Friendly, welcoming, slightly upbeat
- **Pacing:** 140–150 wpm, unhurried
- **Use Case:** Inbound call greeting, first contact, appointment scheduling
- **Conversion Goal:** Get caller to state their need and book appointment
- **Risk if Overused:** Can feel overly cheerful for serious calls (complaints, emergencies)
- **Ideal Industries:** Dental, salon, restaurant, general services
- **Voice Config:** Stability 0.45, style 0.55, warmth 0.85, speed 0.95, emotion: happy→calm

### Preset 2: Professional

- **Tone:** Polished, measured, competent
- **Pacing:** 145–155 wpm, steady
- **Use Case:** Legal intake, medical offices, corporate clients
- **Conversion Goal:** Convey competence, capture information accurately
- **Risk if Overused:** Can feel cold or impersonal for relationship-based businesses
- **Ideal Industries:** Legal, medical, real estate, financial services
- **Voice Config:** Stability 0.65, style 0.3, warmth 0.4, speed 1.0, emotion: neutral

### Preset 3: Calm Support

- **Tone:** Soothing, patient, reassuring
- **Pacing:** 125–140 wpm, deliberately slow
- **Use Case:** Emergency calls, complaints, anxious callers, medical
- **Conversion Goal:** De-escalate, retain caller, schedule resolution
- **Risk if Overused:** Can feel condescending for confident callers
- **Ideal Industries:** Medical, HVAC (emergency), plumbing (emergency), insurance
- **Voice Config:** Stability 0.7, style 0.25, warmth 0.8, speed 0.88, emotion: empathetic→calm

### Preset 4: Assertive Follow-Up

- **Tone:** Confident, direct, business-like
- **Pacing:** 150–160 wpm, purposeful
- **Use Case:** Outbound follow-up calls, missed call recovery, reactivation
- **Conversion Goal:** Re-engage, get commitment, book callback
- **Risk if Overused:** Can feel pushy for cold contacts
- **Ideal Industries:** Roofing, automotive, real estate, B2B services
- **Voice Config:** Stability 0.6, style 0.4, warmth 0.5, speed 1.0, emotion: neutral

### Preset 5: Sales Closer

- **Tone:** Enthusiastic but not aggressive, confident, value-focused
- **Pacing:** 155–165 wpm, higher energy
- **Use Case:** High-ticket service quotes, upsell calls, promotional outreach
- **Conversion Goal:** Create urgency, book in-person consultation
- **Risk if Overused:** Can feel salesy for support or complaint calls
- **Ideal Industries:** Real estate, automotive, home improvement, premium services
- **Voice Config:** Stability 0.4, style 0.65, warmth 0.6, speed 1.05, emotion: excited→neutral

### Preset 6: Reminder / Collections

- **Tone:** Neutral, matter-of-fact, non-judgmental
- **Pacing:** 140–150 wpm, even
- **Use Case:** Appointment reminders, payment reminders, no-show follow-up
- **Conversion Goal:** Confirm appointment, collect payment, reschedule
- **Risk if Overused:** Can feel impersonal for relationship-oriented calls
- **Ideal Industries:** All (universal need)
- **Voice Config:** Stability 0.65, style 0.3, warmth 0.45, speed 1.0, emotion: neutral

### Preset 7: Luxury Concierge

- **Tone:** Refined, unhurried, attentive, slightly formal
- **Pacing:** 130–140 wpm, deliberate
- **Use Case:** High-end services, VIP clients, premium scheduling
- **Conversion Goal:** Make caller feel valued, provide white-glove experience
- **Risk if Overused:** Can feel pretentious for casual businesses
- **Ideal Industries:** Luxury real estate, premium medical/dental, high-end salon/spa
- **Voice Config:** Stability 0.55, style 0.4, warmth 0.7, speed 0.9, emotion: calm

---

## SECTION 10 — QUALITY EVALUATION FRAMEWORK

### Automated Metrics (Run on Every Deploy)

1. **TTFB Test:** 100 phrases × 5 voices. Median TTFB must be <250ms. P95 must be <400ms.
2. **Pronunciation Test:** 500-word business vocabulary list. Each word synthesized and STT'd back. Match rate must be >97%.
3. **Concurrent Load Test:** 20 simultaneous TTS streams for 60 seconds. No stream may exceed 500ms TTFB. Zero crashes.
4. **Emotion Differentiation Test:** Same sentence synthesized with 5 emotions. Audio embeddings (wav2vec2) must show measurable distance between emotions.

### Human Evaluation (Monthly)

1. **Blind Phone Test (MOS-style):** 10 evaluators listen to 20 calls (mix of AI and human receptionist). Rate 1–5 on naturalness. **Launch bar: mean >3.8. Reject bar: mean <3.5.**
2. **Turing Test:** 10 evaluators receive 20 phone calls — half AI, half human. Must correctly identify AI <60% of the time. If >75% can identify it, voice quality needs improvement.
3. **Business Scenario Test:** AI handles 50 simulated booking calls. Measure: appointment booked rate, caller satisfaction (post-call survey), call duration, repeat-request rate (how often caller says "what?" or "can you repeat that?").

### Call-Level Metrics (Production Monitoring)

| Metric | Good | Concerning | Action Required |
|--------|------|-----------|-----------------|
| Avg call duration | 60–180s | <30s or >300s | Review prompts |
| Abandonment <10s | <5% | 5–10% | Check voice quality |
| "What?" / repeat requests | <2 per call | 2–4 per call | Check pronunciation |
| Booking conversion rate | >25% | 15–25% | Review conversation flow |
| Barge-in rate | <3 per call | 3–5 per call | Responses too long |
| STT confidence avg | >0.7 | 0.5–0.7 | Check audio quality |

### Launch Gates

**Gate 1 — Internal Alpha:** All automated tests pass. 5 team members do blind test.
**Gate 2 — Beta (10% traffic):** 100 real calls with quality monitoring. Abandonment <8%. No complaints about voice quality.
**Gate 3 — General Availability:** 1,000 real calls. Abandonment <5%. Booking rate within 10% of human baseline. Zero critical voice artifacts.

---

## SECTION 11 — TRAINING / DATA PIPELINE

### Data Collection

**Phase 1 — Use Open-Source Training Data:**
Orpheus and Whisper are pre-trained. No training data needed initially. Just deploy inference.

**Phase 2 — Collect Production Data:**
Every call through Recall Touch (with consent) generates:
- Caller audio (for STT evaluation)
- Agent audio (for TTS quality monitoring)
- Transcripts (for prompt optimization)
- Outcomes (for conversion correlation)

This becomes the fine-tuning dataset for Phase 3.

**Phase 3 — Fine-Tuning Pipeline:**
For custom voices and improved business-specific TTS:
1. Collect 5–30 minutes of target voice audio
2. Transcribe with Whisper large
3. Align audio-text pairs using Montreal Forced Aligner
4. Clean: remove segments with background noise >-30dB, misaligned segments, segments <1s or >15s
5. Generate speaker embedding via speaker encoder
6. Fine-tune Orpheus LoRA adapter (rank 16–32) on aligned data
7. Evaluate on held-out test set
8. Register model version in model registry
9. A/B test against baseline

### Data Quality Standards

**What destroys quality:**
- Background noise in training audio
- Misaligned transcriptions (even 200ms offset causes artifacts)
- Inconsistent recording conditions (different microphones, rooms)
- Too little data (<3 minutes produces garbage)
- Emotional inconsistency (mixing angry and calm samples without labels)

**Minimum viable standards:**
- SNR >20dB for all training audio
- Alignment accuracy within 50ms
- Single speaker per training set
- Consistent recording environment
- 16kHz minimum sample rate (24kHz preferred)

### Infrastructure

- **Storage:** S3-compatible (Supabase Storage or Cloudflare R2). ~100MB per voice model, ~500MB per fine-tune dataset.
- **Experiment tracking:** MLflow or Weights & Biases for tracking fine-tune runs
- **Model registry:** Version-tagged models with metadata (voice_id, training_data_hash, quality_score)
- **Dataset versioning:** DVC or simple S3 versioning with manifests

---

## SECTION 12 — INFRASTRUCTURE PLAN

### Inference Infrastructure

**GPU Strategy:**

| Component | Hardware | Provider | Cost/hr | Capacity |
|-----------|----------|----------|---------|----------|
| TTS (Orpheus 3B) | A100 80GB | VastAI/TensorDock | $1.50 | 25 concurrent streams |
| STT (Whisper base) | CPU (8 core) | Any cloud | $0.15 | 40 concurrent streams |
| VAD (Silero) | CPU (shared with STT) | — | $0 | 100+ streams |
| SNAC decoder | Shared with TTS GPU | — | $0 | Included in TTS |

**Scaling Model:**

- **0–500 concurrent minutes/month:** Single A100 instance ($1,100/mo). Handles ~25 concurrent calls.
- **500–5,000 minutes/month:** Add CPU autoscaling for STT. TTS GPU at ~30% utilization.
- **5,000–50,000 minutes/month:** Add second A100. Implement request queueing with priority lanes.
- **50,000+ minutes/month:** Multi-GPU inference with load balancing. Consider reserved instances for 30–50% cost reduction.

**Cold Start Strategy:**
Models must be pre-loaded. Cold start for Orpheus 3B is ~30 seconds. Solution: keep at least one GPU warm at all times. Use health checks with 30-second timeout to detect cold instances.

**Autoscaling Rules:**
- Scale up when concurrent streams >80% capacity for >60 seconds
- Scale down when concurrent streams <20% capacity for >10 minutes
- Never scale to zero during business hours (8am–8pm per timezone)

### Cost Projection

| Monthly Call Minutes | External API Cost | Self-Hosted Cost | Savings |
|---------------------|-------------------|------------------|---------|
| 1,000 | $80–120 | $1,100 (fixed GPU) | -$980 (not worth it yet) |
| 5,000 | $400–600 | $1,100 | -$500 (break-even approaching) |
| 10,000 | $800–1,200 | $1,100 | $0–$100 (break-even) |
| 25,000 | $2,000–3,000 | $1,200 | $800–$1,800 |
| 50,000 | $4,000–6,000 | $1,500 | $2,500–$4,500 |
| 100,000 | $8,000–12,000 | $2,200 | $5,800–$9,800 |
| 500,000 | $40,000–60,000 | $5,500 | $34,500–$54,500 |

**Break-even: ~10,000 minutes/month.** Below that, keep external as primary with self-hosted as shadow (running for quality comparison but not serving traffic).

---

## SECTION 13 — COST MODEL & MARGIN STRATEGY

### Per-Minute Cost Breakdown (Self-Hosted at Scale)

| Component | Cost/Min | Notes |
|-----------|----------|-------|
| TTS (Orpheus on A100) | $0.003 | 25 streams/GPU, ~30% utilization |
| STT (Whisper on CPU) | $0.001 | 40 streams per 8-core instance |
| LLM (Claude Haiku) | $0.005 | ~100 tokens in, ~50 tokens out per turn |
| Twilio telephony | $0.013 | $0.0085 carrier + markup |
| GPU overhead (SNAC, VAD) | $0.001 | Shared with TTS GPU |
| Infra (logging, storage) | $0.001 | Marginal |
| **Total** | **$0.024/min** | |

Compare to competitors:
- Bland AI: $0.09–0.14/min (their cost to you)
- Vapi: $0.15–0.33/min
- Synthflow: $0.08–0.45/min

**Recall Touch blended cost: $0.024/min. Competitor cost: $0.09–0.33/min.**

### Margin Structure

At the Business tier ($297/mo) with ~2,000 voice minutes included:
- Voice cost: 2,000 × $0.024 = $48
- Total COGS for voice: $48
- Voice margin: 84%

At the Solo tier ($49/mo) with ~200 voice minutes included:
- Voice cost: 200 × $0.024 = $4.80
- Voice margin: 90%

Compare to if using ElevenLabs at $0.06/min:
- Business tier voice cost: 2,000 × $0.06 = $120 (40% of subscription!)
- Solo tier voice cost: 200 × $0.06 = $12 (24% of subscription)

### What to Meter vs Include

**Include in subscription:**
- All preset voices (40+ library)
- Voice minutes within tier limit
- Basic voice customization (speed, tone presets)

**Meter/charge overage:**
- Minutes beyond tier limit: $0.05/min (still cheaper than competitors, 50%+ margin)

**Premium add-on:**
- Custom voice cloning: included in Scale ($997), $199 one-time in Business tier
- Founder voice clone: Scale+ only
- Additional cloned voices: $99 each

**Never make unlimited:**
- Voice minutes (GPU costs are real)
- Voice cloning slots (storage + compute costs)
- Concurrent call capacity (GPU bound)

---

## SECTION 14 — PRODUCTIZATION INSIDE RECALL TOUCH

### Voice Library (Dashboard → Settings → Voices)

**What user sees:**
- Grid of 40+ voice cards with name, avatar, description, industry tags
- Play preview button on each card
- "Recommended for you" section based on their industry
- Filter by: gender, accent, tone, industry
- Current active voice highlighted

**What admin sees:**
- Usage stats per voice (minutes, calls, conversion rates)
- Quality metrics per voice
- Ability to disable problematic voices

### Create Custom Voice (Settings → Voices → Create)

**Step 1: Upload** — Drag-and-drop audio files (WAV, MP3, M4A). Minimum 30 seconds for instant clone, 5 minutes for standard, 30 minutes for premium.

**Step 2: Consent** — Digital consent form. Checkbox: "I confirm I am the person speaking in this audio OR I have explicit written permission from the speaker." Link to consent policy.

**Step 3: Processing** — Progress bar showing: uploading → analyzing → extracting voice profile → generating test samples → ready. Takes 2–5 minutes for instant, 10–30 minutes for fine-tuned.

**Step 4: Preview** — Play 3 generated samples. User can adjust: speed, warmth, formality. Approve or re-record.

**Step 5: Assign** — Assign to specific agents, phone numbers, or call types.

### Voice Analytics (Dashboard → Analytics → Voice)

- Minutes used per voice per period
- Average call duration per voice
- Booking conversion rate per voice
- Caller satisfaction scores per voice
- "Repeat request" rate per voice (indicates pronunciation issues)
- A/B test results between voices

### Version History & Rollback

Each voice maintains version history. If a fine-tune update degrades quality, one-click rollback to previous version. Version diffs show: training data changes, config changes, quality score changes.

---

## SECTION 15 — TRUST / SAFETY / ABUSE PREVENTION

### Consent Workflow

1. **Voice creator uploads audio** → system checks audio quality and extracts metadata
2. **Digital consent form** with legally binding language: "I certify that I am the voice in this recording or have explicit written consent from the speaker to create an AI voice clone."
3. **Email verification** sent to workspace owner confirming voice creation
4. **7-day grace period** where voice owner can revoke consent and delete voice
5. **Ongoing**: voice owner can request deletion at any time via Settings

### Abuse Detection

- **Celebrity/public figure detection:** Compare new voice embeddings against known public figure voice prints. Flag matches >80% similarity for manual review.
- **Anomalous usage:** Alert on voice being used for calls to numbers outside workspace's normal patterns
- **Content moderation:** Flag calls where TTS is used to read threatening, fraudulent, or impersonating content (via LLM content filter)
- **Rate limiting:** Max 3 voice clones per workspace per month. Max 1,000 minutes per voice per day.

### Watermarking

Embed imperceptible audio watermark in all AI-generated speech:
- Spectral domain watermark (inaudible) encoding: workspace_id, timestamp, voice_id
- Survives telephony compression (mu-law, GSM)
- Allows tracing any AI-generated audio back to the workspace that created it
- Can be verified by Recall Touch's detection API

### Deletion Workflow

1. User requests voice deletion
2. System immediately stops serving the voice (soft delete)
3. Model weights deleted from inference servers within 1 hour
4. Training data and model files deleted from storage within 72 hours
5. Confirmation email sent to workspace owner
6. Audit log entry created (permanent)

---

## SECTION 16 — BUILD ORDER

### A. MUST BUILD FIRST (Month 1–2)

1. **Deploy Orpheus TTS inference server** on A100/H100. Get streaming working end-to-end with Twilio. This is the core value.
2. **Deploy Faster-Whisper STT** on CPU. Replace any external STT dependency.
3. **Wire Twilio Media Streams** to voice server WebSocket. Already mostly done — needs production hardening.
4. **Shadow mode:** Run self-hosted alongside ElevenLabs. Compare quality on real calls. Don't serve self-hosted to customers yet.
5. **Automated quality tests:** TTFB, pronunciation, concurrent load.

### B. SHOULD BUILD SECOND (Month 2–4)

6. **Voice preset system** — 7 business presets with tuned configs. Ship to customers.
7. **Migrate 10% of traffic** to self-hosted. Monitor abandonment, conversion, complaints.
8. **Sentence streaming** — reduce perceived latency by streaming LLM→TTS incrementally.
9. **Post-processing pipeline** — telephony EQ, comfort noise, normalization.
10. **Zero-shot voice cloning** — basic upload-and-clone flow for Scale tier customers.

### C. BUILD LATER (Month 4–8)

11. **Fine-tuning pipeline** for premium voice clones
12. **Voice analytics dashboard**
13. **Pronunciation customization** (per-workspace dictionary)
14. **Multi-language support** (Spanish first, then others)
15. **Consent/trust infrastructure** (watermarking, abuse detection)
16. **Voice version history and rollback**

### D. DO NOT BUILD TOO EARLY

- Custom STT model training (Whisper base is sufficient for 12+ months)
- Custom LLM for dialogue (use Claude/GPT — focus engineering on voice)
- Browser-based voice recording studio (nice-to-have, not critical)
- Real-time voice style transfer (research project, not production-ready)
- Emotional sentiment analysis from caller voice (interesting but not necessary for revenue)

---

## SECTION 17 — MIGRATION PATH

### Phase 0: Current State (Now)
- ElevenLabs for TTS (via API)
- Vapi for voice orchestration (deprecated)
- Voice server code exists but uses placeholder audio

### Phase 1: Shadow Mode (Month 1–2)
- Deploy Orpheus TTS on cloud GPU
- Deploy Faster-Whisper on CPU
- Run self-hosted in parallel with ElevenLabs on every call
- Log quality metrics for both: TTFB, audio duration, STT confidence
- **Do NOT serve self-hosted to customers yet**
- Quality gate: self-hosted TTFB within 50ms of ElevenLabs median

### Phase 2: Canary (Month 2–3)
- Route 5% of calls to self-hosted voice
- Monitor: abandonment rate, call duration, booking rate
- Quality gate: abandonment rate within 2% of ElevenLabs baseline
- If gate passes: increase to 25%

### Phase 3: Majority (Month 3–4)
- Route 75% of calls to self-hosted
- Keep ElevenLabs as hot fallback (auto-failover if voice server is down)
- Quality gate: zero customer complaints about voice quality for 2 consecutive weeks

### Phase 4: Full Independence (Month 4–5)
- Route 100% of calls to self-hosted
- Demote ElevenLabs to cold fallback (only used if voice server is completely unreachable)
- Remove ElevenLabs API key from production config
- Update marketing: "Powered by our proprietary voice AI"

### Phase 5: Feature Expansion (Month 5–8)
- Launch voice cloning
- Launch voice presets
- Launch voice analytics
- Deprecate all external voice provider code paths

---

## SECTION 18 — COMPETITOR GAP ANALYSIS

### Where Big Platforms Currently Win

- **Raw audio quality in ideal conditions:** ElevenLabs Turbo v2.5 is genuinely excellent at 48kHz with studio-quality output. Orpheus is close but not identical.
- **Ease of integration:** Bland AI and Vapi offer turnkey solutions. Our approach requires more engineering.
- **Multilingual breadth:** ElevenLabs supports 30+ languages. Orpheus is strongest in English.
- **Voice cloning from tiny samples:** ElevenLabs Professional Voice Cloning from 30 seconds is impressive. Open-source needs 2–5 minutes for comparable quality.

### Where They Are Overkill

- **Studio-quality audio for phone calls.** Phone calls are 8kHz mu-law. Spending $0.08/min for 48kHz TTS that gets compressed to 8kHz is throwing money away. On the phone, Orpheus at 24kHz→8kHz sounds indistinguishable from ElevenLabs at 48kHz→8kHz.
- **30+ languages for US service businesses.** Recall Touch's primary market is English-speaking US service businesses. English and Spanish cover 95%+ of need.
- **Advanced voice design tools.** Bland/Synthflow offer complex voice design UIs. For service businesses that just want "a good receptionist voice," preset selection beats complex configuration.

### Where They Are Expensive

- ElevenLabs: $0.04–0.08/min TTS alone
- Bland AI: $0.09–0.14/min all-in
- Vapi: $0.15–0.33/min all-in
- At 50,000 minutes/month (achievable with 200 active businesses), external costs: $4,500–16,500/mo vs self-hosted: $1,500/mo

### Where Recall Touch Creates Unfair Advantage

1. **Industry-specific voices** that no generic platform offers. "HVAC receptionist" and "dental coordinator" voices tuned for those exact industries.
2. **Integrated workflow.** Voice → booking → follow-up → revenue tracking in one system. Competitors are voice-only — they need integrations for everything else.
3. **Cost structure allows generous minutes.** At $0.024/min, Recall Touch can include 2,000 minutes in a $297 plan and still have 84% margins. Competitors can't do this.
4. **Voice cloning as a retention feature.** Once a business has their custom voice set up, switching costs are enormous.
5. **Data flywheel.** Every call improves understanding of what works. Pronunciation corrections, conversion patterns, and industry-specific optimizations compound over time.

---

## SECTION 19 — FINAL RECOMMENDATION

### 1. The Single Best Overall Architecture

Orpheus TTS 3B + Faster-Whisper base + Silero VAD, running on a single A100 80GB GPU + 8-core CPU instance, orchestrated by the existing Python FastAPI voice server, connected to Twilio via Media Streams WebSocket. LLM via Claude Haiku API for dialogue. Everything else stays in-house.

### 2. The Single Best Build-First Plan

Deploy Orpheus TTS inference in shadow mode alongside ElevenLabs. Run both on every call for 4 weeks. Compare quality metrics. When self-hosted matches within 95% on phone-quality audio, begin canary migration.

### 3. The Single Best Margin-Protection Move

Include generous voice minutes in every subscription tier (200 min Solo, 2,000 min Business, unlimited Scale) because self-hosted cost is so low. This makes it impossible for competitors to match without destroying their margins.

### 4. The Single Biggest Technical Risk

TTS latency under concurrent load. A single A100 handles 25 concurrent streams at ~200ms TTFB. But at peak times with 30+ concurrent calls, TTFB spikes to 400–600ms and calls feel laggy. Mitigation: implement priority queuing, sentence-level streaming, and GPU autoscaling.

### 5. The Single Biggest Product Risk

Shipping self-hosted voice before it's ready and having customers complain about quality. Mitigation: shadow mode for 4+ weeks, canary at 5% for 2+ weeks, strict quality gates before each traffic increase.

### 6. The Single Clearest Advantage of Owning the Stack

**Margin.** At 100,000 voice minutes/month, self-hosted saves $6,000–10,000/month compared to external APIs. That's $72,000–120,000/year in pure margin improvement. This number only grows with scale.

### 7. The Single Clearest Reason This Can Become a Moat

**Compounding data advantage.** Every call generates data about what voice characteristics drive bookings in specific industries. After 1 million calls, Recall Touch will know that HVAC callers respond 15% better to voice X at speed Y with emotion Z. No generic voice platform has this data. This knowledge compounds into increasingly optimized voice presets that no competitor can replicate without building the same integrated system.

### 8. The Exact Final Recommendation

**Build the self-hosted voice stack. Start now. Follow the phased migration plan. Do NOT cut corners on quality gates. Be patient during shadow mode. The long-term economics are overwhelmingly favorable, and the competitive advantage is real and compounding. This is the single highest-ROI infrastructure investment Recall Touch can make in 2026.**

---
---

# IMPLEMENTATION BRIEF FOR CURSOR — IN-HOUSE VOICE STACK

## 1. Backend Services to Build

```
services/voice-server/              ← ALREADY EXISTS, NEEDS PRODUCTION HARDENING
  ├── main.py                       ← FastAPI server (DONE - needs GPU model loading)
  ├── tts_engine.py                 ← Multi-model TTS (DONE - needs real model testing)
  ├── stt_engine.py                 ← Faster-Whisper STT (DONE - needs GPU testing)
  ├── conversation_engine.py        ← Turn-taking (DONE - needs latency optimization)
  ├── voice_library.py              ← 40+ voices (DONE)
  ├── benchmark.py                  ← Quality tests (DONE)
  ├── post_processor.py             ← NEW: telephony EQ, comfort noise, normalization
  ├── voice_cloner.py               ← NEW: speaker embedding extraction, LoRA fine-tuning
  ├── model_registry.py             ← NEW: version tracking for voice models
  ├── watermark.py                  ← NEW: audio watermarking for abuse prevention
  └── metrics.py                    ← NEW: prometheus metrics export
```

## 2. Data Models to Add (Supabase)

```sql
-- Voice models table
CREATE TABLE revenue_operator.voice_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES revenue_operator.workspaces(id),
  voice_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('preset', 'cloned_instant', 'cloned_finetuned')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('processing', 'active', 'archived', 'deleted')),
  config JSONB NOT NULL DEFAULT '{}',
  reference_audio_url TEXT,
  model_weights_url TEXT,
  consent_verified BOOLEAN NOT NULL DEFAULT false,
  consent_signed_at TIMESTAMPTZ,
  quality_score NUMERIC(3,2),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Voice usage tracking
CREATE TABLE revenue_operator.voice_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES revenue_operator.workspaces(id),
  voice_id TEXT NOT NULL,
  call_session_id UUID REFERENCES revenue_operator.call_sessions(id),
  minutes_used NUMERIC(8,2) NOT NULL,
  tts_model TEXT NOT NULL,
  avg_ttfb_ms INTEGER,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Voice consent records
CREATE TABLE revenue_operator.voice_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES revenue_operator.workspaces(id),
  voice_model_id UUID REFERENCES revenue_operator.voice_models(id),
  consenter_name TEXT NOT NULL,
  consenter_email TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  ip_address TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Voice quality metrics (per-call)
CREATE TABLE revenue_operator.voice_quality_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id UUID REFERENCES revenue_operator.call_sessions(id),
  tts_model TEXT NOT NULL,
  avg_ttfb_ms INTEGER,
  max_ttfb_ms INTEGER,
  stt_avg_confidence NUMERIC(3,2),
  barge_in_count INTEGER DEFAULT 0,
  repeat_request_count INTEGER DEFAULT 0,
  call_duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 3. Training Pipeline Jobs

**Job 1: Voice Clone (Instant)**
- Trigger: User uploads audio via API
- Steps: validate audio → extract speaker embedding → store embedding → generate test samples → quality check → mark voice as active
- Duration: 2–5 minutes
- Infrastructure: CPU (no GPU needed for instant clone)

**Job 2: Voice Clone (Fine-Tuned)**
- Trigger: Premium user uploads 5+ minutes of audio
- Steps: validate audio → transcribe with Whisper large → Montreal Forced Alignment → clean + segment → extract speaker embedding → fine-tune Orpheus LoRA (100 steps) → evaluate → register model version
- Duration: 30–60 minutes
- Infrastructure: A100 GPU (same as inference, scheduled during off-peak)

**Job 3: Quality Regression Test**
- Trigger: Every model update, weekly automated
- Steps: synthesize 100 test phrases × 10 voices → measure TTFB, pronunciation accuracy, embedding similarity → compare to baseline → flag regressions
- Duration: 15 minutes
- Infrastructure: A100 GPU

## 4. Inference Pipeline Requirements

- **TTS:** Orpheus 3B on A100 80GB via vLLM (FP16). Session reuse for <100ms subsequent TTFB. SNAC decoder on same GPU.
- **STT:** Faster-Whisper base (int8) on CPU. 8 cores minimum. Process 500ms audio chunks.
- **VAD:** Silero VAD on CPU. Process 30ms audio frames. Threshold: 0.5 speech probability.
- **Orchestration:** Python asyncio event loop. WebSocket per call. Max 25 concurrent calls per GPU instance.

## 5. Voice Library UI Requirements

**New pages:**
- `/dashboard/settings/voices` — Voice library grid with preview, search, filter
- `/dashboard/settings/voices/create` — Multi-step voice clone wizard
- `/dashboard/settings/voices/[id]` — Voice detail: config, usage stats, version history

**Components:**
- `VoiceCard` — Preview card with play button, name, tags
- `VoicePreview` — Audio player with waveform visualization
- `VoiceCloneWizard` — Multi-step form: upload → consent → processing → preview → assign
- `VoiceUsageChart` — Minutes used per voice over time

## 6. Consent and Abuse-Prevention Workflows

- Digital consent form embedded in clone wizard
- Email verification to workspace owner
- 7-day revocation window
- Celebrity voice similarity check (compare embeddings)
- Rate limiting: 3 clones/month per workspace
- Admin review queue for flagged voices
- One-click voice suspension

## 7. Analytics Requirements

- Voice minutes used (per workspace, per voice, per day)
- TTS TTFB distribution (p50, p95, p99)
- STT confidence distribution
- Booking conversion rate per voice preset
- Abandonment rate per voice
- Cost per minute trending

## 8. Cost-Metering Requirements

- Track minutes per workspace per billing period
- Enforce tier limits (200/2000/unlimited)
- Overage billing at $0.05/min
- Voice clone creation tracked against tier allowance
- GPU utilization tracking for infrastructure cost allocation

## 9. Rollout Order

1. Deploy voice server on GPU instance (shadow mode)
2. Add voice_usage tracking table and API
3. Run shadow mode for 4 weeks
4. Build voice library UI
5. Canary 5% traffic
6. Build voice clone wizard
7. Canary 25% traffic
8. Build voice analytics
9. Full migration
10. Launch voice cloning to Scale tier

## 10. First Milestones

- **Week 1:** Orpheus TTS running on A100, generating audio from text
- **Week 2:** Full pipeline working: Twilio → WebSocket → STT → LLM → TTS → Twilio
- **Week 3:** Shadow mode active, quality metrics logging
- **Week 4:** Automated benchmark suite passing all tests
- **Week 6:** Canary at 5%, monitoring dashboards live
- **Week 8:** Canary at 25%, voice library UI shipped
- **Week 10:** Full migration, ElevenLabs demoted to cold fallback
- **Week 12:** Voice cloning beta launched to Scale tier

---
---

# EXECUTIVE VERSION

## Should We Build Our Own Voice System?

**Yes.** The economics are clear, the technology is ready, and the competitive advantage is real.

## How Should We Build It?

Use **Orpheus TTS** (best open-source TTS model, ~130ms latency, emotion support) for text-to-speech and **Faster-Whisper** (4x faster than OpenAI Whisper) for speech-to-text. Run both on a single cloud GPU ($1,100–1,500/month). Deploy alongside the existing voice server code which already has the right architecture.

**Do not try to build everything at once.** Start with TTS inference in shadow mode (running alongside ElevenLabs for comparison), then gradually migrate traffic over 8–10 weeks with strict quality gates at each step.

## How Do We Avoid Usage Fees?

Self-hosted voice inference costs approximately **$0.024/minute** all-in (TTS + STT + LLM + telephony). External APIs cost **$0.09–0.33/minute**. At 50,000 minutes/month (200 active businesses), self-hosted saves **$3,000–15,000/month** compared to external providers. This allows including generous voice minutes in every subscription tier while maintaining 75–90% gross margins on voice features.

## How Do We Keep Quality High?

1. **Shadow mode first.** Run self-hosted alongside ElevenLabs on every call for 4 weeks. Compare metrics.
2. **Canary releases.** Move 5% → 25% → 75% → 100% of traffic with quality gates at each step.
3. **Automated tests.** TTFB, pronunciation, concurrent load tests run on every deployment.
4. **Human evaluation.** Monthly blind phone tests where evaluators rate naturalness.
5. **Production monitoring.** Track abandonment rate, booking conversion, and repeat-request rate per voice.

Key insight: **on a phone call (8kHz mu-law audio), the quality difference between Orpheus and ElevenLabs is negligible.** The quality bar that matters is "sounds human enough on a phone" — not "sounds perfect on studio headphones."

## How Do We Make It a Moat?

1. **Industry-specific voice presets** (HVAC receptionist, dental coordinator, etc.) that no generic platform offers.
2. **Voice cloning as a retention feature** — once a business has their custom voice, switching costs are enormous.
3. **Data flywheel** — every call teaches us which voice characteristics drive bookings in each industry. This compounds.
4. **Cost structure** — at $0.024/min, we can include generous minutes in every plan. Competitors paying $0.08–0.14/min cannot match this.
5. **Full control** — we decide the quality, the features, the pricing, the roadmap. No vendor can pull the rug.

## How Do We Avoid Wasting Time?

1. **Don't train custom models yet.** Orpheus pre-trained is good enough for 6+ months. Fine-tuning comes later for premium voice clones.
2. **Don't build a custom LLM.** Use Claude/GPT for dialogue. Voice is where the margin lives.
3. **Don't build multilingual before English is perfect.** English covers 95% of the market.
4. **Don't over-engineer the voice clone workflow.** Start with simple upload → process → preview. Fancy recording studio comes later.
5. **Don't migrate traffic before shadow mode proves quality.** Patience here prevents customer complaints.

## Timeline

| Week | Milestone |
|------|-----------|
| 1–2 | Orpheus TTS running on GPU, end-to-end pipeline working |
| 3–4 | Shadow mode active, quality metrics logging |
| 5–6 | Canary at 5%, monitoring dashboards |
| 7–8 | Canary at 25%, voice library UI shipped |
| 9–10 | Full migration to self-hosted |
| 11–12 | Voice cloning beta for Scale tier |

## Bottom Line

Building our own voice stack is the single highest-ROI infrastructure investment we can make. It transforms voice from a cost center ($0.08–0.14/min external fees) into a profit engine ($0.024/min self-hosted) while creating competitive advantages that compound over time. The technology is ready. The existing code provides the foundation. Execute the phased migration plan, respect the quality gates, and by Week 12 we'll own the most defensible layer of the product.
