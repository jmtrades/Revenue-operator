# Release notes — Launch polish

## What changed

### Design system
- **Tokens**: Centralized in `globals.css` — background, surface, card, border, text primary/secondary/muted, accent (cool blue), semantic green/amber/red, radius scale, shadow scale, spacing scale.
- **Base typography**: `html` font-size 15px; body line-height 1.5; deep slate background for “banking-grade” feel.
- **Shared components** (`src/components/ui/`): `PageHeader`, `Card` / `CardHeader` / `CardBody`, `Badge`, `EmptyState`, `LoadingState`, `LoadingScreen`, `Stat`. Used on Preferences and available for all pages.

### Session & workspace
- Session cookie set on trial start and refreshed in middleware; dashboard never shows email prompt when session exists when `SESSION_SECRET` (or `ENCRYPTION_KEY`) is set.
- **Preferences**: “Account” section with “Signed in as {email}” and “Log out” (POST `/api/auth/logout` then redirect to `/activate`).
- **Auth session API**: `GET /api/auth/session` now returns `email` when session is enabled (lookup from users table).

### Navigation
- Nav labels updated: **Overview**, **Conversations**, **Calendar**, **Performance**, **Reports**, **Preferences** (replacing Activity, Calls, Results, Proof).

### Loading & empty states
- Full-screen “Restoring your conversations” uses shared `LoadingScreen` for consistency.
- Preferences uses `PageHeader`, `Card`, `EmptyState` for empty workspace state.

### Live gate
- Feed copy: Conversation detected → Response prepared → Follow-up scheduled → Attendance confirmed → Conversation stabilized (12–15s then ready).
- Full-screen centered **card** with “Active” pulse; outcome-only phrasing; single CTA “Go to overview”.

### Landing
- Hero subhead: “We maintain continuity—reply, follow up, recover—so people show up. You take the calls.”
- Primary CTA: “Start 14-day trial” with “£0 today — trial ends in 14 days — cancel anytime before renewal”.
- Accent: cool blue for primary buttons (aligned with design direction).

### Stripe & billing
- No change to existing Stripe trial (14-day, card required, checkout → onboarding). Webhook and trial end handling remain as implemented.

### Ops
- Unchanged; remains staff-only with existing layout and footer.

### Tests & build
- `npm run test` — 136 tests pass (e2e excluded from Vitest).
- `npm run build` — succeeds.
- `npm run lint` — 0 errors.

---

## Files touched (summary)

- `src/app/globals.css` — design tokens, base font/line-height
- `src/components/ui/*` — new shared UI components
- `src/app/dashboard/layout.tsx` — nav labels, `LoadingScreen`
- `src/app/dashboard/settings/page.tsx` — Account section, session email, Log out, `PageHeader`/`Card`/`EmptyState`
- `src/app/dashboard/live/page.tsx` — feed copy, card layout, “Active” pulse, 15s timing
- `src/app/page.tsx` — hero CTA and subhead, trial copy
- `src/app/api/auth/session/route.ts` — return `email` in session
- `docs/UX_POLISH_CHECKLIST.md` — new checklist
- `docs/RELEASE_NOTES_LAUNCH.md` — this file
