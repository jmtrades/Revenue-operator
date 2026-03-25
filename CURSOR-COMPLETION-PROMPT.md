# CURSOR MASTER COMPLETION PROMPT — Recall Touch Final Launch

You are completing recall-touch.com for production launch. You must execute EVERY item below. Do NOT plan. Do NOT phase. Do NOT stop until everything is done. Run `npx tsc --noEmit` after every batch of changes. Commit after each logical group. Read relevant files before editing.

---

## WHAT HAS ALREADY BEEN DONE (do NOT redo these)

- All `.single()` → `.maybeSingle()` across ALL 500+ files (src/app/ + src/lib/)
- All `.catch(() => {})` → `.catch((err) => console.error(...))` in API routes
- All localhost:3000 fallbacks removed
- Phone numbers migration: added setup_fee_cents, last_billed_at columns
- Phone provision: null safety, Stripe billing, phone_configs upsert
- Billing webhook: null guard on session.subscription, stripe_customer_id propagation
- Checkout: production logging enabled, workspace creation error logging
- Google OAuth: enabled (was permanently disabled), forgot password: linked to real page
- Agent test-call: uses voice_id from DB, correct provider "elevenlabs", greeting in metadata
- Agent PATCH: vapi_agent_id AND template in allowed fields
- Agent POST: accepts template, purpose, personality, voice_id, greeting from body
- Hero: removed duplicate trust line
- Team invite: real API endpoint created at /api/workspace/invite
- ElevenLabs provider: env guard for ELEVENLABS_PHONE_NUMBER_ID, validate agent_id
- Twilio voice webhook: try-catch on getVoiceProvider, real voice ID from env, error logging
- Dashboard: minutes remaining KPI card, smart upgrade banner at 80% usage
- App sidebar: Help & Support link added
- SignIn form: Google OAuth button with Loader2 spinner, linked forgot-password page

---

## SECTION 1: SUPABASE MIGRATIONS (APPLY TO LIVE DB)

### 1A. Phone numbers table columns
If the phone_numbers table already exists, run:
```sql
ALTER TABLE revenue_operator.phone_numbers
  ADD COLUMN IF NOT EXISTS setup_fee_cents INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS last_billed_at TIMESTAMPTZ;
UPDATE revenue_operator.phone_numbers SET monthly_cost_cents = 300 WHERE monthly_cost_cents = 150;
```

### 1B. Workspace invites table
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
CREATE POLICY "workspace_isolation_invites" ON revenue_operator.workspace_invites
  FOR ALL USING (workspace_id IN (SELECT id FROM revenue_operator.workspaces WHERE owner_id = auth.uid()));
```

### 1C. Agent template column
```sql
ALTER TABLE revenue_operator.agents ADD COLUMN IF NOT EXISTS template TEXT;
```

### 1D. Workspace members view
If `workspace_members` table doesn't exist, create a view:
```sql
CREATE OR REPLACE VIEW revenue_operator.workspace_members AS
SELECT wr.id, wr.user_id, wr.workspace_id, wr.role, 'active' as status, wr.created_at
FROM revenue_operator.workspace_roles wr;
```

---

## SECTION 2: ENV VARS (VERIFY ALL SET IN VERCEL)

Every one of these MUST be set for the platform to work:

**Auth:** `SESSION_SECRET` or `ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`

**Billing:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, all 6 `STRIPE_PRICE_ID_*` vars

**Voice/Calling:** `ELEVENLABS_API_KEY`, `ELEVENLABS_PHONE_NUMBER_ID`, `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`, `VAPI_API_KEY` + `VAPI_PHONE_NUMBER_ID`

**App:** `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`

---

## SECTION 3: AGENT TYPE PERSISTENCE BUG

The user reported: "every time the agents tab is refreshed, the agent type changes to receptionist."

Root cause was the `template` field missing from PATCH allowed list — now fixed.

**Remaining work:**
1. In `src/app/app/agents/new/NewAgentWizardClient.tsx`, find the fetch to `/api/agents` and ensure `template: state.templateId` is in the POST body.
2. In the agent detail/edit page, ensure `template` is in the PATCH body when saving.
3. In `src/app/app/agents/components/IdentityStepContent.tsx`, ensure template selector reads from agent DB data, not just local state.

**Test:** Create agent with "Sales Rep" template → save → refresh → template must persist.

---

## SECTION 4: MINUTES REMAINING ON DASHBOARD

Dashboard now has a minutes KPI card. It depends on `GET /api/billing/status` returning `{ minutes_used, minutes_limit }`.

**Implement in the billing status route:**
```typescript
const PLAN_MINUTES: Record<string, number> = { solo: 400, starter: 400, growth: 1500, scale: 5000 };
const tier = (workspace.billing_tier ?? "starter").toLowerCase();
const minutesLimit = PLAN_MINUTES[tier] ?? 400;

