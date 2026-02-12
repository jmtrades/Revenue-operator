# 🚀 GO LIVE CHECKLIST — DEPLOY NOW

**Follow this top → bottom. Do not skip steps.**

---

## ✅ STEP 1: Run Database Migration

**Action:** Open Supabase Dashboard → SQL Editor

**Paste and run:**

```sql
-- Copy entire contents of: supabase/migrations/activation_events.sql

CREATE TABLE IF NOT EXISTS revenue_operator.activation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES revenue_operator.users(id) ON DELETE SET NULL,
  step text NOT NULL CHECK (step IN ('signup', 'connected_number', 'inbound_received', 'reply_sent', 'dashboard_viewed_next_day')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activation_events_workspace_id ON revenue_operator.activation_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activation_events_step ON revenue_operator.activation_events(step);
CREATE INDEX IF NOT EXISTS idx_activation_events_created_at ON revenue_operator.activation_events(created_at);

ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS first_day_email_sent_at timestamptz;
```

**Verify:** Check Tables → `activation_events` exists

**⚠️ If missing → activation tracking will silently break**

---

## ✅ STEP 2: Set Production Environment Variables (Vercel)

**Action:** Vercel → Your Project → Settings → Environment Variables

### Generate Secrets (run locally):

```bash
# Generate SESSION_SECRET
openssl rand -base64 32

# Generate CRON_SECRET  
openssl rand -base64 32
```

### Add These Variables:

#### **Core**
```
NEXT_PUBLIC_APP_URL=https://yourdomain.com
SESSION_SECRET=<paste generated 32+ char>
CRON_SECRET=<paste generated 32+ char>
```

#### **Supabase**
```
NEXT_PUBLIC_SUPABASE_URL=<from Supabase → Settings → API>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase → Settings → API>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase → Settings → API>
```

#### **Stripe**
```
STRIPE_SECRET_KEY=<from Stripe → Developers → API keys>
STRIPE_WEBHOOK_SECRET=<will set in step 3>
STRIPE_PRICE_ID=<from Stripe → Products → Your product>
```

#### **Twilio**
```
TWILIO_ACCOUNT_SID=<from Twilio Console>
TWILIO_AUTH_TOKEN=<from Twilio Console>
TWILIO_PROXY_NUMBER=<optional fallback number>
```

#### **Email (Resend)**
```
RESEND_API_KEY=<from Resend → API Keys>
EMAIL_FROM=you@yourdomain.com
```

**Save → Vercel redeploys automatically**

---

## ✅ STEP 3: Configure Stripe Webhook

**Action:** Stripe Dashboard → Developers → Webhooks → Add endpoint

**URL:**
```
https://yourdomain.com/api/billing/webhook
```

**Events to send:**
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.updated`
- ✅ `invoice.paid`
- ✅ `invoice.payment_failed`

**After creating:**
1. Copy the **Signing Secret**
2. Paste into Vercel env var: `STRIPE_WEBHOOK_SECRET`
3. Redeploy

**⚠️ Without this → payments won't process**

---

## ✅ STEP 4: Add Cron Jobs (Vercel)

**Action:** Vercel → Settings → Cron Jobs → Add

### **Queue Processor** (runs every minute)
```
Schedule: * * * * *
Path: /api/cron/process-queue
Authorization Header: Bearer <your CRON_SECRET>
```

### **Trial Reminders** (runs hourly)
```
Schedule: 0 * * * *
Path: /api/cron/trial-reminders
Authorization Header: Bearer <your CRON_SECRET>
```

### **First-Day Retention Email** (runs hourly)
```
Schedule: 0 * * * *
Path: /api/cron/first-day-check
Authorization Header: Bearer <your CRON_SECRET>
```

**⚠️ Without these → system looks alive but does nothing**

---

## ✅ STEP 5: Test Twilio Phone Handling

**After deploy completes:**

1. **Create test workspace:**
   - Go to your deployed app
   - Enter email → complete checkout
   - Connect number

2. **Send real test message:**
   - Text the provisioned number from your phone
   - Use: "Hi, interested in learning more"

3. **Verify:**
   - ✅ Inbound message logged in dashboard
   - ✅ Automatic reply sent
   - ✅ Conversation visible in dashboard

**⚠️ If any step fails → don't launch yet, fix first**

---

## ✅ STEP 6: First Real User Test

**Critical:** Do NOT use friends who know what it is.

**Find someone and say:**
> "Can you try this and tell me what happens?"

**Watch silently. Take notes.**

**If they ask ANY question → fix UI, don't explain it.**

**Success criteria:**
- They complete signup without asking questions
- They send a test message
- They see the reply
- They understand what happened

---

## 🎯 What Happens Next

**Once this works, you're in activation acquisition phase.**

**Goal:** 20 users → 5 daily active → 2 paying

**That proves product.**

---

## ✅ Deployment Verification

After completing all steps, verify:

- [ ] Migration ran successfully
- [ ] All environment variables set
- [ ] Stripe webhook configured
- [ ] Cron jobs added
- [ ] Twilio test passed
- [ ] First real user test completed

**When complete → tell me and I'll give you the exact message to send to your first 50 prospects.**
