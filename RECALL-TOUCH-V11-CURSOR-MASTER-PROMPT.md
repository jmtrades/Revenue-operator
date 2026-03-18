# RECALL TOUCH — V11 DEFINITIVE CURSOR MASTER PROMPT

You are the engineering team for Recall Touch. This is your COMPLETE specification. Every system, every page, every component, every behavior, every cost decision. Written after reading every source file and verified against 529 passing tests and 0 TypeScript errors.

**Do not improvise. Do not add features not listed. Do not use placeholder data that looks real. Do not skip steps. Read this entire document before writing a single line of code.**

---

## PART 0: WHAT YOU ARE BUILDING

Recall Touch is the AI Revenue Operations platform. It answers every inbound call, runs outbound campaigns, executes multi-step follow-up sequences across voice + SMS + email, books appointments, recovers no-shows, reactivates dead leads, chases quotes, and measures every dollar recovered — automatically.

NOT an AI receptionist. NOT an answering service. NOT a CRM. NOT a dialer. The AI system that captures, qualifies, books, follows up, recovers, and attributes every dollar of revenue.

**Two engines:**
1. **INBOUND** — AI answers every call 24/7, captures leads, books appointments, routes emergencies, triggers follow-up sequences.
2. **OUTBOUND** — AI initiates calls, runs 10 campaign types, executes follow-up sequences, recovers no-shows, reactivates cold leads, chases quotes.

The outbound engine is what separates Recall Touch from every competitor. Competitors answer calls. Recall Touch answers calls AND proactively chases revenue.

**Three modes:** Solo (self-employed), Sales (SDR teams/setters), Business (service businesses — default).

**Core loop:** Missed Call → AI Answers → Captures Lead → Books Appointment → Confirms SMS → Reminds 24h+1h → If No-Show: Recovery → If Cold: Reactivation → Revenue Recovered (measured, displayed, proven)

---

## PART 1: SELF-HOSTED VOICE STACK — MAXIMUM CHEAPNESS

### 1.1 The Problem With Outsourcing

Current Phase 1 costs $0.099/min because we're renting from middlemen:
- Vapi: $0.035/min (orchestration we can do ourselves)
- Deepgram TTS: $0.015/min (open-source models match this quality)
- Deepgram STT: $0.015/min (open-source models match this quality)
- Claude Haiku: $0.024/min (self-hosted Llama 3 8B costs $0.002/min)
- Twilio: $0.010/min (Telnyx SIP trunking costs $0.004/min)

**Total outsourced: $0.099/min. Total self-hosted: $0.006/min.** That's a 94% cost reduction.

### 1.2 The Fully Self-Hosted Stack

| Component | Outsourced (Phase 1) | Self-Hosted (Phase 3) | Savings |
|-----------|---------------------|----------------------|---------|
| Orchestration | Vapi ($0.035/min) | **Pipecat** (open source, $0) | 100% |
| Text-to-Speech | Deepgram Aura-2 ($0.015/min) | **Kokoro 82M** (self-hosted on L4 GPU, $0.00012/min) | 99.2% |
| Speech-to-Text | Deepgram Nova-2 ($0.015/min) | **Canary-1B-Flash** (self-hosted on L4 GPU, $0.000006/min) | 99.96% |
| LLM Reasoning | Claude Haiku ($0.024/min) | **Llama 3.3 8B** (self-hosted on L4 GPU, $0.002/min) | 92% |
| Telephony | Twilio ($0.010/min) | **Telnyx SIP** ($0.004/min) | 60% |
| **TOTAL** | **$0.099/min** | **$0.006/min** | **94%** |

### 1.3 GPU Infrastructure

**One RunPod Community Cloud RTX 4090 ($0.34/hr = $245/mo)** runs ALL THREE models simultaneously:
- Kokoro 82M TTS: ~2GB VRAM, 96x real-time
- Canary-1B-Flash STT: ~4GB VRAM, 1,000x real-time
- Llama 3.3 8B (INT8 quantized): ~8GB VRAM, ~5,000 tokens/sec

Total VRAM needed: ~14GB. RTX 4090 has 24GB. Plenty of headroom.

**Cost math:**
- 1 GPU at $0.34/hr = $245/mo
- Handles 96+ concurrent TTS streams (bottleneck)
- At average 3-min call duration: 96 × 20 calls/hr = 1,920 calls/hr = 46,080 calls/day
- At 500 Business customers averaging 500 min/mo each = 250,000 min/mo = ~8,333 min/day
- 8,333 min/day ÷ (46,080 calls × 3 min) = 6% GPU utilization

