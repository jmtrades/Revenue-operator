# Production Integrations Checklist

Webhook and integration setup for production.

## Stripe (Billing)

### Webhook Endpoint

**URL:** `https://<YOUR_DOMAIN>/api/billing/webhook`

**Method:** POST

**Required Environment Variables:**
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (from Stripe Dashboard)
- `STRIPE_PRICE_ID` - Subscription price ID

### Stripe Dashboard Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter URL: `https://<YOUR_DOMAIN>/api/billing/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy "Signing secret" → Set as `STRIPE_WEBHOOK_SECRET`

### Verification

**Test Webhook:**

```bash
curl -X POST "https://<YOUR_DOMAIN>/api/billing/webhook" \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: <test-signature>" \
  -d '{"type": "checkout.session.completed", "data": {...}}'
```

**Expected:** 200 OK (idempotent, safe to replay)

## Twilio (SMS)

### Inbound Webhook

**URL:** `https://<YOUR_DOMAIN>/api/webhooks/twilio/inbound`

**Method:** POST

**Required Environment Variables:**
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number (optional, auto-provisioned)

### Twilio Console Setup

1. Go to Twilio Console → Phone Numbers → Manage → Active Numbers
2. Select phone number
3. Set "A MESSAGE COMES IN" webhook: `https://<YOUR_DOMAIN>/api/webhooks/twilio/inbound`
4. Set "STATUS CALLBACK URL": `https://<YOUR_DOMAIN>/api/webhooks/twilio/status`

### Auto-Provision Endpoint

**URL:** `https://<YOUR_DOMAIN>/api/integrations/twilio/auto-provision`

**Method:** POST

**Purpose:** Automatically provisions Twilio phone number if not set

**Verification:** Call endpoint, verify phone number returned

## Zoom (Video Calls)

### OAuth Callback

**URL:** `https://<YOUR_DOMAIN>/api/integrations/zoom/callback`

**Method:** GET

**Required Environment Variables:**
- `ZOOM_CLIENT_ID` - Zoom OAuth client ID
- `ZOOM_CLIENT_SECRET` - Zoom OAuth client secret
- `ZOOM_REDIRECT_URL` - Must match: `https://<YOUR_DOMAIN>/api/integrations/zoom/callback`

### Zoom App Setup

1. Go to Zoom Marketplace → Your App
2. Set "Redirect URL for OAuth": `https://<YOUR_DOMAIN>/api/integrations/zoom/callback`
3. Copy Client ID → Set as `ZOOM_CLIENT_ID`
4. Copy Client Secret → Set as `ZOOM_CLIENT_SECRET`

### Webhook Endpoint

**URL:** `https://<YOUR_DOMAIN>/api/webhooks/zoom`

**Method:** POST

**Required Environment Variables:**
- `ZOOM_WEBHOOK_SECRET` - Webhook verification token (from Zoom App)

### Zoom Webhook Setup

1. Go to Zoom App → Features → Event Subscriptions
2. Set "Event notification endpoint URL": `https://<YOUR_DOMAIN>/api/webhooks/zoom`
3. Copy "Verification Token" → Set as `ZOOM_WEBHOOK_SECRET`
4. Subscribe to events:
   - `meeting.ended`
   - `recording.completed`

## Resend (Email)

### Required Environment Variables

- `RESEND_API_KEY` - Resend API key
- `EMAIL_FROM` - Sender email (defaults to "Revenue Operator <noreply@revenue-operator.com>")

### Resend Dashboard Setup

1. Go to Resend Dashboard → API Keys
2. Create API key → Copy → Set as `RESEND_API_KEY`
3. Verify domain (if using custom domain)
4. Set `EMAIL_FROM` to verified sender

### Usage

Email is sent via `/lib/assurance-delivery` when:
- Daily assurance is due
- Trial reminders (if enabled)

**Verification:** Check Resend Dashboard → Logs for sent emails

## Generic Inbound Webhook

### Endpoint

**URL:** `https://<YOUR_DOMAIN>/api/webhooks/inbound`

**Method:** POST

**Required Environment Variables:**
- `WEBHOOK_SECRET` (optional) - Signature verification secret

### Signature Verification

If `WEBHOOK_SECRET` is set:
- Header: `X-Webhook-Signature` - HMAC-SHA256 signature
- Header: `X-Webhook-Timestamp` - Unix timestamp (must be within 5 minutes)

**Verification:** Webhook signature verified using `verifyWebhookSignature` function

### Rate Limiting

- Rate limit: 100 requests per minute per IP
- Over limit: Returns 429, neutral response

## Verification Checklist

- [ ] Stripe webhook configured with correct URL and events
- [ ] `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- [ ] Twilio inbound webhook configured
- [ ] Twilio status callback configured
- [ ] Zoom OAuth redirect URL matches
- [ ] Zoom webhook endpoint configured
- [ ] `ZOOM_WEBHOOK_SECRET` matches Zoom App
- [ ] Resend API key set (if email enabled)
- [ ] `EMAIL_FROM` set to verified sender (if email enabled)
- [ ] Generic webhook secret set (if signature verification required)

## Testing

### Test Stripe Webhook

Use Stripe CLI:

```bash
stripe listen --forward-to https://<YOUR_DOMAIN>/api/billing/webhook
stripe trigger checkout.session.completed
```

### Test Twilio Webhook

Send test SMS to Twilio number, verify webhook receives POST request.

### Test Zoom Webhook

Use Zoom webhook testing tool or send test POST request with valid signature.

### Test Resend

Check Resend Dashboard → Logs after assurance delivery cron runs.
