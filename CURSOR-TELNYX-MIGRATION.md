# Telnyx Migration — Cursor Implementation Guide

> The Telnyx telephony abstraction layer is BUILT and committed. This guide covers
> migrating the remaining API routes to use the unified `TelephonyService` interface
> so the entire system works with Telnyx (no Twilio dependency).

---

## WHAT'S ALREADY DONE (Do Not Redo)

### Core Library (7 new files, 900+ lines)
- `src/lib/telephony/telnyx-client.ts` — REST client with Bearer auth
- `src/lib/telephony/telnyx-voice.ts` — Call Control API (create, answer, hangup, stream)
- `src/lib/telephony/telnyx-sms.ts` — Messaging API (send SMS)
- `src/lib/telephony/telnyx-numbers.ts` — Number search, purchase, release
- `src/lib/telephony/telnyx-webhooks.ts` — HMAC-SHA256 webhook verification + event parsing
- `src/lib/telephony/index.ts` — Unified `TelephonyService` interface with auto-provider selection
- `src/lib/telephony/types.ts` — Shared types for both providers

### Already Migrated
- `src/app/api/sms/send/route.ts` — Uses TelephonyService for SMS
- `src/lib/delivery/provider.ts` — Has `sendViaTelnyx()` + provider routing
- `src/app/api/webhooks/telnyx/voice/route.ts` — Telnyx voice event handler
- `src/app/api/webhooks/telnyx/inbound/route.ts` — Telnyx SMS event handler

---

## REMAINING ROUTES TO MIGRATE

### Priority 1: Phone Number Management

**`src/app/api/phone/provision/route.ts`**
- Replace direct Twilio `IncomingPhoneNumbers` API call with `getTelephonyService().purchaseNumber()`
- When purchasing, set webhook URLs to Telnyx-appropriate endpoints
- For Telnyx: configure `connection_id` and `messaging_profile_id` on the number

**`src/app/api/phone/available/route.ts`**
- Replace Twilio `AvailablePhoneNumbers` API with `getTelephonyService().searchNumbers()`
- Map response format to unified `AvailableNumber` type

**`src/app/api/phone/numbers/[id]/release/route.ts`**
- Replace Twilio DELETE with `getTelephonyService().releaseNumber()`

**`src/app/api/onboarding/number/route.ts`**
- Replace Twilio search + purchase with `getTelephonyService()`

**`src/app/api/integrations/twilio/auto-provision/route.ts`**
- Rename to `/api/integrations/telephony/auto-provision/route.ts`
- Use `getTelephonyService().searchNumbers()` then `.purchaseNumber()`

### Priority 2: Voice Call Routes

**`src/app/api/voice/connect/route.ts`**
- For Telnyx inbound: instead of TwiML, use Call Control API to answer and start streaming
- Call `getTelephonyService().createCall()` pattern
- Start WebSocket stream to voice server using `streamMedia()`

**`src/app/api/agents/[id]/test-call/route.ts`**
- Replace Twilio outbound call with `getTelephonyService().createCall()`
- Include `streamUrl` for voice server WebSocket

**`src/lib/voice/call-flow.ts`**
- Replace TwiML generation with Call Control commands
- For Telnyx: use answer → stream → (on hangup) stop stream pattern

**`src/lib/outbound/execute-lead-call.ts`**
- Replace Twilio call creation with `getTelephonyService().createCall()`

### Priority 3: Webhook Handlers

**`src/app/api/webhooks/twilio/voice/route.ts`**
- Keep as-is for Twilio backwards compat
- Telnyx voice events already handled by new `/api/webhooks/telnyx/voice/route.ts`

**`src/app/api/webhooks/twilio/inbound/route.ts`**
- Keep as-is for Twilio backwards compat
- Telnyx inbound SMS already handled by new `/api/webhooks/telnyx/inbound/route.ts`

**`src/app/api/webhooks/twilio/status/route.ts`**
- Keep as-is for Twilio
- Add status event handling in Telnyx voice webhook handler (call.hangup events)

