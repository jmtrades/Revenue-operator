import { redirect } from "next/navigation";

/**
 * Billing lives at /app/settings/billing. Server redirect so /app/billing never 404s.
 */
export default function AppBillingRedirectPage() {
  redirect("/app/settings/billing");
}
