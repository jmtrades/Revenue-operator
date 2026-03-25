# Recall Touch — Launch checklist

Use this before and after each production deploy.

## Pre-launch (before deploy)

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] No `TODO` / `FIXME` / "coming soon" on shipped pages
- [ ] Primary CTAs use `bg-white text-black` (no blue/indigo buttons)
- [ ] Hydration: app layout uses HydrationGate; `generateBuildId` in next.config for cache bust

## Deploy

- Push to `main` or use your CI/CD (Vercel, etc.).
- Ensure env: `NEXT_PUBLIC_SUPABASE_*`, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, Vapi keys if using voice.

## Post-deploy (incognito)

1. **Console:** Open site in incognito → DevTools Console. Zero React #418 / Hydration errors.
2. **Homepage:** Hero shows two-column layout; "Talk to our AI" widget loads; "Start free →" is white button.
3. **Sign-in:** Heading "Sign in", subtitle "Welcome back to Recall Touch"; form submits; "Sign in →" is white.
4. **Activate:** Page loads; step progress visible.
5. **App (with auth):** `/app/onboarding` → "Continue →" advances steps. `/app/agents` → tabs switch. `/app/leads` → "+ Add lead" opens.
6. **Error:** `/app/nonexistent` or trigger error → dark page with [Try again] [Go home].

## E2E (optional)

```bash
# Local (start dev server first)
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e -- --grep "Critical path|App routes|Activate"

# Against production
PLAYWRIGHT_BASE_URL=https://www.recall-touch.com npm run test:e2e -- --grep "Critical path|App routes|Activate"
```

## Core flow

Homepage → Start free → /activate → success → /app/onboarding → 5 steps → /app/activity.

See also: [VERIFICATION-HYDRATION.md](./VERIFICATION-HYDRATION.md) for detailed hydration checks.
