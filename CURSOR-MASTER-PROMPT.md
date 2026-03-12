You are the implementation engineer. You are not a planner. You are not a roadmap generator. You are not an analyst. You are a code writer. Your job is to open files, edit them, save them, and move to the next file until every single item below is done. You will not stop. You will not ask questions. You will not say "I will now do X." You will not produce a plan. You will not split this into phases that require me to say "continue." You will execute every item below in one continuous session, top to bottom, writing real code into real files.

When you finish ALL items, run these commands and paste ONLY the output:
```bash
npx tsc --noEmit && npm run build && npm test
git add -A && git commit -m "feat: final launch perfection — all remaining fixes" && git push origin main
git log --oneline -5
```

If any check fails, fix it immediately and re-run. Do not stop to explain the failure.

Here is everything you must do. Do all of it. Now.

---

## 1. DELETE THE LEGACY DASHBOARD DIRECTORY

The directory `src/app/dashboard/` still exists with 69 files. It is a legacy duplicate of `src/app/app/`. Delete it entirely.

```bash
rm -rf src/app/dashboard
```

Run `npx tsc --noEmit` after deletion. If anything breaks because it imported from dashboard, fix the import to point to the equivalent in `src/app/app/`. If any link or redirect in the codebase points to `/dashboard/*`, change it to `/app/*`.

---

## 2. DELETE THE UNUSED MOCK FILE

`src/lib/mock/campaigns.ts` still exists but nothing imports it. Delete it.

```bash
rm src/lib/mock/campaigns.ts
```

If `src/lib/mock/` is now empty, delete the directory too.

---

## 3. MIGRATE ALL HARDCODED TOAST STRINGS TO i18n

Every `toast.error()`, `toast.success()`, `toast.info()`, and `toast.warning()` call that contains a hardcoded English string must be converted to use a `t()` call from `useTranslations()`. Here are the specific files and the strings to fix:

**`src/app/app/calls/live/page.tsx`:**
- `toast.info("Listen in — coming soon")` → `toast.info(t("calls.live.listenInComingSoon"))`
- `toast.info("Whisper — coming soon")` → `toast.info(t("calls.live.whisperComingSoon"))`
- `toast.info("Barge in — coming soon")` → `toast.info(t("calls.live.bargeInComingSoon"))`
- `toast.info("Emergency takeover — contact support for urgent escalation")` → `toast.info(t("calls.live.emergencyTakeover"))`

**`src/app/app/settings/business/page.tsx`:**
- `toast.error("Failed to save. Please try again.")` → `toast.error(t("settings.business.saveFailed"))`
- `toast.error("Workspace name does not match. Type it exactly to confirm.")` → `toast.error(t("settings.business.nameNoMatch"))`
- `toast.success("Workspace deleted. Redirecting…")` → `toast.success(t("settings.business.deleted"))`

**`src/app/app/settings/agent/page.tsx`:**
- `toast.error("Failed to load agent settings. Please try again.")` → `toast.error(t("settings.agent.loadFailed"))`
- `toast.success("Settings saved")` → `toast.success(t("settings.agent.saved"))`
- `toast.error("Failed to save. Please try again.")` → `toast.error(t("settings.agent.saveFailed"))`

**`src/app/app/settings/compliance/page.tsx`:**
- `toast.error("Failed to load recording consent settings")` → `toast.error(t("settings.compliance.loadFailed"))`
- `toast.success("Recording consent settings saved")` → `toast.success(t("settings.compliance.consentSaved"))`
- `toast.error("Failed to save")` → `toast.error(t("settings.compliance.saveFailed"))`
- `toast.success("Compliance settings saved")` → `toast.success(t("settings.compliance.saved"))`
- `toast.info("Data export requested — you'll receive an email within 24 hours")` → `toast.info(t("settings.compliance.exportRequested"))`

**`src/app/app/settings/lead-scoring/page.tsx`:**
- `toast.error("Could not load scoring config")` → `toast.error(t("settings.leadScoring.loadFailed"))`
- `toast.success("Lead scoring weights saved. Scores will update on next call or recalc.")` → `toast.success(t("settings.leadScoring.saved"))`
- `toast.error("Failed to save")` → `toast.error(t("settings.leadScoring.saveFailed"))`
- `toast.success("Using default weights. Save to persist.")` → `toast.success(t("settings.leadScoring.defaultsLoaded"))`

