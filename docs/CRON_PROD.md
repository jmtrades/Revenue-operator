# Production Cron Configuration

Cron schedules and endpoints for production deployment.

## Required Crons (Minimum)

### Core Cron (Every 2 Minutes)

**Schedule:** `*/2 * * * *` (every 2 minutes)

**URL:** `GET https://<YOUR_DOMAIN>/api/cron/core`

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Purpose:** Runs all core operational crons sequentially:
- connector-inbox (inbound message processing)
- process-queue (job processing)
- commitment-recovery
- opportunity-recovery
- payment-completion
- shared-transaction-recovery
- exposure-engine
- operability-anchor
- assumption-engine
- normalization-engine
- proof-capsules
- assurance-delivery
- settlement-export

**Heartbeat:** Records heartbeat for `core` job

### Assurance Delivery (Hourly)

**Schedule:** `0 * * * *` (every hour at minute 0)

**URL:** `GET https://<YOUR_DOMAIN>/api/cron/assurance-delivery`

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Purpose:** Sends daily assurance emails to workspace owners when due

**Heartbeat:** Records heartbeat for `assurance-delivery` job

## Recommended Optional Crons

### Guarantees (Every 10 Minutes)

**Schedule:** `*/10 * * * *`

**URL:** `GET https://<YOUR_DOMAIN>/api/cron/guarantees`

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Purpose:** Processes guarantee enforcement and stability checks

**Heartbeat:** Records heartbeat for `guarantees` job

### Core Drift (Every 6 Hours)

**Schedule:** `0 */6 * * *`

**URL:** `GET https://<YOUR_DOMAIN>/api/cron/core-drift`

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Purpose:** Detects and records operational drift

**Heartbeat:** Records heartbeat for `core-drift` job

### Temporal Stability (Every 6 Hours)

**Schedule:** `0 */6 * * *`

**URL:** `GET https://<YOUR_DOMAIN>/api/cron/temporal-stability`

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Purpose:** Detects temporal stability patterns

**Heartbeat:** Records heartbeat for `temporal-stability` job

### Proof Capsules (Daily)

**Schedule:** `0 1 * * *` (1 AM daily)

**URL:** `GET https://<YOUR_DOMAIN>/api/cron/proof-capsules`

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Purpose:** Generates proof capsules for previous day

**Heartbeat:** Records heartbeat for `proof-capsules` job

## Vercel Cron Setup

### Using Vercel Cron (Recommended)

Add to `vercel.json`:

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

**Note:** Vercel Cron automatically adds `Authorization: Bearer <CRON_SECRET>` header. Ensure `CRON_SECRET` is set in Vercel environment variables.

### Using External Cron Service

If using external cron (e.g., cron-job.org, EasyCron):

1. Set up HTTP GET request to each URL above
2. Add header: `Authorization: Bearer <CRON_SECRET>`
3. Set schedule as specified
4. Verify response is 200 OK

## Verification

### Check Cron Heartbeats

After crons run, verify heartbeats are recorded:

```sql
SELECT job_name, last_ran_at 
FROM revenue_operator.cron_heartbeats 
ORDER BY last_ran_at DESC 
LIMIT 10;
```

Expected jobs:
- `core` (updated every 2 minutes)
- `assurance-delivery` (updated hourly)
- `connector-inbox` (updated via core)
- `process-queue` (updated via core)
- `guarantees` (if enabled)
- `core-drift` (if enabled)
- `temporal-stability` (if enabled)
- `proof-capsules` (if enabled)

### Manual Test

Test cron endpoint manually:

```bash
curl -X GET "https://<YOUR_DOMAIN>/api/cron/core" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Expected response: `{"ok": true, "jobs_run": <number>, ...}`

## Troubleshooting

### Cron Returns 401

- Verify `CRON_SECRET` is set in Vercel environment variables
- Verify header matches exactly: `Authorization: Bearer <CRON_SECRET>`
- Check for trailing spaces in secret

### Cron Returns 501

- `CRON_SECRET` is not set
- Set `CRON_SECRET` in Vercel environment variables

### Cron Runs But No Heartbeats

- Check database connection
- Verify `cron_heartbeats` table exists
- Check logs for errors

### Cron Runs But No Work Done

- Verify workspace data exists
- Check logs for specific job failures
- Verify required environment variables are set
