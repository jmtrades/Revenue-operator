# RECALL TOUCH — V14 FULL SYSTEMS DESIGN

20 Sections. Self-Hosted Voice. Data Model. Observability. QA. Hardening. Implementation.

---

## SECTION 1 — EXECUTIVE VERDICT

**What Recall Touch still lacks:** Production hardening. The billing flow returns 200 for errors. No dunning. No email verification. No rate limiting on signup or phone provisioning. No empty states. No fallback for voice failures. No customer has tested the system. The codebase is technically complete but operationally untested.

**What must be built or hardened immediately:** The 10 structural billing/auth fixes from FINAL-3. Without these, the first customer who tries to pay will hit a broken checkout. The first customer whose card fails will silently churn.

**Why self-hosted voice matters:** Current COGS $0.099/min. Vapi alone costs $0.035/min — $17,500/mo at 1,000 customers for orchestration that open-source Pipecat does for free. Self-hosted stack (Pipecat + Kokoro + Canary + Llama 8B + Telnyx) drops COGS to $0.007/min. This is the difference between 83% and 98% gross margin. At scale, this is millions of dollars per year.

**Biggest risk:** Shipping voice self-hosting before the product has paying customers. Optimization without validation is waste.

**Biggest opportunity:** The category AI Revenue Operations is unclaimed. The product is built. The margins are extraordinary at self-hosted prices. One real customer with real revenue-recovered data unlocks everything.

**"Fully built and strong" means:** Every billing path works correctly. Every failure has a fallback. Every page has an empty state. Every action is tracked. Every call has quality metrics. One real customer is live and the weekly digest shows real dollars recovered.

---

## SECTION 2 — FULL SYSTEM GAP ANALYSIS

### Product gaps
- No cancellation flow with survey
- No trial grace period logic
- No product tour for new users
- No sandbox/preview mode for agents before go-live
- Agent can go live without completing a test call
- No contact data export
- No status page

### UX gaps
- Empty states missing on Calls, Contacts, Inbox, Campaigns, Analytics, Follow-Ups
- Loading skeletons missing (spinner instead of skeleton placeholders)
- Settings has 16+ sub-pages with no grouping or progressive disclosure
- ROI calculator defaults cap perceived value at $650

### Engineering gaps
- Checkout returns HTTP 200 for all errors
- Billing status hardcodes plan limits separately from billing-plans.ts
- Trial end date calculated in 3 places that can diverge
- Webhook idempotency relies on catching Postgres error codes as strings
- Phone provisioning has no rate limiting
- Signup has no rate limiting
- Change-plan accepts both plan_id and planId
- No webhook retry/backoff logic defined
- Speed-to-lead is poll-based (2-min), not event-driven

### Infrastructure gaps
- No self-hosted voice components (all outsourced)
- No GPU infrastructure for TTS/STT/LLM
- No voice quality monitoring pipeline
- No call recording storage strategy defined
- No CDN for static assets strategy defined

### Data gaps
- No call quality scoring (latency, naturalness, caller engagement)
- No per-campaign attribution tracking
- No churn-risk scoring
- No cost-per-conversation tracking
- No voice version tracking

### Trust gaps
- No /security page
- No SOC 2 mention
- No HIPAA compliance statement
- No founder identity on site
- No social proof
- No uptime/status page

### Billing gaps
- No dunning emails
- No trial grace period
- No cancellation survey
- No failed-payment workspace pausing
- Checkout errors indistinguishable from success (HTTP 200)

### QA gaps
- No end-to-end billing flow test
- No voice call quality regression tests
- No load testing performed
- No concurrent call testing
- No webhook duplicate processing test

### Analytics gaps
- No signup funnel tracking
- No onboarding step completion tracking
- No activation milestone tracking (first call, first booking, first revenue)
- No feature adoption tracking
- No churn-risk signals

### Support gaps
- No customer support channel visible on website
- No in-app help/support link (except email in sidebar)
- No self-serve troubleshooting
- No FAQ for common issues within the app

### Self-hosted voice gaps
- No Pipecat deployment
- No self-hosted TTS service
- No self-hosted STT service
- No self-hosted LLM inference
- No voice quality eval framework
- No voice preset generation pipeline
- No voice cloning infrastructure
- No call failure fallback chain

---

## SECTION 3 — FULL SELF-HOSTED VOICE STRATEGY

### Why own the stack

**Margin:** $0.099/min outsourced vs $0.007/min self-hosted. At 1M minutes/month (2,000 Business customers), that is $99,000/mo vs $7,000/mo. $92,000/mo saved.

