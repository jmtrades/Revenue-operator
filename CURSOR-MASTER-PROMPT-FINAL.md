# RECALL TOUCH — DEFINITIVE CURSOR MASTER PROMPT

You are the sole engineering team for Recall Touch. This document is your complete specification. Work through every task in order. Do not stop after one task. Complete every single item in this document before stopping. When you finish one task, immediately move to the next. Do not ask for permission between tasks. Do not improvise. Do not add features not listed. Do not rebuild things marked DONE.

---

## WHAT EXISTS (DONE — do NOT rebuild)

- Auth guard in `src/app/app/layout.tsx` — session check + email verification redirect. DONE.
- Checkout proper HTTP status codes in `src/app/api/billing/checkout/route.ts`. DONE.
- Billing status imports from billing-plans.ts in `src/app/api/billing/status/route.ts`. DONE.
- Signup rate limiting in `src/app/api/auth/signup/route.ts`. DONE.
- Phone provision rate limiting in `src/app/api/phone/provision/route.ts`. DONE.
- Email verification page at `src/app/verify-email/page.tsx`. DONE.
- Results page at `src/app/results/page.tsx`. DONE.
- Security page at `src/app/security/page.tsx`. DONE.
- esbuild removed from devDependencies. DONE.
- Node 22 pinned in package.json engines. DONE.
- middleware.ts deleted. Auth is in layout.tsx. DONE.
- vercel.json uses `"buildCommand": "next build"`. DONE.
- Deployment is LIVE on Vercel. DONE.

---

## IDENTITY

Recall Touch is the AI Revenue Operations platform. It answers every inbound call, runs outbound campaigns, executes multi-step follow-up sequences across voice + SMS + email, books appointments, recovers no-shows, reactivates dead leads, chases quotes, and measures every dollar recovered — automatically.

Category: AI Revenue Operations. NOT a receptionist. NOT a phone system.

Two engines: Inbound (AI answers 24/7) + Outbound (10 campaign types). Three modes: Solo, Sales, Business.

---

## TECH STACK (Do not change. Do not introduce alternatives.)

Next.js 16.1.6 App Router. React 19.2.3. TypeScript 5. Tailwind CSS 4 (@theme in globals.css, NOT tailwind.config.js). Supabase PostgreSQL + RLS. Stripe 20.3.1. Framer Motion 12.35.2. Lucide React 0.575.0. Recharts 3.8.0. @xyflow/react 12.10.1. @dnd-kit. next-intl 4.8.3. Resend. PostHog. Sentry 10.44.0. Sonner 2.0.7. Zod 4.3.6. date-fns 4.1.0.

