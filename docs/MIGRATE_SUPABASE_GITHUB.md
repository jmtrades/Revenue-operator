# Migrate Everything to Supabase and GitHub

One path to get Recall Touch running on Supabase and keep code on GitHub so it’s ready for real users as their caller.

---

## Part 1: Supabase (database + app)

### 1.1 Database migrations

All schema lives in `supabase/migrations/`. Apply it once to your Supabase project:

1. **Get Database URL**  
   Supabase → **Project Settings** → **Database** → **Connection string** → **URI**.  
   Use the **Transaction** (or Session) pooler. Replace `[YOUR-PASSWORD]` with your DB password.

2. **Set `DATABASE_URL`**  
   In project root, `.env.local`:
   ```bash
   DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

3. **Run migrations**
   ```bash
   npm run db:migrate
   ```
   This applies every migration in order (base schema, workspaces, agents, calls, leads, messages, appointments, voice/language, etc.).

4. **Expose schema for the app**  
   Supabase → **Project Settings** → **API** → **Exposed schemas** → add **`revenue_operator`**.

### 1.2 App env (Supabase API)

The app uses the **Supabase API** (not raw Postgres) at runtime. Set in **Vercel** (and in `.env.local` for local dev):

- **NEXT_PUBLIC_SUPABASE_URL** — Project URL (e.g. `https://xxxx.supabase.co`)
- **SUPABASE_SERVICE_ROLE_KEY** — Service role key (Project Settings → API)
- **NEXT_PUBLIC_SUPABASE_ANON_KEY** — Anon key (optional for some flows)

Also set **SESSION_SECRET** (or **ENCRYPTION_KEY**) for auth.

### 1.3 Verify

```bash
npm run verify:db
```

This checks Postgres (migrations) and Supabase API (tables readable). Fix any missing env or schema before going live.

---

## Part 2: GitHub

### 2.1 Commit and push

From project root:

```bash
git add -A
git status   # review
git commit -m "Production: Supabase migrations, voice/language, deployment docs"
git push origin main
```

If your repo is already connected to GitHub (`git remote -v`), this updates the remote. If not:

```bash
git remote add origin https://github.com/YOUR_ORG/Revenue-operator.git
git push -u origin main
```

### 2.2 Deploy from GitHub

- Connect **Vercel** to the GitHub repo (if not already).
- Every push to `main` deploys. Ensure all required env vars are set in Vercel (see [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)).

---

## Part 3: Caller-ready checklist

So people actually want to use this as their **caller** (inbound/outbound, SMS, appointments):

- [ ] **Migrations** run once (`npm run db:migrate`), **verify** passes (`npm run verify:db`).
- [ ] **Auth**: Sign-in and create-account work; session cookie and redirect to `/app` are correct.
- [ ] **Onboarding** (e.g. `/activate`) saves to Supabase via `/api/workspace/create` (business name, agent, greeting, **voice**, **language**).
- [ ] **Voice**: Vapi webhook and Twilio voice webhook URLs set; **ELEVENLABS_API_KEY** set for real TTS; voice list and language selector in onboarding.
- [ ] **Calls**: Vapi creates the assistant; Twilio voice webhook hands off to Vapi; call_sessions and leads are stored in Supabase.
- [ ] **SMS**: Twilio inbound webhook URL set; messages stored in `revenue_operator.messages`; Inbox shows real threads.
- [ ] **Billing** (optional): Stripe webhook and price IDs set; checkout and portal work.
- [ ] **App URL**: **NEXT_PUBLIC_APP_URL** set to production domain (e.g. `https://www.recall-touch.com`).

Full step-by-step: [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) and [DEPLOYMENT.md](./DEPLOYMENT.md).
