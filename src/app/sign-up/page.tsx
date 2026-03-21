import { redirect } from "next/navigation";

/**
 * /sign-up redirects to /activate — the primary registration flow.
 * This ensures users who try /sign-up don't hit a 404.
 */
export default function SignUpRedirect() {
  redirect("/activate");
}