Forms: Native React state + Zod. NO react-hook-form. NO middleware.ts (breaks Vercel). billing-plans.ts is the SINGLE source of truth. 529 tests must stay green. All /app/* uses light theme CSS variables. All new strings use t("key") via next-intl.

---

## PRICING (billing-plans.ts — source of truth)

Solo $49/mo, 100 min, $0.30 overage, 1 agent, 1 seat, 10 daily outbound.
Business $297/mo, 500 min, $0.20 overage, 3 agents, 5 seats, 100 daily outbound.
Scale $997/mo, 3,000 min, $0.12 overage, 10 agents, unlimited seats, 500 daily outbound.
Enterprise custom.

---

## TASK LIST — COMPLETE EVERY TASK IN ORDER. DO NOT STOP.

### TASK 1: Dunning emails for failed payments

Check if `src/app/api/billing/webhook/route.ts` handles `invoice.payment_failed` by sending an email via Resend. If missing: create `src/lib/email/dunning.ts` with 4-stage templates. Attempt 1: "Payment failed. Update method." Attempt 2: "Second attempt failed. Service pauses soon." Attempt 3: "Final notice." Attempt 4+: pause workspace (billing_status='payment_failed'). Add the handler in the webhook route. Move to the next task.

### TASK 2: Trial grace period

Check if workspaces table has `trial_ends_at` column. If missing: add it. Set it during workspace creation in checkout (`new Date(Date.now() + 14 * 86400000).toISOString()`). In the trial-reminders cron, when trial_ends_at is reached: set status='trial_expired'. For 3 days after: calls still answered, banner shown. After 3 more days: status='expired', calls stop. Move to the next task.

### TASK 3: Cancellation flow

Check if `src/app/app/settings/billing/cancel/page.tsx` exists. If missing: create it. Survey with radio options (Too expensive / Not using enough / Missing features / Switching / Other). Save offer: "Stay and get next month free." If declining: confirm cancellation at end of billing period. Track reason via PostHog `track("subscription_cancelled", { reason })`. Move to the next task.

### TASK 4: Empty states on all /app pages

Check each page. If it shows a blank screen when no data exists, add a centered empty state with muted text and a primary CTA button:

- `/app/calls/page.tsx`: "No calls yet. Connect a phone number to start." Button: "Connect Number" linking to /app/settings/phone.
- `/app/contacts/page.tsx`: "No contacts yet. Import a list or wait for your first call." Button: "Import CSV".
- `/app/inbox/page.tsx`: "No conversations yet. Messages appear here after your first call."
- `/app/campaigns/page.tsx`: "No campaigns yet." Button: "Create Campaign" linking to /app/campaigns/create.
- `/app/analytics/page.tsx`: "Not enough data yet. Analytics populate after your first week of calls."
- `/app/follow-ups/page.tsx`: "No sequences yet." Button: "Create Sequence" linking to /app/follow-ups/create.

Style: centered, `text-[var(--text-secondary)]`, button with `bg-[var(--accent-primary)] text-white rounded-xl px-6 py-3`. Move to the next task.

### TASK 5: Error boundary on /activate

Check if the wizard in `src/app/activate/page.tsx` is wrapped in an error boundary. If not: wrap it in `<TranslatedErrorBoundary>` from `@/components/ErrorBoundary`. Fallback shows "Something went wrong. Please try again." with a retry button. Move to the next task.

### TASK 6: Block agent go-live without test call

Check if an agent can go live without completing a test call. If not gated: add `test_call_completed` boolean column on agents table (default false). In the agent settings UI, disable the Go Live toggle when test_call_completed is false. Show tooltip: "Complete a test call before going live." Set test_call_completed to true when a test call completes successfully. Move to the next task.

### TASK 7: ROI Calculator — remove value cap

File: `src/components/sections/HomepageRoiCalculator.tsx`. Check if the average job value uses a slider with $650 default and $5,000 max. If so: replace with a segmented button selector: $200, $500, $1,000, $2,500, $5,000, $10,000+. Default to $1,000. This prevents the product from looking like it only serves small businesses. Move to the next task.

### TASK 8: Homepage section reorder

File: `src/app/page.tsx`. Check if `<HomepageRoiCalculator />` appears at position 3 (after ProblemStatement, before HowItWorks). If not: move it there. The ROI calculator is the strongest conversion tool and must appear immediately after the problem statement. Move to the next task.

### TASK 9: Expand Industries section

File: `src/components/sections/Industries.tsx`. Check if it shows 8+ industries. If only 5+custom: add Roofing, Med Spa, Recruiting as new cards. Each with appropriate icon, name, and link to /industries/[slug]. Total: 8 industries + 1 custom card. Move to the next task.

### TASK 10: Founder presence in footer

Check if the footer shows a founder name or personal identity. If not: add to the footer component: "Built by Junior Martin" with a one-line description. This transforms the product from anonymous to trustworthy. Move to the next task.

### TASK 11: PostHog event tracking

Add `track()` calls from `@/lib/analytics/posthog` in the following locations:

In signup flow: `track("signup_started")`, `track("signup_completed", { plan })`.
In /activate wizard (each step): `track("onboarding_step_completed", { step: 1, name: "industry" })` through step 5.
In dashboard on milestones: `track("first_call_received")`, `track("first_appointment_booked")`, `track("first_revenue_attributed", { amount_cents })`.
In billing: `track("upgrade_clicked", { from, to })`, `track("plan_changed", { action, plan })`, `track("subscription_cancelled", { reason })`.
In features: `track("campaign_created", { type })`, `track("campaign_launched", { contacts })`, `track("contact_imported", { count, source })`.

Move to the next task.

### TASK 12: Call quality columns on call_sessions

Check if `call_sessions` table has these columns. Add any that are missing: `answer_latency_ms` (integer), `avg_response_latency_ms` (integer), `interruption_count` (integer), `fallback_events` (jsonb), `cost_cents` (integer), `stt_model` (text), `tts_model` (text), `llm_model` (text). Move to the next task.

### TASK 13: Self-hosted voice — Pipecat replaces Vapi

Create the `services/voice/` directory structure:

```
services/voice/
├── pipecat-server.py          # Main Pipecat pipeline server
├── requirements.txt           # pipecat-ai[daily,silero], grpcio, anthropic, telnyx
├── Dockerfile                 # Python 3.11 + GPU support for RunPod
├── docker-compose.yml         # Local dev orchestration
├── .env.example               # DEEPGRAM_API_KEY, ANTHROPIC_API_KEY, TELNYX_API_KEY, etc.
├── agents/
│   ├── base_agent.py          # Shared agent logic
│   ├── inbound_agent.py       # Inbound call handler
│   ├── outbound_agent.py      # Outbound campaign caller
│   ├── appointment_setter.py  # Booking-focused agent
│   ├── after_hours.py         # After-hours handler
│   └── prompts/
│       ├── inbound.txt        # System prompt for inbound calls
│       ├── outbound.txt       # System prompt for outbound calls
│       ├── appointment.txt    # System prompt for appointment setting
│       └── after_hours.txt    # System prompt for after-hours
└── README.md                  # Setup and deployment instructions
```

The pipecat-server.py implements: Telnyx SIP inbound → Silero VAD → Deepgram STT → Claude Haiku LLM → Deepgram TTS → Telnyx SIP audio out. It uses Pipecat's built-in UserIdleDetector for turn-taking and SentenceAggregator for streaming TTS. Each agent type loads its system prompt from the prompts/ directory. All call events (answered, intent detected, booking made, transfer initiated) are POSTed to the Next.js API at `/api/voice/events`.

The Dockerfile uses Python 3.11 base image with pipecat-ai installed. Deployment target: RunPod Serverless or always-on Pod.

Create `src/app/api/voice/connect/route.ts` — the Telnyx webhook endpoint that routes incoming SIP connections to the Pipecat server.

Move to the next task.

### TASK 14: Self-hosted voice — Telnyx replaces Twilio

Create `src/lib/telephony/telnyx/` directory with:
- `client.ts` — Telnyx API client initialization
- `numbers.ts` — phone number provisioning via Telnyx (purchaseTelnyxPhoneNumber already exists — verify and strengthen)
- `sms.ts` — SMS sending via Telnyx Messaging API ($0.004/segment vs Twilio $0.0079)
- `voice.ts` — SIP trunk configuration for Pipecat

Update `src/lib/telephony/get-telephony-provider.ts` to support Telnyx as default provider. Update all SMS sending functions to use Telnyx when configured. Update env vars: `TELNYX_API_KEY`, `TELNYX_SIP_TRUNK_ID`, `TELNYX_MESSAGING_PROFILE_ID`.

Phone number porting: Telnyx supports number porting from Twilio. Document the process in README.

Move to the next task.

### TASK 15: Self-hosted TTS — Kokoro replaces Deepgram TTS

Create `services/voice/tts/` directory with:
- `kokoro_service.py` — gRPC service wrapping Kokoro 82M inference. Accepts text input, returns streaming audio chunks. Uses speaker embedding from voice preset config.
- `voices/` directory with 6 JSON preset configs: professional_female.json, professional_male.json, warm_female.json, warm_male.json, neutral.json, energetic.json. Each contains the speaker embedding vector + metadata (name, tone, recommended industries).
- `Dockerfile.kokoro` — L4 GPU base image, downloads Kokoro 82M weights from Hugging Face at build time.

Kokoro 82M specs: 82M params, Apache 2.0 license, TTS Arena ELO 1,059 (#1 open-weight), TTFB <100ms, 96x real-time on single GPU. Output at 16kHz, downsample to 8kHz G.711 for SIP phone audio.

Update pipecat-server.py to use KokoroTTSService instead of DeepgramTTSService. Add fallback: if Kokoro latency exceeds 200ms or returns error, switch to Deepgram Aura-2 API for remainder of call.

Move to the next task.

### TASK 16: Self-hosted STT — Canary replaces Deepgram STT

Create `services/voice/stt/` directory with:
- `canary_service.py` — streaming gRPC service wrapping Canary-1B-Flash inference. Accepts 16kHz audio stream, returns real-time transcript tokens.
- `Dockerfile.canary` — L4 GPU base image, downloads Canary-1B-Flash weights from NVIDIA NGC at build time.

Canary-1B-Flash specs: 1B params, Apache 2.0, 1,000x real-time, WER ~6.7%, streaming-native (RNN-Transducer). Input: 8kHz G.711 from SIP, resample to 16kHz for model. Apply noise gate for PSTN line noise.

Update pipecat-server.py to use CanarySTTService instead of DeepgramSTTService. Add fallback: if Canary latency exceeds 500ms or returns empty transcript, switch to Deepgram Nova-2 API.

Move to the next task.

### TASK 17: Self-hosted LLM — Llama 3 8B with Claude fallback

Create `services/voice/llm/` directory with:
- `llama_service.py` — vLLM inference server for Llama 3.3 8B (INT8 quantized, ~8GB VRAM). Exposes OpenAI-compatible API endpoint.
- `confidence_router.py` — routes 90% of LLM calls to self-hosted Llama. If confidence score (based on top token logprob) < 0.85, retries with Claude Haiku API. Claude is the permanent fallback — never go 100% self-hosted on LLM.

Update pipecat-server.py to use the confidence router instead of direct Claude calls. Agent system prompts are passed to both Llama and Claude identically.

GPU deployment: all three models (Kokoro ~2GB + Canary ~4GB + Llama 8B INT8 ~8GB = ~14GB) fit on one RTX 4090 (24GB VRAM). Single RunPod instance at $0.34/hr ($245/mo) supports ~500 Business customers.

Move to the next task.

### TASK 18: Voice quality monitoring

Create `src/lib/voice/quality.ts` with functions to:
- Track per-call quality metrics: answer_latency_ms, avg_response_latency_ms, interruption_count, fallback_events, cost_cents.
- Calculate quality scores from raw metrics.
- Flag calls below quality threshold (answer_latency >5s, response_latency >2s, >3 fallback events).
- Send alerts via Sentry when quality degrades (>5 flagged calls per hour).

Update the voice webhook handler (`src/app/api/voice/events/route.ts` or equivalent) to call these functions after each call completes and store results in call_sessions.

Move to the next task.

### TASK 19: Voice failure fallback chain

Implement in pipecat-server.py:

1. Primary STT fails → switch to Deepgram Nova-2 API for remainder of call.
2. Primary TTS fails → switch to Deepgram Aura-2 API for remainder of call.
3. Primary LLM fails → switch to Claude Haiku API for remainder of call.
4. All components fail → play pre-recorded audio: "We are experiencing technical difficulties. Please leave a message after the tone." → record voicemail → create needs-attention item in Next.js via POST to `/api/voice/events`.
5. Call drops mid-conversation → auto-SMS to caller within 60 seconds: "Sorry we got disconnected. Can we call you back?" via Telnyx SMS API.

Log every fallback event to call_sessions.fallback_events JSONB array with: component, reason, timestamp, latency_added_ms.

Move to the next task.

### TASK 20: Fish Speech voice cloning (Business+ only)

Create `services/voice/tts/fish_speech_service.py` — inference server for Fish Speech S1-mini (500M params, Apache 2.0, 1,339 ELO). Accepts reference audio + text, returns cloned-voice audio.

Create `src/app/api/voice/clone/route.ts`:
- Accept audio file upload (10-30 seconds, WAV/MP3).
- Validate workspace tier >= Business.
- Validate clone count < tier limit (Business: 3, Scale: 10, Enterprise: unlimited).
- Send to Fish Speech service for speaker embedding extraction.
- Store embedding as JSONB in `voice_profiles` table.
- Require consent checkbox: "I confirm I have the right to use this voice recording."
- Store consent timestamp and IP.

Create `src/app/app/settings/voices/clone/page.tsx` — UI for uploading reference audio, managing cloned voices, and selecting voice per agent.

Create `voice_profiles` table: id, workspace_id, name, type (preset/clone), speaker_embedding (jsonb), source_audio_url, consent_captured_at, consent_ip, version, is_active, created_at.

Move to the next task.

### TASK 21: Loading skeletons

Replace all spinner-based loading states in /app/* pages with skeleton placeholders that match the page layout. Dashboard: skeleton cards for revenue metric, quick stats, minutes bar, needs-attention list, activity feed. Calls/Contacts/Inbox: skeleton rows matching the list layout. Analytics: skeleton chart areas. Use `animate-pulse` on `bg-[var(--bg-inset)]` rectangles matching component dimensions.

Move to the next task.

### TASK 22: Settings progressive disclosure

Group the 16+ settings sub-pages into 3 collapsible sections in the settings sidebar:

**Your Business:** business, call-rules, industry-templates, outbound.
**Integrations:** phone, voices, integrations, compliance.
**Account:** billing, team, notifications, errors, activity.

Each section header is clickable to expand/collapse. Default: all expanded. Persist collapse state in localStorage.

Move to the next task.

### TASK 23: Product tour for new users

Create `src/components/ui/ProductTour.tsx`. On first login (check localStorage key `rt_tour_completed`):

Step 1: Highlight dashboard revenue metric → "This shows how much revenue your AI has recovered."
Step 2: Highlight needs-attention queue → "These contacts need your attention. Click to call or follow up."
Step 3: Highlight Campaigns sidebar item → "Create outbound campaigns to proactively chase revenue."
Step 4: Highlight Settings sidebar item → "Configure your agent voice, behavior, and rules here."
Step 5: "You are all set. Your AI is answering calls 24/7."

Each step: backdrop overlay + highlighted element + tooltip with text + Next/Skip buttons. Set `rt_tour_completed = true` in localStorage when finished or skipped.

Import and render in `src/app/app/layout.tsx` inside the provider tree, after HydrationGate.

Move to the next task.

### TASK 24: Agent sandbox mode

Add `sandbox_mode` boolean on agents table (default false). When sandbox_mode is true: agent processes calls normally but all outbound actions (SMS sends, booking creations, CRM updates) are logged to a `sandbox_actions` table but NOT executed. Show sandbox actions in a "Review" panel on the agent settings page. Owner can review and approve actions. Toggle sandbox mode on/off in agent settings.

Create `sandbox_actions` table: id, workspace_id, agent_id, action_type (sms/booking/crm_update), action_payload (jsonb), would_have_executed_at, reviewed, approved, created_at.

Move to the next task.

### TASK 25: Final verification

Run `npx tsc --noEmit` and verify 0 errors in project code (ignore node_modules warnings). Run `npm test` and verify all tests pass. Run `npx next build` and verify it compiles successfully with no errors. Verify vercel.json still has `"buildCommand": "next build"`. Verify middleware.ts does NOT exist. Verify the auth guard in `src/app/app/layout.tsx` is intact with session check and email verification redirect. Report the results.

---

## NON-NEGOTIABLE RULES

1. Revenue Recovered is the hero metric everywhere.
2. No fake data. HeroRevenueWidget labeled "Example dashboard."
3. Light theme on /app/*. Dark is marketing only.
4. billing-plans.ts is the source of truth. Never hardcode tier data.
5. Outbound respects safety. Opt-out, suppression, daily limit, business hours.
6. Every call outcome triggers follow-up.
7. All new strings use t("key") via next-intl.
8. Tailwind v4. @theme in globals.css. No tailwind.config.js.
9. Forms: native state + Zod. No react-hook-form.
10. Tests must stay green.
11. NO middleware.ts. It breaks Vercel deployment.
12. Self-host everything. Own the stack. Own the margin.

---

*Complete every task 1 through 25. Do not stop between tasks. When one is done, start the next immediately. The product must be fully built, fully self-hosted, and fully operational when you are finished.*