**Defensibility:** Competitors on Vapi/Bland pay 14x more per minute. They cannot survive a price war. They cannot offer the same product at the same margin.

**Quality control:** When Deepgram has an outage, your product goes down. When you own the stack, you control uptime, latency, and quality. You can optimize voice presets for phone audio specifically (8kHz, G.711 codec) instead of accepting general-purpose cloud models.

**Data ownership:** Every call generates training data. Self-hosted inference means that data stays on your infrastructure. No third party trains on your customers' conversations.

### Where it is risky

**Operational complexity:** Running GPU inference in production with <100ms latency, auto-scaling, health checks, and failover is hard. It requires DevOps capability that a solo founder may not have.

**Quality regression:** Self-hosted models may sound worse than cloud APIs on edge cases (accents, noise, fast speech). Without a proper eval framework, regressions go undetected.

**Upfront cost:** GPU instances cost $245-$500/mo even with zero customers. This is fine at 50+ customers but burns cash pre-revenue.

### "Good enough to win" means

Callers cannot tell they are talking to an AI within the first 10 seconds. Latency from end-of-speech to first-audio-byte is under 800ms. The voice sounds like a competent human receptionist, not a robot. Pronunciation of common business terms (appointment, availability, schedule) is natural. The system handles interruptions gracefully (caller talks over the AI).

### Phased approach (do not build all at once)

Phase 1 (Now): Stay on Vapi + Deepgram + Claude + Twilio. Get customers.
Phase 2 (Month 2-3): Pipecat replaces Vapi. Saves $0.035/min.
Phase 3 (Month 4-6): Kokoro TTS replaces Deepgram Aura-2.
Phase 4 (Month 6-8): Canary STT replaces Deepgram Nova-2.
Phase 5 (Month 8-12): Llama 3 8B replaces Claude for 90% of turns.
Phase 6 (Month 3, parallel): Telnyx replaces Twilio.

---

## SECTION 4 — SELF-HOSTED VOICE ARCHITECTURE

### Layer 1: Phone/Audio Transport
**What:** SIP trunk connection between telephony provider (Telnyx) and voice pipeline.
**Quality bar:** <100ms jitter. G.711 u-law codec (standard for PSTN). 8kHz sample rate.
**Cost:** Telnyx $0.004/min. Cheapest layer.
**Track:** call_attempts, connected_calls, call_duration_ms, codec, jitter_ms.

### Layer 2: VAD (Voice Activity Detection)
**What:** Detects when the caller starts/stops speaking. Controls turn-taking.
**Quality bar:** <50ms detection latency. Must not trigger on background noise. Must handle pauses within speech (thinking pauses) without cutting off the caller.
**Implementation:** Silero VAD (open source, CPU-only, <5ms latency). Built into Pipecat.
**Track:** vad_events (speech_start, speech_end, timestamp), false_positive_rate.

### Layer 3: STT (Speech-to-Text)
**What:** Converts caller audio to text in real-time.
**Quality bar:** WER <7% on phone audio. Streaming latency <300ms. Must handle accents, background noise, and business vocabulary.
**Implementation:** Canary-1B-Flash (Phase 4). Deepgram Nova-2 as fallback.
**Track:** transcript_latency_ms, wer_sampled, confidence_score, fallback_triggered.

### Layer 4: Turn-Taking / Interruption Handling
**What:** Decides when the AI should start speaking and handles caller interruptions.
**Quality bar:** AI starts responding within 800ms of caller finishing. If caller interrupts, AI stops within 200ms.
**Implementation:** Pipecat's built-in UserIdleDetector + SentenceAggregator.
**Track:** response_latency_ms, interruption_count, barge_in_events.

### Layer 5: LLM Interface
**What:** Processes transcript, generates response based on agent config, business context, and conversation history.
**Quality bar:** Response generation <500ms for first token. Booking accuracy >95%. Never fabricates information.
**Implementation:** Llama 3 8B via vLLM (Phase 5). Claude Haiku as fallback for complex turns (confidence <0.85).
**Track:** llm_latency_ms, tokens_generated, confidence_score, fallback_to_claude, intent_detected, action_taken.

### Layer 6: TTS (Text-to-Speech)
**What:** Converts AI response text to speech audio.
**Quality bar:** TTFB <100ms. Naturalness indistinguishable from human on phone audio. Pronunciation of business terms correct.
**Implementation:** Kokoro 82M (Phase 3). Deepgram Aura-2 as fallback.
**Track:** tts_latency_ms, audio_duration_ms, voice_preset_used, fallback_triggered.

