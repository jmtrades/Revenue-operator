# Vercel Environment Variables

Production environment variables required for deployment.

## Required Variables

| Variable | Required | Where Used | Failure Mode |
|----------|----------|------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Database connection (client + server) | App cannot connect to database |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Database connection (client) | Client-side queries fail |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Database connection (server) | Server-side operations fail |
| `CRON_SECRET` | Yes | Cron route authentication | Cron routes return 401 |
| `SESSION_SECRET` or `ENCRYPTION_KEY` | Yes (at least one) | Session cookie signing | Sessions not persisted |
| `NEXT_PUBLIC_APP_URL` | Yes | Link generation, redirects | Links point to localhost |

## Conditional Variables (If Integrations Enabled)

| Variable | Required | Where Used | Failure Mode |
|----------|----------|------------|--------------|
| `RESEND_API_KEY` | If email enabled | Email delivery (`/lib/assurance-delivery`) | Emails not sent, neutral response |
| `EMAIL_FROM` | If email enabled | Email sender address | Defaults to "Revenue Operator <noreply@revenue-operator.com>" |
| `STRIPE_SECRET_KEY` | If billing enabled | Stripe API calls | Billing operations fail |
| `STRIPE_WEBHOOK_SECRET` | If billing enabled | Webhook signature verification | Webhook returns 401 |
| `STRIPE_PRICE_ID` | If billing enabled | Checkout session creation | Checkout fails |
| `TWILIO_ACCOUNT_SID` | If SMS enabled | Twilio API (`/lib/delivery/provider`) | SMS not sent, neutral response |
| `TWILIO_AUTH_TOKEN` | If SMS enabled | Twilio API | SMS not sent, neutral response |
| `TWILIO_PHONE_NUMBER` | If SMS enabled | Twilio sender number | SMS not sent, neutral response |
| `ZOOM_CLIENT_ID` | If Zoom enabled | Zoom OAuth (`/api/integrations/zoom`) | Zoom integration fails |
| `ZOOM_CLIENT_SECRET` | If Zoom enabled | Zoom OAuth | Zoom integration fails |
| `ZOOM_WEBHOOK_SECRET` | If Zoom enabled | Zoom webhook verification | Zoom webhook returns 401 |
| `ZOOM_REDIRECT_URL` | If Zoom enabled | Zoom OAuth callback | OAuth callback fails |

## Optional Variables

| Variable | Required | Where Used | Failure Mode |
|----------|----------|------------|--------------|
| `WEBHOOK_SECRET` | Optional | Inbound webhook signature (`/api/webhooks/inbound`) | Webhooks accepted without signature |
| `BASE_URL` | Optional | Fallback for link generation | Falls back to `NEXT_PUBLIC_APP_URL` or request origin |
| `APP_URL` | Optional | Fallback for link generation | Falls back to `NEXT_PUBLIC_APP_URL` |
| `NODE_ENV` | Auto-set by Vercel | Environment detection | Defaults to "production" on Vercel |
| `DATABASE_URL` | Optional | Direct Postgres connection (if not using Supabase) | Not used if Supabase vars present |

## Security Notes

- **Never log secret values**: All endpoints return neutral responses on error
- **Missing keys**: Endpoints return empty arrays/objects, not errors
- **CRON_SECRET**: Must match value used in cron caller (Vercel Cron or external)
- **SESSION_SECRET/ENCRYPTION_KEY**: Must be at least 32 bytes (base64 or hex)

## Verification

Run `npm run verify:env` to check all required variables are set (does not print values).

## Example Vercel Setup

1. Go to Vercel Project → Settings → Environment Variables
2. Add each variable above for Production environment
3. For Preview/Development, use same values or test values
4. Redeploy after adding variables
