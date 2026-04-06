import { cookies } from "next/headers";

/**
 * True when the browser likely has an authenticated session (marketing shell).
 * Matches homepage: revenue_session cookie or Supabase auth cookie.
 */
export async function getMarketingInitialAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    return (
      cookieStore.has("revenue_session") ||
      cookieStore.getAll().some((c) => c.name.startsWith("sb-"))
    );
  } catch {
    return false;
  }
}