### Layer 7: Voice Identity
**What:** Speaker embeddings that define how the AI sounds.
**Quality bar:** Consistent voice across turns. No drift. Industry-appropriate tone.
**Implementation:** 6 standard presets (Kokoro). Custom clones via Fish Speech S1-mini (Business+).
**Track:** voice_id, voice_version, clone_source_duration_s, quality_score.

### Layer 8: Conversation Logging
**What:** Full record of every call for audit, analytics, and improvement.
**Track:** call_id, workspace_id, contact_id, agent_id, direction (inbound/outbound), start_time, end_time, duration_ms, transcript (full), intent_sequence, actions_taken, outcome, quality_scores, cost_cents, voice_preset, llm_model, stt_model, tts_model, fallback_events.

### Layer 9: Failover Chain
**What:** If any component fails, the call must not drop.
**Chain:** Primary STT fails → Deepgram Nova-2 API. Primary TTS fails → Deepgram Aura-2 API. Primary LLM fails → Claude Haiku API. All components fail → pre-recorded message: "We are experiencing technical difficulties. Please leave a message." → voicemail recording → needs-attention queue item.
**Track:** failover_events (component, reason, latency_added_ms).

---

## SECTION 5 — STT PLAN

**Model:** Canary-1B-Flash (NVIDIA, Apache 2.0, 1B params).
**Mode:** Streaming (RNN-Transducer architecture). Not chunked — real-time token emission.
**Latency target:** <300ms from audio to transcript token.
**Telephony handling:** Input is 8kHz G.711 u-law from SIP. Resample to 16kHz for model input. Apply noise gate for PSTN line noise.
**Accents:** Canary supports US/UK/Australian English natively. Fine-tune on 100 hours of phone-call audio if accent performance degrades.
**Business vocabulary:** Add custom vocabulary boosting for: appointment, availability, reschedule, cancellation, consultation, estimate, quote, invoice, copay, deductible, retainer, HVAC, plumbing, roofing.
**Endpointing:** Silero VAD handles end-of-speech detection. Canary emits partial transcripts continuously.
**Failure handling:** If Canary latency exceeds 500ms or returns empty transcript, switch to Deepgram Nova-2 API for remainder of call.
**Eval:** Weekly sample 50 random call segments. Human-rate WER. Track trend. Alert if WER rises above 8%.
**Deployment:** Single L4 GPU on RunPod. 1,000x real-time speed means one GPU handles thousands of concurrent transcriptions.
**Cost:** $0.000006/min (GPU amortized). vs Deepgram $0.015/min.

---

## SECTION 6 — TTS PLAN

**Model:** Kokoro 82M (Apache 2.0, 82M params, TTS Arena ELO 1,059).
**Mode:** Streaming. Pipecat sends text chunks, Kokoro returns audio chunks.
**Latency target:** TTFB <100ms. End-to-end (text received to audio playing on phone) <200ms.
**Phone optimization:** Output at 16kHz, downsample to 8kHz G.711 for SIP. Apply light compression for phone speaker clarity.
**Prosody:** Kokoro handles natural prosody natively. For questions, ensure rising intonation. For statements, falling. For lists, maintain consistent pacing.
**Pronunciation:** Common mispronunciations to test and fix: HVAC (say "H-V-A-C"), Dr. (say "Doctor"), St. (context: "Street" vs "Saint"), appt (say "appointment"), est. (say "estimated").
**Sentence chunking:** Break LLM output at sentence boundaries. Start TTS on first complete sentence while LLM generates the rest. Do not wait for full response.
**Multi-turn stability:** Same voice embedding used for all turns in a call. No voice drift.
**Presets:** 6 standard (professional female/male, warm female/male, neutral, energetic). 40 industry-optimized for Business+.
**Eval:** Blind A/B test 50 calls: Kokoro vs Deepgram Aura-2. Metric: "which sounds more human?" Must achieve >45% preference (within margin of error of 50/50) before deploying.
**Deployment:** Single L4 GPU on RunPod. 96x real-time. One GPU handles 96 concurrent TTS streams.
**Cost:** $0.00012/min (GPU amortized). vs Deepgram $0.015/min.

---

## SECTION 7 — VOICE IDENTITY PLAN

