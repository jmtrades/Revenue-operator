# Telnyx Telephony Integration

This document describes the complete Telnyx telephony abstraction layer built into the Revenue Operator codebase.

## Overview

The codebase now supports both **Twilio** and **Telnyx** as telephony providers. The provider is selected via the `TELEPHONY_PROVIDER` environment variable.

### Supported Features

- **SMS/Messaging**: Send SMS via Telnyx Messaging API
- **Voice Calls**: Create and manage outbound calls via Telnyx Call Control API
- **Phone Number Management**: Search, purchase, and release phone numbers
- **Webhook Handling**: Verify and parse Telnyx webhook events

## Architecture

### Core Modules

#### `src/lib/telephony/telnyx-client.ts`
Base HTTP client for Telnyx API using native `fetch`. Handles:
- Bearer token authentication
- Error parsing and normalization
- Request/response serialization

#### `src/lib/telephony/telnyx-sms.ts`
SMS/messaging functions:
- `sendSms(params)` — Send SMS via Messaging API
- `getSmsDetails(messageId)` — Retrieve message status

#### `src/lib/telephony/telnyx-voice.ts`
Voice call functions using Call Control API:
- `createOutboundCall(params)` — Initiate outbound call
- `answerCall(callControlId)` — Answer incoming call
- `hangupCall(callControlId)` — Disconnect call
- `startStreamingAudio(callControlId, streamUrl)` — Begin audio streaming
- `stopStreamingAudio(callControlId)` — End audio streaming
- `getCallStatus(callControlId)` — Retrieve call state

#### `src/lib/telephony/telnyx-numbers.ts`
Phone number management:
- `searchAvailableNumbers(params)` — Find available numbers for purchase
- `purchaseNumber(params)` — Order and activate a number
- `releaseNumber(phoneNumberId)` — Disconnect number
- `getPhoneNumberDetails(phoneNumberId)` — Retrieve number config

#### `src/lib/telephony/telnyx-webhooks.ts`
Webhook verification and event parsing:
- `verifyTelnyxWebhook(payload, signature, publicKey)` — Verify HMAC-SHA256 signature
- `parseTelnyxEvent(payload)` — Extract event type and data
- `extractCallInfo(payload)` — Parse call events
- `extractMessageInfo(payload)` — Parse message events
- `isCallEvent() | isMessageEvent() | isNumberEvent()` — Event type helpers

#### `src/lib/telephony/index.ts`
Unified **TelephonyService** interface that abstracts provider differences. Automatically selects Telnyx or Twilio based on configuration.

#### `src/lib/telephony/telnyx/numbers.ts`
Compatibility wrapper for existing imports used in provisioning endpoints:
- `listAvailableTelnyxPhoneNumbers(params)`
- `purchaseTelnyxPhoneNumber(params)`

### Types

All shared types are defined in `src/lib/telephony/types.ts`:
- `AvailableNumber` — Phone number in catalog
- `PurchasedNumber` — Provisioned number
- `SmsParams` / `SmsResult` — SMS send/response
- `CallParams` / `CallResult` — Voice call operations

## Environment Configuration

### Required Environment Variables

```bash
# API Authentication
TELNYX_API_KEY=<your-api-key>

# Voice Configuration
TELNYX_CONNECTION_ID=<voice-connection-id>

# Messaging Configuration
TELNYX_MESSAGING_PROFILE_ID=<messaging-profile-id>

# Webhook Security
TELNYX_PUBLIC_KEY=<public-key-for-verification>

# Phone Numbers (optional defaults)
TELNYX_PHONE_NUMBER=<default-outbound-number>

# Provider Selection
TELEPHONY_PROVIDER=telnyx  # or "twilio" (defaults to "twilio")
```

### Optional for Number Ordering

If you have regulatory bundles or compliance requirements:

```bash
TELNYX_BUNDLE_ID=<bundle-id>           # For bundle-based ordering
TELNYX_REQUIREMENT_GROUP_ID=<group-id> # For requirement groups
TELNYX_BILLING_GROUP_ID=<billing-id>   # For billing routing
```

## Usage Examples