### Priority 4: Phone Verification

**`src/app/api/phone/verify-start/route.ts`**
- Twilio Verify service doesn't have a direct Telnyx equivalent
- Options: Use Telnyx SMS to send a custom verification code, or use a third-party like Vonage Verify
- Simplest: Send a random 6-digit code via `getTelephonyService().sendSms()` and store in DB

**`src/app/api/phone/verify-check/route.ts`**
- Check the code stored in DB instead of calling Twilio Verify API

### Priority 5: Update Voice Server WebSocket

**`services/voice-server/main.py`**
- The voice server currently expects Twilio Media Stream format
- Telnyx WebSocket format is similar but uses different JSON structure:
  - Telnyx: `{"event": "media", "media": {"payload": "<base64>", "track": "inbound"}}`
  - Twilio: `{"event": "media", "media": {"payload": "<base64>", "track": "inbound"}}`
- Check if the formats are compatible; if not, add a format adapter

### Priority 6: Database Updates

**`phone_numbers` table**
- Already has `provider` column ("twilio" | "telnyx")
- Ensure new purchases set `provider = "telnyx"`

**`phone_configs` table**
- Add `telnyx_connection_id` and `telnyx_messaging_profile_id` columns
- Keep `twilio_account_sid` for backwards compat

**`call_sessions` table**
- `provider` column already supports both
- Map `call_control_id` to `external_meeting_id`

### Priority 7: Environment & Config

**New Vercel env vars needed:**
```
TELNYX_API_KEY=KEY...
TELNYX_CONNECTION_ID=conn_...
TELNYX_MESSAGING_PROFILE_ID=...
TELNYX_PUBLIC_KEY=...
TELNYX_PHONE_NUMBER=+1...
TELEPHONY_PROVIDER=telnyx
```

**Update these files:**
- `src/lib/env.ts` — Add Telnyx env var schema
- `src/lib/env/validate.ts` — Validate Telnyx vars when provider is telnyx
- `src/lib/env-check.ts` — Check Telnyx vars
- `.env.example` — Add Telnyx vars with comments

### Priority 8: UI Updates

**Settings pages that reference Twilio:**
- `src/app/app/settings/phone/page.tsx` — Show "Telnyx" branding when provider is telnyx
- `src/app/app/settings/phone/marketplace/page.tsx` — Use unified search
- `src/app/connect/page.tsx` — Update integration setup flow
- `src/app/dashboard/settings/integrations/page.tsx` — Show active provider

---

## ARCHITECTURE

```
User Request
    ↓
getTelephonyService()  ← reads TELEPHONY_PROVIDER env var
    ↓
┌──────────────┐    ┌──────────────┐
│ TwilioService │ OR │ TelnyxService │
│  (legacy)     │    │  (new)        │
└──────┬───────┘    └──────┬───────┘
       │                    │
  Twilio REST API     Telnyx REST API
  Basic Auth          Bearer Token
  TwiML responses     Call Control API
  Media Streams WS    Media Streaming WS
```

## MIGRATION STRATEGY

1. Build everything with TELEPHONY_PROVIDER defaulting to "twilio"
2. Test Telnyx integration in preview deployments
3. Port existing phone numbers from Twilio to Telnyx (or provision new ones)
4. Switch TELEPHONY_PROVIDER=telnyx in Vercel env vars
5. Remove Twilio env vars after confirming everything works
6. Eventually delete Twilio-specific code once stable

## COST SAVINGS

| Feature | Twilio | Telnyx | Savings |
|---------|--------|--------|---------|
| Voice/min | $0.014 | $0.002 | 85% |
| SMS/msg | $0.0079 | $0.004 | 49% |
| Phone #/mo | $1.15 | $1.00 | 13% |
| At 5000 min/mo | $70 | $10 | $60/mo |

---

*Generated by Cowork (Claude) — March 19, 2026*