**One $245/mo GPU supports ~500 Business customers.** Add a second for redundancy = $490/mo total infrastructure for $148,500/mo in revenue (500 × $297). That's 0.3% of revenue on infrastructure.

### 1.4 Each Self-Hosted Component

#### Pipecat (Voice Orchestration) — FREE

Open-source framework by Daily.co. Handles the full pipeline: Telephony → STT → LLM → TTS → Telephony.

**What it replaces:** Vapi ($0.035/min platform fee).

**Architecture:**
```
Telnyx SIP → Pipecat Pipeline → [Canary STT → Llama 3 8B → Kokoro TTS] → Telnyx SIP
```

**Key files to create:**
```
services/voice/
├── pipecat-server.py          # Main pipeline server
├── agents/                    # Agent behavior configs per template
│   ├── inbound_agent.py       # Default inbound call handler
│   ├── outbound_agent.py      # Outbound campaign caller
│   ├── appointment_setter.py  # Booking-focused agent
│   └── after_hours.py         # After-hours handler
├── tts/
│   ├── kokoro-service.py      # Kokoro TTS gRPC service
│   └── voices/                # Speaker embedding configs
├── stt/
│   └── canary-service.py      # Canary STT streaming service
├── llm/
│   └── llama-service.py       # Llama 3 8B inference service (vLLM)
├── Dockerfile                 # Multi-model GPU container
└── docker-compose.yml         # Full stack orchestration
```

**Deployment:** Docker container on RunPod Serverless or always-on Pod. Health check endpoint at `/health` for heartbeat cron.

#### Kokoro 82M (Text-to-Speech) — $0.00012/min

- 82M parameters, Apache 2.0 license (free commercial use forever)
- Ranked #2 on TTS Arena, just behind ElevenLabs
- TTFB <100ms — indistinguishable from cloud APIs in conversation
- 96x real-time on a single GPU — one GPU handles 96 concurrent voice streams

**Voice presets (generate once, use forever):**
- 6 standard voices for Solo: professional female, professional male, warm female, warm male, neutral, energetic
- 40 voices for Business+: industry-optimized (dental, legal, HVAC, med spa, real estate, sales SDR, etc.)

**Voice cloning (Business+ only):** Use Fish Speech S1-mini (500M params, 1,339 ELO, Apache 2.0). Customer uploads 10-30 seconds of reference audio → Fish Speech extracts speaker embedding → stored per workspace → used at inference time. Business: 3 clone slots. Scale: 10. Enterprise: unlimited.

#### Canary-1B-Flash (Speech-to-Text) — $0.000006/min

- 1B parameters, Apache 2.0, by NVIDIA
- 1,000x real-time speed — processes 1,000 minutes of audio per minute of compute
- ~6.7% WER — competitive with Deepgram Nova-2
- Streaming-native (RNN-Transducer architecture)
- One GPU handles thousands of concurrent transcriptions

#### Llama 3.3 8B (LLM Reasoning) — $0.002/min

- 8B parameters, Meta license (free commercial use)
- INT8 quantized fits in ~8GB VRAM
- ~5,000 tokens/sec on RTX 4090
- Run via vLLM for maximum throughput

**System prompt per agent template:**
Each agent template (inbound, outbound, appointment_setter, after_hours, etc.) has a system prompt that defines: allowed actions, forbidden actions, escalation triggers, tone, compliance rules, knowledge base context, booking rules, and business-specific information.

**When Llama 3 8B is NOT enough:** For complex objection handling, nuanced multi-turn booking conversations, or enterprise customers who need higher quality — fall back to Claude Haiku via API. Implement a confidence routing layer: if Llama's response confidence is below threshold (0.85), escalate to Claude. This keeps ~90% of calls on Llama ($0.002/min) and ~10% on Claude ($0.024/min), averaging $0.004/min.

#### Telnyx SIP Trunking (Telephony) — $0.004/min

- US domestic termination: $0.004/min (vs Twilio $0.010/min)
- US domestic origination: $0.003/min
- Phone number: $1/mo (vs Twilio $1.15/mo)
- SMS: $0.004/segment (vs Twilio $0.0079)
- Millisecond billing (no rounding up to full minutes)

**Migration from Twilio:** Telnyx provides number porting. Keep existing Twilio numbers, port them to Telnyx. Zero downtime migration.

