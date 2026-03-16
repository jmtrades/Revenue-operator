# CURSOR COMPLETION PROMPT — Recall Touch Final Launch Pass

You are completing recall-touch.com ("Revenue Operator") for production launch. Do NOT plan. Do NOT phase. Execute every item below until done. Run `npx tsc --noEmit` after every batch of changes. Commit after each logical group.

## WHAT HAS BEEN DONE (do NOT redo)
- All `.single()` → `.maybeSingle()` across ALL files (src/app/ + src/lib/)
- All `.catch(() => {})` → `.catch((err) => console.error(...))` in API routes
- All localhost:3000 fallbacks removed
- Phone numbers table migration: added setup_fee_cents, last_billed_at columns
- Phone provision: null safety, Stripe billing, phone_configs upsert
- Billing webhook: null guard on session.subscription, stripe_customer_id propagation
- Checkout: production logging enabled, workspace creation error logging
- Google OAuth: enabled (was disabled), forgot password: linked to real page
- Agent test-call: uses voice_id, correct provider, greeting in metadata
- Agent PATCH: vapi_agent_id in allowed fields
- Agent POST: initialized with defaults
- Hero: removed duplicate trust line
- Team invite: real API endpoint created
- ElevenLabs provider: env guard for ELEVENLABS_PHONE_NUMBER_ID, validate agent_id
- Twilio voice webhook: try-catch on getVoiceProvider, real voice ID, error logging

## REMAINING ITEMS — EXECUTE ALL

### 1. SUPABASE MIGRATION: Apply phone_numbers columns to live DB
The migration file `supabase/migrations/phone_numbers_table.sql` has been updated with `setup_fee_cents` and `last_billed_at` columns. If the table already exists in Supabase, run an ALTER TABLE migration:
```sql
ALTER TABLE revenue_operator.phone_numbers
  ADD COLUMN IF NOT EXISTS setup_fee_cents INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS last_billed_at TIMESTAMPTZ;
UPDATE revenue_operator.phone_numbers SET monthly_cost_cents = 300 WHERE monthly_cost_cents = 150;
```
Also ensure `workspace_invites` table exists for team invitations:
```sql
CREATE TABLE IF NOT EXISTS revenue_operator.workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE revenue_operator.workspace_invites ENABLE ROW LEVEL SECURITY;
```

### 2. ENV VARS — Verify all are set in Vercel
These must be set for the product to function:
- `STRIPE_SECRET_KEY` — Stripe API key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe client key
- `STRIPE_PRICE_ID_SOLO_MONTHLY` / `_ANNUAL` / `_GROWTH_MONTHLY` / `_GROWTH_ANNUAL` / `_SCALE_MONTHLY` / `_SCALE_ANNUAL` — All Stripe price IDs
- `TWILIO_ACCOUNT_SID` — Twilio SID
- `TWILIO_AUTH_TOKEN` — Twilio auth token
- `ELEVENLABS_API_KEY` — ElevenLabs API key
- `ELEVENLABS_PHONE_NUMBER_ID` — ElevenLabs phone number for outbound calls
- `ELEVENLABS_VOICE_ID` — (optional) Default voice, falls back to Rachel (21m00Tcm4TlvDq8ikWAM)
- `NEXT_PUBLIC_APP_URL` — Production URL (https://recall-touch.com or similar)
- `SESSION_SECRET` or `ENCRYPTION_KEY` — Session signing key (CRITICAL for auth)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` — For Google OAuth (if enabling)
- `RESEND_API_KEY` — For sending emails
- `VAPI_API_KEY` + `VAPI_PHONE_NUMBER_ID` — Referenced in test-call route env check

### 3. VOICE QUALITY — Verify agent voice selection persists
In `src/app/app/agents/` (the agent edit page), verify:
- Voice picker shows CURATED_VOICES list
- Selected voice_id is saved via PATCH `/api/agents/[id]`
- That voice_id is used in both test calls AND inbound call handling
- The ElevenLabs model is `eleven_turbo_v2_5` for low latency

### 4. PHONE PURCHASE E2E — Verify in production
1. Go to Settings > Phone > Marketplace
2. Search for a number by area code
3. Click buy → should hit POST `/api/phone/provision`
4. Verify Twilio purchase succeeds
5. Verify DB insert includes setup_fee_cents
6. Verify Stripe invoice item created for setup fee
7. Verify number appears in Settings > Phone
8. Verify inbound calls to that number route through Twilio webhook → ElevenLabs

### 5. BILLING E2E — Verify in production
1. New user signs up → gets trial status
2. Click upgrade → Stripe Checkout opens
3. Complete checkout → webhook fires `checkout.session.completed`
4. Workspace updated with stripe_subscription_id, stripe_customer_id, billing_status
5. Phone number monthly billing cron (`/api/cron/phone-billing`) bills active numbers
6. Cancel flow → subscription.deleted webhook releases Twilio numbers

### 6. GOOGLE OAUTH — Verify working
1. Visit `/sign-in` → Google button should be enabled
2. Click → should redirect to Google OAuth consent
3. Callback at `/api/auth/google/callback` should create user + workspace + session
4. If GOOGLE_CLIENT_ID is not set, button should show "not configured" error gracefully

### 7. ONBOARDING — Verify completion
1. After signup, user hits `/app/onboarding`
2. Business name, description, FAQ collection works
3. Agent name + voice selection works
4. "Finish" saves to DB via `/api/workspace/create` and `/api/agents`
5. User lands on `/app/activity` with working dashboard

### 8. REMAINING UX POLISH (if time permits)
- `src/app/app/settings/team/page.tsx` line 48: empty email in fallback member — add "you@email.com" fallback
- `src/app/app/leads/page.tsx` line 184: remove unused `useRouter()` import
- `src/app/app/appointments/page.tsx` line 183: empty state link goes to `/app/agents` — should go to `/app/appointments` or be removed
- `src/app/app/settings/phone/page.tsx` line 96: `_status` unused state variable — remove
- Inbox polling logic (line 511): verify it skips polling when user is composing
- Add loading spinner on Google OAuth button while redirecting

### 9. CRON JOBS — Verify registered
In `vercel.json`, verify these crons exist:
```json
{ "path": "/api/cron/phone-billing", "schedule": "0 3 1 * *" },
{ "path": "/api/cron/usage-overage", "schedule": "0 4 1 * *" }
```
Both must use GET handlers with `assertCronAuthorized`.

### 10. SECURITY CHECKLIST
- [ ] All webhooks (Stripe, Twilio, Vapi, ElevenLabs) verify signatures in production
- [ ] No demo seed endpoint accessible without `ALLOW_DEMO_SEED` env var
- [ ] Session cookies are httpOnly, secure, sameSite
- [ ] No hardcoded API keys in source code
- [ ] RLS enabled on all tables in revenue_operator schema
- [ ] CORS not overly permissive

Do NOT stop until every item is verified or fixed. Run TypeScript after every change. This is a production launch.
