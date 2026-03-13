You are an implementation engineer executing the FINAL launch perfection pass for Recall Touch. The live site has been evaluated. Every issue below is confirmed from live screenshots and codebase audit. Fix ALL of them. Do not plan. Do not narrate. Do not ask questions. Open files, edit, save, move on. Every item must be completed before you commit.

---

## SECTION A — LAUNCH BLOCKERS (i18n keys still showing on live site)

The Vercel deployment is STALE. The latest commits (d55ee9f, 4a621ae, 87423fa) have not deployed. The live site still shows raw i18n keys. First, force a deployment:

```bash
git commit --allow-empty -m "chore: force Vercel redeploy" && git push origin main
```

Then verify the following i18n fixes are actually in the code (they should be from prior commits — if ANY are missing, re-apply them):

### A1: Verify agents step labels use correct prefix

File: `src/app/app/agents/AgentsPageClient.tsx` (~line 163)
File: `src/app/app/agents/components/AgentDetail.tsx` (~line 50)

Both SETUP_STEPS arrays must use `"steps.identity"` NOT `"agents.steps.identity"`. The `useTranslations("agents")` namespace already prepends "agents.", so keys must be relative. Verify this is correct. If either file still has `"agents.steps.identity"`, fix it.

### A2: Verify 7 missing i18n keys exist in en.json

File: `src/i18n/messages/en.json`

Verify these exist inside the `"agents"` object:
```json
"status": { "live": "Live", "ready": "Ready", "calls": "calls" },
"links": { "analytics": "Analytics", "flow": "Flow builder" }
```

And inside the `"common"` object:
```json
"status": { "active": "Active", "inactive": "Inactive" }
```

If any are missing, add them. Also verify they exist in es.json, fr.json, de.json, pt.json, ja.json.

---

## SECTION B — MIGRATE 65+ HARDCODED ENGLISH TOAST STRINGS TO i18n

The following files contain hardcoded English strings passed to `setToast()`. Every single one must be converted to use `useTranslations()`. Add the corresponding keys to `src/i18n/messages/en.json` (and placeholder copies to all 5 other locale files).

### B1: `src/app/app/agents/AgentsPageClient.tsx`

Replace every hardcoded setToast string:
- `"Test link copied!"` → `t("toast.testLinkCopied")`
- `"Select a voice first to hear a preview."` → `t("toast.selectVoiceFirst")`
- `"Could not play preview"` → `t("toast.previewFailed")`
- `"Could not save agent"` → `t("toast.saveFailed")`
- `"Changes couldn't be saved. Try again."` → `t("toast.saveRetry")`
- `"Agent deleted"` → `t("toast.deleted")`
- `"Could not delete agent"` → `t("toast.deleteFailed")`
- `"Agent created and synced"` → `t("toast.created")`
- `"Could not create agent"` → `t("toast.createFailed")`
- `"Your AI agent is live! 🎉"` → `t("toast.agentLive")`

Add to en.json under `"agents"`:
```json
"toast": {
  "testLinkCopied": "Test link copied!",
  "selectVoiceFirst": "Select a voice first to hear a preview.",
  "previewFailed": "Could not play preview",
  "saveFailed": "Could not save agent",
  "saveRetry": "Changes couldn't be saved. Try again.",
  "deleted": "Agent deleted",
  "deleteFailed": "Could not delete agent",
  "created": "Agent created and synced",
  "createFailed": "Could not create agent",
  "agentLive": "Your AI agent is live!"
}
```

### B2: `src/app/app/campaigns/page.tsx`

- `"Campaign updated."` / `"Campaign created."` → `t("toast.updated")` / `t("toast.created")`
- `"Could not update campaign."` → `t("toast.updateFailed")`
- `"Campaign paused."` → `t("toast.paused")`
- `"Could not launch campaign."` → `t("toast.launchFailed")`

Add `useTranslations("campaigns")` if not present. Add to en.json under `"campaigns"`:
```json
"toast": {
  "updated": "Campaign updated.",
  "created": "Campaign created.",
  "updateFailed": "Could not update campaign.",
  "paused": "Campaign paused.",
  "launchFailed": "Could not launch campaign."
}
```

### B3: `src/app/app/call-intelligence/page.tsx`

- `"Paste at least 100 characters of transcript."` → `t("toast.minTranscript")`
- `"Analysis failed."` → `t("toast.analysisFailed")`
- `"Something went wrong."` → `tCommon("error.generic")` (reuse common)
- `"Failed to dismiss."` → `t("toast.dismissFailed")`
- `"Applied to agent."` → `t("toast.applied")`
- `"Apply failed."` → `t("toast.applyFailed")`
- `"Note saved."` → `t("toast.noteSaved")`
- `"Could not save note."` → `t("toast.noteSaveFailed")`

Add `useTranslations("callIntelligence")` if not present. Add keys under `"callIntelligence"` in en.json.

### B4: `src/app/app/agents/[id]/flow-builder/FlowBuilderClient.tsx`

