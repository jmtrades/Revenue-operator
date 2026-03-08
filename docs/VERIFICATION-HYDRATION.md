# Post-deploy verification: hydration and interactivity

After deploying the Recall Touch app, run these checks in an **incognito/private** window to confirm that the hydration and cache fixes are effective and that interactive elements work.

**Why incognito only:** Normal browser windows may still have stale JS bundles from a previous deploy. Incognito always fetches fresh HTML and the correct chunk URLs for the current deploy.

**Hardening in place:**
- Root layout: `suppressHydrationWarning` on `<html>`, `<head>`, `<body>` (avoids #418 from extensions/mismatches).
- App layout: HydrationGate + skeleton; SwCleanup unregisters Service Workers and clears caches.
- Build: `generateBuildId: build-${Date.now()}` so chunk hashes change every build.
- Config: `experimental.staleTimes: { dynamic: 0, static: 0 }` so RSC/router does not serve stale segments.
- Headers: HTML/non-static gets `Cache-Control: no-store, must-revalidate`; static assets stay immutable.

See [STALE_CACHE_AND_ROADMAP.md](./STALE_CACHE_AND_ROADMAP.md) for the full cache fix write-up.

## Deploy & verify checklist

1. Deploy the latest build (Vercel or your host).
2. Open the production URL in a **new incognito window** (not a normal tab).
3. Follow **§1** (console: zero #418) and **§2** (app redirect) below.
4. If signed in, follow **§3** (onboarding, agents, leads, voice).
5. Optional: run `PLAYWRIGHT_BASE_URL=<your-url> npm run test:e2e` against production.

## 1. Console: no React #418 errors

1. Open your deployed app URL (e.g. `https://www.recall-touch.com`).
2. Open DevTools → **Console**.
3. Navigate to **Sign in** (or use a direct link to `/sign-in`), then to **Activate** (`/activate`).
4. **Verify:** There are **zero** messages containing `error #418` or `Hydration failed`. If you see any, the hydration fix is incomplete or cached bundles are still being used.

## 2. App routes: redirect when unauthenticated

1. In the same incognito window, go to `/app/onboarding` (or `/app/activity`).
2. **Verify:** You are redirected to **Sign in**. The app shell (skeleton then content) should not hang; redirect should happen within a few seconds.

## 3. Authenticated app: buttons and navigation work

Sign in (or use a test account), then:

### Onboarding

1. Go to **`/app/onboarding`**.
2. **Verify:** You see step 1 (e.g. Business / Welcome).
3. Click **"Continue →"**.
4. **Verify:** The page advances to the next step (e.g. Step 2). If the button does nothing, hydration or event handlers are still broken.

### Agents

1. Go to **`/app/agents`**.
2. **Verify:** You see the agent stepper (Identity, Voice, Knowledge, etc.) or the list of agents.
3. If viewing an agent, click the **Knowledge** (or **Behavior**, **Test**) tab.
4. **Verify:** The content changes to the selected tab. If tabs do not switch, interactivity is still broken.

### Leads

1. Go to **`/app/leads`**.
2. Click **"+ Add lead"** (header or empty state).
3. **Verify:** A form or modal opens to add a lead. If nothing happens, the button is not wired.

### Hear This Agent

1. On **`/app/agents`**, open an agent and go to the **Voice** step (or the tab with voice preview).
2. Click **"Hear This Agent"** (or the ▶ preview button).
3. **Verify:** Audio plays, or a loading state appears. If the button does nothing, event handlers are not attached.

## 4. If any check fails

- **#418 or Hydration errors:** Ensure the latest deploy is live and that you are testing in incognito (no cached JS). Check that `generateBuildId` and the HydrationGate are in the deployed build.
- **Buttons do nothing:** Confirm zero hydration errors first. If there are none but buttons still don’t work, look for other causes (e.g. JS errors, missing `'use client'` on interactive components).
- **Old deploy JS loading:** Hard refresh (e.g. Cmd+Shift+R) or clear site data for the origin, then retry in incognito.

## 5. Automated checks

E2E tests cover:

- **Critical path:** Homepage → Start free → `/activate`; sign-in and demo pages load.
- **App hydration:** Unauthenticated `/app/onboarding` and `/app/activity` redirect to sign-in; sign-in and activate load without console errors containing `418` or `Hydration`.
- **Activate:** Wizard visible, step progress, no "Select account" when not applicable.
- **Dashboard:** `/dashboard` and `/dashboard?workspace_id=...` do not show "Select an account" dead state (tests use `domcontentloaded` to avoid flaky `networkidle` timeouts).
- Some dashboard sub-routes (campaigns, contacts, etc.) are skipped when they require authenticated workspace context.

Run locally (Playwright will start the dev server automatically, or use an already-running server):

```bash
npm run test:e2e
# Or, with server already running in another terminal:
# npm run dev
# PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e
```

Run against a deployed URL:

```bash
PLAYWRIGHT_BASE_URL=https://www.recall-touch.com npm run test:e2e
```