**Preset voices:** Generated by running Kokoro with different speaker embeddings. Each preset is a JSON config file containing the embedding vector + metadata (name, gender, tone, recommended industries).
**Custom cloning (Business+):** Customer uploads 10-30 seconds of reference audio via `/api/voice/clone`. Fish Speech S1-mini extracts speaker embedding. Embedding stored in Supabase as JSONB on workspace.voice_profiles. Used at inference time by passing to Kokoro/Fish Speech.
**Consent:** Voice clone creation requires explicit checkbox: "I confirm I have the right to use this voice recording and consent to AI voice generation." Stored with timestamp and IP.
**Version control:** Each voice profile has a version number. When re-cloned, previous version is preserved. Rollback available in voice settings.
**Abuse prevention:** Rate limit clone creation to 3/day per workspace. Audio analyzed for known copyrighted voices (future). Manual review queue for Scale/Enterprise.
**Self-serve:** Solo/Business can clone from presets only. Business can upload custom audio (3 slots). Scale gets 10 slots. Enterprise unlimited with approval workflow.
**Storage:** Embeddings are small (~1KB). Audio references stored in Supabase Storage with workspace-scoped access. Encrypted at rest.

---

## SECTION 8 — REALTIME ORCHESTRATION PLAN

**Pipeline:** Telnyx SIP → Pipecat → [Silero VAD → Canary STT → Llama 3/Claude LLM → Kokoro TTS] → Telnyx SIP

**End-of-turn detection:** Silero VAD detects 700ms of silence after speech. Pipecat's UserIdleDetector triggers LLM generation. If caller says a complete sentence ending with a question ("Can I book for Tuesday?"), VAD + punctuation from STT trigger immediately without waiting for silence.

**Interruption handling:** If caller starts speaking while TTS is playing: immediately stop TTS audio, flush TTS buffer, feed new caller audio to STT, process new transcript. Response latency after interruption: <1s.

**Low-confidence behavior:** If LLM confidence <0.85 on a booking-critical turn (date, time, service type): repeat back to confirm. "Just to confirm, you said Tuesday at 3pm for a cleaning. Is that correct?" Never book without confirmation on low-confidence turns.

**Latency budget per turn:**
- VAD end-of-speech detection: 50ms
- STT final transcript: 300ms
- LLM first token: 500ms
- TTS first audio byte: 100ms
- **Total end-of-speech to first-audio: 950ms target, 1200ms max**

**Silence handling:** If caller is silent for 5 seconds after AI speaks, prompt: "Are you still there?" If silent for 10 more seconds: "It sounds like we got disconnected. I will send you a text message. Goodbye." → hang up → auto-SMS.

**Transfer-to-human:** Agent config specifies transfer number. Warm transfer: AI says "Let me connect you with [name]. One moment." → SIP REFER to transfer number with X-Context header containing conversation summary. Cold transfer: direct REFER without introduction.

**After-hours:** Agent config specifies business hours + timezone. Outside hours: modified greeting ("Thanks for calling [business]. We are currently closed.") → capture name + need → book next-available → SMS confirmation → needs-attention queue.

**Component failure:** If any component fails mid-call, do NOT drop the call. Play pre-recorded fallback: "I apologize, I am having trouble. Let me transfer you." → attempt transfer to human. If transfer fails → voicemail recording.

---

## SECTION 9 — VOICE QUALITY EVAL FRAMEWORK

### Automated metrics (every call)
- **Answer latency:** Ring to first AI audio. Target: <3s. Alert if >5s.
- **Response latency:** End of caller speech to first AI audio. Target: <1.2s. Alert if >2s.
- **Interruption recovery:** Time from caller barge-in to AI stopping. Target: <200ms.
- **Call completion rate:** % of calls that end normally vs drop/error. Target: >99%.
- **Transcript confidence:** Average STT confidence score. Target: >0.85.
- **Fallback rate:** % of turns using fallback (Deepgram/Claude). Target: <5% at steady state.

### Sampled metrics (weekly, 50 random calls)
- **WER:** Human-rated word error rate on 50 random 30-second segments. Target: <7%.
- **Naturalness MOS:** Mean Opinion Score (1-5) rated by 3 human evaluators. Target: >3.8.
- **Task completion:** Did the AI correctly handle the caller's request? (book/transfer/capture info). Target: >90%.

### Reject criteria (block deployment)
- Answer latency >5s on >5% of calls
- WER >10% on phone audio
- Naturalness MOS <3.5
- Task completion <85%
- Fallback rate >20%

### Regression testing
Before any voice component change: run the full eval suite on 100 test calls (automated + sampled). Compare to baseline. Block deployment if any metric degrades by >10%.

---

## SECTION 10 — DATA MODEL

### Core entities (Supabase PostgreSQL)

