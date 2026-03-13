You are an implementation engineer. This is a TARGETED fix pass. Three bugs remain that are visible to users right now on the live site. Do every single one. Do not plan. Do not narrate. Do not stop partway. Open files, edit, save, move on.

---

## BUG 1: Campaigns page — double-nested i18n keys (CRITICAL — visible on live site)

**File: `src/app/app/campaigns/page.tsx`**

The page uses `useTranslations("campaigns")` at line 90 which sets the namespace to "campaigns". But then it references keys WITH the "campaigns." prefix, creating double-nesting:

- `t("campaigns.pageTitle")` resolves to `campaigns.campaigns.pageTitle` → KEY NOT FOUND → shows raw key as browser tab title
- `t("campaigns.type.leadFollowup")` resolves to `campaigns.campaigns.type.leadFollowup` → KEY NOT FOUND
- Same for all source labelKeys

### Fix 1A: Document title (line 118)

Change:
```ts
document.title = t("campaigns.pageTitle");
```
To:
```ts
document.title = t("pageTitle");
```

### Fix 1B: TYPE_OPTIONS labelKeys (lines 39-44)

Change:
```ts
const TYPE_OPTIONS = [
  { id: "lead_followup", labelKey: "campaigns.type.leadFollowup" },
  { id: "appointment_reminder", labelKey: "campaigns.type.appointmentReminder" },
  { id: "reactivation", labelKey: "campaigns.type.reactivation" },
  { id: "cold_outreach", labelKey: "campaigns.type.coldOutreach" },
  { id: "review_request", labelKey: "campaigns.type.reviewRequest" },
  { id: "custom", labelKey: "campaigns.type.custom" },
];
```
To:
```ts
const TYPE_OPTIONS = [
  { id: "lead_followup", labelKey: "type.leadFollowup" },
  { id: "appointment_reminder", labelKey: "type.appointmentReminder" },
  { id: "reactivation", labelKey: "type.reactivation" },
  { id: "cold_outreach", labelKey: "type.coldOutreach" },
  { id: "review_request", labelKey: "type.reviewRequest" },
  { id: "custom", labelKey: "type.custom" },
];
```

### Fix 1C: SOURCE_OPTIONS labelKeys (lines 57-62)

Change:
```ts
const SOURCE_OPTIONS = [
  { id: "", labelKey: "campaigns.source.any" },
  { id: "inbound_call", labelKey: "campaigns.source.inboundCall" },
  { id: "outbound", labelKey: "campaigns.source.outbound" },
  { id: "website", labelKey: "campaigns.source.website" },
  { id: "referral", labelKey: "campaigns.source.referral" },
];
```
To:
```ts
const SOURCE_OPTIONS = [
  { id: "", labelKey: "source.any" },
  { id: "inbound_call", labelKey: "source.inboundCall" },
  { id: "outbound", labelKey: "source.outbound" },
  { id: "website", labelKey: "source.website" },
  { id: "referral", labelKey: "source.referral" },
];
```

### Fix 1D: Search the ENTIRE file for any other t("campaigns.XYZ") calls

Search for `t("campaigns.` in the file and remove the `campaigns.` prefix from ALL of them, since the namespace already handles it. This includes toast keys, form labels, empty state messages — EVERYTHING. The namespace `"campaigns"` is already set via `useTranslations("campaigns")`.

---

## BUG 2: Agents page — "Currently: steps.knowledge" showing raw i18n key

**File: `src/app/app/agents/components/AgentDetail.tsx` (lines ~341-345)**

The code passes the raw i18n key string as the label value instead of translating it first:

```tsx
{t("setup.currentlyOn", {
  label:
    SETUP_STEPS.find((s) => s.id === activeStep)?.label ??
    activeStep,
})}
```

`SETUP_STEPS[n].label` is a key like `"steps.knowledge"`, NOT the translated text. So the output is "Currently: steps.knowledge" instead of "Currently: Knowledge".

### Fix:

Change to:
```tsx
{t("setup.currentlyOn", {
  label: t(
    SETUP_STEPS.find((s) => s.id === activeStep)?.label ??
    activeStep
  ),
})}
```

This translates the label key first, then passes the translated text to the interpolation.

---

## BUG 3: Agents page — missing document.title

**File: `src/app/app/agents/AgentsPageClient.tsx`**

The agents page never sets `document.title`, so the browser tab shows a generic title. This is the most-visited page in the entire app.

### Fix 3A: Add document.title to AgentsPageClient.tsx

Find the component's existing useEffect hooks (near the top of the component body). Add:

```ts
useEffect(() => {
  document.title = t("pageTitle");
  return () => { document.title = ""; };
}, [t]);
```

The component already has `const t = useTranslations("agents");` so this will resolve to `agents.pageTitle`.

### Fix 3B: Add the key to en.json

Add `"pageTitle": "Agents — Recall Touch"` inside the `"agents"` object in `src/i18n/messages/en.json`.

### Fix 3C: Add to all locale files

Add the same key to es.json, fr.json, de.json, pt.json, ja.json under their `"agents"` objects with the English value as placeholder.

---

## VERIFICATION: Audit all other pages for the same double-nesting bug

Before committing, quickly scan ALL files that use `useTranslations("NAMESPACE")` and then call `t("NAMESPACE.something")`. The pattern `useTranslations("X")` + `t("X.key")` is ALWAYS wrong — it should be `t("key")`.

Run this check:
```bash
grep -rn 'useTranslations(' src/app/app/ | grep -v node_modules
```

For each page where namespace is NOT empty string, verify that no t() calls repeat the namespace prefix.

---

## FINAL: Build and push

```bash
npx tsc --noEmit && npm run build
```

Fix ALL failures. Then:

```bash
git add -A && git commit -m "fix: campaigns double-nested i18n keys, agents page title, step label translation" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output.

---

START. Bug 1A. Open src/app/app/campaigns/page.tsx line 118. Fix document.title. Then continue through ALL items. DO NOT STOP UNTIL COMPLETE. GO.
