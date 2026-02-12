# Migration Instructions — Launch Billing Fields

## Option 1: Using Supabase CLI (Recommended)

### Install Supabase CLI
```bash
# macOS
brew install supabase/tap/supabase

# Or via npm
npm install -g supabase
```

### Link Project and Run Migrations
```bash
cd "/Users/junior/revenue operator"

# Link to your Supabase project
supabase link --project-ref ucjbsftixnnbmuodholg

# Push all migrations (including new ones)
supabase db push
```

## Option 2: Using Supabase SQL Editor (Direct)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ucjbsftixnnbmuodholg)
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `supabase/migrations/launch_billing_fields.sql`
5. Click **Run**

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
