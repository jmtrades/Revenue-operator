# Migration Instructions — Apply All Migrations

## Option 1: npm script with Postgres URL (recommended)

Apply all migrations in `supabase/migrations/` in alphabetical order using a direct Postgres connection:

1. Add to `.env` or `.env.local` (replace `[YOUR-PASSWORD]` with your DB password):
   `DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.ucjbsftixnnbmuodholg.supabase.co:5432/postgres`
2. Run: `npm run db:migrate`
   The script loads `.env` / `.env.local` automatically. Or pass inline: `DATABASE_URL='postgresql://...' npm run db:migrate`

Requires the `pg` package (already in devDependencies).

## Option 2: Supabase CLI

**Note:** The CLI only runs migration files named `<timestamp>_name.sql` (e.g. `20240101120000_name.sql`). This repo uses descriptive names (`name.sql`), so `supabase db push` will **skip** most files. Use Option 1 or 3 to apply all migrations.

### Link and push (for timestamped migrations only)
```bash
supabase link --project-ref ucjbsftixnnbmuodholg
supabase db push
```

## Option 3: Supabase SQL Editor (manual)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ucjbsftixnnbmuodholg)  
   Project URL: `https://ucjbsftixnnbmuodholg.supabase.co` (use as `NEXT_PUBLIC_SUPABASE_URL`)
2. Navigate to **SQL Editor**
3. Run each `.sql` file in `supabase/migrations/` in **alphabetical order** (or follow the order in `docs/SUPABASE_PROD_CHECKLIST.md`).

## Migration Files Created

- `supabase/migrations/billing_trial_fields.sql` — Adds `trial_end_at` and `renews_at`
- `supabase/migrations/trial_reminder_fields.sql` — Adds reminder tracking fields
- `supabase/migrations/launch_billing_fields.sql` — Combined migration (use this)

## What These Migrations Do

1. **Adds `trial_end_at`** — Timestamp when trial ends
2. **Adds `renews_at`** — Timestamp when subscription renews (trial_end if trialing, current_period_end if active)
3. **Adds `trial_reminder_3d_sent_at`** — Tracks when 3-day reminder was sent
4. **Adds `trial_reminder_24h_sent_at`** — Tracks when 24-hour reminder was sent

## Verification

After running migrations, verify in SQL Editor:

```sql
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_schema = 'revenue_operator' 
  AND table_name = 'workspaces'
  AND column_name IN ('trial_end_at', 'renews_at', 'trial_reminder_3d_sent_at', 'trial_reminder_24h_sent_at');
```

All four columns should exist with type `timestamp with time zone`.
