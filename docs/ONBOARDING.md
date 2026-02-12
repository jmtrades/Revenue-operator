# Onboarding Flow Documentation

## Connection-First Architecture

The onboarding flow follows strict product laws:
1. **No configuration before value** - System must work before any forms
2. **One connection required** - User connects exactly one channel
3. **Activation under 60 seconds** - Email → Connect → Live → Dashboard

---

## Flow Steps

### 1. `/activate` - Email Entry
- Single email input field
- Creates workspace via `/api/trial/start`
- Redirects to Stripe checkout (card required, 14-day trial)
- After checkout success → `/connect`

**No business information collected here.**

### 2. `/connect` - Channel Selection
- User chooses ONE channel:
  - **Text handling (SMS)** - Auto-provisions Twilio, no credentials needed
  - Instagram - Coming soon
  - WhatsApp - Coming soon
  - Email forwarding - Coming soon
  - CRM integration - Coming soon
- Clicking SMS:
  1. Calls `/api/integrations/twilio/auto-provision`
  2. Purchases/assigns Twilio number automatically
  3. Configures webhooks
  4. Activates workspace via `/api/activation`
  5. Redirects to `/live`

**No business information collected here.**

### 3. `/live` - Live Activation Screen
- Shows real conversations appearing and being handled
- Polls `/api/command-center` every 3 seconds for activity
- Displays recent actions taken by the system
- "Go to overview" button appears after 8 seconds
- Redirects to `/dashboard`

**This is where users see value first.**

### 4. `/dashboard` - Main Overview
- Shows what system is doing NOW
- Real activity, monitoring state
- No configuration UI

---

## Twilio Auto-Provisioning

**Endpoint:** `POST /api/integrations/twilio/auto-provision`

**Behavior:**
1. Checks if workspace already has active phone config
2. Attempts to purchase new Twilio number (US, SMS-enabled)
3. Configures webhooks:
   - Inbound: `/api/webhooks/twilio/inbound`
   - Status: `/api/webhooks/twilio/status`
4. Falls back to `TWILIO_PROXY_NUMBER` env var if purchase fails
5. Stores in `phone_configs` table with `status: "active"`

**No credential input required** - Uses global Twilio account from env vars.

---

## What Happens After Connection

1. **Inbound SMS arrives** → `/api/webhooks/twilio/inbound` receives it
2. **Webhook handler** → Creates/updates lead, creates conversation
3. **Decision pipeline** → Runs automatically via queue
4. **Response sent** → If needed, via workspace-specific Twilio config
5. **Activity appears** → Shows in `/live` page and `/dashboard`

---

## Business Information (Optional, After Activation)

Business context is **NOT collected during onboarding**.

Instead, it's available as **optional enrichment** in Settings:
- Business name
- Offer description
- Target customer
- Booking link
- Availability rules

These are used for template personalization but are **not required** for the system to operate.

---

## Testing the Flow

1. Go to `/activate`
2. Enter email
3. Complete Stripe checkout
4. Land on `/connect`
5. Click "Text handling"
6. See `/live` page with activity
7. Click "Go to overview"
8. See `/dashboard` with real data

**Total time:** Under 60 seconds from email entry to seeing system operate.

---

## Files

- `/src/app/activate/page.tsx` - Email entry
- `/src/app/connect/page.tsx` - Channel selection
- `/src/app/live/page.tsx` - Live activation screen
- `/src/app/api/integrations/twilio/auto-provision/route.ts` - Auto-provision Twilio
- `/src/app/api/webhooks/twilio/inbound/route.ts` - Handle inbound SMS