**`src/app/app/settings/integrations/mapping/page.tsx`:**
- `toast.info("Defaults loaded.")` → `toast.info(t("settings.integrations.mapping.defaultsLoaded"))`
- `toast.success("Test run complete. See output below.")` → `toast.success(t("settings.integrations.mapping.testComplete"))`
- `toast.success("Mapping saved.")` → `toast.success(t("settings.integrations.mapping.saved"))`
- `toast.error("Failed to save")` → `toast.error(t("settings.integrations.mapping.saveFailed"))`

**`src/app/app/settings/phone/marketplace/page.tsx`:**
- `toast.success("Number added to your workspace.")` → `toast.success(t("settings.phone.marketplace.numberAdded"))`
- `toast.error("Something went wrong. Try again.")` → `toast.error(t("settings.phone.marketplace.error"))`

**`src/app/app/settings/page.tsx`:**
- `toast.success("Profile saved")` → `toast.success(t("settings.profileSaved"))`
- `toast.info("Contact support to permanently delete your data.")` → `toast.info(t("settings.deleteDataInfo"))`
- `toast.info("Contact support to permanently delete your account.")` → `toast.info(t("settings.deleteAccountInfo"))`

**`src/app/app/settings/notifications/page.tsx`:**
- `toast.error("Could not load notification preferences. Using defaults.")` → `toast.error(t("settings.notifications.loadFailed"))`
- `toast.success("Notification preferences saved")` → `toast.success(t("settings.notifications.saved"))`

**`src/app/app/leads/page.tsx`:**
All toast calls on lines 558, 578, 584, 629, 643, 645, 1083, 1129 — convert each to use `t()` with keys under `leads.toast.*`.

**`src/app/app/knowledge/page.tsx`:**
Lines 361, 416 — convert to `t()` with keys under `knowledge.toast.*`.

**`src/app/app/agents/[id]/voice-test/page.tsx`:**
Lines 73, 92 — convert to `t()` with keys under `agents.voiceTest.*`.

**`src/app/app/agents/AgentTestPanel.tsx`:**
Line 189 — convert to `t()`.

**`src/app/sign-in/SignInForm.tsx`:**
Lines 101, 232 — convert to `t()` with keys under `auth.signIn.*`.

For every new i18n key you create above, add the English value to `src/i18n/messages/en.json` under the correct nested path, and add translated values to `es.json`, `fr.json`, `de.json`, `pt.json`, `ja.json`. Translations must be real, not English copy-pasted.

After this item, do a global search for any remaining `toast.error("`, `toast.success("`, `toast.info("`, `toast.warning("` calls that contain a hardcoded string (not a `t()` call). Fix every single one you find.

---

## 4. SPLIT AGENTSPAGECLIENT.TSX FURTHER

`src/app/app/agents/AgentsPageClient.tsx` is still 4,036 lines. You already extracted AgentList (175 lines), AgentDetail (352 lines), and VoiceSelector (232 lines).

Now extract:
- **AgentDetail.tsx** — sidebar step list (Identity → Go Live), readiness, quick actions; step content stays in **AgentsPageClient** as `*StepContent` components.
- **BehaviorStepContent** (in AgentsPageClient) — behavior configuration (guardrails, qualification, objection handling, escalation/transfer).
- **AgentKnowledgePanel.tsx** — the knowledge/FAQ management section within agent setup.

After extraction, `AgentsPageClient.tsx` should be under 1,500 lines and serve as the orchestrator that composes these child components.

Wire all extracted components back into `AgentsPageClient.tsx` with the same props and callbacks. Verify typecheck passes.

---

## 5. SPLIT LEADS PAGE FURTHER

`src/app/app/leads/page.tsx` is 1,287 lines. You already extracted `LeadsList.tsx` (286 lines).

Now extract:
- **LeadsKanban.tsx** — the kanban board view with drag-and-drop columns.
- **LeadDetail.tsx** — the lead detail drawer/panel.

After extraction, `leads/page.tsx` should be under 500 lines. Wire components back in. Verify typecheck passes.

---

## 6. SPLIT ACTIVATEWIZARD.TSX

`src/app/activate/ActivateWizard.tsx` is 1,042 lines with no step splitting.

