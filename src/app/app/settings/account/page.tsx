import { redirect } from "next/navigation";

/** Legacy / deep-link path: account settings live on the main Settings hub. */
export default function AccountSettingsRedirectPage() {
  redirect("/app/settings");
}
