# Gap Analysis: Production Launch Readiness

## ✅ EXISTING INFRASTRUCTURE

### Stripe Billing
- ✅ Checkout API (`/api/billing/checkout`) - Card required, 14-day trial
- ✅ Webhook handler (`/api/billing/webhook`) - Handles subscription events
- ✅ Trial period configured (14 days)
- ⚠️ Need: Renewal reminder emails (3 days + 24h before renewal)

### Twilio SMS
- ✅ Outbound sending (`sendViaTwilio` in `delivery/provider.ts`)
- ✅ Status webhook (`/api/webhooks/twilio/status`)
- ✅ Provision API (`/api/integrations/twilio/provision`) - Basic proxy mode
- ❌ Missing: Inbound webhook handler (`/api/webhooks/twilio/inbound`)
- ❌ Missing: Per-workspace Twilio config (currently uses global env vars)
- ❌ Missing: Onboarding UI for Twilio (buy/assign number, paste SID)
- ❌ Missing: Database fields for per-workspace Twilio (phone_configs table exists but needs twilio_account_sid, twilio_phone_sid)

### State Machine & Templates
- ✅ State machine exists (`src/lib/state-machine/index.ts`) - Uses: NEW, CONTACTED, ENGAGED, QUALIFIED, BOOKED, etc.
- ✅ Template library exists (`src/lib/templates/index.ts`) - ACTION_TEMPLATES with slots
- ✅ Template filling exists (`src/lib/ai/templates.ts`) - AI-based slot filling
- ❌ Missing: Setter-specific states (NEW_INBOUND, QUALIFYING, OBJECTION, BOOKING, CONFIRMING, NO_SHOW_RECOVERY, HANDOFF_READY, DO_NOT_CONTACT)
- ❌ Missing: Intent + Objection Classifier (LLM labels only)
- ❌ Missing: Handoff triggers (discount/contract/payment requests → "best handled on call")
- ❌ Missing: Coverage scope toggles (Autopilot Setter / Follow-up only / Attendance only)

### Onboarding Flow
- ✅ Activate page (`/activate`) - Email entry, Stripe checkout redirect
- ✅ Basic onboarding page (`/dashboard/onboarding`) - Calendar connect only
- ❌ Missing: Multi-step stepper (Plan -> Phone -> Business Context -> Go live)
- ❌ Missing: Business context form (business name, offer, target customer, booking link, availability rules)
- ❌ Missing: Twilio phone setup step in onboarding
- ❌ Missing: "Turn on Autopilot" final step

### UI/UX
- ⚠️ Need: Audit contrast/visibility issues globally
- ⚠️ Need: Check business context settings page exists
- ✅ Dark design system partially implemented

---

## 🚨 CRITICAL GAPS TO FIX

### 1. Twilio Inbound Webhook Handler
**Priority: CRITICAL**
- Create `/api/webhooks/twilio/inbound/route.ts`
- Parse Twilio webhook format
- Create/update lead from inbound SMS
- Trigger decision pipeline

### 2. Per-Workspace Twilio Configuration
**Priority: CRITICAL**
- Update `phone_configs` table schema (add twilio_account_sid, twilio_phone_sid)
- Update `sendViaTwilio` to use workspace-specific config
- Create API to store Twilio credentials per workspace

### 3. Twilio Onboarding UI
**Priority: HIGH**
- Add step in onboarding flow for Twilio setup
- Options: Buy number (via Twilio API) OR paste existing Twilio number SID
- Store config in `phone_configs` table

### 4. Multi-Step Onboarding Stepper
**Priority: HIGH**
- Refactor `/dashboard/onboarding` to multi-step:
  1. Plan selection (already done via Stripe checkout)
  2. Phone setup (Twilio)
  3. Business context (name, offer, target, booking link, availability)
  4. Go live / Turn on Autopilot

### 5. Business Context Collection
**Priority: HIGH**
- Create form for: business name, offer description, target customer, booking link, availability rules
- Store in `workspaces` or `settings` table
- Use for template personalization

### 6. Setter Engine States & Classifier
**Priority: MEDIUM**
- Add Setter-specific states to state machine
- Create Intent + Objection Classifier (LLM labels only)
- Add handoff triggers

### 7. Coverage Scope Toggles
**Priority: MEDIUM**
- Add to settings: coverage_flags (already exists in schema)
- UI toggles: Autopilot Setter / Follow-up only / Attendance only
- Update decision pipeline to respect flags

### 8. UI Contrast/Visibility Audit
**Priority: MEDIUM**
- Audit all pages for text contrast
- Fix too-dark borders
- Ensure cards have padding and hierarchy

---

## IMPLEMENTATION ORDER

1. ✅ Fix UI visibility/contrast issues globally
2. ✅ Audit onboarding flow end-to-end (remove email loops)
3. ✅ Build Stripe trial checkout (already done, verify renewal reminders)
4. ✅ Build Twilio onboarding (buy/assign number) + store config + wire inbound webhook
5. ✅ Implement Setter Engine (classifier, templates, state machine, handoff triggers)
6. ✅ Add coverage scopes + toggles
7. ✅ Add QA (unit tests, integration tests)
