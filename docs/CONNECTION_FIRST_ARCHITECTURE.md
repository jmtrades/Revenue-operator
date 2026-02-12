# Connection-First Architecture

## Product Laws (Permanent)

1. **No configuration before value** - User must see system working before filling forms
2. **One connection required** - Onboarding allows exactly one channel: SMS OR Instagram OR WhatsApp OR Email OR CRM
3. **Remove multi-step onboarding** - Delete any wizard requiring business info, offer description, target customer, or rules before activation
4. **Activation under 60 seconds** - Flow: Enter email → connect channel → system operates
5. **Everything else optional** - All enrichment happens AFTER live activity

---

## New Onboarding Flow

### `/activate`
- Single email input
- Stripe checkout (card required, 14-day trial)
- Redirects to `/connect` after checkout success

### `/connect`
- Choose ONE channel:
  - Text handling (SMS via Twilio) - **ACTIVE**
  - Instagram - Coming soon
  - WhatsApp - Coming soon
  - Email forwarding - Coming soon
  - CRM integration - Coming soon
- Auto-provisions Twilio when SMS selected
- Immediately redirects to `/live` after connection

### `/live`
- Shows real conversations appearing and being handled
- Polls `/api/command-center` for activity every 3 seconds
- Displays recent actions taken
- "Go to overview" button appears after 8 seconds
- Redirects to `/dashboard`

### `/dashboard`
- Main overview showing what system is doing NOW
- Real activity, monitoring state
- No configuration UI

---

## Twilio Auto-Provisioning

**API:** `/api/integrations/twilio/auto-provision`

**Behavior:**
1. Checks if workspace already has active phone config
2. Attempts to purchase new Twilio number (US, SMS-enabled)
3. Configures webhooks:
   - Inbound: `/api/webhooks/twilio/inbound`
   - Status: `/api/webhooks/twilio/status`
4. Falls back to `TWILIO_PROXY_NUMBER` env var if purchase fails
5. Stores in `phone_configs` table with `status: "active"`

**No credential input required** - Uses global Twilio account credentials from env vars.

---

## Universal Conversation Schema

All channels normalize to:

```
conversation_id
lead_identity (phone/email/username)
last_message
intent_state (NEW_INBOUND, QUALIFYING, OBJECTION, BOOKING, etc.)
stage
risk_state
next_action_at
```

Channels don't matter - system processes all the same way.

---

## Behavior Engine Rules

AI never free-writes replies. Instead:

1. `classifyConversationState()` - Determines current state
2. `determineObjective()` - Selects objective (acknowledge, clarify, reduce_uncertainty, reengage, secure_commitment, prepare_attendance)
3. `selectResponseStrategy()` - Chooses strategy based on state + objective
4. `buildMessageFromDeterministicTemplates()` - Fills template slots deterministically

All responses:
- Short (1-3 sentences)
- Natural
- Low pressure
- Context aware

---

## Objectives (Only These Allowed)

- `acknowledge` - Confirm receipt
- `clarify` - Ask clarifying question
- `reduce_uncertainty` - Address hesitation
- `reengage` - Reopen quiet conversation
- `secure_commitment` - Get to next step (call, meeting)
- `prepare_attendance` - Confirm upcoming call

No marketing copy. No hype. No long explanations.

---

## Objection Handling

Handle objections by reducing cognitive load, not persuasion:

- **Hesitation** → Slow tempo + reopen loop
- **Price concern** → Narrow scope + question
- **Ghosting** → Soft continuation
- **Comparison** → Decision framing
- **No show risk** → Confirmation reinforcement

---

## UI Principles

- No CRM layout
- No pipeline builder
- No automation editor
- Dashboard only shows:
  - Conversations needing attention
  - What system handled
  - What is scheduled next
- Everything else hidden

---

## Files Changed

### New Files
- `/src/app/connect/page.tsx` - Channel selection page
- `/src/app/live/page.tsx` - Live activation screen (shows real activity)
- `/src/app/api/integrations/twilio/auto-provision/route.ts` - Auto-provision Twilio

### Updated Files
- `/src/app/activate/page.tsx` - Redirects to `/connect` after checkout
- `/src/app/api/billing/checkout/route.ts` - Success URL points to `/connect`
- `/src/middleware.ts` - Added `/connect` and `/live` to public routes
- `/src/app/api/webhooks/twilio/inbound/route.ts` - Already created (handles inbound SMS)
- `/src/lib/delivery/provider.ts` - Updated to use workspace-specific Twilio config

---

## Next Steps

1. ✅ Twilio auto-provisioning - DONE
2. ✅ Connection page - DONE
3. ✅ Live page showing real activity - DONE
4. ⚠️ Universal conversation schema - Need to normalize all channels
5. ⚠️ Deterministic behavior engine - Need to refactor decision pipeline
6. ⚠️ Remove business info forms - Need to audit and remove from onboarding
7. ⚠️ Optional enrichment settings - Move to settings page (after activation)

---

## Testing Checklist

- [ ] Email entry → Stripe checkout → Connect page
- [ ] SMS connection → Auto-provisions Twilio → Live page
- [ ] Live page shows real activities from command-center API
- [ ] Live page → Dashboard redirect works
- [ ] Inbound SMS → Creates conversation → Shows in live page
- [ ] No business info forms appear before activation
