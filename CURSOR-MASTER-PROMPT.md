You are an implementation engineer. Not a planner. Not an analyst. Open files, edit them, save them, move to the next. Complete every item below in one session. Do not stop between items. Do not ask questions. Do not narrate.

When ALL items are done, run:
```bash
npx tsc --noEmit && npm run build && npm test
git add -A && git commit -m "feat: go-live final polish — last 8 toasts, agent split, campaign i18n, coming-soon cleanup" && git push origin main
git log --oneline -5
```
Paste ONLY the git log output.

---

## ITEM 1: Migrate the last 8 hardcoded toast strings to i18n

These are the ONLY remaining hardcoded toast strings in the entire codebase. Fix all 8.

**File: `src/app/app/leads/page.tsx` (6 strings):**
Find and replace each hardcoded toast with a `t()` call. The component already imports `useTranslations`.

- `toast.success("Call started. Check Calls for status.")` → `toast.success(t("leads.toast.callStarted"))`
- `toast.error("Could not start call.")` → `toast.error(t("leads.toast.callFailed"))`
- `toast.error("Export failed. Try again.")` → `toast.error(t("leads.toast.exportFailed"))`
- `toast.success("Leads exported. Check your downloads.")` → `toast.success(t("leads.toast.exportSuccess"))`
- `toast.error("Export failed. Try again.")` (second instance) → `toast.error(t("leads.toast.exportFailed"))` (same key)
- `toast.error("Import failed.")` → `toast.error(t("leads.toast.importFailed"))`

**File: `src/app/app/settings/page.tsx` (2 strings):**
- `toast.info("Contact support to permanently delete your data.")` → `toast.info(t("settings.deleteDataInfo"))`
- `toast.info("Contact support to permanently delete your account.")` → `toast.info(t("settings.deleteAccountInfo"))`

If `useTranslations` is not already imported in settings/page.tsx, add it:
```typescript
import { useTranslations } from "next-intl";
```
And inside the component: `const t = useTranslations();`

**Add keys to all 6 locale files** (`src/i18n/messages/en.json`, `es.json`, `fr.json`, `de.json`, `pt.json`, `ja.json`):

English keys to add (nest under existing objects):
```json
{
  "leads": {
    "toast": {
      "callStarted": "Call started. Check Calls for status.",
      "callFailed": "Could not start call.",
      "exportFailed": "Export failed. Try again.",
      "exportSuccess": "Leads exported. Check your downloads.",
      "importFailed": "Import failed."
    }
  },
  "settings": {
    "deleteDataInfo": "Contact support to permanently delete your data.",
    "deleteAccountInfo": "Contact support to permanently delete your account."
  }
}
```

For es/fr/de/pt/ja, translate each value properly. Not English copy-paste.

---

## ITEM 2: Split AgentsPageClient.tsx (3,884 lines → under 1,500)

`src/app/app/agents/AgentsPageClient.tsx` is 3,884 lines. Child components already exist: `AgentList.tsx`, `AgentDetail.tsx`, `AgentKnowledgePanel.tsx`, `VoiceSelector.tsx`.

The file is still too large because the step content (Identity, Voice, Knowledge, Behavior, Test, Go Live) is inline. Extract:

**A) `src/app/app/agents/components/BehaviorStepContent.tsx`**
Extract the behavior/guardrails configuration section — qualification questions, objection handling, BANT framework, transfer rules, escalation chain, never-say list. This is the largest inline section. Pass agent state and update callbacks as props.

**B) `src/app/app/agents/components/IdentityStepContent.tsx`**
Extract the identity/personality configuration — name, greeting, conversation style, language, speaking speed.

**C) `src/app/app/agents/components/GoLiveStepContent.tsx`**
Extract the go-live readiness checklist and activation button.

After extraction:
- `AgentsPageClient.tsx` must be under 1,500 lines.
- All extracted components must be `"use client"` components.
- All existing functionality must be preserved — same props, same callbacks, same behavior.
- Run `npx tsc --noEmit` and fix any type errors.

---

## ITEM 3: Move campaign type labels to i18n

In `src/app/app/campaigns/page.tsx`, the `TYPE_OPTIONS` array has hardcoded English labels:
```typescript
const TYPE_OPTIONS = [
  { id: "lead_followup", label: "Lead qualification / follow-up" },
  { id: "appointment_reminder", label: "Appointment setting / reminder" },
  { id: "reactivation", label: "Reactivation" },
  { id: "cold_outreach", label: "Announcement / cold outreach" },
  { id: "review_request", label: "Review request" },
  { id: "custom", label: "Custom" },
];
```

Replace with i18n:
```typescript
const TYPE_OPTIONS = [
  { id: "lead_followup", labelKey: "campaigns.type.leadFollowup" },
  { id: "appointment_reminder", labelKey: "campaigns.type.appointmentReminder" },
  { id: "reactivation", labelKey: "campaigns.type.reactivation" },
  { id: "cold_outreach", labelKey: "campaigns.type.coldOutreach" },
  { id: "review_request", labelKey: "campaigns.type.reviewRequest" },
  { id: "custom", labelKey: "campaigns.type.custom" },
];
```

Then wherever these labels are rendered, use `t(option.labelKey)` instead of `option.label`.

Add the keys to all 6 locale files with real translations:
```json
{
  "campaigns": {
    "type": {
      "leadFollowup": "Lead qualification / follow-up",
      "appointmentReminder": "Appointment setting / reminder",
      "reactivation": "Reactivation",
      "coldOutreach": "Announcement / cold outreach",
      "reviewRequest": "Review request",
      "custom": "Custom"
    }
  }
}
```

Also check if `SOURCE_OPTIONS` or any other constant arrays in campaigns have hardcoded labels. If so, do the same.

---

## ITEM 4: Clean up "Coming Soon" features

Three features are marked "Coming Soon." For each, ensure the UI is clean and professional:

**A) Google Sign-In** (`src/app/sign-in/SignInForm.tsx`):
- The Google button should be visually present but clearly disabled.
- Toast on click should use an i18n key, not a hardcoded string.
- If the toast is already i18n, verify the key exists in all 6 locales.

**B) WhatsApp Integration** (`src/app/app/settings/integrations/page.tsx`):
- Verify the "Coming soon" badge renders cleanly with reduced opacity.
- Ensure the button is disabled with `cursor-not-allowed`.

**C) Outlook Calendar Sync** (`src/app/app/calendar/page.tsx`):
- Verify the "coming soon" text uses an i18n key.
- If hardcoded, move to i18n key `calendar.outlookComingSoon` and add to all 6 locales.

---

## ITEM 5: Final global search for any remaining hardcoded English

Run this search across the entire `src/app/` directory:
```bash
grep -rn 'toast\.\(error\|success\|info\|warning\)("' src/app/ --include="*.tsx" | grep -v "t("
```

If ANY results come back, fix them by converting to `t()` calls with proper i18n keys in all 6 locales.

Then run:
```bash
npx tsc --noEmit && npm run build && npm test
```

Fix any failures.

---

## ITEM 6: Commit and push

```bash
git add -A && git commit -m "feat: go-live final polish — last 8 toasts, agent split, campaign i18n, coming-soon cleanup" && git push origin main
git log --oneline -5
```

Paste ONLY the git log output.

---

START. Item 1. Open `src/app/app/leads/page.tsx`. GO.