```
users (id, email, email_confirmed_at, created_at)
workspaces (id, owner_id, name, plan, status, trial_ends_at, stripe_customer_id, stripe_subscription_id, created_at)
team_members (id, workspace_id, user_id, role, invited_at, joined_at)
contacts (id, workspace_id, name, phone, email, state, tags[], opt_out, total_revenue_attributed, created_at, last_activity_at)
agents (id, workspace_id, name, template, voice_id, personality, is_live, test_call_completed, created_at)
```

### Communication entities

```
call_sessions (id, workspace_id, contact_id, agent_id, direction, phone_from, phone_to, status, started_at, ended_at, duration_ms, outcome, transcript, recording_url, stt_model, tts_model, llm_model, voice_preset, answer_latency_ms, avg_response_latency_ms, interruption_count, fallback_events[], cost_cents, created_at)
messages (id, workspace_id, contact_id, channel, direction, content, status, sent_at, delivered_at, cost_cents)
conversations (id, workspace_id, contact_id, channel, last_message_at, status)
```

### Workflow entities

```
campaigns (id, workspace_id, name, type, status, audience_filter, created_at, launched_at)
campaign_enrollments (id, campaign_id, contact_id, status, current_step, enrolled_at, completed_at)
sequences (id, workspace_id, name, trigger_type, is_active, created_at)
sequence_steps (id, sequence_id, step_order, channel, delay_minutes, template_content, stop_on_reply, stop_on_booking)
sequence_enrollments (id, sequence_id, contact_id, workspace_id, status, current_step, next_step_due_at, enrolled_at)
bookings (id, workspace_id, contact_id, service_type, scheduled_at, status, estimated_value, calendar_event_id, created_at)
```

### Billing entities

```
stripe_webhook_events (id, stripe_event_id, event_type, processed_at, handler_result)
usage_records (id, workspace_id, period_start, period_end, minutes_used, sms_sent, overage_cents)
phone_numbers (id, workspace_id, number_e164, provider, provider_sid, status, monthly_cost_cents, setup_fee_cents, created_at)
```

### Voice entities

```
voice_profiles (id, workspace_id, name, type, speaker_embedding, source_audio_url, consent_captured_at, consent_ip, version, is_active, created_at)
voice_quality_evals (id, call_session_id, answer_latency_ms, avg_response_latency_ms, wer_sampled, naturalness_mos, task_completed, evaluated_at)
```

### Tracking entities

```
audit_logs (id, workspace_id, user_id, action, resource_type, resource_id, metadata, created_at)
failure_events (id, workspace_id, component, error_message, call_session_id, created_at)
cost_events (id, workspace_id, call_session_id, component, amount_cents, created_at)
```

---

## SECTION 11 — OBSERVABILITY PLAN

### Product analytics (PostHog)

Events: signup_started, signup_completed, onboarding_step_completed (step 1-5), first_call_received, first_booking, first_revenue_attributed, upgrade_clicked, plan_changed, campaign_created, campaign_launched, contact_imported, feature_first_use (per sidebar item), cancellation_initiated, cancellation_completed.

### Voice analytics (custom dashboard)

Metrics: answer_latency_p50/p95/p99, response_latency_p50/p95/p99, call_completion_rate, fallback_rate, avg_call_duration, calls_per_hour, concurrent_calls, cost_per_minute_actual.

### Infrastructure monitoring (Sentry + custom)

Alerts:
- API error rate >1% in 5 minutes → Sentry alert
- Call answer latency >5s → Slack/email alert
- Cron job failure → Sentry alert
- Stripe webhook processing failure → Sentry alert + log to system_webhook_failures
- Voice component fallback rate >10% → email alert
- GPU utilization >90% → auto-scale trigger (RunPod)

### Executive dashboard (internal, weekly)

MRR, new signups, trial-to-paid rate, churn rate, ARPU, total revenue recovered (all customers), average call quality score, support tickets opened, top failure reasons.

---

## SECTION 12 — AGENT CONTROLS

**Presets:** Inbound Agent, Outbound Agent, Appointment Setter, After-Hours, Support, Custom.

**Allowed actions per preset:** Inbound: book, transfer, capture info, send SMS. Outbound: call, qualify, book, send SMS. Appointment Setter: call, qualify, book, reschedule. After-Hours: capture info, book next-available, send SMS. Support: answer FAQ, create ticket, transfer.

**Forbidden actions (all presets):** Never promise pricing without configuration. Never diagnose medical conditions. Never give legal advice. Never share other contacts' information. Never agree to terms on behalf of the business.

**Escalation rules:** Emergency keywords (fire, ambulance, police, threat) → immediate transfer. High-value caller (recognized contact with >$1K attributed revenue) → offer to transfer to owner. Low confidence (<0.7 on 2 consecutive turns) → "Let me have someone call you back."

