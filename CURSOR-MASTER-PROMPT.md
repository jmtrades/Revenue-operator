You are an implementation engineer. This is the LAST pass. Three categories of fixes remain. Do every single one. Do not plan. Do not narrate. Do not stop partway. Open files, edit, save, move on.

---

## ITEM 1: Migrate 27 remaining hardcoded toast strings to i18n

These 6 files still have hardcoded English strings in setToast() calls. Convert every one to use useTranslations(). If the file doesn't already call useTranslations, add it. Add all new keys to en.json AND all 5 other locale files (es, fr, de, pt, ja) with English values as placeholders.

### 1A: `src/app/app/settings/billing/page.tsx`

Add `const tBilling = useTranslations("billing");` (or use existing).

| Line | Current | Replace with |
|------|---------|-------------|
| 43 | `"Plan updated. Your new features are available now."` | `tBilling("toast.planUpdated")` |
| ~100 | `data?.error ?? "Could not pause coverage."` | `data?.error ?? tBilling("toast.pauseFailed")` |
| ~104 | `data?.message ?? "Coverage paused."` | `data?.message ?? tBilling("toast.paused")` |
| 107 | `"Could not pause coverage."` | `tBilling("toast.pauseFailed")` |
| 178 | `"Could not open payment settings."` | `tBilling("toast.paymentFailed")` |
| 200 | `"Could not open billing portal."` | `tBilling("toast.portalFailed")` |

Add to en.json under `"billing"`:
```json
"toast": {
  "planUpdated": "Plan updated. Your new features are available now.",
  "pauseFailed": "Could not pause coverage.",
  "paused": "Coverage paused.",
  "paymentFailed": "Could not open payment settings.",
  "portalFailed": "Could not open billing portal."
}
```

### 1B: `src/app/app/settings/phone/page.tsx`

Add `const tPhone = useTranslations("phone");` (or use existing).

| Line | Current | Replace with |
|------|---------|-------------|
| 225 | `"Number connected. You can now receive calls and texts."` | `tPhone("toast.numberConnected")` |
| 260 | `"Settings saved."` | `tPhone("toast.saved")` |
| 269 | `"Something went wrong."` | `tPhone("toast.error")` |
| 284 | `"Create an agent first in the Agents section, then try again."` | `tPhone("toast.createAgentFirst")` |
| 306 | `"Calling you now — answer your phone to hear your agent."` | `tPhone("toast.testCallStarted")` |
| 309 | `"Something went wrong. Try again."` | `tPhone("toast.errorRetry")` |
| 616 | `"Code sent. Check your phone."` | `tPhone("toast.codeSent")` |
| 621 | `"Use 'Get a new AI number' to get a dedicated line."` | `tPhone("toast.getAiNumber")` |
| 666 | `"Phone verified ✓"` | `tPhone("toast.phoneVerified")` |
| 733 | `"We'll notify you when numbers are available."` | `tPhone("toast.waitlistJoined")` |
| 796 | `"Code sent. Check your phone."` | `tPhone("toast.codeSent")` |
| 800 | `"Use 'Get a new AI number' to get a dedicated line."` | `tPhone("toast.getAiNumber")` |
| 857 | `"Phone verified ✓"` | `tPhone("toast.phoneVerified")` |

Add to en.json under `"phone"`:
```json
"toast": {
  "numberConnected": "Number connected. You can now receive calls and texts.",
  "saved": "Settings saved.",
  "error": "Something went wrong.",
  "createAgentFirst": "Create an agent first in the Agents section, then try again.",
  "testCallStarted": "Calling you now — answer your phone to hear your agent.",
  "errorRetry": "Something went wrong. Try again.",
  "codeSent": "Code sent. Check your phone.",
  "getAiNumber": "Use 'Get a new AI number' to get a dedicated line.",
  "phoneVerified": "Phone verified",
  "waitlistJoined": "We'll notify you when numbers are available."
}
```

### 1C: `src/app/app/settings/integrations/page.tsx`

Add `const tInteg = useTranslations("integrations");` (or use existing).

| Line | Current | Replace with |
|------|---------|-------------|
| 93 | `"OAuth for this CRM will be available soon..."` | `tInteg("toast.oauthComingSoon")` |
| 98 | `"Invalid integration."` | `tInteg("toast.invalidIntegration")` |
| 150 | `"Webhook destination saved."` | `tInteg("toast.webhookSaved")` |
| 153 | `"Could not save webhook settings."` | `tInteg("toast.webhookSaveFailed")` |
| ~170 | `"Could not send webhook test."` | `tInteg("toast.webhookTestFailed")` |
| 175 | `"Could not send webhook test."` | `tInteg("toast.webhookTestFailed")` |
| 185 | `"Enter your email to join the WhatsApp waitlist."` | `tInteg("toast.whatsappEmailRequired")` |
| 198 | `"You're on the list..."` | `tInteg("toast.whatsappWaitlisted")` |
| 201 | `"Something went wrong. Try again."` | `tInteg("toast.error")` |
| 204 | `"Something went wrong. Try again."` | `tInteg("toast.error")` |

