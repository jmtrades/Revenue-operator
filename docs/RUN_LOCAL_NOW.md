# Use it now (local)

Run the app locally before deploying. DB migrations are already applied.

## 1. Env (copy from .env.example → .env.local)

In **.env.local** set at least:

```bash
# From Supabase: Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://ucjbsftixnnbmuodholg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
SUPABASE_SERVICE_ROLE_KEY=<your service role key>

# Any 32+ character secret
SESSION_SECRET=local-dev-secret-min-32-chars

# Local URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Any string (needed for some routes)
CRON_SECRET=local-cron-secret
PUBLIC_VIEW_SALT=local-salt
FOUNDER_EXPORT_KEY=local-founder-key
```

Optional for trial/checkout: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_SOLO_MONTH`, `STRIPE_PRICE_SOLO_YEAR` (see .env.example).

## 2. Start dev server

```bash
npm run dev
```

Open **http://localhost:3000**. Use onboarding, dashboard, activate (if Stripe is set), etc.

## 3. Optional: seed domain packs

```bash
npx tsx scripts/seed-domain-packs.ts
```

(Idempotent; run once if you want templates/policies in DB.)
