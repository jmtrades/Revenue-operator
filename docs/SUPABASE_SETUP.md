# Supabase setup — everything runs on Supabase

This app uses **Supabase** as the single backend: **database** and **auth**. There is no separate database or auth provider.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project.
2. Wait for the project to be ready (Database + Auth are enabled by default).

---

## 2. Environment variables

Set these in **Vercel** (or your host) and in **`.env.local`** for local dev.

### Required for the app (runtime)

| Variable | Where to get it |
|----------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role (keep secret) |
| `SESSION_SECRET` | Any 32+ character random string (for app session cookie) |
| `NEXT_PUBLIC_APP_URL` | Your app URL (e.g. `https://yourdomain.com` or `http://localhost:3000`) |

The app talks to Supabase via the **Supabase JS client** (API), not a raw Postgres connection, at runtime.

### Optional (migrations only)

To apply migrations from your machine or CI, you need a **Postgres connection string**:

| Variable | Where to get it |
|----------|------------------|
| `DATABASE_URL` or `SUPABASE_DB_URL` | Project Settings → Database → Connection string (URI). Use **Transaction** or **Session** pooler. Replace `[YOUR-PASSWORD]` with the database password. |

Example:

```bash
DATABASE_URL=postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
```

You can also run migrations with the **Supabase CLI** (`supabase link` + `supabase db push`) so you don’t need to set `DATABASE_URL` locally.

---

## 3. Expose the schema

In the Supabase Dashboard:

- **Project Settings** → **API** → **Exposed schemas**
- Add **`revenue_operator`**

All app tables live in the `revenue_operator` schema.

---

## 4. Run migrations

Apply the schema once (in order):

```bash
npm run db:migrate
```

Requires `DATABASE_URL` or `SUPABASE_DB_URL` in `.env.local` (or passed inline).

Or with Supabase CLI:

```bash
supabase link --project-ref YOUR_REF
supabase db push
```

---

## 5. Auth (Supabase Auth)

- **Email sign-up / sign-in** use Supabase Auth. Users are stored in `auth.users`; the app also keeps `revenue_operator.users` and `revenue_operator.workspaces` (linked by `owner_id` = `auth.users.id`).
- After sign-in, the app sets **Supabase auth cookies** (via `@supabase/ssr`) and a **revenue_session** cookie (userId + workspaceId) for compatibility.
- **Session in API routes**: Protected routes call `await getSession(req)`, which **prefers the Supabase Auth session** (from Supabase cookies). If no Supabase user is found, it falls back to the `revenue_session` cookie. So session is fully migrated to Supabase when users sign in through the app.
- To use **magic link or OAuth**, configure them in Supabase Dashboard → Authentication → Providers and use the existing `/auth/callback` route.

---

## 6. Verify

```bash
npm run verify:db
```

This checks that Postgres (migrations) and the Supabase API (tables readable) are working.

---

## Summary

| What | Where it runs |
|------|----------------|
| Database (tables, data) | Supabase Postgres (`revenue_operator` schema) |
| Auth (sign-up, sign-in, users) | Supabase Auth |
| App session | Cookie (`revenue_session`) + Supabase auth cookies |
| Migrations | Applied via `DATABASE_URL` + `npm run db:migrate` or Supabase CLI |

No other database or auth provider is required. All runtime data and identity go through Supabase.