const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
const { data: sessions } = await db.from("call_sessions")
  .select("call_started_at, call_ended_at").eq("workspace_id", workspaceId)
  .gte("call_started_at", startOfMonth.toISOString());
const minutesUsed = Math.ceil((sessions ?? []).reduce((sum, s) => {
  const start = new Date(s.call_started_at).getTime();
  const end = s.call_ended_at ? new Date(s.call_ended_at).getTime() : start;
  return sum + (end - start) / 60000;
}, 0));
// Add to response: minutes_used: minutesUsed, minutes_limit: minutesLimit
```

Also add usage display in sidebar (`AppShellClient.tsx`) below "Starter · Trial": show "X/Y min".

---

## SECTION 5: BUY MORE MINUTES

On billing page (`src/app/app/settings/billing/page.tsx`), add a minutes usage bar with progress indicator and "Upgrade for more" button above the plan change section. Show: used/limit with a visual progress bar, percentage, and upgrade CTA.

---

## SECTION 6: SUPPORT VISIBILITY

**Already done:** Help & Support link in sidebar.

**Still needed:**
1. Add `support@recall-touch.com` as a small text link below the Help & Support nav item in the sidebar
2. Add "Need help?" note with support email on phone settings and integration settings pages
3. Ensure the /contact page is accessible without auth

---

## SECTION 7: CRM INTEGRATION FOR XLEADS + PODIO

User reported CRM connection trouble with xleads.com and podio.com.

No dedicated xleads/Podio integrations exist. Add webhook-based CRM guidance:
1. On integrations page, add a section for "Other CRMs (xLeads, Podio, etc.)" explaining webhook-based integration
2. Make the existing webhook configuration section more prominent and clearly labeled
3. Add Zapier mention as a bridge between platforms

---

## SECTION 8: BOT TESTING FLOW FIX

User reported: "test the bot flow needs to be fixed"

In `src/app/api/agents/[id]/test-call/route.ts`:
1. Replace the VAPI env check with ELEVENLABS check:
```typescript
if (!process.env.ELEVENLABS_API_KEY) {
  return NextResponse.json({ ok: true, message: "Voice not configured. Set ELEVENLABS_API_KEY." });
}
```
2. Add cleanup for test-created ElevenLabs agents (delete after 5 min timeout)
3. In the agent detail UI, make the Test Call button prominent with clear instructions

---

## SECTION 9: COMPARISON TABLE CLEANUP

In `src/lib/constants.ts`, rename COMPARISON_FEATURES keys from `professional`/`business` to `growth`/`scale` to match actual tier names. Update `PricingContent.tsx` to read `row.growth` and `row.scale` instead.

---

## SECTION 10: FOOTER SECURITY BADGES

In `src/components/sections/Footer.tsx`, replace `{t("securityBadges")}` text with styled badge components showing SOC 2, 256-bit SSL, GDPR, 99.9% Uptime with lock/shield icons.

---

## SECTION 11: SECURITY CHECKLIST

Verify before launch:
- [ ] All webhooks verify signatures in production
- [ ] Demo seed blocked without ALLOW_DEMO_SEED
- [ ] Session cookies: httpOnly, secure, sameSite
- [ ] No hardcoded API keys in source
- [ ] RLS on all tables
- [ ] Rate limiting on auth routes

---

## SECTION 12: CRON JOBS

Verify `vercel.json` has: phone-billing (monthly), usage-overage (monthly), process-queue (every 5 min). All GET with assertCronAuthorized.

---

## SECTION 13: EMPTY + LOADING STATES

Check every page for proper empty states and loading skeletons:
- Agents, Calls, Leads, Campaigns, Inbox, Appointments, Analytics, Knowledge
- Each empty state needs: clear message + actionable CTA
- Each page needs: loading skeleton while data fetches
- No broken charts or undefined values on zero data

---

## SECTION 14: FINAL E2E VERIFICATION

After all fixes, verify each flow actually works:

1. Signup → Onboarding → Dashboard
2. Agent Create → Template select → Save → Refresh → Template persists
3. Agent Test Call → Phone rings → AI speaks with correct voice
4. Phone Purchase → Twilio buys → DB saves → Stripe bills setup fee
5. Inbound Call → Twilio webhook → ElevenLabs AI answers
6. Outbound Call → Lead selected → AI places call
7. Billing Upgrade → Stripe Checkout → Workspace upgraded
8. Google OAuth → Account created → Logged in
9. Forgot Password → Reset email sent
10. Team Invite → API called → Invite saved
11. Help & Support → Contact page accessible

Do NOT stop until every item is complete and verified.
