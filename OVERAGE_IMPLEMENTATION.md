# Overage Enforcement, Usage Alerts & Revenue Dashboard Implementation

Complete implementation of billing overage enforcement, real-time usage alerts, and revenue recovered dashboard widget for Revenue Operator.

## Files Built

### 1. Core Billing Logic

**File**: `src/lib/billing/overage.ts` (255 lines)

Exports:
- `PLAN_LIMITS` - { solo: 400min/50sms, starter: 400min/100sms, growth: 1500min/500sms, scale: 5000min/2000sms }
- `OVERAGE_RATES` - { per_minute_cents: 12, per_sms_cents: 3 }
- `AlertLevel` type - "normal" | "warning" | "critical" | "exceeded"
- `getUsageAlertLevel(pct: number)` - Maps usage % to alert level
- `checkUsageThresholds(workspaceId)` - Returns UsageMetrics with overage calculations
- `getDailyUsageBreakdown(workspaceId)` - Returns daily usage array for charting
- `calculateOverageCharges(workspaceId, start, end)` - Computes Stripe invoice item amounts
- `reportUsageOverage()` - Legacy function for backward compatibility

### 2. API Endpoints

**GET** `src/app/api/billing/usage/route.ts` (46 lines)
- Endpoint: `/api/billing/usage?workspace_id=...`
- Returns: Real-time usage data with percentages, alert level, and daily breakdown
- Used by: Billing page, sidebar, dashboard

**POST** `src/app/api/billing/overage/route.ts` (126 lines)
- Endpoint: `/api/billing/overage?secret=CRON_SECRET`
- Purpose: Cron job to create Stripe invoice items for overage
- Verifies: CRON_SECRET environment variable
- Processes: Workspaces within 3 days of renewal
- Returns: { ok: true, processed: N, errors: [...] }

**GET** `src/app/api/cron/usage-alerts/route.ts` (122 lines)
- Endpoint: `/api/cron/usage-alerts?secret=CRON_SECRET`
- Purpose: Daily cron to check usage thresholds and log alerts
- Alerts: WARNING (75%), CRITICAL (90%), EXCEEDED (100%)
- Logging: Uses console.warn/error for monitoring
- Returns: { ok: true, checked: N, warnings_issued: N }

**GET** `src/app/api/analytics/revenue-recovered/route.ts` (88 lines)
- Endpoint: `/api/analytics/revenue-recovered?workspace_id=...`
- Returns: { total_recovered, calls_answered, no_shows_recovered, reactivations }
- Estimation: $200 avg value, 30% recovery rate, 30% no-show, 15% reactivation

### 3. React Components

**File**: `src/components/dashboard/UsageBar.tsx` (129 lines)

Component for displaying usage progress with color-coded alerts.

Props:
```tsx
interface UsageBarProps {
  used: number;                    // Minutes used
  limit: number;                   // Minutes limit
  label?: string;                  // "Minutes", "SMS", etc
  showOverage?: boolean;           // Show overage indicator
  overageUsed?: number;            // Overage amount
  showPercentage?: boolean;        // Show % text
  compact?: boolean;               // Compact mode for sidebar
}
```

Colors:
- White: <75% (normal)
- Amber: 75-90% (warning)
- Red: >90% (critical/exceeded)

Usage:
```tsx
<UsageBar
  used={350}
  limit={400}
  label="Minutes"
  showOverage={true}
  overageUsed={25}
/>
```

---

**File**: `src/components/dashboard/RevenueRecoveredCard.tsx` (132 lines)

Dashboard widget showing monthly revenue recovery metrics.

Features:
- Auto-fetches from `/api/analytics/revenue-recovered`
- Shows total recovered with green uptrend indicator
- Displays 3 breakdowns: calls answered, no-shows recovered, reactivations
- Dark themed (zinc-950, white text)
- Graceful fallback if API unavailable
- Skeleton loading state

Usage:
```tsx
import { RevenueRecoveredCard } from "@/components/dashboard/RevenueRecoveredCard";

export default function Dashboard() {
  return <RevenueRecoveredCard />;
}
```

## Integration Guide

### 1. Sidebar Minutes Display
Already implemented in `src/app/app/AppShellClient.tsx` (lines 462-466):
```tsx
{minutesUsage && (
  <span className="block text-[11px] text-[var(--text-tertiary)] mt-1">
    {minutesUsage.used}/{minutesUsage.limit} min used
  </span>
)}
```

### 2. Billing Page Enhancement
In `src/app/app/settings/billing/page.tsx`:
```tsx
import { UsageBar } from "@/components/dashboard/UsageBar";

// Inside the billingStatus !== null block (after line 186):
<div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-4">
  <UsageBar
    used={usage.minutes_used}
    limit={usage.minutes_limit}
    label="Minutes"
    showOverage={usage.estimated_overage_cost > 0}
  />
</div>
```

