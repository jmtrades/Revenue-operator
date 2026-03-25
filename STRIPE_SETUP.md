# Stripe Webhook Configuration

## Webhook Secret
**Secret:** `whsec_1XCa09uGBQt0HaPUH9V5yhGtxpqb4ocA`

## Setup Steps

1. **Add to Environment Variables**
   - In Vercel (or your hosting platform), add:
     ```
     STRIPE_WEBHOOK_SECRET=whsec_1XCa09uGBQt0HaPUH9V5yhGtxpqb4ocA
     ```

2. **Configure Webhook in Stripe Dashboard**
   - Go to: https://dashboard.stripe.com/webhooks
   - Add endpoint: `https://<your-domain>/api/billing/webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
   - Copy the signing secret (already provided above)

3. **Verify Webhook**
   - Stripe will send a test event
   - Check your logs to confirm it's received and processed

## Important
- Keep this secret secure
- Never commit it to git
- Use environment variables only
- Rotate if compromised