**Key changes in codebase:**
- Replace `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` with `TELNYX_API_KEY`
- Replace Twilio SDK calls with Telnyx SDK calls in `src/lib/telephony/`
- SIP endpoint from Pipecat connects to Telnyx SIP trunk instead of Twilio

### 1.5 Final Cost Per Minute: $0.006

| Component | Cost/Min | Monthly @ 500 min |
|-----------|---------|-------------------|
| Pipecat | $0.000 | $0.00 |
| Kokoro TTS | $0.00012 | $0.06 |
| Canary STT | $0.000006 | $0.003 |
| Llama 3 8B (90%) + Claude fallback (10%) | $0.004 | $2.00 |
| Telnyx telephony | $0.004 | $2.00 |
| **Total** | **$0.006** (+ ~$0.002 amortized GPU) | **$4.06** |

**Including amortized GPU cost:** $245/mo GPU ÷ 250,000 min/mo capacity = $0.001/min. Total: **$0.007/min.**

### 1.6 Margin at $0.007/min

| Tier | Revenue | COGS (self-hosted) | Gross Margin |
|------|---------|-------------------|-------------|
| Solo (100 min) | $49 | $0.70 | **98.6%** |
| Business (500 min) | $297 | $3.50 | **98.8%** |
| Scale (3,000 min) | $997 | $21.00 | **97.9%** |

**98% gross margin on a voice product.** This is pure software economics. No competitor running on Vapi ($0.13–$0.31/min) or paying ElevenLabs/Deepgram can touch this.

### 1.7 Phased Migration

| Phase | Timeline | What Changes | Cost/Min |
|-------|----------|-------------|---------|
| Phase 1 (current) | Now | Vapi + Deepgram + Claude + Twilio | $0.099 |
| Phase 2 | Week 1–2 | Replace Vapi → Pipecat | $0.064 |
| Phase 3 | Week 2–3 | Replace Deepgram TTS → Kokoro | $0.049 |
| Phase 4 | Week 3–4 | Replace Deepgram STT → Canary | $0.034 |
| Phase 5 | Week 4–5 | Replace Claude → Llama 3 8B (with Claude fallback) | $0.012 |
| Phase 6 | Week 5–6 | Replace Twilio → Telnyx | $0.007 |

Each phase ships independently. Roll back any phase instantly if quality drops.

---

## PART 2: VERIFIED TECH STACK

| Layer | Technology | Version/Source |
|-------|-----------|---------------|
| Framework | Next.js App Router | 16.1.6 |
| UI | React | 19.2.3 |
| Language | TypeScript 5 | 0 errors |
| Styling | Tailwind CSS 4 | @theme directives in globals.css, NOT tailwind.config.js |
| CSS System | CSS Variables in globals.css | 618 lines, light theme |
| Database | Supabase PostgreSQL + RLS | @supabase/supabase-js 2.95.3 |
| Auth | Supabase Auth + HMAC-SHA256 | 30-day TTL |
| Payments | Stripe | 20.3.1 |
| Voice Orchestration | Pipecat (self-hosted) | Open source |
| TTS | Kokoro 82M (self-hosted) | Apache 2.0 |
| STT | Canary-1B-Flash (self-hosted) | Apache 2.0 |
| LLM | Llama 3.3 8B (self-hosted) + Claude Haiku fallback | Apache 2.0 / Anthropic |
| Premium TTS | Fish Speech S1-mini (self-hosted) | Apache 2.0 |
| Telephony | Telnyx SIP | |
| SMS | Telnyx SMS | |
| Cache/Rate Limit | Upstash Redis | @upstash/ratelimit |
| Animation | Framer Motion | 12.35.2 |
| Icons | Lucide React | 0.575.0 |
| Charts | Recharts | 3.8.0 |
| Flow Builder | @xyflow/react | 12.10.1 |
| i18n | next-intl | 4.8.3 |
| Email | Resend | |
| Analytics | PostHog | posthog-js |
| Error Tracking | Sentry | @sentry/nextjs 10.44.0 |
| Forms | Native React state + Zod | NO react-hook-form |
| Toasts | Sonner | 2.0.7 |

---

## PART 3: DESIGN SYSTEM

### CSS Variables (Source of truth: globals.css)

**Backgrounds:** `--bg-primary: #FAFAF8` (warm white), `--bg-surface: #FFFFFF`, `--bg-hover: #F3F4F6`

