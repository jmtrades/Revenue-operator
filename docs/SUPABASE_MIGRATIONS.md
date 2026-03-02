# Applying migrations to Supabase

All SQL in `supabase/migrations/` is applied with:

```bash
npm run db:migrate
```

## 1. Get your database connection string

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **Project Settings** (gear) → **Database**.
3. Under **Connection string**, choose **URI**.
4. Copy the **Transaction** or **Session** pooler URL (port `6543`).
5. Replace `[YOUR-PASSWORD]` with your database password (same as in **Database password** on that page; reset if needed).

Example format:

```
postgresql://postgres.[project-ref]:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

## 2. Set the env var

Add to `.env.local` (do not commit):

```bash
DATABASE_URL="postgresql://postgres.xxxx:yourpassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

Or use `SUPABASE_DB_URL` instead of `DATABASE_URL`.

## 3. Run migrations

```bash
npm run db:migrate
```

The script loads `.env` and `.env.local`, connects to Postgres, and runs every `.sql` file in `supabase/migrations/` in order. If a migration fails, it stops and reports the error.

## New tables from this repo

- **signups** — `/activate` form submissions (see `signups_launch.sql`).
- **waitlist** — Homepage “Founding members” signups (see `public_submissions_tables.sql`).
- **contact_submissions** — `/contact` form submissions (see `public_submissions_tables.sql`).

Ensure the `revenue_operator` schema exists (it is created in `000_repair_schema.sql` or your earliest migration). If you use a different schema, update the migration files to match your schema name.