**Booking constraints:** Only book within configured business hours. Only book in available calendar slots. Minimum 30-minute buffer between appointments (configurable). Maximum 4 weeks out (configurable).

**Retry rules (outbound):** Max 3 attempts per contact per campaign. 24-hour minimum between attempts. After 3 no-answers: mark as "unreachable," stop attempts.

**Sandbox mode:** Agent processes calls but all outbound actions (SMS, bookings, CRM updates) are logged in a "sandbox_actions" table but NOT executed. Owner reviews and approves. Toggle in agent settings.

**Dangerous configurations to block:** maxCallsPerContactPerDay > 3 (TCPA risk). Business hours outside 8am-9pm local (compliance risk). Booking outside calendar availability. Agent going live without test call.

---

## SECTION 13 — SYSTEM HARDENING

### Likely weak points

1. Checkout returning 200 for errors (confirmed — must fix)
2. Billing status hardcoded limits (confirmed — must fix)
3. No dunning (confirmed — silent churn)
4. No email verification (confirmed — abuse vector)
5. No rate limiting on signup/provisioning (confirmed — abuse vector)
6. Trial end date inconsistency (confirmed — 3 calculation sites)
7. Webhook logging empty branches (confirmed — some events untracked)
8. Agent go-live without test call (confirmed — misconfiguration risk)
9. No empty states (confirmed — blank screens)
10. No onboarding error boundary (confirmed — white screen on crash)

### Likely hidden bugs

- Calendar booking may fail silently if Google Calendar token is expired (no token refresh check before booking)
- Outbound campaign may attempt to call contacts who have opted out if opt-out happened between campaign creation and execution
- Usage overage calculation may miss calls that span billing period boundaries
- Team member invitation may not check if email is already associated with another workspace

### Likely support-ticket generators

- "I signed up but can't access the dashboard" (email not verified)
- "I connected my number but calls aren't being answered" (agent not live, or no test call)
- "I got charged but my account shows trial" (webhook processing delay)
- "The AI said something wrong on a call" (no way to review transcripts easily)

---

## SECTION 14 — BILLING PLAN

### Plans (billing-plans.ts — single source of truth)

Solo $49/mo. Business $297/mo. Scale $997/mo. Enterprise custom.

### Usage metering

Minutes tracked per call via call_sessions.duration_ms. Aggregated per billing period in usage_records. Displayed in dashboard and billing page. Overage calculated at period end: (minutes_used - included_minutes) * overage_rate_cents.

### Overages

Solo: $0.30/min. Business: $0.20/min. Scale: $0.12/min. Billed as Stripe invoice items via usage-overage cron (1st of month).

### Dunning (4-stage)

Failure 1 (Day 0): Email "Payment failed." Stripe auto-retries.
Failure 2 (Day 3): Email "Second attempt failed. Service pauses in 4 days."
Failure 3 (Day 5): Email "Final notice."
Failure 4 (Day 7): Workspace status='payment_failed'. Banner. 48-hour call grace. Then calls stop.

### Cancellation

Survey → save offer (1 month free on annual) → export option → confirmation. Subscription ends at period end. Data retained 30 days.

### Guardrails against surprise bills

Usage bar in dashboard (green/amber/red). Email at 80% and 100% of included minutes. Overage rate shown clearly in billing page. No auto-upgrade without explicit consent.

---

## SECTION 15 — QA MASTER PLAN

### Top 50 test cases

**Billing (1-12):** 1. Checkout error returns proper HTTP status. 2. Checkout creates Stripe session with trial_end. 3. Webhook duplicate rejected. 4. payment_failed triggers dunning email. 5. Billing status minutes match billing-plans.ts. 6. Overage calculated correctly at period end. 7. Plan upgrade mid-cycle prorates. 8. Cancellation sets end-of-period. 9. Reactivation charges correctly. 10. Invoice generated for overage. 11. Payment success resets failure count. 12. Workspace paused after 4 failures.

**Auth (13-18):** 13. Signup rate limited 5/hour. 14. Email verification required. 15. Expired session redirects. 16. Unverified email redirects to /verify-email. 17. Password reset flow. 18. Team invitation accept flow.

**Phone (19-22):** 19. Provisioning rate limited 5/hour. 20. Invalid E.164 rejected. 21. Number purchase creates DB record + Stripe invoice item. 22. Number release cancels billing.

**Inbound (23-30):** 23. Answer latency <3s. 24. Intent detection accuracy on booking/question/complaint/emergency. 25. Booking creates calendar event. 26. After-hours greeting + next-available booking. 27. Missed call → SMS within 30s. 28. Transfer includes context summary. 29. Emergency keyword triggers immediate transfer. 30. Voice failure → pre-recorded fallback.