- `"Could not load flow"` → `t("toast.loadFailed")`
- `"Flow saved."` → `t("toast.saved")`
- `"Could not save."` → `t("toast.saveFailed")`

Add keys under `"flowBuilder"` in en.json.

### B5: `src/app/app/messages/page.tsx`

- `"Add this contact in Leads first to send messages."` → `t("toast.addContactFirst")`
- `"Message sent."` → `t("toast.sent")`

Add keys under `"messages"` in en.json.

### B6: `src/app/app/settings/billing/page.tsx`

- `"Plan updated. Your new features are available now."` → `t("toast.planUpdated")`
- `"Could not pause coverage."` → `t("toast.pauseFailed")`
- `"Coverage paused."` → `t("toast.paused")`
- `"Could not open payment settings."` → `t("toast.paymentSettingsFailed")`
- `"Could not open billing portal."` → `t("toast.billingPortalFailed")`

Add keys under `"billing"` in en.json.

### B7: `src/app/app/settings/phone/page.tsx`

- `"Number connected. You can now receive calls and texts."` → `t("toast.numberConnected")`
- `"Settings saved."` → `t("toast.saved")`
- `"Something went wrong."` → `tCommon("error.generic")`
- `"Create an agent first in the Agents section, then try again."` → `t("toast.createAgentFirst")`
- `"Calling you now — answer your phone to hear your agent."` → `t("toast.testCallStarted")`
- `"Code sent. Check your phone."` → `t("toast.codeSent")`
- `"Phone verified ✓"` → `t("toast.phoneVerified")`
- `"We'll notify you when numbers are available."` → `t("toast.waitlistJoined")`
- `"Use 'Get a new AI number' to get a dedicated line."` → `t("toast.getAiNumber")`

Add keys under `"phone"` in en.json.

### B8: `src/app/app/settings/integrations/page.tsx`

- `"OAuth for this CRM will be available soon."` → `t("toast.oauthComingSoon")`
- `"Invalid integration."` → `t("toast.invalidIntegration")`
- `"Webhook destination saved."` → `t("toast.webhookSaved")`
- `"Could not save webhook settings."` → `t("toast.webhookSaveFailed")`
- `"Could not send webhook test."` → `t("toast.webhookTestFailed")`
- `"Enter your email to join the WhatsApp waitlist."` → `t("toast.whatsappEmailRequired")`
- `"You're on the list."` → `t("toast.whatsappWaitlisted")`

Add keys under `"integrations"` in en.json.

### B9: `src/app/app/settings/call-rules/page.tsx`

- `"Call rules saved"` → `t("toast.saved")`

Add key under `"callRules"` in en.json.

### B10: Copy ALL new keys to all locale files

After adding all toast keys to en.json, copy the same keys (with English values as placeholders) to:
- `src/i18n/messages/es.json`
- `src/i18n/messages/fr.json`
- `src/i18n/messages/de.json`
- `src/i18n/messages/pt.json`
- `src/i18n/messages/ja.json`

---

## SECTION C — REPLACE CLIENT-SIDE VAPI SDK WITH ELEVENLABS

The backend uses ElevenLabs Conversational AI via the voice provider abstraction. But the client-side voice test buttons still import `@vapi-ai/web` directly. Fix both.

### C1: `src/components/WorkspaceVoiceButton.tsx`

This component dynamically imports `@vapi-ai/web` and uses `Vapi.start()` for browser-based test calls.

Replace the Vapi SDK with the ElevenLabs Conversational AI client-side approach. ElevenLabs offers a WebSocket-based client for browser voice:

```ts
// Replace Vapi import with ElevenLabs conversation
// Instead of: const { default: Vapi } = await import("@vapi-ai/web");
// Use the ElevenLabs WebSocket API:

async function startConversation(agentId: string) {
  const ws = new WebSocket(`wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`);
  // Handle audio stream via WebSocket
  // Or use the REST API to trigger an outbound test call to the user's phone instead
}
```

**Simpler approach**: Instead of browser-based voice (which requires complex WebSocket audio handling), convert the "Test" button to trigger a phone call to the user's verified phone number via the existing `/api/agents/[id]/test-call` endpoint. This is:
- More reliable
- Already works with ElevenLabs via getVoiceProvider()
- Gives the user the REAL phone experience

Update the component to:
1. Prompt user for their phone number (or use workspace.verified_phone)
2. POST to `/api/agents/${agentId}/test-call` with `{ phoneNumber }`
3. Show "Calling your phone..." status
4. Remove the `@vapi-ai/web` import entirely

### C2: `src/components/demo/DemoVoiceButton.tsx`

Same issue. This is the public demo button on the homepage. Options:

**Option A (recommended)**: Remove the live voice demo entirely and replace with a "Try it — enter your number" flow that triggers a real outbound call via `/api/vapi/demo-config` → test call endpoint. This gives prospects the REAL experience.

**Option B**: Keep a static conversation animation/mockup (already exists in the hero section) and remove the demo voice button that depends on Vapi.

