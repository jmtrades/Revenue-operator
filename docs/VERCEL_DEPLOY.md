# Vercel Deployment Instructions

Step-by-step guide for deploying to Vercel production.

## Prerequisites

- Vercel account
- Supabase project configured
- All environment variables ready (see `VERCEL_ENV.md`)

## 1. Vercel Project Settings

### Build Settings

- **Framework Preset:** Next.js
- **Build Command:** `npm run build` (default)
- **Install Command:** `npm install` (default)
- **Output Directory:** `.next` (default)
- **Node Version:** 20.x (or latest LTS)

### Environment Variables

Add all variables from `VERCEL_ENV.md`:

1. Go to Project → Settings → Environment Variables
2. Add each variable for **Production** environment
3. Optionally add for Preview/Development environments
4. **Important:** `CRON_SECRET` must match value used in cron configuration

## 2. Cron Configuration

### Option A: Vercel Cron (Recommended)

Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/core",
      "schedule": "*/2 * * * *"
    },
    {
      "path": "/api/cron/assurance-delivery",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/guarantees",
      "schedule": "*/10 * * * *"
    },
    {
      "path": "/api/cron/core-drift",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/temporal-stability",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/proof-capsules",
      "schedule": "0 1 * * *"
    }
  ]
}
```

**Note:** Vercel Cron automatically adds `Authorization: Bearer <CRON_SECRET>` header. Ensure `CRON_SECRET` is set in environment variables.

### Option B: External Cron Service

If using external cron (e.g., cron-job.org):

1. Set up HTTP GET requests to each cron URL
2. Add header: `Authorization: Bearer <CRON_SECRET>`
3. Set schedules as specified in `CRON_PROD.md`

## 3. Deploy

### First Deploy

1. Connect repository to Vercel
2. Import project
3. Configure build settings (above)
4. Add environment variables
5. Deploy

### Subsequent Deploys

- Push to main branch → Auto-deploy
- Or manually trigger from Vercel Dashboard

## 4. Post-Deploy Verification

### Step 1: Run Smoke Test

```bash
BASE_URL=https://your-domain.vercel.app \
WORKSPACE_ID=your-workspace-id \
CRON_SECRET=your-cron-secret \
npx tsx scripts/prod-smoke-test.ts
```

**Expected:** All tests pass

### Step 2: Verify Cron Heartbeats

Wait 5 minutes after deploy, then check database:

```sql
SELECT job_name, last_ran_at 
FROM revenue_operator.cron_heartbeats 
ORDER BY last_ran_at DESC 
LIMIT 10;
```

**Expected:** `core` job has recent `last_ran_at` (within 5 minutes)

### Step 3: Verify Public Endpoints

```bash
# Test public work endpoint (replace external_ref with real value)
curl https://your-domain.vercel.app/api/public/work/<external_ref>
```

**Expected:** 200 OK, JSON response with no internal IDs

### Step 4: Verify Core Status

```bash
# Test core status (requires workspace_id)
curl "https://your-domain.vercel.app/api/system/core-status?workspace_id=<workspace_id>"
```

**Expected:** 200 OK or 401 Unauthorized (if auth required)

## 5. Domain Configuration

### Custom Domain (Optional)

1. Go to Project → Settings → Domains
2. Add custom domain
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` to custom domain
5. Redeploy

## 6. Monitoring

### Vercel Logs

- Go to Project → Deployments → Select deployment → Functions
- View serverless function logs
- Check for errors or warnings

### Database Monitoring

- Monitor Supabase Dashboard → Database → Logs
- Check for slow queries or errors
- Verify cron heartbeats are updating

### Cron Monitoring

- Check `cron_heartbeats` table regularly
- Verify all scheduled crons are running
- Investigate if any cron hasn't run in expected interval

## 7. Troubleshooting

### Build Fails

- Check build logs in Vercel Dashboard
- Verify all dependencies install correctly
- Check for TypeScript errors: `npm run build` locally

### Cron Not Running

- Verify `vercel.json` exists with cron configuration
- Check `CRON_SECRET` is set in environment variables
- Verify cron URLs are correct
- Check Vercel Cron logs

### Endpoints Return 500

- Check function logs in Vercel Dashboard
- Verify environment variables are set
- Check database connection
- Verify Supabase credentials

### Public Endpoints Return 401

- Check middleware configuration
- Verify public routes are in `isPublicRoute` function
- Check for auth requirements

## 8. Rollback

If deployment fails:

1. Go to Vercel Dashboard → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"
4. Investigate issue in failed deployment logs

## 9. Post-Deploy Checklist

- [ ] All environment variables set
- [ ] Cron jobs configured and running
- [ ] Smoke test passes
- [ ] Public endpoints accessible
- [ ] Database migrations applied
- [ ] Cron heartbeats updating
- [ ] No errors in logs
- [ ] Custom domain configured (if applicable)

## 10. Launch Gate

After completing all steps above, proceed to `LAUNCH_GATE.md` for final verification.
