# Recall Touch — What to build next (post–hydration)

After hydration is **zero #418** in production (incognito), use this roadmap.

---

## Verification first (after deploy)

1. Open https://www.recall-touch.com/app/onboarding in a **fresh incognito** window.
2. DevTools Console: **ZERO** #418 errors.
3. Click "Continue →" → advances to Step 2.
4. Complete all 5 onboarding steps.
5. Go to /app/agents → click Knowledge, Behavior, Test → content changes each time.

---

## TIER 1: Make it work end-to-end

1. Verify onboarding steps 1–5 all advance and save data.
2. Verify agent stepper Identity → Voice → Knowledge → Behavior → Test → Go live all work.
3. Verify "Seed 5 starter entries" populates knowledge base.
4. Verify "Save" persists agent changes to Supabase.
5. Verify "Launch my AI" creates Vapi assistant.
6. Verify voice preview plays audio.
7. Verify Vapi Web SDK test call connects.
8. Verify homepage demo widget connects to Vapi.

---

## TIER 2: Fill remaining gaps

9. Add lead form opens when "+ Add lead" clicked.
10. Lead detail panel with call history and actions.
11. "Have AI call" actually initiates Vapi outbound call.
12. Campaign run actually queues and executes outbound calls.
13. Post-call webhook creates call records and lead updates.
14. Call recording playback from stored URLs.

---

## TIER 3: Polish for premium feel

15. Remove the "5/8 complete" progress widget from sidebar (or make it not compete with onboarding stepper).
16. Consistent workspace name across all pages.
17. Loading states for all async operations.
18. Success toasts for save/create/delete operations.
19. Error toasts with retry for failed operations.
20. Empty state illustrations for calls, leads, campaigns.
21. Mobile responsive pass.

---

## Hydration hardening (current)

- Root layout: `suppressHydrationWarning` on `<html>`, `<head>`, `<body>` (avoids #418 from html-level mismatches / extensions).
- App layout: HydrationGate + AppShellSkeleton (client-only mount for app shell).
- `generateBuildId: build-${Date.now()}` in next.config (new chunk names per build).
- SwCleanup: unregister Service Workers + clear caches on load.
- Static chunks: `Cache-Control: public, max-age=31536000, immutable`; HTML: `no-store`.

See [VERIFICATION-HYDRATION.md](./VERIFICATION-HYDRATION.md) and [LAUNCH.md](./LAUNCH.md).
