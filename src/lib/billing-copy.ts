/**
 * Economic framing: operational cost center language, not software subscription.
 * Use these strings for billing emails, invoices, and receipts.
 * Avoid: subscription, plan, tier, license, software.
 *
 * Stripe: Set Product description to INVOICE_DESCRIPTION; set invoice email subject
 * to BILLING_EMAIL_SUBJECT in Dashboard (Settings > Customer emails / Branding).
 */

/** Billing email subject (e.g. Stripe invoice email). */
export const BILLING_EMAIL_SUBJECT = "Service period — handling coverage";

/** Invoice line / product description (use in Stripe Product description). */
export const INVOICE_DESCRIPTION =
  "Continuous handling coverage for customer decisions and attendance.";

/** Receipt footer. */
export const RECEIPT_FOOTER = "For operational continuity coverage";

/** Payment failure primary message (no payment method, retry, or dunning in this line). */
export const PAYMENT_FAILURE_PRIMARY = "Handling coverage could not continue.";

/** Trial end / coverage end: use "Handling coverage ends on [date]." — never "trial expired" or "upgrade". */
export function coverageEndsOn(date: Date): string {
  return `Handling coverage ends on ${date.toLocaleDateString(undefined, { dateStyle: "long" })}.`;
}

/** When a feature is gated: show this instead of "Upgrade to unlock". No persuasion. */
export const FEATURE_UNAVAILABLE_MESSAGE = "Not available for current plan.";
