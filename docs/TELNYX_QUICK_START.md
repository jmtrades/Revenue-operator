# Telnyx Integration - Quick Start Guide

## 30-Second Setup

1. **Set environment variables:**
```bash
export TELEPHONY_PROVIDER="telnyx"
export TELNYX_API_KEY="your-api-key"
export TELNYX_CONNECTION_ID="your-connection-id"
export TELNYX_MESSAGING_PROFILE_ID="your-messaging-profile-id"
export TELNYX_PUBLIC_KEY="your-public-key"
export TELNYX_PHONE_NUMBER="+15551234567"
```

2. **Done!** The system now uses Telnyx automatically.

## Common Tasks

### Send an SMS

```typescript
import { getTelephonyService } from "@/lib/telephony";

const service = getTelephonyService();
const result = await service.sendSms({
  from: "+15551234567",
  to: "+15559876543",
  text: "Hello!",
});

console.log(result); // { messageId: "...", status: "queued" }
```

### Search for Numbers

```typescript
const numbers = await service.searchAvailableNumbers({
  countryCode: "US",
  areaCode: "415",
  phoneType: "local",
});

numbers.forEach(n => console.log(n.phone_number)); // ["+14155551234", ...]
```

### Purchase a Number

```typescript
const result = await service.purchaseNumber("+14155551234");
console.log(result); // { numberId: "...", phoneNumber: "+14155551234", status: "pending" }
```

### Make an Outbound Call

```typescript
const result = await service.createOutboundCall({
  from: "+15551234567",
  to: "+15559876543",
  webhookUrl: "https://yourapp.com/api/webhooks/telnyx/voice",
});

console.log(result); // { callId: "...", status: "queued" }
```

## Error Handling Pattern

All functions return a union type: success or error.

```typescript
const result = await service.sendSms(params);

if ("error" in result) {
  console.error("Failed:", result.error);
} else {
  console.log("Success:", result.messageId);
}
```

## Webhook Configuration

Configure these URLs in Telnyx Dashboard:

1. **Voice Webhook**
   - URL: `https://yourapp.com/api/webhooks/telnyx/voice`
   - Method: POST
   - Signature Header: `X-Telnyx-Signature-Ed25519`

2. **Messaging Webhook**
   - URL: `https://yourapp.com/api/webhooks/telnyx/inbound`
   - Method: POST
   - Signature Header: `X-Telnyx-Signature-Ed25519`

## File Locations Reference

| What | File |
|------|------|
| API Client | `src/lib/telephony/telnyx-client.ts` |
| SMS Functions | `src/lib/telephony/telnyx-sms.ts` |
| Voice Functions | `src/lib/telephony/telnyx-voice.ts` |
| Numbers Functions | `src/lib/telephony/telnyx-numbers.ts` |
| Webhooks | `src/lib/telephony/telnyx-webhooks.ts` |
| Unified Service | `src/lib/telephony/index.ts` |
| SMS Endpoint | `src/app/api/sms/send/route.ts` |
| Voice Webhook | `src/app/api/webhooks/telnyx/voice/route.ts` |
| SMS Webhook | `src/app/api/webhooks/telnyx/inbound/route.ts` |

## Testing with curl

### Send SMS
```bash
curl -X POST https://yourapp.com/api/sms/send \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "to": "+15559876543",
    "body": "Test message"
  }'
```

### Get Available Numbers
```bash
curl https://yourapp.com/api/phone/available?countryCode=US&areaCode=415 \
  -H "Cookie: session=..."
```

### Provision a Number
```bash
curl -X POST https://yourapp.com/api/phone/provision \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "phone_number": "+14155551234",
    "friendly_name": "Sales Line"
  }'
```

## Troubleshooting

### SMS fails with "Telnyx not configured"
- Check `TELNYX_PHONE_NUMBER` env var is set
- Check workspace `phone_configs` table has a `proxy_number`

### Webhook signature fails
- Verify `TELNYX_PUBLIC_KEY` matches dashboard
- Don't modify request body after receiving
- Signature is in `X-Telnyx-Signature-Ed25519` header

### Number purchase fails
- Verify account is funded
- Check `TELNYX_CONNECTION_ID` is configured
- For international numbers, set `TELNYX_BUNDLE_ID`

### Call creation fails
- Verify `TELNYX_CONNECTION_ID` is set
- Verify phone numbers are in E.164 format: `+15551234567`
- Check connection is active in Telnyx dashboard

## Next Steps

1. Read [TELNYX_INTEGRATION.md](./TELNYX_INTEGRATION.md) for detailed docs
2. Check [TELNYX_FILES_SUMMARY.md](./TELNYX_FILES_SUMMARY.md) for file structure
3. Review webhook handlers in `src/app/api/webhooks/telnyx/`
4. Test with real Telnyx API credentials

## Support

- [Telnyx API Docs](https://developers.telnyx.com/docs/api)
- [Telnyx Guides](https://developers.telnyx.com/docs)
- [Telnyx Support](https://telnyx.com/contact)