**Accents:** `--accent-primary: #0D6E6E` (teal), `--accent-secondary: #16A34A` (green), `--accent-warning: #F59E0B`, `--accent-danger: #DC2626`

**Text:** `--text-primary: #1A1A1A`, `--text-secondary: #6B7280`, `--text-tertiary: #9CA3AF`

**Borders:** `--border-default: #E5E7EB`, `--border-active: #0D6E6E`

**Cards:** `--card-radius: 16px`, `--card-padding: 32px`, `--radius-btn: 12px`

**Fonts:** DM Sans (body), Playfair Display (marketing headlines), Geist Mono (code), JetBrains Mono (mono UI)

**CRITICAL:** Marketing pages = dark background (CSS overrides in .marketing-section). App dashboard (/app/*) = LIGHT theme using root variables. Do not use zinc-900, black/30, or dark backgrounds in /app/*.

---

## PART 4: PRICING & BILLING

### Plans (Source of truth: billing-plans.ts)

| Plan | Monthly | Annual | Minutes | Overage | Agents | Seats | Daily Outbound | SMS Cap |
|------|---------|--------|---------|---------|--------|-------|---------------|---------|
| Solo | $49 | $39/mo | 100 | $0.30/min | 1 | 1 | 10 | 500 |
| Business | $297 | $247/mo | 500 | $0.20/min | 3 | 5 | 100 | 2,000 |
| Scale | $997 | $847/mo | 3,000 | $0.12/min | 10 | ∞ | 500 | 10,000 |
| Enterprise | Custom | Custom | ∞ | Negotiated | ∞ | ∞ | ∞ | ∞ |

### Feature Gates (18 flags)

Solo gets: appointmentBooking, missedCallRecovery, smsEmail.

Business adds: noShowRecovery, reactivationCampaigns, outboundCampaigns, industryTemplates, voiceFollowUp, revenueAnalytics, crmWebhook, premiumVoices.

Scale adds: outboundPowerDialer, advancedAnalytics, nativeCrmSync, apiAccess, prioritySupport.

Enterprise adds: whiteLabel, sso.

**When gated:** Show upgrade prompt: "No-show recovery is available on Business ($297/mo). Upgrade to automatically recover missed appointments."

### Usage Warnings

- 80%: Amber bar + in-app banner + email via Resend
- 100%: Red bar + banner + email: "Additional usage: ${rate}/min"

### Billing Rules

- `billing-plans.ts` is the SINGLE source of truth. Never hardcode tier data elsewhere.
- All prices in billing-plans.ts are CENTS (4900 = $49.00).
- Overages via Stripe invoice items in `reportUsageOverage()`.

---

## PART 5: APP ARCHITECTURE

### Sidebar (9 items — do not add)

1. /app/dashboard — Dashboard (LayoutList)
2. /app/calls — Calls (PhoneCall)
3. /app/contacts — Contacts (Users)
4. /app/inbox — Inbox (MessageSquare)
5. /app/calendar — Calendar (Calendar)
6. /app/follow-ups — Follow-Ups (ListOrdered) — **Fix: change to `t("nav.followUps")`**
7. /app/campaigns — Campaigns (Megaphone)
8. /app/analytics — Analytics (BarChart3)
9. /app/settings — Settings (Settings)

**Mobile:** 3 tabs (Dashboard, Calls, Inbox) + More overflow. Cmd+K CommandPalette.

### Dashboard (UnifiedDashboard.tsx)

Hero: revenue_recovered_cents (green, large, trend %). Quick stats: calls, appointments, follow-ups. Minutes bar (green/amber/red). Needs Attention queue. Campaign overview. Activity feed.

**CRITICAL: Replace ALL dark Tailwind classes with CSS variable equivalents.** bg-zinc-900 → bg-[var(--bg-surface)]. border-zinc-800 → border-[var(--border-default)]. text-white → text-[var(--text-primary)].

### Contact Timeline (/app/contacts/[id]/page.tsx)

Left 3/4: vertical timeline of calls, messages, bookings, workflows, campaigns by created_at DESC. Right 1/4: contact card (name, phone, email, state, tags, revenue_attributed, opt_out, quick actions).

### Campaign Create (/app/campaigns/create/page.tsx)

10 types: speed_to_lead, lead_qualification, appointment_setting, appointment_reminder, no_show_recovery, reactivation, quote_chase, review_request, cold_outreach, custom.

5-step wizard: Type → Audience → Sequence → Schedule → Review.

### Follow-Up Creator (/app/follow-ups/create/page.tsx)

8 triggers: call_outcome:lead_captured, call_outcome:voicemail_left, call_outcome:no_answer, call_outcome:booked, booking_status:confirmed, booking_status:no_show, booking_status:completed, manual.

Steps: channel (sms/call/email), delay, template, stopIfReply, stopIfBooked.

### Outbound Settings (/app/settings/outbound/page.tsx)

Calling hours (09:00–20:00), voicemail behavior (leave_message/hang_up/ai_generated), daily limit (50), suppression (1 call/day, 3/week, 2 SMS/day, 7-day decline cooldown, 30-day conversion cooldown), DNC compliance (enabled).

### Inbox (/app/inbox/page.tsx)

Three-panel: conversation list, message thread, contact detail. SMS/email/WhatsApp. Reply, search, filter. 30s polling.

---

## PART 6: FOLLOW-UP ENGINE

**Core types:** FollowUpSequence, SequenceStep (channel, delay_minutes, template_content, conditions), SequenceEnrollment (status: active/completed/cancelled/paused, current_step, next_step_due_at).

**Execution:** `process-sequences` cron every 5 min. Queries enrollments where next_step_due_at ≤ NOW() and status = active. Processes step by channel. Updates current_step. Checks stop conditions (reply, booking).

**Legacy engine.ts:** @deprecated. Do not import. Do not delete.

---

## PART 7: HOMEPAGE

### Current section order in page.tsx:

Navbar → Hero → ProblemStatement → HowItWorks → HomepageRoiCalculator → Industries → Features → PricingPreview → FinalCTA → Footer

### Recommended reorder (move ROI Calculator up):

Navbar → Hero → ProblemStatement → **ROI Calculator** → HowItWorks → Industries → Features → PricingPreview → FinalCTA → Footer

### Fix needed:

In page.tsx FAQ JSON-LD, question 3 still says "What does 'Revenue Execution OS' mean?" — update to "How is this different from an AI receptionist?" to match HomepageFAQ.tsx component.

---

## PART 8: CRON JOBS (13 active in vercel.json)

core (*/2min), speed-to-lead (*/2min), heartbeat (*/5min), weekly-trust (Mon 9AM), trial-reminders (daily 9AM), first-day-check (daily 10AM), day-3-nudge (daily 11AM), phone-billing (1st 3AM), usage-overage (1st 4AM), daily-metrics (daily 12:15AM), weekly-digest (Mon 8AM), process-sequences (*/5min), usage-alerts (daily 6AM).

