# Phase 7: Polish & Launch Checklist

Per v13 SHIP-IT prompt. Use this to verify before launch.

## Done in codebase

- [x] **Global loading** — `app/loading.tsx` (skeleton)
- [x] **Dashboard loading** — `app/dashboard/loading.tsx` (segment skeleton)
- [x] **Analytics/Billing loading** — `dashboard/analytics/loading.tsx`, `dashboard/billing/loading.tsx`
- [x] **Error boundary** — `app/error.tsx` (Something went wrong, Try again, Go home)
- [x] **Not found** — `app/not-found.tsx` (Go home, Contact support)
- [x] **Empty states** — Activity, Messages, Contacts, Calendar, Campaigns, Agents, Analytics (no data) with doc/action links
- [x] **Billing loading** — Skeleton instead of "One moment…"
- [x] **OG image** — `app/opengraph-image.tsx` updated to "AI Phone System for Every Business"
- [x] **Anti-churn copy** — Billing page: "Thinking of canceling?" with 30-day ROI note, pause/downgrade, link to Manage billing and hello@recall-touch.com
- [x] **Resend welcome** — Signup sends Day 0 email when RESEND_API_KEY + EMAIL_FROM set; .env.example documented
- [x] **Waitlist/contact DB** — Migration `public_submissions_tables.sql`; /api/waitlist and /api/contact persist when DB configured
- [x] **Speed-to-lead cron** — GET /api/cron/speed-to-lead every minute; shared executeLeadOutboundCall used by cron and POST /api/outbound/call
- [x] **Layout/manifest** — openGraph.images, icons.icon, manifest description + icon entries; opengraph-image.tsx in doctrine exclude

## Verify before launch

1. **Responsive** — Test key screens at 375px, 768px, 1440px: homepage, /activate, /pricing, /dashboard/activity, /dashboard/onboarding.
2. **Email drip (Resend)** — If using Resend: Day 0 welcome, Day 1 call forwarding, Day 3 try calling, Day 7 report, Day 10 trial reminder, Day 13 trial ends. Wire to Resend API or manual sequences.
3. **Anti-churn** — Copy on billing page done; full Pause/Downgrade flow can be configured in Stripe portal or a custom cancel page.
4. **Upgrade nudges** — At 80% usage: "Consider upgrading for more minutes." At 100%: "You've hit your limit. Upgrade or overage applies." (Analytics/Billing already show usage alerts.)
5. **E2E** — Signup → onboard (5 steps) → call number → see call in activity feed → run campaign. Manual or automated.
6. **Deploy** — Vercel (or host) env: `SESSION_SECRET`, Supabase URL/keys, Stripe webhook secret, `BASE_URL`, `ADMIN_EMAIL`. Run migrations. Add redirect URLs to Supabase/Stripe.

## Routes to click-test

- Public: /, /activate, /sign-in, /demo, /product, /pricing, /docs, /contact, /blog, /privacy, /terms, /industries/*
- App: /dashboard, /dashboard/activity, /dashboard/onboarding, /dashboard/messages, /dashboard/contacts, /dashboard/calendar, /dashboard/campaigns, /dashboard/agents, /dashboard/analytics, /dashboard/billing
- Admin: /admin (with ADMIN_EMAIL session)