### 3. Dashboard Widget
In `src/app/app/activity/page.tsx` (add to dashboard grid):
```tsx
import { RevenueRecoveredCard } from "@/components/dashboard/RevenueRecoveredCard";

// Add to the main grid/layout:
<RevenueRecoveredCard />
```

## Database Requirements

Tables accessed (read-only):
- `workspaces` - billing_tier, billing_status, stripe_subscription_id, stripe_customer_id, renews_at
- `call_sessions` - call_started_at, call_ended_at (minute calculation)
- `sms_logs` - created_at (optional, SMS usage)
- `appointments` - status (optional, no-show recovery)
- `leads` - last_contact_at (optional, reactivation)

## Environment Configuration

Required:
```bash
STRIPE_SECRET_KEY=sk_...          # Stripe API key for invoice items
CRON_SECRET=your_secret_key       # Security token for cron endpoints
```

## Deployment

### Vercel Cron Jobs
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/usage-alerts",
      "schedule": "0 9 * * *",
      "title": "Usage alerts check",
      "description": "Check workspaces for usage thresholds (75%, 90%)"
    },
    {
      "path": "/api/billing/overage",
      "schedule": "0 23 * * *",
      "title": "Overage billing",
      "description": "Create Stripe invoice items for overage charges"
    }
  ]
}
```

### Alternative: External Cron Service
Use Vercel Cron, AWS Lambda, or external service to call:
- `GET /api/cron/usage-alerts?secret=YOUR_CRON_SECRET` (daily at 9 AM)
- `POST /api/billing/overage?secret=YOUR_CRON_SECRET` (daily at 11:59 PM)

## Alert Flow

```
Normal (<75%)
├─ No action
└─ White progress bar

Warning (75-90%)
├─ Log warning
├─ Amber progress bar
└─ "Approaching limit" message

Critical (90-100%)
├─ Log critical alert
├─ Red progress bar
└─ "Upgrade immediately" message

Exceeded (>100%)
├─ Log error
├─ Red progress bar
├─ "Overage charges apply" message
└─ Create Stripe invoice items
```

## Testing

### Test Usage Endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/billing/usage?workspace_id=ws_123"
```

Response:
```json
{
  "minutes_used": 350,
  "minutes_limit": 400,
  "sms_used": 45,
  "sms_limit": 100,
  "minutes_percentage": 87,
  "sms_percentage": 45,
  "is_over_limit": false,
  "overage_minutes": 0,
  "overage_sms": 0,
  "estimated_overage_cost": "0.00",
  "alert_level": "warning",
  "usage_by_day": [...]
}
```

### Test Usage Alerts Cron
```bash
curl "http://localhost:3000/api/cron/usage-alerts?secret=test_secret"
```

### Test Overage Charges Cron
```bash
curl -X POST "http://localhost:3000/api/billing/overage?secret=test_secret"
```

### Test Revenue Metrics
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/analytics/revenue-recovered?workspace_id=ws_123"
```

## Monitoring

Check logs for:
- `[billing/usage]` - Usage endpoint errors
- `[billing/overage]` - Overage charges cron
- `[cron/usage-alerts]` - Usage alert checks
- `[analytics/revenue-recovered]` - Revenue metrics errors
- `[usage-alerts] WARNING/CRITICAL/EXCEEDED` - Usage threshold alerts

## Future Enhancements

1. Email notifications at 75% and 90% thresholds
2. SMS notifications for critical alerts
3. Soft limit enforcement (block calls at 100%)
4. Per-feature usage tracking (per-agent, per-campaign)
5. Historical analytics dashboard
6. Forecasting based on burn rate
7. Auto-upgrade suggestions
8. Usage-based pricing tiers
9. Team/sub-workspace usage rollup
10. Custom alert thresholds per workspace

## Architecture Decisions

### Why 12¢/min for overage?
- Starter: $0.25/min base overage
- Growth: $0.18/min overage
- Scale: $0.12/min overage
- Standardized to $0.12/min for enforcement

### Why check within 3 days of renewal?
- Stripe needs time to process invoices
- Gives buffer before customer's next billing cycle
- Prevents double-charging on month boundaries

### Why use daily breakdowns?
- Enables trend detection and forecasting
- Supports usage-based pricing models
- Better UX for showing usage patterns

## Code Quality

- All functions have TypeScript types
- Error handling with try/catch
- Graceful degradation for missing tables
- Database-agnostic (uses Supabase via getDb())
- Follows Next.js App Router conventions
- Consistent with existing codebase patterns