**Outbound (31-38):** 31. Campaign launch blocked without phone. 32. Confirmation modal shown. 33. Suppression enforced (1 call/day). 34. Business hours enforced. 35. Opt-out stops sequence immediately. 36. Voicemail detection triggers fallback. 37. No-answer after 3 attempts marks unreachable. 38. DNC check on Business+.

**Follow-up (39-42):** 39. Enrollment triggers on call outcome. 40. Step delays accurate. 41. Stop-on-reply works. 42. Stop-on-booking works.

**Dashboard (43-46):** 43. Revenue recovered displays correctly. 44. Needs-attention populates. 45. Minutes bar thresholds correct. 46. Activity feed updates.

**Agent (47-50):** 47. Go-live blocked without test call. 48. Sandbox mode logs but doesn't execute. 49. Agent config persists across page reload. 50. Voice preset plays correctly.

### Top 20 launch-killers

1. Checkout returns 200 for errors. 2. No dunning emails. 3. No email verification. 4. No rate limiting. 5. Blank screens (no empty states). 6. Agent go-live without test call. 7. Onboarding crashes (no error boundary). 8. Trial date inconsistency. 9. Billing status wrong minutes. 10. No cancellation flow. 11. Calendar sync unverified. 12. No voice failure fallback. 13. No trial grace period. 14. Webhook dedup fragile. 15. No signup rate limit. 16. No phone provision rate limit. 17. Change-plan accepts wrong param name. 18. No founder identity. 19. No /security page. 20. No social proof.

---

## SECTION 16 — WHAT IS STILL MISSING

1. Dunning emails (4-stage)
2. Trial grace period logic
3. Cancellation flow + survey
4. Email verification page (/verify-email)
5. Empty states on all /app pages
6. Loading skeletons (replace spinners)
7. Onboarding error boundary
8. Agent go-live gate (test call required)
9. Sandbox mode for agents
10. /security page
11. /results page
12. Founder photo/name in footer
13. Product tour (first-login tooltips)
14. Settings progressive disclosure (group 16+ pages)
15. Voice failure fallback chain
16. Call quality scoring pipeline
17. Cost-per-conversation tracking
18. Churn-risk scoring
19. Customer data export
20. Status page

---

## SECTION 17 — WHAT TO CUT / HIDE / DELAY

**Cut:** 90 dormant enterprise cron routes. Move to /deprecated directory.

**Hide:** Flow builder (Scale+ only). API docs (until Scale customers). Multi-location features (gate behind Scale).

**Delay:** Self-hosted TTS/STT/LLM (Month 4+). Mobile native app. Blog to 50+ articles. Agency dashboard. Push notifications. Data export. A/B testing. Status page. Event-driven speed-to-lead.

**Do not build:** Free tier. WhatsApp as launch priority. Custom voice cloning on Solo. Two-way CRM sync for Business (webhook is sufficient). Marketplace for industry packs.

**Distractions to avoid:** Perfecting the voice stack before having customers. Building agency features before direct customers. Writing blog content before the product is proven. A/B testing headlines with zero traffic.

---

## SECTION 18 — BUILD ORDER

### A. Must build immediately (Week 1-2)
1. Fix checkout HTTP status codes — billing broken without this
2. Fix billing status plan limits — usage tracking wrong without this
3. Add email verification — abuse prevention
4. Add rate limiting (signup, phone provisioning) — abuse prevention
5. Store trial_ends_at on workspace — single source of truth
6. Add dunning emails — prevent silent churn
7. Add trial grace period — 3-day buffer
8. Add empty states to all /app pages — UX baseline
9. Add error boundary to /activate — crash prevention
10. Block agent go-live without test call — misconfiguration prevention

### B. Build next (Week 3-4)
11. Cancellation flow + survey
12. PostHog event tracking (all events listed in Section 11)
13. /results page
14. /security page
15. Fix FAQ JSON-LD mismatch
16. Expand industries to 8+
17. Founder photo/name in footer
18. Homepage ROI calculator range selector
19. Move ROI calculator to position 3
20. /verify-email page

### C. Build after stabilization (Month 2-3)
21. Pipecat voice migration (Phase 2)
22. Telnyx telephony migration (Phase 6)
23. Loading skeletons
24. Product tour
25. Settings progressive disclosure
26. 3 industry landing pages (1500+ words)
27. Comparison pages (vs Smith.ai, vs Ruby)
28. Blog to 15+ articles
29. Sandbox mode for agents
30. Call quality scoring pipeline