Implement Option A: Replace the DemoVoiceButton with a phone number input + "Call me" button that hits an API endpoint to trigger a demo outbound call.

### C3: Remove @vapi-ai/web dependency

After C1 and C2 are done:
```bash
npm uninstall @vapi-ai/web
```

Verify no imports of `@vapi-ai/web` remain:
```bash
grep -r "@vapi-ai/web" src/
```

---

## SECTION D — DEPLOYMENT VERIFICATION

### D1: Trigger Vercel redeployment

The latest 3 commits have not deployed. Push an empty commit to force it:

```bash
git commit --allow-empty -m "chore: force Vercel redeploy for latest fixes" && git push origin main
```

### D2: Verify env vars are documented

Update `.env.example` with all required production env vars:

```env
# Voice Provider (elevenlabs or vapi)
VOICE_PROVIDER=elevenlabs

# ElevenLabs
ELEVENLABS_API_KEY=
ELEVENLABS_PHONE_NUMBER_ID=

# Twilio (telephony)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
NEXT_PUBLIC_APP_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## SECTION E — PRODUCT POLISH (from live site evaluation)

### E1: AgentsPageClient still 2,503 lines — extract remaining components

File: `src/app/app/agents/AgentsPageClient.tsx`

Find and extract:
- Phone/schedule configuration section → `src/app/app/agents/components/PhoneScheduleStep.tsx`
- Test panel/chat section → `src/app/app/agents/components/TestStepContent.tsx`
- Agent stats cards → `src/app/app/agents/components/AgentStatsCard.tsx`
- FAQ editor inline section → `src/app/app/agents/components/FaqEditor.tsx`

Rules: "use client" line 1, props for state/callbacks, run `npx tsc --noEmit` after each extraction. Target: under 1,200 lines.

### E2: Homepage "Dashboard →" button should say "Start free →" for logged-out users

File: `src/components/Navbar.tsx` or equivalent

The navbar CTA button shows "Dashboard →" even to first-time visitors who are not logged in. This should show "Start free →" linking to `/sign-in` for anonymous users, and "Dashboard →" linking to `/app/activity` for logged-in users. Check if there's a session check in the navbar and update accordingly.

### E3: Settings pages — browser tab titles

Several settings pages show "Recall Touch — AI Phone Calls, Handled" as the browser tab title (visible in tab titles from the live site). These should have specific page titles like "Phone Settings — Recall Touch", "Billing — Recall Touch", etc.

Check these files and add `document.title = t("...")` if missing:
- `src/app/app/settings/phone/page.tsx`
- `src/app/app/settings/billing/page.tsx`
- `src/app/app/settings/integrations/page.tsx`
- `src/app/app/settings/call-rules/page.tsx`
- `src/app/app/settings/agent/page.tsx`
- `src/app/app/developer/page.tsx`
- `src/app/app/messages/page.tsx`
- `src/app/app/call-intelligence/page.tsx`
- `src/app/app/onboarding/page.tsx`

Add corresponding `pageTitle` keys to en.json for each.

### E4: Homepage — footer "Join waitlist" form

The footer has a "Join waitlist" email form. The product is LIVE now, not in waitlist mode. Change this to "Get product updates" or "Subscribe to updates" with matching submit button text.

File: Likely in `src/components/Footer.tsx` or `src/components/sections/Footer.tsx`. Find the "Join waitlist" text and "Join waitlist" button text and replace.

### E5: Homepage hero — "Start free →" CTA should link to sign-up

The primary CTA "Start free →" should link to `/sign-in` (the sign-up/sign-in page). Verify this link is correct and not dead.

### E6: Marketplace phone page — expand country list

File: `src/app/app/settings/phone/marketplace/page.tsx`

The country dropdown only shows US and CA. Expand to match the 29 countries supported by the backend (from the SUPPORTED_COUNTRIES array in available/route.ts):

```ts
const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "IE", name: "Ireland" },
  { code: "AT", name: "Austria" },
  { code: "CH", name: "Switzerland" },
  { code: "BE", name: "Belgium" },
  { code: "PT", name: "Portugal" },
  { code: "JP", name: "Japan" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "IN", name: "India" },
  { code: "SG", name: "Singapore" },
  { code: "HK", name: "Hong Kong" },
  { code: "NZ", name: "New Zealand" },
  { code: "ZA", name: "South Africa" },
  { code: "IL", name: "Israel" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czech Republic" },
];
```

---

## SECTION F — FINAL BUILD AND DEPLOY

```bash
npx tsc --noEmit && npm run build && npm test
```

Fix ALL failures. Then:

```bash
git add -A && git commit -m "feat: final launch perfection — i18n complete, Vapi SDK removed, product polish" && git push origin main
git log --oneline -5
```

Paste ONLY the git log output.

---

START. Section A1. Open AgentsPageClient.tsx line 163. Verify step labels. Then Section B1 — start migrating toast strings. DO NOT STOP UNTIL ALL SECTIONS ARE COMPLETE. GO.