### Sending SMS

```typescript
import { getTelephonyService } from "@/lib/telephony";

const service = getTelephonyService();

const result = await service.sendSms({
  from: "+15551234567",
  to: "+15559876543",
  text: "Hello from Telnyx!",
});

if ("error" in result) {
  console.error("SMS failed:", result.error);
} else {
  console.log("SMS sent:", result.messageId, result.status);
}
```

### Searching for Numbers

```typescript
const service = getTelephonyService();

const numbers = await service.searchAvailableNumbers({
  countryCode: "US",
  areaCode: "415",
  phoneType: "local",
  limit: 10,
});

if ("error" in numbers) {
  console.error("Search failed:", numbers.error);
} else {
  numbers.forEach((n) => console.log(n.phone_number, n.monthly_cost_cents));
}
```

### Purchasing a Number

```typescript
const service = getTelephonyService();

const result = await service.purchaseNumber("+14155551234", {
  connectionId: process.env.TELNYX_CONNECTION_ID,
  messagingProfileId: process.env.TELNYX_MESSAGING_PROFILE_ID,
});

if ("error" in result) {
  console.error("Purchase failed:", result.error);
} else {
  console.log("Number provisioned:", result.phoneNumber, result.status);
}
```

### Creating an Outbound Call

```typescript
const service = getTelephonyService();

const result = await service.createOutboundCall({
  from: "+15551234567",
  to: "+15559876543",
  webhookUrl: "https://yourapp.com/api/webhooks/telnyx/voice",
  metadata: { leadId: "lead-123" },
});

if ("error" in result) {
  console.error("Call creation failed:", result.error);
} else {
  console.log("Call initiated:", result.callId);
}
```

### Handling Webhooks

```typescript
import {
  verifyTelnyxWebhook,
  parseTelnyxEvent,
  extractCallInfo,
  isCallEvent,
} from "@/lib/telephony/telnyx-webhooks";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-telnyx-signature-ed25519");

  // Verify webhook
  if (!verifyTelnyxWebhook(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse event
  const payload = JSON.parse(body);
  const { eventType, data } = parseTelnyxEvent(payload);

  // Handle call events
  if (isCallEvent(eventType)) {
    const callInfo = extractCallInfo(payload);
    console.log("Call event:", eventType, callInfo);

    if (eventType === "call.answered") {
      // Handle answered call
    } else if (eventType === "call.hangup") {
      // Handle hangup
    }
  }

  return NextResponse.json({ ok: true });
}
```

## Integration Points

### SMS Sending
- **Route**: `POST /api/sms/send`
- **Location**: `src/app/api/sms/send/route.ts`
- **Status**: ✅ Integrated (routes to `sendViaTelnyx` when provider is "telnyx")

### Delivery Provider
- **Module**: `src/lib/delivery/provider.ts`
- **Status**: ✅ Integrated (`sendOutbound` routes SMS to correct provider)

### Phone Provisioning
- **Route**: `POST /api/phone/provision`
- **Location**: `src/app/api/phone/provision/route.ts`
- **Status**: ✅ Integrated (uses `purchaseTelnyxPhoneNumber`)

### Available Numbers Search
- **Route**: `GET /api/phone/available`
- **Location**: `src/app/api/phone/available/route.ts`
- **Status**: ✅ Integrated (uses `listAvailableTelnyxPhoneNumbers`)

### Voice Webhooks
- **Route**: `POST /api/voice/connect`
- **Location**: `src/app/api/voice/connect/route.ts`
- **Status**: ⚠️ Currently expects Twilio (needs Telnyx webhook adapter)

## Migration Guide: Twilio to Telnyx

### 1. Set Up Telnyx Account

- Create Telnyx account at https://telnyx.com
- Create API key in Settings
- Create Voice Connection for outbound calls
- Create Messaging Profile for SMS
- Configure webhook URLs

### 2. Environment Configuration

Replace Twilio env vars with Telnyx:

```bash
# Remove/keep for fallback
unset TWILIO_ACCOUNT_SID
unset TWILIO_AUTH_TOKEN
unset TWILIO_PHONE_NUMBER

# Add Telnyx vars
export TELNYX_API_KEY="your-api-key"
export TELNYX_CONNECTION_ID="voice-connection-id"
export TELNYX_MESSAGING_PROFILE_ID="messaging-profile-id"
export TELNYX_PUBLIC_KEY="public-key"
export TELNYX_PHONE_NUMBER="+15551234567"
export TELEPHONY_PROVIDER="telnyx"
```

### 3. Provision Phone Numbers

Use the existing `/api/phone/provision` endpoint. It will automatically use Telnyx when `TELEPHONY_PROVIDER=telnyx`.

### 4. Test SMS

```bash
curl -X POST https://yourapp.com/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{"to": "+15559876543", "body": "Hello"}'
```

### 5. Configure Webhooks

Configure webhook URLs in Telnyx dashboard:
- **Voice**: `https://yourapp.com/api/webhooks/telnyx/voice`
- **Messaging**: `https://yourapp.com/api/webhooks/telnyx/inbound`

### 6. Verify Webhook Signature

Telnyx sends `X-Telnyx-Signature-Ed25519` header. Verify using the `verifyTelnyxWebhook()` helper with your public key.

## Testing

### Unit Tests

Each module has clear, testable exports:

```typescript
import { sendSms } from "@/lib/telephony/telnyx-sms";

describe("Telnyx SMS", () => {
  it("should send SMS", async () => {
    const result = await sendSms({
      from: "+15551234567",
      to: "+15559876543",
      text: "Test",
    });
    expect("messageId" in result).toBe(true);
  });
});
```

### Integration Tests

Mock Telnyx API responses:

```typescript
import { telnyxFetch } from "@/lib/telephony/telnyx-client";

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve(
    new Response(JSON.stringify({ data: { id: "msg-123" } }), { status: 200 })
  )
);

const result = await sendSms({ /* ... */ });
```

## Error Handling

All Telnyx functions return union types:

```typescript
// Success
{ messageId: string; status: string }

// Error
{ error: string }
```

Check the response type before accessing properties:

```typescript
const result = await sendSms(params);
if ("error" in result) {
  // Handle error
  console.error(result.error);
} else {
  // Use result.messageId, result.status
}
```

## Webhook Events

Telnyx sends events via webhooks. Supported event types:

### Voice Events
- `call.initiated` — Call created
- `call.answered` — Call answered
- `call.hangup` — Call ended
- `call.streaming.started` — Audio streaming began
- `call.streaming.stopped` — Audio streaming ended

### Messaging Events
- `message.delivered` — SMS delivered
- `message.sent` — SMS queued
- `message.failed` — SMS failed

### Number Events
- `number.ordered` — Number order placed
- `number.provisioned` — Number activated
- `number.released` — Number disconnected

## Troubleshooting

### "TELNYX_API_KEY not configured"
Check that `TELNYX_API_KEY` is set in environment.

### "Telnyx not configured: no phone number available"
Set `TELNYX_PHONE_NUMBER` or use workspace phone_configs.

### Webhook verification failed
1. Verify `TELNYX_PUBLIC_KEY` is set correctly
2. Check that signature header matches Telnyx's format
3. Ensure request body hasn't been modified

### Number purchase fails
1. Verify account is funded
2. Check country/regulatory compliance requirements
3. Ensure `TELNYX_CONNECTION_ID` and/or `TELNYX_MESSAGING_PROFILE_ID` are set
4. For international numbers, provide `TELNYX_BUNDLE_ID`

## API References

- [Telnyx API Docs](https://developers.telnyx.com/docs/api)
- [Call Control API](https://developers.telnyx.com/docs/api/call-control)
- [Messaging API](https://developers.telnyx.com/docs/api/messaging)
- [Phone Number Management](https://developers.telnyx.com/docs/api/phone-numbers)
- [Webhooks](https://developers.telnyx.com/docs/api/webhooks)

## Support

For issues or questions:
1. Check Telnyx [API status page](https://status.telnyx.com)
2. Review Telnyx [documentation](https://developers.telnyx.com)
3. Contact Telnyx support via dashboard
