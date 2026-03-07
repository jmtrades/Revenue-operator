# Deploy Recall Touch — GitHub & Supabase

## 1. GitHub

### Push this repo to GitHub

The project is already connected to a remote. To push all current work:

```bash
git add -A
git status   # review
git commit -m "Recall Touch: hydration fix, agent system, onboarding, lint clean"
git push origin main
```

### Clone on another machine

```bash
git clone https://github.com/jmtrades/Revenue-operator.git
cd Revenue-operator
npm install
cp .env.example .env.local   # then fill in values
```

---

## 2. Supabase

### Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. **New project** — choose org, name, database password, region.
3. Wait for the project to be ready.

### Get connection details

- **Project Settings → API**: copy `Project URL` and `anon` / `service_role` keys.
- **Project Settings → Database**: copy **Connection string** (URI). Use **Transaction** or **Session** mode for the app. For migrations use the **Direct** connection string (port 5432).

### Environment variables

In `.env.local` (or your host’s env):

```env
# Supabase (required for app + migrations)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-only, keep secret

# For running migrations (Postgres URI from Supabase Dashboard → Settings → Database)
SUPABASE_DB_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
# Or use DATABASE_URL with the same value
```

Get `SUPABASE_DB_URL` from: Supabase Dashboard → **Project Settings** → **Database** → **Connection string** → **URI** (use the pooler URI on port 6543, or direct 5432 for migrations if needed).

### Run migrations

With `SUPABASE_DB_URL` or `DATABASE_URL` set:

```bash
npm run db:migrate
```

This applies all SQL files in `supabase/migrations/` in order. For a fresh Supabase project, run once after creating the project.

### Link Supabase CLI (optional)

To use the Supabase CLI for local dev or more control:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

Then you can use `supabase db push` or run migrations via the CLI. The app’s `npm run db:migrate` script works with any Postgres (including Supabase) via the env URL.

---

## 3. After deploy

1. **Build**: `npm run build`
2. **Lint**: `npm run lint`
3. **Env**: Ensure Vapi, Stripe, and any other keys are set in the host (Vercel, etc.).
4. **Webhooks**: Point Vapi/Twilio/Stripe webhooks to your deployed base URL (e.g. `https://your-app.vercel.app/api/webhooks/...`).

---

## 4. Quick reference

| Step              | Command / action                                      |
|-------------------|--------------------------------------------------------|
| Push to GitHub    | `git push origin main`                                |
| Supabase URL/keys | Dashboard → Settings → API                            |
| DB URL for migrate| Dashboard → Settings → Database → Connection string   |
| Run migrations    | `SUPABASE_DB_URL=... npm run db:migrate`              |