### D. Do not build yet (Month 4+)
31. Self-hosted TTS (Kokoro)
32. Self-hosted STT (Canary)
33. Self-hosted LLM (Llama 3 8B)
34. Voice cloning infrastructure
35. Agency partner dashboard
36. Push notifications
37. Data export
38. Status page
39. A/B testing
40. API documentation

---

## SECTION 19 — CURSOR IMPLEMENTATION BRIEF

### Backend services to build
- `src/lib/email/dunning.ts` — 4-stage dunning email templates via Resend
- `src/app/verify-email/page.tsx` — email verification page
- `src/app/app/settings/billing/cancel/page.tsx` — cancellation flow with survey
- `src/app/results/page.tsx` — customer results page
- `src/app/security/page.tsx` — security/trust page

### Hardening work (exact files)
- `src/app/api/billing/checkout/route.ts` — fix all error responses from 200 to proper status codes
- `src/app/api/billing/status/route.ts` — import from billing-plans.ts, delete hardcoded map
- `src/app/api/billing/webhook/route.ts` — add SELECT-before-INSERT dedup, add dunning handler for invoice.payment_failed, audit all logging branches
- `src/app/api/billing/change-plan/route.ts` — accept only plan_id, reject planId
- `src/app/api/auth/signup/route.ts` — add rate limiting (5/hour per IP)
- `src/app/api/phone/provision/route.ts` — add rate limiting (5/hour per workspace)
- `src/app/activate/page.tsx` — wrap in error boundary

### Frontend work
- Empty states for: Calls, Contacts, Inbox, Campaigns, Analytics, Follow-Ups pages
- ROI calculator: replace $650 default with range selector ($200-$10,000+)
- Homepage: swap ROI Calculator and HowItWorks positions in page.tsx
- Industries: expand from 5 to 8+ cards
- Footer: add founder name and photo
- Agent settings: disable Go Live toggle until test_call_completed=true

### Data model additions
- `workspaces.trial_ends_at` column (timestamptz)
- `voice_profiles` table (per Section 10)
- `voice_quality_evals` table (per Section 10)
- `cost_events` table (per Section 10)

### Tracking to add
- PostHog events (per Section 11)
- Call quality metrics in call_sessions (answer_latency_ms, avg_response_latency_ms, fallback_events)

### Build rules
- NO middleware.ts (breaks Vercel)
- NO react-hook-form (use native state + Zod)
- billing-plans.ts is single source of truth
- All /app/* uses light theme CSS variables
- All new strings use i18n t("key")
- 529 tests must stay green

---

## SECTION 20 — FINAL DECISION STACK

| # | Decision | Answer |
|---|----------|--------|
| 1 | Most important thing to build now | Fix checkout HTTP status codes. Nobody can reliably pay without this. |
| 2 | Biggest technical risk | Checkout returning 200 for errors. A customer tries to pay, gets silently redirected to a success page with no subscription created. |
| 3 | Biggest product risk | Agent going live without a test call. A misconfigured AI answers a real customer's phone and says something wrong. |
| 4 | Biggest trust risk | Zero social proof + zero founder identity. The site looks like it could disappear tomorrow. |
| 5 | Biggest margin risk | Staying on Vapi at $0.035/min when Pipecat is free. At 1,000 customers: $17,500/mo wasted. But this is a Month 2 problem, not a Week 1 problem. |
| 6 | Biggest scalability risk | No dunning. Every failed payment is a customer who silently churns with no recovery attempt. At 100 customers with 5% card failure rate, that is 5 customers/month lost to no dunning. |
| 7 | Clearest voice-stack advantage | $0.007/min vs competitors at $0.10-$0.30/min. 14x-43x cheaper. This makes price wars trivially winnable and margins extraordinary. |
| 8 | Clearest next move | Fix the 10 structural billing/auth defects in Phase 1. Then get 1 real customer. |
| 9 | Clearest build order | Week 1: billing fixes + rate limits + empty states. Week 2: dunning + grace period + cancellation. Week 3: /results + /security + industries. Week 4: first customer live. |
| 10 | "Fully built and strong enough to scale" | Every billing path returns correct HTTP status. Every failure has a fallback. Every page has an empty state. Every call has quality metrics. Dunning recovers failed payments. One real customer is live with real revenue-recovered data on the homepage. Voice migration to Pipecat is complete. That is the bar. |

---

*End of V14. 20 sections. The product is built. The structural defects are identified. The voice roadmap is phased. The build order is clear. Execute Phase 1 this week.*