Create `src/app/activate/steps/` directory with:
- **BusinessStep.tsx** — business name, phone, industry, org type, use cases
- **AgentStep.tsx** — template selection
- **CustomizeStep.tsx** — voice, greeting, hours
- **TestStep.tsx** — agent test panel
- **ActivateStep.tsx** — final summary and activation

After extraction, `ActivateWizard.tsx` should be under 300 lines as the orchestrator. Wire step components in. Verify typecheck passes.

---

## 7. ADD SEO META TAGS TO ALL PUBLIC PAGES

Zero OG meta tags exist in the codebase. For each public page below, add a `generateMetadata()` export (Next.js App Router pattern) or a `<Head>` equivalent that includes:

- `title`: "Page Name — Recall Touch"
- `description`: unique 150-character description
- `openGraph.title`: same as title
- `openGraph.description`: same as description
- `openGraph.type`: "website"
- `openGraph.siteName`: "Recall Touch"

Pages to add metadata to:
- `src/app/page.tsx` (homepage): "AI Phone Agents That Handle Your Calls — Recall Touch"
- `src/app/pricing/page.tsx`: "Pricing — Recall Touch"
- `src/app/product/page.tsx`: "Product — Recall Touch"
- `src/app/privacy/page.tsx`: "Privacy Policy — Recall Touch"
- `src/app/terms/page.tsx`: "Terms of Service — Recall Touch"
- `src/app/sign-in/page.tsx`: "Sign In — Recall Touch"
- `src/app/contact/page.tsx`: "Contact — Recall Touch"
- `src/app/demo/page.tsx`: "Demo — Recall Touch"
- `src/app/blog/page.tsx`: "Blog — Recall Touch"
- `src/app/industries/page.tsx`: "Industries — Recall Touch"
- `src/app/activate/page.tsx`: "Get Started — Recall Touch"

Use the Next.js `Metadata` type from `next`:
```typescript
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "...",
  description: "...",
  openGraph: { title: "...", description: "...", type: "website", siteName: "Recall Touch" },
};
```

If the page is a client component (`"use client"`), you cannot export `metadata` from it. In that case, create a `layout.tsx` in the same directory that exports the metadata, or convert the page to a server component wrapper that renders the client component.

---

## 8. STANDARDIZE ALL EMPTY STATES

Search for any page in `src/app/app/` that shows a blank state, "No data", or raw "No X yet" text that is NOT using the `EmptyState` component from `src/components/ui/EmptyState.tsx` AND is NOT already using an i18n key.

For every instance found:
1. Replace with the `EmptyState` component.
2. Pass an i18n-translated title and description.
3. Pass an action button where appropriate (linking to the relevant setup page).

Specifically verify these pages have proper EmptyState usage:
- `/app/app/inbox/page.tsx`
- `/app/app/appointments/page.tsx`
- `/app/app/knowledge/page.tsx`
- `/app/app/call-intelligence/page.tsx`
- `/app/app/campaigns/page.tsx`
- `/app/app/contacts/page.tsx`
- `/app/app/calendar/page.tsx`
- `/app/app/messages/page.tsx`
- `/app/app/team/page.tsx` (if exists)
- `/app/app/developer/webhooks/page.tsx`

---

## 9. VERIFY AND FIX AUTH ON EVERY API ROUTE

Run this search:
```bash
grep -rL "getSession\|requireWorkspaceAccess\|requireWorkspaceRole" src/app/api/ --include="route.ts" | grep -v webhook | grep -v cron | grep -v auth/signin | grep -v auth/signup | grep -v auth/google | grep -v auth/logout | grep -v stripe
```

For every API route this returns that is NOT a public endpoint, add session validation on line 1:
```typescript
const session = await getSession(req);
if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

---

## 10. FINAL CHECKS

After completing ALL items 1-9:

1. Run `npx tsc --noEmit` — fix every error.
2. Run `npm run build` — fix every error.
3. Run `npm test` — fix every failure.
4. Run:
```bash
git add -A && git commit -m "feat: final launch perfection — legacy cleanup, i18n completion, component splits, SEO, empty states, auth hardening" && git push origin main
git log --oneline -5
```
5. Paste ONLY the `git log` output. Nothing else.

---

START. Item 1. Delete `src/app/dashboard/`. GO.