103 cron routes exist in code. Only 13 scheduled. Do NOT add the dormant enterprise ones.

---

## PART 9: REDIRECTS

76 redirects in next.config.ts. All /dashboard/* → /app/*. All /onboarding/* → /activate. Catch-all included. Do not add more.

---

## PART 10: ENVIRONMENT VARIABLES

**Tier 1 (app won't start):** SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SESSION_SECRET, STRIPE_SECRET_KEY, CRON_SECRET, NEXT_PUBLIC_APP_URL

**Tier 2 (features break):** STRIPE_WEBHOOK_SECRET, TELNYX_API_KEY, ANTHROPIC_API_KEY (fallback), REDIS_URL, RESEND_API_KEY

**Tier 3 (voice stack):** PIPECAT_SERVER_URL, KOKORO_TTS_ENDPOINT, CANARY_STT_ENDPOINT, LLAMA_LLM_ENDPOINT, TELNYX_SIP_TRUNK_ID

**Tier 4 (analytics):** NEXT_PUBLIC_POSTHOG_KEY, SENTRY_DSN

---

## PART 11: COMPETITOR ADVANTAGE

### Why We Beat Every Category

**vs AI Receptionists (Smith.ai $3.25–$9.50/call, Ruby $1.50–$2.50/min):** We're 10x cheaper at volume AND we do follow-up, outbound campaigns, no-show recovery, revenue attribution. They just answer calls.

**vs Voice AI Infrastructure (Vapi $0.13–$0.31/min, Bland $0.09–$0.14/min):** They're developer tools. We're a product. A dentist can't build on Vapi. They need something that works in 2 minutes. And our self-hosted stack costs $0.007/min vs their $0.13–$0.31.

**vs Sales Engagement (SalesLoft $125/seat, Outreach $100/seat):** They don't have AI voice calling. They're email-centric. Enterprise pricing.

**vs All-in-One (GoHighLevel $97–$497/mo):** Too complex. Setup takes weeks. Our setup takes 2 minutes. Our AI actually calls people.

**vs Booking Tools (Calendly $20/user):** Single feature. No calls. No follow-up. No recovery.

**vs CRMs (Jobber $49–$249, Housecall Pro $65–$249):** CRMs log activity. We execute activity.

### The Moat

No competitor does all five: Answer → Follow Up → Book → Recover → Attribute Revenue. Self-hosted voice stack makes our margins 10x better than anyone running on Vapi/Bland/ElevenLabs.

---

## PART 12: WHAT TO BUILD NEXT (PRIORITY ORDER)

### Priority 1: Dashboard Light Theme (Day 1–2)

Replace ALL dark Tailwind classes in /app/* with CSS variable equivalents. This is the highest-impact visual change.

### Priority 2: Fix FAQ Schema + Follow-Ups i18n (Day 1)

1. In page.tsx, update FAQ JSON-LD question 3 to match component.
2. In AppShellClient.tsx, change hardcoded "Follow-Ups" to `t("nav.followUps")`.

### Priority 3: Homepage Section Reorder (Day 2)

Move ROI Calculator to after ProblemStatement, before HowItWorks.

### Priority 4: Voice Stack Migration — Pipecat (Week 1–2)

Create services/voice/ directory. Deploy Pipecat pipeline server. Connect to existing Deepgram + Claude initially. Test with 10 real calls. Verify <3s answer time maintained.

### Priority 5: Self-Hosted Kokoro TTS (Week 2–3)

Deploy Kokoro 82M on RunPod. Create gRPC service. Generate 6 standard voice presets. Replace Deepgram TTS in Pipecat pipeline. A/B test quality vs Deepgram. Roll out when quality is equivalent.

### Priority 6: Self-Hosted Canary STT (Week 3–4)

Deploy Canary-1B-Flash alongside Kokoro on same GPU. Create streaming gRPC service. Replace Deepgram STT. Verify WER is ≤7%.

### Priority 7: Self-Hosted Llama 3 8B (Week 4–5)

Deploy via vLLM on same GPU (INT8 quantized). Create agent prompt templates. Implement confidence routing: Llama handles 90% of calls, Claude Haiku fallback for complex conversations. Verify booking accuracy matches Claude-only baseline.

### Priority 8: Telnyx Migration (Week 5–6)

Replace Twilio SDK with Telnyx SDK. Port existing phone numbers. Update all telephony endpoints. Verify SMS delivery rates.

### Priority 9: Social Proof (Week 2–4, parallel)

Ship to 5 real service businesses. Capture revenue-recovered screenshots. Create /results page. Add proof to homepage. This is the #1 conversion blocker.

### Priority 10: Full QA (Week 6)

Run all 50 QA tests, 25 edge cases, 20 fallback behaviors. Document pass/fail. Fix all failures. 529 existing tests must stay green.

---

## PART 13: NON-NEGOTIABLE RULES

1. **Revenue Recovered is the hero metric.** Dashboard, weekly digest, pricing, cancellation save.
2. **No fake data.** HeroRevenueWidget labeled "Example dashboard." If no real data, say "Now accepting early customers."
3. **Light theme on /app/*.** Dark is for marketing only.
4. **One onboarding path:** /activate. Everything redirects there.
5. **One dashboard system:** /app/*. Everything else redirects.
6. **billing-plans.ts is the source of truth.** Never hardcode tier data.
7. **Outbound respects safety.** Opt-out, suppression, daily limit, business hours, timezone. Always.
8. **Every call outcome triggers follow-up.** No call ends without a next action.
9. **Standard billing language.** "Plan," "subscription," "upgrade." Not "coverage" or "activation."
10. **Progressive disclosure.** New users see 8–10 pages. Advanced features unlock by tier.
11. **Mobile-first.** Bottom nav, touch targets, responsive.
12. **Test every billing path.** Overage, proration, trial expiration, dunning, cancellation.
13. **Respect i18n.** All new strings use `t("key")`. No hardcoded English.
14. **Tailwind v4.** @theme directives in globals.css. No tailwind.config.js.
15. **Forms: native state + Zod.** No react-hook-form.
16. **529 tests must stay green.** Always.
17. **Self-host everything possible.** No vendor dependency where open-source exists. Own the stack. Own the margin.

---

*End of V11. Own the stack. Own the margin. Own the category. Ship it.*