Add to en.json under `"integrations"`:
```json
"toast": {
  "oauthComingSoon": "OAuth for this CRM will be available soon. Use the webhook below to send events in the meantime.",
  "invalidIntegration": "Invalid integration.",
  "webhookSaved": "Webhook destination saved.",
  "webhookSaveFailed": "Could not save webhook settings.",
  "webhookTestFailed": "Could not send webhook test.",
  "whatsappEmailRequired": "Enter your email to join the WhatsApp waitlist.",
  "whatsappWaitlisted": "You're on the list. We'll notify you when WhatsApp is available.",
  "error": "Something went wrong. Try again."
}
```

### 1D: `src/app/app/settings/call-rules/page.tsx`

Add `const tRules = useTranslations("callRules");` (or use existing).

| Line | Current | Replace with |
|------|---------|-------------|
| 13 | `"Call rules saved"` | `tRules("toast.saved")` |

Add to en.json:
```json
"callRules": {
  "toast": {
    "saved": "Call rules saved"
  }
}
```

### 1E: `src/app/app/messages/page.tsx`

Add `const tMessages = useTranslations("messages");` (or use existing).

| Line | Current | Replace with |
|------|---------|-------------|
| 179 | `"Add this contact in Leads first to send messages."` | `tMessages("toast.addContactFirst")` |
| 196 | `"Message sent."` | `tMessages("toast.sent")` |

Add to en.json under `"messages"`:
```json
"toast": {
  "addContactFirst": "Add this contact in Leads first to send messages.",
  "sent": "Message sent."
}
```

### 1F: Copy ALL new toast keys to locale files

After adding all keys to en.json, copy the exact same keys (with English values as placeholders) to:
- `src/i18n/messages/es.json`
- `src/i18n/messages/fr.json`
- `src/i18n/messages/de.json`
- `src/i18n/messages/pt.json`
- `src/i18n/messages/ja.json`

---

## ITEM 2: Add document.title to 8 settings/tool pages

These pages show the generic "Recall Touch — AI Phone Calls, Handled" browser tab title. Each needs a specific title via `document.title = t("...")` inside a useEffect.

For each file below, add this pattern inside the component (after existing useTranslations calls):

```ts
useEffect(() => { document.title = t("pageTitle"); }, [t]);
```

And add the corresponding `"pageTitle"` key to en.json under the page's namespace.

### Pages to update:

| File | Namespace | Title to add to en.json |
|------|-----------|------------------------|
| `src/app/app/settings/phone/page.tsx` | `"phone"` | `"pageTitle": "Phone Settings — Recall Touch"` |
| `src/app/app/settings/billing/page.tsx` | `"billing"` | `"pageTitle": "Billing — Recall Touch"` |
| `src/app/app/settings/integrations/page.tsx` | `"integrations"` | `"pageTitle": "Integrations — Recall Touch"` |
| `src/app/app/settings/call-rules/page.tsx` | `"callRules"` | `"pageTitle": "Call Rules — Recall Touch"` |
| `src/app/app/settings/agent/page.tsx` | `"settings"` | `"pageTitle": "Agent Settings — Recall Touch"` |
| `src/app/app/developer/page.tsx` | `"developer"` | `"pageTitle": "Developer — Recall Touch"` |
| `src/app/app/messages/page.tsx` | `"messages"` | `"pageTitle": "Messages — Recall Touch"` |
| `src/app/app/call-intelligence/page.tsx` | `"callIntelligence"` | `"pageTitle": "Call Intelligence — Recall Touch"` |

If any page doesn't have `useTranslations` yet, add it with the appropriate namespace. If the namespace doesn't exist in en.json, create it with at least the `"pageTitle"` key.

Add all pageTitle keys to all 6 locale files.

---

## ITEM 3: Change "Join waitlist" to "Get product updates"

File: `src/components/sections/SocialProof.tsx` (~line 86)

The product is LIVE, not in waitlist mode. Find the "Join waitlist" button text and change it to "Get updates". Also find the heading text near it — if it says anything about a waitlist, change it to "Stay updated" or "Get product updates".

Also find the email input placeholder if it says anything about waitlist and update it.

---

## ITEM 4: Typecheck, build, commit, push

```bash
npx tsc --noEmit && npm run build && npm test
```

Fix ALL failures. Then:

```bash
git add -A && git commit -m "feat: complete i18n migration, page titles, product copy polish" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output.

---

START. Item 1A. Open src/app/app/settings/billing/page.tsx. Migrate all toast strings. DO NOT STOP UNTIL ALL 4 ITEMS ARE COMPLETE. GO.
