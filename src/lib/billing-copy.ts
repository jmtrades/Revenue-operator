/** Billing email subject (e.g. Stripe invoice email). */
export const BILLING_EMAIL_SUBJECT = "Your Recall Touch subscription";

/** Invoice line / product description (use in Stripe Product description). */
export const INVOICE_DESCRIPTION =
  "Recall Touch subscription plan for AI revenue recovery (voice, SMS, follow-up automation).";

/** Receipt footer. */
export const RECEIPT_FOOTER = "Thank you for your subscription to Recall Touch.";

/** Payment failure primary message. */
export const PAYMENT_FAILURE_PRIMARY = "Your Recall Touch subscription payment failed.";

/** Trial / plan messaging. */
export function planEndsOn(date: Date): string {
  return `Your current plan is scheduled to end on ${date.toLocaleDateString(undefined, { dateStyle: "long" })}.`;
}

/** When a feature is gated: show this instead of "Not available". */
export const FEATURE_UNAVAILABLE_MESSAGE = "Upgrade your plan to unlock this feature.";
