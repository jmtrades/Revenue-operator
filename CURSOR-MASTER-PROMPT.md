You are an implementation engineer finishing the last 1% before go-live. Open files, edit them, save them. Do not plan. Do not narrate. Do not ask questions. Complete every item below, then commit and push.

This codebase is 99% launch-ready. TypeScript passes. Build passes. 280 tests pass. All API routes have auth. All public pages have SEO metadata. All toast strings use i18n. Mock data is eliminated. The agent wizard is split into 7 child components. The activation wizard is split into 5 step components. Leads page is split into 3 components.

What remains is a short list of final polish items. Do all of them.

---

## ITEM 1: Reduce AgentsPageClient.tsx from 2,735 lines to under 1,500

File: `src/app/app/agents/AgentsPageClient.tsx` (2,735 lines)

Child components already exist in `src/app/app/agents/components/`:
- AgentList.tsx
- AgentDetail.tsx
- AgentKnowledgePanel.tsx
- VoiceSelector.tsx
- BehaviorStepContent.tsx
- GoLiveStepContent.tsx
- IdentityStepContent.tsx

The file is still 2,735 lines because large sections of inline JSX and logic remain. Identify the largest remaining inline sections and extract them:

**A)** Find the phone/schedule step content (phone number assignment, active hours, timezone, voicemail behavior). Extract into `src/app/app/agents/components/PhoneScheduleStepContent.tsx`.

**B)** Find the test step content (agent test panel integration, test results display). Extract into `src/app/app/agents/components/TestStepContent.tsx`.

**C)** Find any remaining large inline sections (FAQ editing, transfer rules, agent stats/metrics display). Extract each into its own component if it's more than 100 lines.

After all extractions:
- `AgentsPageClient.tsx` must be under 1,500 lines.
- Every extracted component must have `"use client"` on line 1.
- Every extracted component must accept props for state and callbacks — do NOT duplicate state.
- Run `npx tsc --noEmit` and fix any errors.

---

## ITEM 2: Ensure "Coming soon" labels use i18n

Three "Coming soon" strings remain as hardcoded English:

**File: `src/app/app/settings/integrations/page.tsx` (2 instances around lines 287, 313):**
Replace both hardcoded `Coming soon` text with `{t("integrations.comingSoon")}` using the page's existing `useTranslations` hook.

**File: `src/app/sign-in/SignInForm.tsx` (line 226):**
Replace `"Coming soon…"` with `{t("auth.signIn.googleComingSoon")}`.

Add the keys to all 6 locale files (`src/i18n/messages/en.json`, `es.json`, `fr.json`, `de.json`, `pt.json`, `ja.json`):
- English: `"comingSoon": "Coming soon"` (under integrations) and `"googleComingSoon": "Coming soon…"` (under auth.signIn)
- Translate properly for each locale. Not English copy-paste.

---

## ITEM 3: Add `"use client"` verification sweep

Search for any component in `src/app/app/` and `src/components/` that calls `useState`, `useEffect`, `useCallback`, `useMemo`, `useTranslations`, `useRouter`, `useSearchParams`, or `usePathname` but does NOT have `"use client"` as its first line.

```bash
grep -rL '"use client"' src/app/app/ src/components/ --include="*.tsx" | xargs grep -l 'useState\|useEffect\|useCallback\|useMemo\|useTranslations\|useRouter\|useSearchParams\|usePathname' 2>/dev/null
```

For every file this returns, add `"use client";` as line 1.

---

## ITEM 4: Verify all empty states render properly

Open each of these files and verify that when data is empty (no items), a meaningful empty state is shown — not a blank screen, not a spinner that never resolves, not just "No data":

- `src/app/app/inbox/page.tsx` — should show explanation + action if no threads
- `src/app/app/appointments/page.tsx` — should show explanation + action if no appointments
- `src/app/app/knowledge/page.tsx` — should show explanation + action if no entries
- `src/app/app/call-intelligence/page.tsx` — should show explanation if no call data
- `src/app/app/contacts/page.tsx` — should show explanation if no contacts
- `src/app/app/calendar/page.tsx` — should show explanation if no events
- `src/app/app/messages/page.tsx` — should show explanation if no messages
- `src/app/app/developer/webhooks/page.tsx` — should show explanation if no webhooks

For any page that shows a blank screen or raw "No X" text without using the `EmptyState` component from `src/components/ui/EmptyState.tsx`:
1. Import `EmptyState`.
2. Render it with an i18n title, i18n description, and an action button linking to the relevant setup page.
3. Add the i18n keys to all 6 locale files.

---

## ITEM 5: Verify Framer Motion easing compliance

```bash
grep -rn "ease:" src/ --include="*.tsx" --include="*.ts" | grep -v "easeOut\|easeInOut\|easeIn\|ease:" | grep "\["
```

If any results show cubic-bezier arrays like `ease: [0.4, 0, 0.2, 1]`, replace with `ease: 'easeOut'`.

Also run:
```bash
grep -rn "cubic-bezier" src/ --include="*.tsx" --include="*.ts"
```

Replace any matches with named easing strings.

---

## ITEM 6: Final build verification and commit

```bash
npx tsc --noEmit && npm run build && npm test
```

Fix ANY failures. Then:

```bash
git add -A && git commit -m "feat: final go-live polish — agent component split, i18n coming-soon, use-client sweep, empty states, easing audit" && git push origin main
git log --oneline -5
```

Paste ONLY the git log output. No words. No summaries.

---

START. Item 1. Open `src/app/app/agents/AgentsPageClient.tsx`. Find the largest remaining inline sections. Extract them. GO.
